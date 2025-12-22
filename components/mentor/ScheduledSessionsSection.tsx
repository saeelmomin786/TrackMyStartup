import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { mentorSchedulingService, ScheduledSession } from '../../lib/mentorSchedulingService';
import { Calendar, Clock, Video, ExternalLink, Copy, CheckCircle, User } from 'lucide-react';
import { formatDateTime, formatDateWithWeekday } from '../../lib/dateTimeUtils';
import { useCountdown } from '../../hooks/useCountdown';

interface ScheduledSessionsSectionProps {
  mentorId?: string;
  startupId?: number;
  userType: 'Mentor' | 'Startup';
}

interface SessionItemProps {
  session: ScheduledSession;
  userType: 'Mentor' | 'Startup';
  copiedLink: string | null;
  onCopyLink: (link: string) => void;
}

const SessionItem: React.FC<SessionItemProps> = ({ session, userType, copiedLink, onCopyLink }) => {
  const { date, time, dateTime } = formatDateTime(session.session_date, session.session_time);
  const dateWithWeekday = formatDateWithWeekday(session.session_date);
  const sessionDateTime = new Date(`${session.session_date}T${session.session_time}`);
  const countdown = useCountdown(sessionDateTime);
  
  // Get participant name
  const participantName = userType === 'Mentor' 
    ? (session.startup_name || 'Unknown Startup')
    : (session.mentor_name || 'Unknown Mentor');
  
  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex-1">
          {/* Participant Name */}
          <div className="flex items-center gap-2 text-slate-900 mb-3">
            <User className="h-4 w-4 text-slate-600" />
            <span className="font-semibold">
              Meeting with {participantName}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-slate-700 mb-2">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">{dateWithWeekday}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <Clock className="h-4 w-4" />
            <span>{time} ({session.duration_minutes} minutes)</span>
          </div>
          
          {/* Countdown Timer */}
          {!countdown.isPast && countdown.total > 0 && (
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-800">Meeting starts in:</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-semibold text-blue-900">
                {countdown.days > 0 && (
                  <span>{countdown.days}d</span>
                )}
                <span>{countdown.hours}h</span>
                <span>{countdown.minutes}m</span>
                <span>{countdown.seconds}s</span>
              </div>
            </div>
          )}
          
          {countdown.isPast && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <span className="text-xs font-medium text-yellow-800">Meeting time has passed</span>
            </div>
          )}
          
          <div className="text-xs text-slate-500 mt-1">
            {dateTime}
          </div>
          {session.agenda && (
            <p className="text-sm text-slate-500 mt-2">{session.agenda}</p>
          )}
        </div>

        {session.google_meet_link && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
              <Video className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-600 font-medium">Google Meet</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                onClick={() => window.open(session.google_meet_link!, '_blank')}
              >
                <ExternalLink className="mr-1 h-3 w-3" /> Join
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-slate-600 border-slate-300 hover:bg-slate-50"
                onClick={() => onCopyLink(session.google_meet_link!)}
              >
                {copiedLink === session.google_meet_link ? (
                  <>
                    <CheckCircle className="mr-1 h-3 w-3" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-3 w-3" /> Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ScheduledSessionsSection: React.FC<ScheduledSessionsSectionProps> = ({
  mentorId,
  startupId,
  userType
}) => {
  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, [mentorId, startupId, userType]);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      let fetchedSessions: ScheduledSession[] = [];
      if (userType === 'Mentor' && mentorId) {
        fetchedSessions = await mentorSchedulingService.getMentorSessions(mentorId);
      } else if (userType === 'Startup' && startupId) {
        fetchedSessions = await mentorSchedulingService.getStartupSessions(startupId);
      }
      
      // Filter to show only scheduled and upcoming sessions
      const now = new Date();
      fetchedSessions = fetchedSessions.filter(session => {
        if (session.status !== 'scheduled') return false;
        const sessionDateTime = new Date(`${session.session_date}T${session.session_time}`);
        return sessionDateTime >= now;
      });

      // Sort by date and time
      fetchedSessions.sort((a, b) => {
        const dateA = new Date(`${a.session_date}T${a.session_time}`);
        const dateB = new Date(`${b.session_date}T${b.session_time}`);
        return dateA.getTime() - dateB.getTime();
      });

      setSessions(fetchedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyMeetLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };


  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8 text-slate-600">
          <p className="text-sm">Loading sessions...</p>
        </div>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-slate-600">
          <p className="text-sm">No scheduled sessions.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Scheduled Sessions</h3>
      <div className="space-y-4">
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            userType={userType}
            copiedLink={copiedLink}
            onCopyLink={copyMeetLink}
          />
        ))}
      </div>
    </Card>
  );
};

export default ScheduledSessionsSection;

