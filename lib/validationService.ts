import { supabase } from './supabase';

export interface ValidationRequest {
  id: number;
  startupId: number;
  startupName: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  createdAt: string;
}

class ValidationService {
  // Create or update validation request (ensures only one per startup)
  async createValidationRequest(startupId: number, startupName: string): Promise<ValidationRequest> {
    try {
      console.log('Creating/updating validation request for startup:', { startupId, startupName });
      
      // First, check if a validation request already exists for this startup
      const { data: existingRequest, error: checkError } = await supabase
        .from('validation_requests')
        .select('*')
        .eq('startup_id', startupId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing validation request:', checkError);
        throw checkError;
      }

      let result;
      
      if (existingRequest) {
        // Update existing request
        console.log('Updating existing validation request:', existingRequest.id);
        const { data, error } = await supabase
          .from('validation_requests')
          .update({
            startup_name: startupName,
            status: 'pending',
            admin_notes: null, // Clear any previous admin notes
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRequest.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating validation request:', error);
          throw error;
        }
        
        result = data;
        console.log('Validation request updated successfully:', result);
      } else {
        // Create new request
        console.log('Creating new validation request');
        const { data, error } = await supabase
          .from('validation_requests')
          .insert({
            startup_id: startupId,
            startup_name: startupName,
            status: 'pending'
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating validation request:', error);
          throw error;
        }
        
        result = data;
        console.log('Validation request created successfully:', result);
      }

      return {
        id: result.id,
        startupId: result.startup_id,
        startupName: result.startup_name,
        requestDate: result.created_at,
        status: result.status,
        adminNotes: result.admin_notes,
        createdAt: result.created_at
      };
    } catch (error) {
      console.error('Error in createValidationRequest:', error);
      throw error;
    }
  }

  // Get all validation requests (for admin)
  async getAllValidationRequests(): Promise<ValidationRequest[]> {
    try {
      console.log('Fetching all validation requests...');
      
      const { data, error } = await supabase
        .from('validation_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching validation requests:', error);
        return [];
      }

      console.log('Validation requests fetched successfully:', data?.length || 0);
      
      return (data || []).map(item => ({
        id: item.id,
        startupId: item.startup_id,
        startupName: item.startup_name,
        requestDate: item.created_at,
        status: item.status,
        adminNotes: item.admin_notes,
        createdAt: item.created_at
      }));
    } catch (error) {
      console.error('Error in getAllValidationRequests:', error);
      return [];
    }
  }

  // Process validation request (approve/reject) - for admin
  async processValidationRequest(requestId: number, status: 'approved' | 'rejected', adminNotes?: string): Promise<ValidationRequest> {
    try {
      console.log(`Processing validation request ${requestId} with status ${status}`);
      
      // Update the validation request
      const { data: updatedRequest, error: updateError } = await supabase
        .from('validation_requests')
        .update({
          status,
          admin_notes: adminNotes
        })
        .eq('id', requestId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating validation request:', updateError);
        throw updateError;
      }

      // If approved, update the startup's validation status
      if (status === 'approved') {
        const { error: startupError } = await supabase
          .from('startups')
          .update({ 
            startup_nation_validated: true,
            validation_date: new Date().toISOString()
          })
          .eq('id', updatedRequest.startup_id);

        if (startupError) {
          console.error('Error updating startup validation status:', startupError);
          throw startupError;
        }
      }

      console.log('Validation request processed successfully');
      
      return {
        id: updatedRequest.id,
        startupId: updatedRequest.startup_id,
        startupName: updatedRequest.startup_name,
        requestDate: updatedRequest.created_at,
        status: updatedRequest.status,
        adminNotes: updatedRequest.admin_notes,
        createdAt: updatedRequest.created_at
      };
    } catch (error) {
      console.error('Error in processValidationRequest:', error);
      throw error;
    }
  }

  // Get validation status for a specific startup
  async getStartupValidationStatus(startupId: number): Promise<ValidationRequest | null> {
    try {
      const { data, error } = await supabase
        .from('validation_requests')
        .select('*')
        .eq('startup_id', startupId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching startup validation status:', error);
        throw error;
      }

      // If no rows, return null (no validation request yet)
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        return null;
      }

      return {
        id: row.id,
        startupId: row.startup_id,
        startupName: row.startup_name,
        requestDate: row.created_at,
        status: row.status,
        adminNotes: row.admin_notes,
        createdAt: row.created_at
      };
    } catch (error) {
      console.error('Error in getStartupValidationStatus:', error);
      throw error;
    }
  }

  // Remove validation request for a startup (when they uncheck validation)
  async removeValidationRequest(startupId: number): Promise<void> {
    try {
      console.log('Removing validation request for startup:', startupId);
      
      const { error } = await supabase
        .from('validation_requests')
        .delete()
        .eq('startup_id', startupId);

      if (error) {
        console.error('Error removing validation request:', error);
        throw error;
      }

      console.log('Validation request removed successfully');
    } catch (error) {
      console.error('Error in removeValidationRequest:', error);
      throw error;
    }
  }
}

export const validationService = new ValidationService();
