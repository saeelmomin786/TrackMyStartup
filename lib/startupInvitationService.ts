import { supabase } from './supabase';

export interface StartupInvitation {
  id: string;
  facilitatorId: string;
  startupName: string;
  contactPerson: string;
  email: string;
  phone: string;
  facilitatorCode: string;
  status: 'pending' | 'sent' | 'accepted' | 'declined';
  invitationSentAt?: string;
  responseReceivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

class StartupInvitationService {
  // Add a new startup invitation
  async addStartupInvitation(
    facilitatorId: string,
    startupData: {
      name: string;
      contactPerson: string;
      email: string;
      phone: string;
    },
    facilitatorCode: string
  ): Promise<StartupInvitation | null> {
    try {
      const { data, error } = await supabase
        .from('startup_invitations')
        .insert({
          facilitator_id: facilitatorId,
          startup_name: startupData.name,
          contact_person: startupData.contactPerson,
          email: startupData.email,
          phone: startupData.phone,
          facilitator_code: facilitatorCode,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error adding startup invitation:', error);
        throw error;
      }

      return {
        id: data.id,
        facilitatorId: data.facilitator_id,
        startupName: data.startup_name,
        contactPerson: data.contact_person,
        email: data.email,
        phone: data.phone,
        facilitatorCode: data.facilitator_code,
        status: data.status,
        invitationSentAt: data.invitation_sent_at,
        responseReceivedAt: data.response_received_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error in addStartupInvitation:', error);
      return null;
    }
  }

  // Get all invitations for a facilitator
  async getFacilitatorInvitations(facilitatorId: string): Promise<StartupInvitation[]> {
    try {
      const { data, error } = await supabase
        .from('startup_invitations')
        .select('*')
        .eq('facilitator_id', facilitatorId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error getting facilitator invitations:', error);
        throw error;
      }

      return (data || []).map(invitation => ({
        id: invitation.id,
        facilitatorId: invitation.facilitator_id,
        startupName: invitation.startup_name,
        contactPerson: invitation.contact_person,
        email: invitation.email,
        phone: invitation.phone,
        facilitatorCode: invitation.facilitator_code,
        status: invitation.status,
        invitationSentAt: invitation.invitation_sent_at,
        responseReceivedAt: invitation.response_received_at,
        createdAt: invitation.created_at,
        updatedAt: invitation.updated_at
      }));
    } catch (error) {
      console.error('Error in getFacilitatorInvitations:', error);
      return [];
    }
  }

  // Update invitation details
  async updateInvitation(
    invitationId: string,
    updateData: {
      startupName?: string;
      contactPerson?: string;
      email?: string;
      phone?: string;
    }
  ): Promise<StartupInvitation | null> {
    try {
      const { data, error } = await supabase
        .from('startup_invitations')
        .update({
          startup_name: updateData.startupName,
          contact_person: updateData.contactPerson,
          email: updateData.email,
          phone: updateData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating invitation:', error);
        throw error;
      }

      return {
        id: data.id,
        facilitatorId: data.facilitator_id,
        startupName: data.startup_name,
        contactPerson: data.contact_person,
        email: data.email,
        phone: data.phone,
        facilitatorCode: data.facilitator_code,
        status: data.status,
        invitationSentAt: data.invitation_sent_at,
        responseReceivedAt: data.response_received_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error in updateInvitation:', error);
      return null;
    }
  }

  // Update invitation status
  async updateInvitationStatus(
    invitationId: string,
    status: 'pending' | 'sent' | 'accepted' | 'declined'
  ): Promise<boolean> {
    try {
      const updateData: any = { status };
      
      if (status === 'sent') {
        updateData.invitation_sent_at = new Date().toISOString();
      } else if (status === 'accepted' || status === 'declined') {
        updateData.response_received_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('startup_invitations')
        .update(updateData)
        .eq('id', invitationId);

      if (error) {
        console.error('❌ Error updating invitation status:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in updateInvitationStatus:', error);
      return false;
    }
  }

  // Delete an invitation
  async deleteInvitation(invitationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('startup_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) {
        console.error('❌ Error deleting invitation:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteInvitation:', error);
      return false;
    }
  }
}

export const startupInvitationService = new StartupInvitationService();
