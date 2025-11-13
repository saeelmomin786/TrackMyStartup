import React, { useState, useEffect, useRef } from 'react';
import { Startup, Subsidiary, InternationalOp, ProfileData, ServiceProvider } from '../../types';
import { profileService, ProfileNotification } from '../../lib/profileService';
import { complianceRulesComprehensiveService } from '../../lib/complianceRulesComprehensiveService';
import { authService } from '../../lib/auth';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Plus, Trash2, Edit3, Save, X, Bell, UserCheck, ShieldCheck, Download } from 'lucide-react';
import { getCurrencyForCountryCode } from '../../lib/utils';

interface ProfileTabProps {
  startup: Startup;
  userRole?: string;
  onProfileUpdate?: (startup: Startup) => void;
  isViewOnly?: boolean;
  currentUser?: any; // Add current user prop
}

type LocalSubsidiary = Subsidiary & { 
  caCode?: string; 
  csCode?: string;
  ca?: ServiceProvider;
  cs?: ServiceProvider;
};

type LocalFormData = Omit<ProfileData, 'subsidiaries'> & {
  subsidiaries: LocalSubsidiary[];
  caCode?: string;
  csCode?: string;
  ca?: ServiceProvider;
  cs?: ServiceProvider;
  currency?: string;
};

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <input {...props} className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-700" />
  </div>
);

