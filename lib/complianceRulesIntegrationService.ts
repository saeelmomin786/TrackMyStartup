import { supabase } from './supabase';
import { complianceRulesComprehensiveService, ComplianceRuleComprehensive } from './complianceRulesComprehensiveService';
import { complianceService, ComplianceTask, ComplianceUpload } from './complianceService';
import { ComplianceStatus } from '../types';

export interface IntegratedComplianceTask extends ComplianceTask {
  // Add fields from comprehensive rules
  complianceRule?: ComplianceRuleComprehensive;
  frequency?: 'first-year' | 'monthly' | 'quarterly' | 'annual';
  complianceDescription?: string;
  caType?: string;
  csType?: string;
}

class ComplianceRulesIntegrationService {
  // Check if all first-year tasks are completed
  private async checkFirstYearTasksCompleted(startupId: number, firstYearRules: any[], registrationYear: number): Promise<boolean> {
    if (firstYearRules.length === 0) {
      return true; // No first-year tasks, so consider them "completed"
    }

    try {
      // Get all first-year task IDs for this startup using the registration year
      const firstYearTaskIds = firstYearRules.map(rule => `rule_${rule.id}_${startupId}_${registrationYear}`);
      
      console.log('🔍 Checking first-year tasks completion:', {
        startupId,
        registrationYear,
        firstYearTaskIds,
        firstYearRulesCount: firstYearRules.length
      });
      
      // Check if all first-year tasks exist and are completed
      const { data: firstYearTasks, error } = await supabase
        .from('compliance_checks')
        .select('task_id, ca_status, cs_status')
        .eq('startup_id', startupId)
        .in('task_id', firstYearTaskIds);

      if (error) {
        console.error('Error checking first-year tasks:', error);
        return false;
      }

      console.log('🔍 Found first-year tasks in database:', firstYearTasks);

      // If no first-year tasks exist in database, they're not completed
      if (!firstYearTasks || firstYearTasks.length === 0) {
        console.log('❌ No first-year tasks found in database - not completed');
        return false;
      }

      // Check if all first-year tasks are completed
      for (const task of firstYearTasks) {
        const isCACompleted = !task.ca_status || task.ca_status === ComplianceStatus.Compliant;
        const isCSCompleted = !task.cs_status || task.cs_status === ComplianceStatus.Compliant;
        
        console.log('🔍 Checking task completion:', {
          taskId: task.task_id,
          caStatus: task.ca_status,
          csStatus: task.cs_status,
          isCACompleted,
          isCSCompleted
        });
        
        if (!isCACompleted || !isCSCompleted) {
          console.log('❌ First-year task not completed:', task.task_id);
          return false; // At least one first-year task is not completed
        }
      }

      const allCompleted = firstYearTasks.length === firstYearTaskIds.length;
      console.log('✅ First-year tasks completion status:', allCompleted);
      return allCompleted;
    } catch (error) {
      console.error('Error checking first-year tasks completion:', error);
      return false;
    }
  }

  // Get applicable periods for compliance tasks based on frequency and registration date
  private getApplicablePeriods(frequency: string, registrationYear: number, currentYear: number): Array<{year: number, period?: string}> {
    const periods: Array<{year: number, period?: string}> = [];
    
    switch (frequency) {
      case 'first-year':
        // First-year tasks only appear in the registration year
        periods.push({year: registrationYear});
        break;
        
      case 'annual':
        // Annual tasks appear every year from registration year to current year
        for (let year = registrationYear; year <= currentYear; year++) {
          periods.push({year});
        }
        break;
        
      case 'quarterly':
        // Quarterly tasks appear for each quarter from registration year to current year
        for (let year = registrationYear; year <= currentYear; year++) {
          for (let quarter = 1; quarter <= 4; quarter++) {
            periods.push({year, period: `Q${quarter}`});
          }
        }
        break;
        
      case 'monthly':
        // Monthly tasks appear for each month from registration year to current year
        for (let year = registrationYear; year <= currentYear; year++) {
          for (let month = 1; month <= 12; month++) {
            periods.push({year, period: `M${month}`});
          }
        }
        break;
        
      default:
        // Default to current year
        periods.push({year: currentYear});
        break;
    }
    
    return periods;
  }

