import { supabase } from './supabase';

export interface InvestorConnectionRequest {
  id: string;
  investor_id: string;
  requester_id: string;
  requester_type: 'Startup' | 'Investment Advisor' | 'Mentor' | 'CA' | 'CS' | 'Incubator' | 'Investor' | 'Startup Facilitation Center' | 'Admin' | string;
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
  requester_type: 'Startup' | 'Investment Advisor' | 'Mentor' | 'CA' | 'CS' | 'Incubator' | 'Investor' | 'Startup Facilitation Center' | 'Admin' | string;
  startup_id?: number;
  startup_profile_url?: string;
  advisor_profile_url?: string;
  message?: string;
}

export const investorConnectionRequestService = {
  // Check if request already exists (for frontend validation)
  async checkExistingRequest(investorId: string, requesterId: string): Promise<{ exists: boolean; status?: string; request?: InvestorConnectionRequest }> {
    const { data, error } = await supabase
      .from('investor_connection_requests')
      .select('*')
      .eq('investor_id', investorId)
      .eq('requester_id', requesterId)
      .in('status', ['pending', 'accepted'])
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (data) {
      return { exists: true, status: data.status, request: data as InvestorConnectionRequest };
    }

    return { exists: false };
  },

  // Create a new connection request
  async createRequest(request: CreateConnectionRequest): Promise<InvestorConnectionRequest> {
    // First check if an accepted request already exists
    const existingCheck = await this.checkExistingRequest(request.investor_id, request.requester_id);
    if (existingCheck.exists && existingCheck.status === 'accepted') {
      throw new Error('You are already connected with this user. No new request needed.');
    }
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
    // CRITICAL FIX: investor_connection_requests.investor_id references auth.users(id), not profile_id
    // Get auth_user_id if investorId is profile_id
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const authUserId = authUser?.id || investorId;
    
    const { data, error } = await supabase
      .from('investor_connection_requests')
      .select('*')
      .eq('investor_id', authUserId)  // Use auth_user_id, not profile_id
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as InvestorConnectionRequest[];
  },

  // Get requests by status
  async getRequestsByStatus(investorId: string, status: string): Promise<InvestorConnectionRequest[]> {
    // CRITICAL FIX: investor_connection_requests.investor_id references auth.users(id), not profile_id
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const authUserId = authUser?.id || investorId;
    
    const { data, error } = await supabase
      .from('investor_connection_requests')
      .select('*')
      .eq('investor_id', authUserId)  // Use auth_user_id, not profile_id
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
    // CRITICAL FIX: investor_connection_requests.investor_id references auth.users(id), not profile_id
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const authUserId = authUser?.id || investorId;
    
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
      .eq('investor_id', authUserId);  // Use auth_user_id, not profile_id

    if (error) throw error;
  },

  // Delete a request
  async deleteRequest(requestId: string, investorId: string): Promise<void> {
    // CRITICAL FIX: investor_connection_requests.investor_id references auth.users(id), not profile_id
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const authUserId = authUser?.id || investorId;
    
    const { error } = await supabase
      .from('investor_connection_requests')
      .delete()
      .eq('id', requestId)
      .eq('investor_id', authUserId);  // Use auth_user_id, not profile_id

    if (error) throw error;
  },

  // Get count of pending requests
  async getPendingCount(investorId: string): Promise<number> {
    // CRITICAL FIX: investor_connection_requests.investor_id references auth.users(id), not profile_id
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const authUserId = authUser?.id || investorId;
    
    const { count, error } = await supabase
      .from('investor_connection_requests')
      .select('*', { count: 'exact', head: true })
      .eq('investor_id', authUserId)  // Use auth_user_id, not profile_id
      .eq('status', 'pending');

    if (error) throw error;
    return count || 0;
  }
};

