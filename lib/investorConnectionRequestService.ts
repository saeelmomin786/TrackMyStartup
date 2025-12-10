import { supabase } from './supabase';

export interface InvestorConnectionRequest {
  id: string;
  investor_id: string;
  requester_id: string;
  requester_type: 'Startup' | 'Investment Advisor' | 'Mentor' | 'CA' | 'CS' | 'Incubator' | string;
  startup_id?: number;
  startup_profile_url?: string;
  advisor_profile_url?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'viewed';
  created_at: string;
  updated_at: string;
  viewed_at?: string;
  responded_at?: string;
}

export interface CreateConnectionRequest {
  investor_id: string;
  requester_id: string;
  requester_type: 'Startup' | 'Investment Advisor' | 'Mentor' | 'CA' | 'CS' | 'Incubator' | string;
  startup_id?: number;
  startup_profile_url?: string;
  advisor_profile_url?: string;
  message?: string;
}

export const investorConnectionRequestService = {
  // Create a new connection request
  async createRequest(request: CreateConnectionRequest): Promise<InvestorConnectionRequest> {
    const { data, error } = await supabase
      .from('investor_connection_requests')
      .insert(request)
      .select()
      .single();

    if (error) {
      // If it's a unique constraint violation, try to update existing pending request
      if (error.code === '23505') {
        const { data: existing, error: updateError } = await supabase
          .from('investor_connection_requests')
          .update({
            startup_profile_url: request.startup_profile_url,
            advisor_profile_url: request.advisor_profile_url,
            message: request.message,
            status: 'pending',
            created_at: new Date().toISOString()
          })
          .eq('investor_id', request.investor_id)
          .eq('requester_id', request.requester_id)
          .eq('status', 'pending')
          .select()
          .single();

        if (updateError) throw updateError;
        return existing as InvestorConnectionRequest;
      }
      throw error;
    }

    return data as InvestorConnectionRequest;
  },

  // Get all requests for an investor
  async getRequestsForInvestor(investorId: string): Promise<InvestorConnectionRequest[]> {
    const { data, error } = await supabase
      .from('investor_connection_requests')
      .select('*')
      .eq('investor_id', investorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as InvestorConnectionRequest[];
  },

  // Get requests by status
  async getRequestsByStatus(investorId: string, status: string): Promise<InvestorConnectionRequest[]> {
    const { data, error } = await supabase
      .from('investor_connection_requests')
      .select('*')
      .eq('investor_id', investorId)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as InvestorConnectionRequest[];
  },

  // Update request status
  async updateRequestStatus(
    requestId: string,
    status: 'pending' | 'accepted' | 'rejected' | 'viewed',
    investorId: string
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'viewed') {
      updateData.viewed_at = new Date().toISOString();
    }

    if (status === 'accepted' || status === 'rejected') {
      updateData.responded_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('investor_connection_requests')
      .update(updateData)
      .eq('id', requestId)
      .eq('investor_id', investorId);

    if (error) throw error;
  },

  // Delete a request
  async deleteRequest(requestId: string, investorId: string): Promise<void> {
    const { error } = await supabase
      .from('investor_connection_requests')
      .delete()
      .eq('id', requestId)
      .eq('investor_id', investorId);

    if (error) throw error;
  },

  // Get count of pending requests
  async getPendingCount(investorId: string): Promise<number> {
    const { count, error } = await supabase
      .from('investor_connection_requests')
      .select('*', { count: 'exact', head: true })
      .eq('investor_id', investorId)
      .eq('status', 'pending');

    if (error) throw error;
    return count || 0;
  }
};

