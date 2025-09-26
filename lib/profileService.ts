import { supabase } from './supabase';
import { COUNTRIES } from '../constants';
import { Subsidiary, InternationalOp, ProfileData, ServiceProvider } from '../types';

// =====================================================
// PROFILE SERVICE FOR DYNAMIC PROFILE SECTION
// =====================================================

export interface ProfileNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ProfileAuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values: any;
  new_values: any;
  changed_at: string;
}

export interface ProfileTemplate {
  id: number;
  name: string;
  description: string;
  country: string;
  company_type: string;
  sector: string;
}

export const profileService = {
  // Expose supabase client for direct subscriptions
  supabase,
  // =====================================================
  // PROFILE DATA OPERATIONS
  // =====================================================

  // Get complete profile data for a startup - Using direct database queries for reliability
  async getStartupProfile(startupId: number): Promise<ProfileData | null> {
    try {
      console.log('🔍 getStartupProfile called with startupId:', startupId);
      
      // Fetch startup data directly from startups table
      const { data: startupData, error: startupError } = await supabase
        .from('startups')
        .select('*')
        .eq('id', startupId)
        .single();

      if (startupError) {
        console.error('❌ Error fetching startup data:', startupError);
        throw startupError;
      }

      if (!startupData) {
        console.log('❌ No startup data found for ID:', startupId);
        return null;
      }

      console.log('🔍 Raw startup data from database:', startupData);
      
      // All profile data is now stored in the startups table
      console.log('🔍 All profile data is now stored in startups table');

      // Fetch subsidiaries data
      const { data: subsidiariesData, error: subsidiariesError } = await supabase
        .from('subsidiaries')
        .select('*')
        .eq('startup_id', startupId);

      if (subsidiariesError) {
        console.error('❌ Error fetching subsidiaries:', subsidiariesError);
      }

      // Fetch international operations data (table may not exist)
      let internationalOpsData = null;
      try {
        const { data, error: internationalOpsError } = await supabase
          .from('international_operations')
          .select('*')
          .eq('startup_id', startupId);

        if (internationalOpsError) {
          // Only log if it's not a "table doesn't exist" error
          if (internationalOpsError.code !== 'PGRST116' && internationalOpsError.message !== 'relation "public.international_operations" does not exist') {
            console.log('🔍 International operations table error:', internationalOpsError);
          }
        } else {
          internationalOpsData = data;
        }
      } catch (error) {
        // Silently handle table not existing
        console.log('🔍 International operations table not available, skipping');
      }

      // Normalize dates to YYYY-MM-DD
      const normalizeDate = (value: unknown): string => {
        if (!value) return '';
        if (value instanceof Date) return value.toISOString().split('T')[0];
        const str = String(value);
        return str.includes('T') ? str.split('T')[0] : str;
      };

      // Map subsidiaries data
      const normalizedSubsidiaries: Subsidiary[] = (subsidiariesData || []).map((sub: any) => ({
        id: sub.id,
        country: sub.country,
        companyType: sub.company_type,
        registrationDate: normalizeDate(sub.registration_date),
        caCode: sub.ca_service_code,
        csCode: sub.cs_service_code,
      }));

      // Map international operations data
      const normalizedInternationalOps: InternationalOp[] = (internationalOpsData || []).map((op: any) => ({
        id: op.id,
        country: op.country,
        companyType: op.company_type,
        startDate: normalizeDate(op.start_date),
      }));

      const finalProfileData = {
        country: startupData.country_of_registration || startupData.country,
        companyType: startupData.company_type,
        registrationDate: normalizeDate(startupData.registration_date),
        currency: startupData.currency || 'USD',
        subsidiaries: normalizedSubsidiaries,
        internationalOps: normalizedInternationalOps,
        caServiceCode: startupData.ca_service_code,
        csServiceCode: startupData.cs_service_code,
        investmentAdvisorCode: startupData.investment_advisor_code
      };

      console.log('🔍 Processed profile data:', finalProfileData);
      console.log('🔍 company_type from database:', startupData.company_type);
      console.log('🔍 companyType in profileData:', finalProfileData.companyType);
      return finalProfileData;
    } catch (error) {
      console.error('❌ Error fetching startup profile:', error);
      return null;
    }
  },

  // Update startup profile - Simplified version using direct database updates
  async updateStartupProfile(
    startupId: number,
    profileData: Partial<ProfileData>
  ): Promise<boolean> {
    try {
      console.log('🔍 updateStartupProfile called with:', { startupId, profileData });
      
      // Use direct database update instead of RPC functions for better reliability
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      
      // Add fields - include them even if empty to allow clearing values
      if (profileData.country !== undefined && profileData.country !== null) {
        updateData.country_of_registration = profileData.country;
      }
      if (profileData.companyType !== undefined && profileData.companyType !== null) {
        updateData.company_type = profileData.companyType;
        console.log('🔍 Adding company_type to update:', profileData.companyType, 'type:', typeof profileData.companyType);
      } else {
        console.log('🔍 Company type not being saved - value:', profileData.companyType, 'type:', typeof profileData.companyType);
      }
      if (profileData.registrationDate !== undefined && profileData.registrationDate !== null) {
        updateData.registration_date = profileData.registrationDate;
      }
      // Always include currency if it's provided (even if empty string)
      if (profileData.currency !== undefined && profileData.currency !== null) {
        updateData.currency = profileData.currency;
        console.log('🔍 Adding currency to update:', profileData.currency);
      }
      // Always include CA/CS service codes (even if empty to allow clearing values)
      if (profileData.caServiceCode !== undefined || (profileData as any).caCode !== undefined) {
        updateData.ca_service_code = profileData.caServiceCode || (profileData as any).caCode || null;
      }
      if (profileData.csServiceCode !== undefined || (profileData as any).csCode !== undefined) {
        updateData.cs_service_code = profileData.csServiceCode || (profileData as any).csCode || null;
      }
      if (profileData.investmentAdvisorCode !== undefined && profileData.investmentAdvisorCode !== null) {
        updateData.investment_advisor_code = profileData.investmentAdvisorCode;
        console.log('🔍 Adding investment_advisor_code to update:', profileData.investmentAdvisorCode);
      }
      
      console.log('🔍 Update data:', updateData);
      
      const { error, data } = await supabase
        .from('startups')
        .update(updateData)
        .eq('id', startupId)
        .select();
      
      console.log('🔍 Database update result:', { error, data });
      
      if (error) {
        console.error('❌ Direct update failed:', error);
        
        // If currency column doesn't exist, try without it
        if (error.message.includes('currency') && updateData.currency) {
          console.log('🔍 Retrying without currency column...');
          delete updateData.currency;
          const { error: retryError } = await supabase
          .from('startups')
            .update(updateData)
          .eq('id', startupId);
          if (retryError) {
            console.error('❌ Retry without currency failed:', retryError);
            throw new Error(`Database update failed: ${retryError.message}`);
          }
          console.log('🔍 Update succeeded without currency column');
        return true;
      }

        throw new Error(`Database update failed: ${error.message}`);
      }
      
      console.log('✅ Profile update successful');
      return true;
      
    } catch (error) {
      console.error('❌ Error updating startup profile:', error);
      if (error instanceof Error) {
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack,
          startupId,
          profileData
        });
        // Re-throw with more context
        throw new Error(`Failed to update startup profile: ${error.message}`);
      }
      throw new Error('Failed to update startup profile: Unknown error');
    }
  },

  // =====================================================
  // SUBSIDIARY OPERATIONS
  // =====================================================

  // Add subsidiary
  async addSubsidiary(
    startupId: number,
    subsidiary: Omit<Subsidiary, 'id'>
  ): Promise<number | null> {
    try {
      console.log('🔍 addSubsidiary called with:', { startupId, subsidiary });
      
      // Use direct database insert instead of RPC to avoid function overloading conflicts
      const { data, error } = await supabase
        .from('subsidiaries')
        .insert({
          startup_id: startupId,
          country: subsidiary.country,
          company_type: subsidiary.companyType,
          registration_date: subsidiary.registrationDate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      console.log('🔍 Direct add_subsidiary result:', { data, error });

      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.error('❌ Error adding subsidiary:', error);
      return null;
    }
  },

  // Update subsidiary
  async updateSubsidiary(
    subsidiaryId: number,
    subsidiary: Omit<Subsidiary, 'id'>
  ): Promise<boolean> {
    try {
      console.log('🔍 updateSubsidiary called with:', { subsidiaryId, subsidiary });
      
      // Ensure registration date is in the correct format
      let dateString: string | null = null;
      
      if (subsidiary.registrationDate) {
        try {
          const date = new Date(subsidiary.registrationDate);
        if (!isNaN(date.getTime())) {
            dateString = date.toISOString().split('T')[0];
        } else {
            console.error('❌ Invalid date format:', subsidiary.registrationDate);
          return false;
        }
        } catch (error) {
          console.error('❌ Error processing date:', error);
          return false;
        }
      }
      
      console.log('🔍 Processed registration date:', dateString);
      
      // Use direct database update instead of RPC to avoid function overloading conflicts
      const { error } = await supabase
        .from('subsidiaries')
        .update({
          country: subsidiary.country,
          company_type: subsidiary.companyType,
          registration_date: dateString,
          updated_at: new Date().toISOString()
        })
        .eq('id', subsidiaryId);

      console.log('🔍 Direct subsidiary update result:', { error });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Error updating subsidiary:', error);
      return false;
    }
  },

  // Delete subsidiary
  async deleteSubsidiary(subsidiaryId: number): Promise<boolean> {
    try {
      console.log('🔍 deleteSubsidiary called with ID:', subsidiaryId);
      
      // Use direct database delete instead of RPC to avoid function overloading conflicts
      const { error } = await supabase
        .from('subsidiaries')
        .delete()
        .eq('id', subsidiaryId);

      console.log('🔍 Direct delete_subsidiary result:', { error });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Error deleting subsidiary:', error);
      return false;
    }
  },

  // =====================================================
  // INTERNATIONAL OPERATIONS
  // =====================================================

  // Add international operation
  async addInternationalOp(
    startupId: number,
    operation: Omit<InternationalOp, 'id'>
  ): Promise<number | null> {
    try {
      // Use the full function with company_type
      const { data, error } = await supabase
        .rpc('add_international_op', {
          startup_id_param: startupId,
          country_param: operation.country,
          company_type_param: operation.companyType || 'default',
          start_date_param: operation.startDate
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding international operation:', error);
      return null;
    }
  },

  // Update international operation
  async updateInternationalOp(
    opId: number,
    operation: Omit<InternationalOp, 'id'>
  ): Promise<boolean> {
    try {
      console.log('🔍 updateInternationalOp called with:', { opId, operation });
      
      // Ensure start date is in the correct format
      let startDate: string | null = (operation.startDate as unknown as string) || null;
      if (startDate && typeof startDate === 'string') {
        // Handle different date formats
        const date = new Date(startDate);
        if (!isNaN(date.getTime())) {
          // Convert to YYYY-MM-DD format for PostgreSQL
          startDate = date.toISOString().split('T')[0];
        } else {
          console.error('❌ Invalid date format:', startDate);
          return false;
        }
      } else if (startDate && typeof startDate === 'object' && 'toISOString' in (startDate as any)) {
        startDate = ((startDate as unknown) as Date).toISOString().split('T')[0];
      }
      
      console.log('🔍 Processed start date:', startDate);
      
      const { data, error } = await supabase
        .rpc('update_international_op', {
          op_id_param: opId,
          country_param: operation.country,
          company_type_param: operation.companyType || 'default',
          start_date_param: startDate
        });

      console.log('🔍 update_international_op result:', { data, error });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error updating international operation:', error);
      return false;
    }
  },

  // Delete international operation
  async deleteInternationalOp(opId: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('delete_international_op', {
          op_id_param: opId
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deleting international operation:', error);
      return false;
    }
  },

  // =====================================================
  // NOTIFICATIONS
  // =====================================================

  // Get profile notifications
  async getProfileNotifications(startupId: number): Promise<ProfileNotification[]> {
    try {
      const { data, error } = await supabase
        .from('profile_notifications')
        .select('*')
        .eq('startup_id', startupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching profile notifications:', error);
      return [];
    }
  },

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profile_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  },

  // =====================================================
  // AUDIT LOG
  // =====================================================

  // Get profile audit log
  async getProfileAuditLog(startupId: number): Promise<ProfileAuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('profile_audit_log')
        .select('*')
        .eq('startup_id', startupId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching profile audit log:', error);
      return [];
    }
  },

  // =====================================================
  // TEMPLATES
  // =====================================================

  // Get profile templates
  async getProfileTemplates(country?: string, sector?: string): Promise<ProfileTemplate[]> {
    try {
      let query = supabase
        .from('profile_templates')
        .select('*')
        .eq('is_active', true);

      if (country) {
        query = query.eq('country', country);
      }

      if (sector) {
        query = query.eq('sector', sector);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching profile templates:', error);
      return [];
    }
  },

  // =====================================================
  // REAL-TIME SUBSCRIPTIONS
  // =====================================================

  // Subscribe to profile changes
  subscribeToProfileChanges(startupId: number, callback: (payload: any) => void) {
    return supabase
      .channel(`profile_changes_${startupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_audit_log',
          filter: `startup_id=eq.${startupId}`
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_notifications',
          filter: `startup_id=eq.${startupId}`
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subsidiaries',
          filter: `startup_id=eq.${startupId}`
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'international_ops',
          filter: `startup_id=eq.${startupId}`
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'startups',
          filter: `id=eq.${startupId}`
        },
        callback
      )
      .subscribe();
  },

  // Subscribe to profile notifications
  subscribeToProfileNotifications(startupId: number, callback: (payload: any) => void) {
    return supabase
      .channel(`profile_notifications_${startupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profile_notifications',
          filter: `startup_id=eq.${startupId}`
        },
        callback
      )
      .subscribe();
  },

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  // Get company types by country
  getCompanyTypesByCountry(country: string, sector?: string): string[] {
    // Normalize common aliases to align with compliance rules
    const aliasToCanonical: Record<string, string> = {
      'USA': 'United States',
      'US': 'United States',
      'UK': 'United Kingdom'
    };
    const normalized = aliasToCanonical[country] || country;

    const companyTypes: { [key: string]: string[] } = {
      'United States': ['C-Corporation', 'LLC', 'S-Corporation'],
      'United Kingdom': ['Limited Company (Ltd)', 'Public Limited Company (PLC)'],
      'India': ['Private Limited Company', 'Public Limited Company', 'LLP'],
      'Singapore': ['Private Limited', 'Exempt Private Company'],
      'Germany': ['GmbH', 'AG', 'UG'],
      'Canada': ['Corporation', 'LLC', 'Partnership'],
      'Australia': ['Proprietary Limited', 'Public Company'],
      'Japan': ['Kabushiki Kaisha', 'Godo Kaisha'],
      'Brazil': ['Ltda', 'S.A.'],
      'France': ['SARL', 'SA', 'SAS']
    };

    return companyTypes[normalized] || ['LLC'];
  },

  // Get all available countries
  getAllCountries(): string[] {
    return COUNTRIES;
  },

  // Validate profile data
  validateProfileData(profile: Partial<ProfileData>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Country and company type are now constrained by admin-managed rules
    // via DB-driven dropdowns, so we skip hardcoded validation here.

    if (profile.registrationDate) {
      const date = new Date(profile.registrationDate);
      if (isNaN(date.getTime())) {
        errors.push('Invalid registration date');
      }
    }

    // Cross-entity date consistency checks
    const parentDate = profile.registrationDate ? new Date(profile.registrationDate) : null;
    const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());

    // Validate subsidiaries
    if (Array.isArray(profile.subsidiaries)) {
      for (const sub of profile.subsidiaries) {
        // Country/company type validity enforced by DB-driven dropdowns
        if (sub.registrationDate) {
          const subDate = new Date(sub.registrationDate);
          if (isNaN(subDate.getTime())) {
            errors.push('Invalid subsidiary registration date');
          }
          if (parentDate && isValidDate(parentDate) && isValidDate(subDate) && subDate < (parentDate as Date)) {
            errors.push('Subsidiary registration date cannot be earlier than parent registration date');
          }
        }
      }
    }

    // Validate international operations
    if (Array.isArray(profile.internationalOps)) {
      for (const op of profile.internationalOps) {
        // Country validity enforced by DB-driven dropdowns
        if (op.startDate) {
          const opDate = new Date(op.startDate);
          if (isNaN(opDate.getTime())) {
            errors.push('Invalid international operation start date');
          }
          if (parentDate && isValidDate(parentDate) && isValidDate(opDate) && opDate < (parentDate as Date)) {
            errors.push('International operation start date cannot be earlier than parent registration date');
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Validate CA/CS codes against backend
  async validateServiceCodes(profile: Partial<ProfileData>): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate main startup CA/CS codes
    if (profile.caServiceCode && profile.caServiceCode.trim()) {
      const caProvider = await this.getServiceProvider(profile.caServiceCode.trim(), 'ca');
      if (!caProvider) {
        errors.push(`Invalid CA code: ${profile.caServiceCode}. Please enter a valid CA service provider code.`);
      }
    }

    if (profile.csServiceCode && profile.csServiceCode.trim()) {
      const csProvider = await this.getServiceProvider(profile.csServiceCode.trim(), 'cs');
      if (!csProvider) {
        errors.push(`Invalid CS code: ${profile.csServiceCode}. Please enter a valid CS service provider code.`);
      }
    }

    // Validate subsidiary CA/CS codes
    if (Array.isArray(profile.subsidiaries)) {
      for (let i = 0; i < profile.subsidiaries.length; i++) {
        const sub = profile.subsidiaries[i];
        const subIndex = i + 1;

        if (sub.caCode && sub.caCode.trim()) {
          const caProvider = await this.getServiceProvider(sub.caCode.trim(), 'ca');
          if (!caProvider) {
            errors.push(`Subsidiary ${subIndex}: Invalid CA code "${sub.caCode}". Please enter a valid CA service provider code.`);
          }
        }

        if (sub.csCode && sub.csCode.trim()) {
          const csProvider = await this.getServiceProvider(sub.csCode.trim(), 'cs');
          if (!csProvider) {
            errors.push(`Subsidiary ${subIndex}: Invalid CS code "${sub.csCode}". Please enter a valid CS service provider code.`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // =====================================================
  // SERVICE PROVIDER OPERATIONS
  // =====================================================

  // Get service provider by code
  async getServiceProvider(code: string, type: 'ca' | 'cs'): Promise<ServiceProvider | null> {
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('*')
        .eq('code', code)
        .eq('type', type)
        .maybeSingle();

      if (error) {
        console.error('Error fetching service provider:', error);
        return null;
      }

      return data ? {
        name: data.name,
        code: data.code,
        licenseUrl: data.license_url
      } : null;
    } catch (error) {
      console.error('Error fetching service provider:', error);
      return null;
    }
  },

  // Update subsidiary service provider
  async updateSubsidiaryServiceProvider(
    subsidiaryId: number,
    type: 'ca' | 'cs',
    serviceCode: string
  ): Promise<boolean> {
    try {
      const updateData = type === 'ca' 
        ? { ca_service_code: serviceCode }
        : { cs_service_code: serviceCode };

      const { data, error } = await supabase
        .from('subsidiaries')
        .update(updateData)
        .eq('id', subsidiaryId)
        .select('id, ca_service_code, cs_service_code')
        .single();

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating subsidiary service provider:', error);
      return false;
    }
  },

  // Remove subsidiary service provider
  async removeSubsidiaryServiceProvider(
    subsidiaryId: number,
    type: 'ca' | 'cs'
  ): Promise<boolean> {
    try {
      const updateData = type === 'ca' 
        ? { ca_service_code: null }
        : { cs_service_code: null };

      const { data, error } = await supabase
        .from('subsidiaries')
        .update(updateData)
        .eq('id', subsidiaryId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing subsidiary service provider:', error);
      return false;
    }
  },

  // =====================================================
  // COMPLIANCE TASK GENERATION
  // =====================================================

  // Generate compliance tasks for a startup
  async generateComplianceTasks(startupId: number): Promise<any[]> {
    try {
      console.log('🔍 Generating compliance tasks for startup:', startupId);
      
      const { data, error } = await supabase
        .rpc('generate_compliance_tasks_for_startup', {
          startup_id_param: startupId
        });
      
      if (error) {
        console.error('Error generating compliance tasks:', error);
        throw error;
      }
      
      console.log('🔍 Generated compliance tasks:', data);
      return data || [];
    } catch (error) {
      console.error('Error generating compliance tasks:', error);
      return [];
    }
  },

  // Sync compliance tasks with database
  async syncComplianceTasks(startupId: number): Promise<boolean> {
    try {
      console.log('🔍 Compliance task syncing disabled - using database function directly');
      // Note: Compliance tasks are now generated dynamically by the database function
      // No need to sync to compliance_checks table
      return true;
    } catch (error) {
      console.error('Error syncing compliance tasks:', error);
      return false;
    }
  },

  // Get compliance tasks for a startup
  async getComplianceTasks(startupId: number): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('compliance_checks')
        .select('*')
        .eq('startup_id', startupId)
        .order('year', { ascending: false })
        .order('task_name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching compliance tasks:', error);
      return [];
    }
  },

  // Update compliance task status
  async updateComplianceTaskStatus(
    startupId: number,
    taskId: string,
    type: 'ca' | 'cs',
    status: string
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
      console.error('Error updating compliance task status:', error);
      return false;
    }
  }
};
