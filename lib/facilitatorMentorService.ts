import { supabase } from './supabase';

export interface FacilitatorMentor {
  mentor_user_id: string;
  mentor_name: string;
  mentor_type?: string;
  location?: string;
  email?: string;
  expertise_areas?: string[];
  sectors?: string[];
  logo_url?: string;
  facilitator_code: string;
}

export interface FacilitatorMentorAssignment {
  id: number;
  facilitator_code: string;
  mentor_user_id: string;
  startup_id: number;
  status: 'active' | 'completed' | 'removed';
  notes?: string;
  assigned_at: string;
  completed_at?: string;
  mentor_name?: string;
  mentor_type?: string;
  mentor_email?: string;
  startup_name?: string;
  startup_sector?: string;
}

export interface MentorMeetingRecord {
  id: number;
  assignment_id: number;
  facilitator_code: string;
  mentor_user_id: string;
  startup_id: number;
  title: string;
  meeting_date: string;
  meeting_type: string;
  duration_minutes?: number;
  notes?: string;
  outcomes?: string;
  next_steps?: string;
  created_at: string;
  mentor_name?: string;
  startup_name?: string;
}

export interface MentorFacilitatorAssociation {
  id: number;
  mentor_user_id: string;
  facilitator_code: string;
  status: 'pending' | 'approved' | 'active' | 'inactive' | 'rejected';
  is_active: boolean;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  mentor_name?: string;
  mentor_type?: string;
  mentor_email?: string;
}

class FacilitatorMentorService {
  // Get all mentors who have associated themselves with this facilitator code
  async getMentorsForFacilitator(facilitatorCode: string): Promise<FacilitatorMentor[]> {
    try {
      const { data, error } = await supabase
        .from('mentor_profiles')
        .select('user_id, mentor_name, mentor_type, location, email, expertise_areas, sectors, logo_url, facilitator_code')
        .eq('facilitator_code', facilitatorCode);

      if (error) {
        console.warn('Error fetching mentors for facilitator:', error);
        return [];
      }

      return (data || []).map(m => ({
        mentor_user_id: m.user_id,
        mentor_name: m.mentor_name || 'Unknown Mentor',
        mentor_type: m.mentor_type,
        location: m.location,
        email: m.email,
        expertise_areas: m.expertise_areas || [],
        sectors: m.sectors || [],
        logo_url: m.logo_url,
        facilitator_code: m.facilitator_code,
      }));
    } catch (err) {
      console.error('Error in getMentorsForFacilitator:', err);
      return [];
    }
  }

  // Get all mentor-startup assignments for this facilitator
  async getAssignmentsForFacilitator(facilitatorCode: string): Promise<FacilitatorMentorAssignment[]> {
    try {
      const { data, error } = await supabase
        .from('facilitator_mentor_assignments')
        .select(`
          *,
          startups (id, name, sector)
        `)
        .eq('facilitator_code', facilitatorCode)
        .order('assigned_at', { ascending: false });

      if (error) {
        console.warn('Error fetching assignments:', error);
        return [];
      }

      const assignments = data || [];

      // Enrich with mentor names
      const enriched = await Promise.all(
        assignments.map(async (a) => {
          let mentorName = 'Unknown Mentor';
          let mentorType = '';
          let mentorEmail = '';
          try {
            const { data: mp } = await supabase
              .from('mentor_profiles')
              .select('mentor_name, mentor_type, email')
              .eq('user_id', a.mentor_user_id)
              .maybeSingle();
            if (mp) {
              mentorName = mp.mentor_name || mentorName;
              mentorType = mp.mentor_type || '';
              mentorEmail = mp.email || '';
            }
          } catch {}

          return {
            id: a.id,
            facilitator_code: a.facilitator_code,
            mentor_user_id: a.mentor_user_id,
            startup_id: a.startup_id,
            status: a.status,
            notes: a.notes,
            assigned_at: a.assigned_at,
            completed_at: a.completed_at,
            mentor_name: mentorName,
            mentor_type: mentorType,
            mentor_email: mentorEmail,
            startup_name: a.startups?.name || 'Unknown Startup',
            startup_sector: a.startups?.sector || '',
          } as FacilitatorMentorAssignment;
        })
      );

      return enriched;
    } catch (err) {
      console.error('Error in getAssignmentsForFacilitator:', err);
      return [];
    }
  }

  // Assign a mentor to a startup
  async assignMentorToStartup(
    facilitatorCode: string,
    mentorUserId: string,
    startupId: number,
    notes?: string
  ): Promise<{ success: boolean; id?: number; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('facilitator_mentor_assignments')
        .insert({
          facilitator_code: facilitatorCode,
          mentor_user_id: mentorUserId,
          startup_id: startupId,
          notes: notes || null,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'This mentor is already assigned to this startup.' };
        }
        console.error('Error assigning mentor:', error);
        return { success: false, error: error.message };
      }

