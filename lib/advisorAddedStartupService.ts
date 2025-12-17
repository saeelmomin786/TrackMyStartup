import { supabase } from './supabase';

export interface AdvisorAddedStartup {
  id: number;
  advisor_id: string;
  startup_name: string;
  sector?: string;
  website_url?: string;
  linkedin_url?: string;
  contact_email: string;
  contact_name: string;
  contact_number?: string;
  description?: string;
  current_valuation?: number;
  investment_amount?: number;
  equity_percentage?: number;
  investment_date?: string;
  currency: string;
  domain?: string;
  stage?: string;
  round_type?: string;
  country?: string;
  is_on_tms: boolean;
  tms_startup_id?: number;
  invite_sent_at?: string;
  invite_status: 'not_sent' | 'sent' | 'accepted' | 'declined';
  invited_user_id?: string;
  invited_email?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAdvisorAddedStartup {
  advisor_id: string;
  startup_name: string;
  sector?: string;
  website_url?: string;
  linkedin_url?: string;
  contact_email: string;
  contact_name: string;
  contact_number?: string;
  description?: string;
  current_valuation?: number;
  investment_amount?: number;
  equity_percentage?: number;
  investment_date?: string;
  currency?: string;
  domain?: string;
  stage?: string;
  round_type?: string;
  country?: string;
  notes?: string;
}

export interface CreateStartupResult {
  success: boolean;
  data?: AdvisorAddedStartup;
  error?: string;
  isDuplicate?: boolean;
  tmsStartupId?: number;
  requiresPermission?: boolean;
  alreadyHasAdvisor?: boolean;
  existingAdvisorName?: string;
}

export interface UpdateAdvisorAddedStartup {
  startup_name?: string;
  sector?: string;
  website_url?: string;
  linkedin_url?: string;
  contact_email?: string;
  contact_name?: string;
  contact_number?: string;
  description?: string;
  current_valuation?: number;
  investment_amount?: number;
  equity_percentage?: number;
  investment_date?: string;
  currency?: string;
  domain?: string;
  stage?: string;
  round_type?: string;
  country?: string;
  notes?: string;
  is_on_tms?: boolean;
  tms_startup_id?: number;
  invite_status?: 'not_sent' | 'sent' | 'accepted' | 'declined';
}

class AdvisorAddedStartupService {
  // Get all startups added by an advisor
  async getStartupsByAdvisor(advisorId: string): Promise<AdvisorAddedStartup[]> {
    try {
      // Get auth.uid() directly from Supabase (RLS policies use auth.uid())
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const authUserId = authUser?.id || advisorId; // Fallback to advisorId if auth.uid() not available
      
      const { data, error } = await supabase
        .from('advisor_added_startups')
        .select('*')
        .eq('advisor_id', authUserId)  // Use auth.uid() instead of advisorId
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching advisor added startups:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getStartupsByAdvisor:', error);
      return [];
    }
  }

