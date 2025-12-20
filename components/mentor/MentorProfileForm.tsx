import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Save, Upload, Image as ImageIcon, Video, ChevronDown, X, Plus, Edit, Trash2, Briefcase } from 'lucide-react';
import { MentorMetrics } from '../../lib/mentorService';
import Modal from '../ui/Modal';
import MentorDataForm from '../MentorDataForm';
import { Startup } from '../../types';

interface MentorProfile {
  id?: string;
  user_id: string;
  mentor_name?: string;
  mentor_type?: string;
  location?: string;
  website?: string;
  linkedin_link?: string;
  email?: string;
  expertise_areas?: string[];
  sectors?: string[];
  mentoring_stages?: string[];
  years_of_experience?: number;
  companies_mentored?: number;
  companies_founded?: number;
  current_role?: string;
  previous_companies?: string[];
  mentoring_experience?: string;
  mentoring_approach?: string;
  availability?: string;
  preferred_engagement?: string;
  fee_type?: string;
  fee_amount_min?: number;
  fee_amount_max?: number;
  fee_currency?: string;
  equity_amount_min?: number;
  equity_amount_max?: number;
  fee_description?: string;
  logo_url?: string;
  video_url?: string;
  media_type?: 'logo' | 'video';
}

interface MentorProfileFormProps {
  currentUser: { id: string; email: string; name?: string; mentor_code?: string };
  mentorMetrics?: MentorMetrics | null;
  onSave?: (profile: MentorProfile) => void;
  onProfileChange?: (profile: MentorProfile) => void;
  isViewOnly?: boolean;
  onNavigateToDashboard?: (section?: 'active' | 'founded') => void;
  startups?: Startup[];
  onMetricsUpdate?: () => void;
}

