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
  session_id?: number | null;
  facilitator_code: string;
  mentor_user_id: string;
  startup_id: number;
  title: string;
  meeting_date: string;
  meeting_time?: string | null;
  meeting_type: string;
  duration_minutes?: number;
  notes?: string;
  outcomes?: string;
  next_steps?: string;
  transcript?: string;
  session_status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
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
      console.log('🔍 [Service] Querying assignments for facilitatorCode:', facilitatorCode);
      
      // First, get raw assignments without foreign key join (relationships may not be cached)
      const { data, error } = await supabase
        .from('facilitator_mentor_assignments')
        .select('*')
        .eq('facilitator_code', facilitatorCode)
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('❌ [Service] Query error:', error);
        return [];
      }

      const assignments = data || [];
      console.log('📋 Raw assignments from DB:', { 
        facilitatorCode, 
        count: assignments.length, 
        data: assignments 
      });

      if (assignments.length === 0) {
        console.warn('⚠️ [Service] No assignments found for facilitatorCode:', facilitatorCode);
        return [];
      }

      // Enrich with mentor and startup details
      const enriched = await Promise.all(
        assignments.map(async (a) => {
          let mentorName = 'Unknown Mentor';
          let mentorType = '';
          let mentorEmail = '';
          let startupName = 'Unknown Startup';
          let startupSector = '';

          try {
            // Fetch mentor profile
            const { data: mp, error: mpError } = await supabase
              .from('mentor_profiles')
              .select('mentor_name, mentor_type, email')
              .eq('user_id', a.mentor_user_id)
              .maybeSingle();
            
            if (mpError) {
              console.warn('⚠️ Error fetching mentor profile:', mpError);
            } else if (mp) {
              mentorName = mp.mentor_name || mentorName;
              mentorType = mp.mentor_type || '';
              mentorEmail = mp.email || '';
            }

            // Fetch startup details
            const { data: startup, error: startupError } = await supabase
              .from('startups')
              .select('name, sector')
              .eq('id', a.startup_id)
              .maybeSingle();
            
            if (startupError) {
              console.warn('⚠️ Error fetching startup:', startupError);
            } else if (startup) {
              startupName = startup.name || startupName;
              startupSector = startup.sector || '';
            }
          } catch (err) {
            console.warn('Error enriching assignment:', err);
          }

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
            startup_name: startupName,
            startup_sector: startupSector,
          } as FacilitatorMentorAssignment;
        })
      );

      console.log('✅ Enriched assignments:', { count: enriched.length, data: enriched });
      return enriched;
    } catch (err) {
      console.error('❌ Error in getAssignmentsForFacilitator:', err);
      return [];
    }
  }

  // Diagnostic method: Check what assignments exist in the database
  async debugCheckAllAssignments(): Promise<void> {
    try {
      console.log('🔍 [Debug] Checking all assignments in database...');
      const { data, error } = await supabase
        .from('facilitator_mentor_assignments')
        .select('*')
        .limit(50);

      if (error) {
        console.error('❌ [Debug] Error querying assignments:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ [Debug] No assignments found in entire table');
        return;
      }

      console.log('📊 [Debug] All assignments in table:', {
        total: data.length,
        facilitatorCodes: [...new Set(data.map(a => a.facilitator_code))],
        startupIds: [...new Set(data.map(a => a.startup_id))],
        sample: data.slice(0, 3)
      });
    } catch (err) {
      console.error('❌ [Debug] Error in debugCheckAllAssignments:', err);
    }
  }

  // Diagnostic method: Check if startup has ANY assignments
  async debugCheckStartupAssignments(startupId: number): Promise<void> {
    try {
      console.log(`🔍 [Debug] Checking all assignments for startup ${startupId}...`);
      const { data, error } = await supabase
        .from('facilitator_mentor_assignments')
        .select('*')
        .eq('startup_id', startupId);

      if (error) {
        console.error('❌ [Debug] Error querying:', error);
        return;
      }

      console.log(`📊 [Debug] Assignments for startup ${startupId}:`, {
        count: data?.length || 0,
        data: data || []
      });
    } catch (err) {
      console.error('❌ [Debug] Error:', err);
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
      console.log('🔵 [Service] Attempting to assign mentor:', {
        facilitatorCode,
        mentorUserId,
        startupId,
        notes
      });

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
        console.error('❌ [Service] Assignment error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        if (error.code === '23505') {
          return { success: false, error: 'This mentor is already assigned to this startup.' };
        }
        return { success: false, error: error.message };
      }

      console.log('✅ [Service] Assignment created successfully:', {
        id: data.id,
        facilitatorCode,
        mentorUserId,
        startupId
      });
      return { success: true, id: data.id };
    } catch (err: any) {
      console.error('❌ [Service] Exception in assignMentorToStartup:', err);
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
        .order('meeting_date', { ascending: false })
        .order('meeting_time', { ascending: false, nullsLast: true });

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
    session_id?: number;
    facilitator_code: string;
    mentor_user_id: string;
    startup_id: number;
    title: string;
    meeting_date: string;
    meeting_time?: string;
    meeting_type: string;
    duration_minutes?: number;
    notes?: string;
    outcomes?: string;
    next_steps?: string;
    transcript?: string;
    session_status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
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
      meeting_time: string;
      meeting_type: string;
      duration_minutes: number;
      notes: string;
      outcomes: string;
      next_steps: string;
      transcript: string;
      session_status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
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

  // Auto-record meeting when startup completes a session with an associated mentor
  async autoRecordMeetingForStartupSession(
    mentorUserId: string,
    startupId: number,
    sessionDate: string,
    sessionTime: string,
    sessionId?: number,
    status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show' = 'scheduled',
    transcript?: string
  ): Promise<void> {
    try {
      // Get mentor's associations (incubation centers)
      const associations = await this.getMentorAssociations(mentorUserId);

      // Filter for approved associations
      const approvedAssociations = associations.filter(a => a.status === 'approved');

      if (approvedAssociations.length === 0) {
        return; // No associated incubation centers, nothing to record
      }

      // Get mentor name
      const { data: mentorProfile } = await supabase
        .from('mentor_profiles')
        .select('mentor_name')
        .eq('user_id', mentorUserId)
        .single();

      const mentorName = mentorProfile?.mentor_name || 'Unknown Mentor';

      // Get startup name
      const { data: startupData } = await supabase
        .from('startups')
        .select('name')
        .eq('id', startupId)
        .single();

      const startupName = startupData?.name || 'Unknown Startup';

      const meetingTime = sessionTime?.slice(0, 5) || null;

      // Create or update meeting records for each associated facilitator
      for (const association of approvedAssociations) {
        const payload = {
          assignment_id: 0,
          session_id: sessionId || undefined,
          facilitator_code: association.facilitator_code,
          mentor_user_id: mentorUserId,
          startup_id: startupId,
          title: `Meeting with ${startupName}`,
          meeting_date: sessionDate,
          meeting_time: meetingTime || undefined,
          meeting_type: 'Session',
          duration_minutes: 60,
          notes: `Meeting scheduled by startup: ${startupName} with Mentor: ${mentorName}`,
          session_status: status,
          transcript: transcript,
        };

        const { data: existingRecord } = await supabase
          .from('mentor_meeting_records')
          .select('id')
          .eq('facilitator_code', association.facilitator_code)
          .eq('mentor_user_id', mentorUserId)
          .eq('startup_id', startupId)
          .eq('meeting_date', sessionDate)
          .maybeSingle();

        if (existingRecord?.id) {
          await this.updateMeetingRecord(existingRecord.id, {
            meeting_time: meetingTime || undefined,
            notes: payload.notes,
            transcript: transcript || undefined,
            session_status: status,
          } as any);
        } else {
          await this.addMeetingRecord(payload as any);
        }
      }
    } catch (error) {
      console.error('Error auto-recording meeting:', error);
      // Don't throw - silently fail to not break the session completion flow
    }
  }

  async updateMeetingTranscriptForSession(
    sessionId: number,
    transcript: string,
    status: 'completed' | 'scheduled' | 'cancelled' | 'rescheduled' | 'no_show' = 'completed'
  ): Promise<void> {
    try {
      const { data: session } = await supabase
        .from('mentor_startup_sessions')
        .select('id, mentor_id, startup_id, assignment_id, session_date, session_time, status')
        .eq('id', sessionId)
        .maybeSingle();

      if (!session) return;

      const updatePayload = {
        transcript,
        session_status: status,
        meeting_time: session.session_time?.slice(0, 5),
      } as any;

      const { data: existingRecord } = await supabase
        .from('mentor_meeting_records')
        .select('id')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (existingRecord?.id) {
        await this.updateMeetingRecord(existingRecord.id, updatePayload);
        return;
      }

      if (!session.assignment_id) return;

      const { data: assignment } = await supabase
        .from('facilitator_mentor_assignments')
        .select('facilitator_code')
        .eq('id', session.assignment_id)
        .maybeSingle();

      if (!assignment?.facilitator_code) return;

      await this.addMeetingRecord({
        assignment_id: session.assignment_id,
        session_id: sessionId,
        facilitator_code: assignment.facilitator_code,
        mentor_user_id: session.mentor_id,
        startup_id: session.startup_id,
        title: 'Completed mentoring session',
        meeting_date: session.session_date,
        meeting_time: session.session_time?.slice(0, 5),
        meeting_type: 'Review',
        duration_minutes: 60,
        notes: 'Auto-recorded from startup session completion.',
        transcript,
        session_status: status,
      });
    } catch (error) {
      console.error('Error updating meeting transcript for session:', error);
    }
  }

  async upsertMeetingRecordForSession(
    sessionId: number,
    transcript?: string,
    status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show' = 'scheduled'
  ): Promise<void> {
    try {
      const { data: session } = await supabase
        .from('mentor_startup_sessions')
        .select('id, mentor_id, startup_id, assignment_id, session_date, session_time, status, duration_minutes, google_meet_link')
        .eq('id', sessionId)
        .maybeSingle();

      if (!session || !session.assignment_id) {
        return;
      }

      const { data: assignment } = await supabase
        .from('facilitator_mentor_assignments')
        .select('facilitator_code')
        .eq('id', session.assignment_id)
        .maybeSingle();

      if (!assignment?.facilitator_code) {
        return;
      }

      let startupName = `startup ${session.startup_id}`;
      try {
        const { data: startup } = await supabase
          .from('startups')
          .select('name')
          .eq('id', session.startup_id)
          .maybeSingle();
        if (startup?.name) startupName = startup.name;
      } catch {}

      const meetingTime = session.session_time?.slice(0, 5) || null;
      const baseRecord = {
        assignment_id: session.assignment_id,
        session_id: session.id,
        facilitator_code: assignment.facilitator_code,
        mentor_user_id: session.mentor_id,
        startup_id: session.startup_id,
        title: `Mentor Session - ${startupName}`,
        meeting_date: session.session_date,
        meeting_time: meetingTime || undefined,
        meeting_type: 'Session',
        duration_minutes: session.duration_minutes || 60,
        notes: session.google_meet_link ? `Google Meet: ${session.google_meet_link}` : undefined,
        transcript,
        session_status: status,
      } as any;

      const { data: existingRecord } = await supabase
        .from('mentor_meeting_records')
        .select('id')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (existingRecord?.id) {
        await this.updateMeetingRecord(existingRecord.id, {
          meeting_time: meetingTime || undefined,
          notes: baseRecord.notes,
          transcript: transcript || undefined,
          session_status: status,
          duration_minutes: baseRecord.duration_minutes,
        } as any);
        return;
      }

      await this.addMeetingRecord(baseRecord);
    } catch (error) {
      console.error('Error upserting meeting record for session:', error);
    }
  }
}

export const facilitatorMentorService = new FacilitatorMentorService();
