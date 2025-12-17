import React, { useState, useEffect } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import CloudDriveInput from './ui/CloudDriveInput';
import { UserRole } from '../types';
import { FileText, Users, CheckCircle, Building2, Globe, PieChart, Plus, Trash2, LogOut, Briefcase, Link2, MapPin } from 'lucide-react';
import Select from './ui/Select';
import { InvestmentType, StartupDomain, StartupStage, FundraisingDetails } from '../types';
import { capTableService } from '../lib/capTableService';
import LogoTMS from './public/logoTMS.svg';
import { authService } from '../lib/auth';
import { storageService } from '../lib/storage';
import { complianceRulesComprehensiveService } from '../lib/complianceRulesComprehensiveService';
import { userComplianceService, CountryComplianceInfo } from '../lib/userComplianceService';
import { getCurrencyForCountry, getCountryProfessionalTitles } from '../lib/utils';
import { getQueryParam } from '../lib/urlState';
import { supabase } from '../lib/supabase';
import { generalDataService } from '../lib/generalDataService';

interface Founder {
  id: string;
  name: string;
  email: string;
  shares?: number;
  equity?: number;
  mentorCode?: string;
}

interface Subsidiary {
  id: string;
  country: string;
  companyType: string;
  registrationDate: string;
  caCode?: string;
  csCode?: string;
}

interface InternationalOp {
  id: string;
  country: string;
  companyType: string;
  startDate: string;
}

interface CompleteRegistrationPageProps {
  onNavigateToRegister: () => void;
  onNavigateToDashboard: () => void;
  newProfileId?: string; // NEW: For Add Profile flow - use this profile ID instead of current
}