const ServiceCodeInput: React.FC<{
  name: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  isValid?: boolean;
  isInvalid?: boolean;
  isLoading?: boolean;
  errorMessage?: string;
}> = ({ name, placeholder, value, onChange, disabled, isValid, isInvalid, isLoading, errorMessage }) => (
  <div className="relative">
    <input
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full bg-white border rounded-md px-3 py-2 text-slate-900 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed pr-10 ${
        isInvalid 
          ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
          : isValid 
            ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
            : 'border-slate-300'
      }`}
    />
    
    {/* Validation Status Icon */}
    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
      {isLoading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      ) : isValid ? (
        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      ) : isInvalid ? (
        <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      ) : null}
    </div>
    
    {/* Error Message */}
    {isInvalid && errorMessage && (
      <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
    )}
  </div>
);

const FormSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: React.ReactNode }> = ({ label, children, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <select {...props} className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-700">
      {children}
    </select>
  </div>
);

const ServiceProviderDisplay: React.FC<{ 
  provider: ServiceProvider; 
  onRemove: () => void; 
  isEditing: boolean;
  type: 'ca' | 'cs';
}> = ({ provider, onRemove, isEditing, type }) => (
  <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center h-full shadow-sm hover:shadow-md transition-shadow">
    <div>
      <p className="font-bold text-slate-900">{provider.name}</p>
      <p className="text-sm text-slate-600 mt-1">Code: {provider.code}</p>
    </div>
    {isEditing && (
      <button 
        onClick={onRemove} 
        className="text-slate-600 hover:text-red-600 font-semibold text-sm bg-white px-3 py-1 rounded-lg border border-slate-200 hover:border-red-200 transition-colors"
      >
        Change
      </button>
    )}
  </div>
);

const ProfileTab: React.FC<ProfileTabProps> = ({ startup, userRole, onProfileUpdate, isViewOnly = false, currentUser }) => {
      const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<ProfileNotification[]>([]);
  const [csRequestLoading, setCsRequestLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  // DB-driven catalogs from compliance_rules
  const [rulesMap, setRulesMap] = useState<any>({}); // { [country]: rulesJson }
  const [allCountries, setAllCountries] = useState<string[]>([]);
  
  // Validation status for CA/CS codes
  const [caCodeValidation, setCaCodeValidation] = useState<{
    isValid: boolean;
    isInvalid: boolean;
    isLoading: boolean;
    errorMessage: string;
  }>({ isValid: false, isInvalid: false, isLoading: false, errorMessage: '' });
  
  const [csCodeValidation, setCsCodeValidation] = useState<{
    isValid: boolean;
    isInvalid: boolean;
    isLoading: boolean;
    errorMessage: string;
  }>({ isValid: false, isInvalid: false, isLoading: false, errorMessage: '' });
  
  const [subsidiaryCodeValidation, setSubsidiaryCodeValidation] = useState<{
    [key: number]: {
      ca: { isValid: boolean; isInvalid: boolean; isLoading: boolean; errorMessage: string; };
      cs: { isValid: boolean; isInvalid: boolean; isLoading: boolean; errorMessage: string; };
    };
  }>({});
  // Track last entity-defining signature to prevent unnecessary compliance syncs
  const lastEntitySignatureRef = useRef<string | null>(null);

  const computeEntitySignature = (data: Partial<LocalFormData>): string => {
    const signature = {
      country: data.country || '',
      companyType: data.companyType || '',
      registrationDate: data.registrationDate || '',
      subsidiaries: (data.subsidiaries || []).map(s => ({ country: s.country, companyType: s.companyType })),
      internationalOps: (data.internationalOps || []).map(op => ({ country: op.country, companyType: op.companyType }))
    };
    return JSON.stringify(signature);
  };
    // CA should have view-only access across tabs except compliance. No profile editing.
    const canEdit = (userRole === 'Startup' || userRole === 'Admin') && !isViewOnly;
    
    // Edit button visibility check
    
    // Helper function to sanitize profile data and ensure all values are strings
    const sanitizeProfileData = (data: any): LocalFormData => {
        const sanitized = {
        country: data.country || '',
        companyType: data.companyType || '',
        registrationDate: data.registrationDate || '',
        currency: data.currency || 'USD',
        subsidiaries: (data.subsidiaries || []).map((sub: any) => ({
            id: sub.id || 0,
            country: sub.country || '', // Keep existing data, don't override with defaults
            companyType: sub.companyType || '', // Keep existing data, don't override with defaults
                registrationDate: sub.registrationDate || '',
                caCode: sub.caCode || sub.ca_service_code || '',
                csCode: sub.csCode || sub.cs_service_code || '',
                ca: sub.ca || undefined,
                cs: sub.cs || undefined,
        })),
        internationalOps: (data.internationalOps || []).map((op: any) => ({
            id: op.id || 0,
            country: op.country || '', // Keep existing data, don't override with defaults
            companyType: op.companyType || '', // Keep existing data, don't override with defaults
                startDate: op.startDate || ''
            })),
            caServiceCode: data.caServiceCode || data.ca_service_code || '',
            csServiceCode: data.csServiceCode || data.cs_service_code || '',
            caCode: data.caServiceCode || data.ca_service_code || '',
            csCode: data.csServiceCode || data.cs_service_code || '',
            ca: data.ca || undefined,
            cs: data.cs || undefined,
        };
        
        return sanitized;
    };
    
    // Real profile data from database - initialize with empty values, will be loaded from profile
  const [formData, setFormData] = useState<LocalFormData>({
        country: '',
        companyType: '',
        registrationDate: startup.registrationDate || new Date().toISOString().split('T')[0],
    subsidiaries: [],
    internationalOps: [],
        caServiceCode: '',
        csServiceCode: '',
        currency: 'USD',
    });

    // Compute company types for the currently selected country from comprehensive compliance rules
    const companyTypesByCountry = React.useMemo<string[]>(() => {
        if (!formData.country) {
            return [];
        }
        
        // Find the country code for the selected country name
        let countryCode = formData.country;
        
        // If formData.country is a country name (like "India"), find the corresponding country code
        if (formData.country && !rulesMap[formData.country]) {
            // Look for a country code that matches this country name
            for (const [code, data] of Object.entries(rulesMap)) {
                if (data.country_name === formData.country) {
                    countryCode = code;
                    break;
                }
            }
        }
        
        // Get all company types for the selected country from comprehensive rules
        const countryData = rulesMap[countryCode];
        
        if (!countryData || !countryData.company_types) {
            return [];
        }
        
        const companyTypes = Object.keys(countryData.company_types);
        return companyTypes;
    }, [rulesMap, formData.country]);

    // Get available countries from comprehensive compliance rules
    const availableCountries = React.useMemo<string[]>(() => {
        return allCountries.filter(country => country !== 'default');
    }, [allCountries]);

    // Load profile data
    useEffect(() => {
        const loadProfileData = async () => {
            try {
                setIsLoading(true);
                const profileData = await profileService.getStartupProfile(startup.id);
                
                if (profileData) {
                    console.log('🔍 Raw profile data loaded:', profileData);
                    console.log('🔍 Company type from database:', profileData.companyType);
                    // Sanitize profile data to ensure all values are properly initialized
                    const sanitizedData = sanitizeProfileData(profileData);
                    console.log('🔍 Sanitized data for form:', sanitizedData);
                    console.log('🔍 Sanitized company type:', sanitizedData.companyType);
                    
                    // Convert country name to country code if needed
                    if (sanitizedData.country && rulesMap && Object.keys(rulesMap).length > 0) {
                        // If the country is a name (like "India"), find the corresponding country code
                        if (!rulesMap[sanitizedData.country]) {
                            for (const [code, data] of Object.entries(rulesMap)) {
                                if (data.country_name === sanitizedData.country) {
                                    sanitizedData.country = code;
                                    break;
                                }
                            }
                        }
                    }
                    
                    setFormData(sanitizedData);
          // Initialize last entity signature on initial load
          lastEntitySignatureRef.current = computeEntitySignature(sanitizedData);
                }
                
                // Load user profile data to get verification documents
                try {
                    console.log('🔍 Starting user profile document fetch...');
                    const { data: { user }, error: userError } = await authService.supabase.auth.getUser();
                    
                    if (userError) {
                        console.error('❌ Auth error:', userError);
                        return;
                    }
                    
                    if (!user) {
                        console.error('❌ No authenticated user found');
                        return;
                    }
                    
                    console.log('🔍 Authenticated user:', user.id, user.email);
                    
                    const { data: userProfiles, error: profileError } = await authService.supabase
                        .from('users')
                        .select('government_id, ca_license, verification_documents, logo_url, financial_advisor_license_url, investment_advisor_code')
                        .eq('id', user.id);
                    
                    const userProfile = userProfiles && userProfiles.length > 0 ? userProfiles[0] : null;
                    
                    if (profileError) {
                        console.error('❌ Profile fetch error:', profileError);
                        return;
                    }
                    
                    console.log('🔍 User profile documents loaded:', userProfile);
                    
                    if (userProfile) {
                        // Store user profile data for document display
                        setUserProfile(userProfile);
                        console.log('✅ User profile state updated');
                    } else {
                        console.log('⚠️ No user profile data found');
                    }
                } catch (error) {
                    console.error('❌ Error loading user profile documents:', error);
                }
                
                // Fallback: Use currentUser data if available
                if (!userProfile && currentUser) {
                    console.log('🔄 Using currentUser data as fallback:', currentUser);
                    const fallbackProfile = {
                        government_id: currentUser.government_id,
                        ca_license: currentUser.ca_license,
                        verification_documents: currentUser.verification_documents,
                        logo_url: currentUser.logo_url,
                        financial_advisor_license_url: currentUser.financial_advisor_license_url,
                        investment_advisor_code: currentUser.investment_advisor_code
                    };
                    setUserProfile(fallbackProfile);
                    console.log('✅ Fallback user profile set:', fallbackProfile);
                }
                
                // Load notifications
                const profileNotifications = await profileService.getProfileNotifications(startup.id);
                setNotifications(profileNotifications);

                // Load admin-managed compliance rule catalogs for dropdowns
                try {
                    const rules = await complianceRulesComprehensiveService.getAllRules();
                    const map: any = {};
                    const countries = new Set<string>();
                    
                    rules.forEach(rule => {
                        countries.add(rule.country_code);
                        if (!map[rule.country_code]) {
                            map[rule.country_code] = {
                                country_name: rule.country_name,
                                company_types: {}
                            };
                        }
                        
                        // Only process actual company types, not CA/CS types or setup entries
                        const companyType = rule.company_type;
                        if (companyType && 
                            !companyType.toLowerCase().includes('setup') && 
                            !companyType.toLowerCase().includes('ca type') && 
                            !companyType.toLowerCase().includes('cs type') &&
                            companyType !== rule.ca_type &&
                            companyType !== rule.cs_type) {
                            
                            if (!map[rule.country_code].company_types[companyType]) {
                                map[rule.country_code].company_types[companyType] = [];
                            }
                            map[rule.country_code].company_types[companyType].push({
                                id: rule.id,
                                name: rule.compliance_name,
                                description: rule.compliance_description,
                                frequency: rule.frequency,
                                verification_required: rule.verification_required
                            });
                        }
                    });
                    
                    setRulesMap(map);
                    setAllCountries(Array.from(countries));
                } catch (e) {
                    console.warn('Failed to load compliance rules for dropdowns', e);
                }
            } catch (error) {
                console.error('Error loading profile data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadProfileData();
    }, [startup.id]);

    // Realtime: refresh catalogs when admin updates compliance_rules_comprehensive
    useEffect(() => {
        const channel = profileService.supabase
            .channel('profile_rules_catalogs')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'compliance_rules_comprehensive' },
                async () => {
                    try {
                        const rules = await complianceRulesComprehensiveService.getAllRules();
                        const map: any = {};
                        const countries = new Set<string>();
                        
                        rules.forEach(rule => {
                            countries.add(rule.country_code);
                            if (!map[rule.country_code]) {
                                map[rule.country_code] = {
                                    country_name: rule.country_name,
                                    company_types: {}
                                };
                            }
                            
                            // Only process actual company types, not CA/CS types or setup entries
                            const companyType = rule.company_type;
                            if (companyType && 
                                !companyType.toLowerCase().includes('setup') && 
                                !companyType.toLowerCase().includes('ca type') && 
                                !companyType.toLowerCase().includes('cs type') &&
                                companyType !== rule.ca_type &&
                                companyType !== rule.cs_type) {
                                
                                if (!map[rule.country_code].company_types[companyType]) {
                                    map[rule.country_code].company_types[companyType] = [];
                                }
                                map[rule.country_code].company_types[companyType].push({
                                    id: rule.id,
                                    name: rule.compliance_name,
                                    description: rule.compliance_description,
                                    frequency: rule.frequency,
                                    verification_required: rule.verification_required
                                });
                            }
                        });
                        
                        setRulesMap(map);
                        setAllCountries(Array.from(countries));
                    } catch (e) {
                        console.warn('Failed to refresh compliance rules for dropdowns', e);
                    }
                }
            )
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, []);

    // Real-time subscriptions - Simplified approach
    useEffect(() => {
        console.log('Setting up real-time subscriptions for startup:', startup.id);
        
        // Subscribe to startups table changes
        const startupsSubscription = profileService.supabase
            .channel(`startup_profile_${startup.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'startups',
                    filter: `id=eq.${startup.id}`
                },
                (payload) => {
                    console.log('Startup profile updated:', payload);
                    // Refresh profile data
                    profileService.getStartupProfile(startup.id).then(profileData => {
                        if (profileData) {
              setFormData(sanitizeProfileData(profileData));
              lastEntitySignatureRef.current = computeEntitySignature(sanitizeProfileData(profileData));
                        }
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'subsidiaries',
                    filter: `startup_id=eq.${startup.id}`
                },
                (payload) => {
                    console.log('Subsidiary change detected:', payload);
                    // Refresh profile data
                    profileService.getStartupProfile(startup.id).then(profileData => {
                        if (profileData) {
              setFormData(sanitizeProfileData(profileData));
              lastEntitySignatureRef.current = computeEntitySignature(sanitizeProfileData(profileData));
                        }
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'international_ops',
                    filter: `startup_id=eq.${startup.id}`
                },
                (payload) => {
                    console.log('International operation change detected:', payload);
                    // Refresh profile data
                    profileService.getStartupProfile(startup.id).then(profileData => {
                        if (profileData) {
              setFormData(sanitizeProfileData(profileData));
              lastEntitySignatureRef.current = computeEntitySignature(sanitizeProfileData(profileData));
                        }
                    });
                }
            )
            .subscribe();

        return () => {
            console.log('Cleaning up real-time subscriptions');
            startupsSubscription.unsubscribe();
        };
    }, [startup.id]);

    // Convert country name to country code when rulesMap is loaded
    React.useEffect(() => {
        if (formData.country && rulesMap && Object.keys(rulesMap).length > 0) {
            // If the country is a name (like "India"), find the corresponding country code
            if (!rulesMap[formData.country]) {
                for (const [code, data] of Object.entries(rulesMap)) {
                    if (data.country_name === formData.country) {
                        setFormData(prev => ({
                            ...prev,
                            country: code
                        }));
                        break;
                    }
                }
            }
        }
    }, [formData.country, rulesMap]);

    // Auto-fix invalid company types when profile loads
    React.useEffect(() => {
    if (formData.country && formData.companyType && companyTypesByCountry.length > 0) {
      const validTypes = companyTypesByCountry;
      if (!validTypes.includes(formData.companyType)) {
        console.log(`🔧 Auto-fixing invalid company type: ${formData.companyType} -> ${validTypes[0]} for country: ${formData.country}`);
        setFormData(prev => ({
                    ...prev,
                    companyType: validTypes[0]
                }));
            }
        }
  }, [formData.country, formData.companyType, companyTypesByCountry]);

  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    setIsEditing(false);
    // Reload original data
    profileService.getStartupProfile(startup.id).then(profileData => {
      if (profileData) {
        setFormData(sanitizeProfileData(profileData));
      }
    });
  };

    const handleSave = async () => {
        try {
            
            // First validate basic profile data
            const validation = profileService.validateProfileData(formData);
            if (!validation.isValid) {
                const errorMessage = validation.errors.map(error => {
                    if (error === 'Invalid company type for selected country') {
                        const validTypes = profileService.getCompanyTypesByCountry(formData.country);
                        return `Invalid company type for ${formData.country}. Valid types are: ${validTypes.join(', ')}`;
                    }
                    return error;
                }).join('\n');
                setValidationErrors(errorMessage.split('\n'));
                // Scroll to top where the banner is
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            // Then validate CA/CS service codes against backend
            const serviceCodeValidation = await profileService.validateServiceCodes(formData);
            if (!serviceCodeValidation.isValid) {
                const errorMessage = serviceCodeValidation.errors.join('\n');
                setValidationErrors(errorMessage.split('\n'));
                // Scroll to top where the banner is
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            
            setValidationErrors([]);

            console.log('🔍 Saving form data:', formData);
            console.log('🔍 Company type being saved:', formData.companyType);
            const success = await profileService.updateStartupProfile(startup.id, formData);
            console.log('🔍 Save result:', success);
            
            // Handle subsidiaries - add, update, or delete as needed
            const currentSubsidiaries = await profileService.getStartupProfile(startup.id);
            const existingSubIds = currentSubsidiaries?.subsidiaries?.map(sub => sub.id) || [];
            const newSubIds = formData.subsidiaries.map(sub => sub.id);
            
            // Delete subsidiaries that are no longer in the list
            for (const existingId of existingSubIds) {
                if (!newSubIds.includes(existingId)) {
                    await profileService.deleteSubsidiary(existingId);
                }
            }
            
            // Add or update subsidiaries
            for (let i = 0; i < formData.subsidiaries.length; i++) {
                const sub = formData.subsidiaries[i];
                if (sub.id && sub.id > 0) {
                    // Update existing subsidiary
                    await profileService.updateSubsidiary(sub.id, {
                        country: sub.country,
                        companyType: sub.companyType,
                        registrationDate: sub.registrationDate
                    });
                    
                    // Update service providers
                    if (sub.caCode) {
                        await profileService.updateSubsidiaryServiceProvider(sub.id, 'ca', sub.caCode);
                    }
                    if (sub.csCode) {
                        await profileService.updateSubsidiaryServiceProvider(sub.id, 'cs', sub.csCode);
                    }
                } else {
                    // Add new subsidiary
                    const newSubId = await profileService.addSubsidiary(startup.id, {
                        country: sub.country,
                        companyType: sub.companyType,
                        registrationDate: sub.registrationDate
                    });
                    
                    if (newSubId) {
                        // Update service providers for new subsidiary
                        if (sub.caCode) {
                            await profileService.updateSubsidiaryServiceProvider(newSubId, 'ca', sub.caCode);
                        }
                        if (sub.csCode) {
                            await profileService.updateSubsidiaryServiceProvider(newSubId, 'cs', sub.csCode);
                        }
                    }
                }
            }
            
            // Handle international operations - add, update, or delete as needed
            const existingOpIds = currentSubsidiaries?.internationalOps?.map(op => op.id) || [];
            const newOpIds = formData.internationalOps.map(op => op.id);
            
            // Delete operations that are no longer in the list
            for (const existingId of existingOpIds) {
                if (!newOpIds.includes(existingId)) {
                    await profileService.deleteInternationalOp(existingId);
                }
            }
            
            // Add or update international operations
            for (let i = 0; i < formData.internationalOps.length; i++) {
                const op = formData.internationalOps[i];
                if (op.id && op.id > 0) {
                    // Update existing operation
                    await profileService.updateInternationalOp(op.id, {
                        country: op.country,
                        companyType: op.companyType,
                        startDate: op.startDate
                    });
                } else {
                    // Add new operation
                    await profileService.addInternationalOp(startup.id, {
                        country: op.country,
                        companyType: op.companyType,
                        startDate: op.startDate
                    });
                }
            }
            
            if (success) {
        setIsEditing(false);
                console.log('Profile updated successfully');
                
                // Manually refresh the profile data to ensure UI updates
                const updatedProfile = await profileService.getStartupProfile(startup.id);
                console.log('🔍 Refreshed profile data:', updatedProfile);
                if (updatedProfile) {
                    const sanitizedData = sanitizeProfileData(updatedProfile);
                    console.log('🔍 Sanitized data for form:', sanitizedData);
                    setFormData(sanitizedData);
                    // Notify parent so other tabs receive updated profile
                    console.log('🔍 ProfileTab: Checking if onProfileUpdate callback exists...', { hasCallback: !!onProfileUpdate });
                    if (onProfileUpdate) {
                        console.log('🔄 ProfileTab: Calling onProfileUpdate callback with updated profile data...', {
                            subsidiaries: updatedProfile.subsidiaries?.length || 0,
                            hasProfile: true
                        });
                        onProfileUpdate({
                            ...startup,
                            // Update direct fields for compatibility with other tabs
                            country_of_registration: updatedProfile.country,
                            company_type: updatedProfile.companyType,
                            registration_date: updatedProfile.registrationDate,
                            currency: updatedProfile.currency, // Add currency directly to startup object
                            profile: {
                                country: updatedProfile.country,
                                companyType: updatedProfile.companyType,
                                registrationDate: updatedProfile.registrationDate,
                                currency: updatedProfile.currency,
                                subsidiaries: updatedProfile.subsidiaries || [],
                                internationalOps: updatedProfile.internationalOps || [],
                                caServiceCode: updatedProfile.caServiceCode,
                                csServiceCode: updatedProfile.csServiceCode,
                                ca: updatedProfile.ca,
                                cs: updatedProfile.cs,
                            },
                        });
                    }
                }
                
                // Trigger compliance task sync only when primary/entity fields changed
                const prevSignature = lastEntitySignatureRef.current;
                const nextSignature = computeEntitySignature(updatedProfile || formData);
                const shouldSync = prevSignature !== nextSignature;
                lastEntitySignatureRef.current = nextSignature;
                if (shouldSync) {
                  try {
                      await profileService.syncComplianceTasks(startup.id);
                  } catch (error) {
                      console.error('❌ Error syncing compliance tasks:', error);
                  }
                } else {
                  console.log('ℹ️ No primary/entity change detected. Skipping compliance sync.');
                }

            } else {
                console.error('❌ Failed to update profile - success was false');
                setValidationErrors(['Failed to update profile']);
            }
        } catch (error) {
            console.error('❌ Error saving profile:', error);
            let errorMessage = 'Error saving profile';
            if (error instanceof Error) {
                errorMessage = error.message;
                console.error('❌ Detailed error:', error);
            }
            setValidationErrors([errorMessage]);
        }
    };

  const handlePrimaryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'countryOfRegistration') {
      const cr = rulesMap[value] || rulesMap['default'] || {};
      const keys = Object.keys(cr).filter(k => k !== 'default');
      const newCountryTypes = keys.length > 0 ? keys : (cr['default'] ? ['default'] : []);
      
      // Auto-select currency based on country
      const autoSelectedCurrency = getCurrencyForCountryCode(value);
      
      // Only reset company type if the country actually changed
      setFormData(prev => {
        const newData = {
          ...prev,
          country: value,
          currency: autoSelectedCurrency // Auto-select currency based on country
        };
        
        // Only reset company type if country changed AND current company type is not valid for new country
        if (prev.country !== value && !newCountryTypes.includes(prev.companyType)) {
          newData.companyType = newCountryTypes[0] || '';
        }
        
        return newData;
      });
    } else if (name === 'registrationDate') {
      // Validate that registration date is not in the future
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Set to end of today to allow today's date
      
      if (selectedDate > today) {
        // Show error notification
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'error',
          message: 'Registration date cannot be in the future',
          timestamp: new Date()
        }]);
        return; // Don't update the date
      }
      
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      console.log('🔍 Form field changed:', name, 'value:', value);
      if (name === 'companyType') {
        console.log('🔍 Company type selected:', value);
      }
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleServiceCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const isCA = name === 'caCode';
    
    // Clear any previous validation errors for this field
    setValidationErrors(prev => prev.filter(error => 
      !error.includes(isCA ? 'CA code' : 'CS code')
    ));
    
    // Reset validation state for this field
    if (isCA) {
      setCaCodeValidation({ isValid: false, isInvalid: false, isLoading: false, errorMessage: '' });
    } else {
      setCsCodeValidation({ isValid: false, isInvalid: false, isLoading: false, errorMessage: '' });
    }
    
    // Keep typed code and canonical serviceCode in sync so it persists via updateStartupProfile
    setFormData(prev => ({ 
      ...prev, 
      [name]: value,
      [isCA ? 'caServiceCode' : 'csServiceCode']: value
    }));
    
    // Clear the service provider object when code changes
    setFormData(prev => ({
      ...prev,
      [isCA ? 'ca' : 'cs']: undefined
    }));
    
    // If we have a valid service code, try to fetch the service provider details
    if (value && value.length >= 3) {
      // Set loading state
      if (isCA) {
        setCaCodeValidation(prev => ({ ...prev, isLoading: true }));
      } else {
        setCsCodeValidation(prev => ({ ...prev, isLoading: true }));
      }
      
      try {
        const providerType = isCA ? 'ca' : 'cs';
        console.log('🔍 Fetching service provider:', { value, providerType });
        const provider = await profileService.getServiceProvider(value, providerType);
        console.log('🔍 Service provider result:', provider);
        
        if (provider) {
          setFormData(prev => ({
            ...prev,
            [providerType]: provider
          }));
          
          // Set valid state
          if (isCA) {
            setCaCodeValidation({ isValid: true, isInvalid: false, isLoading: false, errorMessage: '' });
          } else {
            setCsCodeValidation({ isValid: true, isInvalid: false, isLoading: false, errorMessage: '' });
          }
        } else {
          // Set invalid state
          const errorMessage = `Invalid ${isCA ? 'CA' : 'CS'} code: ${value}. Please enter a valid service provider code.`;
          if (isCA) {
            setCaCodeValidation({ isValid: false, isInvalid: true, isLoading: false, errorMessage });
          } else {
            setCsCodeValidation({ isValid: false, isInvalid: true, isLoading: false, errorMessage });
          }
          setValidationErrors(prev => [...prev, errorMessage]);
        }
        
        // If this is a CS code and provider was found, automatically create an assignment request and save profile
        if (!isCA && value && provider) {
            setCsRequestLoading(true);
            try {
              // First, save the profile to ensure CS code is stored in database
              console.log('🔍 Auto-saving profile with valid CS code:', value);
              const saveSuccess = await profileService.updateStartupProfile(startup.id, {
                ...formData,
                csServiceCode: value
              });
              
              if (!saveSuccess) {
                throw new Error('Failed to save profile');
              }
              
              // Then create the assignment request
              const { startupService } = await import('../../lib/startupService');
              const result = await startupService.requestCSAssignment(
                value, 
                `Assignment request from ${value}`,
                startup.id,
                startup.name
              );
              
              if (result.success) {
                console.log('CS assignment request created successfully');
                // Show success notification
                setNotifications(prev => [...prev, {
                  id: Date.now(),
                  type: 'success',
                  message: `CS assignment request sent to ${value} and profile saved`,
                  timestamp: new Date()
                }]);
              } else {
                console.error('Failed to create CS assignment request:', result.error);
                // Show error notification
                setNotifications(prev => [...prev, {
                  id: Date.now(),
                  type: 'error',
                  message: `Failed to request CS assignment: ${result.error}`,
                  timestamp: new Date()
                }]);
              }
            } catch (error) {
              console.error('Error creating CS assignment request:', error);
              setNotifications(prev => [...prev, {
                id: Date.now(),
                type: 'error',
                  message: 'Failed to request CS assignment',
                  timestamp: new Date()
              }]);
            } finally {
              setCsRequestLoading(false);
            }
          }
      } catch (error) {
        console.error('Error fetching service provider:', error);
        // Show error for network/database issues
        const errorMessage = `Error validating ${isCA ? 'CA' : 'CS'} code. Please try again.`;
        if (isCA) {
          setCaCodeValidation({ isValid: false, isInvalid: true, isLoading: false, errorMessage });
        } else {
          setCsCodeValidation({ isValid: false, isInvalid: true, isLoading: false, errorMessage });
        }
        setValidationErrors(prev => [...prev, errorMessage]);
      }
    } else {
      // Clear validation state if code is too short
      if (isCA) {
        setCaCodeValidation({ isValid: false, isInvalid: false, isLoading: false, errorMessage: '' });
      } else {
        setCsCodeValidation({ isValid: false, isInvalid: false, isLoading: false, errorMessage: '' });
      }
      
      // If CA or CS code is cleared (empty), save the profile with empty code
      if (value === '') {
        try {
          console.log(`🔍 Auto-saving profile with cleared ${isCA ? 'CA' : 'CS'} code`);
          await profileService.updateStartupProfile(startup.id, {
            ...formData,
            [isCA ? 'caServiceCode' : 'csServiceCode']: ''
          });
          console.log(`Profile saved with cleared ${isCA ? 'CA' : 'CS'} code`);
        } catch (error) {
          console.error(`Error saving profile with cleared ${isCA ? 'CA' : 'CS'} code:`, error);
        }
      }
    }
  }
  
  const handleSubsidiaryServiceCodeChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const isCA = name === 'caCode';
    
    // Clear any previous validation errors for this subsidiary field
    setValidationErrors(prev => prev.filter(error => 
      !error.includes(`Subsidiary ${index + 1}`) || 
      !error.includes(isCA ? 'CA code' : 'CS code')
    ));
    
    // Reset validation state for this subsidiary field
    setSubsidiaryCodeValidation(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [isCA ? 'ca' : 'cs']: { isValid: false, isInvalid: false, isLoading: false, errorMessage: '' }
      }
    }));
    
    const newSubs = [...formData.subsidiaries];
    newSubs[index] = {...newSubs[index], [name]: value };
    setFormData(prev => ({ ...prev, subsidiaries: newSubs }));
    
    // Clear the service provider object when code changes
    newSubs[index] = {
      ...newSubs[index],
      [isCA ? 'ca' : 'cs']: undefined
    };
    setFormData(prev => ({ ...prev, subsidiaries: newSubs }));
    
    // If we have a valid service code, try to fetch the service provider details
    if (value && value.length >= 3) {
      // Set loading state
      setSubsidiaryCodeValidation(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          [isCA ? 'ca' : 'cs']: { isValid: false, isInvalid: false, isLoading: true, errorMessage: '' }
        }
      }));
      
      try {
        const providerType = isCA ? 'ca' : 'cs';
        const provider = await profileService.getServiceProvider(value, providerType);
        
        if (provider) {
          const updatedSubs = [...formData.subsidiaries];
          updatedSubs[index] = {
            ...updatedSubs[index],
            [providerType]: provider
          };
          setFormData(prev => ({ ...prev, subsidiaries: updatedSubs }));
          
          // Set valid state
          setSubsidiaryCodeValidation(prev => ({
            ...prev,
            [index]: {
              ...prev[index],
              [isCA ? 'ca' : 'cs']: { isValid: true, isInvalid: false, isLoading: false, errorMessage: '' }
            }
          }));
        } else {
          // Set invalid state
          const errorMessage = `Subsidiary ${index + 1}: Invalid ${isCA ? 'CA' : 'CS'} code "${value}". Please enter a valid service provider code.`;
          setSubsidiaryCodeValidation(prev => ({
            ...prev,
            [index]: {
              ...prev[index],
              [isCA ? 'ca' : 'cs']: { isValid: false, isInvalid: true, isLoading: false, errorMessage }
            }
          }));
          setValidationErrors(prev => [...prev, errorMessage]);
        }
          
        // If this is a CS code and provider was found, automatically create an assignment request and save profile
        if (name === 'csCode' && value && provider) {
          setCsRequestLoading(true);
          try {
            // First, save the profile to ensure CS code is stored in database
            console.log('🔍 Auto-saving profile with subsidiary CS code:', value);
            const saveSuccess = await profileService.updateStartupProfile(startup.id, formData);
            
            if (!saveSuccess) {
              throw new Error('Failed to save profile');
            }
            
            // Then create the assignment request
            const { startupService } = await import('../../lib/startupService');
            const result = await startupService.requestCSAssignment(
              value, 
              `Assignment request from ${startup.name} subsidiary`,
              startup.id,
              startup.name
            );
            
            if (result.success) {
              console.log('CS assignment request created successfully for subsidiary');
              // Show success notification
              setNotifications(prev => [...prev, {
                id: Date.now(),
                type: 'success',
                message: `CS assignment request sent to ${value} for subsidiary and profile saved`,
                timestamp: new Date()
              }]);
            } else {
              console.error('Failed to create CS assignment request for subsidiary:', result.error);
              // Show error notification
              setNotifications(prev => [...prev, {
                id: Date.now(),
                type: 'error',
                message: `Failed to request CS assignment for subsidiary: ${result.error}`,
                timestamp: new Date()
              }]);
            }
          } catch (error) {
            console.error('Error creating CS assignment request for subsidiary:', error);
            setNotifications(prev => [...prev, {
              id: Date.now(),
              type: 'error',
              message: 'Failed to request CS assignment for subsidiary',
              timestamp: new Date()
            }]);
          } finally {
            setCsRequestLoading(false);
          }
        }
      } catch (error) {
        console.error('Error fetching service provider:', error);
        // Show error for network/database issues
        const errorMessage = `Error validating ${isCA ? 'CA' : 'CS'} code. Please try again.`;
        setSubsidiaryCodeValidation(prev => ({
          ...prev,
          [index]: {
            ...prev[index],
            [isCA ? 'ca' : 'cs']: { isValid: false, isInvalid: true, isLoading: false, errorMessage }
          }
        }));
        setValidationErrors(prev => [...prev, errorMessage]);
      }
    } else {
      // Clear validation state if code is too short
      setSubsidiaryCodeValidation(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          [isCA ? 'ca' : 'cs']: { isValid: false, isInvalid: false, isLoading: false, errorMessage: '' }
        }
      }));
      
      // If CA or CS code is cleared (empty), save the profile with empty code
      if (value === '') {
        try {
          console.log(`🔍 Auto-saving profile with cleared subsidiary ${isCA ? 'CA' : 'CS'} code`);
          await profileService.updateStartupProfile(startup.id, formData);
          console.log(`Profile saved with cleared subsidiary ${isCA ? 'CA' : 'CS'} code`);
        } catch (error) {
          console.error(`Error saving profile with cleared subsidiary ${isCA ? 'CA' : 'CS'} code:`, error);
        }
      }
    }
  };
  
  const handleRemoveSubsidiaryProvider = (index: number, providerType: 'ca' | 'cs') => {
    const newSubs = [...formData.subsidiaries];
    newSubs[index] = { ...newSubs[index], [providerType]: undefined };
    setFormData(prev => ({ ...prev, subsidiaries: newSubs }));
  };

  const handleSubsidiaryCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const count = parseInt(e.target.value, 10);
    const currentSubs = formData.subsidiaries;
    const newSubs: LocalSubsidiary[] = [];
    
    console.log(`🔍 Changing subsidiary count from ${currentSubs.length} to ${count}`);
    
    if (count === 0) {
      // User wants 0 subsidiaries - clear the array
      console.log('🔍 Setting subsidiaries to empty array');
      setFormData(prev => ({ ...prev, subsidiaries: [] }));
      // Clear subsidiary validation states
      setSubsidiaryCodeValidation({});
    } else {
      // User wants some subsidiaries - preserve existing data where possible
      for (let i = 0; i < count; i++) {
        if (currentSubs[i]) {
          // Keep existing subsidiary data
          newSubs.push(currentSubs[i]);
        } else {
          // Create new subsidiary with empty values (will use admin-defined dropdowns)
          newSubs.push({ 
            id: 0, 
            country: '', 
            companyType: '', 
            registrationDate: '',
            caCode: '',
            csCode: '',
            ca: undefined,
            cs: undefined
          });
        }
      }
      setFormData(prev => ({ ...prev, subsidiaries: newSubs }));
      
      // Initialize validation states for new subsidiaries
      const newValidationStates: typeof subsidiaryCodeValidation = {};
      for (let i = 0; i < count; i++) {
        newValidationStates[i] = {
          ca: { isValid: false, isInvalid: false, isLoading: false, errorMessage: '' },
          cs: { isValid: false, isInvalid: false, isLoading: false, errorMessage: '' }
        };
      }
      setSubsidiaryCodeValidation(newValidationStates);
    }
  };

  const handleSubsidiaryChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newSubs = [...formData.subsidiaries];

    if (name === 'country') {
      const cr = rulesMap[value] || rulesMap['default'] || {};
      const keys = Object.keys(cr).filter(k => k !== 'default');
      const newCountryTypes = keys.length > 0 ? keys : (cr['default'] ? ['default'] : []);
      newSubs[index] = { ...newSubs[index], country: value, companyType: newCountryTypes[0] };
    } else if (name === 'registrationDate') {
      // Validate that registration date is not in the future
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Set to end of today to allow today's date
      
      if (selectedDate > today) {
        // Show error notification
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'error',
          message: 'Registration date cannot be in the future',
          timestamp: new Date()
        }]);
        return; // Don't update the date
      }
      
      newSubs[index] = { ...newSubs[index], [name]: value };
    } else {
      newSubs[index] = { ...newSubs[index], [name]: value };
    }

    setFormData(prev => ({ ...prev, subsidiaries: newSubs }));
  };

  const handleIntlOpsCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const count = parseInt(e.target.value, 10);
    const currentOps = formData.internationalOps;
    const newOps: InternationalOp[] = [];
    
    console.log(`🔍 Changing international operations count from ${currentOps.length} to ${count}`);
    
    if (count === 0) {
      // User wants 0 international operations - clear the array
      console.log('🔍 Setting international operations to empty array');
      setFormData(prev => ({ ...prev, internationalOps: [] }));
    } else {
      // User wants some international operations - preserve existing data where possible
      for (let i = 0; i < count; i++) {
        if (currentOps[i]) {
          // Keep existing operation data
          newOps.push(currentOps[i]);
        } else {
          // Create new operation with empty values (will use admin-defined dropdowns)
          newOps.push({ 
            id: 0, 
            country: '', 
            companyType: '',
            startDate: '' 
          });
        }
      }
      setFormData(prev => ({ ...prev, internationalOps: newOps }));
    }
  };

  const handleIntlOpChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newOps = [...formData.internationalOps];
    newOps[index] = { ...newOps[index], [name]: value };
    setFormData(prev => ({ ...prev, internationalOps: newOps }));
    };

    const markNotificationAsRead = async (notificationId: string) => {
        await profileService.markNotificationAsRead(notificationId);
        // Update local state
        setNotifications(prev => 
            prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Card>
                    <div className="animate-pulse">
                        <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
                        <div className="h-32 bg-slate-200 rounded"></div>
                    </div>
                </Card>
            </div>
        );
    }

    return (
    <div className="bg-slate-50 p-8 space-y-8">
            {/* Validation Errors Banner */}
            {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4">
                    <div className="font-semibold mb-2">Please fix the following issues:</div>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                        {validationErrors.map((e, i) => (
                            <li key={i}>{e}</li>
                        ))}
                    </ul>
                </div>
            )}
            {/* Notifications */}
            {notifications.filter(n => !n.is_read).length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Bell className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-slate-700">Recent Updates</h3>
                    </div>
                    <div className="space-y-2">
                        {notifications.filter(n => !n.is_read).slice(0, 3).map(notification => (
                            <div key={notification.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                <div>
                                    <p className="font-medium text-sm">{notification.title}</p>
                                    <p className="text-xs text-slate-600">{notification.message}</p>
                                </div>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => markNotificationAsRead(notification.id)}
                                >
                                    Mark Read
                                </Button>
                            </div>
                        ))}
                    </div>
        </div>
      )}


      {/* Verification Documents Section */}
      {userProfile && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-slate-700">Verification Documents</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userProfile.government_id && (
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900">Government ID</h4>
                    <p className="text-sm text-slate-600">Identity verification document</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(userProfile.government_id, '_blank')}
                    className="flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    View
                  </Button>
                </div>
              </div>
            )}
            
            {userProfile.ca_license && (
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900">Professional License</h4>
                    <p className="text-sm text-slate-600">CA/CS license or role-specific document</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(userProfile.ca_license, '_blank')}
                    className="flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    View
                  </Button>
                </div>
              </div>
            )}
            
            {userProfile.financial_advisor_license_url && (
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900">Financial Advisor License</h4>
                    <p className="text-sm text-slate-600">Investment advisor license</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(userProfile.financial_advisor_license_url, '_blank')}
                    className="flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    View
                  </Button>
                </div>
              </div>
            )}
            
            {userProfile.logo_url && (
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900">Company Logo</h4>
                    <p className="text-sm text-slate-600">Company branding logo</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(userProfile.logo_url, '_blank')}
                    className="flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    View
                  </Button>
                </div>
              </div>
            )}
            
            {userProfile.investment_advisor_code && (
              <div className="p-4 bg-slate-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-slate-900">Investment Advisor Code</h4>
                  <p className="text-sm text-slate-600">Code: {userProfile.investment_advisor_code}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-900">Company Profile</h2>
        {canEdit && !isEditing && (
          <button 
            onClick={handleEdit} 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            <Edit3 size={18} /> Edit Profile
          </button>
        )}
      </div>

      <fieldset disabled={!isEditing || !canEdit} className="space-y-8">
        {!isEditing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <p className="text-blue-800 font-medium">View Mode - Click "Edit Profile" to modify information</p>
            </div>
          </div>
        )}
        
        
        {/* Primary Details & Service Providers Card */}
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-8 hover:shadow-2xl transition-shadow duration-300">
          <div className="space-y-8">
            {/* Primary Details Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Primary Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FormSelect 
                                label="Country of Registration" 
                  name="countryOfRegistration" 
                  value={formData.country} 
                  onChange={handlePrimaryChange} 
                  disabled={!isEditing}
                            >
                                <option value="">Select Country</option>
                                {availableCountries.map(countryCode => {
                                    // Get country name from comprehensive rules
                                    const countryData = rulesMap[countryCode];
                                    const countryName = countryData?.country_name || countryCode;
                                    return <option key={countryCode} value={countryCode}>{countryName}</option>;
                                })}
                </FormSelect>
                <FormSelect 
                                label="Company Type" 
                  name="companyType" 
                  value={formData.companyType} 
                  onChange={handlePrimaryChange} 
                  disabled={!isEditing}
                            >
                                <option value="">Select Company Type</option>
                                {companyTypesByCountry.length > 0 ? (
                                    companyTypesByCountry.map(type => <option key={type} value={type}>{type}</option>)
                                ) : (
                                    <>
                                        <option value="Private Limited Company (Pvt. Ltd.)">Private Limited Company (Pvt. Ltd.)</option>
                                        <option value="Public Limited Company (Ltd.)">Public Limited Company (Ltd.)</option>
                                        <option value="Limited Liability Partnership (LLP)">Limited Liability Partnership (LLP)</option>
                                        <option value="One Person Company (OPC)">One Person Company (OPC)</option>
                                        <option value="Partnership Firm">Partnership Firm</option>
                                        <option value="Sole Proprietorship">Sole Proprietorship</option>
                                        <option value="Section 8 Company (Non-Profit)">Section 8 Company (Non-Profit)</option>
                                        <option value="NGO (Trust / Society)">NGO (Trust / Society)</option>
                                    </>
                                )}
                </FormSelect>
                <FormSelect 
                                label="Currency" 
                  name="currency" 
                  value={formData.currency || 'USD'} 
                  onChange={handlePrimaryChange} 
                  disabled={!isEditing}
                            >
                                <option value="USD">USD - US Dollar</option>
                                <option value="INR">INR - Indian Rupee</option>
                                <option value="BTN">BTN - Bhutanese Ngultrum</option>
                                <option value="AMD">AMD - Armenian Dram</option>
                                <option value="BYN">BYN - Belarusian Ruble</option>
                                <option value="GEL">GEL - Georgian Lari</option>
                                <option value="ILS">ILS - Israeli Shekel</option>
                                <option value="JOD">JOD - Jordanian Dinar</option>
                                <option value="NGN">NGN - Nigerian Naira</option>
                                <option value="PHP">PHP - Philippine Peso</option>
                                <option value="RUB">RUB - Russian Ruble</option>
                                <option value="SGD">SGD - Singapore Dollar</option>
                                <option value="LKR">LKR - Sri Lankan Rupee</option>
                                <option value="GBP">GBP - British Pound</option>
                                <option value="EUR">EUR - Euro</option>
                                <option value="HKD">HKD - Hong Kong Dollar</option>
                                <option value="RSD">RSD - Serbian Dinar</option>
                                <option value="BRL">BRL - Brazilian Real</option>
                                <option value="VND">VND - Vietnamese Dong</option>
                                <option value="MMK">MMK - Myanmar Kyat</option>
                                <option value="AZN">AZN - Azerbaijani Manat</option>
                                <option value="PKR">PKR - Pakistani Rupee</option>
                </FormSelect>
                <FormInput 
                                label="Date of Registration" 
                  name="registrationDate" 
                                type="date" 
                  value={formData.registrationDate} 
                  onChange={handlePrimaryChange} 
                  disabled={!isEditing}
                            />
                    </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-200"></div>

            {/* Service Providers Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900">Service Providers</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <UserCheck size={16}/> Chartered Accountant
                  </label>
                  {formData.ca ? (
                    <ServiceProviderDisplay 
                      provider={formData.ca} 
                      onRemove={() => setFormData(prev => ({...prev, ca: undefined}))} 
                      isEditing={isEditing}
                      type="ca"
                    />
                  ) : (
                    <ServiceCodeInput 
                      name="caCode" 
                      placeholder="Enter CA-Code" 
                      value={formData.caServiceCode || formData.caCode || ''}
                      onChange={handleServiceCodeChange} 
                      disabled={!isEditing}
                      isValid={caCodeValidation.isValid}
                      isInvalid={caCodeValidation.isInvalid}
                      isLoading={caCodeValidation.isLoading}
                      errorMessage={caCodeValidation.errorMessage}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <ShieldCheck size={16}/> Company Secretary
                  </label>
                  {formData.cs ? (
                    <ServiceProviderDisplay 
                      provider={formData.cs} 
                      onRemove={() => setFormData(prev => ({...prev, cs: undefined}))} 
                      isEditing={isEditing}
                      type="cs"
                    />
                  ) : (
                    <ServiceCodeInput 
                      name="csCode" 
                      placeholder="Enter CS-Code" 
                      value={formData.csServiceCode || formData.csCode || ''}
                      onChange={handleServiceCodeChange} 
                      disabled={!isEditing || csRequestLoading}
                      isValid={csCodeValidation.isValid}
                      isInvalid={csCodeValidation.isInvalid}
                      isLoading={csCodeValidation.isLoading || csRequestLoading}
                      errorMessage={csCodeValidation.errorMessage}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subsidiaries Card */}
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-8 hover:shadow-2xl transition-shadow duration-300">
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Subsidiaries</h3>
            </div>
            <div className="max-w-xs">
              <FormSelect 
                label="Number of Subsidiaries" 
                value={formData.subsidiaries.length} 
                onChange={handleSubsidiaryCountChange} 
                disabled={!isEditing}
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </FormSelect>
            </div>
            {formData.subsidiaries.length === 0 ? (
              <div className="bg-blue-50 p-6 border border-blue-200 rounded-xl text-center">
                <p className="text-blue-700 font-medium">No subsidiaries added</p>
                <p className="text-blue-600 text-sm mt-1">Add subsidiaries to manage their compliance requirements</p>
              </div>
            ) : (
              formData.subsidiaries.map((sub, index) => (
                <div key={sub.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border border-blue-200 rounded-xl space-y-6 shadow-md">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <h4 className="md:col-span-3 text-lg font-bold text-blue-900 flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-sm font-bold text-blue-700">
                        {index + 1}
                      </div>
                      Subsidiary {index + 1}
                    </h4>
                    <FormSelect 
                      label="Country" 
                      name="country" 
                      value={sub.country} 
                      onChange={(e) => handleSubsidiaryChange(index, e)} 
                      disabled={!isEditing}
                            >
                                <option value="">Select Country</option>
                                {availableCountries.map(countryCode => {
                                    const countryData = rulesMap[countryCode];
                                    const countryName = countryData?.country_name || countryCode;
                                    return <option key={countryCode} value={countryCode}>{countryName}</option>;
                                })}
                    </FormSelect>
                    <FormSelect 
                                label="Company Type" 
                      name="companyType" 
                      value={sub.companyType} 
                      onChange={(e) => handleSubsidiaryChange(index, e)} 
                      disabled={!isEditing}
                    >
                      <option value="">Select Company Type</option>
                      {(() => {
                        const countryData = rulesMap[sub.country];
                        if (!countryData || !countryData.company_types) return [];
                        return Object.keys(countryData.company_types);
                      })().map(type => <option key={type} value={type}>{type}</option>)}
                    </FormSelect>
                    <FormInput 
                                label="Registration Date" 
                      name="registrationDate" 
                                type="date" 
                      value={sub.registrationDate} 
                      onChange={(e) => handleSubsidiaryChange(index, e)} 
                      disabled={!isEditing} 
                    />
                                </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-blue-200">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                        <UserCheck size={16}/> Chartered Accountant
                      </label>
                      {sub.ca ? (
                        <ServiceProviderDisplay 
                          provider={sub.ca} 
                          onRemove={() => handleRemoveSubsidiaryProvider(index, 'ca')} 
                          isEditing={isEditing}
                          type="ca"
                        />
                      ) : (
                        <ServiceCodeInput 
                          name="caCode" 
                          placeholder="Enter CA-Code" 
                          value={sub.caCode || ''}
                          onChange={(e) => handleSubsidiaryServiceCodeChange(index, e)} 
                          disabled={!isEditing}
                          isValid={subsidiaryCodeValidation[index]?.ca?.isValid || false}
                          isInvalid={subsidiaryCodeValidation[index]?.ca?.isInvalid || false}
                          isLoading={subsidiaryCodeValidation[index]?.ca?.isLoading || false}
                          errorMessage={subsidiaryCodeValidation[index]?.ca?.errorMessage || ''}
                        />
                      )}
                            </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                        <ShieldCheck size={16}/> Company Secretary
                      </label>
                      {sub.cs ? (
                        <ServiceProviderDisplay 
                          provider={sub.cs} 
                          onRemove={() => handleRemoveSubsidiaryProvider(index, 'cs')} 
                          isEditing={isEditing}
                          type="cs"
                        />
                      ) : (
                        <ServiceCodeInput 
                          name="csCode" 
                          placeholder="Enter CS-Code" 
                          value={sub.csCode || ''}
                          onChange={(e) => handleSubsidiaryServiceCodeChange(index, e)} 
                          disabled={!isEditing}
                          isValid={subsidiaryCodeValidation[index]?.cs?.isValid || false}
                          isInvalid={subsidiaryCodeValidation[index]?.cs?.isInvalid || false}
                          isLoading={subsidiaryCodeValidation[index]?.cs?.isLoading || false}
                          errorMessage={subsidiaryCodeValidation[index]?.cs?.errorMessage || ''}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* International Operations Card */}
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-8 hover:shadow-2xl transition-shadow duration-300">
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">International Operations</h3>
            </div>
            <p className="text-sm text-slate-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
              Define countries where you do business without a subsidiary.
            </p>
            <div className="max-w-xs">
              <FormSelect 
                label="Number of International Operations" 
                value={formData.internationalOps.length} 
                onChange={handleIntlOpsCountChange} 
                disabled={!isEditing}
              >
                {[0, 1, 2, 3, 4, 5].map(i => <option key={i} value={i}>{i}</option>)}
              </FormSelect>
            </div>
            {formData.internationalOps.length === 0 ? (
              <div className="bg-blue-50 p-6 border border-blue-200 rounded-xl text-center">
                <p className="text-blue-700 font-medium">No international operations added</p>
                <p className="text-blue-600 text-sm mt-1">Add countries where you do business without subsidiaries</p>
              </div>
            ) : (
              formData.internationalOps.map((op, index) => (
                <div key={op.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border border-blue-200 rounded-xl shadow-md">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <h4 className="md:col-span-3 text-lg font-bold text-blue-900 flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-sm font-bold text-blue-700">
                        {index + 1}
                      </div>
                      Operation {index + 1}
                    </h4>
                    <div className="md:col-span-1">
                      <FormSelect 
                        label="Country" 
                        name="country" 
                        value={op.country} 
                        onChange={(e) => handleIntlOpChange(index, e)} 
                        disabled={!isEditing}
                            >
                                    <option value="">Select Country</option>
                                    {availableCountries.map(countryCode => {
                                        const countryData = rulesMap[countryCode];
                                        const countryName = countryData?.country_name || countryCode;
                                        return <option key={countryCode} value={countryCode}>{countryName}</option>;
                                    })}
                      </FormSelect>
                    </div>
                    <div className="md:col-span-1">
                      <FormSelect 
                        label="Company Type" 
                        name="companyType" 
                        value={op.companyType} 
                        onChange={(e) => handleIntlOpChange(index, e)} 
                        disabled={!isEditing}
                            >
                                    <option value="">Select Company Type</option>
                                    {(() => {
                                      const countryData = rulesMap[op.country];
                                      if (!countryData || !countryData.company_types) return [];
                                      return Object.keys(countryData.company_types);
                                    })().map(t => <option key={t} value={t}>{t}</option>)}
                      </FormSelect>
                    </div>
                    <div className="md:col-span-1">
                      <FormInput 
                        label="Start Date" 
                        name="startDate" 
                        type="date" 
                        value={op.startDate} 
                        onChange={(e) => handleIntlOpChange(index, e)} 
                        disabled={!isEditing} 
                    />
                    </div>
                  </div>
                </div>
              ))
                )}
            </div>
        </div>
      </fieldset>

      {isEditing && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <div className="flex flex-wrap justify-end items-center gap-4">
            <button 
              onClick={handleCancel} 
              className="bg-slate-100 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <X size={18} /> Cancel
            </button>
            <button 
              onClick={handleSave} 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <Save size={18} /> Save Changes
            </button>
          </div>
        </div>
      )}
        </div>
    );
};

export default ProfileTab;