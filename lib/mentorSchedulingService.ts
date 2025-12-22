import { supabase } from './supabase';

export interface AvailabilitySlot {
  id?: number;
  mentor_id: string;
  day_of_week?: number | null; // 0=Sunday, 6=Saturday, null for specific dates
  specific_date?: string | null; // For one-time slots
  start_time: string; // TIME format
  end_time: string; // TIME format
  timezone?: string;
  is_recurring?: boolean;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active?: boolean;
}

export interface ScheduledSession {
  id?: number;
  mentor_id: string;
  startup_id: number;
  assignment_id?: number | null;
  session_date: string; // DATE format
  session_time: string; // TIME format
  duration_minutes: number;
  timezone?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
  google_calendar_event_id?: string | null;
  google_meet_link?: string | null;
  google_calendar_synced?: boolean;
  notes?: string | null;
  agenda?: string | null;
  feedback?: string | null;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
  startup_name?: string; // Added for convenience when fetching with startup info
  mentor_name?: string; // Added for convenience when fetching with mentor info
}

class MentorSchedulingService {
  // Get mentor's availability slots
  async getAvailabilitySlots(mentorId: string): Promise<AvailabilitySlot[]> {
    try {
      // Cleanup expired slots before fetching
      await this.cleanupExpiredAvailabilitySlots();

      // CRITICAL FIX: mentor_availability_slots.mentor_id references auth.users(id), not profile_id
      // Get auth_user_id to ensure RLS policy allows the query
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const authUserId = authUser?.id;
      
      if (!authUserId) {
        console.error('❌ getAvailabilitySlots: No authenticated user found');
        return [];
      }
      
      // Always use auth.uid() for RLS policies, regardless of what mentorId was passed
      // This ensures we're querying with the correct user context
      
      const { data, error } = await supabase
        .from('mentor_availability_slots')
        .select('*')
        .eq('mentor_id', authUserId)  // Use auth_user_id for RLS policy
        .order('day_of_week', { ascending: true, nullsLast: true })
        .order('specific_date', { ascending: true, nullsLast: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching availability slots:', error);
        throw error;
      }

      // Filter out expired slots in JavaScript (for one-time slots)
      const now = new Date();
      const filteredSlots = (data || []).filter(slot => {
        if (!slot.is_recurring && slot.specific_date) {
          const slotDateTime = new Date(`${slot.specific_date}T${slot.start_time}`);
          return slotDateTime >= now; // Keep only future slots
        }
        // For recurring slots, check valid_until if set
        if (slot.is_recurring && slot.valid_until) {
          const validUntil = new Date(slot.valid_until);
          return validUntil >= now;
        }
        return true; // Keep recurring slots without expiry
      });

      return filteredSlots;
    } catch (error) {
      console.error('Error in getAvailabilitySlots:', error);
      return [];
    }
  }

  // Create availability slot
  async createAvailabilitySlot(slot: AvailabilitySlot): Promise<AvailabilitySlot> {
    try {
      // CRITICAL FIX: mentor_availability_slots.mentor_id references auth.users(id), not profile_id
      // Get auth_user_id to ensure RLS policy allows the insert
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const authUserId = authUser?.id;
      
      if (!authUserId) {
        throw new Error('Not authenticated');
      }
      
      // Use auth_user_id instead of the provided mentor_id (which might be profile_id)
      const slotWithAuthId = {
        ...slot,
        mentor_id: authUserId  // Use auth_user_id for RLS policy
      };
      
      if (slot.mentor_id !== authUserId) {
        console.warn('⚠️ createAvailabilitySlot: mentorId mismatch - using auth.uid() instead:', {
          providedMentorId: slot.mentor_id,
          authUserId: authUserId
        });
      }
      
      const { data, error } = await supabase
        .from('mentor_availability_slots')
        .insert(slotWithAuthId)
        .select()
        .single();

      if (error) {
        console.error('Error creating availability slot:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createAvailabilitySlot:', error);
      throw error;
    }
  }

  // Update availability slot
  async updateAvailabilitySlot(slotId: number, updates: Partial<AvailabilitySlot>): Promise<AvailabilitySlot> {
    try {
      // CRITICAL FIX: Ensure mentor_id in updates uses auth_user_id if provided
      if (updates.mentor_id) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const authUserId = authUser?.id;
        if (authUserId && updates.mentor_id !== authUserId) {
          console.warn('⚠️ updateAvailabilitySlot: mentorId mismatch - using auth.uid() instead');
          updates.mentor_id = authUserId;
        }
      }
      
      const { data, error } = await supabase
        .from('mentor_availability_slots')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', slotId)
        .select()
        .single();

      if (error) {
        console.error('Error updating availability slot:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateAvailabilitySlot:', error);
      throw error;
    }
  }

  // Delete availability slot
  async deleteAvailabilitySlot(slotId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mentor_availability_slots')
        .delete()
        .eq('id', slotId);

      if (error) {
        console.error('Error deleting availability slot:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteAvailabilitySlot:', error);
      return false;
    }
  }

  // Get available slots for a specific date range (for startup to view)
  async getAvailableSlotsForDateRange(
    mentorId: string,
    startDate: string,
    endDate: string
  ): Promise<Array<{ date: string; time: string; slotId: number }>> {
    try {
      // IMPORTANT: mentorId parameter is the mentor's auth user ID
      // We should use this directly, not the current user's auth ID
      // This allows startups to view mentor slots
      console.log('🔍 getAvailableSlotsForDateRange - mentorId:', mentorId, 'startDate:', startDate, 'endDate:', endDate);
      
      // Cleanup old sessions before fetching slots
      await this.cleanupPastScheduledSessions();
      // Get recurring slots
      // For recurring slots, we need to check if they're valid for the date range
      // A slot is valid if:
      // 1. valid_from is null OR valid_from <= endDate
      // 2. valid_until is null OR valid_until >= startDate
      const { data: recurringSlots, error: recurringError } = await supabase
        .from('mentor_availability_slots')
        .select('*')
        .eq('mentor_id', mentorId)  // Use the mentor's ID directly
        .eq('is_active', true)
        .eq('is_recurring', true);

      if (recurringError) {
        console.error('Error fetching recurring slots:', recurringError);
      }
      
      console.log('📅 Fetched recurring slots:', (recurringSlots || []).length, 'for mentor:', mentorId);

      // Filter recurring slots by date validity
      const validRecurringSlots = (recurringSlots || []).filter(slot => {
        const validFrom = slot.valid_from ? new Date(slot.valid_from) : null;
        const validUntil = slot.valid_until ? new Date(slot.valid_until) : null;
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Check if slot is valid for the date range
        if (validFrom && validFrom > end) return false; // Slot starts after our range
        if (validUntil && validUntil < start) return false; // Slot ends before our range
        
        return true;
      });

      // Get one-time slots for date range
      const { data: oneTimeSlots, error: oneTimeError } = await supabase
        .from('mentor_availability_slots')
        .select('*')
        .eq('mentor_id', mentorId)  // Use the mentor's ID directly
        .eq('is_active', true)
        .eq('is_recurring', false)
        .gte('specific_date', startDate)
        .lte('specific_date', endDate);

      if (oneTimeError) {
        console.error('Error fetching one-time slots:', oneTimeError);
      }
      
      console.log('📅 Fetched one-time slots:', (oneTimeSlots || []).length, 'for mentor:', mentorId);

      // Get booked sessions to filter out conflicts
      const { data: bookedSessions, error: sessionsError } = await supabase
        .from('mentor_startup_sessions')
        .select('session_date, session_time, duration_minutes')
        .eq('mentor_id', mentorId)  // Use the mentor's ID directly
        .eq('status', 'scheduled')
        .gte('session_date', startDate)
        .lte('session_date', endDate);

      if (sessionsError) {
        console.error('Error fetching booked sessions:', sessionsError);
      }

      // Generate available time slots
      const availableSlots: Array<{ date: string; time: string; slotId: number }> = [];
      const bookedTimes = new Set(
        (bookedSessions || []).map(s => `${s.session_date}T${s.session_time}`)
      );

      // Process recurring slots
      console.log('📅 Processing recurring slots:', validRecurringSlots.length);
      validRecurringSlots.forEach(slot => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Generate slots for each matching day of week
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          // Check if this day matches the slot's day of week
          if (slot.day_of_week === d.getDay()) {
            const dateStr = d.toISOString().split('T')[0];
            const timeKey = `${dateStr}T${slot.start_time}`;
            
            // Only add if not already booked
            if (!bookedTimes.has(timeKey)) {
              availableSlots.push({
                date: dateStr,
                time: slot.start_time,
                slotId: slot.id
              });
            }
          }
        }
      });
      
      console.log('📅 Generated slots from recurring:', availableSlots.length);

      // Process one-time slots
      console.log('📅 Processing one-time slots:', (oneTimeSlots || []).length);
      (oneTimeSlots || []).forEach(slot => {
        if (slot.specific_date) {
          const timeKey = `${slot.specific_date}T${slot.start_time}`;
          if (!bookedTimes.has(timeKey)) {
            availableSlots.push({
              date: slot.specific_date,
              time: slot.start_time,
              slotId: slot.id
            });
          }
        }
      });
      
      console.log('📅 Total available slots after processing:', availableSlots.length);

      // Sort by date and time
      availableSlots.sort((a, b) => {
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        return a.time.localeCompare(b.time);
      });

      console.log('✅ Final available slots count:', availableSlots.length);
      console.log('📋 Slots:', availableSlots.slice(0, 5)); // Log first 5 for debugging

      return availableSlots;
    } catch (error) {
      console.error('Error in getAvailableSlotsForDateRange:', error);
      return [];
    }
  }