export const CompleteRegistrationPage: React.FC<CompleteRegistrationPageProps> = ({
  onNavigateToRegister,
  onNavigateToDashboard,
  newProfileId
}) => {
  const [userData, setUserData] = useState<any>(null);
  const [countryComplianceInfo, setCountryComplianceInfo] = useState<CountryComplianceInfo[]>([]);
  const [selectedCountryInfo, setSelectedCountryInfo] = useState<CountryComplianceInfo | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<{
    govId: File | null;
    roleSpecific: File | null;
    license?: File | null;
    logo?: File | null;
  }>({
    govId: null,
    roleSpecific: null,
    license: null,
    logo: null
  });

  // Cloud drive URLs state
  const [cloudDriveUrls, setCloudDriveUrls] = useState<{
    govId: string;
    roleSpecific: string;
    license: string;
    logo: string;
    pitchDeck: string;
  }>({
    govId: '',
    roleSpecific: '',
    license: '',
    logo: '',
    pitchDeck: ''
  });

  const [founders, setFounders] = useState<Founder[]>([
    { id: '1', name: '', email: '', shares: 0, equity: 0 }
  ]);

  // Profile information
  const [profileData, setProfileData] = useState({
    country: 'United States',
    companyType: 'C-Corporation',
    registrationDate: new Date().toISOString().split('T')[0],
    caServiceCode: '',
    csServiceCode: '',
    currency: 'USD',
    centerName: '', // For facilitators
    investmentAdvisorCode: '', // Investment Advisor Code
    firmName: '', // For Investment Advisors
    website: '', // For Investment Advisors
  });

  // Share and equity information
  const [shareData, setShareData] = useState({
    totalShares: 1000000,
    pricePerShare: 10,
    esopReservedShares: 10000  // Fixed: Changed from 100000 to 10000 to match database default
  });

  // Auto-calculate founder shares when total shares or ESOP reserved shares change
  const autoCalculateFounderShares = (newTotalShares: number, newEsopReservedShares: number) => {
    if (newTotalShares > 0 && newEsopReservedShares >= 0 && newTotalShares >= newEsopReservedShares) {
      const availableShares = newTotalShares - newEsopReservedShares;
      const totalFounderShares = founders.reduce((sum, founder) => sum + (founder.shares || 0), 0);
      
      // If this is the first founder or all founders have 0 shares, distribute all available shares to the first founder
      if (founders.length === 1 && (totalFounderShares === 0 || founders[0].shares === 0)) {
        setFounders(prev => prev.map((founder, index) => 
          index === 0 ? { ...founder, shares: availableShares } : founder
        ));
      }
    }
  };

  // Subsidiaries and international operations
  const [subsidiaries, setSubsidiaries] = useState<Subsidiary[]>([]);
  const [internationalOps, setInternationalOps] = useState<InternationalOp[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingUser, setIsCheckingUser] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [wasInvitedByAdvisor, setWasInvitedByAdvisor] = useState(false);
  const [advisorCodeFromInvite, setAdvisorCodeFromInvite] = useState<string>('');
  // Incubation Center Invite
  const [inviteCenter, setInviteCenter] = useState<{ name: string; email: string; phone: string }>({ name: '', email: '', phone: '' });
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  // Investor Invite
  const [inviteInvestor, setInviteInvestor] = useState<{ name: string; email: string; phone: string }>({ name: '', email: '', phone: '' });
  const [isSendingInvestorInvite, setIsSendingInvestorInvite] = useState(false);
  // Fundraising (optional at registration)
  const [fundraising, setFundraising] = useState<{
    active: boolean;
    type: InvestmentType | '';
    value: number | '';
    equity: number | '';
    domain?: StartupDomain | '';
    stage?: StartupStage | '';
    pitchDeckFile?: File | null;
    pitchVideoUrl?: string;
    validationRequested?: boolean;
  }>({
    active: false,
    type: '',
    value: '',
    equity: '',
    domain: '',
    stage: '',
    pitchDeckFile: null,
    pitchVideoUrl: '',
    validationRequested: false
  });
  
  // Admin-managed compliance rules for company types
  const [rulesMap, setRulesMap] = useState<any>({});
  const [allCountries, setAllCountries] = useState<string[]>([]);
  // Countries from general_data table for Investment Advisor dropdown
  const [countriesFromGeneralData, setCountriesFromGeneralData] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  // Compute company types for the currently selected country from admin-managed rules
  const companyTypesByCountry = React.useMemo<string[]>(() => {
    console.log('🔍 Computing company types for country:', profileData.country);
    console.log('🗺️ Current rules map:', rulesMap);
    
    if (!profileData.country) {
      return [];
    }
    
    // Find the country code for the selected country name
    let countryCode = profileData.country;
    
    // If profileData.country is a country name (like "India"), find the corresponding country code
    if (profileData.country && !rulesMap[profileData.country]) {
      // Look for a country code that matches this country name
      for (const [code, data] of Object.entries(rulesMap)) {
        if ((data as any).country_name === profileData.country) {
          countryCode = code;
          break;
        }
      }
    }
    
    // Get all company types for the selected country from comprehensive rules
    const countryData = rulesMap[countryCode];
    console.log('📋 Country data for', countryCode, ':', countryData);
    
    if (!countryData || !countryData.company_types) {
      console.log('❌ No company types found for country:', countryCode);
      return [];
    }
    
    const companyTypes = Object.keys(countryData.company_types);
    console.log('✅ Company types for', countryCode, ':', companyTypes);
    return companyTypes;
  }, [rulesMap, profileData.country]);

  useEffect(() => {
    checkUserAndRedirect();
  }, []);

  // Set initialized flag after component mounts to prevent automatic calculations during initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 100); // Small delay to ensure all initial state is set
    return () => clearTimeout(timer);
  }, []);

  // Load admin-managed compliance rules for company types
  useEffect(() => {
    const loadComplianceRules = async () => {
      try {
        console.log('🔍 Loading compliance rules for company types...');
        const rules = await complianceRulesComprehensiveService.getAllRules();
        console.log('📊 Loaded compliance rules:', rules.length, 'rules');
        
        const map: any = {};
        const countries: string[] = [];
        
        rules.forEach(rule => { 
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
          
          if (rule.country_code && rule.country_code !== 'default' && !countries.includes(rule.country_code)) {
            countries.push(rule.country_code);
          }
        });
        
        console.log('🗺️ Built rules map:', map);
        console.log('🌍 Available countries:', countries);
        setRulesMap(map);
        setAllCountries(countries.sort());
      } catch (error) {
        console.error('❌ Error loading compliance rules:', error);
      }
    };

    const loadCountryComplianceInfo = async () => {
      try {
        const countries = await userComplianceService.getAvailableCountries();
        setCountryComplianceInfo(countries);
      } catch (error) {
        console.error('Error loading country compliance info:', error);
      }
    };

    loadComplianceRules();
    loadCountryComplianceInfo();
    
    // Load countries from general_data table for Investment Advisor dropdown
    const loadCountriesFromGeneralData = async () => {
      try {
        setLoadingCountries(true);
        const countryData = await generalDataService.getItemsByCategory('country');
        const countryNames = countryData.map(country => country.name);
        setCountriesFromGeneralData(countryNames.sort());
      } catch (error) {
        console.error('Error loading countries from general_data:', error);
        // Fallback to common countries if general_data table fails
        setCountriesFromGeneralData(['United States', 'India', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Singapore', 'Japan', 'China', 'Brazil', 'Mexico', 'South Africa', 'Nigeria', 'Kenya', 'Egypt', 'UAE', 'Saudi Arabia', 'Israel', 'Other']);
      } finally {
        setLoadingCountries(false);
      }
    };
    
    loadCountriesFromGeneralData();
  }, []);

  // Auto-update company type when country changes
  useEffect(() => {
    if (profileData.country && profileData.companyType) {
      const validTypes = companyTypesByCountry;
      if (validTypes.length > 0 && !validTypes.includes(profileData.companyType)) {
        console.log(`🔧 Auto-updating company type: ${profileData.companyType} -> ${validTypes[0]} for country: ${profileData.country}`);
        setProfileData(prev => ({
          ...prev,
          companyType: validTypes[0]
        }));
      }
    }
  }, [profileData.country, companyTypesByCountry]);

  // Auto-update currency when country changes
  useEffect(() => {
    if (profileData.country) {
      const currency = getCurrencyForCountry(profileData.country);
      if (currency && currency !== profileData.currency) {
        console.log(`🔧 Auto-updating currency: ${profileData.currency} -> ${currency} for country: ${profileData.country}`);
        setProfileData(prev => ({
          ...prev,
          currency: currency
        }));
      }
    }
  }, [profileData.country]);

  // Auto-update CA/CS types when country changes
  useEffect(() => {
    if (profileData.country) {
      // First try to find in database compliance info
      const countryInfo = countryComplianceInfo.find(c => c.country_name === profileData.country);
      if (countryInfo && (countryInfo.ca_type || countryInfo.cs_type)) {
        setSelectedCountryInfo(countryInfo);
        // Don't auto-populate the fields, just set the suggestions
        // Users can manually enter their preferred values
        console.log(`🔧 Auto-updating CA/CS types for country: ${profileData.country}`, countryInfo);
      } else {
        // If not found in database, use comprehensive country mapping
        const countryCodeMap: { [key: string]: string } = {
          'United States': 'US',
          'India': 'IN',
          'United Kingdom': 'GB',
          'Canada': 'CA',
          'Australia': 'AU',
          'Germany': 'DE',
          'France': 'FR',
          'Singapore': 'SG',
          'Japan': 'JP',
          'China': 'CN',
          'Brazil': 'BR',
          'Mexico': 'MX',
          'South Africa': 'ZA',
          'Nigeria': 'NG',
          'Kenya': 'KE',
          'Egypt': 'EG',
          'UAE': 'AE',
          'Saudi Arabia': 'SA',
          'Israel': 'IL',
          'Austria': 'AT',
          'Hong Kong': 'HK',
          'Netherlands': 'NL',
          'Finland': 'FI',
          'Greece': 'GR',
          'Vietnam': 'VN',
          'Myanmar': 'MM',
          'Azerbaijan': 'AZ',
          'Serbia': 'RS',
          'Monaco': 'MC',
          'Pakistan': 'PK',
          'Philippines': 'PH',
          'Jordan': 'JO',
          'Georgia': 'GE',
          'Belarus': 'BY',
          'Armenia': 'AM',
          'Bhutan': 'BT',
          'Sri Lanka': 'LK',
          'Russia': 'RU',
          'Italy': 'IT',
          'Spain': 'ES',
          'Portugal': 'PT',
          'Belgium': 'BE',
          'Switzerland': 'CH',
          'Sweden': 'SE',
          'Norway': 'NO',
          'Denmark': 'DK',
          'Ireland': 'IE',
          'New Zealand': 'NZ',
          'South Korea': 'KR',
          'Thailand': 'TH',
          'Malaysia': 'MY',
          'Indonesia': 'ID',
          'Bangladesh': 'BD',
          'Nepal': 'NP'
        };
        
        const countryCode = countryCodeMap[profileData.country];
        if (countryCode) {
          // Get professional titles from utils
          const professionalTitles = getCountryProfessionalTitles(countryCode);
          
          // Create a mock country info object with the professional titles
          const mockCountryInfo: CountryComplianceInfo = {
            country_code: countryCode,
            country_name: profileData.country,
            ca_type: professionalTitles.caTitle,
            cs_type: professionalTitles.csTitle
          };
          
          setSelectedCountryInfo(mockCountryInfo);
          // Don't auto-populate the fields, just set the suggestions
          // Users can manually enter their preferred values
          console.log(`🔧 Auto-updating CA/CS types for country: ${profileData.country} (code: ${countryCode})`, professionalTitles);
        } else {
          // No mapping found, clear the fields
          setSelectedCountryInfo(null);
          setProfileData(prev => ({
            ...prev,
            caServiceCode: '',
            csServiceCode: ''
          }));
          console.log(`❌ No CA/CS mapping found for country: ${profileData.country}`);
        }
      }
    }
  }, [profileData.country, countryComplianceInfo]);

  const checkUserAndRedirect = async () => {
    try {
      // Check if this is an invite link (has advisorCode in URL)
      const advisorCodeFromUrl = getQueryParam('advisorCode');
      const hasInviteParams = advisorCodeFromUrl || getQueryParam('type') === 'invite';
      
      // If this is an invite link but user is not authenticated yet,
      // they need to set password first - don't redirect to register
      // Supabase will handle the password setup flow
      const { data: { user }, error } = await authService.supabase.auth.getUser();
      
      if (error || !user) {
        // If this is an invite link, wait for Supabase to handle authentication
        // Don't redirect to register - let Supabase's invite flow complete
        if (hasInviteParams) {
          console.log('📧 Invite link detected, waiting for password setup...');
          // Check if there's a session being established
          const { data: { session } } = await authService.supabase.auth.getSession();
          if (!session) {
            // No session yet - Supabase invite flow will handle this
            // Just wait and don't redirect
            console.log('⏳ Waiting for Supabase invite authentication...');
            return;
          }
        } else {
          // Not an invite link, redirect to register
          onNavigateToRegister();
          return;
        }
      }

      // Get user profile (needed to determine role and email)
      // If newProfileId is provided (from Add Profile flow), use that profile instead of current
      let profileData = null;
      if (newProfileId) {
        console.log('🔍 Using new profile ID from Add Profile flow:', newProfileId);
        const { data: newProfile } = await authService.supabase
          .from('user_profiles')
          .select('*')
          .eq('id', newProfileId)
          .single();
        profileData = newProfile as any;
        if (!profileData) {
          console.error('❌ New profile not found:', newProfileId);
        }
      } else {
        // Use getCurrentUser() which handles both user_profiles and users tables
        const profile = await authService.getCurrentUser();
        
        // Use ONLY user_profiles - getCurrentUser() already queries user_profiles
        profileData = profile;
      }

      // advisorCodeFromUrl is already declared above (line 412)
      // Check if user was invited by advisor
      const invitedByAdvisor = user.user_metadata?.source === 'advisor_invite';
      const codeFromMetadata = user.user_metadata?.investment_advisor_code_entered;
      const codeFromProfile = (profileData as any)?.investment_advisor_code_entered;
      const finalAdvisorCode = advisorCodeFromUrl || codeFromMetadata || codeFromProfile || '';
      
      setWasInvitedByAdvisor(invitedByAdvisor);
      setAdvisorCodeFromInvite(finalAdvisorCode);
      
      // If advisor code is in URL and user doesn't have it set, update user record
      if (advisorCodeFromUrl && invitedByAdvisor) {
        const currentAdvisorCode = (profileData as any)?.investment_advisor_code_entered;
        if (!currentAdvisorCode || currentAdvisorCode !== advisorCodeFromUrl) {
          // Check profile in user_profiles table (only table we use)
          // user.id is auth_user_id, so check user_profiles by auth_user_id
          const { data: profileCheck } = await authService.supabase
            .from('user_profiles')
            .select('id, auth_user_id')
            .eq('auth_user_id', user.id)
            .maybeSingle();
          
          if (profileCheck) {
            // Update in user_profiles table using profile ID
            await supabase
              .from('user_profiles')
              // @ts-expect-error - Dynamic table name prevents type inference
              .update({
                investment_advisor_code_entered: advisorCodeFromUrl,
                updated_at: new Date().toISOString()
              })
              .eq('id', (profileCheck as any).id); // Use profile ID for user_profiles
          }

          // If user is a Startup, also update startup record
          if ((profileData as any)?.role === 'Startup') {
            const { data: startupData } = await supabase
              .from('startups')
              .select('id')
              .eq('user_id', user.id)
              .maybeSingle();

            if (startupData && (startupData as any).id) {
              await supabase
                .from('startups')
                // @ts-expect-error - Type inference issue with startupData.id
                .update({
                  investment_advisor_code: advisorCodeFromUrl,
                  updated_at: new Date().toISOString()
                })
                .eq('id', (startupData as any).id);
            }
          }
        }
      }

      // If using newProfileId, use that profile ID; otherwise use profile ID from profileData
      // user.id is auth_user_id, not profile ID - use profileData.id if available
      const actualProfileId = newProfileId || (profileData && (profileData as any).id) || user.id;
      const profileIdToCheck = actualProfileId;
      
      // Check if user already has a complete profile using the new method
      // For Add Profile flow, always show Form 2 (don't skip)
      if (!newProfileId) {
        const isComplete = await authService.isProfileComplete(profileIdToCheck);
        
        if (isComplete) {
          // User profile is complete, proceed to dashboard
          onNavigateToDashboard();
          return;
        }
      }

      // User needs to complete Step 2
      // Use profile ID from newProfileId if provided, otherwise use profile ID from profileData
      setUserData({
        id: actualProfileId, // Use actual profile ID (not auth_user_id)
        email: user.email,
        name: (profileData && (profileData as any).name) || user.user_metadata?.name || 'User',
        role: (profileData && (profileData as any).role) || user.user_metadata?.role || 'Investor',
        startupName: (profileData && (profileData as any).startup_name) || user.user_metadata?.startupName
      });

      // Initialize profileData with advisor code if invited
      if (finalAdvisorCode && invitedByAdvisor) {
        setProfileData(prev => ({
          ...prev,
          investmentAdvisorCode: finalAdvisorCode
        }));
      } else if ((profileData as any)?.investment_advisor_code_entered) {
        setProfileData(prev => ({
          ...prev,
          investmentAdvisorCode: (profileData as any).investment_advisor_code_entered
        }));
      }
      
      // Load existing profile data if available (for editing)
      if (profileData) {
        setProfileData(prev => ({
          ...prev,
          country: (profileData as any).country || prev.country,
          companyType: (profileData as any).company_type || prev.companyType,
          registrationDate: (profileData as any).registration_date || prev.registrationDate,
          currency: (profileData as any).currency || prev.currency,
          caServiceCode: (profileData as any).ca_service_code || prev.caServiceCode,
          csServiceCode: (profileData as any).cs_service_code || prev.csServiceCode,
          centerName: (profileData as any).center_name || prev.centerName,
          firmName: (profileData as any).firm_name || prev.firmName,
          website: (profileData as any).website || prev.website,
        }));
      }
      
    } catch (err) {
      console.error('Error checking user:', err);
      onNavigateToRegister();
    } finally {
      setIsCheckingUser(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFiles(prev => ({ ...prev, [documentType]: file }));
      // Clear cloud drive URL when file is selected
      setCloudDriveUrls(prev => ({ ...prev, [documentType]: '' }));
    }
  };

  const handleCloudDriveUrlChange = (documentType: string, url: string) => {
    setCloudDriveUrls(prev => ({ ...prev, [documentType]: url }));
    // Clear uploaded file when cloud drive URL is provided
    if (url) {
      setUploadedFiles(prev => ({ ...prev, [documentType]: null }));
    }
  };
  // Handle pitch deck file selection - accepts File directly or event
  const handleFundraisingDeckChange = (fileOrEvent: File | React.ChangeEvent<HTMLInputElement> | null) => {
    console.log('🎯 CompleteRegistrationPage handleFundraisingDeckChange called with:', fileOrEvent);
    
    let file: File | null = null;
    
    // Handle both File object (from CloudDriveInput) and event object
    if (fileOrEvent instanceof File) {
      file = fileOrEvent;
      console.log('✅ File object detected directly in CompleteRegistrationPage');
    } else if (fileOrEvent && 'target' in fileOrEvent) {
      file = fileOrEvent.target.files?.[0] || null;
      console.log('✅ Event object detected, extracted file:', file);
    } else {
      file = null;
      console.warn('⚠️ Unknown file format in CompleteRegistrationPage:', fileOrEvent);
    }
    
    if (file) {
      console.log('📄 Processing pitch deck file:', file.name, 'Type:', file.type, 'Size:', file.size);
      
      // Validate file type - check both MIME type and file extension
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isValidPdf = 
        file.type === 'application/pdf' || 
        file.type === 'application/x-pdf' ||
        fileExtension === '.pdf';
      
      console.log('🔍 PDF validation:', {
        mimeType: file.type,
        extension: fileExtension,
        isValidPdf
      });
      
      if (!isValidPdf) {
        const errorMsg = 'Please upload a PDF file for the pitch deck. Selected file: ' + file.name;
        console.error('❌ Invalid file type:', errorMsg);
        setError(errorMsg);
        return;
      }
      
      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        const errorMsg = 'Pitch deck file size must be less than 10MB. Selected file size: ' + (file.size / 1024 / 1024).toFixed(2) + ' MB';
        console.error('❌ File too large:', errorMsg);
        setError(errorMsg);
        return;
      }
      
      setError(null);
      console.log('💾 Updating fundraising state with pitch deck file...');
      setFundraising(prev => {
        const updated = { ...prev, pitchDeckFile: file };
        console.log('✅ Fundraising state updated in CompleteRegistrationPage:', updated);
        return updated;
      });
      console.log('✅ Pitch deck file selected:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    } else {
      console.warn('⚠️ No file provided, clearing pitch deck file');
      setFundraising(prev => ({ ...prev, pitchDeckFile: null }));
    }
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Very basic validation allowing digits, spaces, +, -, and parentheses
    return /^[0-9+()\-\s]{6,20}$/.test(phone);
  };

  const sendIncubationInvite = async () => {
    if (!inviteCenter.name.trim()) {
      setError('Please enter incubation center name');
      return;
    }
    if (!validateEmail(inviteCenter.email)) {
      setError('Please enter a valid incubation center email');
      return;
    }
    if (inviteCenter.phone && !validatePhone(inviteCenter.phone)) {
      setError('Please enter a valid contact number');
      return;
    }
    setError(null);
    setIsSendingInvite(true);
    try {
      const appUrl = window.location.origin;
      const isProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
      const inviteApi = isProd ? '/api/send-invite' : ((import.meta as any).env?.VITE_INVITE_API_URL || '/api/send-invite');
      const res = await fetch(inviteApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'center',
          name: inviteCenter.name,
          email: inviteCenter.email,
          phone: inviteCenter.phone,
          startupName: userData?.startupName,
          appUrl
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send email');
      }
      alert('Center details shared via email.');
    } catch (e: any) {
      setError(e?.message || 'Failed to send email');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const sendInvestorInvite = async () => {
    if (!inviteInvestor.name.trim()) {
      setError('Please enter investor name');
      return;
    }
    if (!validateEmail(inviteInvestor.email)) {
      setError('Please enter a valid investor email');
      return;
    }
    if (inviteInvestor.phone && !validatePhone(inviteInvestor.phone)) {
      setError('Please enter a valid investor contact number');
      return;
    }
    setError(null);
    setIsSendingInvestorInvite(true);
    try {
      const appUrl = window.location.origin;
      const isProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
      const inviteApi = isProd ? '/api/send-invite' : ((import.meta as any).env?.VITE_INVITE_API_URL || '/api/send-invite');
      const res = await fetch(inviteApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'investor',
          name: inviteInvestor.name,
          email: inviteInvestor.email,
          phone: inviteInvestor.phone,
          startupName: userData?.startupName,
          appUrl
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send email');
      }
      alert('Investor details shared via email.');
    } catch (e: any) {
      setError(e?.message || 'Failed to send email');
    } finally {
      setIsSendingInvestorInvite(false);
    }
  };

  const addFounder = () => {
    const newId = (founders.length + 1).toString();
    setFounders(prev => [...prev, { id: newId, name: '', email: '', shares: 0, equity: 0, mentorCode: '' }]);
  };

  const removeFounder = (id: string) => {
    if (founders.length > 1) {
      setFounders(prev => prev.filter(founder => founder.id !== id));
    }
  };

  const updateFounder = (id: string, field: 'name' | 'email' | 'shares' | 'equity' | 'mentorCode', value: string | number) => {
    setFounders(prev => prev.map(founder => 
      founder.id === id ? { ...founder, [field]: value } : founder
    ));
  };

  // Subsidiary management
  const addSubsidiary = () => {
    const newId = (subsidiaries.length + 1).toString();
    setSubsidiaries(prev => [...prev, { 
      id: newId, 
      country: '', 
      companyType: '', 
      registrationDate: '',
      caCode: '',
      csCode: ''
    }]);
  };

  const removeSubsidiary = (id: string) => {
    setSubsidiaries(prev => prev.filter(s => s.id !== id));
  };

  const updateSubsidiary = (id: string, field: keyof Subsidiary, value: string) => {
    setSubsidiaries(prev => prev.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  // Handle country selection and auto-populate CA/CS types
  const handleCountrySelection = async (countryCode: string) => {
    const countryInfo = countryComplianceInfo.find(c => c.country_code === countryCode);
    if (countryInfo) {
      setSelectedCountryInfo(countryInfo);
      
      // Auto-select currency based on country
      const autoSelectedCurrency = getCurrencyForCountry(countryCode);
      
      // Auto-populate CA and CS types in profile data
      setProfileData(prev => ({
        ...prev,
        country: countryCode,
        currency: autoSelectedCurrency, // Auto-select currency based on country
        caServiceCode: countryInfo.ca_type || '',
        csServiceCode: countryInfo.cs_type || ''
      }));
    }
  };

  // Get company types for a specific subsidiary based on its country
  const getCompanyTypesForSubsidiary = (subsidiaryCountry: string): string[] => {
    if (!subsidiaryCountry) return [];
    
    const countryData = rulesMap[subsidiaryCountry];
    if (!countryData || !countryData.company_types) {
      return [];
    }
    
    return Object.keys(countryData.company_types);
  };

  // Handle subsidiary country selection
  const handleSubsidiaryCountrySelection = async (subsidiaryId: string, countryCode: string) => {
    const countryInfo = countryComplianceInfo.find(c => c.country_code === countryCode);
    if (countryInfo) {
      // Get company types for the selected country
      const countryData = rulesMap[countryCode];
      const availableCompanyTypes = countryData?.company_types ? Object.keys(countryData.company_types) : [];
      const defaultCompanyType = availableCompanyTypes.length > 0 ? availableCompanyTypes[0] : '';
      
      setSubsidiaries(prev => prev.map(s => 
        s.id === subsidiaryId ? { 
          ...s, 
          country: countryCode,
          companyType: defaultCompanyType, // Auto-select first available company type
          caCode: countryInfo.ca_type || '',
          csCode: countryInfo.cs_type || ''
        } : s
      ));
    }
  };

  // International operations management
  const addInternationalOp = () => {
    const newId = (internationalOps.length + 1).toString();
    setInternationalOps(prev => [...prev, { 
      id: newId, 
      country: '', 
      companyType: '', 
      startDate: ''
    }]);
  };

  const removeInternationalOp = (id: string) => {
    setInternationalOps(prev => prev.filter(op => op.id !== id));
  };

  const updateInternationalOp = (id: string, field: keyof InternationalOp, value: string) => {
    setInternationalOps(prev => prev.map(op => 
      op.id === id ? { ...op, [field]: value } : op
    ));
  };

  const getRoleSpecificDocumentType = (role: UserRole): string => {
    switch (role) {
      case 'Investor': return 'PAN Card';
      case 'Startup': return 'Proof of Company Registration';
      case 'CA': return 'Copy of CA License';
      case 'CS': return 'Copy of CS License';
      case 'Startup Facilitation Center': return 'Proof of Organization Registration';
      case 'Investment Advisor': return 'Proof of Firm Registration';
      default: return 'Document';
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
      onNavigateToRegister();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 ========== HANDLESUBMIT STARTED ==========');
    console.log('🚀 Form submission started for profile:', userData?.id, userData?.role);
    setIsLoading(true);
    setError(null);

    // Validation
    if (!profileData.country) {
      setError('Country selection is required');
      setIsLoading(false);
      return;
    }

    if (!uploadedFiles.govId && !cloudDriveUrls.govId) {
      setError('Government ID is required');
      setIsLoading(false);
      return;
    }

    // Role-specific document is not required for Mentor
    if (userData.role !== 'Mentor' && !uploadedFiles.roleSpecific && !cloudDriveUrls.roleSpecific) {
      setError(`${getRoleSpecificDocumentType(userData.role)} is required`);
      setIsLoading(false);
      return;
    }

    // For Investment Advisors, license and logo are required
    if (userData.role === 'Investment Advisor') {
      if (!uploadedFiles.license && !cloudDriveUrls.license) {
        setError('License (As per country regulations) is required for Investment Advisors');
        setIsLoading(false);
        return;
      }
      if (!uploadedFiles.logo && !cloudDriveUrls.logo) {
        setError('Company logo is required for Investment Advisors');
        setIsLoading(false);
        return;
      }
    }

    // For facilitators, center name is required
    if (userData.role === 'Startup Facilitation Center') {
      if (!profileData.centerName || profileData.centerName.trim() === '') {
        setError('Facilitation center name is required');
        setIsLoading(false);
        return;
      }
    }

    if (userData.role === 'Startup') {
      const invalidFounders = founders.filter(f => !f.name.trim() || !f.email.trim());
      if (invalidFounders.length > 0) {
        setError('Please fill in all founder details');
        setIsLoading(false);
        return;
      }

      // Optional fundraising validation if user fills it
      // Validate fundraising fields if active fundraising is enabled
      if (fundraising.active) {
        if (!fundraising.type) {
          setError('Fundraising Type is required when Active Fundraising is enabled');
          setIsLoading(false);
          return;
        }
        if (!fundraising.value || fundraising.value === '') {
          setError('Fundraising Value is required when Active Fundraising is enabled');
          setIsLoading(false);
          return;
        }
        if (!fundraising.equity || fundraising.equity === '') {
          setError('Equity (%) is required when Active Fundraising is enabled');
          setIsLoading(false);
          return;
        }
        if (!fundraising.pitchDeckFile) {
          const hiddenInput = document.getElementById('pitch-deck-url') as HTMLInputElement;
          const pitchDeckUrl = hiddenInput?.value;
          if (!pitchDeckUrl) {
            setError('Pitch Deck is required when Active Fundraising is enabled');
            setIsLoading(false);
            return;
          }
        }
      }

      // Validate that all founders have shares specified
      const foundersWithoutShares = founders.filter(f => !f.shares || f.shares <= 0);
      if (foundersWithoutShares.length > 0) {
        setError('Please specify the number of shares for all founders');
        setIsLoading(false);
        return;
      }

      // Validate share data
      if (shareData.totalShares <= 0 || shareData.pricePerShare <= 0) {
        setError('Please enter valid share information');
        setIsLoading(false);
        return;
      }

      // Validate that allocated shares don't exceed total authorized shares
      const totalFounderShares = founders.reduce((sum, founder) => sum + (founder.shares || 0), 0);
      const esopReservedShares = shareData.esopReservedShares || 0;
      const totalAllocatedShares = totalFounderShares + esopReservedShares;
      
      // Allow allocated shares to be less than total shares (remaining shares available for future allocation)
      if (totalAllocatedShares > shareData.totalShares) {
        setError(`Total allocated shares (${totalAllocatedShares.toLocaleString()}) cannot exceed total authorized shares (${shareData.totalShares.toLocaleString()}). Please reduce founder shares or ESOP reserved shares.`);
        setIsLoading(false);
        return;
      }

      // Validate that total founder equity doesn't exceed 100%
      const totalFounderEquity = founders.reduce((sum, founder) => sum + (founder.equity || 0), 0);
      if (totalFounderEquity > 100) {
        setError(`Total founder equity (${totalFounderEquity.toFixed(1)}%) exceeds 100%. Please adjust founder equity percentages.`);
        setIsLoading(false);
        return;
      }

      // Validate that all founders have equity specified
      const foundersWithoutEquity = founders.filter(f => !f.equity || f.equity <= 0);
      if (foundersWithoutEquity.length > 0) {
        setError('Please specify equity percentage for all founders');
        setIsLoading(false);
        return;
      }
    }

    try {
      // Upload documents to storage
      let governmentIdUrl = '';
      let roleSpecificUrl = '';

      console.log('📁 Starting file uploads...', { 
        govId: uploadedFiles.govId, 
        roleSpecific: uploadedFiles.roleSpecific,
        govIdUrl: cloudDriveUrls.govId,
        roleSpecificUrl: cloudDriveUrls.roleSpecific
      });

      // Handle Government ID - either uploaded file or cloud drive URL
      if (cloudDriveUrls.govId) {
        governmentIdUrl = cloudDriveUrls.govId;
        console.log('✅ Government ID cloud drive URL provided:', governmentIdUrl);
      } else if (uploadedFiles.govId) {
        console.log('📤 Uploading government ID...');
        const result = await storageService.uploadVerificationDocument(
          uploadedFiles.govId, 
          userData.email, 
          'government-id'
        );
        if (result.success && result.url) {
          governmentIdUrl = result.url;
          console.log('✅ Government ID uploaded successfully:', governmentIdUrl);
        } else {
          console.error('❌ Government ID upload failed:', result);
        }
      }

      // Handle Role-specific document - either uploaded file or cloud drive URL
      if (cloudDriveUrls.roleSpecific) {
        roleSpecificUrl = cloudDriveUrls.roleSpecific;
        console.log('✅ Role-specific document cloud drive URL provided:', roleSpecificUrl);
      } else if (uploadedFiles.roleSpecific) {
        const roleDocType = getRoleSpecificDocumentType(userData.role);
        console.log('📤 Uploading role-specific document:', roleDocType);
        const result = await storageService.uploadVerificationDocument(
          uploadedFiles.roleSpecific, 
          userData.email, 
          roleDocType
        );
        if (result.success && result.url) {
          roleSpecificUrl = result.url;
          console.log('✅ Role-specific document uploaded successfully:', roleSpecificUrl);
        } else {
          console.error('❌ Role-specific document upload failed:', result);
        }
      }

      // Upload additional files for Investment Advisors
      let licenseUrl = '';
      let logoUrl = '';

      if (userData.role === 'Investment Advisor') {
        // Handle License - either uploaded file or cloud drive URL
        if (cloudDriveUrls.license) {
          licenseUrl = cloudDriveUrls.license;
          console.log('✅ License cloud drive URL provided:', licenseUrl);
        } else if (uploadedFiles.license) {
          console.log('📤 Uploading license document...');
          const result = await storageService.uploadVerificationDocument(
            uploadedFiles.license, 
            userData.email, 
            'license'
          );
          if (result.success && result.url) {
            licenseUrl = result.url;
            console.log('✅ License document uploaded successfully:', licenseUrl);
          } else {
            console.error('❌ License document upload failed:', result);
          }
        }

        // Handle Logo - either uploaded file or cloud drive URL
        if (cloudDriveUrls.logo) {
          logoUrl = cloudDriveUrls.logo;
          console.log('✅ Logo cloud drive URL provided:', logoUrl);
        } else if (uploadedFiles.logo) {
          console.log('📤 Uploading company logo...');
          const result = await storageService.uploadVerificationDocument(
            uploadedFiles.logo, 
            userData.email, 
            'logo'
          );
          if (result.success && result.url) {
            logoUrl = result.url;
            console.log('✅ Company logo uploaded successfully:', logoUrl);
          } else {
            console.error('❌ Company logo upload failed:', result);
          }
        }
      }

      console.log('📊 Upload results:', { governmentIdUrl, roleSpecificUrl, licenseUrl, logoUrl });

      // Update user profile with documents
      const verificationDocuments = [governmentIdUrl, roleSpecificUrl];
      if (licenseUrl) verificationDocuments.push(licenseUrl);
      if (logoUrl) verificationDocuments.push(logoUrl);

      console.log('💾 Updating user profile in database...', {
        userId: userData.id,
        governmentId: governmentIdUrl,
        caLicense: roleSpecificUrl,
        verificationDocuments: verificationDocuments
      });

      const updateData: any = {
          government_id: governmentIdUrl,
          ca_license: roleSpecificUrl,
          verification_documents: verificationDocuments,
          // Add Investment Advisor specific fields
          logo_url: logoUrl || null,
          financial_advisor_license_url: licenseUrl || null,
          firm_name: userData.role === 'Investment Advisor' ? profileData.firmName || null : null,
          website: userData.role === 'Investment Advisor' ? profileData.website || null : null,
          // Add facilitator specific fields
          center_name: userData.role === 'Startup Facilitation Center' ? profileData.centerName : null,
          // Add Form 2 profile fields that are collected
          country: profileData.country || null,
          company_type: profileData.companyType || null,
          registration_date: profileData.registrationDate || null,
          currency: profileData.currency || null,
          ca_service_code: profileData.caServiceCode || null,
          cs_service_code: profileData.csServiceCode || null,
          investment_advisor_code_entered: profileData.investmentAdvisorCode || null,
          updated_at: new Date().toISOString()
      };

      console.log('📋 Update data prepared:', {
        table: 'will be determined',
        profileId: userData.id,
        dataKeys: Object.keys(updateData),
        hasGovernmentId: !!updateData.government_id,
        hasVerificationDocuments: !!updateData.verification_documents
      });

      // Use ONLY user_profiles table - no fallback to users table
      // Get current auth user ID to check properly
      const { data: { user: currentAuthUser } } = await authService.supabase.auth.getUser();
      const authUserId = currentAuthUser?.id;
      
      // Check if profile exists in user_profiles by both profile ID and auth_user_id
      // This handles both cases: when userData.id is profile ID or auth_user_id
      let profileCheck = null;
      
      // First try by profile ID (if userData.id is the profile ID)
      const { data: profileById } = await (authService.supabase as any)
        .from('user_profiles')
        .select('id, auth_user_id')
        .eq('id', userData.id)
        .maybeSingle();
      
      if (profileById) {
        profileCheck = profileById;
      } else if (authUserId) {
        // If not found by ID, try by auth_user_id (for new registrations)
        const { data: profileByAuth } = await (authService.supabase as any)
          .from('user_profiles')
          .select('id, auth_user_id')
          .eq('auth_user_id', authUserId)
          .maybeSingle();
        
        if (profileByAuth) {
          profileCheck = profileByAuth;
          // Update userData.id to the actual profile ID for the update
          userData.id = profileByAuth.id;
        }
      }

      // Always use user_profiles table
      const tableToUpdate = 'user_profiles';
      console.log('💾 Updating profile in table:', tableToUpdate, 'Profile ID:', userData.id, 'Auth User ID:', authUserId);
      console.log('🔍 Profile check result:', { found: !!profileCheck, profileId: userData.id, authUserId });
      console.log('🔍 Current auth user:', { 
        id: currentAuthUser?.id, 
        email: currentAuthUser?.email 
      });

      // CRITICAL: Check if profile exists before attempting update
      if (!profileCheck) {
        console.error('❌ ========== PROFILE NOT FOUND IN user_profiles ==========');
        console.error('❌ Cannot update profile - profile not found in user_profiles table');
        console.error('❌ Auth User ID:', authUserId);
        console.error('❌ Attempted Profile ID:', userData.id);
        console.error('❌ This means the profile was never created or the ID is incorrect');
        console.error('❌ =======================================================');
        throw new Error('Profile not found in user_profiles table. Please complete Form 1 registration first.');
      }

      // Use the correct profile ID from profileCheck
      const profileIdToUpdate = profileCheck.id;
      console.log('🔄 Attempting UPDATE operation with profile ID:', profileIdToUpdate);
      
      const { data: updateResult, error: updateError } = await (authService.supabase as any)
        .from(tableToUpdate)
        .update(updateData as any)
        .eq('id', profileIdToUpdate)  // Use the correct profile ID from profileCheck
        .select();

      console.log('📊 UPDATE operation result:', {
        success: !updateError,
        hasData: !!updateResult && updateResult.length > 0,
        rowsUpdated: updateResult?.length || 0,
        error: updateError ? {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint
        } : null
      });

      if (updateError) {
        // Log to console
        console.error('❌ ========== DATABASE UPDATE FAILED ==========');
        console.error('❌ Table:', tableToUpdate);
        console.error('❌ Profile ID:', profileIdToUpdate);
        console.error('❌ Auth User ID:', currentAuthUser?.id);
        console.error('❌ Error Message:', updateError.message);
        console.error('❌ Error Code:', updateError.code);
        console.error('❌ Error Details:', updateError.details);
        console.error('❌ Error Hint:', updateError.hint);
        console.error('❌ Update Data Keys:', Object.keys(updateData));
        console.error('❌ ============================================');
        
        // Also show alert for debugging (remove after fixing)
        if (process.env.NODE_ENV === 'development') {
          alert(`UPDATE FAILED!\n\nTable: ${tableToUpdate}\nError: ${updateError.message}\nCode: ${updateError.code}\n\nCheck console for details.`);
        }
        
        throw new Error(`Failed to update user profile: ${updateError.message || 'Unknown error'}`);
      } else if (!updateResult || updateResult.length === 0) {
        // No error but no rows updated - this means the profile ID doesn't exist
        console.error('❌ ========== UPDATE RETURNED NO ROWS ==========');
        console.error('❌ Update succeeded but 0 rows were updated');
        console.error('❌ This means the profile ID does not exist in the database');
        console.error('❌ Profile ID used:', profileIdToUpdate);
        console.error('❌ Auth User ID:', authUserId);
        console.error('❌ =============================================');
        throw new Error('Profile update failed: Profile ID not found in database. Please contact support.');
      } else {
        console.log('✅ UPDATE operation successful! Rows updated:', updateResult.length);
        console.log('✅ Updated profile data:', updateResult[0]);
        // Update userData.id to the correct profile ID for subsequent operations
        userData.id = profileIdToUpdate;
      }

      // For Investment Advisors, also save firm_name and website to investment_advisor_profiles table
      if (userData.role === 'Investment Advisor' && authUserId) {
        try {
          console.log('💾 Saving Investment Advisor profile data to investment_advisor_profiles table...');
          
          // Get advisor_name from user_profiles (name field) or use userData.name
          const advisorName = userData.name || (updateResult?.[0] as any)?.name || '';
          
          // Prepare data for investment_advisor_profiles
          // If country is provided, add it to geography array
          const geography = profileData.country ? [profileData.country] : [];
          
          const advisorProfileData: any = {
            user_id: authUserId, // Use auth_user_id, not profile ID
            advisor_name: advisorName || 'Investment Advisor', // Required field
            firm_name: profileData.firmName || null,
            website: profileData.website || null,
            email: userData.email || null,
            geography: geography.length > 0 ? geography : null, // Add country to geography array
            updated_at: new Date().toISOString()
          };

          // Upsert to investment_advisor_profiles (create or update)
          const { data: advisorProfileResult, error: advisorProfileError } = await (authService.supabase as any)
            .from('investment_advisor_profiles')
            .upsert(advisorProfileData, {
              onConflict: 'user_id'
            })
            .select()
            .single();

          if (advisorProfileError) {
            console.error('⚠️ Error saving to investment_advisor_profiles:', advisorProfileError);
            // Don't throw error - user_profiles update succeeded, this is secondary
            console.warn('⚠️ Investment Advisor profile data saved to user_profiles but failed to save to investment_advisor_profiles table');
          } else {
            console.log('✅ Investment Advisor profile saved to investment_advisor_profiles table:', advisorProfileResult);
          }
        } catch (advisorError) {
          console.error('⚠️ Error in Investment Advisor profile save:', advisorError);
          // Don't throw error - user_profiles update succeeded, this is secondary
        }
      }

      // Update is_profile_complete flag (profileCheck is guaranteed to exist at this point)
      const profileIdForComplete = profileCheck.id;
      console.log('✅ Setting is_profile_complete = true for profile:', profileIdForComplete);
      const { error: completeError, data: completeData } = await (authService.supabase as any)
        .from('user_profiles')
        .update({ is_profile_complete: true })
        .eq('id', profileIdForComplete)
        .select();
      
      if (completeError) {
        console.error('❌ Failed to update is_profile_complete flag:', completeError);
        console.error('Error details:', {
          message: completeError.message,
          details: completeError.details,
          hint: completeError.hint,
          code: completeError.code
        });
        // Don't throw - profile data was saved successfully
      } else {
        console.log('✅ Successfully set is_profile_complete = true:', completeData);
      }

      console.log('✅ User profile updated successfully in database');

      // If user is a startup, create startup and founders with comprehensive data
      if (userData.role === 'Startup') {
        try {
          // First, try to find existing startup for this user
          // IMPORTANT: startups table uses auth_user_id, not profile ID!
          const { data: { user: authUser } } = await authService.supabase.auth.getUser();
          if (!authUser) {
            throw new Error('Not authenticated');
          }
          const authUserId = authUser.id;
          console.log('🔍 Looking for existing startup for auth_user_id:', authUserId, 'Profile ID:', userData.id);
          const { data: existingStartups, error: findError } = await authService.supabase
            .from('startups')
            .select('*')
            .eq('user_id', authUserId);  // Use auth_user_id, not profile ID!

          if (findError) {
            console.error('❌ Error finding existing startup:', findError);
            throw findError;
          }

          let startup;
          if (existingStartups && existingStartups.length > 0) {
            // Update existing startup
            console.log('📝 Found existing startup, updating with profile data');
            startup = existingStartups[0];
          } else {
            // Create new startup if none exists
            console.log('🆕 No existing startup found, creating new one');
            
            // Get auth_user_id (not profile ID) - startups table uses auth_user_id
            const { data: { user: authUser } } = await authService.supabase.auth.getUser();
            if (!authUser) {
              throw new Error('Not authenticated');
            }
            
            // Use auth_user_id for startups table, not profile ID
            const authUserId = authUser.id;
            console.log('🆕 Creating startup with auth_user_id:', authUserId, 'Profile ID:', userData.id);
            
            const { data: newStartup, error: createError } = await authService.supabase
              .from('startups')
              .insert({
                name: userData.startupName || `${userData.name}'s Startup`,
                investment_type: 'Seed',
                investment_value: 0,
                equity_allocation: 0,
                current_valuation: shareData.totalShares * shareData.pricePerShare,
                compliance_status: 'Pending',
                sector: 'Technology',
                total_funding: 0,
                total_revenue: 0,
                registration_date: profileData.registrationDate,
                user_id: authUserId  // Use auth_user_id, not profile ID!
              } as any)
              .select()
              .single();

            if (createError) {
              console.error('❌ ========== STARTUP CREATION FAILED ==========');
              console.error('❌ Error creating startup:', createError);
              console.error('❌ Startup creation details:', {
                error: createError,
                message: createError.message,
                details: createError.details,
                hint: createError.hint,
                code: createError.code,
                auth_user_id: authUserId,
                profile_id: userData.id,
                startup_name: userData.startupName
              });
              console.error('❌ =============================================');
              // Throw error to prevent silent failure
              throw new Error(`Failed to create startup: ${createError.message || 'Unknown error'}`);
            } else if (!newStartup) {
              console.error('❌ ========== STARTUP CREATION RETURNED NO DATA ==========');
              console.error('❌ Startup creation succeeded but returned no data');
              throw new Error('Failed to create startup: No data returned');
            } else {
              console.log('✅ Startup created successfully:', newStartup);
              startup = newStartup;
            }
          }

          if (startup) {
            // Create founders with equity information
            if (founders.length > 0) {
            const foundersData = founders.map(founder => ({
              startup_id: startup.id,
              name: founder.name,
              email: founder.email,
              shares: founder.shares || 0,
              equity_percentage: founder.equity || 0,
              mentor_code: founder.mentorCode || null
            }));

            console.log('💾 Saving founders data:', foundersData);
            const { data: savedFounders, error: foundersError } = await authService.supabase
              .from('founders')
              .insert(foundersData as any)
              .select();
            
            if (foundersError) {
              console.error('❌ Error saving founders:', foundersError);
              throw foundersError;
            }
            console.log('✅ Founders saved successfully:', savedFounders);
            }

            // Update the startup record with comprehensive profile data
            const startupUpdateData = {
              country: profileData.country,
              country_of_registration: profileData.country,
              company_type: profileData.companyType,
              registration_date: profileData.registrationDate,
              ca_service_code: profileData.caServiceCode || null,
              cs_service_code: profileData.csServiceCode || null,
              currency: profileData.currency,
              total_shares: shareData.totalShares,
              price_per_share: shareData.pricePerShare,
              esop_reserved_shares: shareData.esopReservedShares,
              current_valuation: shareData.totalShares * shareData.pricePerShare
            };

            console.log('💾 Updating startup with profile data:', startupUpdateData);
            const { data: updatedStartup, error: startupUpdateError } = await (authService.supabase as any)
              .from('startups')
              .update(startupUpdateData as any)
              .eq('id', startup.id)
              .select();
            
            if (startupUpdateError) {
              console.error('❌ ========== STARTUP UPDATE FAILED ==========');
              console.error('❌ Error updating startup with profile data:', startupUpdateError);
              console.error('❌ Startup ID:', startup.id);
              console.error('❌ Error details:', {
                message: startupUpdateError.message,
                code: startupUpdateError.code,
                details: startupUpdateError.details,
                hint: startupUpdateError.hint
              });
              console.error('❌ Update data:', startupUpdateData);
              console.error('❌ ==========================================');
              throw new Error(`Failed to update startup: ${startupUpdateError.message || 'Unknown error'}`);
            } else if (!updatedStartup || updatedStartup.length === 0) {
              console.error('❌ ========== STARTUP UPDATE RETURNED NO ROWS ==========');
              console.error('❌ Update succeeded but 0 rows were updated');
              console.error('❌ Startup ID used:', startup.id);
              throw new Error('Failed to update startup: No rows updated');
            } else {
              console.log('✅ Startup updated with profile data successfully! Rows updated:', updatedStartup.length);
              console.log('✅ Updated startup data:', updatedStartup[0]);
            }

            // Generate compliance tasks after saving profile data
            try {
              console.log('🔄 Generating compliance tasks for startup after profile save...');
              const { complianceRulesIntegrationService } = await import('../lib/complianceRulesIntegrationService');
              await complianceRulesIntegrationService.forceRegenerateComplianceTasks(startup.id);
              console.log('✅ Compliance tasks generated successfully');
            } catch (complianceError) {
              console.error('❌ Error generating compliance tasks:', complianceError);
              // Don't throw error here as the main registration is complete
            }

            // Also save shares data to startup_shares table for Cap Table compatibility
            console.log('💾 Syncing shares data to startup_shares table...');
            const { data: sharesData, error: sharesError } = await authService.supabase
              .from('startup_shares')
              .upsert({
                startup_id: startup.id,
                total_shares: shareData.totalShares,
                price_per_share: shareData.pricePerShare,
                esop_reserved_shares: shareData.esopReservedShares
              } as any, {
                onConflict: 'startup_id'
              })
              .select();
            
            if (sharesError) {
              console.error('❌ Error syncing shares data to startup_shares table:', sharesError);
              // Don't throw error here as the main data is already saved to startups table
            } else {
              console.log('✅ Shares data synced to startup_shares table successfully:', sharesData);
            }
            console.log('🔍 Updated startup data for profile tab:', {
              id: (updatedStartup as any)?.[0]?.id,
              country: (updatedStartup as any)?.[0]?.country,
              company_type: (updatedStartup as any)?.[0]?.company_type,
              registration_date: (updatedStartup as any)?.[0]?.registration_date,
              currency: (updatedStartup as any)?.[0]?.currency,
              total_shares: (updatedStartup as any)?.[0]?.total_shares,
              price_per_share: (updatedStartup as any)?.[0]?.price_per_share,
              esop_reserved_shares: (updatedStartup as any)?.[0]?.esop_reserved_shares
            });

            // Save fundraising details only if active fundraising is enabled
            if (fundraising && fundraising.active && fundraising.type && fundraising.value !== '' && fundraising.equity !== '') {
              let deckUrl: string | undefined = undefined;
              
              // Upload pitch deck if provided
              if (fundraising.pitchDeckFile) {
                try {
                  console.log('📤 Uploading pitch deck file:', fundraising.pitchDeckFile.name);
                  deckUrl = await capTableService.uploadPitchDeck(fundraising.pitchDeckFile, startup.id);
                  console.log('✅ Pitch deck uploaded successfully:', deckUrl);
                } catch (e) {
                  console.error('❌ Pitch deck upload failed:', e);
                  console.warn('Pitch deck upload failed (non-blocking):', e);
                }
              }

              // Save to fundraising_details table only
              const frToSave: FundraisingDetails = {
                active: !!fundraising.active,
                type: fundraising.type as any,
                value: Number(fundraising.value),
                equity: Number(fundraising.equity),
                domain: (fundraising.domain || undefined) as any,
                stage: (fundraising.stage || undefined) as any,
                validationRequested: !!fundraising.validationRequested,
                pitchDeckUrl: deckUrl,
                pitchVideoUrl: fundraising.pitchVideoUrl || undefined
              };

              try {
                await capTableService.updateFundraisingDetails(startup.id, frToSave);
                console.log('✅ Fundraising details saved to fundraising_details table');
              } catch (e) {
                console.warn('Failed to save fundraising during complete registration (non-blocking):', e);
              }
            }

            // Shares data is already stored in the startups table above
            console.log('✅ Shares data already stored in startups table');

            // Create subsidiaries if any
            if (subsidiaries.length > 0) {
              const subsidiariesData = subsidiaries
                .filter(s => s.country && s.companyType && s.registrationDate)
                .map(subsidiary => ({
                  startup_id: startup.id,
                  country: subsidiary.country,
                  company_type: subsidiary.companyType,
                  registration_date: subsidiary.registrationDate,
                  ca_code: subsidiary.caCode || null,
                  cs_code: subsidiary.csCode || null
                }));

              if (subsidiariesData.length > 0) {
                await authService.supabase
                  .from('subsidiaries')
                  .insert(subsidiariesData);
              }
            }

            // Create international operations if any
            if (internationalOps.length > 0) {
              const internationalOpsData = internationalOps
                .filter(op => op.country && op.companyType && op.startDate)
                .map(op => ({
                  startup_id: startup.id,
                  country: op.country,
                  company_type: op.companyType,
                  start_date: op.startDate
                }));

              if (internationalOpsData.length > 0) {
                await authService.supabase
                  .from('international_operations')
                  .insert(internationalOpsData);
              }
            }

            // Check if user was invited by Investment Advisor - auto-link if yes
            const { data: { user: authUser } } = await authService.supabase.auth.getUser();
            const wasInvitedByAdvisor = authUser?.user_metadata?.source === 'advisor_invite';
            const advisorCodeFromInvite = authUser?.user_metadata?.investment_advisor_code_entered || 
                                         userData?.investment_advisor_code_entered;
            
            if (wasInvitedByAdvisor && advisorCodeFromInvite) {
              console.log('🔗 User was invited by Investment Advisor, auto-linking...', {
                advisorCode: advisorCodeFromInvite,
                startupId: startup.id,
                userId: userData.id
              });

              // Get advisor details - Use ONLY user_profiles table
              let advisorData: any = null;
              let advisorAuthUserId: string | null = null;
              
              // Query user_profiles table only
              const { data: advisorProfile } = await authService.supabase
                .from('user_profiles')
                .select('id, auth_user_id, investment_advisor_code, name')
                .eq('investment_advisor_code', advisorCodeFromInvite)
                .eq('role', 'Investment Advisor')
                .maybeSingle();
              
              if (advisorProfile) {
                advisorData = advisorProfile;
                advisorAuthUserId = (advisorProfile as any).auth_user_id;
              }

              if (advisorData && advisorAuthUserId) {
                // Auto-accept: Set advisor_accepted = true in user_profiles table
                // This makes startup appear directly in "My Startups" without approval
                // Check if profile exists in user_profiles table
                const { data: profileCheck } = await authService.supabase
                  .from('user_profiles')
                  .select('id')
                  .eq('id', userData.id)
                  .maybeSingle();
                
                if (profileCheck) {
                  await authService.supabase
                    .from('user_profiles')
                    // @ts-expect-error - Dynamic table name prevents type inference
                    .update({
                      advisor_accepted: true,
                      investment_advisor_code_entered: advisorCodeFromInvite,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', userData.id);
                }

                // Update startup record with advisor code
                await authService.supabase
                  .from('startups')
                  // @ts-expect-error - Type inference issue
                  .update({
                    investment_advisor_code: advisorCodeFromInvite,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', startup.id);

                // Update advisor_added_startups if exists (link the manual entry)
                // advisor_id should be auth_user_id (consistent with other tables)
                const { data: advisorAddedStartup } = await authService.supabase
                  .from('advisor_added_startups')
                  .select('id')
                  .eq('advisor_id', advisorAuthUserId) // Use auth_user_id, not profile ID
                  .or(`tms_startup_id.eq.${startup.id},contact_email.eq.${userData.email}`)
                  .maybeSingle();

                if (advisorAddedStartup && (advisorAddedStartup as any).id) {
                  await authService.supabase
                    .from('advisor_added_startups')
                    // @ts-expect-error - Type inference issue with advisorAddedStartup.id
                    .update({
                      is_on_tms: true,
                      tms_startup_id: startup.id,
                      invite_status: 'accepted',
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', (advisorAddedStartup as any).id);
                  
                  console.log('✅ Updated advisor_added_startups record:', (advisorAddedStartup as any).id);
                }

                console.log('✅ Startup auto-linked to Investment Advisor:', (advisorData as any).name);
                console.log('✅ Startup will now appear in advisor\'s "My Startups" section automatically');
              } else {
                console.warn('⚠️ Advisor not found for code:', advisorCodeFromInvite);
              }
            } else {
              // Normal registration flow - startup entered advisor code manually
              // They will appear in pending requests, advisor needs to accept
              const enteredAdvisorCode = profileData.investmentAdvisorCode || userData?.investment_advisor_code_entered;
              if (enteredAdvisorCode) {
                console.log('📋 Startup entered advisor code manually:', enteredAdvisorCode);
                
                // Check if profile exists in user_profiles table
                const { data: profileCheck } = await authService.supabase
                  .from('user_profiles')
                  .select('id')
                  .eq('id', userData.id)
                  .maybeSingle();
                
                if (profileCheck) {
                  // Save manually entered advisor code to user_profiles table
                  await authService.supabase
                    .from('user_profiles')
                    // @ts-expect-error - Dynamic table name prevents type inference
                    .update({
                      investment_advisor_code_entered: enteredAdvisorCode,
                      advisor_accepted: false, // Needs advisor approval
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', userData.id);
                }

                // Also update startup record
                await authService.supabase
                  .from('startups')
                  // @ts-expect-error - Type inference issue
                  .update({
                    investment_advisor_code: enteredAdvisorCode,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', startup.id);

                console.log('📋 Startup will appear in advisor\'s pending requests for approval');
              }
            }
          }
        } catch (error: any) {
          console.error('❌ ========== STARTUP DATA SAVE ERROR ==========');
          console.error('❌ Error in startup data save:', error);
          console.error('❌ Error message:', error?.message);
          console.error('❌ Error details:', error);
          console.error('❌ =============================================');
          // Re-throw error so it's caught by outer catch block and shown to user
          throw new Error(`Failed to save startup data: ${error?.message || 'Unknown error'}`);
        }
      }

      console.log('🎉 Registration complete! Redirecting to dashboard...');
      onNavigateToDashboard();
      
    } catch (error: any) {
      console.error('❌ ========== HANDLESUBMIT ERROR ==========');
      console.error('❌ Error Type:', error?.constructor?.name);
      console.error('❌ Error Message:', error?.message);
      console.error('❌ Error Stack:', error?.stack);
      console.error('❌ Full Error Object:', error);
      console.error('❌ =========================================');
      setError(error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
            <p className="mt-4 text-slate-600">Checking your account...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12">
      <Card className="w-full max-w-2xl">
        {/* Header with logout button */}
        <div className="relative">
          <div className="absolute top-0 right-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
        
        <div className="text-center mb-8">
          <img src={LogoTMS} alt="TrackMyStartup" className="mx-auto h-40 w-40" />
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Complete Your Registration</h2>
          <p className="mt-2 text-sm text-slate-600">
            TrackMyStartup - Welcome, {userData.name}! Please upload your verification documents to complete your profile.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Verification Documents */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Verification Documents
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Government ID (Passport, Driver's License, etc.)
                </label>
                <CloudDriveInput
                  value={cloudDriveUrls.govId}
                  onChange={(url) => handleCloudDriveUrlChange('govId', url)}
                  onFileSelect={(file) => handleFileChange({ target: { files: [file] } } as any, 'govId')}
                  placeholder="Paste your cloud drive link here..."
                  label=""
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSize={10}
                  documentType="government ID"
                  showPrivacyMessage={false}
                  required
                />
                <input type="hidden" id="gov-id-url" name="gov-id-url" />
                {(uploadedFiles.govId || cloudDriveUrls.govId) && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ {uploadedFiles.govId ? uploadedFiles.govId.name + ' selected' : 'Cloud drive link provided'}
                  </p>
                )}
              </div>

              {/* Role-specific document - Not required for Mentor */}
              {userData.role !== 'Mentor' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {getRoleSpecificDocumentType(userData.role)}
                  </label>
                  <CloudDriveInput
                    value={cloudDriveUrls.roleSpecific}
                    onChange={(url) => handleCloudDriveUrlChange('roleSpecific', url)}
                    onFileSelect={(file) => handleFileChange({ target: { files: [file] } } as any, 'roleSpecific')}
                    placeholder="Paste your cloud drive link here..."
                    label=""
                    accept=".pdf,.jpg,.jpeg,.png"
                    maxSize={10}
                    documentType="role-specific document"
                    showPrivacyMessage={false}
                    required
                  />
                <input type="hidden" id="role-specific-url" name="role-specific-url" />
                {(uploadedFiles.roleSpecific || cloudDriveUrls.roleSpecific) && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ {uploadedFiles.roleSpecific ? uploadedFiles.roleSpecific.name + ' selected' : 'Cloud drive link provided'}
                  </p>
                )}
                </div>
              )}

              {/* Additional fields for Investment Advisor */}
              {userData.role === 'Investment Advisor' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      License (As per country regulations)
                    </label>
                    <CloudDriveInput
                      value={cloudDriveUrls.license}
                      onChange={(url) => handleCloudDriveUrlChange('license', url)}
                      onFileSelect={(file) => handleFileChange({ target: { files: [file] } } as any, 'license')}
                      placeholder="Paste your cloud drive link here..."
                      label=""
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxSize={10}
                      documentType="license"
                      showPrivacyMessage={false}
                      required
                    />
                    <input type="hidden" id="license-url" name="license-url" />
                    {(uploadedFiles.license || cloudDriveUrls.license) && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ {uploadedFiles.license ? uploadedFiles.license.name + ' selected' : 'Cloud drive link provided'}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Upload your financial advisor license (if applicable)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Company Logo
                    </label>
                    <CloudDriveInput
                      value={cloudDriveUrls.logo}
                      onChange={(url) => handleCloudDriveUrlChange('logo', url)}
                      onFileSelect={(file) => handleFileChange({ target: { files: [file] } } as any, 'logo')}
                      placeholder="Paste your cloud drive link here..."
                      label=""
                      accept=".jpg,.jpeg,.png,.svg"
                      maxSize={5}
                      documentType="company logo"
                      showPrivacyMessage={false}
                      required
                    />
                    <input type="hidden" id="logo-url" name="logo-url" />
                    {(uploadedFiles.logo || cloudDriveUrls.logo) && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ {uploadedFiles.logo ? uploadedFiles.logo.name + ' selected' : 'Cloud drive link provided'}
                      </p>
                    )}
                    <div className="text-xs text-slate-500 mt-1 space-y-1">
                      <p>Upload your company logo (JPG, PNG, or SVG format)</p>
                      <div className="bg-blue-50 p-2 rounded border border-blue-200">
                        <p className="font-medium text-blue-800 mb-1">Logo Specifications:</p>
                        <ul className="text-blue-700 space-y-0.5">
                          <li>• Recommended size: 64x64 pixels (square format)</li>
                          <li>• Maximum file size: 2MB</li>
                          <li>• Supported formats: JPG, PNG, SVG</li>
                          <li>• Logo will be displayed as 64x64px with white background</li>
                          <li>• For best results, use a square logo or center your logo in a square canvas</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Firm Information Section */}
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Briefcase className="h-5 w-5 text-brand-primary" />
                      <h3 className="text-lg font-semibold text-slate-900">Firm Information</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-6">
                      Provide details about your investment advisory firm.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Firm Name */}
                      <div>
                        <label htmlFor="firmName" className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-500" />
                          Firm Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="firmName"
                            type="text"
                            value={profileData.firmName}
                            onChange={(e) => setProfileData(prev => ({ ...prev, firmName: e.target.value }))}
                            placeholder="Enter your firm/company name"
                            required
                            className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm transition-colors"
                          />
                          <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5">
                          This name will be displayed on your profile
                        </p>
                      </div>

                      {/* Website */}
                      <div>
                        <label htmlFor="website" className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                          <Link2 className="h-4 w-4 text-slate-500" />
                          Website
                        </label>
                        <div className="relative">
                          <input
                            id="website"
                            type="url"
                            value={profileData.website}
                            onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                            placeholder="https://example.com"
                            className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary sm:text-sm transition-colors"
                          />
                          <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5">
                          Your firm's website URL (optional)
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Country Information - For all users */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Country Information
            </h3>
            <p className="text-sm text-slate-600">
              Select your country of operation.
            </p>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-500" />
                Country <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={profileData.country}
                  onChange={(e) => setProfileData(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-md px-10 py-2.5 text-slate-900 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                  required
                  disabled={loadingCountries}
                >
                  <option value="">{loadingCountries ? 'Loading countries...' : 'Select Country'}</option>
                  {countriesFromGeneralData.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Select the country where you operate (from general data table)
              </p>
            </div>
          </div>

          {/* Center Name - Only for Startup Facilitation Center role */}
          {userData.role === 'Startup Facilitation Center' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Facilitation Center Information
              </h3>
              <p className="text-sm text-slate-600">
                Provide your facilitation center's name.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Center Name</label>
                <input
                  type="text"
                  value={profileData.centerName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, centerName: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your facilitation center name"
                  required
                />
              </div>
            </div>
          )}

          {/* Company Profile Information - Only for Startup role */}
          {userData.role === 'Startup' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Company Profile
              </h3>
              <p className="text-sm text-slate-600">
                Provide your company's basic information and structure.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Company Type</label>
                  <select
                    value={profileData.companyType}
                    onChange={(e) => setProfileData(prev => ({ ...prev, companyType: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {companyTypesByCountry.length > 0 ? (
                      companyTypesByCountry.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))
                    ) : (
                      <>
                        <option value="C-Corporation">C-Corporation</option>
                        <option value="S-Corporation">S-Corporation</option>
                        <option value="LLC">LLC</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Sole Proprietorship">Sole Proprietorship</option>
                        <option value="Private Limited">Private Limited</option>
                        <option value="Public Limited">Public Limited</option>
                        <option value="Other">Other</option>
                      </>
                    )}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Currency</label>
                  <select
                    value={profileData.currency}
                    onChange={(e) => setProfileData(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                    <option value="CHF">CHF - Swiss Franc</option>
                    <option value="SGD">SGD - Singapore Dollar</option>
                    <option value="CNY">CNY - Chinese Yuan</option>
                  </select>
                </div>
                
                <Input
                  label="Registration Date"
                  type="date"
                  value={profileData.registrationDate}
                  onChange={(e) => setProfileData(prev => ({ ...prev, registrationDate: e.target.value }))}
                  required
                />
              </div>
            </div>
          )}

          {/* Share Information - Only for Startup role */}
          {userData.role === 'Startup' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <PieChart className="h-5 w-5 mr-2" />
                Share Information
              </h3>
              <p className="text-sm text-slate-600">
                Define your company's share structure and equity distribution.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Total Shares Issued"
                  type="number"
                  min="1"
                  value={shareData.totalShares}
                  onChange={(e) => {
                    const newTotalShares = parseInt(e.target.value) || 0;
                    setShareData(prev => ({ ...prev, totalShares: newTotalShares }));
                    
                    // Auto-calculate founder shares when total shares change
                    autoCalculateFounderShares(newTotalShares, shareData.esopReservedShares);
                    
                    // Recalculate founder equity percentages when total shares change (only after initialization)
                    if (isInitialized && newTotalShares > 0) {
                      setFounders(prev => prev.map(founder => {
                        if (founder.shares > 0) {
                          const equityPercentage = (founder.shares / newTotalShares) * 100;
                          // Round to 2 decimal places to avoid long decimal numbers
                          const roundedEquity = Math.round(equityPercentage * 100) / 100;
                          return { ...founder, equity: roundedEquity };
                        }
                        return founder;
                      }));
                    }
                  }}
                  required
                />
                
                <Input
                  label={`Price Per Share (${profileData.currency})`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={shareData.pricePerShare}
                  onChange={(e) => setShareData(prev => ({ ...prev, pricePerShare: parseFloat(e.target.value) || 0 }))}
                  required
                />
                
                <Input
                  label="ESOP Reserved Shares"
                  type="number"
                  min="0"
                  value={shareData.esopReservedShares}
                  onChange={(e) => {
                    const newEsopReservedShares = parseInt(e.target.value) || 0;
                    setShareData(prev => ({ ...prev, esopReservedShares: newEsopReservedShares }));
                    
                    // Auto-calculate founder shares when ESOP reserved shares change
                    autoCalculateFounderShares(shareData.totalShares, newEsopReservedShares);
                  }}
                  required
                />
              </div>
            </div>
          )}

          {/* Founder Information - Only for Startup role */}
          {userData.role === 'Startup' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Founder Information
              </h3>
              <p className="text-sm text-slate-600">
                Please provide the details of all founders.
              </p>
              
              <div className="space-y-4">
                {founders.map((founder, index) => (
                  <div key={founder.id} className="p-4 border border-slate-200 rounded-md">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-slate-900">Founder {index + 1}</h4>
                      {founders.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFounder(founder.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <Input
                        label="Name"
                        value={founder.name}
                        onChange={(e) => updateFounder(founder.id, 'name', e.target.value)}
                        required
                      />
                      <Input
                        label="Email"
                        type="email"
                        value={founder.email}
                        onChange={(e) => updateFounder(founder.id, 'email', e.target.value)}
                        required
                      />
                      <Input
                        label="Number of Shares"
                        type="number"
                        min="0"
                        value={founder.shares || 0}
                        onChange={(e) => {
                          const shares = parseInt(e.target.value) || 0;
                          updateFounder(founder.id, 'shares', shares);
                          // Auto-calculate equity percentage based on shares (only after initialization and not during updates)
                          if (isInitialized && shareData.totalShares > 0 && !isUpdating) {
                            setIsUpdating(true);
                            const equityPercentage = (shares / shareData.totalShares) * 100;
                            // Round to 2 decimal places to avoid long decimal numbers
                            const roundedEquity = Math.round(equityPercentage * 100) / 100;
                            updateFounder(founder.id, 'equity', roundedEquity);
                            setTimeout(() => setIsUpdating(false), 10);
                          }
                        }}
                        required
                      />
                      <Input
                        label={isInitialized ? "Equity (%) (auto-calculated)" : "Equity (%)"}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={founder.equity ? Number(founder.equity).toFixed(2) : 0}
                        onChange={(e) => {
                          const equity = parseFloat(e.target.value) || 0;
                          updateFounder(founder.id, 'equity', equity);
                          // Auto-calculate shares based on equity percentage (only after initialization and not during updates)
                          if (isInitialized && shareData.totalShares > 0 && equity > 0 && !isUpdating) {
                            setIsUpdating(true);
                            const calculatedShares = (equity / 100) * shareData.totalShares;
                            // Only update shares if the calculated value is meaningful (>= 1)
                            if (calculatedShares >= 1) {
                              const shares = Math.round(calculatedShares);
                              updateFounder(founder.id, 'shares', shares);
                            }
                            setTimeout(() => setIsUpdating(false), 10);
                          }
                        }}
                        required
                        readOnly={false}
                      />
                      <Input
                        label="Mentor Code (Optional)"
                        type="text"
                        value={founder.mentorCode || ''}
                        onChange={(e) => updateFounder(founder.id, 'mentorCode', e.target.value)}
                        placeholder="e.g., MEN-ABC123"
                      />
                    </div>
                  </div>
                ))}
                
                {/* Shares Allocation Summary */}
                {userData.role === 'Startup' && founders.length > 0 && shareData.totalShares > 0 && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg border">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Shares Allocation Summary</h4>
                    {(() => {
                      const totalFounderShares = founders.reduce((sum, founder) => sum + (founder.shares || 0), 0);
                      const esopReservedShares = shareData.esopReservedShares || 0;
                      const totalAllocatedShares = totalFounderShares + esopReservedShares;
                      const availableShares = shareData.totalShares - totalAllocatedShares;
                      const isOverAllocated = totalAllocatedShares > shareData.totalShares;
                      const totalFounderEquity = founders.reduce((sum, founder) => sum + (founder.equity || 0), 0);
                      const esopEquityPercentage = shareData.totalShares > 0 ? (esopReservedShares / shareData.totalShares) * 100 : 0;
                      const availableEquityPercentage = 100 - totalFounderEquity - esopEquityPercentage;
                      
                      return (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Total Shares:</span>
                            <span className="font-medium">{shareData.totalShares.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Founder Shares:</span>
                            <span className={totalFounderShares > shareData.totalShares ? "text-red-600 font-medium" : "text-slate-700"}>
                              {totalFounderShares.toLocaleString()} ({totalFounderEquity.toFixed(2)}%)
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">ESOP Reserved:</span>
                            <span className="text-slate-700">{esopReservedShares.toLocaleString()} ({esopEquityPercentage.toFixed(2)}%)</span>
                          </div>
                          <div className="flex justify-between font-medium pt-2 border-t border-slate-200">
                            <span className="text-slate-700">Available for Investment:</span>
                            <span className={availableShares < 0 ? "text-red-600" : availableShares === 0 ? "text-yellow-600" : "text-green-600"}>
                              {availableShares.toLocaleString()} ({availableEquityPercentage.toFixed(2)}%)
                            </span>
                          </div>
                          {isOverAllocated && (
                            <div className="text-red-600 text-sm font-medium mt-3 p-3 bg-red-50 border border-red-200 rounded">
                              ⚠️ Total allocated shares exceed total shares by {(totalAllocatedShares - shareData.totalShares).toLocaleString()}
                              <br />
                              <span className="text-xs">Please reduce founder shares or increase total shares.</span>
                            </div>
                          )}
                          {totalFounderEquity > 100 && (
                            <div className="text-red-600 text-sm font-medium mt-3 p-3 bg-red-50 border border-red-200 rounded">
                              ⚠️ Total founder equity exceeds 100% ({totalFounderEquity.toFixed(2)}%)
                              <br />
                              <span className="text-xs">Please adjust founder equity percentages.</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
                
                <Button
                  type="button"
                  onClick={addFounder}
                  variant="outline"
                  className="w-full"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Add Another Founder
                </Button>
              </div>
            </div>
          )}

          {/* Investment Advisor Code - Only for Startup role */}
          {userData.role === 'Startup' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Investment Advisor Code
              </h3>
              {wasInvitedByAdvisor && advisorCodeFromInvite ? (
                <>
                  <p className="text-sm text-slate-600">
                    Your Investment Advisor code has been pre-assigned. This field cannot be changed.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Investment Advisor Code <span className="text-green-600">(Pre-assigned)</span>
                    </label>
                    <input
                      type="text"
                      value={advisorCodeFromInvite}
                      readOnly
                      disabled
                      className="w-full bg-slate-100 border border-slate-300 rounded-md px-3 py-2 text-slate-700 cursor-not-allowed"
                    />
                    <p className="text-xs text-green-600 mt-1">
                      ✓ This code was assigned by your Investment Advisor and cannot be modified.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600">
                    {profileData.investmentAdvisorCode || (userData as any)?.investment_advisor_code_entered
                      ? 'Your Investment Advisor code from Registration Form 1 is shown below. You can update it if needed.'
                      : 'Enter your Investment Advisor code if you have one. This is optional and can be added later.'}
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Investment Advisor Code (optional)
                      {(profileData.investmentAdvisorCode || (userData as any)?.investment_advisor_code_entered) && (
                        <span className="text-blue-600 text-xs ml-2">(From Form 1)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={profileData.investmentAdvisorCode || (userData as any)?.investment_advisor_code_entered || ''}
                      onChange={(e) => setProfileData(prev => ({ ...prev, investmentAdvisorCode: e.target.value }))}
                      placeholder="Enter your Investment Advisor code (e.g., IA-XXXX)"
                      className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {profileData.investmentAdvisorCode || (userData as any)?.investment_advisor_code_entered
                        ? 'You can update this code if needed.'
                        : 'Leave blank if you don\'t have an Investment Advisor code yet.'}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Service Provider Codes (TMS-allocated codes, optional) - Only for Startup role */}
          {userData.role === 'Startup' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Service Provider Codes (Optional)
              </h3>
              <p className="text-sm text-slate-600">
                Enter CA/CS codes allocated by TrackMyStartup if you have them. You can leave these blank and add them later.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">CA Code (optional)</label>
                  <input
                    type="text"
                    value={profileData.caServiceCode || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, caServiceCode: e.target.value }))}
                    placeholder="Enter TMS-allocated CA code (e.g., CA-XXXX)"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Leave blank if not assigned yet.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">CS Code (optional)</label>
                  <input
                    type="text"
                    value={profileData.csServiceCode || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, csServiceCode: e.target.value }))}
                    placeholder="Enter TMS-allocated CS code (e.g., CS-XXXX)"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Leave blank if not assigned yet.</p>
                </div>
              </div>
            </div>
          )}

          {/* Incubation Centers (Optional) - Only for Startup role */}
          {userData.role === 'Startup' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Your Incubation center
              </h3>
              <p className="text-sm text-slate-600">please enter the details of Incubation centers and accelerators you are associated with.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Center Name"
                  type="text"
                  value={inviteCenter.name}
                  onChange={(e) => setInviteCenter(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., ABC Innovation Hub"
                />
                <Input
                  label="Contact Number"
                  type="text"
                  value={inviteCenter.phone}
                  onChange={(e) => setInviteCenter(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="e.g., +1 555 123 4567"
                />
                <Input
                  label="Email"
                  type="email"
                  value={inviteCenter.email}
                  onChange={(e) => setInviteCenter(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="e.g., contact@abcinnovations.org"
                />
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={sendIncubationInvite} disabled={isSendingInvite}>{isSendingInvite ? 'Preparing email...' : 'Share Details via Email'}</Button>
              </div>
            </div>
          )}

          {/* Investors (Optional) - Only for Startup role */}
          {userData.role === 'Startup' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Your Investor
              </h3>
              <p className="text-sm text-slate-600">Please list the investor that have invested (grant, debt or equity) in your startup</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Investor Name"
                  type="text"
                  value={inviteInvestor.name}
                  onChange={(e) => setInviteInvestor(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Jane Doe"
                />
                <Input
                  label="Contact Number"
                  type="text"
                  value={inviteInvestor.phone}
                  onChange={(e) => setInviteInvestor(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="e.g., +1 555 987 6543"
                />
                <Input
                  label="Email"
                  type="email"
                  value={inviteInvestor.email}
                  onChange={(e) => setInviteInvestor(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="e.g., jane@example.com"
                />
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={sendInvestorInvite} disabled={isSendingInvestorInvite}>{isSendingInvestorInvite ? 'Preparing email...' : 'Share Details via Email'}</Button>
              </div>
            </div>
          )}

        {/* Fundraising (Optional) - Only for Startup role */}
        {userData.role === 'Startup' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Fundraising (Optional)</h3>
            <div className="flex items-center gap-2">
              <input
                id="fr-active"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                checked={fundraising.active}
                onChange={(e) => {
                  const isActive = e.target.checked;
                  setFundraising(prev => ({ ...prev, active: isActive }));
                  // Clear fundraising data if deactivated
                  if (!isActive) {
                    setFundraising({
                      active: false,
                      type: '',
                      value: '',
                      equity: '',
                      domain: '',
                      stage: '',
                      pitchDeckFile: null,
                      pitchVideoUrl: '',
                      validationRequested: false
                    });
                  }
                }}
              />
              <label htmlFor="fr-active" className="text-sm text-slate-700">Activate Fundraising Round</label>
            </div>
            
            {/* Only show fundraising fields when active */}
            {fundraising.active && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Type *"
                  id="fr-type"
                  value={fundraising.type as any}
                  onChange={(e) => setFundraising(prev => ({ ...prev, type: e.target.value as any }))}
                  required
                >
                  <option value="">Select round type</option>
                  {Object.values(InvestmentType).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
                <Input
                  label="Value *"
                  id="fr-value"
                  type="number"
                  value={fundraising.value as any}
                  onChange={(e) => setFundraising(prev => ({ ...prev, value: e.target.value === '' ? '' : Number(e.target.value) }))}
                  required
                />
                <Input
                  label="Equity (%) *"
                  id="fr-equity"
                  type="number"
                  value={fundraising.equity as any}
                  onChange={(e) => setFundraising(prev => ({ ...prev, equity: e.target.value === '' ? '' : Number(e.target.value) }))}
                  required
                />
              <Select
                label="Domain"
                id="fr-domain"
                value={(fundraising.domain || '') as any}
                onChange={(e) => setFundraising(prev => ({ ...prev, domain: (e.target.value || '') as any }))}
              >
                <option value="">Select domain</option>
                {Object.values(StartupDomain).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Select>
              <Select
                label="Stage"
                id="fr-stage"
                value={(fundraising.stage || '') as any}
                onChange={(e) => setFundraising(prev => ({ ...prev, stage: (e.target.value || '') as any }))}
              >
                <option value="">Select stage</option>
                {Object.values(StartupStage).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
              <Input
                label="Pitch Video URL"
                id="fr-video"
                type="url"
                value={fundraising.pitchVideoUrl || ''}
                onChange={(e) => setFundraising(prev => ({ ...prev, pitchVideoUrl: e.target.value }))}
              />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Pitch Deck (PDF) *</label>
                <CloudDriveInput
                  value={cloudDriveUrls.pitchDeck}
                  onChange={(url) => {
                    setCloudDriveUrls(prev => ({ ...prev, pitchDeck: url }));
                    if (url) {
                      setFundraising(prev => ({ ...prev, pitchDeckFile: null }));
                    }
                  }}
                  onFileSelect={(file) => {
                    console.log('📥 CompleteRegistrationPage onFileSelect called with file:', file);
                    if (file) {
                      console.log('📄 File details:', {
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        isFile: file instanceof File
                      });
                      // Pass the File directly - handleFundraisingDeckChange now accepts File objects
                      handleFundraisingDeckChange(file);
                    } else {
                      console.warn('⚠️ No file received in CompleteRegistrationPage onFileSelect');
                    }
                  }}
                  placeholder="Paste your cloud drive link here..."
                  label=""
                  accept=".pdf"
                  maxSize={10}
                  documentType="pitch deck"
                  showPrivacyMessage={false}
                  className="w-full text-sm"
                  required
                />
                <input type="hidden" id="pitch-deck-url" name="pitch-deck-url" />
                {fundraising.pitchDeckFile && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-700 font-medium">
                      ✓ Pitch deck selected: {fundraising.pitchDeckFile.name}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Size: {(fundraising.pitchDeckFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-1">Max 10MB • PDF format only</p>
              </div>
              </div>
            )}
            {/* Startup Nation validation removed as per requirement */}
          </div>
        )}

          {/* Subsidiaries - Only for Startup role */}
          {userData.role === 'Startup' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Subsidiaries (Optional)
              </h3>
              <p className="text-sm text-slate-600">
                Add any subsidiaries or international operations.
              </p>
              
              <div className="space-y-4">
                {subsidiaries.map((subsidiary, index) => (
                  <div key={subsidiary.id} className="p-4 border border-slate-200 rounded-md">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-slate-900">Subsidiary {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeSubsidiary(subsidiary.id)}
                        className="text-red-600 hover:text-red-800 text-sm flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Country</label>
                        <select
                          value={subsidiary.country}
                          onChange={(e) => handleSubsidiaryCountrySelection(subsidiary.id, e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Country</option>
                          {countryComplianceInfo.map(country => (
                            <option key={country.country_code} value={country.country_code}>
                              {country.country_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Company Type</label>
                        <select
                          value={subsidiary.companyType}
                          onChange={(e) => updateSubsidiary(subsidiary.id, 'companyType', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Company Type</option>
                          {getCompanyTypesForSubsidiary(subsidiary.country).map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <Input
                        label="Registration Date"
                        type="date"
                        value={subsidiary.registrationDate}
                        onChange={(e) => updateSubsidiary(subsidiary.id, 'registrationDate', e.target.value)}
                      />
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          CA Type (Auto-populated)
                        </label>
                        <input
                          type="text"
                          value={subsidiary.caCode || 'Select country first'}
                          readOnly
                          className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          CS Type (Auto-populated)
                        </label>
                        <input
                          type="text"
                          value={subsidiary.csCode || 'Select country first'}
                          readOnly
                          className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-600"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  onClick={addSubsidiary}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subsidiary
                </Button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="text-sm text-red-800">
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Completing Registration...' : 'Complete Registration'}
          </Button>
        </form>
      </Card>
    </div>
  );
};
