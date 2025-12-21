import { supabase } from './supabase';

export interface AdvisorConnectionRequest {
  id: string;
  advisor_id: string;
  requester_id: string;
  requester_type: 'Startup' | 'Investor' | 'Investment Advisor' | 'Mentor' | 'CA' | 'CS' | 'Incubation' | 'Incubation Center' | 'Incubator';
  startup_id?: number;
  startup_profile_url?: string;
  collaborator_profile_url?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'viewed';
  created_at: string;
  updated_at: string;
  viewed_at?: string;
  responded_at?: string;
}

export interface CreateAdvisorConnectionRequest {
  advisor_id: string;
  requester_id: string;
  requester_type: 'Startup' | 'Investor' | 'Investment Advisor' | 'Mentor' | 'CA' | 'CS' | 'Incubation' | 'Incubation Center' | 'Incubator';
  startup_id?: number;
  startup_profile_url?: string;
  collaborator_profile_url?: string;
  message?: string;
}

export const advisorConnectionRequestService = {
  // Check if request already exists (for frontend validation)
  async checkExistingRequest(advisorId: string, requesterId: string): Promise<{ exists: boolean; status?: string; request?: AdvisorConnectionRequest }> {
    const { data, error } = await supabase
      .from('advisor_connection_requests')
      .select('*')
      .eq('advisor_id', advisorId)
      .eq('requester_id', requesterId)
      .in('status', ['pending', 'accepted'])
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (data) {
      return { exists: true, status: data.status, request: data as AdvisorConnectionRequest };
    }

    return { exists: false };
  },

  // Create a new connection request
  async createRequest(request: CreateAdvisorConnectionRequest): Promise<AdvisorConnectionRequest> {
    // First check if an accepted request already exists
    const existingCheck = await this.checkExistingRequest(request.advisor_id, request.requester_id);
    if (existingCheck.exists && existingCheck.status === 'accepted') {
      throw new Error('You are already connected with this advisor. No new request needed.');
    }

    const { data, error } = await supabase
      .from('advisor_connection_requests')
      .insert(request)
      .select()
      .single();

    if (error) {
      // If it's a unique constraint violation, try to update existing pending request
      if (error.code === '23505') {
        // Check if it's a pending request
        const { data: existingPending, error: pendingError } = await supabase
          .from('advisor_connection_requests')
          .select('*')
          .eq('advisor_id', request.advisor_id)
          .eq('requester_id', request.requester_id)
          .eq('status', 'pending')
          .maybeSingle();

        if (pendingError && pendingError.code !== 'PGRST116') {
          throw pendingError;
        }

        if (existingPending) {
          // Update existing pending request
          const { data: updated, error: updateError } = await supabase
            .from('advisor_connection_requests')
            .update({
              startup_profile_url: request.startup_profile_url,
              collaborator_profile_url: request.collaborator_profile_url,
              message: request.message,
              status: 'pending',
              created_at: new Date().toISOString()
            })
            .eq('id', existingPending.id)
            .select()
            .single();

          if (updateError) throw updateError;
          return updated as AdvisorConnectionRequest;
        }

        // Check if it's an accepted request
        const { data: existingAccepted, error: acceptedError } = await supabase
          .from('advisor_connection_requests')
          .select('*')
          .eq('advisor_id', request.advisor_id)
          .eq('requester_id', request.requester_id)
          .eq('status', 'accepted')
          .maybeSingle();

        if (acceptedError && acceptedError.code !== 'PGRST116') {
          throw acceptedError;
        }

        if (existingAccepted) {
          throw new Error('You are already connected with this advisor. No new request needed.');
        }
      }
      throw error;
    }

    return data as AdvisorConnectionRequest;
  },

  // Get all requests for an advisor
  async getRequestsForAdvisor(advisorId: string): Promise<AdvisorConnectionRequest[]> {
    // CRITICAL FIX: advisor_connection_requests.advisor_id references auth.users(id), not profile_id
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const authUserId = authUser?.id || advisorId;
    
    const { data, error } = await supabase
      .from('advisor_connection_requests')
      .select('*')
      .eq('advisor_id', authUserId)  // Use auth_user_id, not profile_id
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as AdvisorConnectionRequest[];
  },

  // Get startup requests (for Service Requests tab)
  async getStartupRequests(advisorId: string): Promise<AdvisorConnectionRequest[]> {
    // CRITICAL FIX: advisor_connection_requests.advisor_id references auth.users(id), not profile_id
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const authUserId = authUser?.id || advisorId;
    
    const { data, error } = await supabase
      .from('advisor_connection_requests')
      .select('*')
      .eq('advisor_id', authUserId)  // Use auth_user_id, not profile_id
      .eq('requester_type', 'Startup')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as AdvisorConnectionRequest[];
  },

  // Get collaborator requests (for Collaboration tab)
  async getCollaboratorRequests(advisorId: string): Promise<AdvisorConnectionRequest[]> {
    // CRITICAL FIX: advisor_connection_requests.advisor_id references auth.users(id), not profile_id
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const authUserId = authUser?.id || advisorId;
    
    const { data, error } = await supabase
      .from('advisor_connection_requests')
      .select('*')
      .eq('advisor_id', authUserId)  // Use auth_user_id, not profile_id
      .neq('requester_type', 'Startup')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as AdvisorConnectionRequest[];
  },

  // Get requests by status
  async getRequestsByStatus(advisorId: string, status: string): Promise<AdvisorConnectionRequest[]> {
    // CRITICAL FIX: advisor_connection_requests.advisor_id references auth.users(id), not profile_id
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const authUserId = authUser?.id || advisorId;
    
    const { data, error } = await supabase
      .from('advisor_connection_requests')
      .select('*')
      .eq('advisor_id', authUserId)  // Use auth_user_id, not profile_id
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as AdvisorConnectionRequest[];
  },

  // Update request status
  async updateRequestStatus(
    requestId: string,
    status: 'pending' | 'accepted' | 'rejected' | 'viewed',
    advisorId: string
  ): Promise<void> {
    // CRITICAL FIX: advisor_connection_requests.advisor_id references auth.users(id), not profile_id
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const authUserId = authUser?.id || advisorId;
    
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
      .from('advisor_connection_requests')
      .update(updateData)
      .eq('id', requestId)
      .eq('advisor_id', authUserId);  // Use auth_user_id, not profile_id

    if (error) throw error;
  },

  // Delete a request
  async deleteRequest(requestId: string, advisorId: string): Promise<void> {
    // CRITICAL FIX: advisor_connection_requests.advisor_id references auth.users(id), not profile_id
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const authUserId = authUser?.id || advisorId;
    
    const { error } = await supabase
      .from('advisor_connection_requests')
      .delete()
      .eq('id', requestId)
      .eq('advisor_id', authUserId);  // Use auth_user_id, not profile_id

    if (error) throw error;
  },

  // Get count of pending requests
  async getPendingCount(advisorId: string): Promise<number> {
    // CRITICAL FIX: advisor_connection_requests.advisor_id references auth.users(id), not profile_id
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const authUserId = authUser?.id || advisorId;
    
    const { count, error } = await supabase
      .from('advisor_connection_requests')
      .select('*', { count: 'exact', head: true })
      .eq('advisor_id', authUserId)  // Use auth_user_id, not profile_id
      .eq('status', 'pending');

    if (error) throw error;
    return count || 0;
  },

  // Get requests by requester_id (for requester's perspective - e.g., Investor seeing their accepted advisors)
  async getRequestsByRequester(requesterId: string): Promise<AdvisorConnectionRequest[]> {
    const { data, error } = await supabase
      .from('advisor_connection_requests')
      .select('*')
      .eq('requester_id', requesterId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as AdvisorConnectionRequest[];
  },

  // Get accepted requests by requester_id (for requester's "My Collaborators" view)
  async getAcceptedRequestsByRequester(requesterId: string): Promise<AdvisorConnectionRequest[]> {
    const { data, error } = await supabase
      .from('advisor_connection_requests')
      .select('*')
      .eq('requester_id', requesterId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as AdvisorConnectionRequest[];
  }
};

