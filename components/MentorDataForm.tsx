import React, { useState, useEffect } from 'react';
import { Startup, StartupDomain } from '../types';
import { Plus, X, Save, Edit, Trash2, Eye } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import { supabase } from '../lib/supabase';
import { mentorService, MentorAssignment, MentorMetrics } from '../lib/mentorService';

interface MentorDataFormProps {
  mentorId: string;
  startups: Startup[];
  onUpdate: () => void;
  mentorMetrics?: MentorMetrics | null;
  initialSection?: 'active' | 'completed' | 'founded';
}

const MentorDataForm: React.FC<MentorDataFormProps> = ({ mentorId, startups, onUpdate, mentorMetrics, initialSection }) => {
  const [activeSection, setActiveSection] = useState<'active' | 'completed' | 'founded'>(initialSection || 'active');
  
  // Update active section when initialSection prop changes
  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for active mentoring
  const [activeForm, setActiveForm] = useState({
    startup_name: '',
    email_id: '',
    website: '',
    sector: '',
    fee_amount: '',
    esop_percentage: '',
  });

  // Form states for completed mentoring
  const [completedForm, setCompletedForm] = useState({
    startup_name: '',
    email_id: '',
    website: '',
    sector: '',
    fee_amount: '',
    esop_percentage: '',
  });

  // Form states for founded startups
  const [foundedForm, setFoundedForm] = useState({
    startup_name: '',
    email_id: '',
    website: '',
    sector: '',
  });

  const [editingId, setEditingId] = useState<number | null>(null);

  const handleActiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Store startup_name, email, website, and sector in notes as JSON
      const notesData = JSON.stringify({
        startup_name: activeForm.startup_name,
        email_id: activeForm.email_id,
        website: activeForm.website,
        sector: activeForm.sector,
      });

      if (editingId) {
        // Update existing assignment
        const { error } = await supabase
          .from('mentor_startup_assignments')
          .update({
            startup_id: null, // Make nullable or use placeholder
            fee_amount: parseFloat(activeForm.fee_amount) || 0,
            fee_currency: 'USD',
            esop_percentage: parseFloat(activeForm.esop_percentage) || 0,
            notes: notesData,
          })
          .eq('id', editingId)
          .eq('mentor_id', mentorId);

        if (error) throw error;
      } else {
        // Create new assignment - startup_id can be null for manually entered startups
        const { error } = await supabase
          .from('mentor_startup_assignments')
          .insert({
            mentor_id: mentorId,
            startup_id: null, // Nullable for manually entered startups
            status: 'active',
            fee_amount: parseFloat(activeForm.fee_amount) || 0,
            fee_currency: 'USD',
            esop_percentage: parseFloat(activeForm.esop_percentage) || 0,
            notes: notesData,
          });

        if (error) throw error;
      }

      // Reset form
      setActiveForm({
        startup_name: '',
        email_id: '',
        website: '',
        sector: '',
        fee_amount: '',
        esop_percentage: '',
      });
      setEditingId(null);
      onUpdate();
    } catch (error) {
      console.error('Error saving active mentoring:', error);
      alert('Error saving data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompletedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Store startup_name, email, website, and sector in notes as JSON
      const notesData = JSON.stringify({
        startup_name: completedForm.startup_name,
        email_id: completedForm.email_id,
        website: completedForm.website,
        sector: completedForm.sector,
      });

      if (editingId) {
        // Update existing assignment
        const { error } = await supabase
          .from('mentor_startup_assignments')
          .update({
            startup_id: null,
            status: 'completed',
            fee_amount: parseFloat(completedForm.fee_amount) || 0,
            fee_currency: 'USD',
            esop_percentage: parseFloat(completedForm.esop_percentage) || 0,
            esop_value: 0, // Can calculate later if needed
            completed_at: new Date().toISOString(),
            notes: notesData,
          })
          .eq('id', editingId)
          .eq('mentor_id', mentorId);

        if (error) throw error;
      } else {
        // Create new completed assignment
        const { error } = await supabase
          .from('mentor_startup_assignments')
          .insert({
            mentor_id: mentorId,
            startup_id: null,
            status: 'completed',
            fee_amount: parseFloat(completedForm.fee_amount) || 0,
            fee_currency: 'USD',
            esop_percentage: parseFloat(completedForm.esop_percentage) || 0,
            esop_value: 0,
            completed_at: new Date().toISOString(),
            notes: notesData,
          });

        if (error) throw error;
      }

      // Reset form
      setCompletedForm({
        startup_name: '',
        email_id: '',
        website: '',
        sector: '',
        fee_amount: '',
        esop_percentage: '',
      });
      setEditingId(null);
      onUpdate();
    } catch (error) {
      console.error('Error saving completed mentoring:', error);
      alert('Error saving data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFoundedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Store startup_name, email_id, website, and sector in notes as JSON
      const notesData = JSON.stringify({
        startup_name: foundedForm.startup_name,
        email_id: foundedForm.email_id,
        website: foundedForm.website,
        sector: foundedForm.sector,
      });

      const { error } = await supabase
        .from('mentor_founded_startups')
        .insert({
          mentor_id: mentorId,
          startup_id: null, // Nullable for manually entered startups
          notes: notesData,
        });

      if (error) {
        // If already exists or other error
        if (error.code !== '23505') throw error;
      }

      // Reset form
      setFoundedForm({ startup_name: '', email_id: '', website: '', sector: '' });
      onUpdate();
    } catch (error) {
      console.error('Error saving founded startup:', error);
      alert('Error saving data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (assignment: MentorAssignment) => {
    // Parse notes to get startup_name, email_id, website, and sector
    let startupName = '';
    let emailId = '';
    let website = '';
    let sector = '';
    
    if (assignment.notes) {
      try {
        const notesData = JSON.parse(assignment.notes);
        startupName = notesData.startup_name || '';
        emailId = notesData.email_id || '';
        website = notesData.website || '';
        sector = notesData.sector || '';
      } catch (e) {
        // If notes is not JSON, use startup name from startup object if available
        startupName = assignment.startup?.name || '';
        website = assignment.startup?.domain || '';
        sector = assignment.startup?.sector || '';
      }
    } else if (assignment.startup) {
      startupName = assignment.startup.name;
      website = assignment.startup.domain || '';
      sector = assignment.startup.sector || '';
    }

    if (assignment.status === 'active') {
      setActiveForm({
        startup_name: startupName,
        email_id: emailId,
        website: website,
        sector: sector,
        fee_amount: assignment.fee_amount.toString(),
        esop_percentage: assignment.esop_percentage.toString(),
      });
      setActiveSection('active');
    } else {
      setCompletedForm({
        startup_name: startupName,
        email_id: emailId,
        website: website,
        sector: sector,
        fee_amount: assignment.fee_amount.toString(),
        esop_percentage: assignment.esop_percentage.toString(),
      });
      setActiveSection('completed');
    }
    setEditingId(assignment.id);
  };

  const handleDelete = async (id: number, type: 'active' | 'completed' | 'founded') => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      if (type === 'founded') {
        const { error } = await supabase
          .from('mentor_founded_startups')
          .delete()
          .eq('id', id)
          .eq('mentor_id', mentorId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('mentor_startup_assignments')
          .delete()
          .eq('id', id)
          .eq('mentor_id', mentorId);

        if (error) throw error;
      }

      onUpdate();
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Error deleting entry. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="flex space-x-4 border-b border-slate-200">
        <button
          onClick={() => {
            setActiveSection('active');
            setEditingId(null);
          }}
          className={`py-2 px-4 border-b-2 font-medium text-sm ${
            activeSection === 'active'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Currently Mentoring
        </button>
        <button
          onClick={() => {
            setActiveSection('completed');
            setEditingId(null);
          }}
          className={`py-2 px-4 border-b-2 font-medium text-sm ${
            activeSection === 'completed'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Previously Mentored
        </button>
        <button
          onClick={() => {
            setActiveSection('founded');
            setEditingId(null);
          }}
          className={`py-2 px-4 border-b-2 font-medium text-sm ${
            activeSection === 'founded'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Founded Startups
        </button>
      </div>

      {/* Active Mentoring Form */}
      {activeSection === 'active' && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Add Currently Mentoring Startup</h3>
          <form onSubmit={handleActiveSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Startup Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={activeForm.startup_name}
                  onChange={(e) => setActiveForm({ ...activeForm, startup_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter startup name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={activeForm.email_id}
                  onChange={(e) => setActiveForm({ ...activeForm, email_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="founder@startup.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={activeForm.website}
                  onChange={(e) => setActiveForm({ ...activeForm, website: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="www.startup.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sector
                </label>
                <select
                  value={activeForm.sector}
                  onChange={(e) => setActiveForm({ ...activeForm, sector: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Sector</option>
                  {Object.values(StartupDomain).map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fee Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={activeForm.fee_amount}
                  onChange={(e) => setActiveForm({ ...activeForm, fee_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ESOP Percentage
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={activeForm.esop_percentage}
                  onChange={(e) => setActiveForm({ ...activeForm, esop_percentage: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setActiveForm({
                      startup_name: '',
                      email_id: '',
                      website: '',
                      sector: '',
                      fee_amount: '',
                      esop_percentage: '',
                    });
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                {editingId ? 'Update' : 'Add'} Startup
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Completed Mentoring Form */}
      {activeSection === 'completed' && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Add Previously Mentored Startup</h3>
          <form onSubmit={handleCompletedSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Startup Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={completedForm.startup_name}
                  onChange={(e) => setCompletedForm({ ...completedForm, startup_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter startup name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={completedForm.email_id}
                  onChange={(e) => setCompletedForm({ ...completedForm, email_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="founder@startup.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={completedForm.website}
                  onChange={(e) => setCompletedForm({ ...completedForm, website: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="www.startup.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sector
                </label>
                <select
                  value={completedForm.sector}
                  onChange={(e) => setCompletedForm({ ...completedForm, sector: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Sector</option>
                  {Object.values(StartupDomain).map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fee Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={completedForm.fee_amount}
                  onChange={(e) => setCompletedForm({ ...completedForm, fee_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ESOP Percentage
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={completedForm.esop_percentage}
                  onChange={(e) => setCompletedForm({ ...completedForm, esop_percentage: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setCompletedForm({
                      startup_name: '',
                      email_id: '',
                      website: '',
                      sector: '',
                      fee_amount: '',
                      esop_percentage: '',
                    });
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                {editingId ? 'Update' : 'Add'} Startup
              </Button>
            </div>
          </form>
        </Card>
      )}


      {/* Founded Startups Form */}
      {activeSection === 'founded' && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Add Founded Startup</h3>
          <form onSubmit={handleFoundedSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Startup Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={foundedForm.startup_name}
                  onChange={(e) => setFoundedForm({ ...foundedForm, startup_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter startup name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={foundedForm.email_id}
                  onChange={(e) => setFoundedForm({ ...foundedForm, email_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="founder@startup.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={foundedForm.website}
                  onChange={(e) => setFoundedForm({ ...foundedForm, website: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="www.startup.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sector
                </label>
                <select
                  value={foundedForm.sector}
                  onChange={(e) => setFoundedForm({ ...foundedForm, sector: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Sector</option>
                  {Object.values(StartupDomain).map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                Add Founded Startup
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};

export default MentorDataForm;

