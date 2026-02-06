import { supabase } from './supabase';

export interface AdvisorStartupLinkRequest {
  id: number;
  advisor_id: string;
  advisor_code: string;
  advisor_name?: string;
  advisor_email?: string;
  startup_id: number;
  startup_name: string;
  startup_user_id: string;
  startup_email: string;
  advisor_added_startup_id?: number;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  created_at: string;
  updated_at: string;
  responded_at?: string;
}

export interface CreateAdvisorStartupLinkRequest {
  advisor_id: string;
  advisor_code: string;
  advisor_name?: string;
  advisor_email?: string;
  startup_id: number;
  startup_name: string;
  startup_user_id: string;
  startup_email: string;
  advisor_added_startup_id?: number;
  message?: string;
}

class AdvisorStartupLinkRequestService {
  // Create a new link request
  async createRequest(request: CreateAdvisorStartupLinkRequest): Promise<AdvisorStartupLinkRequest | null> {
    try {
      // Check if request already exists
      const { data: existing } = await supabase
        .from('advisor_startup_link_requests')
        .select('id, status')
        .eq('advisor_id', request.advisor_id)
        .eq('startup_id', request.startup_id)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'pending') {
          throw new Error('A pending request already exists for this startup');
        }
        if (existing.status === 'approved') {
          throw new Error('This startup is already linked to your account');
        }
        // If rejected, allow creating a new request
      }

      const { data, error } = await supabase
        .from('advisor_startup_link_requests')
        .insert({
          ...request,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating advisor startup link request:', error);
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Error in createRequest:', error);
      throw error;
    }
  }

  // Get all requests for an advisor
  async getRequestsByAdvisor(advisorId: string): Promise<AdvisorStartupLinkRequest[]> {
    try {
      const { data, error } = await supabase
        .from('advisor_startup_link_requests')
        .select('*')
        .eq('advisor_id', advisorId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching advisor link requests:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRequestsByAdvisor:', error);
      return [];
    }
  }

  // Get all requests for a startup
  async getRequestsByStartup(startupUserId: string): Promise<AdvisorStartupLinkRequest[]> {
    try {
      const { data, error } = await supabase
        .from('advisor_startup_link_requests')
        .select('*')
        .eq('startup_user_id', startupUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching startup link requests:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRequestsByStartup:', error);
      return [];
    }
  }

  // Approve a request
  async approveRequest(requestId: number): Promise<{ success: boolean; switchedAdvisor?: boolean; previousAdvisorName?: string }> {
    try {
      // Get request details
      const { data: request, error: fetchError } = await supabase
        .from('advisor_startup_link_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError || !request) {
        throw new Error('Request not found');
      }

      if (request.status !== 'pending') {
        throw new Error(`Request is already ${request.status}`);
      }

      // Check if startup already has a different advisor
      const { data: startupUser } = await supabase
        .from('user_profiles')
        .select('investment_advisor_code_entered')
        .eq('auth_user_id', request.startup_user_id)
        .maybeSingle();

      let switchedAdvisor = false;
      let previousAdvisorName = '';

      if (startupUser?.investment_advisor_code_entered && 
          startupUser.investment_advisor_code_entered !== request.advisor_code) {
        // Startup is switching advisors
        switchedAdvisor = true;
        
        // Get previous advisor name
        const { data: previousAdvisor } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('investment_advisor_code', startupUser.investment_advisor_code_entered)
          .eq('role', 'Investment Advisor')
          .maybeSingle();
        
        previousAdvisorName = previousAdvisor?.name || 'Previous Advisor';

        // Reject any other pending requests from the previous advisor
        await supabase
          .from('advisor_startup_link_requests')
          .update({
            status: 'rejected',
            responded_at: new Date().toISOString()
          })
          .eq('startup_id', request.startup_id)
          .eq('status', 'pending')
          .neq('id', requestId);
      }

      // Update request status
      const { error: updateError } = await supabase
        .from('advisor_startup_link_requests')
        .update({
          status: 'approved',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error approving request:', updateError);
        throw updateError;
      }

      // Link advisor code to startup (this will replace any existing advisor)
      await supabase
        .from('user_profiles')
        .update({
          investment_advisor_code_entered: request.advisor_code,
          updated_at: new Date().toISOString()
        })
        .eq('auth_user_id', request.startup_user_id);

      await supabase
        .from('startups')
        .update({
          investment_advisor_code: request.advisor_code,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.startup_id);

      // If this came from advisor_added_startups, update that record
      if (request.advisor_added_startup_id) {
        await supabase
          .from('advisor_added_startups')
          .update({
            is_on_tms: true,
            tms_startup_id: request.startup_id,
            invite_status: 'accepted'
          })
          .eq('id', request.advisor_added_startup_id);
      }

      return { success: true, switchedAdvisor, previousAdvisorName };
    } catch (error: any) {
      console.error('Error in approveRequest:', error);
      throw error;
    }
  }

  // Reject a request
  async rejectRequest(requestId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('advisor_startup_link_requests')
        .update({
          status: 'rejected',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error rejecting request:', error);
        throw error;
      }

      return true;
    } catch (error: any) {
      console.error('Error in rejectRequest:', error);
      throw error;
    }
  }
}

export const advisorStartupLinkRequestService = new AdvisorStartupLinkRequestService();

