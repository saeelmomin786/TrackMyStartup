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
  initialSection?: 'active' | 'founded';
}

const MentorDataForm: React.FC<MentorDataFormProps> = ({ mentorId, startups, onUpdate, mentorMetrics, initialSection }) => {
  const [activeSection, setActiveSection] = useState<'active' | 'founded'>(initialSection || 'active');
  
  // Update active section when initialSection prop changes
  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combined form state for mentoring (both active and completed)
  const [mentoringForm, setMentoringForm] = useState({
    startup_name: '',
    email_id: '',
    website: '',
    sector: '',
    fee_amount: '',
    esop_percentage: '',
    from_date: '',
    to_date: '',
    currently_mentoring: true,
  });

  // Form states for founded startups
  const [foundedForm, setFoundedForm] = useState({
    startup_name: '',
    email_id: '',
    website: '',
    sector: '',
    position: '',
    from_date: '',
    to_date: '',
    currently_in_position: false,
  });

  const [editingId, setEditingId] = useState<number | null>(null);

  const handleMentoringSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Determine status based on currently_mentoring checkbox
      const status = mentoringForm.currently_mentoring ? 'active' : 'completed';
      
      // Store startup_name, email, website, sector, and dates in notes as JSON
      const notesData = JSON.stringify({
        startup_name: mentoringForm.startup_name,
        email_id: mentoringForm.email_id,
        website: mentoringForm.website,
        sector: mentoringForm.sector,
        from_date: mentoringForm.from_date || null,
        to_date: mentoringForm.currently_mentoring ? null : (mentoringForm.to_date || null),
      });

      if (editingId) {
        // Update existing assignment
        const updateData: any = {
          startup_id: null,
          status: status,
          fee_amount: parseFloat(mentoringForm.fee_amount) || 0,
          fee_currency: 'USD',
          esop_percentage: parseFloat(mentoringForm.esop_percentage) || 0,
          notes: notesData,
        };
        
        // Set assigned_at if from_date is provided
        if (mentoringForm.from_date) {
          updateData.assigned_at = new Date(mentoringForm.from_date).toISOString();
        }
        
        // Set completed_at if not currently mentoring
        if (!mentoringForm.currently_mentoring) {
          updateData.completed_at = mentoringForm.to_date 
            ? new Date(mentoringForm.to_date).toISOString() 
            : new Date().toISOString();
        } else {
          updateData.completed_at = null;
        }
        
        const { error } = await supabase
          .from('mentor_startup_assignments')
          .update(updateData)
          .eq('id', editingId)
          .eq('mentor_id', mentorId);

        if (error) throw error;
      } else {
        // Create new assignment
        const insertData: any = {
          mentor_id: mentorId,
          startup_id: null,
          status: status,
          fee_amount: parseFloat(mentoringForm.fee_amount) || 0,
          fee_currency: 'USD',
          esop_percentage: parseFloat(mentoringForm.esop_percentage) || 0,
          notes: notesData,
        };
        
        // Set assigned_at if from_date is provided
        if (mentoringForm.from_date) {
          insertData.assigned_at = new Date(mentoringForm.from_date).toISOString();
        }
        
        // Set completed_at if not currently mentoring
        if (!mentoringForm.currently_mentoring) {
          insertData.completed_at = mentoringForm.to_date 
            ? new Date(mentoringForm.to_date).toISOString() 
            : new Date().toISOString();
        }
        
        const { error } = await supabase
          .from('mentor_startup_assignments')
          .insert(insertData);

        if (error) throw error;
      }

      // Reset form
      setMentoringForm({
        startup_name: '',
        email_id: '',
        website: '',
        sector: '',
        fee_amount: '',
        esop_percentage: '',
        from_date: '',
        to_date: '',
        currently_mentoring: true,
      });
      setEditingId(null);
      onUpdate();
    } catch (error) {
      console.error('Error saving mentoring:', error);
      alert('Error saving data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFoundedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Store startup_name, email_id, website, sector, position, dates, and currently_in_position in notes as JSON
      const notesData = JSON.stringify({
        startup_name: foundedForm.startup_name,
        email_id: foundedForm.email_id,
        website: foundedForm.website,
        sector: foundedForm.sector,
        position: foundedForm.position,
        from_date: foundedForm.from_date || null,
        to_date: foundedForm.to_date || null,
        currently_in_position: foundedForm.currently_in_position,
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
      setFoundedForm({ 
        startup_name: '', 
        email_id: '', 
        website: '', 
        sector: '', 
        position: '',
        from_date: '',
        to_date: '',
        currently_in_position: false,
      });
      onUpdate();
    } catch (error) {
      console.error('Error saving founded startup:', error);
      alert('Error saving data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (assignment: MentorAssignment) => {
    // Parse notes to get startup_name, email_id, website, sector, and dates
    let startupName = '';
    let emailId = '';
    let website = '';
    let sector = '';
    let fromDate = '';
    let toDate = '';
    
    if (assignment.notes) {
      try {
        const notesData = JSON.parse(assignment.notes);
        startupName = notesData.startup_name || '';
        emailId = notesData.email_id || '';
        website = notesData.website || '';
        sector = notesData.sector || '';
        fromDate = notesData.from_date || '';
        toDate = notesData.to_date || '';
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
    
    // If from_date not in notes, use assigned_at
    if (!fromDate && assignment.assigned_at) {
      fromDate = assignment.assigned_at.split('T')[0]; // Extract date part
    }
    
    // If to_date not in notes but completed_at exists, use completed_at
    if (!toDate && assignment.completed_at) {
      toDate = assignment.completed_at.split('T')[0]; // Extract date part
    }
    
    // Determine if currently mentoring based on status
    const currentlyMentoring = assignment.status === 'active';

    setMentoringForm({
      startup_name: startupName,
      email_id: emailId,
      website: website,
      sector: sector,
      fee_amount: assignment.fee_amount.toString(),
      esop_percentage: assignment.esop_percentage.toString(),
      from_date: fromDate,
      to_date: toDate,
      currently_mentoring: currentlyMentoring,
    });
    setActiveSection('active');
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
          Mentoring
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
          Startup Experience
        </button>
      </div>

      {/* Mentoring Form (Combined Active and Completed) */}
      {activeSection === 'active' && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Add Mentoring</h3>
          <form onSubmit={handleMentoringSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Startup Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={mentoringForm.startup_name}
                  onChange={(e) => setMentoringForm({ ...mentoringForm, startup_name: e.target.value })}
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
                  value={mentoringForm.email_id}
                  onChange={(e) => setMentoringForm({ ...mentoringForm, email_id: e.target.value })}
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
                  value={mentoringForm.website}
                  onChange={(e) => setMentoringForm({ ...mentoringForm, website: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="www.startup.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sector
                </label>
                <select
                  value={mentoringForm.sector}
                  onChange={(e) => setMentoringForm({ ...mentoringForm, sector: e.target.value })}
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
                  value={mentoringForm.fee_amount}
                  onChange={(e) => setMentoringForm({ ...mentoringForm, fee_amount: e.target.value })}
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
                  value={mentoringForm.esop_percentage}
                  onChange={(e) => setMentoringForm({ ...mentoringForm, esop_percentage: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={mentoringForm.from_date}
                  onChange={(e) => setMentoringForm({ ...mentoringForm, from_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {!mentoringForm.currently_mentoring && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={mentoringForm.to_date}
                    onChange={(e) => setMentoringForm({ ...mentoringForm, to_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="currently_mentoring"
                  checked={mentoringForm.currently_mentoring}
                  onChange={(e) => {
                    setMentoringForm({ 
                      ...mentoringForm, 
                      currently_mentoring: e.target.checked,
                      to_date: e.target.checked ? '' : mentoringForm.to_date
                    });
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="currently_mentoring" className="ml-2 block text-sm font-medium text-slate-700">
                  Currently Mentoring
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setMentoringForm({
                      startup_name: '',
                      email_id: '',
                      website: '',
                      sector: '',
                      fee_amount: '',
                      esop_percentage: '',
                      from_date: '',
                      to_date: '',
                      currently_mentoring: true,
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


      {/* Startup Experience Form */}
      {activeSection === 'founded' && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Add Startup Experience</h3>
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
                  Founder Email ID <span className="text-red-500">*</span>
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  value={foundedForm.position}
                  onChange={(e) => setFoundedForm({ ...foundedForm, position: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., CEO, CTO, Co-founder"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={foundedForm.from_date}
                  onChange={(e) => setFoundedForm({ ...foundedForm, from_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={foundedForm.to_date}
                  onChange={(e) => setFoundedForm({ ...foundedForm, to_date: e.target.value })}
                  disabled={foundedForm.currently_in_position}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="currently_in_position"
                  checked={foundedForm.currently_in_position}
                  onChange={(e) => {
                    setFoundedForm({ 
                      ...foundedForm, 
                      currently_in_position: e.target.checked,
                      to_date: e.target.checked ? '' : foundedForm.to_date
                    });
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="currently_in_position" className="ml-2 block text-sm font-medium text-slate-700">
                  Currently in Position
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                Add Startup Experience
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};

export default MentorDataForm;

