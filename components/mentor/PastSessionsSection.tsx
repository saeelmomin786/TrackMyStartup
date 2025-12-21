import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { mentorSchedulingService, ScheduledSession } from '../../lib/mentorSchedulingService';
import { Calendar, Clock, Video, ExternalLink, CheckCircle } from 'lucide-react';
import { formatDateTime, formatDateWithWeekday } from '../../lib/dateTimeUtils';

interface PastSessionsSectionProps {
  mentorId: string;
}

const PastSessionsSection: React.FC<PastSessionsSectionProps> = ({
  mentorId
}) => {
  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, [mentorId]);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const allSessions = await mentorSchedulingService.getMentorSessions(mentorId);
      
      // Filter to show only completed, cancelled, or past scheduled sessions
      const now = new Date();
      const pastSessions = allSessions.filter(session => {
        const sessionDateTime = new Date(`${session.session_date}T${session.session_time}`);
        return session.status === 'completed' || 
               session.status === 'cancelled' || 
               (session.status === 'scheduled' && sessionDateTime < now);
      });

      // Sort by date (most recent first)
      pastSessions.sort((a, b) => {
        const dateA = new Date(`${a.session_date}T${a.session_time}`);
        const dateB = new Date(`${b.session_date}T${b.session_time}`);
        return dateB.getTime() - dateA.getTime();
      });

      setSessions(pastSessions);
    } catch (error) {
      console.error('Error loading past sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
            Cancelled
          </span>
        );
      case 'scheduled':
        return (
          <span className="px-2 py-1 bg-slate-100 text-slate-800 text-xs rounded-full font-medium">
            Past (Not Completed)
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-slate-100 text-slate-800 text-xs rounded-full font-medium">
            {status}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8 text-slate-600">
          <p className="text-sm">Loading past sessions...</p>
        </div>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-slate-600">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">No past sessions found.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Past Sessions</h3>
      <div className="space-y-4">
        {sessions.map((session) => {
          const { date, time, dateTime } = formatDateTime(session.session_date, session.session_time);
          const dateWithWeekday = formatDateWithWeekday(session.session_date);
          return (
            <div key={session.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-slate-700 mb-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">{dateWithWeekday}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 mb-2">
                    <Clock className="h-4 w-4" />
                    <span>{time} ({session.duration_minutes} minutes)</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {dateTime}
                  </div>
                  {session.agenda && (
                    <p className="text-sm text-slate-500 mt-2">{session.agenda}</p>
                  )}
                  {session.feedback && (
                    <div className="mt-2 p-2 bg-slate-50 rounded text-sm text-slate-600">
                      <strong>Feedback:</strong> {session.feedback}
                    </div>
                  )}
                  <div className="mt-2">
                    {getStatusBadge(session.status)}
                  </div>
                </div>

                {session.google_meet_link && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                      <Video className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-600 font-medium">Google Meet</span>
                    </div>
                    <a
                      href={session.google_meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 inline mr-1" />
                      View Link
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default PastSessionsSection;