      return { success: true, id: data.id };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unknown error' };
    }
  }

  // Update assignment status / notes
  async updateAssignment(
    id: number,
    updates: { status?: 'active' | 'completed' | 'removed'; notes?: string }
  ): Promise<boolean> {
    try {
      const updateData: any = { ...updates };
      if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('facilitator_mentor_assignments')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error updating assignment:', error);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  // Remove (soft-delete) an assignment
  async removeAssignment(id: number): Promise<boolean> {
    return this.updateAssignment(id, { status: 'removed' });
  }

  // Get meeting records for an assignment
  async getMeetingRecords(assignmentId: number): Promise<MentorMeetingRecord[]> {
    try {
      const { data, error } = await supabase
        .from('mentor_meeting_records')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('meeting_date', { ascending: false });

      if (error) {
        console.warn('Error fetching meeting records:', error);
        return [];
      }
      return data || [];
    } catch {
      return [];
    }
  }

  // Get ALL meeting records for a facilitator (across all assignments)
  async getAllMeetingRecords(facilitatorCode: string): Promise<MentorMeetingRecord[]> {
    try {
      const { data, error } = await supabase
        .from('mentor_meeting_records')
        .select(`
          *,
          startups (id, name)
        `)
        .eq('facilitator_code', facilitatorCode)
        .order('meeting_date', { ascending: false });

      if (error) {
        console.warn('Error fetching all meeting records:', error);
        return [];
      }

      const records = data || [];

      // Enrich with mentor names
      const enriched = await Promise.all(
        records.map(async (r) => {
          let mentorName = 'Unknown Mentor';
          try {
            const { data: mp } = await supabase
              .from('mentor_profiles')
              .select('mentor_name')
              .eq('user_id', r.mentor_user_id)
              .maybeSingle();
            if (mp?.mentor_name) mentorName = mp.mentor_name;
          } catch {}

          return {
            ...r,
            startup_name: r.startups?.name || 'Unknown Startup',
            mentor_name: mentorName,
          } as MentorMeetingRecord;
        })
      );

      return enriched;
    } catch {
      return [];
    }
  }

  // Add a meeting record
  async addMeetingRecord(record: {
    assignment_id: number;
    facilitator_code: string;
    mentor_user_id: string;
    startup_id: number;
    title: string;
    meeting_date: string;
    meeting_type: string;
    duration_minutes?: number;
    notes?: string;
    outcomes?: string;
    next_steps?: string;
  }): Promise<{ success: boolean; id?: number; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('mentor_meeting_records')
        .insert(record)
        .select()
        .single();

      if (error) {
        console.error('Error adding meeting record:', error);
        return { success: false, error: error.message };
      }

      return { success: true, id: data.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Update a meeting record
  async updateMeetingRecord(
    id: number,
    updates: Partial<{
      title: string;
      meeting_date: string;
      meeting_type: string;
      duration_minutes: number;
      notes: string;
      outcomes: string;
      next_steps: string;
    }>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mentor_meeting_records')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating meeting record:', error);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  // Delete a meeting record
  async deleteMeetingRecord(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mentor_meeting_records')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting meeting record:', error);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  // Add facilitator code association for mentor
  async addMentorFacilitatorCode(
    mentorUserId: string,
    facilitatorCode: string
  ): Promise<{ success: boolean; id?: number; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('mentor_facilitator_associations')
        .insert({
          mentor_user_id: mentorUserId,
          facilitator_code: facilitatorCode,
          status: 'pending',
          is_active: false,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'This code is already associated with your profile.' };
        }
        console.error('Error adding facilitator code:', error);
        return { success: false, error: error.message };
      }

      return { success: true, id: data.id };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unknown error' };
    }
  }

  // Get all associations for a mentor
  async getMentorAssociations(mentorUserId: string): Promise<MentorFacilitatorAssociation[]> {
    try {
      const { data, error } = await supabase
        .from('mentor_facilitator_associations')
        .select('*')
        .eq('mentor_user_id', mentorUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching mentor associations:', error);
        return [];
      }

      return data || [];
    } catch {
      return [];
    }
  }

  // Get pending/approved associations for a facilitator
  async getAssociationsForFacilitator(
    facilitatorCode: string,
    status?: string
  ): Promise<MentorFacilitatorAssociation[]> {
    try {
      let query = supabase
        .from('mentor_facilitator_associations')
        .select('*')
        .eq('facilitator_code', facilitatorCode);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching associations for facilitator:', error);
        return [];
      }

      const associations = data || [];

      // Enrich with mentor details
      const enriched = await Promise.all(
        associations.map(async (a) => {
          let mentorName = 'Unknown Mentor';
          let mentorType = '';
          let mentorEmail = '';
          try {
            const { data: mp } = await supabase
              .from('mentor_profiles')
              .select('mentor_name, mentor_type, email')
              .eq('user_id', a.mentor_user_id)
              .maybeSingle();
            if (mp) {
              mentorName = mp.mentor_name || mentorName;
              mentorType = mp.mentor_type || '';
              mentorEmail = mp.email || '';
            }
          } catch {}

          return {
            ...a,
            mentor_name: mentorName,
            mentor_type: mentorType,
            mentor_email: mentorEmail,
          } as MentorFacilitatorAssociation;
        })
      );

      return enriched;
    } catch {
      return [];
    }
  }

  // Approve a mentor association
  async approveMentorAssociation(
    associationId: number,
    approvedBy: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mentor_facilitator_associations')
        .update({
          status: 'approved',
          is_active: true,
          approved_at: new Date().toISOString(),
          approved_by: approvedBy,
        })
        .eq('id', associationId);

      if (error) {
        console.error('Error approving association:', error);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  // Toggle mentor active/inactive status
  async toggleMentorStatus(
    associationId: number,
    isActive: boolean
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mentor_facilitator_associations')
        .update({
          is_active: isActive,
          status: isActive ? 'active' : 'inactive',
        })
        .eq('id', associationId);

      if (error) {
        console.error('Error toggling mentor status:', error);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  // Reject a mentor association
  async rejectMentorAssociation(associationId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mentor_facilitator_associations')
        .update({ status: 'rejected' })
        .eq('id', associationId);

      if (error) {
        console.error('Error rejecting association:', error);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  // Remove a mentor association
  async removeMentorAssociation(associationId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mentor_facilitator_associations')
        .delete()
        .eq('id', associationId);

      if (error) {
        console.error('Error removing association:', error);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
}

export const facilitatorMentorService = new FacilitatorMentorService();
