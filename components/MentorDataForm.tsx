import React, { useState, useEffect } from 'react';
import { Startup, StartupDomain } from '../types';
import { Plus, X, Save, Edit, Trash2, Eye, Upload, Link as LinkIcon, Cloud } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
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
    proof_documents: [] as Array<{
      document_type: string;
      google_drive_link?: string;
      uploaded_file_url?: string;
      file_name?: string;
    }>,
  });

  // State for managing proof documents
  const [proofDocumentType, setProofDocumentType] = useState('');
  const [proofGoogleDriveLink, setProofGoogleDriveLink] = useState('');
  const [proofUploadFile, setProofUploadFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

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
        // Note: fee_amount and esop_percentage are automatically calculated for TMS startups
        const updateData: any = {
          startup_id: null,
          status: status,
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
        // Note: fee_amount and esop_percentage are automatically calculated for TMS startups
        const insertData: any = {
          mentor_id: actualMentorId,
          startup_id: null,
          status: status,
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
      
      // Store startup_name, email_id, website, sector, position, dates, currently_in_position, and proof_documents in notes as JSON
      const notesData = JSON.stringify({
        startup_name: foundedForm.startup_name,
        email_id: foundedForm.email_id,
        website: foundedForm.website,
        sector: foundedForm.sector,
        position: foundedForm.position,
        from_date: foundedForm.from_date || null,
        to_date: foundedForm.to_date || null,
        currently_in_position: foundedForm.currently_in_position,
        proof_documents: foundedForm.proof_documents || [],
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
        proof_documents: [],
      });
      setEditingId(null);
      setProofDocumentType('');
      setProofGoogleDriveLink('');
      setProofUploadFile(null);
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
                      proof_documents: [],
                    });
                    setProofDocumentType('');
                    setProofGoogleDriveLink('');
                    setProofUploadFile(null);
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

            {/* Proof of Startup Section */}
            <div className="border-t pt-4 mt-4">
              <h4 className="text-base font-semibold text-slate-700 mb-4">Proof of Startup Documents</h4>
              
              {/* Display existing proof documents */}
              {foundedForm.proof_documents && foundedForm.proof_documents.length > 0 && (
                <div className="mb-4 space-y-2">
                  {foundedForm.proof_documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">{doc.document_type}</p>
                        {doc.google_drive_link && (
                          <a 
                            href={doc.google_drive_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                          >
                            <LinkIcon className="h-3 w-3" />
                            Google Drive Link
                          </a>
                        )}
                        {doc.uploaded_file_url && (
                          <a 
                            href={doc.uploaded_file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                          >
                            <Upload className="h-3 w-3" />
                            {doc.file_name || 'Uploaded File'}
                          </a>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const updatedDocs = foundedForm.proof_documents.filter((_, i) => i !== index);
                          setFoundedForm({ ...foundedForm, proof_documents: updatedDocs });
                        }}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new proof document */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <Select
                    label="Document Type"
                    value={proofDocumentType}
                    onChange={(e) => setProofDocumentType(e.target.value)}
                    className="w-full"
                  >
                    <option value="">Select Document Type</option>
                    <option value="DPIIT Certificate">DPIIT Certificate</option>
                    <option value="Registration Certificate">Registration Certificate</option>
                    <option value="Udhyam Adhar">Udhyam Adhar</option>
                    <option value="Pan Card">Pan Card</option>
                    <option value="Other">Other</option>
                  </Select>
                </div>

                {proofDocumentType && (
                  <div className="space-y-4">
                    {/* Cloud Drive Link Input */}
                    <div>
                      <Input
                        type="url"
                        value={proofGoogleDriveLink}
                        onChange={(e) => setProofGoogleDriveLink(e.target.value)}
                        placeholder="Paste your cloud drive link here..."
                        className="w-full"
                      />
                    </div>

                    {/* OR Separator */}
                    <div className="text-center">
                      <span className="text-sm text-slate-500">OR</span>
                    </div>

                    {/* Two Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                      {/* Cloud Drive Button */}
                      <Button
                        type="button"
                        variant="primary"
                        onClick={async () => {
                          if (!proofDocumentType) {
                            alert('Please select a document type');
                            return;
                          }

                          if (!proofGoogleDriveLink) {
                            alert('Please paste your cloud drive link');
                            return;
                          }

                          // Add document to proof_documents array
                          const newDocument = {
                            document_type: proofDocumentType,
                            google_drive_link: proofGoogleDriveLink,
                          };

                          setFoundedForm({
                            ...foundedForm,
                            proof_documents: [...(foundedForm.proof_documents || []), newDocument],
                          });

                          // Reset form fields
                          setProofDocumentType('');
                          setProofGoogleDriveLink('');
                          setProofUploadFile(null);
                        }}
                        disabled={!proofGoogleDriveLink || !proofDocumentType}
                        className="w-full sm:w-auto flex items-center justify-center gap-2"
                      >
                        <LinkIcon className="h-4 w-4" />
                        Cloud Drive (Recommended)
                      </Button>

                      {/* Upload File Button */}
                      <label className="w-full sm:w-auto">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            if (!proofDocumentType) {
                              alert('Please select a document type first');
                              e.target.value = '';
                              return;
                            }

                            setProofUploadFile(file);

                            // Get auth user ID for file upload
                            const { data: { user: authUser } } = await supabase.auth.getUser();
                            if (!authUser) {
                              alert('Not authenticated. Please log in again.');
                              return;
                            }
                            const actualMentorId = authUser.id;

                            setUploadingProof(true);
                            try {
                              const fileExt = file.name.split('.').pop();
                              const storageFileName = `proof-${Date.now()}.${fileExt}`;
                              const filePath = `${actualMentorId}/${storageFileName}`;

                              const { error: uploadError } = await supabase.storage
                                .from('mentor-proof-documents')
                                .upload(filePath, file, {
                                  cacheControl: '3600',
                                  upsert: false
                                });

                              if (uploadError) {
                                throw uploadError;
                              }

                              const { data: { publicUrl } } = supabase.storage
                                .from('mentor-proof-documents')
                                .getPublicUrl(filePath);

                              // Add document to proof_documents array
                              const newDocument = {
                                document_type: proofDocumentType,
                                uploaded_file_url: publicUrl,
                                file_name: file.name,
                              };

                              setFoundedForm({
                                ...foundedForm,
                                proof_documents: [...(foundedForm.proof_documents || []), newDocument],
                              });

                              // Reset form fields
                              setProofDocumentType('');
                              setProofGoogleDriveLink('');
                              setProofUploadFile(null);
                              e.target.value = '';
                            } catch (error: any) {
                              console.error('Error uploading proof document:', error);
                              let errorMessage = 'Failed to upload file';
                              
                              if (error.message?.includes('Bucket not found') || error.message?.includes('does not exist')) {
                                errorMessage = 'Storage bucket not found. Please contact administrator to set up mentor-proof-documents bucket.';
                              } else if (error.message?.includes('new row violates row-level security') || error.message?.includes('permission')) {
                                errorMessage = 'Permission denied. Please check storage bucket policies. Error: ' + error.message;
                              } else if (error.message) {
                                errorMessage = `Upload failed: ${error.message}`;
                              }
                              
                              alert(errorMessage);
                              setProofUploadFile(null);
                              e.target.value = '';
                            } finally {
                              setUploadingProof(false);
                            }
                          }}
                          className="hidden"
                          disabled={uploadingProof || !proofDocumentType}
                          id="proof-file-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={uploadingProof || !proofDocumentType}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 border-blue-500 text-blue-600 hover:bg-blue-50 bg-white"
                          onClick={() => {
                            if (!proofDocumentType) {
                              alert('Please select a document type first');
                              return;
                            }
                            const fileInput = document.getElementById('proof-file-upload') as HTMLInputElement;
                            fileInput?.click();
                          }}
                        >
                          {uploadingProof ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Cloud className="h-4 w-4" />
                              Upload File
                            </>
                          )}
                        </Button>
                      </label>
                    </div>
                  </div>
                )}
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
                      proof_documents: [],
                    });
                    setProofDocumentType('');
                    setProofGoogleDriveLink('');
                    setProofUploadFile(null);
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
                                        proof_documents: notesData.proof_documents || [],
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

