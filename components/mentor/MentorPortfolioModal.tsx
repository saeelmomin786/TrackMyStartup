import React, { useState, useEffect } from 'react';
import { X, Clock, Eye, Plus, AlertCircle, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

interface Mentor {
  id?: string;
  mentor_user_id: string;
  full_name: string;
  email: string;
  expertise_areas?: string[];
  logo_url?: string;
  is_active?: boolean;
  bio?: string;
  mentor_facilitator_associations?: Array<{
    status: string;
    is_active: boolean;
  }>;
}

interface MentorPortfolioModalProps {
  mentor: Mentor;
  onClose: () => void;
  onViewHistory: () => void;
  onAssign: () => void;
}

const MentorPortfolioModal: React.FC<MentorPortfolioModalProps> = ({
  mentor,
  onClose,
  onViewHistory,
  onAssign
}) => {
  const [isActive, setIsActive] = useState(mentor.is_active || false);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalAssignments: 0,
    activeAssignments: 0,
    completedSessions: 0
  });

  useEffect(() => {
    fetchMentorStats();
    fetchMentorHistory();
  }, [mentor.mentor_user_id]);

  const fetchMentorStats = async () => {
    try {
      const response = await fetch(`/api/mentor-stats?mentorId=${mentor.mentor_user_id}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching mentor stats:', error);
    }
  };

  const fetchMentorHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/mentor-history?mentorId=${mentor.mentor_user_id}`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data || []);
      }
    } catch (error) {
      console.error('Error fetching mentor history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleToggleActive = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mentor-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorId: mentor.mentor_user_id,
          isActive: !isActive
        })
      });

      if (response.ok) {
        setIsActive(!isActive);
      } else {
        console.error('Failed to update mentor status');
      }
    } catch (error) {
      console.error('Error updating mentor status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div className="flex items-start gap-4">
            {mentor.logo_url ? (
              <img
                src={mentor.logo_url}
                alt={mentor.full_name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-blue-100" />
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">{mentor.full_name}</h2>
              <p className="text-sm text-gray-600">{mentor.email}</p>
              <div className="flex gap-2 mt-2">
                {mentor.expertise_areas?.map((area) => (
                  <Badge key={area} variant="secondary" className="text-xs">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50 border-b border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.totalAssignments}</p>
            <p className="text-xs text-gray-600 mt-1">Total Assignments</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.activeAssignments}</p>
            <p className="text-xs text-gray-600 mt-1">Active Now</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.completedSessions}</p>
            <p className="text-xs text-gray-600 mt-1">Sessions Completed</p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 space-y-4">
          {/* Active/Deactivate Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Status</p>
              <p className="text-sm text-gray-600">
                {isActive ? 'Currently Active' : 'Currently Inactive'}
              </p>
            </div>
            <button
              onClick={handleToggleActive}
              disabled={loading}
              className={`px-4 py-2 rounded font-medium transition ${
                isActive
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Recent Activity</h3>
            {historyLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-500">No activity yet</p>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {history.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="text-sm border-l-2 border-blue-300 pl-3 py-1">
                    <p className="font-medium text-gray-900 capitalize">
                      {item.action?.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History Button */}
          <button
            onClick={onViewHistory}
            className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="text-gray-400 group-hover:text-blue-600" size={20} />
                <div>
                  <p className="font-medium text-gray-900 group-hover:text-blue-600">View Full History</p>
                  <p className="text-xs text-gray-600">See all meetings and interactions</p>
                </div>
              </div>
              <Eye className="text-gray-400 group-hover:text-blue-600" size={20} />
            </div>
          </button>

          {/* Assign Button */}
          <button
            onClick={onAssign}
            className="w-full p-4 border-2 border-blue-500 rounded-lg bg-blue-50 hover:bg-blue-100 transition text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Plus className="text-blue-600" size={20} />
                <div>
                  <p className="font-medium text-blue-600">Assign to Startup</p>
                  <p className="text-xs text-blue-500">Connect this mentor to a startup</p>
                </div>
              </div>
            </div>
          </button>
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

export default MentorPortfolioModal;
