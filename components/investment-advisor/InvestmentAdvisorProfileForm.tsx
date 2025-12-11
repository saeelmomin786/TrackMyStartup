import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { generalDataService } from '../../lib/generalDataService';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Save, Upload, Image as ImageIcon, Video, ChevronDown, X, Edit } from 'lucide-react';

interface InvestmentAdvisorProfile {
  id?: string;
  user_id: string;
  advisor_name?: string;
  firm_name?: string;
  global_hq?: string;
  website?: string;
  linkedin_link?: string;
  email?: string;
  geography?: string[];
  service_types?: string[];
  investment_stages?: string[];
  domain?: string[];
  minimum_investment?: number;
  maximum_investment?: number;
  currency?: string;
  service_description?: string;
  logo_url?: string;
  video_url?: string;
  media_type?: 'logo' | 'video';
  startups_under_management?: number;
  investors_under_management?: number;
  successful_fundraises_startups?: number;
  verified_startups_under_management?: number;
  verified_investors_under_management?: number;
  verified_successful_fundraises_startups?: number;
}

interface InvestmentAdvisorProfileFormProps {
  currentUser: { id: string; email: string; name?: string };
  onSave?: (profile: InvestmentAdvisorProfile) => void;
  onProfileChange?: (profile: InvestmentAdvisorProfile) => void;
  isViewOnly?: boolean;
  computedMetrics?: {
    startupsUnderManagement: number;
    investorsUnderManagement: number;
    successfulFundraisesStartups: number;
    verifiedStartupsUnderManagement: number;
    verifiedInvestorsUnderManagement: number;
    verifiedSuccessfulFundraisesStartups: number;
  };
}

