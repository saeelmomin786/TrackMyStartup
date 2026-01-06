import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { mentorSchedulingService, AvailabilitySlot } from '../../lib/mentorSchedulingService';
import { googleCalendarService } from '../../lib/googleCalendarService';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, Video } from 'lucide-react';
import { formatDateWithWeekday, formatTimeAMPM } from '../../lib/dateTimeUtils';

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentorId: string;
  startupId: number;
  assignmentId: number | null;
  onSessionBooked: () => void;
}

const SchedulingModal: React.FC<SchedulingModalProps> = ({
  isOpen,
  onClose,
  mentorId,
  startupId,
  assignmentId,
  onSessionBooked
}) => {
  const [availableSlots, setAvailableSlots] = useState<Array<{ date: string; time: string; slotId: number; isBooked?: boolean; bookedByStartupId?: number }>>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);
  const [duration, setDuration] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    // Start from today so today's one-time slots (future times) are visible
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // 30 days ahead
    return date.toISOString().split('T')[0];
  });

  useEffect(() => {
    if (isOpen && mentorId) {
      loadAvailableSlots();
    }
  }, [isOpen, mentorId, startDate, endDate]);

  const loadAvailableSlots = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('🔍 Loading available slots:', { mentorId, startupId, assignmentId, startDate, endDate });
      const slots = await mentorSchedulingService.getAvailableSlotsForDateRange(
        mentorId,
        startDate,
        endDate,
        startupId,
        assignmentId
      );
      console.log('✅ Loaded slots:', slots.length, slots);
      setAvailableSlots(slots);
      
      if (slots.length === 0) {
        // Check if assignment is terminated to show appropriate message
        if (assignmentId) {
          try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser?.id) {
              const { data: assignment } = await supabase
                .from('mentor_startup_assignments')
                .select('status')
                .eq('id', assignmentId)
                .eq('mentor_id', mentorId)
                .maybeSingle();
              
              if (assignment && assignment.status !== 'active') {
                setError('This mentoring relationship has been terminated. You can no longer book sessions with this mentor.');
                return;
              }
            }
          } catch (err) {
            console.warn('Could not check assignment status:', err);
          }
        }
        console.warn('⚠️ No slots found. Check if mentor has created availability slots.');
      }
    } catch (err: any) {
      console.error('❌ Error loading slots:', err);
      setError(err.message || 'Failed to load available slots');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookSession = async () => {
    if (!selectedSlot) {
      setError('Please select a time slot');
      return;
    }

    // Check if selected slot is booked
    const selectedSlotData = availableSlots.find(
      s => s.date === selectedSlot.date && s.time === selectedSlot.time
    );
    
    if (selectedSlotData?.isBooked) {
      setError('This slot is already booked by another startup. Please select a different time.');
      setSelectedSlot(null);
      return;
    }

    setIsBooking(true);
    setError(null);

    try {
      // Get mentor and startup emails for calendar event
      // CRITICAL: mentorId might be profile_id, need to get auth_user_id first
      let mentorEmail: string | null = null;
      let startupEmail: string | null = null;
      
      // Get mentor email using database function (bypasses RLS safely)
      // This uses SECURITY DEFINER function to get email without changing RLS policies
      try {
        console.log('🔍 Fetching mentor email using database function for mentorId (auth_user_id):', mentorId);
        
        // Method 1: Use database function (bypasses RLS, safe and controlled)
        const { data: functionResult, error: functionError } = await supabase
          .rpc('get_mentor_email_for_calendar', { mentor_auth_user_id: mentorId });
        
        console.log('🔍 Database function result:', { 
          email: functionResult, 
          error: functionError?.message,
          errorCode: functionError?.code
        });
        
        if (functionResult && typeof functionResult === 'string') {
          mentorEmail = functionResult;
          console.log('✅ Found mentor email from database function:', mentorEmail);
        } else if (functionError) {
          console.warn('⚠️ Database function failed, trying direct query as fallback...');
          
          // Fallback: Try direct query (might fail due to RLS, but worth trying)
          const { data: mentorProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('email, auth_user_id, id, role')
            .eq('auth_user_id', mentorId)
            .eq('role', 'Mentor')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          console.log('🔍 Fallback direct query result:', { 
            email: mentorProfile?.email, 
            error: profileError?.message,
            errorCode: profileError?.code
          });
          
          if (mentorProfile?.email) {
            mentorEmail = mentorProfile.email;
            console.log('✅ Found mentor email from fallback query:', mentorEmail);
          } else {
            console.warn('⚠️ Mentor email not found. Database function and direct query both failed.');
            console.warn('⚠️ Make sure to run CREATE_GET_MENTOR_EMAIL_FUNCTION.sql in Supabase');
          }
        }
      } catch (err) {
        console.error('❌ Error fetching mentor email:', err);
      }

      // Get startup email
      const { data: startupData } = await supabase
        .from('startups')
        .select('user_id')
        .eq('id', startupId)
        .single();

      if (startupData?.user_id) {
        try {
          // Try as auth_user_id first
          const { data: startupUser } = await supabase
            .from('users')
            .select('email')
            .eq('id', startupData.user_id)
            .maybeSingle();
          
          if (startupUser?.email) {
            startupEmail = startupUser.email;
          } else {
            // Try as profile_id
            const { data: startupProfile } = await supabase
              .from('user_profiles')
              .select('auth_user_id, email')
              .eq('id', startupData.user_id)
              .maybeSingle();
            
            if (startupProfile?.auth_user_id) {
              const { data: startupAuthUser } = await supabase
                .from('users')
                .select('email')
                .eq('id', startupProfile.auth_user_id)
                .maybeSingle();
              startupEmail = startupAuthUser?.email || startupProfile?.email || null;
            } else if (startupProfile?.email) {
              startupEmail = startupProfile.email;
            }
          }
        } catch (err) {
          console.error('Error fetching startup email:', err);
        }
      }

      // Build attendees list - ensure both emails are included
      const attendees: Array<{ email: string }> = [];
      if (mentorEmail) {
        attendees.push({ email: mentorEmail });
        console.log('✅ Added mentor email to attendees:', mentorEmail);
      } else {
        console.warn('⚠️ Mentor email not found for mentorId:', mentorId);
      }
      if (startupEmail) {
        attendees.push({ email: startupEmail });
        console.log('✅ Added startup email to attendees:', startupEmail);
      } else {
        console.warn('⚠️ Startup email not found for startupId:', startupId);
      }
      
      console.log('📧 Total attendees:', attendees.length, attendees);

      // Create calendar event FIRST to get a valid Meet link
      // This ensures the Meet link is tied to a permanent event, not a temporary one
      let meetLink: string | undefined;
      let calendarEventId: string | undefined;
      
      if (attendees.length > 0) {
        try {
          const startDateTime = new Date(`${selectedSlot.date}T${selectedSlot.time}`);
          const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

          const calendarResult = await googleCalendarService.createCalendarEventWithServiceAccount(
            {
              summary: 'Mentoring Session',
              description: 'Mentoring session scheduled through Track My Startup',
              start: {
                dateTime: startDateTime.toISOString(),
                timeZone: 'UTC'
              },
              end: {
                dateTime: endDateTime.toISOString(),
                timeZone: 'UTC'
              }
            },
            attendees
            // Don't pass meetLink - let calendar generate it
          );

          // Use the Meet link from the actual calendar event (this is the valid one)
          meetLink = calendarResult.meetLink;
          calendarEventId = calendarResult.eventId;
          
          // Validate Meet link format
          if (meetLink && !googleCalendarService.isValidMeetLink(meetLink)) {
            console.warn('⚠️ Calendar event Meet link has invalid format:', meetLink);
            // Still use it, but log warning
          }
          
          console.log('✅ Calendar event created with valid Meet link:', meetLink);
        } catch (err) {
          console.warn('Failed to create Google Calendar event, will try fallback:', err);
          // Fallback: Try to generate Meet link separately
          try {
            meetLink = await googleCalendarService.generateGoogleMeetLink();
          } catch (fallbackErr) {
            console.warn('Failed to generate Google Meet link, continuing without it:', fallbackErr);
          }
        }
      } else {
        // No attendees, try to generate Meet link anyway
        try {
          meetLink = await googleCalendarService.generateGoogleMeetLink();
        } catch (err) {
          console.warn('Failed to generate Google Meet link, continuing without it:', err);
        }
      }

      // Book the session with the valid Meet link from calendar event
      const session = await mentorSchedulingService.bookSession(
        mentorId,
        startupId,
        assignmentId,
        selectedSlot.date,
        selectedSlot.time,
        duration,
        'UTC',
        meetLink
      );

      // Update session with calendar event ID if we have it
      if (calendarEventId && session.id) {
        try {
          await mentorSchedulingService.updateSession(session.id, {
            google_calendar_event_id: calendarEventId,
            google_calendar_synced: true
          });
        } catch (err) {
          console.warn('Failed to update session with calendar event ID:', err);
        }
      }

      onSessionBooked();
      onClose();
    } catch (err: any) {
      // Check if it's a double-booking error
      if (err.message?.includes('already been booked') || 
          err.message?.includes('already booked')) {
        setError('This time slot is no longer available. Please select another time.');
        // Reload available slots to refresh the list
        loadAvailableSlots();
      } else {
        setError(err.message || 'Failed to book session. Please try again.');
      }
    } finally {
      setIsBooking(false);
    }
  };

  // Group slots by date
  const slotsByDate = availableSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, Array<{ date: string; time: string; slotId: number; isBooked?: boolean; bookedByStartupId?: number }>>);

  const sortedDates = Object.keys(slotsByDate).sort();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Session" size="lg">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-slate-500">Loading available slots...</div>
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 mb-2">No available slots at this time.</p>
          </div>
        ) : (
          <>
            <div className="max-h-96 overflow-y-auto space-y-4">
              {sortedDates.map((date) => (
                <div key={date} className="bg-white rounded-md p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <span className="font-semibold text-slate-900">
                      {formatDateWithWeekday(date)}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({slotsByDate[date].length} slots)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {slotsByDate[date].map((slot, index) => {
                      const isBooked = slot.isBooked === true;
                      const isSelected = selectedSlot?.date === slot.date && selectedSlot?.time === slot.time;
                      
                      return (
                        <button
                          key={index}
                          type="button"
                          disabled={isBooked}
                          onClick={() => {
                            if (!isBooked) {
                              setSelectedSlot({ date: slot.date, time: slot.time });
                            }
                          }}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                            isBooked
                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-60'
                              : isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                          title={isBooked ? 'This slot is already booked' : `Select ${formatTimeAMPM(slot.time)}`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>{formatTimeAMPM(slot.time)}</span>
                            {isBooked && (
                              <span className="text-xs font-normal">(Booked)</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {selectedSlot && (
              <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">{formatDateWithWeekday(selectedSlot.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700 mt-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatTimeAMPM(selectedSlot.time)} ({duration} minutes)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-600 mt-2">
                  <Video className="h-4 w-4" />
                  <span>Google Meet link will be generated after booking</span>
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isBooking}>
            Cancel
          </Button>
          <Button
            onClick={handleBookSession}
            disabled={!selectedSlot || isBooking}
          >
            {isBooking ? 'Booking...' : 'Book Session'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SchedulingModal;

