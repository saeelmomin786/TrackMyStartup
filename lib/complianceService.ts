import { supabase } from './supabase';
import { ComplianceStatus, ComplianceCheck } from '../types';

export interface ComplianceUpload {
    id: string;
    taskId: string;
    fileName: string;
    fileUrl: string;
    uploadedBy: string;
    uploadedAt: string;
    fileSize: number;
    fileType: string;
}

export interface ComplianceTask {
    taskId: string;
    entityIdentifier: string;
    entityDisplayName: string;
    year: number;
    task: string;
    caRequired: boolean;
    csRequired: boolean;
    caStatus: ComplianceStatus;
    csStatus: ComplianceStatus;
    uploads: ComplianceUpload[];
    documentUrl?: string;
}

export interface ComplianceFilters {
    entity?: string;
    year?: number;
    status?: ComplianceStatus;
    country?: string;
}

class ComplianceService {
    // Update overall startup compliance in startups table
    async updateStartupOverallCompliance(startupId: number, status: ComplianceStatus): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('startups')
                .update({ compliance_status: status })
                .eq('id', startupId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error updating overall startup compliance:', error);
            return false;
        }
    }
    // Check if compliance tables exist
    async checkTablesExist(): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('compliance_checks')
                .select('*')
                .limit(1);
            
            return !error;
        } catch (error) {
            console.log('Compliance tables do not exist yet:', error);
            return false;
        }
    }

    // Get compliance tasks for a startup
    async getComplianceTasks(startupId: number, filters?: ComplianceFilters): Promise<ComplianceTask[]> {
        try {
            // First check if tables exist
            const tablesExist = await this.checkTablesExist();
            if (!tablesExist) {
                console.log('Compliance tables do not exist yet. Returning empty array.');
                return [];
            }

            let query = supabase
                .from('compliance_checks')
                .select('*')
                .eq('startup_id', startupId);

            if (filters?.entity) {
                query = query.eq('entity_identifier', filters.entity);
            }
            if (filters?.year) {
                query = query.eq('year', filters.year);
            }
            if (filters?.status) {
                query = query.or(`ca_status.eq.${filters.status},cs_status.eq.${filters.status}`);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching compliance tasks:', error);
                // If table doesn't exist, return empty array instead of throwing
                if (error.code === '42P01') { // Table doesn't exist
                    console.log('Compliance_checks table does not exist yet');
                    return [];
                }
                throw error;
            }

            // Transform the data to match our interface
            const transformedData: ComplianceTask[] = (data || []).map((item: any) => ({
                taskId: item.task_id,
                entityIdentifier: item.entity_identifier,
                entityDisplayName: item.entity_display_name,
                year: item.year,
                task: item.task_name,
                caRequired: item.ca_required,
                csRequired: item.cs_required,
                caStatus: item.ca_status as ComplianceStatus,
                csStatus: item.cs_status as ComplianceStatus,
                uploads: [], // We'll load uploads separately if needed
                documentUrl: undefined
            }));

            return transformedData;
        } catch (error) {
            console.error('Error in getComplianceTasks:', error);
            return [];
        }
    }

    // Get all compliance uploads for a startup
    async getAllComplianceUploads(startupId: number): Promise<{ [taskId: string]: ComplianceUpload[] }> {
        try {
            const { data, error } = await supabase
                .from('compliance_uploads')
                .select('*')
                .eq('startup_id', startupId);

            if (error) throw error;

            // Group uploads by taskId
            const groupedUploads: { [taskId: string]: ComplianceUpload[] } = {};
            (data || []).forEach((upload: any) => {
                if (!groupedUploads[upload.task_id]) {
                    groupedUploads[upload.task_id] = [];
                }
                groupedUploads[upload.task_id].push({
                    id: upload.id,
                    taskId: upload.task_id,
                    fileName: upload.file_name,
                    fileUrl: upload.file_url,
                    uploadedBy: upload.uploaded_by,
                    uploadedAt: upload.uploaded_at,
                    fileSize: upload.file_size,
                    fileType: upload.file_type
                });
            });

            return groupedUploads;
        } catch (error) {
            console.error('Error fetching compliance uploads:', error);
            return {};
        }
    }

    // Upload compliance document
    async uploadComplianceDocument(
        startupId: number,
        taskId: string,
        file: File,
        uploadedBy: string
    ): Promise<ComplianceUpload | null> {
        try {
            // Get userId from startup (for storage tracking)
            const { data: startupData } = await supabase
                .from('startups')
                .select('user_id')
                .eq('id', startupId)
                .single();
            
            const userId = startupData?.user_id || uploadedBy; // Fallback to uploadedBy if startup not found
            
            // Upload file to storage with tracking
            const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
            const fileName = `${startupId}/${taskId}/${Date.now()}_${safeName}`;
            
            const { uploadFileWithTracking } = await import('./uploadWithStorageTracking');
            const uploadResult = await uploadFileWithTracking({
                bucket: 'compliance-documents',
                path: fileName,
                file,
                cacheControl: '3600',
                upsert: true,
                userId: userId,
                fileType: 'compliance',
                relatedEntityType: 'compliance_task',
                relatedEntityId: taskId
            });

            if (!uploadResult.success || !uploadResult.url) {
                throw new Error(uploadResult.error || 'Upload failed');
            }

            // Save upload record to database
            const { data: recordData, error: recordError } = await supabase
                .from('compliance_uploads')
                .insert({
                    startup_id: startupId,
                    task_id: taskId,
                    file_name: file.name,
                    file_url: uploadResult.url,
                    uploaded_by: uploadedBy,
                    file_size: file.size,
                    file_type: file.type
                })
                .select()
                .single();

            if (recordError) throw recordError;

            return {
                id: recordData.id,
                taskId: recordData.task_id,
                fileName: recordData.file_name,
                fileUrl: recordData.file_url,
                uploadedBy: recordData.uploaded_by,
                uploadedAt: recordData.uploaded_at,
                fileSize: recordData.file_size,
                fileType: recordData.file_type
            };
        } catch (error) {
            console.error('Error uploading compliance document:', error);
            return null;
        }
    }

    // Delete compliance upload
    async deleteComplianceUpload(uploadId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('compliance_uploads')
                .delete()
                .eq('id', uploadId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting compliance upload:', error);
            return false;
        }
    }

    // Update compliance status
    async updateComplianceStatus(
        startupId: number,
        taskId: string,
        type: 'ca' | 'cs',
        status: ComplianceStatus,
        updatedBy: string
    ): Promise<boolean> {
        try {
            const updateData = type === 'ca' 
                ? { ca_status: status }
                : { cs_status: status };

            const { error } = await supabase
                .from('compliance_checks')
                .update(updateData)
                .eq('startup_id', startupId)
                .eq('task_id', taskId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error updating compliance status:', error);
            return false;
        }
    }

    // Get compliance summary for a startup
    async getComplianceSummary(startupId: number): Promise<{
        totalTasks: number;
        completedTasks: number;
        pendingTasks: number;
        overdueTasks: number;
        complianceRate: number;
    }> {
        try {
            const tablesExist = await this.checkTablesExist();
            if (!tablesExist) {
                return {
                    totalTasks: 0,
                    completedTasks: 0,
                    pendingTasks: 0,
                    overdueTasks: 0,
                    complianceRate: 0
                };
            }

            const { data, error } = await supabase
                .from('compliance_checks')
                .select('*')
                .eq('startup_id', startupId);

            if (error) {
                console.error('Error fetching compliance summary:', error);
                return {
                    totalTasks: 0,
                    completedTasks: 0,
                    pendingTasks: 0,
                    overdueTasks: 0,
                    complianceRate: 0
                };
            }

            const tasks = data || [];
            
            // IMPORTANT: Only count tasks where toggle is ON (is_applicable !== false)
            // Tasks with toggle OFF should not affect compliance summary
            // Default to true if is_applicable is null/undefined (backward compatibility)
            const applicableTasks = tasks.filter(task => 
                task.is_applicable !== false && task.is_applicable !== null
            );
            
            const totalTasks = applicableTasks.length;
            const completedTasks = applicableTasks.filter(task => 
                task.ca_status === ComplianceStatus.Verified && 
                task.cs_status === ComplianceStatus.Verified
            ).length;
            const pendingTasks = applicableTasks.filter(task => 
                task.ca_status === ComplianceStatus.Pending || 
                task.cs_status === ComplianceStatus.Pending
            ).length;
            const overdueTasks = applicableTasks.filter(task => {
                const currentYear = new Date().getFullYear();
                return task.year < currentYear && 
                    (task.ca_status === ComplianceStatus.Pending || 
                     task.cs_status === ComplianceStatus.Pending);
            }).length;

            const complianceRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

            return {
                totalTasks,
                completedTasks,
                pendingTasks,
                overdueTasks,
                complianceRate
            };
        } catch (error) {
            console.error('Error in getComplianceSummary:', error);
            return {
                totalTasks: 0,
                completedTasks: 0,
                pendingTasks: 0,
                overdueTasks: 0,
                complianceRate: 0
            };
        }
    }

    // Subscribe to compliance changes
    subscribeToComplianceChanges(startupId: number, callback: (payload: any) => void) {
        return supabase
            .channel(`compliance_${startupId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'compliance_checks',
                    filter: `startup_id=eq.${startupId}`
                },
                callback
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'compliance_uploads',
                    filter: `startup_id=eq.${startupId}`
                },
                callback
            )
            .subscribe();
    }

    // =====================================================
    // DYNAMIC COMPLIANCE TASK GENERATION
    // =====================================================

    // Generate compliance tasks dynamically based on profile
    async generateComplianceTasksFromProfile(startupId: number): Promise<ComplianceTask[]> {
        try {
            console.log('🔍 Generating compliance tasks from profile for startup:', startupId);
            
            // Call the database function to generate tasks
            const { data, error } = await supabase
                .rpc('generate_compliance_tasks_for_startup', {
                    startup_id_param: startupId
                });
            
            if (error) {
                console.error('Error generating compliance tasks from profile:', error);
                throw error;
            }
            
            // Transform the generated tasks to match our interface
            const transformedTasks: ComplianceTask[] = (data || []).map((task: any) => ({
                taskId: task.task_id,
                entityIdentifier: task.entity_identifier,
                entityDisplayName: task.entity_display_name,
                year: task.year,
                task: task.task_name,
                caRequired: task.ca_required,
                csRequired: task.cs_required,
                caStatus: ComplianceStatus.Pending,
                csStatus: ComplianceStatus.Pending,
                uploads: [],
                documentUrl: undefined
            }));
            
            console.log('🔍 Generated compliance tasks:', transformedTasks);
            return transformedTasks;
        } catch (error) {
            console.error('Error generating compliance tasks from profile:', error);
            return [];
        }
    }

    // Sync compliance tasks with database
    async syncComplianceTasksWithDatabase(startupId: number): Promise<boolean> {
        try {
            console.log('🔍 Syncing compliance tasks with database for startup:', startupId);
            
            // Generate tasks from profile
            const generatedTasks = await this.generateComplianceTasksFromProfile(startupId);

            // SAFETY: If generation produced no tasks, do NOT delete existing ones
            if (!generatedTasks || generatedTasks.length === 0) {
                console.warn('⚠️ Generated 0 compliance tasks. Skipping deletion to avoid wiping existing data.');
                return true;
            }

            // Clear existing tasks for this startup
            const { error: deleteError } = await supabase
                .from('compliance_checks')
                .delete()
                .eq('startup_id', startupId);
            
            if (deleteError) {
                console.error('Error clearing existing compliance tasks:', deleteError);
                throw deleteError;
            }
            
            // Insert new tasks
            if (generatedTasks.length > 0) {
                const taskRecords = generatedTasks.map(task => ({
                    startup_id: startupId,
                    task_id: task.taskId,
                    entity_identifier: task.entityIdentifier,
                    entity_display_name: task.entityDisplayName,
                    year: task.year,
                    task_name: task.task,
                    ca_required: task.caRequired,
                    cs_required: task.csRequired,
                    ca_status: task.caStatus,
                    cs_status: task.csStatus
                }));
                
                console.log('🔍 Inserting compliance task records:', taskRecords);
                
                const { error: insertError } = await supabase
                    .from('compliance_checks')
                    .upsert(taskRecords, { onConflict: 'startup_id,task_id,entity_identifier,year' });
                
                if (insertError) {
                    console.error('Error inserting compliance tasks:', insertError);
                    throw insertError;
                }
            }
            
            console.log('🔍 Compliance tasks synced successfully');
            return true;
        } catch (error) {
            console.error('Error syncing compliance tasks with database:', error);
            return false;
        }
    }

    // Get compliance tasks with real-time updates
    async getComplianceTasksWithRealtime(startupId: number): Promise<ComplianceTask[]> {
        try {
            // First try to get from database
            const dbTasks = await this.getComplianceTasks(startupId);
            
            if (dbTasks.length > 0) {
                console.log('🔍 Found existing compliance tasks in database:', dbTasks.length);
                return dbTasks;
            }
            
            // If no tasks in database, generate from profile
            console.log('🔍 No tasks in database, generating from profile...');
            const generatedTasks = await this.generateComplianceTasksFromProfile(startupId);
            
            if (generatedTasks.length > 0) {
                // Sync to database
                await this.syncComplianceTasksWithDatabase(startupId);
                return generatedTasks;
            }
            
            return [];
        } catch (error) {
            console.error('Error getting compliance tasks with realtime:', error);
            return [];
        }
    }

    // Subscribe to compliance task changes
    subscribeToComplianceTaskChanges(startupId: number, callback: (payload: any) => void) {
        const subscription = supabase
            .channel(`compliance_tasks_${startupId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'compliance_checks',
                    filter: `startup_id=eq.${startupId}`
                },
                (payload) => {
                    console.log('Compliance task change detected:', payload);
                    callback(payload);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'compliance_uploads',
                    filter: `startup_id=eq.${startupId}`
                },
                (payload) => {
                    console.log('Compliance upload change detected:', payload);
                    callback(payload);
                }
            )
            .subscribe();

        return {
            unsubscribe: () => {
                subscription.unsubscribe();
            }
        };
    }
}

export const complianceService = new ComplianceService();