  // Book a session
  async bookSession(
    mentorId: string,
    startupId: number,
    assignmentId: number | null,
    sessionDate: string,
    sessionTime: string,
    durationMinutes: number = 60,
    timezone: string = 'UTC',
    googleMeetLink?: string
  ): Promise<ScheduledSession> {
    try {
      // IMPORTANT: mentorId is the mentor's auth user ID
      // The startup (current user) should be able to insert sessions where:
      // - mentor_id = mentorId (the mentor's ID)
      // - startup_id = startupId (the startup's ID)
      // RLS policy should allow startups to insert their own sessions
      console.log('🔍 bookSession - mentorId:', mentorId, 'startupId:', startupId, 'assignmentId:', assignmentId);
      
      const sessionData: any = {
        mentor_id: mentorId,  // Use the mentor's ID directly
        startup_id: startupId,
        assignment_id: assignmentId,
        session_date: sessionDate,
        session_time: sessionTime,
        duration_minutes: durationMinutes,
        timezone: timezone,
        status: 'scheduled',
        google_meet_link: googleMeetLink || null,
        google_calendar_synced: false
      };

      console.log('📝 Inserting session data:', sessionData);

      const { data, error } = await supabase
        .from('mentor_startup_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error booking session:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        
        // Check if it's a unique constraint violation (double-booking)
        if (error.code === '23505' || 
            error.message?.includes('unique_mentor_time_slot') ||
            error.message?.includes('duplicate key')) {
          throw new Error('This time slot has already been booked by another startup. Please select a different time.');
        }
        
        throw error;
      }

      console.log('✅ Session booked successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error in bookSession:', error);
      throw error;
    }
  }

  // Get sessions for mentor
  async getMentorSessions(mentorId: string, status?: string): Promise<ScheduledSession[]> {
    try {
      // CRITICAL FIX: mentor_startup_sessions.mentor_id references auth.users(id), not profile_id
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const authUserId = authUser?.id || mentorId;
      
      // Cleanup old sessions before fetching
      await this.cleanupOldSessions();
      await this.cleanupPastScheduledSessions();

      let query = supabase
        .from('mentor_startup_sessions')
        .select('*')
        .eq('mentor_id', authUserId)  // Use auth_user_id for RLS policy
        .order('session_date', { ascending: true })
        .order('session_time', { ascending: true });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching mentor sessions:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Fetch startup names separately to avoid RLS issues with nested queries
      const startupIds = [...new Set(data.map(s => s.startup_id))];
      
      if (startupIds.length === 0) {
        // No startup IDs, return sessions without startup names
        return data.map(session => ({
          ...session,
          startup_name: 'Unknown Startup'
        })) as ScheduledSession[];
      }

      const { data: startups, error: startupsError } = await supabase
        .from('startups')
        .select('id, name')
        .in('id', startupIds);

      // Create a map of startup_id to startup_name
      const startupNameMap = new Map<number, string>();
      if (startups && !startupsError) {
        startups.forEach((startup: any) => {
          // The startups table uses 'name' column, not 'startup_name'
          startupNameMap.set(startup.id, startup.name || 'Unknown Startup');
        });
      }

      // Enrich sessions with startup names
      const enrichedSessions = data.map(session => ({
        ...session,
        startup_name: startupNameMap.get(session.startup_id) || 'Unknown Startup'
      }));

      return enrichedSessions as ScheduledSession[];
    } catch (error) {
      console.error('Error in getMentorSessions:', error);
      return [];
    }
  }

