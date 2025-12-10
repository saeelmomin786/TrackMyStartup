import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Save, Upload, Image as ImageIcon, Video, ChevronDown, X, Plus } from 'lucide-react';
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
  equity_percentage?: number;
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
  onNavigateToDashboard?: (section?: 'active' | 'completed' | 'founded') => void;
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
  const [profile, setProfile] = useState<MentorProfile>({
    user_id: currentUser.id,
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
  const [formSection, setFormSection] = useState<'active' | 'completed' | 'founded'>('active');
  const expertiseRef = useRef<HTMLDivElement>(null);
  const sectorsRef = useRef<HTMLDivElement>(null);
  const stagesRef = useRef<HTMLDivElement>(null);
  
  const handleOpenAddForm = (section: 'active' | 'completed' | 'founded') => {
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
  }, [currentUser.id]);

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
      const { data, error } = await supabase
        .from('mentor_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        const loadedProfile = {
          ...data,
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

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `mentor-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('mentor-assets')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert('Failed to upload logo');
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('mentor-assets')
        .getPublicUrl(filePath);

      handleChange('logo_url', publicUrl);
      handleChange('media_type', 'logo');
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo');
    }
  };

  const handleSave = async () => {
    if (!profile.mentor_name) {
      alert('Please enter mentor name');
      return;
    }

    setIsSaving(true);
    try {
      // Auto-populate counts from metrics before saving
      const profileData = {
        ...profile,
        companies_mentored: mentorMetrics 
          ? (mentorMetrics.startupsMentoring + mentorMetrics.startupsMentoredPreviously)
          : profile.companies_mentored || 0,
        companies_founded: mentorMetrics?.startupsFounded || profile.companies_founded || 0,
        // Note: Previously Mentored is calculated from startupsMentoredPreviously, not stored separately
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('mentor_profiles')
        .upsert(profileData, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save profile');
        return;
      }

      setProfile(data);
      setIsEditing(false);
      if (onSave) {
        onSave(data);
      }
      alert('Profile saved successfully!');
    } catch (error) {
      console.error('Error saving mentor profile:', error);
      alert('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Mentoring Experience</label>
            <textarea
              value={profile.mentoring_experience || ''}
              onChange={(e) => handleChange('mentoring_experience', e.target.value)}
              disabled={!isEditing || isViewOnly}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your mentoring experience, achievements, and notable startups you've mentored..."
            />
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
                Startups Mentored (Total)
                <span className="ml-2 text-xs text-slate-500">(Calculated from your dashboard)</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-slate-700 font-medium">
                  {mentorMetrics ? (
                    mentorMetrics.startupsMentoring + mentorMetrics.startupsMentoredPreviously
                  ) : (
                    profile.companies_mentored || 0
                  )}
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
                value={mentorMetrics ? (mentorMetrics.startupsMentoring + mentorMetrics.startupsMentoredPreviously) : (profile.companies_mentored || 0)}
                onChange={() => {}}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Previously Mentored
                <span className="ml-2 text-xs text-slate-500">(Calculated from your dashboard)</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-slate-700 font-medium">
                  {mentorMetrics?.startupsMentoredPreviously || 0}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenAddForm('completed')}
                  className="flex items-center gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                  title="Add previously mentored startup to increase count"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add</span>
                </Button>
              </div>
              <input
                type="hidden"
                value={mentorMetrics?.startupsMentoredPreviously || 0}
                onChange={() => {}}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Startups Founded
                <span className="ml-2 text-xs text-slate-500">(Calculated from your dashboard)</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-slate-700 font-medium">
                  {mentorMetrics?.startupsFounded || profile.companies_founded || 0}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenAddForm('founded')}
                  className="flex items-center gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                  title="Add founded startup to increase count"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add</span>
                </Button>
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

            {/* Equity Percentage - Show for Equity and Hybrid */}
            {(profile.fee_type === 'Equity' || profile.fee_type === 'Hybrid') && (
              <Input
                label="Equity Percentage (%)"
                type="number"
                step="0.01"
                value={profile.equity_percentage?.toString() || ''}
                onChange={(e) => handleChange('equity_percentage', e.target.value ? parseFloat(e.target.value) : null)}
                disabled={!isEditing || isViewOnly}
                placeholder="e.g., 2.5"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Fee Description (Optional)</label>
            <textarea
              value={profile.fee_description || ''}
              onChange={(e) => handleChange('fee_description', e.target.value)}
              disabled={!isEditing || isViewOnly}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional details about your fee structure, payment terms, or negotiation options..."
            />
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

      {/* Save Button at the end */}
      {!isViewOnly && (
        <div className="flex justify-end mt-6 pt-6 border-t border-slate-200">
          <Button
            size="md"
            variant={isEditing ? "primary" : "secondary"}
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : isEditing ? <><Save className="h-4 w-4 mr-2" /> Save</> : 'Edit Profile'}
          </Button>
        </div>
      )}

      {/* Add Startup Form Modal */}
      <Modal
        isOpen={showAddFormModal}
        onClose={handleCloseAddForm}
        title={
          formSection === 'active' 
            ? 'Add Currently Mentoring Startup' 
            : formSection === 'completed' 
            ? 'Add Previously Mentored Startup' 
            : 'Add Founded Startup'
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
    </div>
  );
};

export default MentorProfileForm;

