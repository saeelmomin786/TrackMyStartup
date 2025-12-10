import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { generalDataService } from '../../lib/generalDataService';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Save, Upload, Image as ImageIcon, Video, ChevronDown, X, PlusCircle } from 'lucide-react';

interface InvestorProfile {
  id?: string;
  user_id: string;
  firm_type?: string;
  global_hq?: string;
  investor_name?: string;
  website?: string;
  linkedin_link?: string;
  email?: string;
  geography?: string[];
  ticket_size_min?: number;
  ticket_size_max?: number;
  currency?: string;
  investment_stages?: string[];
  domain?: string[];
  investment_thesis?: string;
  funding_requirements?: string;
  funding_stages?: string[];
  target_countries?: string[];
  company_size?: string;
  logo_url?: string;
  video_url?: string;
  media_type?: 'logo' | 'video';
}

interface InvestorProfileFormProps {
  currentUser: { id: string; email: string; investorCode?: string; investor_code?: string };
  onSave?: (profile: InvestorProfile) => void;
  onProfileChange?: (profile: InvestorProfile) => void;
  isViewOnly?: boolean;
  totalStartupsInvested?: number;
  totalVerifiedStartups?: number;
  onAddStartup?: () => void;
}

const InvestorProfileForm: React.FC<InvestorProfileFormProps> = ({ 
  currentUser, 
  onSave,
  onProfileChange,
  isViewOnly = false,
  totalStartupsInvested = 0,
  totalVerifiedStartups = 0,
  onAddStartup
}) => {
  const [isEditing, setIsEditing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<InvestorProfile>({
    user_id: currentUser.id,
    media_type: 'logo',
    geography: [],
    investment_stages: [],
    domain: []
  });
  const [isGeographyOpen, setIsGeographyOpen] = useState(false);
  const [isInvestmentStagesOpen, setIsInvestmentStagesOpen] = useState(false);
  const [isDomainOpen, setIsDomainOpen] = useState(false);
  const geographyRef = useRef<HTMLDivElement>(null);
  const investmentStagesRef = useRef<HTMLDivElement>(null);
  const domainRef = useRef<HTMLDivElement>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [investmentStages, setInvestmentStages] = useState<string[]>([]);
  const [loadingInvestmentStages, setLoadingInvestmentStages] = useState(true);
  const [domains, setDomains] = useState<string[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [logoInputMethod, setLogoInputMethod] = useState<'upload' | 'url'>('upload');
  const [logoUrlInput, setLogoUrlInput] = useState('');

  const firmTypes = ['VC', 'Angel Investor', 'Corporate VC', 'Family Office', 'PE Firm', 'Government', 'Other'];
  const [currencies, setCurrencies] = useState<Array<{ code: string; name: string; color: string }>>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);

  // Currency color mapping
  const getCurrencyColor = (code: string): string => {
    const colorMap: { [key: string]: string } = {
      'USD': 'text-green-600',
      'EUR': 'text-blue-600',
      'GBP': 'text-red-600',
      'INR': 'text-orange-600',
      'CAD': 'text-red-500',
      'AUD': 'text-yellow-600',
      'SGD': 'text-blue-500',
      'JPY': 'text-red-700',
      'CNY': 'text-red-600',
      'AED': 'text-green-700',
      'SAR': 'text-green-600',
      'CHF': 'text-red-600'
    };
    return colorMap[code] || 'text-slate-700';
  };

  const loadCurrencies = async () => {
    try {
      setLoadingCurrencies(true);
      // Try to fetch from general_data table first
      try {
        const currencyData = await generalDataService.getItemsByCategory('currency');
        if (currencyData && currencyData.length > 0) {
          const currencyList = currencyData.map(currency => ({
            code: currency.code || currency.name,
            name: currency.name,
            color: getCurrencyColor(currency.code || currency.name)
          }));
          setCurrencies(currencyList);
          return;
        }
      } catch (error) {
        console.log('Currency category not found in general_data, using fallback');
      }
      
      // Fallback to hardcoded list if not in database
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
      console.error('Error loading currencies:', error);
      // Fallback to hardcoded list
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
    } finally {
      setLoadingCurrencies(false);
    }
  };

  useEffect(() => {
    loadProfile();
    loadCountries();
    loadInvestmentStages();
    loadDomains();
    loadCurrencies();
  }, [currentUser.id]);

  const loadCountries = async () => {
    try {
      setLoadingCountries(true);
      const countryData = await generalDataService.getItemsByCategory('country');
      const countryNames = countryData.map(country => country.name);
      setCountries(countryNames);
    } catch (error) {
      console.error('Error loading countries:', error);
      // Fallback to hardcoded list if database fails
      setCountries(['India', 'USA', 'UK', 'Singapore', 'UAE', 'Germany', 'France', 'Canada', 'Australia', 'Japan', 'China', 'Other']);
    } finally {
      setLoadingCountries(false);
    }
  };

  const loadInvestmentStages = async () => {
    try {
      setLoadingInvestmentStages(true);
      const stageData = await generalDataService.getItemsByCategory('round_type');
      const stageNames = stageData.map(stage => stage.name);
      setInvestmentStages(stageNames);
    } catch (error) {
      console.error('Error loading investment stages:', error);
      // Fallback to hardcoded list if database fails
      setInvestmentStages(['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'Bridge', 'Growth']);
    } finally {
      setLoadingInvestmentStages(false);
    }
  };

  const loadDomains = async () => {
    try {
      setLoadingDomains(true);
      const domainData = await generalDataService.getItemsByCategory('domain');
      const domainNames = domainData.map(domain => domain.name);
      setDomains(domainNames);
    } catch (error) {
      console.error('Error loading domains:', error);
      // Fallback to hardcoded list if database fails
      setDomains(['Agriculture', 'AI', 'Climate', 'Consumer Goods', 'Defence', 'E-commerce', 'Education', 'EV', 'Finance', 'Food & Beverage', 'Healthcare', 'Manufacturing', 'Media & Entertainment', 'Others', 'PaaS', 'Renewable Energy', 'Retail', 'SaaS', 'Social Impact', 'Space', 'Transportation and Logistics', 'Waste Management', 'Web 3.0']);
    } finally {
      setLoadingDomains(false);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (geographyRef.current && !geographyRef.current.contains(event.target as Node)) {
        setIsGeographyOpen(false);
      }
      if (investmentStagesRef.current && !investmentStagesRef.current.contains(event.target as Node)) {
        setIsInvestmentStagesOpen(false);
      }
      if (domainRef.current && !domainRef.current.contains(event.target as Node)) {
        setIsDomainOpen(false);
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
        .from('investor_profiles')
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
          geography: data.geography || [],
          investment_stages: data.investment_stages || [],
          domain: data.domain || []
        };
        setProfile(loadedProfile);
        if (onProfileChange) {
          onProfileChange(loadedProfile);
        }
      } else {
        // Set initial preview with default values
        if (onProfileChange) {
          onProfileChange(profile);
        }
      }
    } catch (error) {
      console.error('Error loading investor profile:', error);
    }
  };

  const handleChange = (field: keyof InvestorProfile, value: any) => {
    setProfile(prev => {
      const updated = { ...prev, [field]: value };
      if (onProfileChange) {
        onProfileChange(updated);
      }
      return updated;
    });
  };

  const handleArrayChange = (field: 'geography' | 'investment_stages', value: string) => {
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

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('File size too large. Please upload an image smaller than 5MB');
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `investor-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('investor-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        let errorMessage = 'Failed to upload logo';
        
        if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('does not exist')) {
          errorMessage = 'Storage bucket not found. Please contact administrator to set up investor-assets bucket.';
        } else if (uploadError.message?.includes('new row violates row-level security')) {
          errorMessage = 'Permission denied. Please check storage bucket policies.';
        } else if (uploadError.message) {
          errorMessage = `Upload failed: ${uploadError.message}`;
        }
        
        alert(errorMessage);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('investor-assets')
        .getPublicUrl(filePath);

      handleChange('logo_url', publicUrl);
      handleChange('media_type', 'logo');
      setLogoUrlInput(publicUrl);
      alert('Logo uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      alert(`Failed to upload logo: ${error.message || 'Unknown error'}`);
    }
  };

  const handleLogoUrlChange = (url: string) => {
    setLogoUrlInput(url);
    if (url.trim()) {
      handleChange('logo_url', url.trim());
      handleChange('media_type', 'logo');
    }
  };

  // Sync logoUrlInput with profile.logo_url when profile loads
  useEffect(() => {
    if (profile.logo_url && profile.media_type === 'logo') {
      setLogoUrlInput(profile.logo_url);
      // Determine input method based on URL (if it's a supabase storage URL, it's upload, otherwise it's URL)
      if (profile.logo_url.includes('supabase.co') || profile.logo_url.includes('storage.googleapis.com')) {
        setLogoInputMethod('upload');
      } else {
        setLogoInputMethod('url');
      }
    }
  }, [profile.logo_url, profile.media_type]);

  const handleSave = async () => {
    if (!profile.investor_name) {
      alert('Please enter investor name');
      return;
    }

    setIsSaving(true);
    try {
      const profileData = {
        ...profile,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('investor_profiles')
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
      console.error('Error saving investor profile:', error);
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
              label="Investor Name / Firm Name"
              value={profile.investor_name || ''}
              onChange={(e) => handleChange('investor_name', e.target.value)}
              disabled={!isEditing || isViewOnly}
              required
            />
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Number of Startups Invested
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm text-slate-700">
                  {totalStartupsInvested}
                </div>
                {!isViewOnly && onAddStartup && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={onAddStartup}
                    className="whitespace-nowrap"
                  >
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Calculated from your portfolio
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Number of Verified Startups
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm text-slate-700">
                  {totalVerifiedStartups}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Startups from TMS platform
              </p>
            </div>
            
            <Select
              label="Firm Type"
              value={profile.firm_type || ''}
              onChange={(e) => handleChange('firm_type', e.target.value)}
              disabled={!isEditing || isViewOnly}
            >
              <option value="">Select Firm Type</option>
              {firmTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>

            <Input
              label="Global HQ"
              value={profile.global_hq || ''}
              onChange={(e) => handleChange('global_hq', e.target.value)}
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

        {/* Investment Preferences */}
        <div className="space-y-4">
          <h4 className="text-base font-medium text-slate-700 border-b pb-2">Investment Preferences</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative" ref={geographyRef}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
              <div
                onClick={() => !isViewOnly && isEditing && setIsGeographyOpen(!isGeographyOpen)}
                className={`block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm cursor-pointer ${
                  !isEditing || isViewOnly ? 'disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none disabled:cursor-not-allowed' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                    {profile.geography && profile.geography.length > 0 ? (
                      profile.geography.map((country) => (
                        <span
                          key={country}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {country}
                          {isEditing && !isViewOnly && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChange('geography', profile.geography?.filter(c => c !== country) || []);
                              }}
                              className="hover:bg-blue-200 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 text-sm">
                        {loadingCountries ? 'Loading countries...' : 'Select country...'}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isGeographyOpen ? 'transform rotate-180' : ''}`} />
                </div>
              </div>
              {isGeographyOpen && isEditing && !isViewOnly && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {loadingCountries ? (
                    <div className="px-3 py-2 text-sm text-slate-500">Loading countries...</div>
                  ) : (
                    countries.map(country => (
                    <div
                      key={country}
                      onClick={() => {
                        const current = profile.geography || [];
                        if (current.includes(country)) {
                          handleChange('geography', current.filter(c => c !== country));
                        } else {
                          handleChange('geography', [...current, country]);
                        }
                      }}
                      className={`px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm ${
                        profile.geography?.includes(country) ? 'bg-blue-100 font-medium' : ''
                      }`}
                    >
                      {country}
                    </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="relative" ref={investmentStagesRef}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Investment Stages</label>
              <div
                onClick={() => !isViewOnly && isEditing && setIsInvestmentStagesOpen(!isInvestmentStagesOpen)}
                className={`block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm cursor-pointer ${
                  !isEditing || isViewOnly ? 'disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none disabled:cursor-not-allowed' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                    {profile.investment_stages && profile.investment_stages.length > 0 ? (
                      profile.investment_stages.map((stage) => (
                        <span
                          key={stage}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {stage}
                          {isEditing && !isViewOnly && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChange('investment_stages', profile.investment_stages?.filter(s => s !== stage) || []);
                              }}
                              className="hover:bg-blue-200 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 text-sm">
                        {loadingInvestmentStages ? 'Loading stages...' : 'Select stages...'}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isInvestmentStagesOpen ? 'transform rotate-180' : ''}`} />
                </div>
              </div>
              {isInvestmentStagesOpen && isEditing && !isViewOnly && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {loadingInvestmentStages ? (
                    <div className="px-3 py-2 text-sm text-slate-500">Loading stages...</div>
                  ) : (
                    investmentStages.map(stage => (
                    <div
                      key={stage}
                      onClick={() => {
                        const current = profile.investment_stages || [];
                        if (current.includes(stage)) {
                          handleChange('investment_stages', current.filter(s => s !== stage));
                        } else {
                          handleChange('investment_stages', [...current, stage]);
                        }
                      }}
                      className={`px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm ${
                        profile.investment_stages?.includes(stage) ? 'bg-blue-100 font-medium' : ''
                      }`}
                    >
                      {stage}
                    </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="relative" ref={domainRef}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Domain</label>
              <div
                onClick={() => !isViewOnly && isEditing && setIsDomainOpen(!isDomainOpen)}
                className={`block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm cursor-pointer ${
                  !isEditing || isViewOnly ? 'disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none disabled:cursor-not-allowed' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                    {profile.domain && profile.domain.length > 0 ? (
                      profile.domain.map((domain) => (
                        <span
                          key={domain}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {domain}
                          {isEditing && !isViewOnly && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChange('domain', profile.domain?.filter(d => d !== domain) || []);
                              }}
                              className="hover:bg-blue-200 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 text-sm">
                        {loadingDomains ? 'Loading domains...' : 'Select domains...'}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isDomainOpen ? 'transform rotate-180' : ''}`} />
                </div>
              </div>
              {isDomainOpen && isEditing && !isViewOnly && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {loadingDomains ? (
                    <div className="px-3 py-2 text-sm text-slate-500">Loading domains...</div>
                  ) : (
                    domains.map(domain => (
                    <div
                      key={domain}
                      onClick={() => {
                        const current = profile.domain || [];
                        if (current.includes(domain)) {
                          handleChange('domain', current.filter(d => d !== domain));
                        } else {
                          handleChange('domain', [...current, domain]);
                        }
                      }}
                      className={`px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm ${
                        profile.domain?.includes(domain) ? 'bg-blue-100 font-medium' : ''
                      }`}
                    >
                      {domain}
                    </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Currency"
              value={profile.currency || 'USD'}
              onChange={(e) => handleChange('currency', e.target.value)}
              disabled={!isEditing || isViewOnly || loadingCurrencies}
            >
              {loadingCurrencies ? (
                <option value="">Loading currencies...</option>
              ) : (
                currencies.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))
              )}
            </Select>

            <Input
              label="Ticket Size (Min)"
              type="number"
              value={profile.ticket_size_min?.toString() || ''}
              onChange={(e) => handleChange('ticket_size_min', e.target.value ? parseFloat(e.target.value) : null)}
              disabled={!isEditing || isViewOnly}
              placeholder="e.g., 100000"
            />
            
            <Input
              label="Ticket Size (Max)"
              type="number"
              value={profile.ticket_size_max?.toString() || ''}
              onChange={(e) => handleChange('ticket_size_max', e.target.value ? parseFloat(e.target.value) : null)}
              disabled={!isEditing || isViewOnly}
              placeholder="e.g., 5000000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Investment Thesis</label>
            <textarea
              value={profile.investment_thesis || ''}
              onChange={(e) => handleChange('investment_thesis', e.target.value)}
              disabled={!isEditing || isViewOnly}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your investment thesis, focus areas, and what you look for in startups..."
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
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Upload Option */}
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

                  {/* OR Divider */}
                  <span className="text-sm text-slate-500">OR</span>

                  {/* URL Option */}
                  <div className="flex-1 min-w-[200px]">
                    <Input
                      type="url"
                      value={logoUrlInput}
                      onChange={(e) => handleLogoUrlChange(e.target.value)}
                      placeholder="Enter logo URL (https://example.com/logo.png)"
                      className="w-full"
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

        {/* Save Button at the end */}
        {!isViewOnly && (
          <div className="pt-4 border-t border-slate-200">
            <Button
              size="md"
              variant={isEditing ? "primary" : "secondary"}
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              disabled={isSaving}
              className="w-full"
            >
              {isSaving ? 'Saving...' : isEditing ? <><Save className="h-4 w-4 mr-2" /> Save</> : 'Edit Profile'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestorProfileForm;