  // Get sessions for startup
  async getStartupSessions(startupId: number, status?: string): Promise<ScheduledSession[]> {
    try {
      // Cleanup old sessions before fetching
      await this.cleanupOldSessions();
      await this.cleanupPastScheduledSessions();

      let query = supabase
        .from('mentor_startup_sessions')
        .select('*')
        .eq('startup_id', startupId)
        .order('session_date', { ascending: true })
        .order('session_time', { ascending: true });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching startup sessions:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Fetch mentor names separately to avoid RLS issues
      const mentorIds = [...new Set(data.map(s => s.mentor_id))];
      
      const mentorNameMap = new Map<string, string>();
      
      if (mentorIds.length > 0) {
        // Try mentor_profiles first
        const { data: mentorProfiles } = await supabase
          .from('mentor_profiles')
          .select('user_id, mentor_name')
          .in('user_id', mentorIds);
        
        if (mentorProfiles) {
          mentorProfiles.forEach((profile: any) => {
            mentorNameMap.set(profile.user_id, profile.mentor_name || 'Unknown Mentor');
          });
        }
        
        // Fill in missing names from user_profiles
        const missingIds = mentorIds.filter(id => !mentorNameMap.has(id));
        if (missingIds.length > 0) {
          const { data: userProfiles } = await supabase
            .from('user_profiles')
            .select('auth_user_id, name')
            .in('auth_user_id', missingIds);
          
          if (userProfiles) {
            userProfiles.forEach((profile: any) => {
              mentorNameMap.set(profile.auth_user_id, profile.name || 'Unknown Mentor');
            });
          }
        }
      }

      // Enrich sessions with mentor names
      return data.map(session => ({
        ...session,
        mentor_name: mentorNameMap.get(session.mentor_id) || 'Unknown Mentor'
      })) as ScheduledSession[];
    } catch (error) {
      console.error('Error in getStartupSessions:', error);
      return [];
    }
  }

  // Update session
  async updateSession(sessionId: number, updates: Partial<ScheduledSession>): Promise<ScheduledSession> {
    try {
      const { data, error } = await supabase
        .from('mentor_startup_sessions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating session:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateSession:', error);
      throw error;
    }
  }

  // Cancel session
  async cancelSession(sessionId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mentor_startup_sessions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error cancelling session:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in cancelSession:', error);
      return false;
    }
  }

  // Complete session
  async completeSession(sessionId: number, feedback?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mentor_startup_sessions')
        .update({
          status: 'completed',
          feedback: feedback || null,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error completing session:', error);
        return false;
      }

      // Auto-delete completed sessions older than 30 days to keep database clean
      await this.cleanupOldSessions();

      return true;
    } catch (error) {
      console.error('Error in completeSession:', error);
      return false;
    }
  }

  // Cleanup old completed sessions (older than 30 days)
  async cleanupOldSessions(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

      // Delete completed sessions older than 30 days
      const { error } = await supabase
        .from('mentor_startup_sessions')
        .delete()
        .eq('status', 'completed')
        .lt('session_date', cutoffDate);

      if (error) {
        console.error('Error cleaning up old sessions:', error);
      } else {
        console.log('Cleaned up old completed sessions');
      }
    } catch (error) {
      console.error('Error in cleanupOldSessions:', error);
    }
  }

  // Cleanup expired availability slots (past one-time slots and expired recurring slots)
  async cleanupExpiredAvailabilitySlots(): Promise<void> {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

      // Delete past one-time slots (specific_date + start_time < now)
      const { error: oneTimeError } = await supabase
        .from('mentor_availability_slots')
        .delete()
        .eq('is_recurring', false)
        .or(`specific_date.lt.${today},and(specific_date.eq.${today},start_time.lt.${currentTime})`);

      if (oneTimeError) {
        console.error('Error cleaning up expired one-time slots:', oneTimeError);
      } else {
        console.log('Cleaned up expired one-time slots');
      }

      // Deactivate recurring slots that have passed valid_until date
      const { error: recurringError } = await supabase
        .from('mentor_availability_slots')
        .update({ is_active: false })
        .eq('is_recurring', true)
        .not('valid_until', 'is', null)
        .lt('valid_until', today);

      if (recurringError) {
        console.error('Error deactivating expired recurring slots:', recurringError);
      } else {
        console.log('Deactivated expired recurring slots');
      }
    } catch (error) {
      console.error('Error in cleanupExpiredAvailabilitySlots:', error);
    }
  }

  // Auto-cleanup past scheduled sessions that were never completed (older than 7 days)
  async cleanupPastScheduledSessions(): Promise<void> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoffDate = sevenDaysAgo.toISOString().split('T')[0];

      // Delete past scheduled sessions that were never completed (older than 7 days)
      const { error } = await supabase
        .from('mentor_startup_sessions')
        .delete()
        .eq('status', 'scheduled')
        .lt('session_date', cutoffDate);

      if (error) {
        console.error('Error cleaning up past scheduled sessions:', error);
      } else {
        console.log('Cleaned up past scheduled sessions');
      }
    } catch (error) {
      console.error('Error in cleanupPastScheduledSessions:', error);
    }
  }
}

export const mentorSchedulingService = new MentorSchedulingService();