const InvestmentAdvisorProfileForm: React.FC<InvestmentAdvisorProfileFormProps> = ({ 
  currentUser, 
  onSave,
  onProfileChange,
  isViewOnly = false,
  computedMetrics
}) => {
  const [isEditing, setIsEditing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<InvestmentAdvisorProfile>({
    user_id: currentUser.id,
    media_type: 'logo',
    geography: [],
    investment_stages: [],
    domain: [],
    service_types: [],
    startups_under_management: 0,
    investors_under_management: 0,
    successful_fundraises_startups: 0,
    verified_startups_under_management: 0,
    verified_investors_under_management: 0,
    verified_successful_fundraises_startups: 0
  });
  const [isGeographyOpen, setIsGeographyOpen] = useState(false);
  const [isInvestmentStagesOpen, setIsInvestmentStagesOpen] = useState(false);
  const [isDomainOpen, setIsDomainOpen] = useState(false);
  const [isServiceTypesOpen, setIsServiceTypesOpen] = useState(false);
  const geographyRef = useRef<HTMLDivElement>(null);
  const investmentStagesRef = useRef<HTMLDivElement>(null);
  const domainRef = useRef<HTMLDivElement>(null);
  const serviceTypesRef = useRef<HTMLDivElement>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [investmentStages, setInvestmentStages] = useState<string[]>([]);
  const [loadingInvestmentStages, setLoadingInvestmentStages] = useState(true);
  const [domains, setDomains] = useState<string[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [logoInputMethod, setLogoInputMethod] = useState<'upload' | 'url'>('upload');
  const [logoUrlInput, setLogoUrlInput] = useState('');

  const serviceTypes = ['Investment Advisory', 'Due Diligence', 'Deal Sourcing', 'Valuation Services', 'Fundraising Support', 'Strategic Consulting', 'Other'];
  const [currencies, setCurrencies] = useState<Array<{ code: string; name: string; color: string }>>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);

  const applyComputedMetrics = (base: InvestmentAdvisorProfile): InvestmentAdvisorProfile => {
    if (!computedMetrics) return base;
    return {
      ...base,
      startups_under_management: computedMetrics.startupsUnderManagement,
      investors_under_management: computedMetrics.investorsUnderManagement,
      successful_fundraises_startups: computedMetrics.successfulFundraisesStartups,
      verified_startups_under_management: computedMetrics.verifiedStartupsUnderManagement,
      verified_investors_under_management: computedMetrics.verifiedInvestorsUnderManagement,
      verified_successful_fundraises_startups: computedMetrics.verifiedSuccessfulFundraisesStartups
    };
  };

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
      setCurrencies([
        { code: 'USD', name: 'US Dollar', color: 'text-green-600' },
        { code: 'EUR', name: 'Euro', color: 'text-blue-600' },
        { code: 'GBP', name: 'British Pound', color: 'text-red-600' },
        { code: 'INR', name: 'Indian Rupee', color: 'text-orange-600' }
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
      if (serviceTypesRef.current && !serviceTypesRef.current.contains(event.target as Node)) {
        setIsServiceTypesOpen(false);
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
        .from('investment_advisor_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        const loadedProfile = applyComputedMetrics({
          ...data,
          geography: data.geography || [],
          investment_stages: data.investment_stages || [],
          domain: data.domain || [],
          service_types: data.service_types || []
        });
        setProfile(loadedProfile);
      } else {
        // Initialize with user's name/email
        const initialProfile = applyComputedMetrics({
          ...profile,
          advisor_name: currentUser.name || currentUser.email?.split('@')[0] || '',
          email: currentUser.email || ''
        });
        setProfile(initialProfile);
      }
    } catch (error) {
      console.error('Error loading investment advisor profile:', error);
    }
  };

  // Apply computed metrics whenever they change
  useEffect(() => {
    if (computedMetrics) {
      setProfile(prev => applyComputedMetrics(prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedMetrics]);

  const handleChange = (field: keyof InvestmentAdvisorProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: 'geography' | 'investment_stages' | 'domain' | 'service_types', value: string) => {
    setProfile(prev => {
      const currentArray = prev[field] || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [field]: newArray };
    });
  };

  // Notify parent after profile state updates to avoid setState during render
  useEffect(() => {
    if (onProfileChange) {
      onProfileChange(profile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP, or SVG)');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('File size too large. Please upload an image smaller than 5MB');
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `advisor-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('investor-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert('Failed to upload logo. Please try again.');
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

  useEffect(() => {
    if (profile.logo_url && profile.media_type === 'logo') {
      setLogoUrlInput(profile.logo_url);
      if (profile.logo_url.includes('supabase.co') || profile.logo_url.includes('storage.googleapis.com')) {
        setLogoInputMethod('upload');
      } else {
        setLogoInputMethod('url');
      }
    }
  }, [profile.logo_url, profile.media_type]);

  const handleSave = async () => {
    if (!profile.advisor_name) {
      alert('Please enter advisor name');
      return;
    }

    setIsSaving(true);
    try {
      const profileData = {
        ...profile,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('investment_advisor_profiles')
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
      console.error('Error saving investment advisor profile:', error);
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
              label="Advisor Name"
              value={profile.advisor_name || ''}
              onChange={(e) => handleChange('advisor_name', e.target.value)}
              disabled={!isEditing || isViewOnly}
              required
            />
            
            <Input
              label="Firm Name"
              value={profile.firm_name || ''}
              onChange={(e) => handleChange('firm_name', e.target.value)}
              disabled={!isEditing || isViewOnly}
            />
            
            <Input
              label="Global HQ"
              value={profile.global_hq || ''}
              onChange={(e) => handleChange('global_hq', e.target.value)}
              disabled={!isEditing || isViewOnly}
            />
            
            <Input
              label="Email"
              type="email"
              value={profile.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              disabled={!isEditing || isViewOnly}
            />
            
            <Input
              label="Website"
              type="url"
              value={profile.website || ''}
              onChange={(e) => handleChange('website', e.target.value)}
              disabled={!isEditing || isViewOnly}
            />
            
            <Input
              label="LinkedIn URL"
              type="url"
              value={profile.linkedin_link || ''}
              onChange={(e) => handleChange('linkedin_link', e.target.value)}
              disabled={!isEditing || isViewOnly}
            />
          </div>
        </div>

        {/* Service Preferences */}
        <div className="space-y-4">
          <h4 className="text-base font-medium text-slate-700 border-b pb-2">Service Preferences</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Service Types Multi-select */}
            <div className="relative" ref={serviceTypesRef}>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Service Types
              </label>
              <button
                type="button"
                onClick={() => !isViewOnly && !isEditing ? null : setIsServiceTypesOpen(!isServiceTypesOpen)}
                disabled={!isEditing || isViewOnly}
                className="w-full px-3 py-2 text-left bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed flex items-center justify-between"
              >
                <span className="text-sm text-slate-700">
                  {profile.service_types && profile.service_types.length > 0
                    ? `${profile.service_types.length} selected`
                    : 'Select service types'}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isServiceTypesOpen ? 'transform rotate-180' : ''}`} />
              </button>
              {isServiceTypesOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {serviceTypes.map((type) => (
                    <label key={type} className="flex items-center px-4 py-2 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.service_types?.includes(type) || false}
                        onChange={() => handleArrayChange('service_types', type)}
                        className="mr-2"
                      />
                      <span className="text-sm text-slate-700">{type}</span>
                    </label>
                  ))}
                </div>
              )}
              {profile.service_types && profile.service_types.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.service_types.map((type) => (
                    <span key={type} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                      {type}
                      {!isViewOnly && isEditing && (
                        <button
                          type="button"
                          onClick={() => handleArrayChange('service_types', type)}
                          className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Geography Multi-select */}
            <div className="relative" ref={geographyRef}>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Geography
              </label>
              <button
                type="button"
                onClick={() => !isViewOnly && !isEditing ? null : setIsGeographyOpen(!isGeographyOpen)}
                disabled={!isEditing || isViewOnly}
                className="w-full px-3 py-2 text-left bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed flex items-center justify-between"
              >
                <span className="text-sm text-slate-700">
                  {profile.geography && profile.geography.length > 0
                    ? `${profile.geography.length} selected`
                    : 'Select countries/regions'}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isGeographyOpen ? 'transform rotate-180' : ''}`} />
              </button>
              {isGeographyOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {loadingCountries ? (
                    <div className="px-4 py-2 text-sm text-slate-500">Loading...</div>
                  ) : (
                    countries.map((country) => (
                      <label key={country} className="flex items-center px-4 py-2 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.geography?.includes(country) || false}
                          onChange={() => handleArrayChange('geography', country)}
                          className="mr-2"
                        />
                        <span className="text-sm text-slate-700">{country}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
              {profile.geography && profile.geography.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.geography.map((geo) => (
                    <span key={geo} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                      {geo}
                      {!isViewOnly && isEditing && (
                        <button
                          type="button"
                          onClick={() => handleArrayChange('geography', geo)}
                          className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-green-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Investment Stages Multi-select */}
            <div className="relative" ref={investmentStagesRef}>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Investment Stages
              </label>
              <button
                type="button"
                onClick={() => !isViewOnly && !isEditing ? null : setIsInvestmentStagesOpen(!isInvestmentStagesOpen)}
                disabled={!isEditing || isViewOnly}
                className="w-full px-3 py-2 text-left bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed flex items-center justify-between"
              >
                <span className="text-sm text-slate-700">
                  {profile.investment_stages && profile.investment_stages.length > 0
                    ? `${profile.investment_stages.length} selected`
                    : 'Select investment stages'}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isInvestmentStagesOpen ? 'transform rotate-180' : ''}`} />
              </button>
              {isInvestmentStagesOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {loadingInvestmentStages ? (
                    <div className="px-4 py-2 text-sm text-slate-500">Loading...</div>
                  ) : (
                    investmentStages.map((stage) => (
                      <label key={stage} className="flex items-center px-4 py-2 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.investment_stages?.includes(stage) || false}
                          onChange={() => handleArrayChange('investment_stages', stage)}
                          className="mr-2"
                        />
                        <span className="text-sm text-slate-700">{stage}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
              {profile.investment_stages && profile.investment_stages.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.investment_stages.map((stage) => (
                    <span key={stage} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                      {stage}
                      {!isViewOnly && isEditing && (
                        <button
                          type="button"
                          onClick={() => handleArrayChange('investment_stages', stage)}
                          className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-purple-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Domain Multi-select */}
            <div className="relative" ref={domainRef}>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Domain / Sector
              </label>
              <button
                type="button"
                onClick={() => !isViewOnly && !isEditing ? null : setIsDomainOpen(!isDomainOpen)}
                disabled={!isEditing || isViewOnly}
                className="w-full px-3 py-2 text-left bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed flex items-center justify-between"
              >
                <span className="text-sm text-slate-700">
                  {profile.domain && profile.domain.length > 0
                    ? `${profile.domain.length} selected`
                    : 'Select domains/sectors'}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isDomainOpen ? 'transform rotate-180' : ''}`} />
              </button>
              {isDomainOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {loadingDomains ? (
                    <div className="px-4 py-2 text-sm text-slate-500">Loading...</div>
                  ) : (
                    domains.map((domain) => (
                      <label key={domain} className="flex items-center px-4 py-2 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.domain?.includes(domain) || false}
                          onChange={() => handleArrayChange('domain', domain)}
                          className="mr-2"
                        />
                        <span className="text-sm text-slate-700">{domain}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
              {profile.domain && profile.domain.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.domain.map((d) => (
                    <span key={d} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-800">
                      {d}
                      {!isViewOnly && isEditing && (
                        <button
                          type="button"
                          onClick={() => handleArrayChange('domain', d)}
                          className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-orange-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Management Metrics */}
        <div className="space-y-4">
          <h4 className="text-base font-medium text-slate-700 border-b pb-2">Management Metrics</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Startups Under Management"
              type="number"
              value={profile.startups_under_management ?? ''}
              onChange={(e) => handleChange('startups_under_management', e.target.value ? parseInt(e.target.value, 10) : 0)}
              disabled
              helpText="Auto-calculated from My Startups & added startups"
            />
            <Input
              label="Investors Under Management"
              type="number"
              value={profile.investors_under_management ?? ''}
              onChange={(e) => handleChange('investors_under_management', e.target.value ? parseInt(e.target.value, 10) : 0)}
              disabled
              helpText="Auto-calculated from My Investors & added investors"
            />
            <Input
              label="Successful Fundraises (Startups)"
              type="number"
              value={profile.successful_fundraises_startups ?? ''}
              onChange={(e) => handleChange('successful_fundraises_startups', e.target.value ? parseInt(e.target.value, 10) : 0)}
              disabled
              helpText="Auto-calculated from My Investments (Stage 4)"
            />
          </div>
        </div>

        {/* Verified (On-Platform) Metrics */}
        <div className="space-y-4">
          <h4 className="text-base font-medium text-slate-700 border-b pb-2">Verified (On-Platform)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Verified Startups Under Management"
              type="number"
              value={profile.verified_startups_under_management ?? ''}
              onChange={(e) => handleChange('verified_startups_under_management', e.target.value ? parseInt(e.target.value, 10) : 0)}
              disabled
              helpText="TMS startups only"
            />
            <Input
              label="Verified Investors Under Management"
              type="number"
              value={profile.verified_investors_under_management ?? ''}
              onChange={(e) => handleChange('verified_investors_under_management', e.target.value ? parseInt(e.target.value, 10) : 0)}
              disabled
              helpText="TMS investors only"
            />
            <Input
              label="Verified Successful Fundraises"
              type="number"
              value={profile.verified_successful_fundraises_startups ?? ''}
              onChange={(e) => handleChange('verified_successful_fundraises_startups', e.target.value ? parseInt(e.target.value, 10) : 0)}
              disabled
              helpText="Stage 4 investments with TMS parties"
            />
          </div>
        </div>

        {/* Service Details */}
        <div className="space-y-4">
          <h4 className="text-base font-medium text-slate-700 border-b pb-2">Service Details</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Minimum Investment"
              type="number"
              value={profile.minimum_investment || ''}
              onChange={(e) => handleChange('minimum_investment', e.target.value ? parseFloat(e.target.value) : undefined)}
              disabled={!isEditing || isViewOnly}
            />
            
            <Input
              label="Maximum Investment"
              type="number"
              value={profile.maximum_investment || ''}
              onChange={(e) => handleChange('maximum_investment', e.target.value ? parseFloat(e.target.value) : undefined)}
              disabled={!isEditing || isViewOnly}
            />
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Currency
              </label>
              <Select
                value={profile.currency || 'USD'}
                onChange={(e) => handleChange('currency', e.target.value)}
                disabled={!isEditing || isViewOnly}
              >
                {loadingCurrencies ? (
                  <option>Loading...</option>
                ) : (
                  currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.name} ({currency.code})
                    </option>
                  ))
                )}
              </Select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Service Description
            </label>
            <textarea
              value={profile.service_description || ''}
              onChange={(e) => handleChange('service_description', e.target.value)}
              disabled={!isEditing || isViewOnly}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed"
              placeholder="Describe your services, expertise, and value proposition..."
            />
          </div>
        </div>

        {/* Media Section */}
        <div className="space-y-4">
          <h4 className="text-base font-medium text-slate-700 border-b pb-2">Media</h4>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Media Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="logo"
                  checked={profile.media_type === 'logo'}
                  onChange={(e) => handleChange('media_type', e.target.value)}
                  disabled={!isEditing || isViewOnly}
                  className="mr-2"
                />
                <span className="text-sm text-slate-700">Logo</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="video"
                  checked={profile.media_type === 'video'}
                  onChange={(e) => handleChange('media_type', e.target.value)}
                  disabled={!isEditing || isViewOnly}
                  className="mr-2"
                />
                <span className="text-sm text-slate-700">Video</span>
              </label>
            </div>
          </div>

          {profile.media_type === 'logo' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Logo Input Method
                </label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="upload"
                      checked={logoInputMethod === 'upload'}
                      onChange={(e) => setLogoInputMethod(e.target.value as 'upload' | 'url')}
                      disabled={!isEditing || isViewOnly}
                      className="mr-2"
                    />
                    <span className="text-sm text-slate-700">Upload</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="url"
                      checked={logoInputMethod === 'url'}
                      onChange={(e) => setLogoInputMethod(e.target.value as 'upload' | 'url')}
                      disabled={!isEditing || isViewOnly}
                      className="mr-2"
                    />
                    <span className="text-sm text-slate-700">URL</span>
                  </label>
                </div>
              </div>

              {logoInputMethod === 'upload' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Upload Logo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={!isEditing || isViewOnly}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-slate-500">Max file size: 5MB. Supported formats: JPEG, PNG, GIF, WebP, SVG</p>
                </div>
              ) : (
                <Input
                  label="Logo URL"
                  type="url"
                  value={logoUrlInput}
                  onChange={(e) => handleLogoUrlChange(e.target.value)}
                  disabled={!isEditing || isViewOnly}
                  placeholder="https://example.com/logo.png"
                />
              )}

              {profile.logo_url && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-slate-700 mb-2">Preview:</p>
                  <div className="w-32 h-32 border border-slate-300 rounded-md p-2 bg-white">
                    <img
                      src={profile.logo_url}
                      alt="Logo preview"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {profile.media_type === 'video' && (
            <Input
              label="YouTube Video URL"
              type="url"
              value={profile.video_url || ''}
              onChange={(e) => handleChange('video_url', e.target.value)}
              disabled={!isEditing || isViewOnly}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          )}
        </div>

        {/* Save Button */}
        {!isViewOnly && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    loadProfile(); // Reload to discard changes
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestmentAdvisorProfileForm;

