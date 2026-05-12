import React, { useState, useEffect } from 'react';
import { X, ExternalLink, FileText, Copy } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

interface MeetingRecord {
  meeting_id: bigint;
  meeting_date: string;
  duration_mins: number;
  google_meet_link: string;
  ai_notes: string;
  topics_discussed: string[];
  action_items: string;
  attendance_status: string;
  meeting_status: string;
  startup_name?: string;
}

interface Mentor {
  id?: string;
  mentor_user_id: string;
  full_name: string;
  email: string;
  logo_url?: string;
}

interface MentorHistoryModalProps {
  mentor: Mentor;
  onClose: () => void;
}

const MentorHistoryModal: React.FC<MentorHistoryModalProps> = ({ mentor, onClose }) => {
  const [history, setHistory] = useState<MeetingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchMeetingHistory();
  }, [mentor.mentor_user_id]);

  const fetchMeetingHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/mentor-history?mentorId=${mentor.mentor_user_id}`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Error fetching meeting history:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, meetingId: string) => {
    navigator.clipboard.writeText(text);
    setCopied(meetingId);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAttendanceColor = (status: string) => {
    switch (status) {
      case 'attended':
        return 'bg-green-50 text-green-700';
      case 'missed':
        return 'bg-red-50 text-red-700';
      case 'rescheduled':
        return 'bg-yellow-50 text-yellow-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Meeting History</h2>
            <p className="text-sm text-gray-600">{mentor.full_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading meeting history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No meeting history found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record) => (
                <div
                  key={record.meeting_id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
                >
                  {/* Meeting Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {record.startup_name || 'Meeting'}
                      </p>
                      <p className="text-sm text-gray-600">{formatDate(record.meeting_date)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${getStatusColor(record.meeting_status)}`}
                      >
                        {record.meeting_status}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${getAttendanceColor(record.attendance_status)}`}
                      >
                        {record.attendance_status}
                      </Badge>
                    </div>
                  </div>

                  {/* Meeting Details */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-600">Duration</p>
                      <p className="text-sm font-medium text-gray-900">
                        {record.duration_mins} minutes
                      </p>
                    </div>
                    {record.topics_discussed && record.topics_discussed.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-600">Topics</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {record.topics_discussed.map((topic, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Google Meet Link */}
                  {record.google_meet_link && (
                    <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ExternalLink size={16} className="text-blue-600" />
                          <a
                            href={record.google_meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 underline truncate"
                          >
                            {record.google_meet_link}
                          </a>
                        </div>
                        <button
                          onClick={() => copyToClipboard(record.google_meet_link, `meet-${record.meeting_id}`)}
                          className="text-blue-600 hover:text-blue-800 transition"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                      {copied === `meet-${record.meeting_id}` && (
                        <p className="text-xs text-blue-600 mt-1">Copied to clipboard</p>
                      )}
                    </div>
                  )}

                  {/* AI Notes */}
                  {record.ai_notes && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-600 mb-2">AI Notes</p>
                      <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 italic border-l-2 border-gray-300">
                        {record.ai_notes}
                      </div>
                    </div>
                  )}

                  {/* Action Items */}
                  {record.action_items && (
                    <div>
                      <p className="text-xs text-gray-600 mb-2">Action Items</p>
                      <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded border-l-2 border-yellow-300">
                        {record.action_items}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default MentorHistoryModal;
