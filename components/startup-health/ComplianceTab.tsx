import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Startup, ComplianceStatus, UserRole } from '../../types';
import { complianceRulesIntegrationService, IntegratedComplianceTask } from '../../lib/complianceRulesIntegrationService';
import { complianceService, ComplianceUpload } from '../../lib/complianceService';
import { supabase } from '../../lib/supabase';
import { messageService } from '../../lib/messageService';
import { getCountryProfessionalTitles, normalizeCountryNameForDisplay, getCountryCodeFromName } from '../../lib/utils';
import { UploadCloud, Download, Trash2, Eye, X, CheckCircle, AlertCircle, Clock, FileText, Calendar, User } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import CloudDriveInput from '../ui/CloudDriveInput';
import ComplianceSubmissionButton from '../ComplianceSubmissionButton';
import CompanyDocumentsSection from './CompanyDocumentsSection';
import IPTrademarkSection from './IPTrademarkSection';

type CurrentUserLike = { role: UserRole; email?: string; serviceCode?: string };

interface ComplianceTabProps {
  startup: Startup;
  currentUser?: CurrentUserLike;
  onUpdateCompliance?: (startupId: number, taskId: string, checker: 'ca' | 'cs', newStatus: ComplianceStatus) => void;
  isViewOnly?: boolean;
  allowCAEdit?: boolean; // This now allows both CA and CS editing
  onProfileUpdated?: () => void; // Callback to notify when profile is updated
}

// Using IntegratedComplianceTask from the integration service

const VerificationStatusDisplay: React.FC<{ status: ComplianceStatus }> = ({ status }) => {
    let colorClass = "";
    let icon = null;
    
    switch (status) {
        case ComplianceStatus.Verified: 
            colorClass = "text-green-600"; 
            icon = <CheckCircle className="w-4 h-4" />;
            break;
        case ComplianceStatus.Rejected: 
            colorClass = "text-red-600"; 
            icon = <AlertCircle className="w-4 h-4" />;
            break;
        case ComplianceStatus.Submitted:
            colorClass = "text-blue-600";
            icon = <Clock className="w-4 h-4" />;
            break;
        case ComplianceStatus.Pending: 
            colorClass = "text-yellow-600"; 
            icon = <Clock className="w-4 h-4" />;
            break;
        case ComplianceStatus.NotRequired: 
            colorClass = "text-gray-500"; 
            break;
        default: 
            colorClass = "text-gray-600";
    }
    
    return (
        <span className={`font-semibold ${colorClass} flex items-center justify-center gap-1 w-full`}>
            {icon}
            {status}
        </span>
                    );
};

