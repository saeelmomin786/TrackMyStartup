import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { generalDataService } from '../../lib/generalDataService';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Save, Upload, Image as ImageIcon, Video, ChevronDown, X, Edit } from 'lucide-react';

interface FacilitatorProfile {
  id?: string;
  user_id: string;
  center_name?: string;
  organization_name?: string;
  country?: string;
  website?: string;
  linkedin_link?: string;
  email?: string;
  geography?: string[];
  program_types?: string[];
  focus_stages?: string[];
  focus_domains?: string[];
  incubation_capacity?: number;
  currency?: string;
  center_description?: string;
  logo_url?: string;
  video_url?: string;
  media_type?: 'logo' | 'video';
  startups_incubated?: number;
  startups_graduated?: number;
  startups_funded?: number;
  verified_startups_incubated?: number;
  verified_startups_graduated?: number;
  verified_startups_funded?: number;
}

interface FacilitatorProfileFormProps {
  currentUser: { id: string; email: string; name?: string };
  onSave?: (profile: FacilitatorProfile) => void;
  onProfileChange?: (profile: FacilitatorProfile) => void;
  isViewOnly?: boolean;
  computedMetrics?: {
    startupsIncubated: number;
    startupsGraduated: number;
    startupsFunded: number;
    verifiedStartupsIncubated: number;
    verifiedStartupsGraduated: number;
    verifiedStartupsFunded: number;
  };
}