  // Get a single startup by ID
  async getStartupById(startupId: number): Promise<AdvisorAddedStartup | null> {
    try {
      const { data, error } = await supabase
        .from('advisor_added_startups')
        .select('*')
        .eq('id', startupId)
        .single();

      if (error) {
        console.error('Error fetching startup by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getStartupById:', error);
      return null;
    }
  }

  // Check if startup already exists on TMS (by email or name)
  async checkStartupExistsOnTMS(email: string, startupName: string): Promise<{ exists: boolean; startupId?: number; userId?: string }> {
    try {
      // Check by email in users table
      const { data: userData } = await supabase
        .from('users')
        .select('id, role, startup_name')
        .eq('email', email.toLowerCase().trim())
        .eq('role', 'Startup')
        .maybeSingle();

      if (userData) {
        // Find startup record for this user
        const { data: startupData } = await supabase
          .from('startups')
          .select('id')
          .eq('user_id', userData.id)
          .maybeSingle();

        if (startupData) {
          return { exists: true, startupId: startupData.id, userId: userData.id };
        }
      }

      // Also check by startup name (case-insensitive)
      const { data: startupByName } = await supabase
        .from('startups')
        .select('id, user_id, name')
        .ilike('name', startupName.trim())
        .maybeSingle();

      if (startupByName) {
        return { exists: true, startupId: startupByName.id, userId: startupByName.user_id };
      }

      return { exists: false };
    } catch (error) {
      console.error('Error checking startup existence:', error);
      return { exists: false };
    }
  }

  // Create a new added startup
  async createStartup(startup: CreateAdvisorAddedStartup): Promise<CreateStartupResult> {
    try {
      // Check if startup already exists on TMS
      const existsCheck = await this.checkStartupExistsOnTMS(startup.contact_email, startup.startup_name);
      
      if (existsCheck.exists && existsCheck.startupId) {
        // Startup already exists on TMS - create permission request instead of auto-linking
        // First create the advisor_added_startups entry with pending status
        // Get auth.uid() directly from Supabase (RLS policies use auth.uid())
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const authUserId = authUser?.id || startup.advisor_id; // Fallback to passed advisor_id if auth.uid() not available
        
        const startupData: any = {
          ...startup,
          advisor_id: authUserId,  // Use auth.uid() instead of passed advisor_id
          currency: startup.currency || 'USD',
          is_on_tms: false, // Not linked yet, pending permission
          tms_startup_id: existsCheck.startupId,
          invite_status: 'not_sent' // Will be updated when permission is granted
        };

        const { data: addedStartupData, error: insertError } = await supabase
          .from('advisor_added_startups')
          .insert([startupData])
          .select()
          .single();

        if (insertError) {
          console.error('Error creating added startup entry:', insertError);
          return { success: false, error: insertError.message, isDuplicate: true };
        }

        // Get advisor details (use authUserId instead of startup.advisor_id)
        const { data: advisorData } = await supabase
          .from('users')
          .select('investment_advisor_code, name, email')
          .eq('id', authUserId)
          .maybeSingle();

        // Get startup user details and check if already has an advisor
        const { data: startupUserData } = await supabase
          .from('users')
          .select('email, investment_advisor_code_entered')
          .eq('id', existsCheck.userId)
          .maybeSingle();

        // Check if startup already has a different advisor
        let alreadyHasAdvisor = false;
        let existingAdvisorName = '';
        
        if (startupUserData?.investment_advisor_code_entered && 
            startupUserData.investment_advisor_code_entered !== advisorData?.investment_advisor_code) {
          alreadyHasAdvisor = true;
          
          // Get existing advisor name
          const { data: existingAdvisorData } = await supabase
            .from('users')
            .select('name, investment_advisor_code')
            .eq('investment_advisor_code', startupUserData.investment_advisor_code_entered)
            .eq('role', 'Investment Advisor')
            .maybeSingle();
          
          existingAdvisorName = existingAdvisorData?.name || 'Another Investment Advisor';
          
          // Don't create permission request if already has advisor - return error instead
          return {
            success: false,
            error: `This startup is already linked with another Investment Advisor (${existingAdvisorName}). Please contact the startup directly to change their Investment Advisor code.`,
            isDuplicate: true,
            tmsStartupId: existsCheck.startupId,
            alreadyHasAdvisor: true,
            existingAdvisorName
          };
        }

        // Create permission request (only if startup doesn't already have an advisor)
        const { advisorStartupLinkRequestService } = await import('./advisorStartupLinkRequestService');
        try {
          await advisorStartupLinkRequestService.createRequest({
            advisor_id: authUserId,  // Use auth.uid() instead of startup.advisor_id
            advisor_code: advisorData?.investment_advisor_code || '',
            advisor_name: advisorData?.name,
            advisor_email: advisorData?.email,
            startup_id: existsCheck.startupId,
            startup_name: startup.startup_name,
            startup_user_id: existsCheck.userId,
            startup_email: startupUserData?.email || startup.contact_email,
            advisor_added_startup_id: addedStartupData.id,
            message: `Investment Advisor "${advisorData?.name || 'Unknown'}" wants to link your startup "${startup.startup_name}" to their account.`
          });
        } catch (requestError: any) {
          // If request creation fails, still return success for the added startup entry
          console.error('Error creating permission request:', requestError);
          // Don't fail the whole operation, just log it
        }

        return { 
          success: true, 
          data: addedStartupData, 
          isDuplicate: true, 
          tmsStartupId: existsCheck.startupId,
          requiresPermission: true,
          alreadyHasAdvisor,
          existingAdvisorName
        };
      }

      // Startup doesn't exist on TMS - create new entry
      // Get auth.uid() directly from Supabase (RLS policies use auth.uid())
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const authUserId = authUser?.id || startup.advisor_id; // Fallback to passed advisor_id if auth.uid() not available
      
      const startupData: any = {
        ...startup,
        advisor_id: authUserId,  // Use auth.uid() instead of passed advisor_id
        currency: startup.currency || 'USD',
        is_on_tms: false,
        invite_status: 'not_sent'
      };

      const { data, error } = await supabase
        .from('advisor_added_startups')
        .insert([startupData])
        .select()
        .single();

      if (error) {
        console.error('Error creating added startup:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Error in createStartup:', error);
      return { success: false, error: error.message };
    }
  }

  // Update an existing startup
  async updateStartup(startupId: number, updates: UpdateAdvisorAddedStartup): Promise<AdvisorAddedStartup | null> {
    try {
      // Validate startupId
      if (!startupId || startupId === undefined || isNaN(startupId)) {
        console.error('Invalid startupId provided:', startupId);
        throw new Error('Invalid startup ID. Cannot update startup.');
      }

      const { data, error } = await supabase
        .from('advisor_added_startups')
        .update(updates)
        .eq('id', startupId)
        .select()
        .single();

      if (error) {
        console.error('Error updating startup:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateStartup:', error);
      return null;
    }
  }

  // Delete a startup
  async deleteStartup(startupId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('advisor_added_startups')
        .delete()
        .eq('id', startupId);

      if (error) {
        console.error('Error deleting startup:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteStartup:', error);
      return false;
    }
  }

  // Send invite to TMS via API (creates user, sends email, updates status)
  async sendInviteToTMS(
    startupId: number,
    advisorId: string,
    advisorCode: string
  ): Promise<{ success: boolean; userId?: string; error?: string; isExistingTMSStartup?: boolean; tmsStartupId?: number; requiresPermission?: boolean; alreadyHasAdvisor?: boolean; existingAdvisorName?: string }> {
    try {
      // Get startup details first
      const startup = await this.getStartupById(startupId);
      if (!startup) {
        return { success: false, error: 'Startup not found' };
      }

      // Call API endpoint to handle invite
      const apiUrl = '/api/invite-startup-advisor';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startupId,
          advisorId,
          advisorCode,
          startupName: startup.startup_name,
          contactEmail: startup.contact_email,
          contactName: startup.contact_name,
          redirectUrl: typeof window !== 'undefined' ? window.location.origin : undefined
        }),
      });

      if (!response.ok) {
        let errorData;
        const responseText = await response.text();
        try {
          errorData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('API error - could not parse JSON:', responseText);
          errorData = { error: `Server error (${response.status}): ${responseText || 'Unknown error'}` };
        }
        console.error('API error response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        return { 
          success: false, 
          error: errorData.error || errorData.message || `Failed to send invite (${response.status})`,
          details: errorData.details
        };
      }

      const result = await response.json();
      
      // Note: API already updates the advisor_added_startups record, so we don't need to update it here
      // Just return the result

      // Handle case where startup already has a different advisor
      if (result.alreadyHasAdvisor) {
        return {
          success: false,
          error: `This startup is already linked with another Investment Advisor (${result.existingAdvisorName || 'Unknown'}). Please contact the startup directly to change their Investment Advisor code.`,
          alreadyHasAdvisor: true,
          existingAdvisorName: result.existingAdvisorName
        };
      }

      return { 
        success: result.success, 
        userId: result.userId,
        isExistingTMSStartup: result.isExistingTMSStartup,
        tmsStartupId: result.tmsStartupId,
        requiresPermission: result.requiresPermission
      };
    } catch (error: any) {
      console.error('Error in sendInviteToTMS:', error);
      return { success: false, error: error.message || 'Failed to send invite' };
    }
  }

  // Link to TMS startup (when startup joins TMS)
  async linkToTMSStartup(startupId: number, tmsStartupId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('advisor_added_startups')
        .update({
          is_on_tms: true,
          tms_startup_id: tmsStartupId,
          invite_status: 'accepted'
        })
        .eq('id', startupId);

      if (error) {
        console.error('Error linking to TMS startup:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in linkToTMSStartup:', error);
      return false;
    }
  }
}

export const advisorAddedStartupService = new AdvisorAddedStartupService();