const ComplianceTab: React.FC<ComplianceTabProps> = ({ startup, currentUser, onUpdateCompliance, isViewOnly = false, allowCAEdit = false, onProfileUpdated }) => {
    console.log('🔍 ComplianceTab props:', { 
        userRole: currentUser?.role, 
        isViewOnly, 
        allowCAEdit,
        startupId: startup.id 
    });
    
    const [complianceTasks, setComplianceTasks] = useState<IntegratedComplianceTask[]>([]);
    
    // Helper function to normalize tasks and ensure isApplicable is always a boolean
    const normalizeTasks = (tasks: IntegratedComplianceTask[]): IntegratedComplianceTask[] => {
        return tasks.map(task => {
            // IMPORTANT: Only normalize if the value is undefined or null
            // If it's already a boolean (true or false), preserve it!
            if (task.isApplicable === undefined || task.isApplicable === null) {
                return {
                    ...task,
                    isApplicable: true // Default to true only if undefined/null
                };
            } else {
                // Already a boolean, preserve it as-is
                return {
                    ...task,
                    isApplicable: task.isApplicable === true // Convert to explicit boolean but preserve false values
                };
            }
        });
    };
    
    // Wrapper for setComplianceTasks that always normalizes
    const setComplianceTasksNormalized = (tasks: IntegratedComplianceTask[] | ((prev: IntegratedComplianceTask[]) => IntegratedComplianceTask[])) => {
        if (typeof tasks === 'function') {
            setComplianceTasks(prevTasks => {
                const updated = tasks(prevTasks);
                return normalizeTasks(updated);
            });
        } else {
            setComplianceTasks(normalizeTasks(tasks));
        }
    };
    // Debug: Track when complianceTasks state changes
    useEffect(() => {
        console.log('🔄 complianceTasks state changed, length:', complianceTasks.length);
        if (complianceTasks.length > 0) {
            const sample = complianceTasks.slice(0, 3);
            console.log('🔄 Sample tasks in state:', sample.map(t => ({ 
                taskId: t.taskId, 
                isApplicable: t.isApplicable, 
                type: typeof t.isApplicable 
            })));
            
            // Check for recently toggled tasks (check last few tasks or all tasks with Q4-GST)
            const toggledTasks = complianceTasks.filter(t => t.taskId.includes('Q4-GST') || t.taskId.includes('2026'));
            if (toggledTasks.length > 0) {
                console.log('🔄 Found toggled tasks in state:', toggledTasks.map(t => ({
                    taskId: t.taskId,
                    isApplicable: t.isApplicable,
                    type: typeof t.isApplicable,
                    isChecked: t.isApplicable === true
                })));
            }
        }
    }, [complianceTasks]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<IntegratedComplianceTask | null>(null);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [cloudDriveUrl, setCloudDriveUrl] = useState('');
    const [useCloudDrive, setUseCloudDrive] = useState(false);
    const [filters, setFilters] = useState({
        entity: 'all',
        year: 'all'
    });
    const [profileData, setProfileData] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // NOTE: Removed client-side fallback rules generation.
    // From now on, tasks are exclusively sourced from DB via RPC + compliance_checks.

    // Track syncing and loading to avoid loops
    const isSyncingRef = useRef(false);
    const isLoadingComplianceRef = useRef(false);
    const lastEntitySignatureRef = useRef<string | null>(null);

    // Load profile data to get subsidiaries
    const loadProfileData = async () => {
        try {
            // First try to get profile data from the startup object (if it was updated by ProfileTab)
            if (startup.profile) {
                console.log('🔍 Using profile data from startup object:', startup.profile);
                setProfileData(startup.profile);
                return;
            }
            
            // Fallback: load from database
            const { profileService } = await import('../../lib/profileService');
            const profile = await profileService.getStartupProfile(startup.id);
            setProfileData(profile);
            console.log('🔍 Profile data loaded from database for ComplianceTab:', profile);
        } catch (error) {
            console.error('Error loading profile data:', error);
            setProfileData(null);
        }
    };


    // Load profile data on component mount and when startup object changes
    useEffect(() => {
        console.log('🔄 ComplianceTab: Startup object changed, loading profile data...', { 
            startupId: startup.id, 
            hasProfile: !!startup.profile,
            subsidiaries: startup.profile?.subsidiaries?.length || 0
        });
        loadProfileData();
    }, [startup.id]); // Only reload when startup ID changes, not profile

    // Watch for profile updates from other components
    useEffect(() => {
        if (onProfileUpdated !== undefined && onProfileUpdated > 0) {
            console.log('🔄 Profile updated trigger received:', onProfileUpdated, 'refreshing profile data...');
            loadProfileData();
        }
    }, [onProfileUpdated]);

    // Load compliance data from backend - ONLY on startup ID change, with guard
    useEffect(() => {
        if (isLoadingComplianceRef.current) return; // Prevent concurrent loads
        isLoadingComplianceRef.current = true;
        loadComplianceData().finally(() => {
            isLoadingComplianceRef.current = false;
        });
    }, [startup.id]); // Only reload when startup ID changes

    // Sync compliance tasks when startup data changes (for new tasks) - WITH GUARD
    useEffect(() => {
        if (!profileData) return; // Wait for profile data to load
        if (isSyncingRef.current) return; // Prevent concurrent syncs
        
        // Create entity signature from profile data including subsidiaries
        const entitySignature = JSON.stringify({
            country: profileData.country || startup.country_of_registration || null,
            companyType: profileData.companyType || startup.company_type || null,
            registrationDate: profileData.registrationDate || startup.registration_date || null,
            subsidiaries: profileData.subsidiaries || []
        });

        // Only sync when primary/entity-defining fields change
        if (lastEntitySignatureRef.current !== entitySignature) {
            isSyncingRef.current = true;
            console.log('🔍 Entity-defining fields changed, syncing compliance tasks...');
            complianceRulesIntegrationService.syncComplianceTasksWithComprehensiveRules(startup.id).finally(() => {
                lastEntitySignatureRef.current = entitySignature;
                isSyncingRef.current = false;
                loadComplianceData();
            });
        }
    }, [profileData, startup.id]);

    // Subscribe to real-time updates for compliance tasks/uploads for this startup
    useEffect(() => {
        // Note: Real-time subscription functionality can be added later if needed
        // For now, we'll rely on manual refresh when needed

        return () => {
            // Cleanup if needed
        };
    }, [startup.id]);

    // Propagate admin compliance rule changes globally: when rules change, resync this startup's tasks
    useEffect(() => {
        const channel = supabase
            .channel('compliance_rules_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'compliance_rules_comprehensive' },
                async () => {
                    try {
                        console.log('🔁 Detected compliance_rules_comprehensive change. Resyncing tasks for startup', startup.id);
                        await complianceRulesIntegrationService.syncComplianceTasksWithComprehensiveRules(startup.id);
                        await loadComplianceData();
                    } catch (e) {
                        console.warn('Failed to resync after rules change', e);
                    }
                }
            )
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [startup.id]);

    const loadComplianceData = async () => {
        try {
            setIsLoading(true);

            // First, try to get existing compliance tasks
            console.log('🔍 Loading existing compliance tasks...');
            let integratedTasks = await complianceRulesIntegrationService.getComplianceTasksForStartup(startup.id);
            
            // If no tasks found, force regenerate them
            if (!integratedTasks || integratedTasks.length === 0) {
                console.log('🔄 No existing compliance tasks found, force regenerating...');
                await complianceRulesIntegrationService.forceRegenerateComplianceTasks(startup.id);
                
                // Try to get tasks again after regeneration
                integratedTasks = await complianceRulesIntegrationService.getComplianceTasksForStartup(startup.id);
            } else {
                console.log('✅ Found existing compliance tasks:', integratedTasks.length);
            }
            
            console.log('🔍 Loaded integrated compliance data:', integratedTasks);
            
            // Final defensive check: Ensure ALL tasks have isApplicable set to a boolean
            // This is a last line of defense - tasks should already have isApplicable set from the service
            const normalizedTasks = (integratedTasks || []).map(task => {
                // Explicitly convert to boolean - never allow undefined or null
                let isApplicableValue: boolean;
                if (task.isApplicable === undefined || task.isApplicable === null) {
                    console.warn('⚠️ Task missing isApplicable in loadComplianceData, setting to true:', task.taskId, 'current value:', task.isApplicable, 'type:', typeof task.isApplicable);
                    isApplicableValue = true;
                } else {
                    // Ensure it's a boolean (convert truthy/falsy to explicit boolean)
                    isApplicableValue = task.isApplicable === true;
                }
                
                // Always return a new object with explicit boolean value
                return {
                    ...task,
                    isApplicable: isApplicableValue
                };
            });
            
            // Verify all tasks have isApplicable set as a boolean
            const tasksWithIssues = normalizedTasks.filter(t => 
                t.isApplicable === undefined || 
                t.isApplicable === null || 
                typeof t.isApplicable !== 'boolean'
            );
            
            if (tasksWithIssues.length > 0) {
                console.error('❌ ERROR: Tasks still have invalid isApplicable after normalization:', 
                    tasksWithIssues.map(t => ({ 
                        taskId: t.taskId, 
                        isApplicable: t.isApplicable, 
                        type: typeof t.isApplicable 
                    }))
                );
                // Force fix them
                tasksWithIssues.forEach(task => {
                    const index = normalizedTasks.findIndex(t => t.taskId === task.taskId);
                    if (index >= 0) {
                        normalizedTasks[index] = { ...normalizedTasks[index], isApplicable: true };
                    }
                });
            }
            
            // Log sample of normalized tasks for debugging
            console.log('🔍 Normalized tasks sample (first 3):', 
                normalizedTasks.slice(0, 3).map(t => ({ 
                    taskId: t.taskId, 
                    isApplicable: t.isApplicable, 
                    type: typeof t.isApplicable 
                }))
            );
            
            setComplianceTasksNormalized(normalizedTasks);

            // After loading tasks, ensure overall startup status reflects per-task verification
            await syncOverallComplianceStatus(integratedTasks || []);
        } catch (error) {
            console.error('Error loading compliance data:', error);
            setComplianceTasksNormalized([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Compute and update overall startup compliance based on task statuses
    const syncOverallComplianceStatus = async (tasks: IntegratedComplianceTask[]) => {
        try {
            if (!tasks || tasks.length === 0) return;

            // IMPORTANT: Only count tasks where toggle is ON (isApplicable !== false)
            // Tasks with toggle OFF should not affect compliance status
            const applicableTasks = tasks.filter(task => task.isApplicable !== false);
            
            if (applicableTasks.length === 0) {
                // If no applicable tasks, set status to Pending
                try {
                    await supabase
                        .from('startups')
                        .update({ compliance_status: ComplianceStatus.Pending })
                        .eq('id', startup.id);
                } catch (e) {
                    console.warn('Failed to update overall startup compliance (non-blocking):', e);
                }
                return;
            }

            // CS rule requested:
            // - If user is CS: Compliant only when ALL CS-required tasks are Verified; otherwise Pending.
            // - For other roles: original behavior (rejections -> Non-Compliant; all required verified -> Compliant; else Pending).
            let hasRejected = false;
            let csHasRejected = false;
            let caHasRejected = false;
            let allRequiredVerifiedForCurrentRole = true;

            for (const t of applicableTasks) {
                const caRequired = !!t.caRequired;
                const csRequired = !!t.csRequired;
                const caStatus = t.caStatus;
                const csStatus = t.csStatus;

                if (caRequired && caStatus === ComplianceStatus.Rejected) {
                    hasRejected = true;
                    caHasRejected = true;
                }
                if (csRequired && csStatus === ComplianceStatus.Rejected) {
                    hasRejected = true;
                    csHasRejected = true;
                }

                // Role-scoped completeness
                if (currentUser?.role === 'CA') {
                    if (caRequired && caStatus !== ComplianceStatus.Verified) {
                        allRequiredVerifiedForCurrentRole = false;
                    }
                } else if (currentUser?.role === 'CS') {
                    if (csRequired && csStatus !== ComplianceStatus.Verified) {
                        allRequiredVerifiedForCurrentRole = false;
                    }
                } else {
                    // Fallback: require both if role not CA/CS
                    if ((caRequired && caStatus !== ComplianceStatus.Verified) || (csRequired && csStatus !== ComplianceStatus.Verified)) {
                        allRequiredVerifiedForCurrentRole = false;
                    }
                }
            }

            let targetStatus: ComplianceStatus;
            if (currentUser?.role === 'CS') {
                // CS: Non-Compliant if any CS-required is Rejected; otherwise Compliant only if all CS-required are Verified
                targetStatus = csHasRejected
                    ? ComplianceStatus.NonCompliant
                    : allRequiredVerifiedForCurrentRole
                    ? ComplianceStatus.Compliant
                    : ComplianceStatus.Pending;
            } else if (currentUser?.role === 'CA') {
                // CA: Non-Compliant if any CA-required is Rejected; otherwise Compliant only if all CA-required are Verified
                targetStatus = caHasRejected
                    ? ComplianceStatus.NonCompliant
                    : allRequiredVerifiedForCurrentRole
                    ? ComplianceStatus.Compliant
                    : ComplianceStatus.Pending;
            } else {
                // Fallback legacy behavior
                targetStatus = hasRejected
                    ? ComplianceStatus.NonCompliant
                    : allRequiredVerifiedForCurrentRole
                        ? ComplianceStatus.Compliant
                        : ComplianceStatus.Pending;
            }

            // If already matches current, skip update
            const currentOverall = (startup as any).complianceStatus || ComplianceStatus.Pending;
            if (currentOverall === targetStatus) return;

            try {
                // Update overall compliance status in the database
                await supabase
                    .from('startups')
                    .update({ compliance_status: targetStatus })
                    .eq('id', startup.id);
            } catch (e) {
                console.warn('Failed to update overall startup compliance (non-blocking):', e);
            }
        } catch (e) {
            console.warn('syncOverallComplianceStatus error:', e);
        }
    };

    const getVerificationCell = (item: IntegratedComplianceTask, type: 'ca' | 'cs') => {
        // Work with startup data directly
        const profile: any = {
            country: startup.country_of_registration,
            companyType: startup.company_type,
            registrationDate: startup.registration_date
        };

        // Determine entity assignment for CA/CS
        const getAssignedCodes = (identifier: string): { caCode?: string; csCode?: string } => {
            if (identifier === 'parent') {
                return {
                    caCode: profile.ca?.code || profile.caServiceCode,
                    csCode: profile.cs?.code || profile.csServiceCode,
                };
            }
            if (identifier.startsWith('sub-')) {
                const idx = parseInt(identifier.split('-')[1] || '0', 10);
                const sub = profile.subsidiaries?.[idx];
                return {
                    caCode: sub?.ca?.code || sub?.caCode,
                    csCode: sub?.cs?.code || sub?.csCode,
                };
            }
            if (identifier.startsWith('intl-')) {
                // International ops: common access (inherit parent CA/CS codes)
                return {
                    caCode: profile.ca?.code || profile.caServiceCode,
                    csCode: profile.cs?.code || profile.csServiceCode,
                };
            }
            return {};
        };

        const { caCode, csCode } = getAssignedCodes(item.entityIdentifier);
        const userCode = (
            (currentUser as any)?.serviceCode ||
            (currentUser as any)?.ca_code ||
            (currentUser as any)?.cs_code ||
            ''
        ).toString().toLowerCase();
        
        // Simplified logic: Allow CA to edit CA column, CS to edit CS column
        const canEditCA = currentUser?.role === 'CA' && type === 'ca';
        const canEditCS = currentUser?.role === 'CS' && type === 'cs';
        
        console.log('🔍 Verification cell check', { 
            type, 
            userRole: currentUser?.role, 
            canEditCA, 
            canEditCS, 
            allowCAEdit,
            willShowDropdown: (canEditCA && allowCAEdit) || (canEditCS && allowCAEdit)
        });

        const check = complianceTasks.find(c => c.taskId === item.taskId);
        const status = check ? (type === 'ca' ? check.caStatus : check.csStatus) : ComplianceStatus.Pending;
        const isRequired = type === 'ca' ? item.caRequired : item.csRequired;

        console.log('🔍 Task requirement check:', { 
            taskId: item.taskId, 
            type, 
            isRequired, 
            caRequired: item.caRequired, 
            csRequired: item.csRequired 
        });

        // NOTE: We will still show the dropdown for CA/CS editors even if the task is not required,
        // so they can explicitly set a status. If the user is not allowed to edit, we fall back to display.

        // Show dropdown for CA/CS users in their respective columns when allowCAEdit is true
        const shouldShowDropdown = ((canEditCA && allowCAEdit) || (canEditCS && allowCAEdit));
        console.log('🔍 Dropdown decision:', { 
            shouldShowDropdown, 
            canEditCA, 
            canEditCS, 
            allowCAEdit,
            type,
            userRole: currentUser?.role
        });
        
        if (shouldShowDropdown) {
            console.log('🔍 Showing dropdown for', type, 'column');
            return (
                <select
                    value={status}
                    onChange={async (e) => {
                        const newStatus = e.target.value as ComplianceStatus;
                        console.log('Updating compliance status:', {
                            startupId: startup.id,
                            taskId: item.taskId,
                            type,
                            newStatus,
                            user: currentUser?.email
                        });
                        
                        // Update local state immediately for instant UI feedback
                        setComplianceTasksNormalized(prevTasks => 
                            prevTasks.map(task => 
                                task.taskId === item.taskId 
                                    ? { 
                                        ...task, 
                                        [type === 'ca' ? 'caStatus' : 'csStatus']: newStatus 
                                    }
                                    : task
                            )
                    );
                        
                        if (onUpdateCompliance) {
                            onUpdateCompliance(startup.id, item.taskId, type, newStatus);
                        }
                        
                        // Update database in background
                        try {
                            await complianceRulesIntegrationService.updateComplianceStatus(
                                startup.id,
                                item.taskId,
                                newStatus,
                                type.toUpperCase() as 'CA' | 'CS'
                    );

                            // Recompute and update overall status after a change
                            const updated = complianceTasks.map(task =>
                                task.taskId === item.taskId
                                    ? {
                                        ...task,
                                        [type === 'ca' ? 'caStatus' : 'csStatus']: newStatus,
                                      }
                                    : task
                    );
                            await syncOverallComplianceStatus(updated as any);
                        } catch (error) {
                            console.error('Error updating compliance status:', error);
                            // Revert local state if database update fails
                            setComplianceTasksNormalized(prevTasks => 
                                prevTasks.map(task => 
                                    task.taskId === item.taskId 
                                        ? { 
                                            ...task, 
                                            [type === 'ca' ? 'caStatus' : 'csStatus']: status 
                                        }
                                        : task
                                )
                    );
                        }
                    }}
                    className="bg-white border border-gray-300 rounded-md px-2 py-1 text-xs focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value={ComplianceStatus.Pending}>Pending</option>
                    <option value={ComplianceStatus.Submitted}>Submitted</option>
                    <option value={ComplianceStatus.Verified}>Verified</option>
                    <option value={ComplianceStatus.Rejected}>Rejected</option>
                </select>
                    );
        }

        // If user cannot edit: show display; if task is not required show NotRequired explicitly
        console.log('🔍 Showing static display for', type, 'column with status:', status, 'isRequired:', isRequired, 'task:', item.task, 'caRequired:', item.caRequired, 'csRequired:', item.csRequired);
        if (!isRequired) {
            console.log('🔍 Task not required for', type, '- showing NotRequired');
            return <VerificationStatusDisplay status={ComplianceStatus.NotRequired} />;
        }
        console.log('🔍 Task required for', type, '- showing status:', status);
        return <VerificationStatusDisplay status={status} />;
    };

    const handleUpload = (task: IntegratedComplianceTask) => {
        setSelectedTask(task);
        setSelectedFile(null);
        setUploadSuccess(false);
        setUploadModalOpen(true);
    };

    const handleFileSelect = (file: File | null) => {
        console.log('📤 ComplianceTab handleFileSelect called with file:', file);
        setSelectedFile(file);
        setUploadSuccess(false);
        // Clear cloud drive URL when a file is selected
        if (file) {
            setCloudDriveUrl('');
        }
    };

    const handleFileUpload = async () => {
        if (!selectedTask || !currentUser || !selectedFile) {
            console.error('Missing required data for upload:', {
                selectedTask: !!selectedTask,
                currentUser: !!currentUser,
                selectedFile: !!selectedFile
            });
            messageService.error(
                'Upload Error',
                'Missing required information. Please try again.'
            );
            return;
        }

        try {
            setUploading(true);
            console.log('📤 Starting file upload:', {
                startupId: startup.id,
                taskId: selectedTask.taskId,
                fileName: selectedFile.name,
                fileSize: selectedFile.size,
                uploadedBy: currentUser.email
            });
            
            const result = await complianceRulesIntegrationService.uploadComplianceDocument(
                startup.id,
                selectedTask.taskId,
                selectedFile,
                currentUser.email || 'unknown'
            );
            
            if (result && result.success) {
                console.log('✅ Upload successful:', result);
                
                // Show success message
                messageService.success(
                    'Document Uploaded',
                    `Compliance document "${selectedTask.taskName}" has been uploaded successfully.`,
                    3000
                );
                
                // Check if status update had any issues (it's logged but doesn't fail the upload)
                if (result.statusUpdateError) {
                    console.warn('⚠️ Upload succeeded but status update failed:', result.statusUpdateError);
                    // Only show migration message if it's actually a constraint error
                    if (result.statusUpdateError.includes('constraint') || result.statusUpdateError.includes('DATABASE CONSTRAINT')) {
                        messageService.error(
                            'Status Update Failed',
                            'Document uploaded successfully, but status could not be updated to "Submitted". ' +
                            'Please run the database migration: ADD_SUBMITTED_STATUS_TO_COMPLIANCE_CHECKS.sql'
                        );
                    } else {
                        // Other errors (like missing fields) - show generic message
                        console.warn('⚠️ Status update failed for other reason:', result.statusUpdateError);
                        // Don't show error to user - upload succeeded, status update is secondary
                    }
                }
                
                setUploadSuccess(true);
                setSelectedFile(null);
                
                // Wait a moment for database to commit, then refresh
                console.log('[UPLOAD] Waiting for database to commit status update...');
                setTimeout(async () => {
                    console.log('[UPLOAD] Refreshing compliance data...');
                    await loadComplianceData(); // Refresh data
                    console.log('[UPLOAD] Compliance data refreshed');
                }, 500); // Small delay to ensure DB commit
                
                // Close modal after 2 seconds
                setTimeout(() => {
                    setUploadModalOpen(false);
                    setSelectedTask(null);
                    setUploadSuccess(false);
                }, 2000);
            } else {
                console.error('❌ Upload failed:', result);
                messageService.error(
                    'Upload Failed',
                    result?.error || 'Upload failed. Please check if the database tables are set up correctly.'
                );
            }
        } catch (error) {
            console.error('❌ Error uploading file:', error);
            messageService.error(
                'Upload Error',
                error instanceof Error ? error.message : 'Error uploading file. Please try again.'
            );
        } finally {
            setUploading(false);
        }
    };

    const handleCloudDriveUpload = async () => {
        if (!selectedTask || !currentUser || !cloudDriveUrl.trim()) return;

        try {
            setUploading(true);
            // Use the existing compliance service to save the cloud drive URL
            // We'll create a mock file object with the cloud drive URL
            const mockFile = new File([], 'cloud-drive-document.pdf', { type: 'application/pdf' });
            
            // Store the cloud drive URL in the file object for the service to use
            (mockFile as any).cloudDriveUrl = cloudDriveUrl;
            
            const result = await complianceRulesIntegrationService.uploadComplianceDocument(
                startup.id,
                selectedTask.taskId,
                mockFile,
                currentUser.email || 'unknown'
            );
            
            if (result && result.success) {
                console.log('✅ Cloud drive URL saved successfully:', result);
                
                // Show success message
                messageService.success(
                    'Document Saved',
                    `Cloud drive link for "${selectedTask.taskName}" has been saved successfully.`,
                    3000
                );
                
                setUploadSuccess(true);
                setCloudDriveUrl('');
                setUseCloudDrive(false);
                loadComplianceData(); // Refresh data
                
                // Close modal after 2 seconds
                setTimeout(() => {
                    setUploadModalOpen(false);
                    setSelectedTask(null);
                    setUploadSuccess(false);
                }, 2000);
            } else {
                throw new Error(result?.error || 'Failed to save cloud drive URL');
            }
        } catch (error) {
            console.error('Cloud drive URL save failed:', error);
            messageService.error('Save Failed', 'Failed to save cloud drive URL. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteUpload = async (uploadId: string) => {
        if (!currentUser) return;

        // Set the target ID and open confirmation modal
        setDeleteTargetId(uploadId);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;

        try {
            const success = await complianceRulesIntegrationService.deleteComplianceUpload(deleteTargetId);
            if (success) {
                console.log('Delete successful');
                loadComplianceData(); // Refresh data
            } else {
                messageService.error(
                  'Delete Failed',
                  'Delete failed. Please try again.'
                );
            }
        } catch (error) {
            console.error('Delete error:', error);
            messageService.error(
              'Delete Failed',
              'Delete failed. Please try again.'
            );
        } finally {
            setDeleteModalOpen(false);
            setDeleteTargetId(null);
        }
    };

    const getUploadsForTask = useMemo(() => (taskId: string): ComplianceUpload[] => {
        const task = complianceTasks.find(t => t.taskId === taskId);
        return task?.uploads || [];
    }, [complianceTasks]);

    // Only Startup/Admin can upload/delete. Everyone can view existing uploads.
    const canUpload = currentUser?.role === 'Startup' || currentUser?.role === 'Admin';

    // Function to toggle is_applicable status for a compliance task
    const handleToggleApplicable = async (taskId: string, isApplicable: boolean) => {
        try {
            console.log('🔄 ========== STARTING TOGGLE ==========');
            console.log('🔄 Toggling applicable for task:', taskId, 'to:', isApplicable);
            console.log('🔄 Current complianceTasks length:', complianceTasks.length);
            
            // Find the task in local state to get its details
            const taskInState = complianceTasks.find(t => t.taskId === taskId);
            
            if (!taskInState) {
                console.error('❌ Task not found in state:', taskId);
                console.error('❌ Available taskIds:', complianceTasks.map(t => t.taskId));
                messageService.error('Update Failed', 'Task not found.', 3000);
                return;
            }
            
            console.log('🔄 Found task in state:', {
                taskId: taskInState.taskId,
                currentIsApplicable: taskInState.isApplicable,
                type: typeof taskInState.isApplicable
            });
            
            // Use upsert to handle both insert and update cases
            // This avoids URL encoding issues with special characters in task_id
            const { data, error } = await supabase
                .from('compliance_checks')
                .upsert({
                    startup_id: startup.id,
                    task_id: taskId,
                    entity_identifier: taskInState.entityIdentifier || 'startup',
                    entity_display_name: taskInState.entityDisplayName || 'Parent Company',
                    year: taskInState.year,
                    task_name: taskInState.task,
                    ca_required: taskInState.caRequired || false,
                    cs_required: taskInState.csRequired || false,
                    ca_status: taskInState.caStatus || 'Pending',
                    cs_status: taskInState.csStatus || 'Pending',
                    is_applicable: isApplicable
                }, {
                    onConflict: 'startup_id,task_id',
                    ignoreDuplicates: false
                })
                .select();
            
            if (error) {
                console.error('❌ Error upserting is_applicable:', error);
                messageService.error('Update Failed', `Failed to update compliance applicability: ${error.message}`, 3000);
                return;
            }
            
            console.log('✅ Successfully updated compliance_checks:', data);
            console.log('🔍 Updated row is_applicable value:', data?.[0]?.is_applicable);
            console.log('🔄 About to update local state...');
            
            // Update local state immediately for responsive UI (optimistic update)
            // Use functional update to ensure we get the latest state
            // Explicitly convert to boolean to ensure React detects the change
            // Store as explicit boolean (true or false), never undefined
            const booleanValue: boolean = isApplicable === true;
            
            console.log('🔄 State update - taskId:', taskId, 'old value:', taskInState.isApplicable, 'new value:', booleanValue);
            
            setComplianceTasksNormalized(prevTasks => {
                console.log('🔄 setComplianceTasksNormalized called - prevTasks length:', prevTasks.length);
                
                // Create a completely new array with new object references to force React re-render
                const updated = prevTasks.map(task => {
                    if (task.taskId === taskId) {
                        // Create a completely new object with all properties spread
                        const updatedTask: IntegratedComplianceTask = {
                            ...task,
                            isApplicable: booleanValue // Explicitly set the new value
                        };
                        console.log('🔄 State update - task found, updating:', {
                            taskId: task.taskId,
                            oldIsApplicable: task.isApplicable,
                            newIsApplicable: booleanValue,
                            oldType: typeof task.isApplicable,
                            newType: typeof booleanValue,
                            taskReference: task === updatedTask ? 'SAME REF' : 'NEW REF',
                            valuesEqual: task.isApplicable === booleanValue,
                            oldIsChecked: task.isApplicable !== false,
                            newIsChecked: booleanValue !== false
                        });
                        return updatedTask;
                    }
                    return task; // Return unchanged task (same reference is fine for non-matching tasks)
                });
                
                // Verify the update
                const updatedTask = updated.find(t => t.taskId === taskId);
                console.log('🔍 State update complete - updated task:', {
                    taskId: updatedTask?.taskId,
                    isApplicable: updatedTask?.isApplicable,
                    type: typeof updatedTask?.isApplicable,
                    isChecked: updatedTask?.isApplicable === true,
                    willRenderAs: updatedTask?.isApplicable === true ? 'ON (blue)' : 'OFF (gray)'
                });
                
                // Log the entire updated array to see if it changed
                console.log('🔍 Updated array length:', updated.length);
                console.log('🔍 Updated array reference changed:', updated !== prevTasks);
                
                // Check if the specific task was actually updated
                const beforeTask = prevTasks.find(t => t.taskId === taskId);
                const afterTask = updated.find(t => t.taskId === taskId);
                console.log('🔍 Before/After comparison:', {
                    taskId: taskId,
                    before: beforeTask?.isApplicable,
                    beforeType: typeof beforeTask?.isApplicable,
                    after: afterTask?.isApplicable,
                    afterType: typeof afterTask?.isApplicable,
                    changed: beforeTask?.isApplicable !== afterTask?.isApplicable,
                    willNormalizeTo: afterTask?.isApplicable === undefined || afterTask?.isApplicable === null ? 'true (default)' : String(afterTask?.isApplicable)
                });
                
                // Return the new array (map creates a new array, ensuring React detects the change)
                console.log('🔄 Returning updated array from setComplianceTasksNormalized');
                return updated;
            });
            
            console.log('🔄 State update function completed');
            console.log('🔄 ========== TOGGLE COMPLETE ==========');
            
            // Verify the state was actually updated by checking it after a brief delay
            setTimeout(() => {
                const currentTask = complianceTasks.find(t => t.taskId === taskId);
                console.log('🔍 Post-update verification (after 100ms):', {
                    taskId: taskId,
                    isApplicable: currentTask?.isApplicable,
                    type: typeof currentTask?.isApplicable,
                    isChecked: currentTask?.isApplicable === true
                });
            }, 100);
            
            messageService.success('Updated', `Compliance task ${isApplicable ? 'enabled' : 'disabled'} successfully.`, 2000);
            
            // Note: We don't reload compliance data here to avoid overwriting the optimistic update
            // The state update above ensures the UI reflects the change immediately
            // The database is already updated, so the next natural refresh will show the correct value
        } catch (err) {
            console.error('Error in handleToggleApplicable:', err);
            messageService.error('Update Failed', 'Failed to update compliance applicability.', 3000);
        }
    };

    // Group DB tasks by entity for display (filter out stale entities not in profile)
    const dbTasksGrouped = useMemo((): { [entityName: string]: IntegratedComplianceTask[] } => {
        if (!complianceTasks || complianceTasks.length === 0) return {};
        
        const groups: { [entityName: string]: IntegratedComplianceTask[] } = {};
        const expectedEntities = new Set<string>();
        
        // Helper function to normalize entity display name (handle country code variations)
        const normalizeEntityName = (entityName: string): string => {
            // Extract country code/name from entity display name
            // Format: "Parent Company (IN)" or "Parent Company (India)" or "Subsidiary 0 (US)" etc.
            const match = entityName.match(/^(.+?)\s*\((.+?)\)$/);
            if (match) {
                const [, entityType, country] = match;
                const normalizedCountry = normalizeCountryNameForDisplay(country);
                return `${entityType} (${normalizedCountry})`;
            }
            return entityName; // Return as-is if pattern doesn't match
        };
        
        // Build expected entity names with normalized country names
        if (startup.country_of_registration) {
            const normalizedCountry = normalizeCountryNameForDisplay(startup.country_of_registration);
            expectedEntities.add(`Parent Company (${normalizedCountry})`);
        }
        
        // Add subsidiaries from profile data
        if (profileData?.subsidiaries) {
            profileData.subsidiaries.forEach((sub: any, index: number) => {
                if (sub.country) {
                    const normalizedCountry = normalizeCountryNameForDisplay(sub.country);
                    expectedEntities.add(`Subsidiary ${index} (${normalizedCountry})`);
                }
            });
        }
        
        // Add international operations if they exist
        if (profileData?.internationalOps) {
            profileData.internationalOps.forEach((op: any, index: number) => {
                if (op.country) {
                    const normalizedCountry = normalizeCountryNameForDisplay(op.country);
                    expectedEntities.add(`International Operation ${index} (${normalizedCountry})`);
                }
            });
        }
        
        console.log('🔍 Expected entities for filtering:', Array.from(expectedEntities));
        console.log('🔍 All compliance tasks entityDisplayNames:', complianceTasks.map(t => t.entityDisplayName));
        console.log('🔍 Profile data subsidiaries:', profileData?.subsidiaries);
        console.log('🔍 Startup country_of_registration:', startup.country_of_registration);
        
        // Group tasks by entity with normalized names
        for (const t of complianceTasks) {
            // Normalize the entity display name to handle "IN" vs "India" variations
            const normalizedEntityName = normalizeEntityName(t.entityDisplayName);
            
            // TEMPORARY: Disable filtering to see all tasks
            // TODO: Fix entity name matching
            // if (expectedEntities.size > 0 && !expectedEntities.has(normalizedEntityName)) {
            //     console.log('🔍 Skipping task with entityDisplayName:', t.entityDisplayName, 'normalized to:', normalizedEntityName, 'as it\'s not in expected entities');
            //     continue; // Skip stale entities
            // }
            if (!groups[normalizedEntityName]) groups[normalizedEntityName] = [];
            groups[normalizedEntityName].push({
                entityIdentifier: t.entityIdentifier,
                entityDisplayName: normalizedEntityName, // Use normalized name
                year: t.year,
                task: t.task,
                taskId: t.taskId,
                caRequired: t.caRequired,
                csRequired: t.csRequired,
                caStatus: t.caStatus,
                csStatus: t.csStatus,
                isApplicable: t.isApplicable !== undefined && t.isApplicable !== null ? t.isApplicable : true, // CRITICAL: Preserve isApplicable!
                uploads: t.uploads,
                complianceRule: t.complianceRule,
                frequency: t.frequency,
                complianceDescription: t.complianceDescription,
                caType: t.caType,
                csType: t.csType
            });
        }
        
        console.log('🔍 Final grouped tasks:', Object.keys(groups));
        
        // Sort within groups for consistency
        Object.values(groups).forEach(taskList => {
            taskList.sort((a, b) => b.year - a.year || a.task.localeCompare(b.task));
        });
        
        return groups;
    }, [complianceTasks, startup.country_of_registration, profileData]);

    // Only DB-backed tasks are displayed
    const displayTasks = useMemo((): { [entityName: string]: IntegratedComplianceTask[] } => {
        return dbTasksGrouped;
    }, [dbTasksGrouped]);

    // Filter tasks based on current filters
    const filteredTasks = useMemo((): { [entityName: string]: IntegratedComplianceTask[] } => {
        if (filters.entity === 'all' && filters.year === 'all') {
            return displayTasks;
        }
        
        return Object.fromEntries(
            Object.entries(displayTasks).map(([entityName, tasks]) => [
                entityName,
                (tasks as IntegratedComplianceTask[]).filter(task => 
                    (filters.entity === 'all' || entityName.includes(filters.entity)) &&
                    (filters.year === 'all' || task.year === parseInt(filters.year))
                )
            ]).filter(([_, tasks]) => (tasks as IntegratedComplianceTask[]).length > 0)
                    );
    }, [displayTasks, filters]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
                    );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-slate-700">Compliance Checklist</h2>
            
            {/* Submit New Compliance Section */}
            {!isViewOnly && currentUser?.role === 'Startup' && (
                <ComplianceSubmissionButton 
                    currentUser={currentUser} 
                    userRole="Startup" 
                    className="mb-0"
                />
            )}

            {/* Company Documents Section */}
            <CompanyDocumentsSection 
                startupId={startup.id}
                currentUser={currentUser}
                isViewOnly={isViewOnly}
            />

            {/* IP/Trademark Section */}
            <IPTrademarkSection 
                startupId={startup.id}
                currentUser={currentUser}
                isViewOnly={isViewOnly}
            />
            
            <div className="flex justify-end items-center">
                {/* Filters */}
                <div className="flex gap-4">
                    <select 
                        value={filters.entity} 
                        onChange={(e) => setFilters(prev => ({ ...prev, entity: e.target.value }))}
                        className="bg-white border border-gray-300 rounded-md px-3 py-1 text-sm"
                    >
                        <option value="all">All Entities</option>
                        {Object.keys(displayTasks).map(entity => (
                            <option key={entity} value={entity}>{entity}</option>
                        ))}
                    </select>
                    
                    <select 
                        value={filters.year} 
                        onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                        className="bg-white border border-gray-300 rounded-md px-3 py-1 text-sm"
                    >
                        <option value="all">All Years</option>
                        {Array.from(new Set(Object.values(displayTasks).flat().map((task: IntegratedComplianceTask) => task.year)))
                            .sort((a, b) => b - a)
                            .map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))
                        }
                    </select>
                </div>
            </div>

            {Object.keys(filteredTasks).length > 0 ? (
                Object.entries(filteredTasks).map(([entityName, tasks]) => {
                    // Extract country code from entity name (e.g., "Parent Company (IN)" -> "IN", "Parent Company (India)" -> extract from country name)
                    let countryCode: string | null = null;
                    
                    // Try to extract country code from format like "Parent Company (IN)"
                    const countryCodeMatch = entityName.match(/\(([A-Z]{2})\)/);
                    if (countryCodeMatch) {
                        countryCode = countryCodeMatch[1];
                    } else {
                        // Try to extract from country name format like "Parent Company (India)"
                        const countryNameMatch = entityName.match(/\((.+?)\)/);
                        if (countryNameMatch) {
                            const countryName = countryNameMatch[1];
                            // Try to convert country name to code
                            countryCode = getCountryCodeFromName(countryName);
                            
                            // If name-to-code conversion failed, get from startup/profile data
                            if (!countryCode) {
                                if (entityName.includes('Parent Company')) {
                                    countryCode = startup.country_of_registration || 'US';
                                } else if (entityName.includes('Subsidiary')) {
                                    // Extract subsidiary index and get country from profile data
                                    const subMatch = entityName.match(/Subsidiary (\d+)/);
                                    if (subMatch && profileData?.subsidiaries) {
                                        const subIndex = parseInt(subMatch[1], 10);
                                        const subsidiary = profileData.subsidiaries[subIndex];
                                        countryCode = subsidiary?.country || 'US';
                                    }
                                } else if (entityName.includes('International Operation')) {
                                    // For international ops, try to get country from entity name or use parent country
                                    const intlMatch = entityName.match(/International Operation (\d+)/);
                                    if (intlMatch && profileData?.internationalOps) {
                                        const intlIndex = parseInt(intlMatch[1], 10);
                                        const intlOp = profileData.internationalOps[intlIndex];
                                        countryCode = intlOp?.country || startup.country_of_registration || 'US';
                                    } else {
                                        countryCode = startup.country_of_registration || 'US';
                                    }
                                }
                            }
                        } else {
                            // No country in parentheses, use startup data
                            if (entityName.includes('Parent Company')) {
                                countryCode = startup.country_of_registration || 'US';
                            } else if (entityName.includes('Subsidiary')) {
                                const subMatch = entityName.match(/Subsidiary (\d+)/);
                                if (subMatch && profileData?.subsidiaries) {
                                    const subIndex = parseInt(subMatch[1], 10);
                                    const subsidiary = profileData.subsidiaries[subIndex];
                                    countryCode = subsidiary?.country || 'US';
                                }
                            }
                        }
                    }
                    
                    // Default to US if country code not found
                    const finalCountryCode = countryCode || 'US';
                    const professionalTitles = getCountryProfessionalTitles(finalCountryCode);
                    
                    // Check if any tasks in this entity require CA or CS verification
                    const hasCARequired = (tasks as IntegratedComplianceTask[]).some(task => task.caRequired);
                    const hasCSRequired = (tasks as IntegratedComplianceTask[]).some(task => task.csRequired);
                    
                    return (
                        <Card key={entityName}>
                            <h3 className="text-xl font-semibold text-slate-700 mb-4">{entityName}</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider text-center w-20">Year</th>
                                            <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider text-left w-48">Task</th>
                                            <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider text-center w-24">Applicable</th>
                                            {hasCARequired && (
                                                <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider text-center w-32">{professionalTitles.caTitle} Verified</th>
                                            )}
                                            {hasCSRequired && (
                                                <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider text-center w-32">{professionalTitles.csTitle} Verified</th>
                                            )}
                                            <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider text-center w-32">Action</th>
                                        </tr>
                                    </thead>
                                <tbody className="divide-y divide-slate-200 align-middle">
                                    {(tasks as IntegratedComplianceTask[]).map((item) => {
                                        // CRITICAL: Ensure isApplicable is always a boolean at render time
                                        // This is a final safety check in case normalization didn't catch it
                                        const safeIsApplicable: boolean = item.isApplicable === undefined || item.isApplicable === null 
                                            ? true 
                                            : item.isApplicable === true;
                                        
                                        // Create a normalized item for rendering
                                        const normalizedItem: IntegratedComplianceTask = {
                                            ...item,
                                            isApplicable: safeIsApplicable
                                        };
                                        
                                        // Log if we had to fix it
                                        if (item.isApplicable === undefined || item.isApplicable === null) {
                                            console.warn('⚠️ CRITICAL: Task had undefined isApplicable at render time, fixing:', item.taskId);
                                        }
                                        
                                        console.log('🔍 Rendering task:', { 
                                            taskId: normalizedItem.taskId, 
                                            task: normalizedItem.task, 
                                            caRequired: normalizedItem.caRequired, 
                                            csRequired: normalizedItem.csRequired,
                                            isApplicable: normalizedItem.isApplicable,
                                            type: typeof normalizedItem.isApplicable
                                        });
                                        const uploads = getUploadsForTask(normalizedItem.taskId);
                                        return (
                                            <tr key={`${normalizedItem.taskId}-${normalizedItem.isApplicable}`} className="hover:bg-slate-50 transition-colors h-16">
                                                <td className="p-4 whitespace-nowrap text-slate-600 text-center align-middle w-20">{normalizedItem.year}</td>
                                                <td className="p-4 whitespace-normal text-slate-900 font-medium text-left align-middle w-48">
                                                    <div>
                                                        <div className="font-medium">{normalizedItem.task}</div>
                                                        {normalizedItem.complianceRule && (
                                                            <div className="text-xs text-gray-500 mt-1 space-y-1">
                                                                {normalizedItem.frequency && (
                                                                    <div className="flex items-center gap-1">
                                                                        <Calendar className="w-3 h-3" />
                                                                        <span className="capitalize">{normalizedItem.frequency.replace('-', ' ')}</span>
                                                                    </div>
                                                                )}
                                                                {normalizedItem.complianceDescription && (
                                                                    <div className="flex items-start gap-1">
                                                                        <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                                        <span className="text-xs">{normalizedItem.complianceDescription}</span>
                                                                    </div>
                                                                )}
                                                                {(normalizedItem.caType || normalizedItem.csType) && (
                                                                    <div className="flex items-center gap-1">
                                                                        <User className="w-3 h-3" />
                                                                        <span className="text-xs">
                                                                            {normalizedItem.caType && normalizedItem.csType ? `${normalizedItem.caType} / ${normalizedItem.csType}` : 
                                                                             normalizedItem.caType || normalizedItem.csType}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                {(() => {
                                                    // Use the normalized item's isApplicable (guaranteed to be boolean)
                                                    // Explicitly convert to boolean for checkbox
                                                    const isChecked: boolean = normalizedItem.isApplicable === true;
                                                    const toggleId = `toggle-${normalizedItem.taskId}`;
                                                    
                                                    // Always log for tasks being toggled (check if this task was recently updated)
                                                    const shouldLog = normalizedItem.taskId.includes('2022') || 
                                                                     normalizedItem.taskId.includes('2023') || 
                                                                     normalizedItem.taskId.includes('2024') ||
                                                                     normalizedItem.taskId.includes('2025') ||
                                                                     normalizedItem.taskId.includes('2026');
                                                    if (shouldLog) {
                                                        console.log('🎨 Rendering toggle for task:', normalizedItem.taskId, 'isApplicable:', normalizedItem.isApplicable, 'isChecked:', isChecked, 'type:', typeof normalizedItem.isApplicable);
                                                    }
                                                    
                                                    return (
                                                        <td className="p-4 whitespace-nowrap text-center align-middle w-24" key={`toggle-cell-${normalizedItem.taskId}-${String(normalizedItem.isApplicable)}`}>
                                                            <div 
                                                                className={`relative inline-flex items-center ${canUpload ? 'cursor-pointer' : 'cursor-default'}`}
                                                                onClick={(e) => {
                                                                    if (!canUpload) return;
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    const newValue = !isChecked;
                                                                    console.log('🔄 TOGGLE CLICKED - task:', normalizedItem.taskId, 'current isChecked:', isChecked, 'newValue:', newValue, 'current isApplicable:', normalizedItem.isApplicable);
                                                                    handleToggleApplicable(normalizedItem.taskId, newValue);
                                                                }}
                                                                role={canUpload ? "button" : undefined}
                                                                tabIndex={canUpload ? 0 : undefined}
                                                                onKeyDown={(e) => {
                                                                    if (!canUpload) return;
                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                        e.preventDefault();
                                                                        const newValue = !isChecked;
                                                                        handleToggleApplicable(normalizedItem.taskId, newValue);
                                                                    }
                                                                }}
                                                            >
                                                                <input
                                                                    id={toggleId}
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    readOnly
                                                                    disabled={!canUpload}
                                                                    className="sr-only peer"
                                                                    key={`checkbox-${normalizedItem.taskId}-${String(normalizedItem.isApplicable)}`}
                                                                />
                                                                <div 
                                                                    className={`
                                                                        w-11 h-6 rounded-full transition-colors duration-200 ease-in-out
                                                                        relative
                                                                        ${isChecked ? 'bg-blue-600' : 'bg-gray-200'}
                                                                        peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300
                                                                        after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                                                                        after:bg-white after:border-gray-300 after:border
                                                                        after:rounded-full after:h-5 after:w-5 after:transition-all after:duration-200
                                                                        ${isChecked ? 'after:translate-x-full after:border-white' : 'after:translate-x-0'}
                                                                    `}
                                                                    key={`toggle-visual-${normalizedItem.taskId}-${String(normalizedItem.isApplicable)}`}
                                                                ></div>
                                                            </div>
                                                        </td>
                                                    );
                                                })()}
                                                {hasCARequired && (
                                                    <td className="p-4 whitespace-nowrap text-slate-600 text-center align-middle w-32">{getVerificationCell(normalizedItem, 'ca')}</td>
                                                )}
                                                {hasCSRequired && (
                                                    <td className="p-4 whitespace-nowrap text-slate-600 text-center align-middle w-32">{getVerificationCell(normalizedItem, 'cs')}</td>
                                                )}
                                                <td className="p-4 whitespace-nowrap text-center align-middle w-32">
                                                    <div className="flex items-center gap-2 justify-center">
                                                        {/* Anyone can view if a document exists */}
                                                        {uploads.length > 0 && (
                                                            <button 
                                                                onClick={() => window.open(uploads[0].fileUrl, '_blank')}
                                                                className="px-3 py-2 rounded-md font-semibold transition-colors flex items-center gap-2 text-xs bg-green-100 text-green-700 hover:bg-green-200"
                                                                title="View document"
                                                            >
                                                                <Eye size={14} />
                                                                View
                                                            </button>
                                                        )}

                                                        {/* Upload button - show message if toggle is OFF (visible to all users) */}
                                                        {uploads.length === 0 && (
                                                            normalizedItem.isApplicable === false ? (
                                                                <div className="px-3 py-2 rounded-md text-xs bg-yellow-50 border border-yellow-200 text-yellow-700 flex items-center gap-2 max-w-xs">
                                                                    <AlertCircle size={14} className="flex-shrink-0" />
                                                                    <span className="text-center">Task marked as not applicable</span>
                                                                </div>
                                                            ) : canUpload ? (
                                                                <button 
                                                                    onClick={() => handleUpload(normalizedItem)}
                                                                    className="px-3 py-2 rounded-md font-semibold transition-colors flex items-center gap-2 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200"
                                                                    title="Upload document"
                                                                >
                                                                    <UploadCloud size={14} />
                                                                    Upload
                                                                </button>
                                                            ) : null
                                                        )}
                                                        {canUpload && uploads.length > 0 && (
                                                            <button 
                                                                onClick={() => handleDeleteUpload(uploads[0].id)}
                                                                className="px-3 py-2 rounded-md font-semibold transition-colors flex items-center gap-2 text-xs bg-red-100 text-red-700 hover:bg-red-200"
                                                                title="Delete document"
                                                            >
                                                                <Trash2 size={14} />
                                                                Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                    );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                    );
                })
            ) : (
                <Card>
                    <div className="p-8 text-center text-slate-500">
                        {!startup.country_of_registration || !startup.company_type || !startup.registration_date ? (
                            <div>
                                <p className="text-lg font-semibold mb-2">No Profile Data</p>
                                <p>Please complete your startup profile first to generate compliance tasks.</p>
                                <p className="text-sm mt-2">Go to the Profile tab and set your country, company type, and registration date.</p>
                            </div>
                        ) : complianceTasks.length === 0 ? (
                            <div>
                                <p className="text-lg font-semibold mb-2">No Compliance Tasks Found</p>
                                <p>Tasks are driven by admin-defined rules. Once rules exist for your profile's country and company type, they will appear here automatically.</p>
                                <p className="text-sm mt-2">
                                    Country: <span className="font-medium">{startup.country_of_registration}</span> | 
                                    Company Type: <span className="font-medium">{startup.company_type}</span> | 
                                    Registration: <span className="font-medium">{startup.registration_date}</span>
                                </p>
                                <p className="text-sm mt-2 text-gray-500">
                                    If this seems incorrect, please contact the administrator to configure compliance rules in the Admin → Compliance Rules tab.
                                </p>
                            </div>
                        ) : null}
                        </div>
                </Card>
            )}

            {/* Upload Modal */}
            <Modal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)}>
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Upload Compliance Document</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Task: {selectedTask?.task} ({selectedTask?.year})
                    </p>
                    
                    {uploadSuccess ? (
                        <div className="text-center py-8">
                            <div className="text-green-600 mb-4">
                                <CheckCircle className="w-16 h-16 mx-auto" />
                            </div>
                            <h4 className="text-lg font-semibold text-green-600 mb-2">Upload Successful!</h4>
                            <p className="text-sm text-gray-600">Your document has been uploaded successfully.</p>
                            <p className="text-xs text-gray-500 mt-2">This window will close automatically...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Cloud Drive URL Option */}
                            <CloudDriveInput
                                value={cloudDriveUrl}
                                onChange={(url) => {
                                    console.log('📤 ComplianceTab CloudDriveInput onChange called with URL:', url);
                                    setCloudDriveUrl(url);
                                    // Clear selected file when URL is entered
                                    if (url && url.trim()) {
                                        setSelectedFile(null);
                                    }
                                }}
                                onFileSelect={handleFileSelect}
                                placeholder="Paste your cloud drive link here..."
                                label="Compliance Document"
                                required={true}
                                accept=".pdf"
                                maxSize={10}
                                documentType="compliance document"
                                showPrivacyMessage={false}
                            />
                            
                            {/* Show selected file info */}
                            {selectedFile && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                                    <p className="text-sm text-blue-700 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" />
                                        <span className="font-medium">Selected file:</span>
                                        <span>{selectedFile.name}</span>
                                        <span className="text-blue-500">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                                    </p>
                                </div>
                            )}
                            
                            <div className="flex justify-end gap-3">
                                <Button 
                                    variant="secondary" 
                                    onClick={() => {
                                        setUploadModalOpen(false);
                                        setSelectedFile(null);
                                        setCloudDriveUrl('');
                                        setUseCloudDrive(false);
                                        setUploadSuccess(false);
                                    }}
                                    disabled={uploading}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={() => {
                                        console.log('📤 Upload button clicked:', {
                                            hasCloudDriveUrl: !!cloudDriveUrl.trim(),
                                            hasSelectedFile: !!selectedFile,
                                            cloudDriveUrl: cloudDriveUrl.trim(),
                                            selectedFileName: selectedFile?.name
                                        });
                                        if (cloudDriveUrl.trim()) {
                                            handleCloudDriveUpload();
                                        } else if (selectedFile) {
                                            handleFileUpload();
                                        }
                                    }}
                                    disabled={uploading || (!selectedFile && !cloudDriveUrl.trim())}
                                    className={(!selectedFile && !cloudDriveUrl.trim()) ? 'opacity-50 cursor-not-allowed' : ''}
                                >
                                    {uploading ? 'Saving...' : (cloudDriveUrl.trim() ? 'Save Cloud Drive Link' : 'Upload Document')}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
                <div className="p-6">
                    <div className="text-center">
                        <div className="text-red-600 mb-4">
                            <AlertCircle className="w-16 h-16 mx-auto" />
                        </div>
                        <h3 className="text-lg font-semibold text-red-600 mb-2">Confirm Deletion</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Are you sure you want to delete this document? This action cannot be undone.
                        </p>
                        <div className="flex justify-center gap-3">
                            <Button 
                                variant="secondary" 
                                onClick={() => setDeleteModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={confirmDelete}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                Delete Document
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
                    );
};

export default ComplianceTab;
