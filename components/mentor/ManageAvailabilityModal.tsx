import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { mentorSchedulingService, AvailabilitySlot } from '../../lib/mentorSchedulingService';
import { Calendar, Clock, Plus, Trash2, Edit2, X, Check } from 'lucide-react';

interface ManageAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentorId: string;
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
  mentorId
}) => {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [slotType, setSlotType] = useState<'recurring' | 'one-time'>('recurring');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [specificDate, setSpecificDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  useEffect(() => {
    if (isOpen && mentorId) {
      loadSlots();
    }
  }, [isOpen, mentorId]);

  const loadSlots = async () => {
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
  };

  const resetForm = () => {
    setSlotType('recurring');
    setDayOfWeek(1);
    setSpecificDate('');
    setStartTime('09:00');
    setEndTime('10:00');
    setValidFrom('');
    setValidUntil('');
    setTimezone('UTC');
    setEditingSlot(null);
    setShowAddForm(false);
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
      return `${dayName} ${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}`;
    } else {
      const date = slot.specific_date ? new Date(slot.specific_date).toLocaleDateString() : 'Unknown';
      return `${date} ${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}`;
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Slot Type
                </label>
                <Select
                  value={slotType}
                  onChange={(e) => {
                    setSlotType(e.target.value as 'recurring' | 'one-time');
                    setError(null);
                  }}
                  options={[
                    { value: 'recurring', label: 'Recurring (Weekly)' },
                    { value: 'one-time', label: 'One-Time' }
                  ]}
                />
              </div>

              {slotType === 'recurring' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Day of Week
                  </label>
                  <Select
                    value={dayOfWeek.toString()}
                    onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                    options={DAYS_OF_WEEK.map(day => ({
                      value: day.value.toString(),
                      label: day.label
                    }))}
                  />
                </div>
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Timezone
                </label>
                <Select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  options={[
                    { value: 'UTC', label: 'UTC' },
                    { value: 'America/New_York', label: 'Eastern Time (ET)' },
                    { value: 'America/Chicago', label: 'Central Time (CT)' },
                    { value: 'America/Denver', label: 'Mountain Time (MT)' },
                    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
                    { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
                    { value: 'Europe/London', label: 'London (GMT)' },
                    { value: 'Europe/Paris', label: 'Paris (CET)' },
                    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
                    { value: 'Asia/Dubai', label: 'Dubai (GST)' }
                  ]}
                />
              </div>

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
                            {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                          </span>
                          {slot.valid_from && (
                            <span>From: {new Date(slot.valid_from).toLocaleDateString()}</span>
                          )}
                          {slot.valid_until && (
                            <span>Until: {new Date(slot.valid_until).toLocaleDateString()}</span>
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

