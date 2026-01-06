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
  const [availableSlots, setAvailableSlots] = useState<Array<{ date: string; time: string; slotId: number }>>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);
  const [duration, setDuration] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1); // Start from tomorrow
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
      console.log('🔍 Loading available slots:', { mentorId, startDate, endDate });
      const slots = await mentorSchedulingService.getAvailableSlotsForDateRange(
        mentorId,
        startDate,
        endDate
      );
      console.log('✅ Loaded slots:', slots.length, slots);
      setAvailableSlots(slots);
      
      if (slots.length === 0) {
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

    setIsBooking(true);
    setError(null);

    try {
      // Get mentor and startup emails for calendar event
      const { data: mentorUser } = await supabase
        .from('users')
        .select('email')
        .eq('id', mentorId)
        .single();

      const { data: startupData } = await supabase
        .from('startups')
        .select('user_id')
        .eq('id', startupId)
        .single();

      let startupEmail: string | null = null;
      if (startupData?.user_id) {
        const { data: startupUser } = await supabase
          .from('users')
          .select('email')
          .eq('id', startupData.user_id)
          .single();
        startupEmail = startupUser?.email || null;
      }

      // Build attendees list
      const attendees: Array<{ email: string }> = [];
      if (mentorUser?.email) {
        attendees.push({ email: mentorUser.email });
      }
      if (startupEmail) {
        attendees.push({ email: startupEmail });
      }

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
  }, {} as Record<string, Array<{ date: string; time: string; slotId: number }>>);

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
                    {slotsByDate[date].map((slot, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedSlot({ date: slot.date, time: slot.time })}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          selectedSlot?.date === slot.date && selectedSlot?.time === slot.time
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {formatTimeAMPM(slot.time)}
                      </button>
                    ))}
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

