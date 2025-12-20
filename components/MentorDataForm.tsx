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
    currently_mentoring: false,
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
      // Validate required date fields
      if (!mentoringForm.from_date) {
        alert('Please select a From Date');
        setIsSubmitting(false);
        return;
      }
      
      if (!mentoringForm.currently_mentoring && !mentoringForm.to_date) {
        alert('Please select a To Date or check "Currently Mentoring"');
        setIsSubmitting(false);
        return;
      }
      
      // Verify authentication and get auth user ID
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error('Not authenticated. Please log in again.');
      }
      
      // Use auth user ID instead of mentorId (which might be profile ID)
      const actualMentorId = authUser.id;
      
      if (mentorId !== actualMentorId) {
        console.warn('⚠️ mentorId mismatch - using auth.uid() instead:', { 
          providedMentorId: mentorId, 
          authUserId: actualMentorId 
        });
      }
      
      console.log('✅ Authentication verified:', { providedMentorId: mentorId, authUserId: actualMentorId });
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
        
        console.log('Updating mentoring data:', { editingId, actualMentorId, updateData });
        const { error, data } = await (supabase
          .from('mentor_startup_assignments') as any)
          .update(updateData)
          .eq('id', editingId)
          .eq('mentor_id', actualMentorId)
          .select();

        if (error) {
          console.error('Error updating mentoring assignment:', error);
          throw error;
        }
      } else {
        // Create new assignment - use auth user ID (already fetched above)
        const insertData: any = {
          mentor_id: actualMentorId,
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
        
        console.log('Inserting mentoring data:', { actualMentorId, insertData });
        const { error, data } = await supabase
          .from('mentor_startup_assignments')
          .insert(insertData as any)
          .select();

        if (error) {
          console.error('Error inserting mentoring assignment:', error);
          if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
            alert('Permission denied. Please ensure RLS policies are properly configured. Error: ' + error.message);
          } else {
            alert('Error saving data: ' + error.message);
          }
          throw error;
        }
        console.log('Successfully inserted:', data);
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
        currently_mentoring: false,
      });
      setEditingId(null);
      onUpdate();
    } catch (error: any) {
      console.error('Error saving mentoring:', error);
      // Error message already shown in the specific error handlers above
      if (!error?.message || (!error.message.includes('Permission') && !error.message.includes('permission'))) {
        alert('Error saving data. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFoundedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required date fields
      if (!foundedForm.from_date) {
        alert('Please select a From Date');
        setIsSubmitting(false);
        return;
      }
      
      if (!foundedForm.currently_in_position && !foundedForm.to_date) {
        alert('Please either check "Currently in Position" or select a To Date');
        setIsSubmitting(false);
        return;
      }
      
      // Verify authentication and get auth user ID
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error('Not authenticated. Please log in again.');
      }
      
      // Use auth user ID instead of mentorId (which might be profile ID)
      const actualMentorId = authUser.id;
      
      if (mentorId !== actualMentorId) {
        console.warn('⚠️ mentorId mismatch - using auth.uid() instead:', { 
          providedMentorId: mentorId, 
          authUserId: actualMentorId 
        });
      }
      
      console.log('✅ Authentication verified for founded startup:', { providedMentorId: mentorId, authUserId: actualMentorId });
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

      if (editingId) {
        // Update existing founded startup - use auth user ID (already fetched above)
        console.log('Updating founded startup:', { editingId, actualMentorId });
        const { error, data } = await (supabase
          .from('mentor_founded_startups') as any)
          .update({
            notes: notesData,
          })
          .eq('id', editingId)
          .eq('mentor_id', actualMentorId)
          .select();

        if (error) {
          console.error('Error updating founded startup:', error);
          if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
            alert('Permission denied. Please ensure RLS policies are properly configured. Error: ' + error.message);
          } else {
            alert('Error updating data: ' + error.message);
          }
          throw error;
        } else {
          console.log('Successfully updated founded startup:', data);
        }
      } else {
        // Create new founded startup - use auth user ID (already fetched above)
        console.log('Inserting founded startup:', { actualMentorId });
        const { error, data } = await supabase
          .from('mentor_founded_startups')
          .insert({
            mentor_id: actualMentorId,
            startup_id: null, // Nullable for manually entered startups
            notes: notesData,
          } as any)
          .select();

        if (error) {
          console.error('Error inserting founded startup:', error);
          if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
            alert('Permission denied. Please ensure RLS policies are properly configured. Error: ' + error.message);
          } else if (error.code !== '23505') {
            alert('Error updating data: ' + error.message);
            throw error;
          }
        } else {
          console.log('Successfully updated founded startup:', data);
        }
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
      setEditingId(null);
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
        website = (assignment.startup as any)?.domain || '';
        sector = assignment.startup?.sector || '';
      }
      } else if (assignment.startup) {
        startupName = assignment.startup.name;
        website = (assignment.startup as any).domain || '';
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
            setMentoringForm({
              startup_name: '',
              email_id: '',
              website: '',
              sector: '',
              fee_amount: '',
              esop_percentage: '',
              from_date: '',
              to_date: '',
              currently_mentoring: false,
            });
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
        <>
          <Card>
            <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit Mentoring' : 'Add Mentoring'}</h3>
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
                  From Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={mentoringForm.from_date}
                  onChange={(e) => setMentoringForm({ ...mentoringForm, from_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  To Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required={!mentoringForm.currently_mentoring}
                  value={mentoringForm.to_date}
                  onChange={(e) => setMentoringForm({ ...mentoringForm, to_date: e.target.value })}
                  disabled={mentoringForm.currently_mentoring}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

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
                      currently_mentoring: false,
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

          {/* Mentoring Data Table */}
          {mentorMetrics && (mentorMetrics.activeAssignments.length > 0 || mentorMetrics.completedAssignments.length > 0) && (
            <Card>
              <h3 className="text-lg font-semibold mb-4">Mentoring Data</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Website</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sector</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fee</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ESOP %</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">From Date</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">To Date</th>
                      <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {[...mentorMetrics.activeAssignments, ...mentorMetrics.completedAssignments].map(assignment => {
                      // Parse notes to get startup_name, email_id, website, and sector
                      let startupName = assignment.startup?.name || `Startup #${assignment.startup_id || 'N/A'}`;
                      let emailId = '';
                      let website = '';
                      let sector = '';
                      let fromDate = '';
                      let toDate = '';
                      
                      if (assignment.notes) {
                        try {
                          const notesData = JSON.parse(assignment.notes);
                          startupName = notesData.startup_name || startupName;
                          emailId = notesData.email_id || '';
                          website = notesData.website || '';
                          sector = notesData.sector || '';
                          fromDate = notesData.from_date || '';
                          toDate = notesData.to_date || '';
                        } catch (e) {
                          // Notes is not JSON, use startup data
                          website = (assignment.startup as any)?.domain || '';
                          sector = assignment.startup?.sector || '';
                        }
                      } else if (assignment.startup) {
                        website = (assignment.startup as any).domain || '';
                        sector = assignment.startup.sector || '';
                      }
                      
                      // If from_date not in notes, use assigned_at
                      if (!fromDate && assignment.assigned_at) {
                        fromDate = assignment.assigned_at.split('T')[0];
                      }
                      
                      // If to_date not in notes but completed_at exists, use completed_at
                      if (!toDate && assignment.completed_at) {
                        toDate = assignment.completed_at.split('T')[0];
                      }

                      return (
                        <tr key={assignment.id}>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-slate-900">
                            {startupName}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                            {emailId || 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                            {website ? (
                              <a 
                                href={website.startsWith('http') ? website : `https://${website}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:underline"
                              >
                                {website}
                              </a>
                            ) : 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                            {sector || 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              assignment.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : assignment.status === 'completed'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {assignment.status}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                            {mentorService.formatCurrency(assignment.fee_amount || 0, assignment.fee_currency || 'USD')}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                            {assignment.esop_percentage > 0 ? `${assignment.esop_percentage}%` : 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                            {fromDate || 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                            {toDate || 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(assignment)}
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(assignment.id, assignment.status === 'active' ? 'active' : 'completed')}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}


      {/* Startup Experience Form */}
      {activeSection === 'founded' && (
        <>
          <Card>
            <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit Startup Experience' : 'Add Startup Experience'}</h3>
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
                  From Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={foundedForm.from_date}
                  onChange={(e) => setFoundedForm({ ...foundedForm, from_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  To Date {!foundedForm.currently_in_position && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="date"
                  required={!foundedForm.currently_in_position}
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
                  Currently in Position {!foundedForm.to_date && <span className="text-red-500">*</span>}
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
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                {editingId ? 'Update' : 'Add'} Startup Experience
              </Button>
            </div>
          </form>
        </Card>

          {/* Startup Experience Data Table */}
          {mentorMetrics && mentorMetrics.foundedStartups.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold mb-4">Startup Experience Data</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Website</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sector</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Position</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">From Date</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">To Date</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {mentorMetrics.foundedStartups.map(startup => {
                      // Parse notes to get startup details
                      let startupName = startup.name;
                      let emailId = '';
                      let website = (startup as any).domain || '';
                      let sector = startup.sector || '';
                      let position = '';
                      let fromDate = '';
                      let toDate = '';
                      let currentlyInPosition = false;
                      
                      if (startup.notes) {
                        try {
                          const notesData = JSON.parse(startup.notes);
                          startupName = notesData.startup_name || startupName;
                          emailId = notesData.email_id || '';
                          website = notesData.website || website;
                          sector = notesData.sector || sector;
                          position = notesData.position || '';
                          fromDate = notesData.from_date || '';
                          toDate = notesData.to_date || '';
                          currentlyInPosition = notesData.currently_in_position || false;
                        } catch (e) {
                          // Notes is not JSON, use startup data
                        }
                      }

                      return (
                        <tr key={startup.id}>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-slate-900">
                            {startupName}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                            {emailId || 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                            {website ? (
                              <a 
                                href={website.startsWith('http') ? website : `https://${website}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:underline"
                              >
                                {website}
                              </a>
                            ) : 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                            {sector || 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                            {position || 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                            {fromDate || 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                            {toDate || (currentlyInPosition ? 'Present' : 'N/A')}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              currentlyInPosition 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {currentlyInPosition ? 'Current' : 'Past'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Parse notes to populate form
                                  if (startup.notes) {
                                    try {
                                      const notesData = JSON.parse(startup.notes);
                                      setFoundedForm({
                                        startup_name: notesData.startup_name || startup.name,
                                        email_id: notesData.email_id || '',
                                        website: notesData.website || (startup as any).domain || '',
                                        sector: notesData.sector || startup.sector || '',
                                        position: notesData.position || '',
                                        from_date: notesData.from_date || '',
                                        to_date: notesData.to_date || '',
                                        currently_in_position: notesData.currently_in_position || false,
                                      });
                                      setEditingId(startup.id);
                                    } catch (e) {
                                      // Handle error
                                    }
                                  }
                                }}
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(startup.id, 'founded')}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default MentorDataForm;