  // Get compliance tasks for a startup using the new comprehensive rules
  async getComplianceTasksForStartup(startupId: number): Promise<IntegratedComplianceTask[]> {
    try {
      console.log('🔍 getComplianceTasksForStartup called for startup:', startupId);
      
      // Load startup context up-front to get registration year for correct year assignment
      const { data: startup, error: startupError } = await supabase
        .from('startups')
        .select('country_of_registration, company_type, registration_date')
        .eq('id', startupId)
        .single();

      if (startupError || !startup) {
        console.error('Error fetching startup data:', startupError);
        return [];
      }

      const countryName = startup.country_of_registration;
      const companyType = startup.company_type;
      const registrationDate = startup.registration_date;
      
      if (!countryName || !companyType) {
        console.log('Startup missing country or company type, cannot load compliance rules');
        return [];
      }

      const registrationYear = registrationDate ? new Date(registrationDate).getFullYear() : new Date().getFullYear();
      const currentYear = new Date().getFullYear();

      // First, try to get compliance tasks from the database function that handles subsidiaries
    try {
      console.log('🔍 Calling database function generate_compliance_tasks_for_startup for startup:', startupId);
      
      // First, let's check what subsidiary data exists in the database
      const { data: subsidiaryData, error: subsidiaryError } = await supabase
        .from('subsidiaries')
        .select('*')
        .eq('startup_id', startupId);
      
      console.log('🔍 Subsidiary data in database for startup', startupId, ':', subsidiaryData);
      if (subsidiaryError) {
        console.error('❌ Error fetching subsidiary data:', subsidiaryError);
      }
      
      const { data: dbTasks, error: dbError } = await supabase
        .rpc('generate_compliance_tasks_for_startup', {
          startup_id_param: startupId
        });

        console.log('🔍 Database function response:', { dbTasks, dbError });

        if (!dbError && dbTasks && dbTasks.length > 0) {
          console.log('🔍 Found compliance tasks from database function:', dbTasks);

          // Load existing uploads once and attach to tasks below
          const existingUploads = await complianceService.getAllComplianceUploads(startupId);

          // Get status data from compliance_checks table
          const taskIds = dbTasks.map((t: any) => t.task_id);
          const { data: statusData, error: statusError } = await supabase
            .from('compliance_checks')
            .select('task_id, ca_status, cs_status')
            .eq('startup_id', startupId)
            .in('task_id', taskIds);

          console.log('🔍 Status data from compliance_checks:', statusData, 'Error:', statusError);
          
          // Create a map of task_id -> status for quick lookup
          const statusMap = new Map<string, { ca_status?: string; cs_status?: string }>();
          if (statusData) {
            statusData.forEach((item: any) => {
              statusMap.set(item.task_id, {
                ca_status: item.ca_status,
                cs_status: item.cs_status
              });
            });
          }

          // Transform database tasks to IntegratedComplianceTask format
          const integratedTasks: IntegratedComplianceTask[] = dbTasks.map((task: any) => {
            // Get status from the map, fallback to 'Pending'
            const statusInfo = statusMap.get(task.task_id) || {};
            // Normalize frequency coming from DB
            const rawType = (task.task_type || '').toString();
            const normalizedFrequency: 'first-year' | 'annual' | 'monthly' | 'quarterly' =
              rawType === 'firstYear'
                ? 'first-year'
                : (['first-year', 'annual', 'monthly', 'quarterly'] as const).includes(rawType as any)
                ? (rawType as any)
                : 'annual';

            return {
              taskId: task.task_id,
              entityIdentifier: task.entity_identifier,
              entityDisplayName: task.entity_display_name,
              year: normalizedFrequency === 'first-year' ? registrationYear : task.year,
              task: task.task_name,
              caRequired: !!task.ca_required,
              csRequired: !!task.cs_required,
              // Read actual status from compliance_checks table, default to 'Pending' if not set
              caStatus: (statusInfo.ca_status || 'Pending') as ComplianceStatus,
              csStatus: (statusInfo.cs_status || 'Pending') as ComplianceStatus,
              uploads: existingUploads[task.task_id] || [],
              complianceRule: {
                id: task.task_id,
                name: task.task_name,
                description: task.description || '',
                frequency: normalizedFrequency,
                verification_required: task.verification_required ?? (task.ca_required ? 'CA' : task.cs_required ? 'CS' : undefined),
                ca_type: task.ca_type || (task.ca_required ? 'CA' : undefined),
                cs_type: task.cs_type || (task.cs_required ? 'CS' : undefined)
              },
              frequency: normalizedFrequency,
              complianceDescription: task.description || ''
            } as IntegratedComplianceTask;
          });

          console.log('🔍 Transformed integrated tasks:', integratedTasks);
          return integratedTasks;
        } else if (!dbError && dbTasks && dbTasks.length === 0) {
          console.log('🔍 Database function returned empty results, falling back to comprehensive rules');
        } else if (dbError) {
          console.log('🔍 Database function error, falling back to comprehensive rules:', dbError);
        }
      } catch (dbError) {
        console.log('🔍 Database function not available, falling back to comprehensive rules:', dbError);
      }

      // Fallback to the original comprehensive rules approach for parent company only

      // Convert country name to country code
      const countryCodeMap: { [key: string]: string } = {
        'United States': 'US',
        'India': 'IN',
        'United Kingdom': 'GB',
        'Canada': 'CA',
        'Australia': 'AU',
        'Germany': 'DE',
        'France': 'FR',
        'Singapore': 'SG',
        'Japan': 'JP',
        'China': 'CN',
        'Brazil': 'BR',
        'Mexico': 'MX',
        'South Africa': 'ZA',
        'Nigeria': 'NG',
        'Kenya': 'KE',
        'Egypt': 'EG',
        'UAE': 'AE',
        'Saudi Arabia': 'SA',
        'Israel': 'IL',
        'Austria': 'AT',
        'Hong Kong': 'HK',
        'Netherlands': 'NL',
        'Finland': 'FI',
        'Greece': 'GR',
        'Vietnam': 'VN',
        'Myanmar': 'MM',
        'Azerbaijan': 'AZ',
        'Serbia': 'RS',
        'Monaco': 'MC',
        'Pakistan': 'PK',
        'Philippines': 'PH',
        'Jordan': 'JO',
        'Georgia': 'GE',
        'Belarus': 'BY',
        'Armenia': 'AM',
        'Bhutan': 'BT',
        'Sri Lanka': 'LK',
        'Russia': 'RU',
        'Italy': 'IT',
        'Spain': 'ES',
        'Portugal': 'PT',
        'Belgium': 'BE',
        'Switzerland': 'CH',
        'Sweden': 'SE',
        'Norway': 'NO',
        'Denmark': 'DK',
        'Ireland': 'IE',
        'New Zealand': 'NZ',
        'South Korea': 'KR',
        'Thailand': 'TH',
        'Malaysia': 'MY',
        'Indonesia': 'ID',
        'Bangladesh': 'BD',
        'Nepal': 'NP'
      };

      const countryCode = countryCodeMap[countryName] || countryName; // Fallback to original value if not found
      console.log(`🔍 Converting country name "${countryName}" to country code "${countryCode}"`);

      // registrationYear/currentYear already computed above

      console.log(`🔍 Looking for compliance rules for country: ${countryCode}, company type: ${companyType}`);

      // Get comprehensive compliance rules for this startup's country and company type
      const comprehensiveRules = await complianceRulesComprehensiveService.getRulesByCountryAndCompanyType(
        countryCode, 
        companyType
      );

      console.log(`🔍 Found ${comprehensiveRules.length} comprehensive rules for ${countryCode}/${companyType}`);

      // Get existing compliance tasks from the old system
      const existingTasks = await complianceService.getComplianceTasksWithRealtime(startupId);
      const existingUploads = await complianceService.getAllComplianceUploads(startupId);

      // Create integrated tasks by combining comprehensive rules with existing tasks
      const integratedTasks: IntegratedComplianceTask[] = [];

      // Check if first-year tasks are completed
      const firstYearTasks = comprehensiveRules.filter(rule => rule.frequency === 'first-year');
      const firstYearCompleted = await this.checkFirstYearTasksCompleted(startupId, firstYearTasks, registrationYear);
      
      // For each comprehensive rule, create tasks for each applicable period
      console.log(`🔍 Processing ${comprehensiveRules.length} comprehensive rules...`);
      for (const rule of comprehensiveRules) {
        console.log(`🔍 Processing rule: ${rule.compliance_name} (${rule.frequency})`);
        
        // For now, show all tasks but we can add visual indicators later for prioritization
        // if (rule.frequency !== 'first-year' && !firstYearCompleted) {
        //   console.log(`Skipping ${rule.frequency} task "${rule.compliance_name}" - first-year tasks not completed`);
        //   continue;
        // }
        
        // Always generate tasks for each applicable period based on frequency and registration date
        const applicablePeriods = this.getApplicablePeriods(rule.frequency, registrationYear, currentYear);
        console.log(`🔍 Rule "${rule.compliance_name}" has ${applicablePeriods.length} applicable periods:`, applicablePeriods);
        
        for (const period of applicablePeriods) {
          const taskId = `rule_${rule.id}_${startupId}_${period.year}${period.period ? `_${period.period}` : ''}`;
          
          // Check if there's an existing task for this specific period
          const existingTask = existingTasks.find(task => task.taskId === taskId);
          
          // Create task name with period information
          let taskName = rule.compliance_name;
          if (period.period) {
            if (period.period.startsWith('Q')) {
              const quarter = period.period.substring(1);
              taskName = `${rule.compliance_name} (Q${quarter} ${period.year})`;
            } else if (period.period.startsWith('M')) {
              const month = period.period.substring(1);
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              taskName = `${rule.compliance_name} (${monthNames[parseInt(month) - 1]} ${period.year})`;
            }
          }
          
          if (existingTask) {
            // Use existing task but ensure it has the correct year and comprehensive rule data
            const taskWithUploads = {
              ...existingTask,
              year: period.year, // Ensure correct year
              task: taskName, // Update task name with period
              uploads: existingUploads[existingTask.taskId] || [],
              complianceRule: rule,
              frequency: rule.frequency,
              complianceDescription: rule.compliance_description,
              caType: rule.ca_type,
              csType: rule.cs_type
            };
            integratedTasks.push(taskWithUploads);
          } else {
            // Create new task for this period
            const newTask: IntegratedComplianceTask = {
              taskId: taskId,
              entityIdentifier: 'startup',
              entityDisplayName: `Parent Company (${countryCode})`,
              year: period.year,
              task: taskName,
              caRequired: rule.verification_required === 'CA' || rule.verification_required === 'both',
              csRequired: rule.verification_required === 'CS' || rule.verification_required === 'both',
              caStatus: ComplianceStatus.Pending,
              csStatus: ComplianceStatus.Pending,
              uploads: [],
              complianceRule: rule,
              frequency: rule.frequency,
              complianceDescription: rule.compliance_description,
              caType: rule.ca_type,
              csType: rule.cs_type
            };
            integratedTasks.push(newTask);
          }
        }
      }

      console.log(`🔍 Generated ${integratedTasks.length} integrated tasks from comprehensive rules`);

      // Add any existing tasks that don't have corresponding comprehensive rules
      for (const existingTask of existingTasks) {
        const hasComprehensiveRule = integratedTasks.some(task => task.taskId === existingTask.taskId);
        if (!hasComprehensiveRule) {
          const taskWithUploads = {
            ...existingTask,
            uploads: existingUploads[existingTask.taskId] || []
          };
          integratedTasks.push(taskWithUploads);
        }
      }

      console.log(`🔍 Final integrated tasks count: ${integratedTasks.length}`);

      // Sort tasks to prioritize first-year tasks at the top
      // Note: The UI displays tasks in descending year order (newest first), so we need to account for this
      integratedTasks.sort((a, b) => {
        // First-year tasks come first regardless of year
        if (a.frequency === 'first-year' && b.frequency !== 'first-year') {
          return -1;
        }
        if (a.frequency !== 'first-year' && b.frequency === 'first-year') {
          return 1;
        }
        
        // Within the same frequency, sort by year in descending order (newest first) to match UI
        if (a.year !== b.year) {
          return b.year - a.year; // Descending order (2025 before 2024)
        }
        
        // Within the same year, sort by task name alphabetically
        return a.task.localeCompare(b.task);
      });

      return integratedTasks;
    } catch (error) {
      console.error('Error getting integrated compliance tasks:', error);
      return [];
    }
  }

