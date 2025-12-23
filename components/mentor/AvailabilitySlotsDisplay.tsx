import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { mentorSchedulingService, AvailabilitySlot } from '../../lib/mentorSchedulingService';
import { Calendar, Clock, CheckCircle, XCircle, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { formatDateDDMMYYYY, formatDateDDMMYYYYWithDay, formatTimeAMPM } from '../../lib/dateTimeUtils';
import ManageAvailabilityModal from './ManageAvailabilityModal';

interface AvailabilitySlotsDisplayProps {
  mentorId: string;
}

interface SlotWithStatus extends AvailabilitySlot {
  isBooked?: boolean;
  bookedBy?: string;
  nextOccurrence?: string;
}

const AvailabilitySlotsDisplay: React.FC<AvailabilitySlotsDisplayProps> = ({ mentorId }) => {
  const [slots, setSlots] = useState<SlotWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);

  useEffect(() => {
    if (mentorId) {
      loadSlots();
      // Refresh every 30 seconds to update booked status
      const interval = setInterval(loadSlots, 30000);
      return () => clearInterval(interval);
    }
  }, [mentorId]);

  const loadSlots = async () => {
    setIsLoading(true);
    try {
      // Get all availability slots
      const availabilitySlots = await mentorSchedulingService.getAvailabilitySlots(mentorId);
      
      // Get booked sessions to check which slots are booked
      const bookedSessions = await mentorSchedulingService.getMentorSessions(mentorId, 'scheduled');
      
      // Create a map of booked time slots to startup names
      const bookedTimesMap = new Map<string, string>();
      bookedSessions.forEach(s => {
        const timeKey = `${s.session_date}T${s.session_time}`;
        // startup_name is now added directly by getMentorSessions
        const sessionData = s as any;
        const startupName = sessionData.startup_name || 'Unknown Startup';
        bookedTimesMap.set(timeKey, startupName);
      });

      // Enrich slots with booking status
      const enrichedSlots: SlotWithStatus[] = availabilitySlots.map(slot => {
        // For recurring slots, check if any occurrence is booked
        let isBooked = false;
        let bookedBy: string | undefined;
        let nextOccurrence: string | undefined;

        if (slot.is_recurring && slot.day_of_week !== null) {
          // Find next occurrence
          const today = new Date();
          const currentDay = today.getDay();
          let daysUntilNext = (slot.day_of_week - currentDay + 7) % 7;
          if (daysUntilNext === 0 && slot.start_time) {
            const [hours, minutes] = slot.start_time.split(':').map(Number);
            const slotTime = new Date(today);
            slotTime.setHours(hours, minutes, 0, 0);
            if (slotTime <= today) {
              daysUntilNext = 7; // Next week
            }
          }
          const nextDate = new Date(today);
          nextDate.setDate(today.getDate() + daysUntilNext);
          const dateStr = nextDate.toISOString().split('T')[0];
          nextOccurrence = dateStr;
          
          // Check if this occurrence is booked
          const timeKey = `${dateStr}T${slot.start_time}`;
          isBooked = bookedTimesMap.has(timeKey);
          
          if (isBooked) {
            bookedBy = bookedTimesMap.get(timeKey) || 'Unknown Startup';
          }
        } else if (slot.specific_date) {
          // One-time slot
          nextOccurrence = slot.specific_date;
          const timeKey = `${slot.specific_date}T${slot.start_time}`;
          isBooked = bookedTimesMap.has(timeKey);
          
          if (isBooked) {
            bookedBy = bookedTimesMap.get(timeKey) || 'Unknown Startup';
          }
        }

        return {
          ...slot,
          isBooked,
          bookedBy,
          nextOccurrence
        };
      });

      // Filter out expired slots (past one-time slots)
      const now = new Date();
      const activeSlots = enrichedSlots.filter(slot => {
        if (!slot.is_recurring && slot.specific_date) {
          const slotDate = new Date(`${slot.specific_date}T${slot.start_time}`);
          // Keep if slot is in the future or today
          return slotDate >= now;
        }
        // Keep recurring slots (they're valid until valid_until or indefinitely)
        if (slot.is_recurring) {
          if (slot.valid_until) {
            const validUntil = new Date(slot.valid_until);
            return validUntil >= now;
          }
          return true; // No expiry date
        }
        return true;
      });

      setSlots(activeSlots);
    } catch (error) {
      console.error('Error loading availability slots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (slot: AvailabilitySlot) => {
    setEditingSlot(slot);
    setManageModalOpen(true);
  };

  const handleDelete = async (slotId: number) => {
    if (!confirm('Are you sure you want to delete this availability slot?')) {
      return;
    }
    try {
      await mentorSchedulingService.deleteAvailabilitySlot(slotId);
      await loadSlots();
    } catch (error) {
      console.error('Error deleting slot:', error);
      alert('Failed to delete slot. Please try again.');
    }
  };

  const handleToggleActive = async (slot: AvailabilitySlot) => {
    try {
      await mentorSchedulingService.updateAvailabilitySlot(slot.id, {
        is_active: !slot.is_active
      });
      await loadSlots();
    } catch (error) {
      console.error('Error toggling slot:', error);
      alert('Failed to update slot. Please try again.');
    }
  };

  // Group slots by type
  const recurringSlots = slots.filter(s => s.is_recurring);
  const oneTimeSlots = slots.filter(s => !s.is_recurring);

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8 text-slate-600">
          <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin" />
          <p className="text-sm">Loading availability slots...</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900">Availability Slots</h3>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={loadSlots}
              className="text-xs sm:text-sm"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingSlot(null);
                setManageModalOpen(true);
              }}
              className="text-xs sm:text-sm"
            >
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Create Slot
            </Button>
          </div>
        </div>

        {slots.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm mb-2">No availability slots created yet.</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingSlot(null);
                setManageModalOpen(true);
              }}
            >
              Create Your First Slot
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Recurring Slots */}
            {recurringSlots.length > 0 && (
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                  Recurring Slots
                </h4>
                <div className="space-y-3">
                  {recurringSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`border rounded-lg p-3 sm:p-4 ${
                        slot.isBooked
                          ? 'bg-green-50 border-green-200'
                          : slot.is_active
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {slot.isBooked ? (
                              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                            ) : slot.is_active ? (
                              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 flex-shrink-0" />
                            )}
                            <span className="font-medium text-sm sm:text-base text-slate-900">
                              {DAYS_OF_WEEK[slot.day_of_week || 0]?.label || 'Unknown'}
                            </span>
                            {slot.isBooked && (
                              <span className="px-2 py-0.5 sm:py-1 bg-green-100 text-green-800 text-xs rounded-full whitespace-nowrap">
                                Booked
                              </span>
                            )}
                            {!slot.is_active && (
                              <span className="px-2 py-0.5 sm:py-1 bg-slate-100 text-slate-600 text-xs rounded-full whitespace-nowrap">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="text-xs sm:text-sm text-slate-600 space-y-1">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="break-words">
                                {formatTimeAMPM(slot.start_time)} - {formatTimeAMPM(slot.end_time)}
                              </span>
                            </div>
                            {slot.valid_from && (
                              <div className="text-xs text-slate-500">
                                Valid from: {formatDateDDMMYYYYWithDay(slot.valid_from)}
                              </div>
                            )}
                            {slot.valid_until && (
                              <div className="text-xs text-slate-500">
                                Valid until: {formatDateDDMMYYYYWithDay(slot.valid_until)}
                              </div>
                            )}
                            {slot.nextOccurrence && (
                              <div className="text-xs text-blue-600 font-medium">
                                Next: {formatDateDDMMYYYYWithDay(slot.nextOccurrence)}
                              </div>
                            )}
                            {slot.isBooked && slot.bookedBy && (
                              <div className="text-xs text-green-700 font-medium mt-1 break-words">
                                Booked by: {slot.bookedBy}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(slot)}
                            className="text-xs sm:text-sm"
                          >
                            <Edit2 className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(slot)}
                            className={`text-xs sm:text-sm ${slot.is_active ? 'text-orange-600' : 'text-green-600'}`}
                          >
                            {slot.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(slot.id)}
                            className="text-red-600 text-xs sm:text-sm"
                          >
                            <Trash2 className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* One-Time Slots */}
            {oneTimeSlots.length > 0 && (
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  One-Time Slots
                </h4>
                <div className="space-y-3">
                  {oneTimeSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`border rounded-lg p-3 sm:p-4 ${
                        slot.isBooked
                          ? 'bg-green-50 border-green-200'
                          : slot.is_active
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {slot.isBooked ? (
                              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                            ) : slot.is_active ? (
                              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 flex-shrink-0" />
                            )}
                            <span className="font-medium text-sm sm:text-base text-slate-900">
                              {slot.specific_date ? formatDateDDMMYYYYWithDay(slot.specific_date) : 'No date'}
                            </span>
                            {slot.isBooked && (
                              <span className="px-2 py-0.5 sm:py-1 bg-green-100 text-green-800 text-xs rounded-full whitespace-nowrap">
                                Booked
                              </span>
                            )}
                            {!slot.is_active && (
                              <span className="px-2 py-0.5 sm:py-1 bg-slate-100 text-slate-600 text-xs rounded-full whitespace-nowrap">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="text-xs sm:text-sm text-slate-600 space-y-1">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="break-words">
                                {formatTimeAMPM(slot.start_time)} - {formatTimeAMPM(slot.end_time)}
                              </span>
                            </div>
                            {slot.isBooked && slot.bookedBy && (
                              <div className="text-xs text-green-700 font-medium mt-1 break-words">
                                Booked by: {slot.bookedBy}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(slot)}
                            className="text-xs sm:text-sm"
                          >
                            <Edit2 className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(slot)}
                            className={`text-xs sm:text-sm ${slot.is_active ? 'text-orange-600' : 'text-green-600'}`}
                          >
                            {slot.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(slot.id)}
                            className="text-red-600 text-xs sm:text-sm"
                          >
                            <Trash2 className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Manage Availability Modal */}
      {manageModalOpen && (
        <ManageAvailabilityModal
          isOpen={manageModalOpen}
          onClose={() => {
            setManageModalOpen(false);
            setEditingSlot(null);
            loadSlots();
          }}
          mentorId={mentorId}
          initialSlot={editingSlot || undefined}
        />
      )}
    </>
  );
};

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

export default AvailabilitySlotsDisplay;

