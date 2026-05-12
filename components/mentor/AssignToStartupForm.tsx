import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Check } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { supabase } from '../../lib/supabaseClient';

interface Startup {
  id: bigint;
  name: string;
  user_id: string;
}

interface Mentor {
  id?: string;
  mentor_user_id: string;
  full_name: string;
  email: string;
}

interface AssignToStartupFormProps {
  mentor: Mentor;
  onClose: () => void;
}

const AssignToStartupForm: React.FC<AssignToStartupFormProps> = ({ mentor, onClose }) => {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [selectedStartup, setSelectedStartup] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchStartups();
  }, []);

  const fetchStartups = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('startups')
        .select('id, name, user_id')
        .order('name', { ascending: true });

      if (error) throw error;
      setStartups(data || []);
    } catch (err) {
      console.error('Error fetching startups:', err);
      setError('Failed to load startups');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!selectedStartup) {
      setError('Please select a startup');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('mentor_startup_assignments')
        .insert([
          {
            mentor_user_id: mentor.mentor_user_id,
            startup_id: parseInt(selectedStartup),
            status: 'active',
            notes: notes || null,
            assigned_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) {
        if (error.message.includes('duplicate')) {
          setError('This mentor is already assigned to this startup');
        } else {
          throw error;
        }
      } else {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Error assigning mentor:', err);
      setError('Failed to assign mentor. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Assign Mentor to Startup</h2>
            <p className="text-sm text-gray-600 mt-1">{mentor.full_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <Check className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-green-800">Mentor assigned successfully!</p>
            </div>
          )}

          {/* Select Startup */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Select Startup *
            </label>
            {loading ? (
              <div className="p-3 bg-gray-50 rounded text-sm text-gray-600">
                Loading startups...
              </div>
            ) : (
              <select
                value={selectedStartup}
                onChange={(e) => setSelectedStartup(e.target.value)}
                disabled={submitting}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              >
                <option value="">Choose a startup...</option>
                {startups.map((startup) => (
                  <option key={startup.id} value={startup.id.toString()}>
                    {startup.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              placeholder="Add any notes about this assignment..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 resize-none"
            />
          </div>

          {/* Mentor Info */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-600 font-medium">Mentor Information</p>
            <div className="mt-2 space-y-1 text-sm">
              <p className="text-gray-900"><strong>Name:</strong> {mentor.full_name}</p>
              <p className="text-gray-900"><strong>Email:</strong> {mentor.email}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !selectedStartup || success}
              className="flex-1"
            >
              {submitting ? 'Assigning...' : 'Assign Mentor'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AssignToStartupForm;