const MentorProfileForm: React.FC<MentorProfileFormProps> = ({ 
  currentUser, 
  mentorMetrics,
  onSave,
  onProfileChange,
  isViewOnly = false,
  onNavigateToDashboard,
  startups = [],
  onMetricsUpdate
}) => {
  const [isEditing, setIsEditing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // Get auth_user_id - mentor_profiles uses auth_user_id, not profile ID
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<MentorProfile>({
    user_id: '', // Will be set to auth_user_id after loading
    mentor_name: currentUser.name || '',
    media_type: 'logo',
    expertise_areas: [],
    sectors: [],
    mentoring_stages: [],
    previous_companies: []
  });
  const [isExpertiseOpen, setIsExpertiseOpen] = useState(false);
  const [isSectorsOpen, setIsSectorsOpen] = useState(false);
  const [isStagesOpen, setIsStagesOpen] = useState(false);
  const [showAddFormModal, setShowAddFormModal] = useState(false);
  const [formSection, setFormSection] = useState<'active' | 'founded'>('active');
  const [showProfessionalExpModal, setShowProfessionalExpModal] = useState(false);
  const expertiseRef = useRef<HTMLDivElement>(null);
  const sectorsRef = useRef<HTMLDivElement>(null);
  const stagesRef = useRef<HTMLDivElement>(null);
  
  // Professional Experience state
  const [professionalExperiences, setProfessionalExperiences] = useState<any[]>([]);
  const [editingExpId, setEditingExpId] = useState<number | null>(null);
  const [expForm, setExpForm] = useState({
    company: '',
    position: '',
    description: '',
    from_date: '',
    to_date: '',
    currently_working: false,
  });
  
  const handleOpenAddForm = (section: 'active' | 'founded') => {
    setFormSection(section);
    setShowAddFormModal(true);
  };
  
  const handleCloseAddForm = () => {
    setShowAddFormModal(false);
    if (onMetricsUpdate) {
      onMetricsUpdate();
    }
  };

  const mentorTypes = ['Industry Expert', 'Serial Entrepreneur', 'Corporate Executive', 'Academic', 'Investor', 'Other'];
  const expertiseAreas = ['Product Development', 'Marketing', 'Sales', 'Finance', 'Operations', 'HR', 'Technology', 'Strategy', 'Fundraising', 'Legal', 'Compliance', 'International Expansion'];
  const sectors = ['SaaS', 'E-commerce', 'FinTech', 'HealthTech', 'EdTech', 'AgriTech', 'AI/ML', 'Blockchain', 'Gaming', 'Media', 'Real Estate', 'Manufacturing', 'Other'];
  const mentoringStages = ['Ideation', 'Proof of Concept (PoC)', 'Prototype / MVP', 'Pilot Testing', 'Product–Market Fit (PMF)', 'Early Traction', 'Growth Stage', 'Scaling & Expansion', 'Maturity', 'Exit (IPO / Acquisition)'];
  const availabilityOptions = ['Once per week', 'Once per month', 'Once per quarterly', 'Yearly', 'As per requirement'];
  const engagementOptions = ['1-on-1', 'Group Sessions', 'Workshops', 'Advisory Board', 'All of the above'];
  const feeTypes = ['Free', 'Fees', 'Equity', 'Hybrid'];
  const currencies = ['USD', 'INR', 'EUR', 'GBP', 'SGD', 'AED'];

  useEffect(() => {
    loadProfile();
    loadProfessionalExperiences();
  }, [currentUser.id]);
  
  const loadProfessionalExperiences = async () => {
    try {
      // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.error('No auth user found');
        return;
      }
      const userId = authUser.id;
      
      const { data, error } = await supabase
        .from('mentor_professional_experience')
        .select('*')
        .eq('mentor_id', userId) // Use auth_user_id, not profile ID
        .order('from_date', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found - this is okay
          setProfessionalExperiences([]);
          return;
        }
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.error('Table mentor_professional_experience does not exist. Please run CREATE_MENTOR_PROFESSIONAL_EXPERIENCE_TABLE.sql');
          setProfessionalExperiences([]);
          return;
        }
        console.error('Error loading professional experiences:', error);
        setProfessionalExperiences([]);
        return;
      }

      if (data) {
        setProfessionalExperiences(data);
      }
    } catch (error) {
      console.error('Error loading professional experiences:', error);
    }
  };
  
  const calculateTotalExperience = () => {
    let totalMonths = 0;
    
    professionalExperiences.forEach(exp => {
      const fromDate = new Date(exp.from_date);
      const toDate = exp.currently_working || !exp.to_date 
        ? new Date() 
        : new Date(exp.to_date);
      
      const months = (toDate.getFullYear() - fromDate.getFullYear()) * 12 
        + (toDate.getMonth() - fromDate.getMonth());
      
      totalMonths += months;
    });
    
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    
    if (years === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else if (months === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`;
    } else {
      return `${years} year${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`;
    }
  };
  
  const handleExpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
      let userIdForExp = authUserId;
      if (!userIdForExp) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          alert('Not authenticated');
          return;
        }
        userIdForExp = authUser.id;
        setAuthUserId(userIdForExp);
      }
      
      const expData: any = {
        mentor_id: userIdForExp, // Use auth_user_id, not profile ID
        company: expForm.company,
        position: expForm.position,
        description: expForm.description,
        from_date: expForm.from_date,
        currently_working: expForm.currently_working,
      };
      
      if (!expForm.currently_working && expForm.to_date) {
        expData.to_date = expForm.to_date;
      } else {
        expData.to_date = null;
      }
      
      if (editingExpId) {
        console.log('Updating professional experience:', { editingExpId, userIdForExp, expData });
        const { error, data } = await supabase
          .from('mentor_professional_experience')
          .update(expData)
          .eq('id', editingExpId)
          .eq('mentor_id', userIdForExp) // Use auth_user_id, not profile ID
          .select();
        
        if (error) {
          console.error('Error updating professional experience:', error);
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            alert('The professional experience table does not exist. Please run the CREATE_MENTOR_PROFESSIONAL_EXPERIENCE_TABLE.sql script first.');
          } else if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
            alert('Permission denied. Please ensure RLS policies are properly configured. Error: ' + error.message);
          } else {
            alert('Error updating professional experience: ' + error.message);
          }
          throw error;
        }
        console.log('Successfully updated professional experience:', data);
      } else {
        // Ensure mentor_id is set to auth_user_id in insert
        console.log('Inserting professional experience:', { userIdForExp, expData });
        const { error, data } = await supabase
          .from('mentor_professional_experience')
          .insert({ ...expData, mentor_id: userIdForExp }) // Use auth_user_id, not profile ID
          .select();
        
        if (error) {
          console.error('Error inserting professional experience:', error);
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            alert('The professional experience table does not exist. Please run the CREATE_MENTOR_PROFESSIONAL_EXPERIENCE_TABLE.sql script first.');
          } else if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
            alert('Permission denied. Please ensure RLS policies are properly configured. Error: ' + error.message);
          } else {
            alert('Error saving professional experience: ' + error.message);
          }
          throw error;
        }
        console.log('Successfully inserted professional experience:', data);
      }
      
      // Reset form
      setExpForm({
        company: '',
        position: '',
        description: '',
        from_date: '',
        to_date: '',
        currently_working: false,
      });
      setEditingExpId(null);
      loadProfessionalExperiences();
    } catch (error) {
      console.error('Error saving professional experience:', error);
      alert('Error saving professional experience. Please try again.');
    }
  };
  
  const handleEditExp = (exp: any) => {
    setExpForm({
      company: exp.company || '',
      position: exp.position || '',
      description: exp.description || '',
      from_date: exp.from_date || '',
      to_date: exp.to_date || '',
      currently_working: exp.currently_working || false,
    });
    setEditingExpId(exp.id);
  };
  
  const handleDeleteExp = async (id: number) => {
    if (!confirm('Are you sure you want to delete this professional experience?')) return;
    
    try {
      // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
      let userIdForExp = authUserId;
      if (!userIdForExp) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          alert('Not authenticated');
          return;
        }
        userIdForExp = authUser.id;
        setAuthUserId(userIdForExp);
      }
      
      console.log('Deleting professional experience:', { id, userIdForExp });
      const { error } = await supabase
        .from('mentor_professional_experience')
        .delete()
        .eq('id', id)
        .eq('mentor_id', userIdForExp); // Use auth_user_id, not profile ID
      
      if (error) {
        console.error('Error deleting professional experience:', error);
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          alert('The professional experience table does not exist. Please run the CREATE_MENTOR_PROFESSIONAL_EXPERIENCE_TABLE.sql script first.');
        } else if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
          alert('Permission denied. Please ensure RLS policies are properly configured. Error: ' + error.message);
        } else {
          alert('Error deleting professional experience: ' + error.message);
        }
        throw error;
      }
      loadProfessionalExperiences();
    } catch (error: any) {
      console.error('Error deleting professional experience:', error);
      // Error message already shown above
      if (!error?.message || (!error.message.includes('does not exist') && !error.message.includes('Permission'))) {
        alert('Error deleting professional experience. Please try again.');
      }
    }
  };

  // Update counts when metrics change
  useEffect(() => {
    if (mentorMetrics) {
      setProfile(prev => {
        const updated = {
          ...prev,
          companies_mentored: mentorMetrics.startupsMentoring + mentorMetrics.startupsMentoredPreviously,
          companies_founded: mentorMetrics.startupsFounded
        };
        if (onProfileChange) {
          onProfileChange(updated);
        }
        return updated;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentorMetrics]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (expertiseRef.current && !expertiseRef.current.contains(event.target as Node)) {
        setIsExpertiseOpen(false);
      }
      if (sectorsRef.current && !sectorsRef.current.contains(event.target as Node)) {
        setIsSectorsOpen(false);
      }
      if (stagesRef.current && !stagesRef.current.contains(event.target as Node)) {
        setIsStagesOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadProfile = async () => {
    try {
      // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.error('No auth user found');
        return;
      }
      const userId = authUser.id;
      setAuthUserId(userId); // Store auth_user_id
      
      const { data, error } = await supabase
        .from('mentor_profiles')
        .select('*')
        .eq('user_id', userId) // Use auth_user_id, not profile ID
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        const loadedProfile = {
          ...data,
          user_id: userId, // Use auth_user_id, not profile ID
          expertise_areas: data.expertise_areas || [],
          sectors: data.sectors || [],
          mentoring_stages: data.mentoring_stages || [],
          previous_companies: data.previous_companies || [],
          // Auto-populate from metrics if not set
          companies_mentored: data.companies_mentored || mentorMetrics?.startupsMentoring || 0,
          companies_founded: data.companies_founded || mentorMetrics?.startupsFounded || 0
        };
        setProfile(loadedProfile);
        if (onProfileChange) {
          onProfileChange(loadedProfile);
        }
      } else {
        // Initialize with metrics if available
        const initialProfile = {
          ...profile,
          user_id: userId, // Use auth_user_id, not profile ID
          companies_mentored: mentorMetrics?.startupsMentoring || 0,
          companies_founded: mentorMetrics?.startupsFounded || 0
        };
        setProfile(initialProfile);
        if (onProfileChange) {
          onProfileChange(initialProfile);
        }
      }
    } catch (error) {
      console.error('Error loading mentor profile:', error);
    }
  };

  const handleChange = (field: keyof MentorProfile, value: any) => {
    setProfile(prev => {
      const updated = { ...prev, [field]: value };
      if (onProfileChange) {
        onProfileChange(updated);
      }
      return updated;
    });
  };

  const handleArrayChange = (field: 'expertise_areas' | 'sectors' | 'mentoring_stages', value: string) => {
    setProfile(prev => {
      const currentArray = prev[field] || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      const updated = { ...prev, [field]: newArray };
      if (onProfileChange) {
        onProfileChange(updated);
      }
      return updated;
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP, or SVG)');
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File size too large. Please upload an image smaller than 10MB');
      return;
    }

    try {
      // Get auth user ID for file naming
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        alert('Not authenticated. Please log in again.');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${authUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `mentor-logos/${fileName}`;

      console.log('Uploading logo:', { filePath, fileSize: file.size, fileType: file.type });

      const { error: uploadError } = await supabase.storage
        .from('mentor-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        let errorMessage = 'Failed to upload logo';
        
        if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('does not exist')) {
          errorMessage = 'Storage bucket not found. Please contact administrator to set up mentor-assets bucket.';
        } else if (uploadError.message?.includes('new row violates row-level security') || uploadError.message?.includes('permission')) {
          errorMessage = 'Permission denied. Please check storage bucket policies. Error: ' + uploadError.message;
        } else if (uploadError.message) {
          errorMessage = `Upload failed: ${uploadError.message}`;
        }
        
        alert(errorMessage);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('mentor-assets')
        .getPublicUrl(filePath);

      console.log('Logo uploaded successfully:', publicUrl);
      handleChange('logo_url', publicUrl);
      handleChange('media_type', 'logo');
      alert('Logo uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      alert(`Failed to upload logo: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSave = async () => {
    if (!profile.mentor_name) {
      alert('Please enter mentor name');
      return;
    }

    setIsSaving(true);
    try {
      // Get auth_user_id for saving (use stored authUserId or get fresh)
      let userIdForSave = authUserId;
      if (!userIdForSave) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          alert('Not authenticated');
          setIsSaving(false);
          return;
        }
        userIdForSave = authUser.id;
        setAuthUserId(userIdForSave);
      }
      
      // Auto-populate counts from metrics before saving
      const profileData = {
        ...profile,
        user_id: userIdForSave, // CRITICAL: Use auth_user_id, not profile ID
        companies_mentored: mentorMetrics 
          ? (mentorMetrics.startupsMentoring + mentorMetrics.startupsMentoredPreviously)
          : profile.companies_mentored || 0,
        companies_founded: mentorMetrics?.startupsFounded || profile.companies_founded || 0,
        // Note: Previously Mentored is calculated from startupsMentoredPreviously, not stored separately
        updated_at: new Date().toISOString()
      };

      console.log('Saving mentor profile:', { userIdForSave, profileData });
      const { data, error } = await supabase
        .from('mentor_profiles')
        .upsert(profileData, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving profile:', error);
        let errorMessage = 'Failed to save profile';
        
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          errorMessage = 'The mentor_profiles table does not exist. Please run the UPDATE_MENTOR_PROFILES_TABLE.sql script first.';
        } else if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
          errorMessage = 'Permission denied. Please ensure RLS policies are properly configured. Error: ' + error.message;
        } else if (error.message) {
          errorMessage = `Failed to save profile: ${error.message}`;
        }
        
        alert(errorMessage);
        return;
      }

      console.log('Profile saved successfully:', data);
      setProfile(data);
      setIsEditing(false);
      if (onSave) {
        onSave(data);
      }
      alert('Profile saved successfully!');
    } catch (error: any) {
      console.error('Error saving mentor profile:', error);
      alert(`Failed to save profile: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {/* Header with Edit/Save Button in Top Right */}
      {!isViewOnly && (
        <div className="flex justify-end mb-4">
          <Button
            size="md"
            variant={isEditing ? "primary" : "secondary"}
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : isEditing ? <><Save className="h-4 w-4 mr-2" /> Save</> : <><Edit className="h-4 w-4 mr-2" /> Edit Profile</>}
          </Button>
        </div>
      )}
      
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="text-base font-medium text-slate-700 border-b pb-2">Basic Information</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Mentor Name"
              value={profile.mentor_name || ''}
              onChange={(e) => handleChange('mentor_name', e.target.value)}
              disabled={!isEditing || isViewOnly}
              required
            />
            
            <Select
              label="Mentor Type"
              value={profile.mentor_type || ''}
              onChange={(e) => handleChange('mentor_type', e.target.value)}
              disabled={!isEditing || isViewOnly}
            >
              <option value="">Select Mentor Type</option>
              {mentorTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>

            <Input
              label="Location"
              value={profile.location || ''}
              onChange={(e) => handleChange('location', e.target.value)}
              disabled={!isEditing || isViewOnly}
              placeholder="e.g., San Francisco, CA"
            />

            <Input
              label="Website"
              type="url"
              value={profile.website || ''}
              onChange={(e) => handleChange('website', e.target.value)}
              disabled={!isEditing || isViewOnly}
              placeholder="https://example.com"
            />

            <Input
              label="LinkedIn Link"
              type="url"
              value={profile.linkedin_link || ''}
              onChange={(e) => handleChange('linkedin_link', e.target.value)}
              disabled={!isEditing || isViewOnly}
              placeholder="https://linkedin.com/in/..."
            />

            <Input
              label="Email"
              type="email"
              value={profile.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              disabled={!isEditing || isViewOnly}
              placeholder="contact@example.com"
            />
          </div>
        </div>

        {/* Mentoring Expertise */}
        <div className="space-y-4">
          <h4 className="text-base font-medium text-slate-700 border-b pb-2">Mentoring Expertise</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative" ref={expertiseRef}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expertise Areas</label>
              <div
                onClick={() => !isViewOnly && isEditing && setIsExpertiseOpen(!isExpertiseOpen)}
                className={`block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm cursor-pointer ${
                  !isEditing || isViewOnly ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                    {profile.expertise_areas && profile.expertise_areas.length > 0 ? (
                      profile.expertise_areas.map((area) => (
                        <span
                          key={area}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {area}
                          {isEditing && !isViewOnly && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChange('expertise_areas', profile.expertise_areas?.filter(a => a !== area) || []);
                              }}
                              className="hover:bg-blue-200 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 text-sm">Select areas...</span>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpertiseOpen ? 'transform rotate-180' : ''}`} />
                </div>
              </div>
              {isExpertiseOpen && isEditing && !isViewOnly && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {expertiseAreas.map(area => (
                    <div
                      key={area}
                      onClick={() => handleArrayChange('expertise_areas', area)}
                      className={`px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm ${
                        profile.expertise_areas?.includes(area) ? 'bg-blue-100 font-medium' : ''
                      }`}
                    >
                      {area}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative" ref={sectorsRef}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sectors</label>
              <div
                onClick={() => !isViewOnly && isEditing && setIsSectorsOpen(!isSectorsOpen)}
                className={`block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm cursor-pointer ${
                  !isEditing || isViewOnly ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                    {profile.sectors && profile.sectors.length > 0 ? (
                      profile.sectors.map((sector) => (
                        <span
                          key={sector}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                        >
                          {sector}
                          {isEditing && !isViewOnly && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChange('sectors', profile.sectors?.filter(s => s !== sector) || []);
                              }}
                              className="hover:bg-green-200 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 text-sm">Select sectors...</span>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isSectorsOpen ? 'transform rotate-180' : ''}`} />
                </div>
              </div>
              {isSectorsOpen && isEditing && !isViewOnly && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {sectors.map(sector => (
                    <div
                      key={sector}
                      onClick={() => handleArrayChange('sectors', sector)}
                      className={`px-3 py-2 cursor-pointer hover:bg-green-50 text-sm ${
                        profile.sectors?.includes(sector) ? 'bg-green-100 font-medium' : ''
                      }`}
                    >
                      {sector}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative" ref={stagesRef}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mentoring Stages</label>
              <div
                onClick={() => !isViewOnly && isEditing && setIsStagesOpen(!isStagesOpen)}
                className={`block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm cursor-pointer ${
                  !isEditing || isViewOnly ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                    {profile.mentoring_stages && profile.mentoring_stages.length > 0 ? (
                      profile.mentoring_stages.map((stage) => (
                        <span
                          key={stage}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                        >
                          {stage}
                          {isEditing && !isViewOnly && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChange('mentoring_stages', profile.mentoring_stages?.filter(s => s !== stage) || []);
                              }}
                              className="hover:bg-purple-200 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 text-sm">Select stages...</span>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isStagesOpen ? 'transform rotate-180' : ''}`} />
                </div>
              </div>
              {isStagesOpen && isEditing && !isViewOnly && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {mentoringStages.map(stage => (
                    <div
                      key={stage}
                      onClick={() => handleArrayChange('mentoring_stages', stage)}
                      className={`px-3 py-2 cursor-pointer hover:bg-purple-50 text-sm ${
                        profile.mentoring_stages?.includes(stage) ? 'bg-purple-100 font-medium' : ''
                      }`}
                    >
                      {stage}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Experience */}
        <div className="space-y-4">
          <h4 className="text-base font-medium text-slate-700 border-b pb-2">Experience</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Years of Experience"
              type="number"
              value={profile.years_of_experience?.toString() || ''}
              onChange={(e) => handleChange('years_of_experience', e.target.value ? parseInt(e.target.value) : null)}
              disabled={!isEditing || isViewOnly}
              placeholder="e.g., 10"
            />
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Startup Mentoring
                <span className="ml-2 text-xs text-slate-500">(Active - from dashboard)</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-slate-700 font-medium">
                  {mentorMetrics?.startupsMentoring || 0}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenAddForm('active')}
                  className="flex items-center gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                  title="Add startup to increase count"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add</span>
                </Button>
              </div>
              <input
                type="hidden"
                value={mentorMetrics?.startupsMentoring || 0}
                onChange={() => {}}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Previously Mentored (on TMS)
                <span className="ml-2 text-xs text-slate-500">(Completed - from dashboard)</span>
              </label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-slate-700 font-medium">
                {mentorMetrics?.startupsMentoredPreviously || 0}
              </div>
              <input
                type="hidden"
                value={mentorMetrics?.startupsMentoredPreviously || 0}
                onChange={() => {}}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Verified Startups Mentored (Total)
                <span className="ml-2 text-xs text-slate-500">(Only registered users on TMS - from dashboard)</span>
              </label>
              <div className="px-3 py-2 bg-blue-50 border border-blue-300 rounded-md text-slate-700 font-medium">
                {mentorMetrics?.verifiedStartupsMentored ?? 0}
              </div>
              <input
                type="hidden"
                value={mentorMetrics?.verifiedStartupsMentored ?? 0}
                onChange={() => {}}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Startups Mentored (Total)
                <span className="ml-2 text-xs text-slate-500">(All mentoring - from dashboard)</span>
              </label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-slate-700 font-medium">
                {mentorMetrics ? (
                  mentorMetrics.startupsMentoring + mentorMetrics.startupsMentoredPreviously
                ) : (
                  profile.companies_mentored || 0
                )}
              </div>
              {professionalExperiences.length > 0 && (
                <div className="mt-2 text-xs text-slate-600">
                  <span className="font-medium">Total Professional Experience:</span> {calculateTotalExperience()}
                </div>
              )}
              <input
                type="hidden"
                value={mentorMetrics ? (mentorMetrics.startupsMentoring + mentorMetrics.startupsMentoredPreviously) : (profile.companies_mentored || 0)}
                onChange={() => {}}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Startup Experience
                <span className="ml-2 text-xs text-slate-500">(Verified from your dashboard)</span>
              </label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-slate-700 font-medium">
                {mentorMetrics?.startupsFounded || profile.companies_founded || 0}
              </div>
              <input
                type="hidden"
                value={mentorMetrics?.startupsFounded || profile.companies_founded || 0}
                onChange={() => {}}
              />
            </div>

            <Input
              label="Current Role"
              value={profile.current_role || ''}
              onChange={(e) => handleChange('current_role', e.target.value)}
              disabled={!isEditing || isViewOnly}
              placeholder="e.g., CEO, CTO, Advisor"
            />
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Professional Experience</label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowProfessionalExpModal(true)}
                disabled={!isEditing || isViewOnly}
                className="w-full flex items-center justify-center gap-2"
              >
                <Briefcase className="h-4 w-4" />
                {professionalExperiences.length > 0 ? `Manage Experience (${professionalExperiences.length})` : 'Add Professional Experience'}
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Mentoring Approach</label>
            <textarea
              value={profile.mentoring_approach || ''}
              onChange={(e) => handleChange('mentoring_approach', e.target.value)}
              disabled={!isEditing || isViewOnly}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your mentoring style, approach, and what you bring to startups..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Availability"
              value={profile.availability || ''}
              onChange={(e) => handleChange('availability', e.target.value)}
              disabled={!isEditing || isViewOnly}
            >
              <option value="">Select Availability</option>
              {availabilityOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </Select>

            <Select
              label="Preferred Engagement"
              value={profile.preferred_engagement || ''}
              onChange={(e) => handleChange('preferred_engagement', e.target.value)}
              disabled={!isEditing || isViewOnly}
            >
              <option value="">Select Engagement Type</option>
              {engagementOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Fee Structure */}
        <div className="space-y-4">
          <h4 className="text-base font-medium text-slate-700 border-b pb-2">Fee Structure</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Fee Type"
              value={profile.fee_type || ''}
              onChange={(e) => handleChange('fee_type', e.target.value)}
              disabled={!isEditing || isViewOnly}
            >
              <option value="">Select Fee Type</option>
              {feeTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>

            {/* Currency - Show for Fees and Hybrid */}
            {(profile.fee_type === 'Fees' || profile.fee_type === 'Hybrid') && (
              <Select
                label="Currency"
                value={profile.fee_currency || 'USD'}
                onChange={(e) => handleChange('fee_currency', e.target.value)}
                disabled={!isEditing || isViewOnly}
              >
                {currencies.map(currency => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </Select>
            )}

            {/* Minimum Fee Amount - Show for Fees and Hybrid */}
            {(profile.fee_type === 'Fees' || profile.fee_type === 'Hybrid') && (
              <Input
                label="Minimum Fee Amount"
                type="number"
                value={profile.fee_amount_min?.toString() || ''}
                onChange={(e) => handleChange('fee_amount_min', e.target.value ? parseFloat(e.target.value) : null)}
                disabled={!isEditing || isViewOnly}
                placeholder="e.g., 1000"
              />
            )}

            {/* Maximum Fee Amount - Show for Fees and Hybrid */}
            {(profile.fee_type === 'Fees' || profile.fee_type === 'Hybrid') && (
              <Input
                label="Maximum Fee Amount"
                type="number"
                value={profile.fee_amount_max?.toString() || ''}
                onChange={(e) => handleChange('fee_amount_max', e.target.value ? parseFloat(e.target.value) : null)}
                disabled={!isEditing || isViewOnly}
                placeholder="e.g., 5000"
              />
            )}

            {/* Minimum Equity Amount (ESOP) - Show for Equity and Hybrid */}
            {(profile.fee_type === 'Equity' || profile.fee_type === 'Hybrid') && (
              <Input
                label="Minimum Equity Amount (ESOP)"
                type="number"
                step="0.01"
                value={profile.equity_amount_min?.toString() || ''}
                onChange={(e) => handleChange('equity_amount_min', e.target.value ? parseFloat(e.target.value) : null)}
                disabled={!isEditing || isViewOnly}
                placeholder="e.g., 1000"
              />
            )}

            {/* Maximum Equity Amount (ESOP) - Show for Equity and Hybrid */}
            {(profile.fee_type === 'Equity' || profile.fee_type === 'Hybrid') && (
              <Input
                label="Maximum Equity Amount (ESOP)"
                type="number"
                step="0.01"
                value={profile.equity_amount_max?.toString() || ''}
                onChange={(e) => handleChange('equity_amount_max', e.target.value ? parseFloat(e.target.value) : null)}
                disabled={!isEditing || isViewOnly}
                placeholder="e.g., 5000"
              />
            )}
          </div>

        </div>

        {/* Media Section */}
        <div className="space-y-4">
          <h4 className="text-base font-medium text-slate-700 border-b pb-2">Logo / Video</h4>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Media Type</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="media_type"
                  value="logo"
                  checked={profile.media_type === 'logo'}
                  onChange={() => handleChange('media_type', 'logo')}
                  disabled={!isEditing || isViewOnly}
                  className="mr-2"
                />
                <ImageIcon className="h-4 w-4 mr-1" />
                <span className="text-sm text-slate-600">Logo</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="media_type"
                  value="video"
                  checked={profile.media_type === 'video'}
                  onChange={() => handleChange('media_type', 'video')}
                  disabled={!isEditing || isViewOnly}
                  className="mr-2"
                />
                <Video className="h-4 w-4 mr-1" />
                <span className="text-sm text-slate-600">YouTube Video</span>
              </label>
            </div>
          </div>

          {profile.media_type === 'logo' ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Logo</label>
              {profile.logo_url ? (
                <div className="mb-4">
                  <img src={profile.logo_url} alt="Logo" className="h-24 w-24 object-contain border border-slate-200 rounded" />
                </div>
              ) : null}
              {isEditing && !isViewOnly && (
                <div className="flex items-end gap-3">
                  <div className="mb-1">
                    <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <span>OR</span>
                  </div>
                  <div className="flex-1">
                    <Input
                      label="Logo URL"
                      type="url"
                      value={profile.logo_url || ''}
                      onChange={(e) => handleChange('logo_url', e.target.value)}
                      disabled={!isEditing || isViewOnly}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Input
              label="YouTube Video URL"
              value={profile.video_url || ''}
              onChange={(e) => handleChange('video_url', e.target.value)}
              disabled={!isEditing || isViewOnly}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          )}
        </div>
      </div>

      {/* Add Startup Form Modal */}
      <Modal
        isOpen={showAddFormModal}
        onClose={handleCloseAddForm}
        title={
          formSection === 'active' 
            ? 'Add Mentoring' 
            : 'Add Startup Experience'
        }
        size="large"
      >
        {currentUser?.id && (
          <MentorDataForm
            mentorId={currentUser.id}
            startups={startups}
            onUpdate={() => {
              handleCloseAddForm();
              if (onMetricsUpdate) {
                onMetricsUpdate();
              }
            }}
            mentorMetrics={mentorMetrics}
            initialSection={formSection}
          />
        )}
      </Modal>

      {/* Professional Experience Modal */}
      <Modal
        isOpen={showProfessionalExpModal}
        onClose={() => {
          setShowProfessionalExpModal(false);
          setEditingExpId(null);
          setExpForm({
            company: '',
            position: '',
            description: '',
            from_date: '',
            to_date: '',
            currently_working: false,
          });
        }}
        title="Professional Experience"
        size="large"
      >
        <div className="space-y-6">
          {/* List of Professional Experiences */}
          {professionalExperiences.length > 0 && (
            <div className="space-y-3">
              {professionalExperiences.map((exp) => (
                <div key={exp.id} className="p-4 border border-slate-200 rounded-md bg-slate-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h5 className="font-semibold text-slate-800">{exp.position}</h5>
                      <p className="text-sm text-slate-600">{exp.company}</p>
                      {exp.description && (
                        <p className="text-sm text-slate-600 mt-1">{exp.description}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(exp.from_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - {' '}
                        {exp.currently_working || !exp.to_date 
                          ? 'Present' 
                          : new Date(exp.to_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    {!isViewOnly && isEditing && (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditExp(exp)}
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteExp(exp.id)}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Add/Edit Form */}
          {!isViewOnly && isEditing && (
            <form onSubmit={handleExpSubmit} className="space-y-4 p-4 border border-slate-200 rounded-md bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Company"
                  value={expForm.company}
                  onChange={(e) => setExpForm({ ...expForm, company: e.target.value })}
                  disabled={!isEditing || isViewOnly}
                  placeholder="Company name"
                  required
                />
                
                <Input
                  label="Position"
                  value={expForm.position}
                  onChange={(e) => setExpForm({ ...expForm, position: e.target.value })}
                  disabled={!isEditing || isViewOnly}
                  placeholder="e.g., CEO, CTO, Co-founder"
                  required
                />
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Brief Description
                  </label>
                  <textarea
                    value={expForm.description}
                    onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                    disabled={!isEditing || isViewOnly}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of your role and achievements..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={expForm.from_date}
                    onChange={(e) => setExpForm({ ...expForm, from_date: e.target.value })}
                    disabled={!isEditing || isViewOnly}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                {!expForm.currently_working && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={expForm.to_date}
                      onChange={(e) => setExpForm({ ...expForm, to_date: e.target.value })}
                      disabled={!isEditing || isViewOnly}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="currently_working_exp"
                    checked={expForm.currently_working}
                    onChange={(e) => {
                      setExpForm({ 
                        ...expForm, 
                        currently_working: e.target.checked,
                        to_date: e.target.checked ? '' : expForm.to_date
                      });
                    }}
                    disabled={!isEditing || isViewOnly}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                  />
                  <label htmlFor="currently_working_exp" className="ml-2 block text-sm font-medium text-slate-700">
                    Currently Working
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                {editingExpId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingExpId(null);
                      setExpForm({
                        company: '',
                        position: '',
                        description: '',
                        from_date: '',
                        to_date: '',
                        currently_working: false,
                      });
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingExpId ? 'Update' : 'Add'} Experience
                </Button>
              </div>
            </form>
          )}
          
          {/* Total Experience Display */}
          {professionalExperiences.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Total Professional Experience:</span> {calculateTotalExperience()}
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default MentorProfileForm;