const FacilitatorProfileForm: React.FC<FacilitatorProfileFormProps> = ({ 
  currentUser, 
  onSave,
  onProfileChange,
  isViewOnly = false,
  computedMetrics
}) => {
  const [isEditing, setIsEditing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<FacilitatorProfile>({
    user_id: '',
    media_type: 'logo',
    geography: [],
    focus_stages: [],
    focus_domains: [],
    program_types: [],
    startups_incubated: 0,
    startups_graduated: 0,
    startups_funded: 0,
    verified_startups_incubated: 0,
    verified_startups_graduated: 0,
    verified_startups_funded: 0
  });
  const [isGeographyOpen, setIsGeographyOpen] = useState(false);
  const [isFocusStagesOpen, setIsFocusStagesOpen] = useState(false);
  const [isFocusDomainOpen, setIsFocusDomainOpen] = useState(false);
  const [isProgramTypesOpen, setIsProgramTypesOpen] = useState(false);
  const geographyRef = useRef<HTMLDivElement>(null);
  const focusStagesRef = useRef<HTMLDivElement>(null);
  const focusDomainRef = useRef<HTMLDivElement>(null);
  const programTypesRef = useRef<HTMLDivElement>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [focusStages, setFocusStages] = useState<string[]>([]);
  const [loadingFocusStages, setLoadingFocusStages] = useState(true);
  const [domains, setDomains] = useState<string[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [logoInputMethod, setLogoInputMethod] = useState<'upload' | 'url'>('upload');
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [country, setCountry] = useState<string>('');

  const programTypes = ['Incubation', 'Acceleration', 'Co-working Space', 'Mentorship Program', 'Grant Program', 'Corporate Innovation', 'University Program', 'Other'];
  const [currencies, setCurrencies] = useState<Array<{ code: string; name: string; color: string }>>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);

  const applyComputedMetrics = (base: FacilitatorProfile): FacilitatorProfile => {
    if (!computedMetrics) return base;
    return {
      ...base,
      startups_incubated: computedMetrics.startupsIncubated || 0,
      startups_graduated: computedMetrics.startupsGraduated || 0,
      startups_funded: computedMetrics.startupsFunded || 0,
      verified_startups_incubated: computedMetrics.verifiedStartupsIncubated || 0,
      verified_startups_graduated: computedMetrics.verifiedStartupsGraduated || 0,
      verified_startups_funded: computedMetrics.verifiedStartupsFunded || 0,
    };
  };

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setAuthUserId(user.id);

      // Use user_profiles table for facilitator profiles
      const { data: existingProfile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .eq('role', 'facilitator')
        .maybeSingle();

      if (error) {
        console.error('Error fetching facilitator profile:', error);
        return;
      }

      if (existingProfile) {
        const profile = existingProfile as any;
        const mapped: FacilitatorProfile = {
          id: profile.id as string,
          user_id: user.id,
          center_name: profile.center_name as string || profile.name as string || '',
          organization_name: profile.firm_name as string || '',
          country: profile.country as string || '',
          website: profile.website as string || '',
          linkedin_link: profile.linkedin_link as string || '',
          email: profile.email as string || user.email || '',
          geography: profile.geography as string[] || [],
          program_types: profile.program_types as string[] || [],
          focus_stages: profile.focus_stages as string[] || [],
          focus_domains: profile.focus_domains as string[] || [],
          incubation_capacity: profile.incubation_capacity as number || 0,
          currency: profile.currency as string || 'USD',
          center_description: profile.center_description as string || profile.description as string || '',
          logo_url: profile.logo_url as string || '',
          video_url: profile.video_url as string || '',
          media_type: (profile.media_type as 'logo' | 'video') || 'logo',
          startups_incubated: profile.startups_incubated as number || 0,
          startups_graduated: profile.startups_graduated as number || 0,
          startups_funded: profile.startups_funded as number || 0,
          verified_startups_incubated: profile.verified_startups_incubated as number || 0,
          verified_startups_graduated: profile.verified_startups_graduated as number || 0,
          verified_startups_funded: profile.verified_startups_funded as number || 0,
        };
        const withMetrics = applyComputedMetrics(mapped);
        setProfile(withMetrics);
        setCountry(withMetrics.country || '');
        if (onProfileChange) {
          onProfileChange(withMetrics);
        }
      } else {
        // Initialize new profile
        const newProfile: FacilitatorProfile = {
          user_id: user.id,
          center_name: currentUser.name || '',
          email: user.email || '',
          media_type: 'logo',
          geography: [],
          program_types: [],
          focus_stages: [],
          focus_domains: [],
          currency: 'USD',
          startups_incubated: 0,
          startups_graduated: 0,
          startups_funded: 0,
          verified_startups_incubated: 0,
          verified_startups_graduated: 0,
          verified_startups_funded: 0,
        };
        setProfile(newProfile);
        if (onProfileChange) {
          onProfileChange(newProfile);
        }
      }
    };

    fetchUserAndProfile();
  }, [currentUser, computedMetrics]);

  // Load dropdown options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [countriesData, stagesData, domainsData] = await Promise.all([
          generalDataService.getItemsByCategory('country'),
          generalDataService.getItemsByCategory('round_type'),
          generalDataService.getItemsByCategory('domain')
        ]);
        
        setCountries(countriesData.map(c => c.name));
        setFocusStages(stagesData.map(s => s.name));
        setDomains(domainsData.map(d => d.name));
        
        // Set currencies
        setCurrencies([
          { code: 'USD', name: 'US Dollar', color: 'text-green-600' },
          { code: 'EUR', name: 'Euro', color: 'text-blue-600' },
          { code: 'GBP', name: 'British Pound', color: 'text-red-600' },
          { code: 'INR', name: 'Indian Rupee', color: 'text-orange-600' },
          { code: 'CAD', name: 'Canadian Dollar', color: 'text-red-500' },
          { code: 'AUD', name: 'Australian Dollar', color: 'text-yellow-600' },
          { code: 'SGD', name: 'Singapore Dollar', color: 'text-blue-500' },
          { code: 'JPY', name: 'Japanese Yen', color: 'text-red-700' },
          { code: 'CNY', name: 'Chinese Yuan', color: 'text-red-600' },
          { code: 'AED', name: 'UAE Dirham', color: 'text-green-700' },
          { code: 'SAR', name: 'Saudi Riyal', color: 'text-green-600' },
          { code: 'CHF', name: 'Swiss Franc', color: 'text-red-600' }
        ]);
      } catch (error) {
        console.error('Error loading options:', error);
        // Set fallback values
        setCountries(['India', 'USA', 'UK', 'Singapore', 'UAE', 'Germany', 'France', 'Canada', 'Australia', 'Japan', 'China', 'Other']);
        setFocusStages(['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'Bridge', 'Growth']);
        setDomains(['Agriculture', 'AI', 'Climate', 'Consumer Goods', 'Defence', 'E-commerce', 'Education', 'EV', 'Finance', 'Food & Beverage', 'Healthcare', 'Manufacturing', 'Media & Entertainment', 'Others', 'PaaS', 'Renewable Energy', 'Retail', 'SaaS', 'Social Impact', 'Space', 'Transportation and Logistics', 'Waste Management', 'Web 3.0']);
        setCurrencies([
          { code: 'USD', name: 'US Dollar', color: 'text-green-600' },
          { code: 'EUR', name: 'Euro', color: 'text-blue-600' },
          { code: 'GBP', name: 'British Pound', color: 'text-red-600' },
          { code: 'INR', name: 'Indian Rupee', color: 'text-orange-600' }
        ]);
      } finally {
        setLoadingCountries(false);
        setLoadingFocusStages(false);
        setLoadingDomains(false);
        setLoadingCurrencies(false);
      }
    };
    loadOptions();
  }, []);

  const handleSave = async () => {
    if (!authUserId) return;
    setIsSaving(true);

    try {
      const payload: any = {
        auth_user_id: authUserId,
        role: 'facilitator',
        name: profile.center_name || '',
        center_name: profile.center_name || '',
        firm_name: profile.organization_name || '',
        country: profile.country || '',
        website: profile.website || '',
        linkedin_link: profile.linkedin_link || '',
        email: profile.email || '',
        geography: profile.geography || [],
        program_types: profile.program_types || [],
        focus_stages: profile.focus_stages || [],
        focus_domains: profile.focus_domains || [],
        incubation_capacity: profile.incubation_capacity || 0,
        currency: profile.currency || 'USD',
        center_description: profile.center_description || '',
        description: profile.center_description || '',
        logo_url: profile.logo_url || '',
        video_url: profile.video_url || '',
        media_type: profile.media_type || 'logo',
        startups_incubated: profile.startups_incubated || 0,
        startups_graduated: profile.startups_graduated || 0,
        startups_funded: profile.startups_funded || 0,
        verified_startups_incubated: profile.verified_startups_incubated || 0,
        verified_startups_graduated: profile.verified_startups_graduated || 0,
        verified_startups_funded: profile.verified_startups_funded || 0,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(payload, { onConflict: 'auth_user_id' });

      if (error) throw error;

      alert('Profile saved successfully!');
      setIsEditing(false);
      if (onSave) {
        onSave(profile);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    const updated = { ...profile, [field]: value };
    setProfile(updated);
    if (onProfileChange) {
      onProfileChange(updated);
    }
  };

  const toggleMultiSelect = (field: 'geography' | 'program_types' | 'focus_stages' | 'focus_domains', value: string) => {
    const current = profile[field] || [];
    const updated = current.includes(value)
      ? current.filter((v: string) => v !== value)
      : [...current, value];
    handleInputChange(field, updated);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${authUserId}-${Date.now()}.${fileExt}`;
      const { error: uploadError, data } = await supabase.storage
        .from('facilitator-logos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('facilitator-logos')
        .getPublicUrl(fileName);

      handleInputChange('logo_url', publicUrl);
      handleInputChange('media_type', 'logo');
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Failed to upload logo');
    }
  };

  const handleLogoUrlSubmit = () => {
    if (logoUrlInput.trim()) {
      handleInputChange('logo_url', logoUrlInput.trim());
      handleInputChange('media_type', 'logo');
      setLogoUrlInput('');
    }
  };

  return (
    <Card>
      <div className="space-y-6">
        {/* Media Section */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Logo or Video
          </label>
          <div className="flex gap-2 mb-4">
            <Button
              variant={profile.media_type === 'logo' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleInputChange('media_type', 'logo')}
              icon={<ImageIcon className="w-4 h-4" />}
            >
              Logo
            </Button>
            <Button
              variant={profile.media_type === 'video' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleInputChange('media_type', 'video')}
              icon={<Video className="w-4 h-4" />}
            >
              Video
            </Button>
          </div>

          {profile.media_type === 'logo' && (
            <div className="space-y-4">
              <div className="flex gap-2 mb-2">
                <Button
                  variant={logoInputMethod === 'upload' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setLogoInputMethod('upload')}
                >
                  Upload
                </Button>
                <Button
                  variant={logoInputMethod === 'url' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setLogoInputMethod('url')}
                >
                  URL
                </Button>
              </div>

              {logoInputMethod === 'upload' ? (
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={isViewOnly}
                />
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={logoUrlInput}
                    onChange={(e) => setLogoUrlInput(e.target.value)}
                    placeholder="Enter logo URL"
                    disabled={isViewOnly}
                  />
                  <Button onClick={handleLogoUrlSubmit} size="sm" disabled={isViewOnly}>
                    Set
                  </Button>
                </div>
              )}

              {profile.logo_url && (
                <div className="mt-2">
                  <img src={profile.logo_url} alt="Logo preview" className="max-h-32 rounded" />
                </div>
              )}
            </div>
          )}

          {profile.media_type === 'video' && (
            <Input
              value={profile.video_url || ''}
              onChange={(e) => handleInputChange('video_url', e.target.value)}
              placeholder="YouTube video URL"
              disabled={isViewOnly}
            />
          )}
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Center Name"
            value={profile.center_name || ''}
            onChange={(e) => handleInputChange('center_name', e.target.value)}
            placeholder="Your incubation center name"
            disabled={isViewOnly}
          />
          <Input
            label="Organization Name"
            value={profile.organization_name || ''}
            onChange={(e) => handleInputChange('organization_name', e.target.value)}
            placeholder="Parent organization"
            disabled={isViewOnly}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Country"
            value={profile.country || ''}
            onChange={(e) => handleInputChange('country', e.target.value)}
            disabled={isViewOnly}
          >
            <option value="">Select Country</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>

          <Select
            label="Currency"
            value={profile.currency || 'USD'}
            onChange={(e) => handleInputChange('currency', e.target.value)}
            disabled={isViewOnly}
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} - {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Website"
            value={profile.website || ''}
            onChange={(e) => handleInputChange('website', e.target.value)}
            placeholder="https://..."
            disabled={isViewOnly}
          />
          <Input
            label="LinkedIn"
            value={profile.linkedin_link || ''}
            onChange={(e) => handleInputChange('linkedin_link', e.target.value)}
            placeholder="https://linkedin.com/..."
            disabled={isViewOnly}
          />
        </div>

        <Input
          label="Email"
          value={profile.email || ''}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="contact@center.com"
          disabled={isViewOnly}
        />

        {/* Multi-select dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Geography */}
          <div ref={geographyRef} className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Geography Focus
            </label>
            <button
              type="button"
              onClick={() => setIsGeographyOpen(!isGeographyOpen)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg flex items-center justify-between bg-white"
              disabled={isViewOnly}
            >
              <span className="text-sm text-slate-700">
                {profile.geography && profile.geography.length > 0
                  ? `${profile.geography.length} selected`
                  : 'Select countries'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {isGeographyOpen && !isViewOnly && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {countries.map((c) => (
                  <label key={c} className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.geography?.includes(c)}
                      onChange={() => toggleMultiSelect('geography', c)}
                      className="mr-2"
                    />
                    <span className="text-sm">{c}</span>
                  </label>
                ))}
              </div>
            )}
            {profile.geography && profile.geography.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {profile.geography.map((g) => (
                  <span key={g} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs flex items-center gap-1">
                    {g}
                    {!isViewOnly && (
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => toggleMultiSelect('geography', g)}
                      />
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Program Types */}
          <div ref={programTypesRef} className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Program Types
            </label>
            <button
              type="button"
              onClick={() => setIsProgramTypesOpen(!isProgramTypesOpen)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg flex items-center justify-between bg-white"
              disabled={isViewOnly}
            >
              <span className="text-sm text-slate-700">
                {profile.program_types && profile.program_types.length > 0
                  ? `${profile.program_types.length} selected`
                  : 'Select types'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {isProgramTypesOpen && !isViewOnly && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {programTypes.map((pt) => (
                  <label key={pt} className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.program_types?.includes(pt)}
                      onChange={() => toggleMultiSelect('program_types', pt)}
                      className="mr-2"
                    />
                    <span className="text-sm">{pt}</span>
                  </label>
                ))}
              </div>
            )}
            {profile.program_types && profile.program_types.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {profile.program_types.map((pt) => (
                  <span key={pt} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1">
                    {pt}
                    {!isViewOnly && (
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => toggleMultiSelect('program_types', pt)}
                      />
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Focus Stages */}
          <div ref={focusStagesRef} className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Focus Stages
            </label>
            <button
              type="button"
              onClick={() => setIsFocusStagesOpen(!isFocusStagesOpen)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg flex items-center justify-between bg-white"
              disabled={isViewOnly}
            >
              <span className="text-sm text-slate-700">
                {profile.focus_stages && profile.focus_stages.length > 0
                  ? `${profile.focus_stages.length} selected`
                  : 'Select stages'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {isFocusStagesOpen && !isViewOnly && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {focusStages.map((s) => (
                  <label key={s} className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.focus_stages?.includes(s)}
                      onChange={() => toggleMultiSelect('focus_stages', s)}
                      className="mr-2"
                    />
                    <span className="text-sm">{s}</span>
                  </label>
                ))}
              </div>
            )}
            {profile.focus_stages && profile.focus_stages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {profile.focus_stages.map((s) => (
                  <span key={s} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs flex items-center gap-1">
                    {s}
                    {!isViewOnly && (
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => toggleMultiSelect('focus_stages', s)}
                      />
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Focus Domains */}
          <div ref={focusDomainRef} className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Focus Domains
            </label>
            <button
              type="button"
              onClick={() => setIsFocusDomainOpen(!isFocusDomainOpen)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg flex items-center justify-between bg-white"
              disabled={isViewOnly}
            >
              <span className="text-sm text-slate-700">
                {profile.focus_domains && profile.focus_domains.length > 0
                  ? `${profile.focus_domains.length} selected`
                  : 'Select domains'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {isFocusDomainOpen && !isViewOnly && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {domains.map((d) => (
                  <label key={d} className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.focus_domains?.includes(d)}
                      onChange={() => toggleMultiSelect('focus_domains', d)}
                      className="mr-2"
                    />
                    <span className="text-sm">{d}</span>
                  </label>
                ))}
              </div>
            )}
            {profile.focus_domains && profile.focus_domains.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {profile.focus_domains.map((d) => (
                  <span key={d} className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs flex items-center gap-1">
                    {d}
                    {!isViewOnly && (
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => toggleMultiSelect('focus_domains', d)}
                      />
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Incubation Capacity */}
        <Input
          label="Incubation Capacity"
          type="number"
          value={profile.incubation_capacity || 0}
          onChange={(e) => handleInputChange('incubation_capacity', parseInt(e.target.value) || 0)}
          placeholder="Number of startups you can support"
          disabled={isViewOnly}
        />

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Center Description
          </label>
          <textarea
            value={profile.center_description || ''}
            onChange={(e) => handleInputChange('center_description', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe your incubation center, programs, and services..."
            disabled={isViewOnly}
          />
        </div>

        {/* Metrics */}
        <div className="border-t pt-4">
          <h4 className="font-semibold text-slate-800 mb-4">Performance Metrics</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Startups Incubated</label>
              <div className="text-2xl font-bold text-blue-600">
                {profile.startups_incubated || 0}
              </div>
              {profile.verified_startups_incubated !== undefined && (
                <div className="text-xs text-slate-500">
                  {profile.verified_startups_incubated} verified
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Startups Graduated</label>
              <div className="text-2xl font-bold text-green-600">
                {profile.startups_graduated || 0}
              </div>
              {profile.verified_startups_graduated !== undefined && (
                <div className="text-xs text-slate-500">
                  {profile.verified_startups_graduated} verified
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Startups Funded</label>
              <div className="text-2xl font-bold text-purple-600">
                {profile.startups_funded || 0}
              </div>
              {profile.verified_startups_funded !== undefined && (
                <div className="text-xs text-slate-500">
                  {profile.verified_startups_funded} verified
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        {!isViewOnly && (
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              icon={<Save className="w-4 h-4" />}
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default FacilitatorProfileForm;
