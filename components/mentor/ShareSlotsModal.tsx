import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { mentorSchedulingService } from '../../lib/mentorSchedulingService';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, CheckCircle, Share2 } from 'lucide-react';
import { formatDateWithWeekday, formatTimeAMPM } from '../../lib/dateTimeUtils';

interface ShareSlotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentorId: string;
  startupId: number;
  startupName: string;
  assignmentId: number | null;
}

const ShareSlotsModal: React.FC<ShareSlotsModalProps> = ({
  isOpen,
  onClose,
  mentorId,
  startupId,
  startupName,
  assignmentId
}) => {
  const [availableSlots, setAvailableSlots] = useState<Array<{ date: string; time: string; slotId: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    // Start from today to include today's one-time slots
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
      setShared(false);
    }
  }, [isOpen, mentorId, startDate, endDate]);

  const loadAvailableSlots = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // CRITICAL FIX: Get auth_user_id since slots are stored with auth_user_id, not profile_id
      // mentorId prop might be profile_id, but we need auth_user_id to query slots
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const authUserId = authUser?.id;
      
      // Use auth_user_id if available (for mentors viewing own slots), otherwise use mentorId
      const queryMentorId = authUserId || mentorId;
      
      console.log('🔍 Loading available slots to share:', { mentorId, authUserId, queryMentorId, startDate, endDate });
      const slots = await mentorSchedulingService.getAvailableSlotsForDateRange(
        queryMentorId,
        startDate,
        endDate
      );
      console.log('✅ Loaded slots to share:', slots.length, slots);
      setAvailableSlots(slots);
      
      if (slots.length === 0) {
        setError('No availability slots found. Please create slots in "Manage Availability" first.');
      }
    } catch (err: any) {
      console.error('❌ Error loading slots:', err);
      setError(err.message || 'Failed to load available slots');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareSlots = () => {
    // Slots are already available to the startup - they can see them when they click "Schedule"
    // This is just a confirmation that slots are being shared
    setShared(true);
    
    // Show success message
    setTimeout(() => {
      onClose();
    }, 2000);
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
    <Modal isOpen={isOpen} onClose={onClose} title="Share Availability Slots" size="lg">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {shared ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Slots Shared Successfully!
            </h3>
            <p className="text-slate-600">
              Your availability slots have been shared with <strong>{startupName}</strong>.
              <br />
              They can now book a session from these available slots.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start gap-3">
                <Share2 className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">
                    Share Availability with {startupName}
                  </h3>
                  <p className="text-sm text-blue-700">
                    Your availability slots will be shared with the startup. They can view and book sessions from these available time slots.
                  </p>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="text-slate-500">Loading available slots...</div>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 mb-2">No availability slots found.</p>
                <p className="text-sm text-slate-500">
                  Please create availability slots in <strong>Schedule Tab → Manage Availability</strong> first.
                </p>
              </div>
            ) : (
              <>
                <div className="border border-slate-200 rounded-md p-4 bg-slate-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-900">
                      Available Slots ({availableSlots.length} total)
                    </h4>
                    <span className="text-xs text-slate-500">
                      Next 30 days
                    </span>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {sortedDates.map((date) => (
                      <div key={date} className="bg-white rounded-md p-3 border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-slate-500" />
                          <span className="font-medium text-slate-900">
                            {formatDateWithWeekday(date)}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({slotsByDate[date].length} slots)
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {slotsByDate[date].map((slot, index) => (
                            <div
                              key={index}
                              className="px-3 py-1.5 bg-green-50 border border-green-200 rounded-md text-sm text-green-700"
                            >
                              <Clock className="h-3 w-3 inline mr-1" />
                              {formatTimeAMPM(slot.time)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> These slots are already available to the startup. 
                    When they click "Schedule" from their dashboard, they will see these available time slots and can book a session.
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={isLoading || availableSlots.length === 0}>
                Cancel
              </Button>
              <Button
                onClick={handleShareSlots}
                disabled={isLoading || availableSlots.length === 0 || shared}
                className="bg-green-600 hover:bg-green-700"
              >
                <Share2 className="mr-2 h-4 w-4" />
                {shared ? 'Shared!' : 'Share Slots with Startup'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ShareSlotsModal;