  // Update compliance status for a task
  async updateComplianceStatus(
    startupId: number, 
    taskId: string, 
    status: ComplianceStatus, 
    verifiedBy: 'CA' | 'CS'
  ): Promise<void> {
    try {
      console.log('[STATUS UPDATE] updateComplianceStatus called:', {
        startupId,
        taskId,
        status,
        verifiedBy
      });

      // First, try to get existing record
      const { data: existingRecord, error: fetchError } = await supabase
        .from('compliance_checks')
        .select('*')
        .eq('startup_id', startupId)
        .eq('task_id', taskId)
        .maybeSingle();

      // Get task information if record doesn't exist
      let taskInfo: any = null;
      if (!existingRecord) {
        console.log('[STATUS UPDATE] Record not found, fetching task info from comprehensive rules...');
        const tasks = await this.getComplianceTasksForStartup(startupId);
        taskInfo = tasks.find(t => t.taskId === taskId);
        if (!taskInfo) {
          console.error('[STATUS UPDATE] Task not found in comprehensive rules:', taskId);
          throw new Error(`Task ${taskId} not found`);
        }
      }

      // Prepare update data
      const statusField = verifiedBy === 'CA' ? 'ca_status' : 'cs_status';
      const updateData: any = {
        startup_id: startupId,
        task_id: taskId,
        [statusField]: status
      };

      // Add required fields if record doesn't exist
      if (!existingRecord && taskInfo) {
        updateData.entity_identifier = taskInfo.entityIdentifier;
        updateData.entity_display_name = taskInfo.entityDisplayName;
        updateData.year = taskInfo.year;
        updateData.task_name = taskInfo.task;
        updateData.ca_required = taskInfo.caRequired;
        updateData.cs_required = taskInfo.csRequired;
        // Set default status for the other field
        updateData[verifiedBy === 'CA' ? 'cs_status' : 'ca_status'] = 'Pending';
      } else if (existingRecord) {
        // Keep existing values for other fields
        updateData.entity_identifier = existingRecord.entity_identifier;
        updateData.entity_display_name = existingRecord.entity_display_name;
        updateData.year = existingRecord.year;
        updateData.task_name = existingRecord.task_name;
        updateData.ca_required = existingRecord.ca_required;
        updateData.cs_required = existingRecord.cs_required;
        // Keep existing status for the other field
        updateData[verifiedBy === 'CA' ? 'cs_status' : 'ca_status'] = existingRecord[verifiedBy === 'CA' ? 'cs_status' : 'ca_status'];
      }

      // Use upsert to create or update the record
      console.log('[STATUS UPDATE] Upserting compliance_checks with:', updateData);
      const { error } = await supabase
        .from('compliance_checks')
        .upsert(updateData, {
          onConflict: 'startup_id,task_id'
        });

      if (error) {
        console.error('[STATUS UPDATE] Error updating compliance status:', error);
        throw error;
      }

      console.log('[STATUS UPDATE] ✅ Successfully updated status to', status, 'for', verifiedBy);
    } catch (error) {
      console.error('[STATUS UPDATE] Error updating compliance status:', error);
      throw error;
    }
  }

