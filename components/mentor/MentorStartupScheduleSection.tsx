import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { mentorSchedulingService, ScheduledSession } from '../../lib/mentorSchedulingService';
import { Calendar, Clock, CheckCircle, Star, MessageSquare, History } from 'lucide-react';
import { formatDateDDMMYYYYWithDay, formatTimeAMPM } from '../../lib/dateTimeUtils';
import FeedbackModal from './FeedbackModal';

interface MentorStartupScheduleSectionProps {
  mentorId: string;
  startupId: number;
  assignmentId: number;
  startupName: string;
  onUpdate?: () => void;
}

const MentorStartupScheduleSection: React.FC<MentorStartupScheduleSectionProps> = ({
  mentorId,
  startupId,
  assignmentId,
  startupName,
  onUpdate
}) => {
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<ScheduledSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSessionForFeedback, setSelectedSessionForFeedback] = useState<ScheduledSession | null>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'booked' | 'completed' | 'history'>('booked');

  useEffect(() => {
    loadSessions();
  }, [mentorId, startupId]);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      // Get scheduled sessions
      const scheduled = await mentorSchedulingService.getMentorSessions(mentorId, 'scheduled');
      const filteredScheduled = scheduled.filter(s => s.startup_id === startupId);
      setScheduledSessions(filteredScheduled);

      // Get completed sessions
      const completed = await mentorSchedulingService.getMentorSessions(mentorId, 'completed');
      const filteredCompleted = completed.filter(s => s.startup_id === startupId);
      setCompletedSessions(filteredCompleted);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkCompleted = async (session: ScheduledSession) => {
    // Open feedback modal first - user must provide feedback before marking as completed
    setSelectedSessionForFeedback(session);
    setFeedbackModalOpen(true);
  };

  const handleFeedbackSubmitted = () => {
    setFeedbackModalOpen(false);
    setSelectedSessionForFeedback(null);
    loadSessions();
    onUpdate?.();
  };

  return (
    <>
      <Card>
        <div className="mb-4">
          <h4 className="text-base font-semibold text-slate-700 mb-3">Schedule Management</h4>
          
          {/* Section Tabs */}
          <div className="border-b border-slate-200 mb-4">
            <nav className="-mb-px flex space-x-4" aria-label="Schedule Sections">
              <button
                onClick={() => setActiveSection('booked')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeSection === 'booked'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Clock className="h-4 w-4 inline mr-1" />
                Booked Slots ({scheduledSessions.length})
              </button>
              <button
                onClick={() => setActiveSection('completed')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeSection === 'completed'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <CheckCircle className="h-4 w-4 inline mr-1" />
                Completed ({completedSessions.length})
              </button>
              <button
                onClick={() => setActiveSection('history')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeSection === 'history'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <History className="h-4 w-4 inline mr-1" />
                History
              </button>
            </nav>
          </div>
        </div>

        {/* Booked Slots Section */}
        {activeSection === 'booked' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">
                <Clock className="h-6 w-6 mx-auto mb-2 animate-spin" />
                <p className="text-sm">Loading booked sessions...</p>
              </div>
            ) : scheduledSessions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Clock className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">No booked sessions yet.</p>
                <p className="text-xs text-slate-400 mt-1">{startupName} can book sessions from your available slots.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduledSessions.map(session => (
                  <div
                    key={session.id}
                    className="border border-green-200 rounded-lg p-4 bg-green-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-slate-900">
                            {formatDateDDMMYYYYWithDay(session.session_date)}
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Scheduled
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {formatTimeAMPM(session.session_time)} ({session.duration_minutes} minutes)
                            </span>
                          </div>
                          {session.google_meet_link && (
                            <div className="text-xs text-blue-600 mt-2">
                              <a
                                href={session.google_meet_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-blue-800"
                              >
                                Join Google Meet
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleMarkCompleted(session)}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark Completed
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completed Section */}
        {activeSection === 'completed' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle className="h-6 w-6 mx-auto mb-2 animate-spin" />
                <p className="text-sm">Loading completed sessions...</p>
              </div>
            ) : completedSessions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">No completed sessions yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedSessions.map(session => (
                  <div
                    key={session.id}
                    className="border border-purple-200 rounded-lg p-4 bg-purple-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-5 w-5 text-purple-600" />
                          <span className="font-medium text-slate-900">
                            {formatDateDDMMYYYYWithDay(session.session_date)}
                          </span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                            Completed
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {formatTimeAMPM(session.session_time)} ({session.duration_minutes} minutes)
                            </span>
                          </div>
                          {session.feedback && (
                            <div className="mt-2 p-2 bg-white rounded border border-purple-200">
                              <div className="flex items-center gap-2 mb-1">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span className="text-xs font-medium">
                                  Rating: {session.feedback.split('|')[0]}/5
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 mt-1">
                                {session.feedback.split('|')[1] || session.feedback}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Section */}
        {activeSection === 'history' && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h5 className="text-sm font-semibold text-slate-700 mb-2">Session History</h5>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Total Sessions:</span>
                  <span className="font-medium">{scheduledSessions.length + completedSessions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Scheduled:</span>
                  <span className="font-medium text-green-600">{scheduledSessions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completed:</span>
                  <span className="font-medium text-purple-600">{completedSessions.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Feedback Modal */}
      {feedbackModalOpen && selectedSessionForFeedback && (
        <FeedbackModal
          isOpen={feedbackModalOpen}
          onClose={() => {
            setFeedbackModalOpen(false);
            setSelectedSessionForFeedback(null);
          }}
          session={selectedSessionForFeedback}
          startupName={startupName}
          onSubmit={handleFeedbackSubmitted}
        />
      )}
    </>
  );
};

export default MentorStartupScheduleSection;

