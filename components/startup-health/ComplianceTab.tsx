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

    // Track syncing to avoid loops
    const isSyncingRef = useRef(false);
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
    }, [startup.id, startup.profile]);

    // Watch for profile updates from other components
    useEffect(() => {
        if (onProfileUpdated !== undefined) {
            console.log('🔄 Profile updated trigger received:', onProfileUpdated, 'refreshing profile data...');
            loadProfileData();
        }
    }, [onProfileUpdated]);

    // Load compliance data from backend
    useEffect(() => {
        loadComplianceData();
    }, [startup.id, profileData]); // Reload when startup ID or profile data changes

    // Sync compliance tasks when startup data changes (for new tasks)
    useEffect(() => {
        if (!profileData) return; // Wait for profile data to load
        
        // Create entity signature from profile data including subsidiaries
        const entitySignature = JSON.stringify({
            country: profileData.country || startup.country_of_registration || null,
            companyType: profileData.companyType || startup.company_type || null,
            registrationDate: profileData.registrationDate || startup.registration_date || null,
            subsidiaries: profileData.subsidiaries || []
        });

        // Only sync when primary/entity-defining fields change
        if (lastEntitySignatureRef.current !== entitySignature && !isSyncingRef.current) {
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
            setComplianceTasks(integratedTasks || []);

            // After loading tasks, ensure overall startup status reflects per-task verification
            await syncOverallComplianceStatus(integratedTasks || []);
        } catch (error) {
            console.error('Error loading compliance data:', error);
            setComplianceTasks([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Compute and update overall startup compliance based on task statuses
    const syncOverallComplianceStatus = async (tasks: IntegratedComplianceTask[]) => {
        try {
            if (!tasks || tasks.length === 0) return;

            // CS rule requested:
            // - If user is CS: Compliant only when ALL CS-required tasks are Verified; otherwise Pending.
            // - For other roles: original behavior (rejections -> Non-Compliant; all required verified -> Compliant; else Pending).
            let hasRejected = false;
            let csHasRejected = false;
            let caHasRejected = false;
            let allRequiredVerifiedForCurrentRole = true;

            for (const t of tasks) {
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
                        setComplianceTasks(prevTasks => 
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
                            setComplianceTasks(prevTasks => 
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
                setUploadSuccess(true);
                setSelectedFile(null);
                loadComplianceData(); // Refresh data
                
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
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-slate-700">Compliance Checklist</h2>
                
                {/* Compliance Submission Button - Only show for Startup users */}
                {!isViewOnly && currentUser?.role === 'Startup' && (
                    <ComplianceSubmissionButton 
                        currentUser={currentUser} 
                        userRole="Startup" 
                        className="mb-0"
                    />
                )}
            </div>

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
                    
                    return (
                        <Card key={entityName}>
                            <h3 className="text-xl font-semibold text-slate-700 mb-4">{entityName}</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider text-center w-20">Year</th>
                                            <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider text-left w-48">Task</th>
                                            <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider text-center w-32">{professionalTitles.caTitle} Verified</th>
                                            <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider text-center w-32">{professionalTitles.csTitle} Verified</th>
                                            <th className="p-4 text-sm font-semibold text-slate-600 uppercase tracking-wider text-center w-32">Action</th>
                                        </tr>
                                    </thead>
                                <tbody className="divide-y divide-slate-200 align-middle">
                                    {(tasks as IntegratedComplianceTask[]).map((item) => {
                                        console.log('🔍 Rendering task:', { 
                                            taskId: item.taskId, 
                                            task: item.task, 
                                            caRequired: item.caRequired, 
                                            csRequired: item.csRequired 
                                        });
                                        const uploads = getUploadsForTask(item.taskId);
                                        return (
                                            <tr key={item.taskId} className="hover:bg-slate-50 transition-colors h-16">
                                                <td className="p-4 whitespace-nowrap text-slate-600 text-center align-middle w-20">{item.year}</td>
                                                <td className="p-4 whitespace-normal text-slate-900 font-medium text-left align-middle w-48">
                                                    <div>
                                                        <div className="font-medium">{item.task}</div>
                                                        {item.complianceRule && (
                                                            <div className="text-xs text-gray-500 mt-1 space-y-1">
                                                                {item.frequency && (
                                                                    <div className="flex items-center gap-1">
                                                                        <Calendar className="w-3 h-3" />
                                                                        <span className="capitalize">{item.frequency.replace('-', ' ')}</span>
                                                                    </div>
                                                                )}
                                                                {item.complianceDescription && (
                                                                    <div className="flex items-start gap-1">
                                                                        <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                                        <span className="text-xs">{item.complianceDescription}</span>
                                                                    </div>
                                                                )}
                                                                {(item.caType || item.csType) && (
                                                                    <div className="flex items-center gap-1">
                                                                        <User className="w-3 h-3" />
                                                                        <span className="text-xs">
                                                                            {item.caType && item.csType ? `${item.caType} / ${item.csType}` : 
                                                                             item.caType || item.csType}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 whitespace-nowrap text-slate-600 text-center align-middle w-32">{getVerificationCell(item, 'ca')}</td>
                                                <td className="p-4 whitespace-nowrap text-slate-600 text-center align-middle w-32">{getVerificationCell(item, 'cs')}</td>
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

                                                        {/* Only Startup/Admin can upload/delete */}
                                                        {canUpload && uploads.length === 0 && (
                                                            <button 
                                                                onClick={() => handleUpload(item)}
                                                                className="px-3 py-2 rounded-md font-semibold transition-colors flex items-center gap-2 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200"
                                                                title="Upload document"
                                                            >
                                                                <UploadCloud size={14} />
                                                                Upload
                                                            </button>
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
