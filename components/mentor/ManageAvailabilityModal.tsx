import React, { useState, useEffect, useRef, useCallback } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { mentorSchedulingService, AvailabilitySlot } from '../../lib/mentorSchedulingService';
import { Calendar, Clock, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { formatDateDDMMYYYY, formatTimeAMPM } from '../../lib/dateTimeUtils';

interface ManageAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentorId: string;
  initialSlot?: AvailabilitySlot;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

const ManageAvailabilityModal: React.FC<ManageAvailabilityModalProps> = ({
  isOpen,
  onClose,
  mentorId,
  initialSlot
}) => {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(initialSlot || null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const prevIsOpenRef = useRef(false);
  const userManuallyOpenedFormRef = useRef(false);

  // Form state
  const [slotType, setSlotType] = useState<'recurring' | 'one-time'>('recurring');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [specificDate, setSpecificDate] = useState('');
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  });
  const [endTime, setEndTime] = useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  });
  const [validFrom, setValidFrom] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [validUntil, setValidUntil] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  useEffect(() => {
    if (isOpen && mentorId) {
      const isModalJustOpened = !prevIsOpenRef.current;
      
      // If modal is already open and user has manually shown the form, preserve it
      // Don't reload slots if form is open - avoid interrupting user
      if (!isModalJustOpened && userManuallyOpenedFormRef.current) {
        // Don't reload - user is working on the form
        return;
      }
      
      prevIsOpenRef.current = true;
      
      // Only load slots when modal first opens, not on every render
      if (isModalJustOpened) {
        loadSlots();
      }
      
      if (initialSlot) {
        setEditingSlot(initialSlot);
        setShowAddForm(true);
        userManuallyOpenedFormRef.current = true;
        // Populate form with initial slot data
        setSlotType(initialSlot.is_recurring ? 'recurring' : 'one-time');
        setDayOfWeek(initialSlot.day_of_week ?? 1);
        setSpecificDate(initialSlot.specific_date || '');
        setStartTime(initialSlot.start_time || '09:00');
        setEndTime(initialSlot.end_time || '10:00');
        setValidFrom(initialSlot.valid_from || '');
        setValidUntil(initialSlot.valid_until || '');
        setTimezone(initialSlot.timezone || 'UTC');
      } else if (isModalJustOpened) {
        // Only reset form when modal first opens, not on every render
        setEditingSlot(null);
        setShowAddForm(false);
        userManuallyOpenedFormRef.current = false;
      }
    } else if (!isOpen) {
      prevIsOpenRef.current = false;
      userManuallyOpenedFormRef.current = false;
    }
  }, [isOpen, mentorId, loadSlots]); // Removed showAddForm to prevent circular dependency
  
  // Separate effect for initialSlot to avoid dependency array issues
  useEffect(() => {
    if (isOpen && initialSlot) {
      setEditingSlot(initialSlot);
      setShowAddForm(true);
      userManuallyOpenedFormRef.current = true;
      setSlotType(initialSlot.is_recurring ? 'recurring' : 'one-time');
      setDayOfWeek(initialSlot.day_of_week ?? 1);
      setSpecificDate(initialSlot.specific_date || '');
      setStartTime(initialSlot.start_time || '09:00');
      setEndTime(initialSlot.end_time || '10:00');
      setValidFrom(initialSlot.valid_from || '');
      setValidUntil(initialSlot.valid_until || '');
      setTimezone(initialSlot.timezone || 'UTC');
    }
  }, [initialSlot, isOpen]);

  const loadSlots = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await mentorSchedulingService.getAvailabilitySlots(mentorId);
      setSlots(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load availability slots');
    } finally {
      setIsLoading(false);
    }
  }, [mentorId]);

  const resetForm = () => {
    setSlotType('recurring');
    setDayOfWeek(1);
    setSpecificDate('');
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setStartTime(`${hours}:${minutes}`);
    const endTimeDate = new Date(now);
    endTimeDate.setHours(now.getHours() + 1);
    const endHours = String(endTimeDate.getHours()).padStart(2, '0');
    const endMinutes = String(endTimeDate.getMinutes()).padStart(2, '0');
    setEndTime(`${endHours}:${endMinutes}`);
    const today = new Date();
    setValidFrom(today.toISOString().split('T')[0]);
    setValidUntil('');
    setTimezone('UTC');
    setEditingSlot(null);
    setShowAddForm(false);
    userManuallyOpenedFormRef.current = false;
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (startTime >= endTime) {
      setError('End time must be after start time');
      return;
    }

    if (slotType === 'one-time' && !specificDate) {
      setError('Please select a specific date for one-time slot');
      return;
    }

    // Prevent creating slots in the past
    if (slotType === 'one-time' && specificDate) {
      const slotDateTime = new Date(`${specificDate}T${startTime}`);
      const now = new Date();
      if (slotDateTime < now) {
        setError('Cannot create slots in the past. Please select a future date and time.');
        return;
      }
    }

    // For recurring slots, check valid_from is not in the past
    if (slotType === 'recurring' && validFrom) {
      const validFromDate = new Date(validFrom);
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Compare dates only
      if (validFromDate < now) {
        setError('Valid from date cannot be in the past. Please select today or a future date.');
        return;
      }
    }

    if (validFrom && validUntil && validFrom > validUntil) {
      setError('Valid until date must be after valid from date');
      return;
    }

    try {
      const slotData: AvailabilitySlot = {
        mentor_id: mentorId,
        day_of_week: slotType === 'recurring' ? dayOfWeek : null,
        specific_date: slotType === 'one-time' ? specificDate : null,
        start_time: startTime,
        end_time: endTime,
        timezone: timezone,
        is_recurring: slotType === 'recurring',
        valid_from: validFrom || null,
        valid_until: validUntil || null,
        is_active: true
      };

      if (editingSlot && editingSlot.id) {
        await mentorSchedulingService.updateAvailabilitySlot(editingSlot.id, slotData);
        setSuccess('Availability slot updated successfully');
      } else {
        await mentorSchedulingService.createAvailabilitySlot(slotData);
        setSuccess('Availability slot created successfully');
      }

      resetForm();
      loadSlots();
    } catch (err: any) {
      setError(err.message || 'Failed to save availability slot');
    }
  };

  const handleEdit = (slot: AvailabilitySlot) => {
    setEditingSlot(slot);
    setSlotType(slot.is_recurring ? 'recurring' : 'one-time');
    setDayOfWeek(slot.day_of_week ?? 1);
    setSpecificDate(slot.specific_date || '');
    setStartTime(slot.start_time);
    setEndTime(slot.end_time);
    setValidFrom(slot.valid_from || '');
    setValidUntil(slot.valid_until || '');
    setTimezone(slot.timezone || 'UTC');
    setShowAddForm(true);
    userManuallyOpenedFormRef.current = true;
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (slotId: number) => {
    if (!confirm('Are you sure you want to delete this availability slot?')) {
      return;
    }

    try {
      const success = await mentorSchedulingService.deleteAvailabilitySlot(slotId);
      if (success) {
        setSuccess('Availability slot deleted successfully');
        loadSlots();
      } else {
        setError('Failed to delete availability slot');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete availability slot');
    }
  };

  const handleDeactivate = async (slot: AvailabilitySlot) => {
    if (!slot.id) return;
    
    try {
      await mentorSchedulingService.updateAvailabilitySlot(slot.id, { is_active: false });
      setSuccess('Availability slot deactivated');
      loadSlots();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate slot');
    }
  };

  const handleActivate = async (slot: AvailabilitySlot) => {
    if (!slot.id) return;
    
    try {
      await mentorSchedulingService.updateAvailabilitySlot(slot.id, { is_active: true });
      setSuccess('Availability slot activated');
      loadSlots();
    } catch (err: any) {
      setError(err.message || 'Failed to activate slot');
    }
  };

  const formatSlotDisplay = (slot: AvailabilitySlot): string => {
    if (slot.is_recurring) {
      const dayName = DAYS_OF_WEEK.find(d => d.value === slot.day_of_week)?.label || 'Unknown';
      return `${dayName} ${formatTimeAMPM(slot.start_time)} - ${formatTimeAMPM(slot.end_time)}`;
    } else {
      const date = slot.specific_date ? formatDateDDMMYYYY(slot.specific_date) : 'Unknown';
      return `${date} ${formatTimeAMPM(slot.start_time)} - ${formatTimeAMPM(slot.end_time)}`;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Availability" size="large">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
            {success}
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingSlot ? 'Edit Availability Slot' : 'Add Availability Slot'}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={resetForm}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Select
                label="Slot Type"
                id="slot-type"
                value={slotType}
                onChange={(e) => {
                  setSlotType(e.target.value as 'recurring' | 'one-time');
                  setError(null);
                }}
              >
                <option value="recurring">Recurring (Weekly)</option>
                <option value="one-time">One-Time</option>
              </Select>

              {slotType === 'recurring' ? (
                <Select
                  label="Day of Week"
                  id="day-of-week"
                  value={dayOfWeek.toString()}
                  onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                >
                  {DAYS_OF_WEEK.map(day => (
                    <option key={day.value} value={day.value.toString()}>
                      {day.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Specific Date
                  </label>
                  <Input
                    type="date"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Time
                  </label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Time
                  </label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Valid From (Optional)
                  </label>
                  <Input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Valid Until (Optional)
                  </label>
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
              </div>

              <Select
                label="Timezone"
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Asia/Kolkata">India Standard Time (IST)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Singapore">Singapore (SGT)</option>
                <option value="Asia/Dubai">Dubai (GST)</option>
              </Select>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSlot ? 'Update Slot' : 'Create Slot'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Slots List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Your Availability Slots</h3>
            {!showAddForm && (
              <Button
                onClick={() => {
                  resetForm();
                  setShowAddForm(true);
                  userManuallyOpenedFormRef.current = true;
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Slot
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading availability slots...</div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-400" />
              <p className="text-sm">No availability slots created yet.</p>
              <p className="text-xs text-slate-400 mt-1">Click "Add Slot" to create your first availability slot.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className={`p-4 rounded-lg border ${
                    slot.is_active
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-50 border-slate-300 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${slot.is_active ? 'bg-green-100' : 'bg-slate-200'}`}>
                        <Calendar className={`h-4 w-4 ${slot.is_active ? 'text-green-600' : 'text-slate-500'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">
                            {formatSlotDisplay(slot)}
                          </span>
                          {slot.is_recurring && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                              Recurring
                            </span>
                          )}
                          {!slot.is_active && (
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAMPM(slot.start_time)} - {formatTimeAMPM(slot.end_time)}
                          </span>
                          {slot.valid_from && (
                            <span>From: {formatDateDDMMYYYY(slot.valid_from)}</span>
                          )}
                          {slot.valid_until && (
                            <span>Until: {formatDateDDMMYYYY(slot.valid_until)}</span>
                          )}
                          <span>Timezone: {slot.timezone || 'UTC'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {slot.is_active ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeactivate(slot)}
                          title="Deactivate"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleActivate(slot)}
                          title="Activate"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(slot)}
                        title="Edit"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => slot.id && handleDelete(slot.id)}
                        title="Delete"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">How it works:</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• <strong>Recurring slots:</strong> Available every week on the selected day (e.g., Every Monday 2-4 PM)</li>
            <li>• <strong>One-time slots:</strong> Available only on a specific date</li>
            <li>• <strong>Valid From/Until:</strong> Optional date range for when the slot is available</li>
            <li>• <strong>Inactive slots:</strong> Temporarily hidden from startups but not deleted</li>
            <li>• Startups will see and can book from your active availability slots</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

export default ManageAvailabilityModal;


