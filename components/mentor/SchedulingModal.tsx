import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { mentorSchedulingService, AvailabilitySlot } from '../../lib/mentorSchedulingService';
import { googleCalendarService } from '../../lib/googleCalendarService';
import { Calendar, Clock, Video } from 'lucide-react';

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
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
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
      const slots = await mentorSchedulingService.getAvailableSlotsForDateRange(
        mentorId,
        startDate,
        endDate
      );
      setAvailableSlots(slots);
    } catch (err: any) {
      setError(err.message || 'Failed to load available slots');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookSession = async () => {
    if (!selectedDate || !selectedTime) {
      setError('Please select a date and time');
      return;
    }

    setIsBooking(true);
    setError(null);

    try {
      // Generate Google Meet link first
      let meetLink: string | undefined;
      try {
        meetLink = await googleCalendarService.generateGoogleMeetLink();
      } catch (err) {
        console.warn('Failed to generate Google Meet link, continuing without it:', err);
      }

      // Book the session
      await mentorSchedulingService.bookSession(
        mentorId,
        startupId,
        assignmentId,
        selectedDate,
        selectedTime,
        duration,
        'UTC',
        meetLink
      );

      // If mentor has Google Calendar, create event
      try {
        const integration = await googleCalendarService.getIntegration(mentorId, 'Mentor');
        if (integration && integration.calendar_sync_enabled) {
          const startDateTime = new Date(`${selectedDate}T${selectedTime}`);
          const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

          await googleCalendarService.createCalendarEventWithMeet(integration, {
            summary: 'Mentoring Session',
            description: 'Mentoring session with startup',
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: 'UTC'
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: 'UTC'
            }
          });
        }
      } catch (err) {
        console.warn('Failed to create Google Calendar event, continuing:', err);
      }

      onSessionBooked();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to book session. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const slotsForSelectedDate = availableSlots.filter(slot => slot.date === selectedDate);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Session">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Duration (minutes)
          </label>
          <Select
            value={duration.toString()}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            options={[
              { value: '30', label: '30 minutes' },
              { value: '60', label: '1 hour' },
              { value: '90', label: '1.5 hours' },
              { value: '120', label: '2 hours' }
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Select Date
          </label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedTime(''); // Reset time when date changes
            }}
            min={startDate}
            max={endDate}
          />
        </div>

        {selectedDate && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Available Times
            </label>
            {isLoading ? (
              <div className="text-sm text-slate-500 py-4">Loading available times...</div>
            ) : slotsForSelectedDate.length === 0 ? (
              <div className="text-sm text-slate-500 py-4">
                No available slots for this date. Please select another date.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {slotsForSelectedDate.map((slot, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedTime(slot.time)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedTime === slot.time
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {slot.time.substring(0, 5)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedDate && selectedTime && (
          <div className="p-3 bg-blue-50 rounded-md">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700 mt-1">
              <Clock className="h-4 w-4" />
              <span>{selectedTime.substring(0, 5)} ({duration} minutes)</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-600 mt-2">
              <Video className="h-4 w-4" />
              <span>Google Meet link will be generated after booking</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isBooking}>
            Cancel
          </Button>
          <Button
            onClick={handleBookSession}
            disabled={!selectedDate || !selectedTime || isBooking}
          >
            {isBooking ? 'Booking...' : 'Book Session'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SchedulingModal;