  // Upload compliance document
  async uploadComplianceDocument(
    startupId: number,
    taskId: string,
    file: File,
    uploadedBy: string
  ): Promise<{ success: boolean; uploadId?: string; error?: string }> {
    try {
      // Use alert for visibility - user needs to see this
      console.log('========================================');
      console.log('[UPLOAD] ========== STARTING UPLOAD ==========');
      console.log('[UPLOAD] Parameters:', { startupId, taskId, fileName: file.name, uploadedBy });
      console.log('========================================');
      
      // First, get the task information to check CA/CS requirements
      const { data: taskData, error: taskError } = await supabase
        .from('compliance_checks')
        .select('ca_status, cs_status, ca_required, cs_required')
        .eq('startup_id', startupId)
        .eq('task_id', taskId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle null gracefully

      console.log('[UPLOAD] Task data from database:', taskData, 'Error:', taskError);

      // Get task requirements - prefer from database, fallback to comprehensive rules
      let caRequired = taskData?.ca_required ?? false;
      let csRequired = taskData?.cs_required ?? false;

      // If not in database or missing requirements, get from comprehensive rules
      if (!taskData || (!caRequired && !csRequired)) {
        console.log('[UPLOAD] Task not in database or missing requirements, checking comprehensive rules...');
        const tasks = await this.getComplianceTasksForStartup(startupId);
        const task = tasks.find(t => t.taskId === taskId);
        if (task) {
          caRequired = task.caRequired || false;
          csRequired = task.csRequired || false;
          console.log('[UPLOAD] Found task in comprehensive rules:', { caRequired, csRequired });
        } else {
          console.log('[UPLOAD] Task not found in comprehensive rules either');
        }
      }

      console.log('[UPLOAD] Final requirements:', { caRequired, csRequired });

      // Check if this is a cloud drive URL (stored in file object)
      const cloudDriveUrl = (file as any).cloudDriveUrl;
      
      if (cloudDriveUrl && cloudDriveUrl.trim()) {
        // Handle cloud drive URL - skip storage upload, directly save URL to database
        console.log('📤 Saving cloud drive URL to database:', cloudDriveUrl);
        
        // Insert record into compliance_uploads table with cloud drive URL
        const { data: insertData, error: insertError } = await supabase
          .from('compliance_uploads')
          .insert({
            startup_id: startupId,
            task_id: taskId,
            file_name: file.name || 'cloud-drive-document.pdf',
            file_url: cloudDriveUrl,
            uploaded_by: uploadedBy,
            file_size: file.size || 0,
            file_type: file.type || 'application/pdf'
          })
          .select()
          .single();

      if (insertError) {
        console.error('Error inserting cloud drive URL record:', insertError);
        return { success: false, error: insertError.message };
      }

      // Update status to Submitted after successful upload
      console.log('[UPLOAD] Calling updateStatusToSubmitted for cloud drive URL...');
      const statusUpdateResult = await this.updateStatusToSubmitted(startupId, taskId, caRequired, csRequired, taskData);
      const result: any = { success: true, uploadId: insertData.id };
      if (!statusUpdateResult.success) {
        console.warn('[UPLOAD] Status update failed but upload succeeded:', statusUpdateResult.error);
        result.statusUpdateError = statusUpdateResult.error;
      }
      return result;
      }
      
      // Handle regular file upload - upload to storage first
      const fileExt = file.name.split('.').pop();
      const fileName = `${startupId}/${taskId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('compliance-documents')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Error uploading file to storage:', uploadError);
        return { success: false, error: uploadError.message };
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('compliance-documents')
        .getPublicUrl(fileName);

      // Insert record into compliance_uploads table
      const { data: insertData, error: insertError } = await supabase
        .from('compliance_uploads')
        .insert({
          startup_id: startupId,
          task_id: taskId,
          file_name: file.name,
          file_url: publicUrl,
          uploaded_by: uploadedBy,
          file_size: file.size,
          file_type: file.type
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting upload record:', insertError);
        return { success: false, error: insertError.message };
      }

      // Update status to Submitted after successful upload
      console.log('[UPLOAD] Calling updateStatusToSubmitted for file upload...');
      const statusUpdateResult = await this.updateStatusToSubmitted(startupId, taskId, caRequired, csRequired, taskData);
      const result: any = { success: true, uploadId: insertData.id };
      if (!statusUpdateResult.success) {
        console.warn('[UPLOAD] Status update failed but upload succeeded:', statusUpdateResult.error);
        result.statusUpdateError = statusUpdateResult.error;
      }
      return result;
    } catch (error) {
      console.error('Error uploading compliance document:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Helper method to update status to Submitted
  private async updateStatusToSubmitted(
    startupId: number,
    taskId: string,
    caRequired: boolean,
    csRequired: boolean,
    existingTaskData: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[STATUS UPDATE] updateStatusToSubmitted called:', {
        startupId,
        taskId,
        caRequired,
        csRequired,
        existingTaskData
      });

      // Helper function to check if status is Pending (handles both enum and string)
      const isPending = (status: any): boolean => {
        if (!status) return true; // null/undefined means pending
        const statusStr = String(status).trim();
        return statusStr === 'Pending' || statusStr === 'pending' || statusStr === ComplianceStatus.Pending;
      };

      // Get task information from comprehensive rules if we don't have it
      let taskInfo: any = null;
      if (!existingTaskData) {
        console.log('[STATUS UPDATE] No existing task data, fetching from comprehensive rules...');
        const tasks = await this.getComplianceTasksForStartup(startupId);
        taskInfo = tasks.find(t => t.taskId === taskId);
        if (taskInfo) {
          console.log('[STATUS UPDATE] Found task info:', taskInfo);
        }
      }

      // Determine what statuses to update
      const updateData: any = {
        startup_id: startupId,
        task_id: taskId,
        ca_required: caRequired,
        cs_required: csRequired
      };

      // Add required fields if we have task info (for upsert)
      if (taskInfo) {
        updateData.entity_identifier = taskInfo.entityIdentifier;
        updateData.entity_display_name = taskInfo.entityDisplayName;
        updateData.year = taskInfo.year;
        updateData.task_name = taskInfo.task;
      } else if (existingTaskData) {
        // Use existing data if available
        updateData.entity_identifier = existingTaskData.entity_identifier;
        updateData.entity_display_name = existingTaskData.entity_display_name;
        updateData.year = existingTaskData.year;
        updateData.task_name = existingTaskData.task_name;
      }

      // Only update to Submitted if current status is Pending
      // Update CA status if CA is required and current status is Pending
      if (caRequired) {
        const currentCAStatus = existingTaskData?.ca_status;
        const isPendingStatus = isPending(currentCAStatus);
        console.log('[STATUS UPDATE] CA Status check:', { currentCAStatus, isPending: isPendingStatus, caRequired });
        if (isPendingStatus) {
          // Use string value 'Submitted' for database
          updateData.ca_status = 'Submitted';
          console.log('[STATUS UPDATE] Will update CA status to Submitted');
        } else {
          // Keep existing status if not pending
          updateData.ca_status = existingTaskData?.ca_status || 'Pending';
          console.log('[STATUS UPDATE] CA status is NOT Pending, keeping current. Current:', currentCAStatus);
        }
      } else {
        updateData.ca_status = existingTaskData?.ca_status || 'Not Required';
        console.log('[STATUS UPDATE] CA not required, setting to Not Required');
      }

      // Update CS status if CS is required and current status is Pending
      if (csRequired) {
        const currentCSStatus = existingTaskData?.cs_status;
        const isPendingStatus = isPending(currentCSStatus);
        console.log('[STATUS UPDATE] CS Status check:', { currentCSStatus, isPending: isPendingStatus, csRequired });
        if (isPendingStatus) {
          // Use string value 'Submitted' for database
          updateData.cs_status = 'Submitted';
          console.log('[STATUS UPDATE] Will update CS status to Submitted');
        } else {
          // Keep existing status if not pending
          updateData.cs_status = existingTaskData?.cs_status || 'Pending';
          console.log('[STATUS UPDATE] CS status is NOT Pending, keeping current. Current:', currentCSStatus);
        }
      } else {
        updateData.cs_status = existingTaskData?.cs_status || 'Not Required';
        console.log('[STATUS UPDATE] CS not required, setting to Not Required');
      }

      // Only upsert if we have all required fields
      if (updateData.entity_identifier && updateData.entity_display_name && updateData.year && updateData.task_name) {
        console.log('[STATUS UPDATE] Upserting compliance_checks with:', updateData);
        const { data, error: updateError } = await supabase
          .from('compliance_checks')
          .upsert(updateData, {
            onConflict: 'startup_id,task_id'
          })
          .select();

        if (updateError) {
          console.error('========================================');
          console.error('[STATUS UPDATE] ERROR updating status to Submitted:', updateError);
          console.error('[STATUS UPDATE] Error details:', JSON.stringify(updateError, null, 2));
          console.error('========================================');
          
          // If error is about constraint violation, the database migration hasn't been run
          let errorMessage = updateError.message || 'Unknown error';
          if (updateError.message?.includes('check constraint') || 
              updateError.message?.includes('violates check constraint') ||
              updateError.message?.includes('Submitted')) {
            errorMessage = 'DATABASE CONSTRAINT ERROR: The database does not allow "Submitted" status yet! Please run ADD_SUBMITTED_STATUS_TO_COMPLIANCE_CHECKS.sql migration.';
            console.error('[STATUS UPDATE] DATABASE CONSTRAINT ERROR - The database does not allow "Submitted" status yet!');
            console.error('[STATUS UPDATE] ACTION REQUIRED: Run the SQL migration: ADD_SUBMITTED_STATUS_TO_COMPLIANCE_CHECKS.sql');
            console.error('[STATUS UPDATE] This will add "Submitted" to the allowed status values in the database.');
          }
          return { success: false, error: errorMessage };
        } else {
          console.log('========================================');
          console.log('[STATUS UPDATE] ✅ SUCCESS - Status updated to Submitted for task:', taskId);
          console.log('[STATUS UPDATE] Updated data:', data);
          console.log('========================================');
          return { success: true };
        }
      } else {
        console.error('[STATUS UPDATE] ❌ ERROR - Missing required fields for upsert:', {
          hasEntityIdentifier: !!updateData.entity_identifier,
          hasEntityDisplayName: !!updateData.entity_display_name,
          hasYear: !!updateData.year,
          hasTaskName: !!updateData.task_name,
          taskInfo: taskInfo,
          existingTaskData: existingTaskData
        });
        return { success: false, error: 'Missing required fields to create compliance_checks record. Task information not found.' };
      }
    } catch (error) {
      console.error('[STATUS UPDATE] ERROR in updateStatusToSubmitted:', error);
      console.error('[STATUS UPDATE] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error in status update' 
      };
    }
  }

  // Delete compliance upload
  async deleteComplianceUpload(uploadId: string): Promise<boolean> {
    try {
      console.log('[DELETE] ========== STARTING DELETE ==========');
      console.log('[DELETE] Upload ID:', uploadId);
      
      // Get the upload record first to get the file URL, task_id, and startup_id
      const { data: uploadRecord, error: fetchError } = await supabase
        .from('compliance_uploads')
        .select('file_url, task_id, startup_id')
        .eq('id', uploadId)
        .single();

      if (fetchError) {
        console.error('[DELETE] Error fetching upload record:', fetchError);
        return false;
      }

      const taskId = uploadRecord.task_id;
      const startupId = uploadRecord.startup_id;

      console.log('[DELETE] Task ID:', taskId, 'Startup ID:', startupId);

      // Delete from storage if file exists
      if (uploadRecord.file_url) {
        const fileName = uploadRecord.file_url.split('/').pop();
        if (fileName) {
          const { error: storageError } = await supabase.storage
            .from('compliance-documents')
            .remove([fileName]);
          
          if (storageError) {
            console.warn('[DELETE] Error deleting file from storage:', storageError);
          } else {
            console.log('[DELETE] File deleted from storage');
          }
        }
      }

      // Delete the database record
      const { error: deleteError } = await supabase
        .from('compliance_uploads')
        .delete()
        .eq('id', uploadId);

      if (deleteError) {
        console.error('[DELETE] Error deleting upload record:', deleteError);
        return false;
      }

      console.log('[DELETE] Upload record deleted successfully');

      // Check if there are any remaining uploads for this task
      const { data: remainingUploads, error: checkError } = await supabase
        .from('compliance_uploads')
        .select('id')
        .eq('startup_id', startupId)
        .eq('task_id', taskId);

      if (checkError) {
        console.warn('[DELETE] Error checking remaining uploads:', checkError);
      } else {
        console.log('[DELETE] Remaining uploads for task:', remainingUploads?.length || 0);
        
        // If no uploads remain, revert status back to "Pending" if it was "Submitted"
        if (!remainingUploads || remainingUploads.length === 0) {
          console.log('[DELETE] No remaining uploads, reverting status to Pending if it was Submitted');
          
          // Get current status
          const { data: taskData, error: taskError } = await supabase
            .from('compliance_checks')
            .select('ca_status, cs_status, ca_required, cs_required')
            .eq('startup_id', startupId)
            .eq('task_id', taskId)
            .maybeSingle();

          if (!taskError && taskData) {
            const updateData: any = {};
            
            // Revert CA status to Pending if it was Submitted (but not if it's Verified or Rejected)
            if (taskData.ca_required && taskData.ca_status === 'Submitted') {
              updateData.ca_status = 'Pending';
              console.log('[DELETE] Reverting CA status from Submitted to Pending');
            }
            
            // Revert CS status to Pending if it was Submitted (but not if it's Verified or Rejected)
            if (taskData.cs_required && taskData.cs_status === 'Submitted') {
              updateData.cs_status = 'Pending';
              console.log('[DELETE] Reverting CS status from Submitted to Pending');
            }

            // Update status if needed
            if (Object.keys(updateData).length > 0) {
              const { error: updateError } = await supabase
                .from('compliance_checks')
                .update(updateData)
                .eq('startup_id', startupId)
                .eq('task_id', taskId);

              if (updateError) {
                console.error('[DELETE] Error reverting status:', updateError);
              } else {
                console.log('[DELETE] ✅ Status reverted to Pending');
              }
            } else {
              console.log('[DELETE] No status reversion needed (status is not Submitted)');
            }
          }
        } else {
          console.log('[DELETE] Uploads still exist, keeping status as is');
        }
      }

      console.log('[DELETE] ========== DELETE COMPLETE ==========');
      return true;
    } catch (error) {
      console.error('[DELETE] Error deleting compliance upload:', error);
      return false;
    }
  }

  // Force regenerate all compliance tasks with correct years
  async forceRegenerateComplianceTasks(startupId: number): Promise<void> {
    try {
      console.log('🔄 Force regenerating compliance tasks for startup:', startupId);
      
      // Clear all existing compliance tasks for this startup
      const { error: deleteError } = await supabase
        .from('compliance_checks')
        .delete()
        .eq('startup_id', startupId);

      if (deleteError) {
        console.error('Error clearing existing compliance tasks:', deleteError);
        return;
      }

      // Regenerate tasks with correct years
      await this.syncComplianceTasksWithComprehensiveRules(startupId);
      
      console.log('✅ Compliance tasks force regenerated successfully');
    } catch (error) {
      console.error('Error force regenerating compliance tasks:', error);
    }
  }

  // Sync compliance tasks with comprehensive rules
  async syncComplianceTasksWithComprehensiveRules(startupId: number): Promise<void> {
    try {
      // Get integrated tasks
      const integratedTasks = await this.getComplianceTasksForStartup(startupId);
      
      // Update the compliance_checks table with new tasks from comprehensive rules
      for (const task of integratedTasks) {
        if (task.complianceRule && task.taskId.startsWith('rule_')) {
          // Check if this task already exists in compliance_checks
          const { data: existingChecks, error: checkError } = await supabase
            .from('compliance_checks')
            .select('id')
            .eq('startup_id', startupId)
            .eq('task_id', task.taskId);

          if (checkError) {
            console.warn('Error checking existing compliance check:', checkError);
            continue;
          }

          if (!existingChecks || existingChecks.length === 0) {
            // Create new compliance check entry using upsert to avoid conflicts
            const { error: upsertError } = await supabase
              .from('compliance_checks')
              .upsert({
                startup_id: startupId,
                task_id: task.taskId,
                task_name: task.task,
                entity_identifier: task.entityIdentifier,
                entity_display_name: task.entityDisplayName,
                year: task.year,
                ca_required: task.caRequired,
                cs_required: task.csRequired,
                ca_status: task.caStatus,
                cs_status: task.csStatus,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'startup_id,task_id'
              });

            if (upsertError) {
              console.warn('Error upserting compliance check:', upsertError);
            } else {
              console.log('Successfully upserted compliance check:', task.taskId);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error syncing compliance tasks:', error);
    }
  }

  // Get compliance statistics for a startup
  async getComplianceStats(startupId: number): Promise<{
    total: number;
    pending: number;
    compliant: number;
    nonCompliant: number;
  }> {
    try {
      const tasks = await this.getComplianceTasksForStartup(startupId);
      
      const stats = {
        total: tasks.length,
        pending: 0,
        compliant: 0,
        nonCompliant: 0
      };

      for (const task of tasks) {
        if (task.caStatus === ComplianceStatus.Compliant && task.csStatus === ComplianceStatus.Compliant) {
          stats.compliant++;
        } else if (task.caStatus === ComplianceStatus.NonCompliant || task.csStatus === ComplianceStatus.NonCompliant) {
          stats.nonCompliant++;
        } else {
          stats.pending++;
        }
      }

      return stats;
    } catch (error) {
      console.error('Error getting compliance stats:', error);
      return { total: 0, pending: 0, compliant: 0, nonCompliant: 0 };
    }
  }
}

export const complianceRulesIntegrationService = new ComplianceRulesIntegrationService();
