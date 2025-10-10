import React, { useState, useEffect } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import { UserRole } from '../types';
import { FileText, Users, CheckCircle, Building2, Globe, PieChart, Plus, Trash2, LogOut } from 'lucide-react';
import LogoTMS from './public/logoTMS.svg';
import { authService } from '../lib/auth';
import { storageService } from '../lib/storage';
import { complianceRulesComprehensiveService } from '../lib/complianceRulesComprehensiveService';
import { userComplianceService, CountryComplianceInfo } from '../lib/userComplianceService';
import { getCurrencyForCountry, getCountryProfessionalTitles } from '../lib/utils';
import StartupSubscriptionPage from './startup-health/StartupSubscriptionPage';

interface Founder {
  id: string;
  name: string;
  email: string;
  shares?: number;
  equity?: number;
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
}

export const CompleteRegistrationPage: React.FC<CompleteRegistrationPageProps> = ({
  onNavigateToRegister,
  onNavigateToDashboard
}) => {
  const [userData, setUserData] = useState<any>(null);
  const [countryComplianceInfo, setCountryComplianceInfo] = useState<CountryComplianceInfo[]>([]);
  const [selectedCountryInfo, setSelectedCountryInfo] = useState<CountryComplianceInfo | null>(null);
  const [showSubscriptionPage, setShowSubscriptionPage] = useState(false);
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
  });

  // Share and equity information
  const [shareData, setShareData] = useState({
    totalShares: 1000000,
    pricePerShare: 0.01,
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
  // Payment gating removed
  
  // Admin-managed compliance rules for company types
  const [rulesMap, setRulesMap] = useState<any>({});
  const [allCountries, setAllCountries] = useState<string[]>([]);

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
      const { data: { user }, error } = await authService.supabase.auth.getUser();
      
      if (error || !user) {
        // No user found, redirect to login
        onNavigateToRegister();
        return;
      }

      // Get user profile (needed to determine role and email)
      const { data: profile } = await authService.supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      // Check if user already has a complete profile using the new method
      const isComplete = await authService.isProfileComplete(user.id);
      
      if (isComplete) {
        onNavigateToDashboard();
        return;
      }

      // User needs to complete Step 2
      setUserData({
        id: user.id,
        email: user.email,
        name: profile?.name || user.user_metadata?.name || 'User',
        role: profile?.role || user.user_metadata?.role || 'Investor',
        startupName: profile?.startup_name || user.user_metadata?.startupName
      });
      
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
    }
  };

  const addFounder = () => {
    const newId = (founders.length + 1).toString();
    setFounders(prev => [...prev, { id: newId, name: '', email: '', shares: 0, equity: 0 }]);
  };

  const removeFounder = (id: string) => {
    if (founders.length > 1) {
      setFounders(prev => prev.filter(founder => founder.id !== id));
    }
  };

  const updateFounder = (id: string, field: 'name' | 'email' | 'shares' | 'equity', value: string | number) => {
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
    setIsLoading(true);
    setError(null);

    // Validation
    if (!profileData.country) {
      setError('Country selection is required');
      setIsLoading(false);
      return;
    }

    if (!uploadedFiles.govId) {
      setError('Government ID is required');
      setIsLoading(false);
      return;
    }

    if (!uploadedFiles.roleSpecific) {
      setError(`${getRoleSpecificDocumentType(userData.role)} is required`);
      setIsLoading(false);
      return;
    }

    // For Investment Advisors, license and logo are required
    if (userData.role === 'Investment Advisor') {
      if (!uploadedFiles.license) {
        setError('License (As per country regulations) is required for Investment Advisors');
        setIsLoading(false);
        return;
      }
      if (!uploadedFiles.logo) {
        setError('Company logo is required for Investment Advisors');
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

      console.log('📁 Starting file uploads...', { govId: uploadedFiles.govId, roleSpecific: uploadedFiles.roleSpecific });

      if (uploadedFiles.govId) {
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

      if (uploadedFiles.roleSpecific) {
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
        if (uploadedFiles.license) {
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

        if (uploadedFiles.logo) {
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
          updated_at: new Date().toISOString()
      };


      const { error: updateError } = await authService.supabase
        .from('users')
        .update(updateData)
        .eq('id', userData.id);

      if (updateError) {
        console.error('❌ Database update failed:', updateError);
        throw new Error('Failed to update user profile');
      }

      console.log('✅ User profile updated successfully in database');

      // If user is a startup, create startup and founders with comprehensive data
      if (userData.role === 'Startup') {
        try {
          // First, try to find existing startup for this user
          console.log('🔍 Looking for existing startup for user:', userData.id);
          const { data: existingStartups, error: findError } = await authService.supabase
            .from('startups')
            .select('*')
            .eq('user_id', userData.id);

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
            // Calculate current valuation from price per share and total shares
            const calculatedCurrentValuation = shareData.pricePerShare * shareData.totalShares;
            
            // Validate that valuation is not less than 20,000,000 (20 million)
            const minimumValuation = 20000000;
            if (calculatedCurrentValuation < minimumValuation) {
              throw new Error(`Startup valuation (${calculatedCurrentValuation.toLocaleString()}) must be at least ${minimumValuation.toLocaleString()}. Please increase the price per share or total shares.`);
            }

            // Create new startup if none exists
            console.log('🆕 No existing startup found, creating new one');
            const { data: newStartup, error: createError } = await authService.supabase
              .from('startups')
              .insert({
                name: userData.startupName || `${userData.name}'s Startup`,
                investment_type: 'Seed',
                investment_value: 0,
                equity_allocation: 0,
                current_valuation: calculatedCurrentValuation,
                compliance_status: 'Pending',
                sector: 'Technology',
                total_funding: 0,
                total_revenue: 0,
                registration_date: profileData.registrationDate,
                user_id: userData.id
              })
              .select()
              .single();

            if (createError) {
              console.error('❌ Error creating startup:', createError);
              throw createError;
            }
            startup = newStartup;
          }

          if (startup) {
            // Create founders with equity information
            if (founders.length > 0) {
            const foundersData = founders.map(founder => ({
              startup_id: startup.id,
              name: founder.name,
              email: founder.email,
              shares: founder.shares || 0,
              equity_percentage: founder.equity || 0
            }));

            console.log('💾 Saving founders data:', foundersData);
            const { data: savedFounders, error: foundersError } = await authService.supabase
              .from('founders')
              .insert(foundersData)
              .select();
            
            if (foundersError) {
              console.error('❌ Error saving founders:', foundersError);
              throw foundersError;
            }
            console.log('✅ Founders saved successfully:', savedFounders);
            }

            // Calculate current valuation from price per share and total shares
            const calculatedCurrentValuation = shareData.pricePerShare * shareData.totalShares;
            
            // Validate that valuation is not less than 20,000,000 (20 million)
            const minimumValuation = 20000000;
            if (calculatedCurrentValuation < minimumValuation) {
              throw new Error(`Startup valuation (${calculatedCurrentValuation.toLocaleString()}) must be at least ${minimumValuation.toLocaleString()}. Please increase the price per share or total shares.`);
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
              current_valuation: calculatedCurrentValuation
            };

            console.log('💾 Updating startup with profile data:', startupUpdateData);
            const { data: updatedStartup, error: startupUpdateError } = await authService.supabase
              .from('startups')
              .update(startupUpdateData)
              .eq('id', startup.id)
              .select();
            
            if (startupUpdateError) {
              console.error('❌ Error updating startup with profile data:', startupUpdateError);
              throw startupUpdateError;
            }
            console.log('✅ Startup updated with profile data successfully:', updatedStartup);

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
              }, {
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
              id: updatedStartup[0]?.id,
              country: updatedStartup[0]?.country,
              company_type: updatedStartup[0]?.company_type,
              registration_date: updatedStartup[0]?.registration_date,
              currency: updatedStartup[0]?.currency,
              total_shares: updatedStartup[0]?.total_shares,
              price_per_share: updatedStartup[0]?.price_per_share,
              esop_reserved_shares: updatedStartup[0]?.esop_reserved_shares
            });

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
          }
        } catch (error) {
          console.error('Error creating startup:', error);
        }
      }

      // Registration complete, proceed to dashboard

      console.log('🎉 Registration complete!');
      
      // Show subscription page for startup users
      if (userData?.role === 'Startup') {
        setShowSubscriptionPage(true);
      } else {
        onNavigateToDashboard();
      }
      
    } catch (error: any) {
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

  // Show subscription page if user is startup and registration is complete
  if (showSubscriptionPage && userData?.role === 'Startup') {
    return (
      <StartupSubscriptionPage 
        currentUser={userData}
        onPaymentSuccess={() => onNavigateToDashboard()}
      />
    );
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
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'govId')}
                  required
                />
                {uploadedFiles.govId && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ {uploadedFiles.govId.name} selected
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {getRoleSpecificDocumentType(userData.role)}
                </label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'roleSpecific')}
                  required
                />
                {uploadedFiles.roleSpecific && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ {uploadedFiles.roleSpecific.name} selected
                  </p>
                )}
              </div>

              {/* Additional fields for Investment Advisor */}
              {userData.role === 'Investment Advisor' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      License (As per country regulations)
                    </label>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, 'license')}
                      required
                    />
                    {uploadedFiles.license && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ {uploadedFiles.license.name} selected
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
                    <Input
                      type="file"
                      accept=".jpg,.jpeg,.png,.svg"
                      onChange={(e) => handleFileChange(e, 'logo')}
                      required
                    />
                    {uploadedFiles.logo && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ {uploadedFiles.logo.name} selected
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
              <label className="block text-sm font-medium text-slate-700 mb-2">Country</label>
              <select
                value={profileData.country}
                onChange={(e) => setProfileData(prev => ({ ...prev, country: e.target.value }))}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Country</option>
                <option value="United States">United States</option>
                <option value="India">India</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
                <option value="Germany">Germany</option>
                <option value="France">France</option>
                <option value="Singapore">Singapore</option>
                <option value="Japan">Japan</option>
                <option value="China">China</option>
                <option value="Brazil">Brazil</option>
                <option value="Mexico">Mexico</option>
                <option value="South Africa">South Africa</option>
                <option value="Nigeria">Nigeria</option>
                <option value="Kenya">Kenya</option>
                <option value="Egypt">Egypt</option>
                <option value="UAE">UAE</option>
                <option value="Saudi Arabia">Saudi Arabia</option>
                <option value="Israel">Israel</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

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
              
              {/* Current Valuation Display */}
              {shareData.totalShares > 0 && shareData.pricePerShare > 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-700 mb-2">Calculated Current Valuation</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-600">Total Company Valuation:</span>
                    <span className="text-lg font-bold text-blue-800">
                      {(() => {
                        const calculatedValuation = shareData.pricePerShare * shareData.totalShares;
                        const currency = profileData.currency;
                        const symbol = currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
                        return `${symbol}${calculatedValuation.toLocaleString()}`;
                      })()}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-blue-600">
                    {(() => {
                      const calculatedValuation = shareData.pricePerShare * shareData.totalShares;
                      const minimumValuation = 20000000;
                      if (calculatedValuation < minimumValuation) {
                        return `⚠️ Valuation must be at least ${minimumValuation.toLocaleString()} to proceed`;
                      }
                      return `✅ Valuation meets minimum requirement (${minimumValuation.toLocaleString()})`;
                    })()}
                  </div>
                </div>
              )}
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                        step="0.1"
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
                              {totalFounderShares.toLocaleString()} ({totalFounderEquity.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">ESOP Reserved:</span>
                            <span className="text-slate-700">{esopReservedShares.toLocaleString()} ({esopEquityPercentage.toFixed(1)}%)</span>
                          </div>
                          <div className="flex justify-between font-medium pt-2 border-t border-slate-200">
                            <span className="text-slate-700">Available for Investment:</span>
                            <span className={availableShares < 0 ? "text-red-600" : availableShares === 0 ? "text-yellow-600" : "text-green-600"}>
                              {availableShares.toLocaleString()} ({availableEquityPercentage.toFixed(1)}%)
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
                              ⚠️ Total founder equity exceeds 100% ({totalFounderEquity.toFixed(1)}%)
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

          {/* Service Provider Codes - Only for Startup role */}
          {userData.role === 'Startup' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Service Provider Codes
              </h3>
              <p className="text-sm text-slate-600">
                Enter the appropriate professional service types for your country. Suggestions are provided based on your selected country.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    CA Type
                  </label>
                  <input
                    type="text"
                    value={profileData.caServiceCode || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, caServiceCode: e.target.value }))}
                    placeholder="Enter CA type for your country"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {selectedCountryInfo?.ca_type && (
                    <p className="text-xs text-slate-500 mt-1">
                      Suggested: {selectedCountryInfo.ca_type}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    CS Type
                  </label>
                  <input
                    type="text"
                    value={profileData.csServiceCode || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, csServiceCode: e.target.value }))}
                    placeholder="Enter CS type for your country"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {selectedCountryInfo?.cs_type && (
                    <p className="text-xs text-slate-500 mt-1">
                      Suggested: {selectedCountryInfo.cs_type}
                    </p>
                  )}
                </div>
              </div>
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
