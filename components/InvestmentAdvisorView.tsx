import React, { useState, useEffect, useMemo } from 'react';
import { User, Startup, InvestmentOffer, ComplianceStatus } from '../types';
import { userService, investmentService } from '../lib/database';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatCurrencyCompact, getCurrencySymbol } from '../lib/utils';
import { useInvestmentAdvisorCurrency } from '../lib/hooks/useInvestmentAdvisorCurrency';
import { investorService, ActiveFundraisingStartup } from '../lib/investorService';
import { AuthUser, authService } from '../lib/auth';
import { Eye, Users, FileText, Globe, ExternalLink, Linkedin, HelpCircle, Heart, Share2, CheckCircle, Video } from 'lucide-react';
import ProfilePage from './ProfilePage';
import InvestorView from './InvestorView';
import StartupHealthView from './StartupHealthView';
import { paymentService } from '../lib/paymentService';
import InvestmentAdvisorProfileForm from './investment-advisor/InvestmentAdvisorProfileForm';
import InvestmentAdvisorCard from './investment-advisor/InvestmentAdvisorCard';
import InvestorCard from './investor/InvestorCard';
import MentorCard from './mentor/MentorCard';
import Card from './ui/Card';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { advisorAddedInvestorService, AdvisorAddedInvestor, CreateAdvisorAddedInvestor } from '../lib/advisorAddedInvestorService';
import { advisorAddedStartupService, AdvisorAddedStartup, CreateAdvisorAddedStartup } from '../lib/advisorAddedStartupService';
import { generalDataService } from '../lib/generalDataService';
import { advisorConnectionRequestService, AdvisorConnectionRequest } from '../lib/advisorConnectionRequestService';
import { advisorMandateService, AdvisorMandate, CreateAdvisorMandate } from '../lib/advisorMandateService';
import { PlusCircle, Edit, Trash2, Filter, X } from 'lucide-react';
import { getVideoEmbedUrl } from '../lib/videoUtils';

interface InvestmentAdvisorViewProps {
  currentUser: AuthUser | null;
  users: User[];
  startups: Startup[];
  investments: any[];
  offers: InvestmentOffer[];
  interests: any[];
  pendingRelationships?: any[];
  onViewStartup: (id: number, targetTab?: string) => void;
}

const InvestmentAdvisorView: React.FC<InvestmentAdvisorViewProps> = ({ 
  currentUser,
  users,
  startups,
  investments,
  offers,
  interests,
  pendingRelationships = [],
  onViewStartup
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'discovery' | 'management' | 'myInvestments' | 'myInvestors' | 'myStartups' | 'interests' | 'portfolio' | 'collaboration' | 'mandate'>('dashboard');
  const [managementSubTab, setManagementSubTab] = useState<'myInvestments' | 'myInvestors' | 'myStartups'>('myInvestments');
  const [showProfilePage, setShowProfilePage] = useState(false);
  const [agreementFile, setAgreementFile] = useState<File | null>(null);
  const [coInvestmentListings, setCoInvestmentListings] = useState<Set<number>>(new Set());
  
  // Track recommended startups to change button color
  const [recommendedStartups, setRecommendedStartups] = useState<Set<number>>(new Set());
  
  // Recommendation modal state
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [selectedStartupForRecommendation, setSelectedStartupForRecommendation] = useState<number | null>(null);
  const [selectedInvestors, setSelectedInvestors] = useState<Set<string>>(new Set());
  const [selectedCollaborators, setSelectedCollaborators] = useState<Set<string>>(new Set());
  const [existingRecommendations, setExistingRecommendations] = useState<Set<string>>(new Set()); // Track recipients who already have recommendations
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Discovery tab state
  const [activeFundraisingStartups, setActiveFundraisingStartups] = useState<ActiveFundraisingStartup[]>([]);
  const [shuffledPitches, setShuffledPitches] = useState<ActiveFundraisingStartup[]>([]);
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);
  const [favoritedPitches, setFavoritedPitches] = useState<Set<number>>(new Set());
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [showOnlyValidated, setShowOnlyValidated] = useState(false);
  const [showOnlyDueDiligence, setShowOnlyDueDiligence] = useState(false);
  const [dueDiligenceStartups, setDueDiligenceStartups] = useState<Set<number>>(new Set<number>());
  const [approvedDueDiligenceStartups, setApprovedDueDiligenceStartups] = useState<Set<number>>(new Set<number>());
  const addStartupToDueDiligenceSet = (startupId: number) => {
    setDueDiligenceStartups(prev => {
      if (prev.has(startupId)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(startupId);
      return next;
    });
  };
  const [isLoadingPitches, setIsLoadingPitches] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'info' | 'success' | 'warning' | 'error', timestamp: Date}>>([]);
  
  // Dashboard navigation state
  const [viewingInvestorDashboard, setViewingInvestorDashboard] = useState(false);
  const [viewingStartupDashboard, setViewingStartupDashboard] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState<User | null>(null);
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [investorOffers, setInvestorOffers] = useState<any[]>([]);
  const [investorDashboardData, setInvestorDashboardData] = useState<{
    investorStartups: Startup[];
    investorInvestments: any[];
    investorStartupAdditionRequests: any[];
  }>({ investorStartups: [], investorInvestments: [], investorStartupAdditionRequests: [] });
  const [startupOffers, setStartupOffers] = useState<any[]>([]);
  const [previewProfile, setPreviewProfile] = useState<any>({
    user_id: currentUser?.id || '',
    media_type: 'logo',
    geography: [],
    investment_stages: [],
    domain: [],
    service_types: []
  });
  const [collaborationSubTab, setCollaborationSubTab] = useState<'myCollaborators' | 'collaboratorRequests'>('myCollaborators');
  
  // Collaboration requests state
  const [collaborationRequests, setCollaborationRequests] = useState<AdvisorConnectionRequest[]>([]);
  const [loadingCollaborationRequests, setLoadingCollaborationRequests] = useState(false);
  const [acceptedCollaborators, setAcceptedCollaborators] = useState<AdvisorConnectionRequest[]>([]);
  const [collaboratorProfiles, setCollaboratorProfiles] = useState<{[key: string]: any}>({});

  // Mandate state
  const [mandates, setMandates] = useState<AdvisorMandate[]>([]);
  const [selectedMandateId, setSelectedMandateId] = useState<number | null>(null);
  const [isLoadingMandates, setIsLoadingMandates] = useState(false);
  const [showMandateModal, setShowMandateModal] = useState(false);
  const [editingMandate, setEditingMandate] = useState<AdvisorMandate | null>(null);
  const [mandateFormData, setMandateFormData] = useState<CreateAdvisorMandate>({
    advisor_id: currentUser?.id || '',
    name: '',
    stage: '',
    round_type: '',
    domain: '',
    amount_min: undefined,
    amount_max: undefined,
    equity_min: undefined,
    equity_max: undefined
  });
  const [mandateFilterOptions, setMandateFilterOptions] = useState({
    stages: [] as string[],
    roundTypes: [] as string[],
    domains: [] as string[]
  });
  const [isLoadingMandateFilters, setIsLoadingMandateFilters] = useState(false);

  // Advisor-added investors state
  const [advisorAddedInvestors, setAdvisorAddedInvestors] = useState<AdvisorAddedInvestor[]>([]);
  const [loadingAddedInvestors, setLoadingAddedInvestors] = useState(false);
  const [showAddInvestorModal, setShowAddInvestorModal] = useState(false);
  const [editingAddedInvestor, setEditingAddedInvestor] = useState<AdvisorAddedInvestor | null>(null);
  const [addInvestorFormData, setAddInvestorFormData] = useState<CreateAdvisorAddedInvestor>({
    advisor_id: currentUser?.id || '',
    investor_name: '',
    email: '',
    contact_number: '',
    website: '',
    linkedin_url: '',
    firm_type: '',
    location: '',
    investment_focus: '',
    domain: '',
    stage: '',
    notes: ''
  });

  // Advisor-added startups state
  const [advisorAddedStartups, setAdvisorAddedStartups] = useState<AdvisorAddedStartup[]>([]);
  const [loadingAddedStartups, setLoadingAddedStartups] = useState(false);
  const [showAddStartupModal, setShowAddStartupModal] = useState(false);
  const [editingAddedStartup, setEditingAddedStartup] = useState<AdvisorAddedStartup | null>(null);
  const [addStartupFormData, setAddStartupFormData] = useState<CreateAdvisorAddedStartup>({
    advisor_id: currentUser?.id || '',
    startup_name: '',
    sector: '',
    website_url: '',
    linkedin_url: '',
    contact_email: '',
    contact_name: '',
    contact_number: '',
    description: '',
    current_valuation: undefined,
    investment_amount: undefined,
    equity_percentage: undefined,
    investment_date: undefined,
    currency: 'USD',
    domain: '',
    stage: '',
    round_type: '',
    country: '',
    notes: ''
  });

  // Dropdown options state
  const [countries, setCountries] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [investmentStages, setInvestmentStages] = useState<string[]>([]);
  const [loadingInvestmentStages, setLoadingInvestmentStages] = useState(false);
  const [domains, setDomains] = useState<string[]>([]);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [stages, setStages] = useState<string[]>([]);
  const [loadingStages, setLoadingStages] = useState(false);
  const [firmTypes, setFirmTypes] = useState<string[]>([]);
  const [loadingFirmTypes, setLoadingFirmTypes] = useState(false);
  const [sectors, setSectors] = useState<string[]>([]);
  const [loadingSectors, setLoadingSectors] = useState(false);
  const [roundTypes, setRoundTypes] = useState<string[]>([]);
  const [loadingRoundTypes, setLoadingRoundTypes] = useState(false);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);

  // Get the investment advisor's currency
  const advisorCurrency = useInvestmentAdvisorCurrency(currentUser);

  // Load advisor-added investors
  useEffect(() => {
    const loadAdvisorAddedInvestors = async () => {
      if ((activeTab === 'myInvestors' || (activeTab === 'management' && managementSubTab === 'myInvestors')) && currentUser?.id) {
        setLoadingAddedInvestors(true);
        try {
          const investors = await advisorAddedInvestorService.getInvestorsByAdvisor(currentUser.id);
          setAdvisorAddedInvestors(investors);
        } catch (error) {
          console.error('Error loading advisor-added investors:', error);
        } finally {
          setLoadingAddedInvestors(false);
        }
      }
    };
    loadAdvisorAddedInvestors();
  }, [activeTab, currentUser?.id]);

  // Load advisor-added startups
  useEffect(() => {
    const loadAdvisorAddedStartups = async () => {
      if ((activeTab === 'myStartups' || (activeTab === 'management' && managementSubTab === 'myStartups')) && currentUser?.id) {
        setLoadingAddedStartups(true);
        try {
          const startups = await advisorAddedStartupService.getStartupsByAdvisor(currentUser.id);
          setAdvisorAddedStartups(startups);
        } catch (error) {
          console.error('Error loading advisor-added startups:', error);
        } finally {
          setLoadingAddedStartups(false);
        }
      }
    };
    loadAdvisorAddedStartups();
  }, [activeTab, currentUser?.id]);

  // Load accepted collaborators (needed for recommendation modal)
  useEffect(() => {
    const loadAcceptedCollaborators = async () => {
      if (currentUser?.id) {
        try {
          const requests = await advisorConnectionRequestService.getCollaboratorRequests(currentUser.id);
          setAcceptedCollaborators(requests.filter(r => r.status === 'accepted'));
        } catch (error) {
          console.error('Error loading accepted collaborators:', error);
        }
      }
    };
    loadAcceptedCollaborators();
  }, [currentUser?.id]);

  // Load pending collaboration requests (only when on collaboration tab)
  useEffect(() => {
    const loadPendingCollaborationRequests = async () => {
      if (activeTab === 'collaboration' && currentUser?.id) {
        setLoadingCollaborationRequests(true);
        try {
          const requests = await advisorConnectionRequestService.getCollaboratorRequests(currentUser.id);
          setCollaborationRequests(requests.filter(r => r.status === 'pending'));
        } catch (error) {
          console.error('Error loading collaboration requests:', error);
        } finally {
          setLoadingCollaborationRequests(false);
        }
      }
    };
    loadPendingCollaborationRequests();
  }, [activeTab, currentUser?.id]);

  // Load collaborator profiles with full data
  useEffect(() => {
    const loadProfiles = async () => {
      if (collaborationRequests.length === 0 && acceptedCollaborators.length === 0) return;
      
      const allRequests = [...collaborationRequests, ...acceptedCollaborators];
      const profiles: {[key: string]: any} = {};
      
      for (const request of allRequests) {
        if (!request.requester_id || profiles[request.requester_id]) continue;
        
        try {
          if (request.requester_type === 'Investor') {
            const { data } = await supabase
              .from('investor_profiles')
              .select('*')
              .eq('user_id', request.requester_id)
              .maybeSingle();
            if (data) {
              // Get user data
              const requesterUser = users.find(u => u.id === request.requester_id);
              profiles[request.requester_id] = {
                ...data,
                user: requesterUser ? { name: requesterUser.name, email: requesterUser.email } : undefined
              };
            }
          } else if (request.requester_type === 'Investment Advisor') {
            const { data } = await supabase
              .from('investment_advisor_profiles')
              .select('*')
              .eq('user_id', request.requester_id)
              .maybeSingle();
            if (data) {
              const requesterUser = users.find(u => u.id === request.requester_id);
              profiles[request.requester_id] = {
                ...data,
                user: requesterUser ? { name: requesterUser.name, email: requesterUser.email } : undefined
              };
            }
          } else if (request.requester_type === 'Mentor') {
            const { data } = await supabase
              .from('mentor_profiles')
              .select('*')
              .eq('user_id', request.requester_id)
              .maybeSingle();
            if (data) {
              const requesterUser = users.find(u => u.id === request.requester_id);
              profiles[request.requester_id] = {
                ...data,
                user: requesterUser ? { name: requesterUser.name, email: requesterUser.email } : undefined
              };
            }
          }
        } catch (error) {
          console.error(`Error loading profile for ${request.requester_id}:`, error);
        }
      }
      
      setCollaboratorProfiles(profiles);
    };
    
    loadProfiles();
  }, [collaborationRequests, acceptedCollaborators, users]);

  // Load mandates and filter options
  useEffect(() => {
    const loadMandateData = async () => {
      if (activeTab === 'mandate' && currentUser?.id) {
        setIsLoadingMandates(true);
        setIsLoadingMandateFilters(true);
        try {
          // Load mandates
          const mandatesData = await advisorMandateService.getMandatesByAdvisor(currentUser.id);
          setMandates(mandatesData);
          
          // Select first mandate if available
          if (mandatesData.length > 0 && !selectedMandateId) {
            setSelectedMandateId(mandatesData[0].id);
          }
          
          // Load filter options
          const [stagesData, roundTypesData, domainsData] = await Promise.all([
            generalDataService.getItemsByCategory('stage'),
            generalDataService.getItemsByCategory('round_type'),
            generalDataService.getItemsByCategory('domain')
          ]);
          
          setMandateFilterOptions({
            stages: stagesData.map(s => s.name),
            roundTypes: roundTypesData.map(r => r.name),
            domains: domainsData.map(d => d.name)
          });
        } catch (error) {
          console.error('Error loading mandate data:', error);
        } finally {
          setIsLoadingMandates(false);
          setIsLoadingMandateFilters(false);
        }
      }
    };
    
    loadMandateData();
  }, [activeTab, currentUser?.id]);

  // Load mandates when component mounts (for mandate tab)
  useEffect(() => {
    if (currentUser?.id && activeTab === 'mandate') {
      const loadMandates = async () => {
        const mandatesData = await advisorMandateService.getMandatesByAdvisor(currentUser.id!);
        setMandates(mandatesData);
        if (mandatesData.length > 0 && !selectedMandateId) {
          setSelectedMandateId(mandatesData[0].id);
        }
      };
      loadMandates();
    }
  }, [currentUser?.id, activeTab]);

  // Load countries and investment stages for dropdowns
  useEffect(() => {
    const loadDropdownData = async () => {
      if (showAddInvestorModal) {
        // Load countries
        setLoadingCountries(true);
        try {
          const countryData = await generalDataService.getItemsByCategory('country');
          const countryNames = countryData.map(country => country.name);
          setCountries(countryNames);
        } catch (error) {
          console.error('Error loading countries:', error);
          setCountries(['India', 'USA', 'UK', 'Singapore', 'UAE', 'Germany', 'France', 'Canada', 'Australia', 'Japan', 'China', 'Other']);
        } finally {
          setLoadingCountries(false);
        }

        // Load investment stages (round_type)
        setLoadingInvestmentStages(true);
        try {
          const stageData = await generalDataService.getItemsByCategory('round_type');
          const stageNames = stageData.map(stage => stage.name);
          setInvestmentStages(stageNames);
        } catch (error) {
          console.error('Error loading investment stages:', error);
          setInvestmentStages(['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'Bridge', 'Growth']);
        } finally {
          setLoadingInvestmentStages(false);
        }

        // Load domains
        setLoadingDomains(true);
        try {
          const domainData = await generalDataService.getItemsByCategory('domain');
          const domainNames = domainData.map(domain => domain.name);
          setDomains(domainNames);
        } catch (error) {
          console.error('Error loading domains:', error);
          setDomains(['Agriculture', 'AI', 'Climate', 'Consumer Goods', 'Defence', 'E-commerce', 'Education', 'EV', 'Finance', 'Food & Beverage', 'Healthcare', 'Manufacturing', 'Media & Entertainment', 'Others', 'PaaS', 'Renewable Energy', 'Retail', 'SaaS', 'Social Impact', 'Space', 'Transportation and Logistics', 'Waste Management', 'Web 3.0']);
        } finally {
          setLoadingDomains(false);
        }

        // Load stages (stage category)
        setLoadingStages(true);
        try {
          const stageData = await generalDataService.getItemsByCategory('stage');
          const stageNames = stageData.map(stage => stage.name);
          setStages(stageNames);
        } catch (error) {
          console.error('Error loading stages:', error);
          setStages(['Idea', 'MVP', 'Early Stage', 'Growth', 'Mature']);
        } finally {
          setLoadingStages(false);
        }

        // Load firm types
        setLoadingFirmTypes(true);
        try {
          const firmTypeData = await generalDataService.getItemsByCategory('firm_type');
          const firmTypeNames = firmTypeData.map(firmType => firmType.name);
          setFirmTypes(firmTypeNames);
        } catch (error) {
          console.error('Error loading firm types:', error);
          setFirmTypes(['VC', 'Angel Investor', 'Corporate VC', 'Family Office', 'PE Firm', 'Government', 'Other']);
        } finally {
          setLoadingFirmTypes(false);
        }
      }
    };
    loadDropdownData();
  }, [showAddInvestorModal]);

  // Handle add investor
  const handleAddInvestor = () => {
    setEditingAddedInvestor(null);
    setAddInvestorFormData({
      advisor_id: currentUser?.id || '',
      investor_name: '',
      email: '',
      contact_number: '',
      website: '',
      linkedin_url: '',
      firm_type: '',
      location: '',
      investment_focus: '',
      domain: '',
      stage: '',
      notes: ''
    });
    setShowAddInvestorModal(true);
  };

  // Handle edit added investor
  const handleEditAddedInvestor = (investor: AdvisorAddedInvestor) => {
    setEditingAddedInvestor(investor);
    setAddInvestorFormData({
      advisor_id: investor.advisor_id,
      investor_name: investor.investor_name,
      email: investor.email,
      contact_number: investor.contact_number || '',
      website: investor.website || '',
      linkedin_url: investor.linkedin_url || '',
      firm_type: investor.firm_type || '',
      location: investor.location || '',
      investment_focus: investor.investment_focus || '',
      domain: investor.domain || '',
      stage: investor.stage || '',
      notes: investor.notes || ''
    });
    setShowAddInvestorModal(true);
  };

  const handleRejectRequest = async (request: any) => {
    if (request.type === 'startup') {
      try {
        await supabase
          .from('users')
          .update({ advisor_accepted: false })
          .eq('id', request.user_id || request.id);
      } catch (error) {
        console.error('Error rejecting startup request', error);
      }
    } else if (request.type === 'investor') {
      try {
        await supabase
          .from('users')
          .update({ advisor_accepted: false })
          .eq('id', request.id);
      } catch (error) {
        console.error('Error rejecting investor request', error);
      }
    }
  };

  const handleViewRequest = (request: any) => {
    if (request.type === 'startup') {
      const startupId = request.id;
      if (startupId) {
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('view', 'startup');
        url.searchParams.set('startupId', String(startupId));
        window.open(url.toString(), '_blank');
      }
    } else if (request.type === 'investor') {
      const investorUserId = request.user_id || request.id;
      if (investorUserId) {
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('view', 'investor');
        url.searchParams.set('userId', String(investorUserId));
        window.open(url.toString(), '_blank');
      }
    }
  };

  // Handle save added investor
  const handleSaveAddedInvestor = async () => {
    if (!addInvestorFormData.investor_name || !addInvestorFormData.email) {
      alert('Please fill in investor name and email');
      return;
    }

    setIsLoading(true);
    try {
      if (editingAddedInvestor) {
        // Update existing
        const updated = await advisorAddedInvestorService.updateInvestor(editingAddedInvestor.id, addInvestorFormData);
        if (updated) {
          setAdvisorAddedInvestors(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
          alert('Investor updated successfully!');
        } else {
          alert('Failed to update investor');
        }
      } else {
        // Create new
        const created = await advisorAddedInvestorService.createInvestor(addInvestorFormData);
        if (created) {
          setAdvisorAddedInvestors(prev => [created, ...prev]);
          alert('Investor added successfully!');
        } else {
          alert('Failed to add investor');
        }
      }
      setShowAddInvestorModal(false);
      setEditingAddedInvestor(null);
    } catch (error) {
      console.error('Error saving investor:', error);
      alert('Failed to save investor');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete added investor
  const handleDeleteAddedInvestor = async (investorId: number) => {
    if (!confirm('Are you sure you want to delete this investor?')) {
      return;
    }

    setIsLoading(true);
    try {
      const success = await advisorAddedInvestorService.deleteInvestor(investorId);
      if (success) {
        setAdvisorAddedInvestors(prev => prev.filter(inv => inv.id !== investorId));
        alert('Investor deleted successfully!');
      } else {
        alert('Failed to delete investor');
      }
    } catch (error) {
      console.error('Error deleting investor:', error);
      alert('Failed to delete investor');
    } finally {
      setIsLoading(false);
    }
  };

  // Load dropdown data for startup modal
  useEffect(() => {
    const loadStartupDropdownData = async () => {
      if (showAddStartupModal) {
        // Load sectors
        setLoadingSectors(true);
        try {
          const sectorData = await generalDataService.getItemsByCategory('sector');
          const sectorNames = sectorData.map(sector => sector.name);
          setSectors(sectorNames);
        } catch (error) {
          console.error('Error loading sectors:', error);
          setSectors(['Agriculture', 'AI', 'Climate', 'Consumer Goods', 'Defence', 'E-commerce', 'Education', 'EV', 'Finance', 'Food & Beverage', 'Healthcare', 'Manufacturing', 'Media & Entertainment', 'Others', 'PaaS', 'Renewable Energy', 'Retail', 'SaaS', 'Social Impact', 'Space', 'Transportation and Logistics', 'Waste Management', 'Web 3.0']);
        } finally {
          setLoadingSectors(false);
        }

        // Load countries
        setLoadingCountries(true);
        try {
          const countryData = await generalDataService.getItemsByCategory('country');
          const countryNames = countryData.map(country => country.name);
          setCountries(countryNames);
        } catch (error) {
          console.error('Error loading countries:', error);
          setCountries(['India', 'USA', 'UK', 'Singapore', 'UAE', 'Germany', 'France', 'Canada', 'Australia', 'Japan', 'China', 'Other']);
        } finally {
          setLoadingCountries(false);
        }

        // Load domains
        setLoadingDomains(true);
        try {
          const domainData = await generalDataService.getItemsByCategory('domain');
          const domainNames = domainData.map(domain => domain.name);
          setDomains(domainNames);
        } catch (error) {
          console.error('Error loading domains:', error);
          setDomains(['Agriculture', 'AI', 'Climate', 'Consumer Goods', 'Defence', 'E-commerce', 'Education', 'EV', 'Finance', 'Food & Beverage', 'Healthcare', 'Manufacturing', 'Media & Entertainment', 'Others', 'PaaS', 'Renewable Energy', 'Retail', 'SaaS', 'Social Impact', 'Space', 'Transportation and Logistics', 'Waste Management', 'Web 3.0']);
        } finally {
          setLoadingDomains(false);
        }

        // Load stages
        setLoadingStages(true);
        try {
          const stageData = await generalDataService.getItemsByCategory('stage');
          const stageNames = stageData.map(stage => stage.name);
          setStages(stageNames);
        } catch (error) {
          console.error('Error loading stages:', error);
          setStages(['Idea', 'MVP', 'Early Stage', 'Growth', 'Mature']);
        } finally {
          setLoadingStages(false);
        }

        // Load round types
        setLoadingRoundTypes(true);
        try {
          const roundTypeData = await generalDataService.getItemsByCategory('round_type');
          const roundTypeNames = roundTypeData.map(roundType => roundType.name);
          setRoundTypes(roundTypeNames);
        } catch (error) {
          console.error('Error loading round types:', error);
          setRoundTypes(['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'Bridge', 'Growth']);
        } finally {
          setLoadingRoundTypes(false);
        }

        // Load currencies
        setLoadingCurrencies(true);
        try {
          const currencyData = await generalDataService.getItemsByCategory('currency');
          const currencyNames = currencyData.map(currency => currency.name);
          setCurrencies(currencyNames);
        } catch (error) {
          console.error('Error loading currencies:', error);
          setCurrencies(['USD', 'INR', 'EUR', 'GBP', 'SGD', 'AED', 'JPY', 'CNY', 'AUD', 'CAD']);
        } finally {
          setLoadingCurrencies(false);
        }
      }
    };
    loadStartupDropdownData();
  }, [showAddStartupModal]);

  // Handle add startup
  const handleAddStartup = () => {
    setEditingAddedStartup(null);
    setAddStartupFormData({
      advisor_id: currentUser?.id || '',
      startup_name: '',
      sector: '',
      website_url: '',
      linkedin_url: '',
      contact_email: '',
      contact_name: '',
      contact_number: '',
      description: '',
      current_valuation: undefined,
      investment_amount: undefined,
      equity_percentage: undefined,
      investment_date: undefined,
      currency: 'USD',
      domain: '',
      stage: '',
      round_type: '',
      country: '',
      notes: ''
    });
    setShowAddStartupModal(true);
  };

  // Handle edit added startup
  const handleEditAddedStartup = (startup: AdvisorAddedStartup) => {
    setEditingAddedStartup(startup);
    setAddStartupFormData({
      advisor_id: startup.advisor_id,
      startup_name: startup.startup_name,
      sector: startup.sector || '',
      website_url: startup.website_url || '',
      linkedin_url: startup.linkedin_url || '',
      contact_email: startup.contact_email,
      contact_name: startup.contact_name,
      contact_number: startup.contact_number || '',
      description: startup.description || '',
      current_valuation: startup.current_valuation,
      investment_amount: startup.investment_amount,
      equity_percentage: startup.equity_percentage,
      investment_date: startup.investment_date,
      currency: startup.currency || 'USD',
      domain: startup.domain || '',
      stage: startup.stage || '',
      round_type: startup.round_type || '',
      country: startup.country || '',
      notes: startup.notes || ''
    });
    setShowAddStartupModal(true);
  };

  // Handle save added startup
  const handleSaveAddedStartup = async () => {
    if (!addStartupFormData.startup_name || !addStartupFormData.contact_email || !addStartupFormData.contact_name) {
      alert('Please fill in startup name, contact name, and contact email');
      return;
    }

    setIsLoading(true);
    try {
      if (editingAddedStartup) {
        // Update existing
        const updated = await advisorAddedStartupService.updateStartup(editingAddedStartup.id, addStartupFormData);
        if (updated) {
          setAdvisorAddedStartups(prev => prev.map(s => s.id === updated.id ? updated : s));
          alert('Startup updated successfully!');
        } else {
          alert('Failed to update startup');
        }
      } else {
        // Create new
        const created = await advisorAddedStartupService.createStartup(addStartupFormData);
        if (created) {
          setAdvisorAddedStartups(prev => [created, ...prev]);
          alert('Startup added successfully!');
        } else {
          alert('Failed to add startup');
        }
      }
      setShowAddStartupModal(false);
      setEditingAddedStartup(null);
    } catch (error) {
      console.error('Error saving startup:', error);
      alert('Failed to save startup');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete added startup
  const handleDeleteAddedStartup = async (startupId: number) => {
    if (!confirm('Are you sure you want to delete this startup?')) {
      return;
    }

    setIsLoading(true);
    try {
      const success = await advisorAddedStartupService.deleteStartup(startupId);
      if (success) {
        setAdvisorAddedStartups(prev => prev.filter(s => s.id !== startupId));
        alert('Startup deleted successfully!');
      } else {
        alert('Failed to delete startup');
      }
    } catch (error) {
      console.error('Error deleting startup:', error);
      alert('Failed to delete startup');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle send invite to TMS for advisor-added startups
  const handleSendInviteToTMS = async (startupId: number) => {
    setIsLoading(true);
    try {
      const success = await advisorAddedStartupService.sendInviteToTMS(startupId);
      if (success) {
        setAdvisorAddedStartups(prev =>
          prev.map(s =>
            s.id === startupId
              ? { ...s, invite_status: 'sent', invite_sent_at: new Date().toISOString() }
              : s
          )
        );
        alert('Invite sent successfully!');
      } else {
        alert('Failed to send invite');
      }
    } catch (error) {
      console.error('Error sending invite to TMS:', error);
      alert('Failed to send invite');
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication health on component mount
  useEffect(() => {
    const checkAuthHealth = async () => {
      try {
        const isAuth = await authService.isAuthenticated();
        if (!isAuth) {
          console.warn('Authentication health check failed - user may need to re-login');
          setNotifications(prev => [...prev, {
            id: Date.now().toString(),
            message: 'Authentication session expired. Please refresh the page or re-login.',
            type: 'warning',
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        console.error('Auth health check error:', error);
      }
    };
    
    checkAuthHealth();
  }, []);

  // Fetch active fundraising startups for Discovery tab, Investment Interests tab, and Mandate tab
  useEffect(() => {
    const loadActiveFundraisingStartups = async () => {
      if (activeTab === 'discovery' || activeTab === 'interests' || activeTab === 'mandate') {
        setIsLoadingPitches(true);
        try {
          const startups = await investorService.getActiveFundraisingStartups();
          setActiveFundraisingStartups(startups);
        } catch (error) {
          console.error('Error loading active fundraising startups:', error);
          // Set empty array on error to prevent UI issues
          setActiveFundraisingStartups([]);
        } finally {
          setIsLoadingPitches(false);
        }
      }
    };

    loadActiveFundraisingStartups();
  }, [activeTab]);

  // Load investment advisor's own favorites from database
  useEffect(() => {
    const loadFavorites = async () => {
      if (!currentUser?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('investor_favorites')
          .select('startup_id')
          .eq('investor_id', currentUser.id);
        
        if (error) {
          // If table doesn't exist yet, silently fail (table will be created by SQL script)
          if (error.code !== 'PGRST116') {
            console.error('Error loading favorites:', error);
          }
          return;
        }
        
        if (data) {
          const favoriteIds = new Set(data.map((fav: any) => fav.startup_id));
          setFavoritedPitches(favoriteIds);
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    };

    loadFavorites();
  }, [currentUser?.id]);

  useEffect(() => {
    const loadDueDiligenceAccess = async () => {
      if (!currentUser?.id) {
        setDueDiligenceStartups(new Set<number>());
        return;
      }
      try {
        const { data, error } = await supabase
          .from('due_diligence_requests')
          .select('startup_id, status')
          .eq('user_id', currentUser.id)
          .in('status', ['pending', 'completed']);
        if (error) throw error;

        const allIds = new Set<number>();
        const approvedIds = new Set<number>();
        (data || []).forEach(record => {
          const startupId = Number(record.startup_id);
          if (!Number.isNaN(startupId)) {
            allIds.add(startupId);
            if (record.status === 'completed') {
              approvedIds.add(startupId);
            }
          }
        });
        setDueDiligenceStartups(allIds);
        setApprovedDueDiligenceStartups(approvedIds);
      } catch (error) {
        console.error('Error loading due diligence access:', error);
        setDueDiligenceStartups(new Set<number>());
        setApprovedDueDiligenceStartups(new Set<number>());
      }
    };

    loadDueDiligenceAccess();
  }, [currentUser?.id]);

  // Shuffle pitches when discovery tab is active
  useEffect(() => {
    if (activeTab === 'discovery' && activeFundraisingStartups.length > 0) {
      const verified = activeFundraisingStartups.filter(startup => 
        startup.complianceStatus === ComplianceStatus.Compliant
      );
      const unverified = activeFundraisingStartups.filter(startup => 
        startup.complianceStatus !== ComplianceStatus.Compliant
      );

      const shuffleArray = (array: ActiveFundraisingStartup[]): ActiveFundraisingStartup[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };

      // Mix verified and unverified startups
      const shuffledVerified = shuffleArray(verified);
      const shuffledUnverified = shuffleArray(unverified);
      const mixed = [...shuffledVerified, ...shuffledUnverified];
      
      setShuffledPitches(mixed);
    }
  }, [activeTab, activeFundraisingStartups]);

  const advisorCode = useMemo(() => {
    const trimmed = currentUser?.investment_advisor_code?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  }, [currentUser?.investment_advisor_code]);

  // Get pending startup requests - FIXED VERSION
  const pendingStartupRequests = useMemo(() => {
    // Strict validation: advisorCode must be a non-empty string
    if (!advisorCode || typeof advisorCode !== 'string' || advisorCode.trim() === '' || !startups || !Array.isArray(startups) || !users || !Array.isArray(users)) {
      return [];
    }

    // Find startups whose users have entered the investment advisor code but haven't been accepted
    const pendingStartups = startups.filter(startup => {
      // Find the user who owns this startup
      const startupUser = users.find(user => 
        user.role === 'Startup' && 
        user.id === startup.user_id
      );
      
      if (!startupUser) {
        return false;
      }

      const enteredCode = (startupUser as any).investment_advisor_code_entered;
      
      // CRITICAL FIX: Only match if enteredCode is a non-empty string that exactly matches advisorCode
      // This prevents null, undefined, empty string, or random values from matching
      if (!enteredCode || typeof enteredCode !== 'string' || enteredCode.trim() === '') {
        return false;
      }

      // Check if this user has entered the investment advisor code
      const hasEnteredCode = enteredCode.trim() === advisorCode.trim();
      const isNotAccepted = !(startupUser as any).advisor_accepted;

      return hasEnteredCode && isNotAccepted;
    });

    return pendingStartups;
  }, [advisorCode, startups, users]);

  // Get pending investor requests - FIXED VERSION
  const pendingInvestorRequests = useMemo(() => {
    // Strict validation: advisorCode must be a non-empty string
    if (!advisorCode || typeof advisorCode !== 'string' || advisorCode.trim() === '' || !users || !Array.isArray(users)) {
      return [];
    }

    // Find investors who have entered the investment advisor code but haven't been accepted
    // CRITICAL: Only match if investment_advisor_code_entered is explicitly set and matches exactly
    const pendingInvestors = users.filter(user => {
      // Must be an investor
      if (user.role !== 'Investor') {
        return false;
      }

      const enteredCode = (user as any).investment_advisor_code_entered;
      
      // CRITICAL FIX: Only match if enteredCode is a non-empty string that exactly matches advisorCode
      // This prevents null, undefined, empty string, or random values from matching
      if (!enteredCode || typeof enteredCode !== 'string' || enteredCode.trim() === '') {
        return false;
      }

      const hasEnteredCode = enteredCode.trim() === advisorCode.trim();
      const isNotAccepted = !(user as any).advisor_accepted;

      return hasEnteredCode && isNotAccepted;
    });

    return pendingInvestors;
  }, [advisorCode, users]);

  const [viewingRequest, setViewingRequest] = useState<any | null>(null);
  // Get accepted startups - FIXED VERSION
  const myStartups = useMemo(() => {
    // Strict validation: advisorCode must be a non-empty string
    if (!advisorCode || typeof advisorCode !== 'string' || advisorCode.trim() === '' || !startups || !Array.isArray(startups) || !users || !Array.isArray(users)) {
      return [];
    }

    // Find startups whose users have entered the investment advisor code and have been accepted
    const acceptedStartups = startups.filter(startup => {
      // Find the user who owns this startup
      const startupUser = users.find(user => 
        user.role === 'Startup' && 
        user.id === startup.user_id
      );
      
      if (!startupUser) {
        return false;
      }

      const enteredCode = (startupUser as any).investment_advisor_code_entered;
      
      // CRITICAL FIX: Only match if enteredCode is a non-empty string that exactly matches advisorCode
      if (!enteredCode || typeof enteredCode !== 'string' || enteredCode.trim() === '') {
        return false;
      }

      // Check if this user has entered the investment advisor code and has been accepted
      const hasEnteredCode = enteredCode.trim() === advisorCode.trim();
      const isAccepted = (startupUser as any).advisor_accepted === true;

      return hasEnteredCode && isAccepted;
    });

    return acceptedStartups;
  }, [advisorCode, startups, users]);

  // Get accepted investors - FIXED VERSION
  // Includes: 1) Investors who entered advisor code and were accepted, 2) Investors who connected via connection requests
  const myInvestors = useMemo(() => {
    if (!users || !Array.isArray(users)) {
      return [];
    }

    const investorSet = new Set<string>(); // Track unique investor IDs
    const allInvestors: any[] = [];

    // 1. Find investors who have entered the investment advisor code AND have been accepted
    if (advisorCode && typeof advisorCode === 'string' && advisorCode.trim() !== '') {
      const codeEnteredInvestors = users.filter(user => {
        // Must be an investor
        if (user.role !== 'Investor') {
          return false;
        }

        const enteredCode = (user as any).investment_advisor_code_entered;
        
        // Only match if enteredCode is a non-empty string that exactly matches advisorCode
        if (!enteredCode || typeof enteredCode !== 'string' || enteredCode.trim() === '') {
          return false;
        }

        const hasEnteredCode = enteredCode.trim() === advisorCode.trim();
        const isAccepted = (user as any).advisor_accepted === true;

        return hasEnteredCode && isAccepted; // Only include investors who have been accepted
      });

      codeEnteredInvestors.forEach(investor => {
        if (!investorSet.has(investor.id)) {
          investorSet.add(investor.id);
          allInvestors.push(investor);
        }
      });
    }

    // 2. Find investors who connected via connection requests (accepted collaborators)
    const connectedInvestors = acceptedCollaborators
      .filter(request => request.requester_type === 'Investor' && request.status === 'accepted')
      .map(request => {
        // Find the user object for this investor
        return users.find(user => user.id === request.requester_id && user.role === 'Investor');
      })
      .filter((investor): investor is any => investor !== undefined);

    connectedInvestors.forEach(investor => {
      if (!investorSet.has(investor.id)) {
        investorSet.add(investor.id);
        allInvestors.push(investor);
      }
    });

    return allInvestors;
  }, [advisorCode, users, acceptedCollaborators]);

  // Create serviceRequests - Startups (Pitch) + Investors (manual code entry from dashboard)
  // Note: Investors clicking "Connect" button go to Collaboration tab via advisor_connection_requests
  // But investors manually entering code from dashboard still go to Service Requests
  const serviceRequests = useMemo(() => {
    if (!advisorCode) {
      return [];
    }

    const startupRequests = pendingStartupRequests.map(startup => {
      const startupUser = users.find(user => user.id === startup.user_id);
      return {
        id: startup.id,
        user_id: startup.user_id,
        name: startup.name,
        email: startupUser?.email || '',
        type: 'startup',
        created_at: startup.created_at || new Date().toISOString()
      };
    });

    // Include investors who manually entered code from their dashboard
    const investorRequests = pendingInvestorRequests.map(user => ({
      id: user.id,
      user_id: user.id,
      name: user.name,
      email: user.email,
      type: 'investor',
      created_at: user.created_at || new Date().toISOString()
    }));

    const allRequests = [...startupRequests, ...investorRequests];

    return allRequests;
  }, [advisorCode, pendingStartupRequests, pendingInvestorRequests, users]);

  // Offers Made - Fetch directly from database based on advisor code and stages
  const [offersMade, setOffersMade] = useState<any[]>([]);
  const [loadingOffersMade, setLoadingOffersMade] = useState(false);
  
  // Separate offers into investor offers and startup offers for the "Offers Made" section
  const investorOffersList = useMemo(() => {
    return offersMade.filter(offer => (offer as any).isInvestorOffer);
  }, [offersMade]);
  
  const startupOffersList = useMemo(() => {
    return offersMade.filter(offer => (offer as any).isStartupOffer);
  }, [offersMade]);

  // Computed management metrics for advisor profile
  const computedManagementMetrics = useMemo(() => {
    const startupsUnderManagement = (myStartups?.length || 0) + (advisorAddedStartups?.length || 0);
    const investorsUnderManagement = (myInvestors?.length || 0) + (advisorAddedInvestors?.length || 0);
    const successfulFundraisesStartups = offersMade.filter(offer => (offer as any).stage === 4).length;

    // Verified = on-platform (TMS) only
    const verifiedStartupsUnderManagement = myStartups?.length || 0;
    const verifiedInvestorsUnderManagement = myInvestors?.length || 0;
    const verifiedSuccessfulFundraisesStartups = successfulFundraisesStartups;

    return {
      startupsUnderManagement,
      investorsUnderManagement,
      successfulFundraisesStartups,
      verifiedStartupsUnderManagement,
      verifiedInvestorsUnderManagement,
      verifiedSuccessfulFundraisesStartups
    };
  }, [myStartups, advisorAddedStartups, myInvestors, advisorAddedInvestors, offersMade]);
  
  // Startup fundraising data
  const [startupFundraisingData, setStartupFundraisingData] = useState<{[key: number]: any}>({});

  // Fetch startup fundraising data
  const fetchStartupFundraisingData = async () => {
    if (!myStartups || myStartups.length === 0) return;
    
    try {
      const startupIds = myStartups.map(startup => startup.id);
      
      // Fetch startup data with currency
      const { data: startupsData, error: startupsError } = await supabase
        .from('startups')
        .select('id, currency')
        .in('id', startupIds);

      // Fetch fundraising details for startups
      const { data: fundraisingData, error: fundraisingError } = await supabase
        .from('fundraising_details')
        .select('startup_id, value, equity, type')
        .in('startup_id', startupIds);

      if (fundraisingError) {
        console.error('Error fetching startup fundraising data:', fundraisingError);
        return;
      }

      // Group fundraising data by startup_id and include currency
      const fundraisingMap: {[key: number]: any} = {};
      if (fundraisingData) {
        fundraisingData.forEach(fundraising => {
          const startupData = startupsData?.find(s => s.id === fundraising.startup_id);
          fundraisingMap[fundraising.startup_id] = {
            ...fundraising,
            currency: startupData?.currency || 'USD'
          };
        });
      }

      setStartupFundraisingData(fundraisingMap);
    } catch (error) {
      console.error('Error fetching startup fundraising data:', error);
    }
  };

  // Fetch offers made for this advisor
  const fetchOffersMade = async () => {
    if (!currentUser?.investment_advisor_code) {
      setOffersMade([]);
      return;
    }
    
    setLoadingOffersMade(true);
    try {
      
      // First, fetch regular offers at stages 1, 2, and 4
      const { data: offersData, error: offersError } = await supabase
        .from('investment_offers')
        .select('*')
        .in('stage', [1, 2, 4])
        .order('created_at', { ascending: false });

      if (offersError) {
        console.error('Error fetching regular offers:', offersError);
      }

      // Also fetch co-investment offers that need investor advisor approval
      console.log('🔍 Fetching co-investment offers for advisor:', {
        advisor_code: currentUser?.investment_advisor_code,
        advisor_id: currentUser?.id,
        advisor_role: currentUser?.role
      });
      
      // Fetch all co-investment offers - RLS policy will filter to only show offers for this advisor's clients
      // We filter client-side for offers that need approval
      let finalCoInvestmentData: any[] = [];
      
      // First, check what investors have this advisor's code
      const { data: clientsData, error: clientsError } = await supabase
        .from('users')
        .select('email, name, investment_advisor_code_entered')
        .eq('investment_advisor_code_entered', currentUser?.investment_advisor_code)
        .eq('role', 'Investor');
      
      console.log('🔍 Investors with this advisor code:', clientsData?.length || 0);
      if (clientsData && clientsData.length > 0) {
        console.log('📋 Clients:', clientsData.map((c: any) => ({ email: c.email, name: c.name })));
      } else {
        console.log('⚠️ No investors found with advisor code:', currentUser?.investment_advisor_code);
      }
      
      const { data: coInvestmentOffersData, error: coInvestmentError } = await supabase
        .from('co_investment_offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (coInvestmentError) {
        console.error('❌ Error fetching co-investment offers:', coInvestmentError);
        console.error('Error details:', {
          message: coInvestmentError.message,
          details: coInvestmentError.details,
          hint: coInvestmentError.hint,
          code: coInvestmentError.code
        });
        console.log('💡 Tip: Make sure you have run the SQL migration to add RLS policies for co_investment_offers table');
        console.log('💡 Run CREATE_CO_INVESTMENT_OFFERS_TABLE.sql in Supabase SQL Editor');
      } else {
        console.log('✅ Fetched co-investment offers (before filtering):', coInvestmentOffersData?.length || 0);
        if (coInvestmentOffersData && coInvestmentOffersData.length > 0) {
          console.log('📋 All co-investment offers fetched:', coInvestmentOffersData.map((o: any) => ({
            id: o.id,
            investor_email: o.investor_email,
            status: o.status,
            investor_advisor_approval_status: o.investor_advisor_approval_status,
            startup_name: o.startup_name
          })));
          
          // Filter to show offers that need approval OR have been approved/rejected by this advisor
          // This allows advisors to see their approved/rejected offers for tracking
          finalCoInvestmentData = coInvestmentOffersData.filter((offer: any) => {
            const needsApproval = offer.status === 'pending_investor_advisor_approval' || 
                                 offer.investor_advisor_approval_status === 'pending';
            const wasApproved = offer.investor_advisor_approval_status === 'approved';
            const wasRejected = offer.investor_advisor_approval_status === 'rejected' ||
                               offer.status === 'investor_advisor_rejected';
            // Show if it needs approval OR was approved/rejected by this advisor (for tracking)
            const shouldShow = needsApproval || wasApproved || wasRejected;
            console.log('🔍 Checking offer:', {
              id: offer.id,
              status: offer.status,
              investor_advisor_approval_status: offer.investor_advisor_approval_status,
              needsApproval,
              wasApproved,
              wasRejected,
              shouldShow
            });
            return shouldShow;
          });
          console.log('✅ Co-investment offers needing approval:', finalCoInvestmentData.length);
        } else {
          console.log('⚠️ No co-investment offers found. This could mean:');
          console.log('   1. No co-investment offers exist in the table');
          console.log('   2. RLS policy is blocking access (check if advisor code matches investor advisor code)');
          console.log('   3. All offers have already been approved/rejected');
        }
      }

      // Combine both types of offers
      const allOffersData = [
        ...(offersData || []).map(offer => ({ ...offer, is_co_investment: false })),
        ...finalCoInvestmentData.map(offer => ({ ...offer, is_co_investment: true }))
      ];

      if (allOffersData.length === 0) {
        setOffersMade([]);
        setLoadingOffersMade(false);
        return;
      }

      // Get unique investor emails and startup IDs from all offers
      const investorEmails = [...new Set(allOffersData.map(offer => offer.investor_email))];
      const startupIds = [...new Set(allOffersData.filter(offer => offer.startup_id).map(offer => offer.startup_id))];

      // Fetch investor data
      const { data: investorsData, error: investorsError } = await supabase
        .from('users')
        .select('id, email, name, investment_advisor_code_entered, phone')
        .in('email', investorEmails);

      if (investorsError) {
        console.error('Error fetching investors:', investorsError);
      }

      // Fetch startup data with investment information and currency
      const { data: startupsData, error: startupsError } = await supabase
        .from('startups')
        .select('id, name, investment_advisor_code, currency');
      
      // Fetch fundraising details for startups
      const { data: fundraisingData, error: fundraisingError } = await supabase
        .from('fundraising_details')
        .select('startup_id, value, equity, type')
        .in('startup_id', startupIds);

      if (startupsError) {
        console.error('Error fetching startups:', startupsError);
      }
      
      if (fundraisingError) {
        console.error('Error fetching fundraising details:', fundraisingError);
      }

      // Fetch all advisors data for contact information
      const { data: advisorsData, error: advisorsError } = await supabase
        .from('users')
        .select('id, email, name, investment_advisor_code, phone')
        .not('investment_advisor_code', 'is', null);

      if (advisorsError) {
        console.error('Error fetching advisors:', advisorsError);
      }

      // Try to fetch startup emails by matching startup names with user names
      // This is a fallback approach since startup_id doesn't exist in users table
      const startupNames = [...new Set(allOffersData.map(offer => offer.startup_name))];
      const { data: startupUsersData, error: startupUsersError } = await supabase
        .from('users')
        .select('id, email, name')
        .in('name', startupNames);

      if (startupUsersError) {
        console.error('Error fetching startup users:', startupUsersError);
      }

      // Create lookup maps
      const investorsMap = (investorsData || []).reduce((acc, investor) => {
        acc[investor.email] = investor;
        return acc;
      }, {} as any);

      const startupsMap = (startupsData || []).reduce((acc, startup) => {
        acc[startup.id] = startup;
        return acc;
      }, {} as any);
      
      const fundraisingMap = (fundraisingData || []).reduce((acc, fundraising) => {
        acc[fundraising.startup_id] = fundraising;
        return acc;
      }, {} as any);
      
      const advisorsMap = (advisorsData || []).reduce((acc, advisor) => {
        acc[advisor.investment_advisor_code] = advisor;
        return acc;
      }, {} as any);
      
      const startupUsersMap = (startupUsersData || []).reduce((acc, user) => {
        acc[user.name] = user;
        return acc;
      }, {} as any);
      

      // Filter offers based on advisor relationships and add startup data
      console.log('🔍 Filtering offers. Total offers:', allOffersData.length);
      console.log('🔍 Co-investment offers:', allOffersData.filter(o => o.is_co_investment).length);
      console.log('🔍 Regular offers:', allOffersData.filter(o => !o.is_co_investment).length);
      
      const filteredOffers = allOffersData.filter(offer => {
        const investor = investorsMap[offer.investor_email];
        const startup = offer.startup_id ? startupsMap[offer.startup_id] : null;
        
        // For co-investment offers, check if investor has this advisor
        if (offer.is_co_investment) {
          if (!investor) {
            console.log('⚠️ Co-investment offer skipped - investor not found:', offer.investor_email);
            return false;
          }
          // CRITICAL FIX: Strict validation to prevent random matches
          const enteredCode = investor.investment_advisor_code_entered;
          const advisorCode = currentUser?.investment_advisor_code;
          const investorHasThisAdvisor = advisorCode && 
            enteredCode && 
            typeof enteredCode === 'string' && 
            enteredCode.trim() !== '' && 
            enteredCode.trim() === advisorCode.trim();
          // Show co-investment offers that need approval OR have been approved/rejected by this advisor
          const needsApproval = offer.status === 'pending_investor_advisor_approval' || 
                               offer.investor_advisor_approval_status === 'pending';
          const wasApproved = offer.investor_advisor_approval_status === 'approved';
          const wasRejected = offer.investor_advisor_approval_status === 'rejected' ||
                             offer.status === 'investor_advisor_rejected';
          const shouldShow = investorHasThisAdvisor && (needsApproval || wasApproved || wasRejected);
          
          console.log('🔍 Co-investment offer check:', {
            offerId: offer.id,
            investorEmail: offer.investor_email,
            investorName: investor?.name,
            investorHasAdvisor: investorHasThisAdvisor,
            investorAdvisorCode: investor?.investment_advisor_code_entered,
            currentAdvisorCode: currentUser?.investment_advisor_code,
            needsApproval,
            status: offer.status,
            investor_advisor_approval_status: offer.investor_advisor_approval_status,
            shouldShow
          });
          
          return shouldShow;
        }
        
        // For regular offers, use existing logic
        // Skip offers where we don't have complete data
        if (!investor || !startup) {
          return false;
        }

        const investorHasThisAdvisor = investor.investment_advisor_code_entered === currentUser?.investment_advisor_code;
        const startupHasThisAdvisor = startup.investment_advisor_code === currentUser?.investment_advisor_code;
        
        // Stage 1: Show if investor has this advisor (investor advisor approval needed)
        if (offer.stage === 1 && investorHasThisAdvisor) {
          return true;
        }
        
        // Stage 2: Show if startup has this advisor (startup advisor approval needed)
        if (offer.stage === 2 && startupHasThisAdvisor) {
          return true;
        }
        
        // Stage 4: Show if either investor or startup has this advisor (completed investments)
        if (offer.stage === 4 && (investorHasThisAdvisor || startupHasThisAdvisor)) {
          return true;
        }
        
        return false;
      }).map(offer => {
        const investor = investorsMap[offer.investor_email];
        const startup = offer.startup_id ? startupsMap[offer.startup_id] : null;
        
        const investorHasThisAdvisor = investor?.investment_advisor_code_entered === currentUser?.investment_advisor_code;
        const startupHasThisAdvisor = startup?.investment_advisor_code === currentUser?.investment_advisor_code;
        
        // For co-investment offers, always show in Investor Offers section if investor has this advisor
        const isCoInvestment = !!(offer as any).is_co_investment;
        const isInvestorOfferForCoInvestment = isCoInvestment && investorHasThisAdvisor;
        
        return {
        ...offer,
          investor_name: investor?.name || offer.investor_name || null, // Extract investor name from mapped investor object
        startup: startup || null,
        fundraising: offer.startup_id ? fundraisingMap[offer.startup_id] : null,
          investor: investor,
        startup_user: startupUsersMap[offer.startup_name],
        investor_advisor: advisorsMap[offer.investor_advisor_code],
        startup_advisor: advisorsMap[offer.startup_advisor_code],
        // Mark as co-investment for display
        isCoInvestment: isCoInvestment, // Use camelCase for UI compatibility
        is_co_investment: isCoInvestment, // Keep snake_case for consistency
        // Add flags to identify if this is an investor offer or startup offer
        // Co-investment offers: Always go to Investor Offers if investor has this advisor
        // Regular offers: Stage 1 (investor advisor approval) or Stage 4 where investor has this advisor
        isInvestorOffer: isInvestorOfferForCoInvestment || (investorHasThisAdvisor && (offer.stage === 1 || offer.stage === 4)),
        // Startup offers: Stage 2 (startup advisor approval) or Stage 4 where startup has this advisor (only for regular offers)
        isStartupOffer: !isCoInvestment && startupHasThisAdvisor && (offer.stage === 2 || offer.stage === 4)
        };
      });

      // Now fetch co-investment opportunities for this advisor
      // Stage 1: Lead investor advisor approval needed
      const { data: coInvestmentStage1, error: coInvestmentStage1Error } = await supabase
        .from('co_investment_opportunities')
        .select(`
          *,
          startup:startups!fk_startup_id(id, name, investment_advisor_code, currency),
          listed_by_user:users!fk_listed_by_user_id(id, name, email, investment_advisor_code_entered)
        `)
        .eq('status', 'active')
        .eq('stage', 1)
        .eq('lead_investor_advisor_approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (coInvestmentStage1Error) {
        console.error('Error fetching Stage 1 co-investment opportunities:', coInvestmentStage1Error);
      }

      // Stage 2: Startup advisor approval needed
      const { data: coInvestmentStage2, error: coInvestmentStage2Error } = await supabase
        .from('co_investment_opportunities')
        .select(`
          *,
          startup:startups!fk_startup_id(id, name, investment_advisor_code, currency),
          listed_by_user:users!fk_listed_by_user_id(id, name, email)
        `)
        .eq('status', 'active')
        .eq('stage', 2)
        .eq('startup_advisor_approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (coInvestmentStage2Error) {
        console.error('Error fetching Stage 2 co-investment opportunities:', coInvestmentStage2Error);
      }

      // Filter and format co-investment opportunities
      const coInvestmentOffers: any[] = [];

      // Stage 1 co-investments: Filter by lead investor advisor code
      if (coInvestmentStage1) {
        const filteredStage1 = coInvestmentStage1.filter((opp: any) => {
          const leadInvestorCode = opp.listed_by_user?.investment_advisor_code_entered;
          return leadInvestorCode === currentUser?.investment_advisor_code;
        });

        filteredStage1.forEach((opp: any) => {
          const startup = opp.startup;
          const leadInvestor = opp.listed_by_user;
          
          // Format as an "offer" object similar to investment offers
          coInvestmentOffers.push({
            id: `co_inv_${opp.id}`, // Unique ID to avoid conflicts
            co_investment_id: opp.id,
            startup_id: opp.startup_id,
            startup_name: startup?.name || 'Unknown Startup',
            investor_name: leadInvestor?.name || 'Unknown Investor',
            investor_email: leadInvestor?.email || null,
            offer_amount: opp.investment_amount,
            equity_percentage: opp.equity_percentage,
            currency: startup?.currency || 'USD',
            created_at: opp.created_at,
            stage: opp.stage,
            lead_investor_advisor_approval_status: opp.lead_investor_advisor_approval_status,
            startup_advisor_approval_status: opp.startup_advisor_approval_status,
            startup_approval_status: opp.startup_approval_status,
            // Mark as co-investment
            isCoInvestment: true,
            isInvestorOffer: true, // Stage 1 co-investments go to Investor Offers
            isStartupOffer: false,
            // Add startup and investor data
            startup: startup,
            investor: leadInvestor,
            // Co-investment specific fields
            minimum_co_investment: opp.minimum_co_investment,
            maximum_co_investment: opp.maximum_co_investment,
            description: opp.description,
            listed_by_user_id: opp.listed_by_user_id
          });
        });
      }

      // Stage 2 co-investments: Filter by startup advisor code
      if (coInvestmentStage2) {
        const filteredStage2 = coInvestmentStage2.filter((opp: any) => {
          const startup = opp.startup;
          return startup?.investment_advisor_code === currentUser?.investment_advisor_code;
        });

        filteredStage2.forEach((opp: any) => {
          const startup = opp.startup;
          const leadInvestor = opp.listed_by_user;
          
          // Format as an "offer" object similar to investment offers
          coInvestmentOffers.push({
            id: `co_inv_${opp.id}`, // Unique ID to avoid conflicts
            co_investment_id: opp.id,
            startup_id: opp.startup_id,
            startup_name: startup?.name || 'Unknown Startup',
            investor_name: leadInvestor?.name || 'Unknown Investor',
            investor_email: leadInvestor?.email || null,
            offer_amount: opp.investment_amount,
            equity_percentage: opp.equity_percentage,
            currency: startup?.currency || 'USD',
            created_at: opp.created_at,
            stage: opp.stage,
            lead_investor_advisor_approval_status: opp.lead_investor_advisor_approval_status,
            startup_advisor_approval_status: opp.startup_advisor_approval_status,
            startup_approval_status: opp.startup_approval_status,
            // Mark as co-investment
            isCoInvestment: true,
            isInvestorOffer: false,
            isStartupOffer: true, // Stage 2 co-investments go to Startup Offers
            // Add startup and investor data
            startup: startup,
            investor: leadInvestor,
            // Co-investment specific fields
            minimum_co_investment: opp.minimum_co_investment,
            maximum_co_investment: opp.maximum_co_investment,
            description: opp.description,
            listed_by_user_id: opp.listed_by_user_id
          });
        });
      }

      // Combine regular offers and co-investment opportunities
      const allOffers = [...filteredOffers, ...coInvestmentOffers];

      // Set the properly filtered offers (no debugging fallback)
      setOffersMade(allOffers);
      
    } catch (error) {
      console.error('Error in fetchOffersMade:', error);
    } finally {
      setLoadingOffersMade(false);
    }
  };

  // Fetch offers made when component mounts or advisor code changes
  useEffect(() => {
    fetchOffersMade();
  }, [currentUser?.investment_advisor_code]);

  // Refresh offers when offers prop changes (from App.tsx)
  useEffect(() => {
    if (offers && offers.length > 0) {
      fetchOffersMade();
    }
  }, [offers]);

  // Force refresh offers when activeTab changes to myInvestments
  useEffect(() => {
    if (activeTab === 'myInvestments' || (activeTab === 'management' && managementSubTab === 'myInvestments')) {
      fetchOffersMade();
    }
  }, [activeTab]);

  // Add a global refresh mechanism
  useEffect(() => {
    const handleOfferUpdate = () => {
      fetchOffersMade();
    };

    // Listen for custom events that indicate offers have been updated
    window.addEventListener('offerUpdated', handleOfferUpdate);
    window.addEventListener('offerStageUpdated', handleOfferUpdate);

    return () => {
      window.removeEventListener('offerUpdated', handleOfferUpdate);
      window.removeEventListener('offerStageUpdated', handleOfferUpdate);
    };
  }, []);

  // Fetch startup fundraising data when myStartups changes
  useEffect(() => {
    fetchStartupFundraisingData();
  }, [myStartups]);

  // All co-investment opportunities (active), for advisors
  const [advisorCoOpps, setAdvisorCoOpps] = useState<any[]>([]);
  const [loadingAdvisorCoOpps, setLoadingAdvisorCoOpps] = useState(false);

  // Investment Interests - Favorites from assigned investors
  const [investmentInterests, setInvestmentInterests] = useState<any[]>([]);
  const [loadingInvestmentInterests, setLoadingInvestmentInterests] = useState(false);
  
  // Selected pitch ID for discovery tab
  const [selectedPitchId, setSelectedPitchId] = useState<number | null>(null);

  // Load investment interests (favorites from assigned investors)
  useEffect(() => {
    const loadInvestmentInterests = async () => {
      if (activeTab !== 'interests' || !currentUser?.investment_advisor_code || myInvestors.length === 0) {
        setInvestmentInterests([]);
        return;
      }

      setLoadingInvestmentInterests(true);
      try {
        // Get investor IDs from myInvestors
        const investorIds = myInvestors.map(investor => investor.id);
        
        if (investorIds.length === 0) {
          setInvestmentInterests([]);
          return;
        }

        // Fetch favorites from assigned investors
        const { data: favoritesData, error: favoritesError } = await supabase
          .from('investor_favorites')
          .select(`
            id,
            investor_id,
            startup_id,
            created_at,
            investor:users(id, name, email),
            startup:startups(id, name, sector)
          `)
          .in('investor_id', investorIds)
          .order('created_at', { ascending: false });

        if (favoritesError) {
          // If table doesn't exist yet, silently fail
          if (favoritesError.code !== 'PGRST116') {
            console.error('Error fetching investment interests with join:', favoritesError);
            // Fallback: try without join if RLS blocks it
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('investor_favorites')
              .select('*')
              .in('investor_id', investorIds)
              .order('created_at', { ascending: false });
            
            if (fallbackError) {
              console.error('Fallback fetch also failed:', fallbackError);
              setInvestmentInterests([]);
              return;
            }
            
            // Fetch investor names separately
            const investorMap: Record<string, { name: string; email: string }> = {};
            if (investorIds.length > 0) {
              const { data: investorsData } = await supabase
                .from('users')
                .select('id, name, email')
                .in('id', investorIds);
              
              if (investorsData) {
                investorsData.forEach((investor: any) => {
                  investorMap[investor.id] = { name: investor.name || 'Unknown', email: investor.email || '' };
                });
              }
            }
            
            // Fetch startup names separately
            const startupIds = Array.from(new Set((fallbackData || []).map((row: any) => row.startup_id).filter(Boolean)));
            const startupMap: Record<number, { name: string; sector: string }> = {};
            
            if (startupIds.length > 0) {
              const { data: startupsData } = await supabase
                .from('startups')
                .select('id, name, sector')
                .in('id', startupIds);
              
              if (startupsData) {
                startupsData.forEach((startup: any) => {
                  startupMap[startup.id] = { name: startup.name || 'Unknown Startup', sector: startup.sector || 'Unknown' };
                });
              }
            }
            
            // Normalize fallback data with fetched investor and startup names
            const normalized = (fallbackData || []).map((fav: any) => ({
              id: fav.id,
              investor_id: fav.investor_id,
              startup_id: fav.startup_id,
              investor_name: investorMap[fav.investor_id]?.name || 'Unknown Investor',
              investor_email: investorMap[fav.investor_id]?.email || null,
              startup_name: startupMap[fav.startup_id]?.name || 'Unknown Startup',
              startup_sector: startupMap[fav.startup_id]?.sector || 'Not specified',
              created_at: fav.created_at
            }));
            setInvestmentInterests(normalized);
          } else {
            setInvestmentInterests([]);
          }
          return;
        }

        if (favoritesData && favoritesData.length > 0) {
          // Normalize the data
          const normalized = favoritesData.map((fav: any) => ({
            id: fav.id,
            investor_id: fav.investor_id,
            startup_id: fav.startup_id,
            investor_name: fav.investor?.name || 'Unknown Investor',
            investor_email: fav.investor?.email || null,
            startup_name: fav.startup?.name || 'Unknown Startup',
            startup_sector: fav.startup?.sector || 'Not specified',
            created_at: fav.created_at
          }));
          
          setInvestmentInterests(normalized);
        } else {
          setInvestmentInterests([]);
        }
      } catch (error) {
        console.error('Error loading investment interests:', error);
        setInvestmentInterests([]);
      } finally {
        setLoadingInvestmentInterests(false);
      }
    };

    loadInvestmentInterests();
  }, [activeTab, myInvestors, currentUser?.investment_advisor_code]);

  useEffect(() => {
    const loadAllCoOpps = async () => {
      try {
        setLoadingAdvisorCoOpps(true);
        if (!currentUser?.investment_advisor_code) {
          setAdvisorCoOpps([]);
          setLoadingAdvisorCoOpps(false);
          return;
        }
        
        // Fetch co-investment opportunities that need this advisor's approval
        // Stage 1: Lead investor advisor approval needed (if lead investor has this advisor)
        const { data: stage1Opps, error: stage1Error } = await supabase
          .from('co_investment_opportunities')
          .select(`
            id,
            startup_id,
            listed_by_user_id,
            listed_by_type,
            investment_amount,
            equity_percentage,
            minimum_co_investment,
            maximum_co_investment,
            status,
            stage,
            lead_investor_advisor_approval_status,
            startup_advisor_approval_status,
            startup_approval_status,
            created_at,
            startup:startups(id, name, sector),
            listed_by_user:users!fk_listed_by_user_id(id, name, email, investment_advisor_code_entered)
          `)
          .eq('status', 'active')
          .eq('stage', 1)
          .eq('lead_investor_advisor_approval_status', 'pending')
          .order('created_at', { ascending: false });

        if (stage1Error) {
          console.error('Error fetching Stage 1 co-investment opportunities:', stage1Error);
        }

        // Filter to only show opportunities where lead investor has this advisor's code
        const filteredStage1Opps = (stage1Opps || []).filter((opp: any) => {
          const leadInvestorCode = opp.listed_by_user?.investment_advisor_code_entered;
          const matches = leadInvestorCode === currentUser?.investment_advisor_code;
          console.log('🔍 Checking co-investment opportunity:', {
            id: opp.id,
            lead_investor_code: leadInvestorCode,
            advisor_code: currentUser?.investment_advisor_code,
            matches
          });
          return matches;
        });

        // Also fetch Stage 4 fully approved opportunities (startup approved)
        // These are visible to all advisors and investors
        const { data: stage4Opps, error: stage4Error } = await supabase
          .from('co_investment_opportunities')
          .select(`
            id,
            startup_id,
            listed_by_user_id,
            listed_by_type,
            investment_amount,
            equity_percentage,
            minimum_co_investment,
            maximum_co_investment,
            status,
            stage,
            startup_approval_status,
            created_at,
            startup:startups!fk_startup_id(id, name, sector, currency),
            listed_by_user:users!fk_listed_by_user_id(id, name, email)
          `)
          .eq('status', 'active')
          .eq('stage', 4)
          .eq('startup_approval_status', 'approved')
          .order('created_at', { ascending: false });
        
        // Calculate lead investor invested and remaining amounts for Stage 4 opportunities
        if (stage4Opps) {
          stage4Opps.forEach((opp: any) => {
            const totalInvestment = Number(opp.investment_amount) || 0;
            const remainingForCoInvestment = Number(opp.maximum_co_investment) || 0;
            opp.lead_investor_invested = totalInvestment - remainingForCoInvestment;
            opp.remaining_for_co_investment = remainingForCoInvestment;
          });
        }
        
        if (stage4Error) {
          console.error('Error fetching Stage 4 co-investment opportunities:', stage4Error);
        }

        // Combine both sets
        const allOpps = [...filteredStage1Opps, ...(stage4Opps || [])];
        setAdvisorCoOpps(allOpps);
        
        console.log('✅ Co-investment opportunities loaded for advisor:', {
          stage1: filteredStage1Opps.length,
          stage4: (stage4Opps || []).length,
          total: allOpps.length
        });
      } catch (e) {
        console.error('Error loading co-investment opportunities (advisor):', e);
        setAdvisorCoOpps([]);
      } finally {
        setLoadingAdvisorCoOpps(false);
      }
    };
    // Load when advisor dashboard tab visible
    if (activeTab === 'dashboard') {
      loadAllCoOpps();
    }
  }, [activeTab]);

  // Handle accepting collaboration requests
  const handleAcceptCollaborationRequest = async (request: AdvisorConnectionRequest) => {
    try {
      setIsLoading(true);
      await advisorConnectionRequestService.updateRequestStatus(request.id, 'accepted', currentUser?.id || '');
      
      setNotifications(prev => [...prev, {
        id: Date.now().toString(),
        message: `${request.requester_type} collaboration request accepted successfully!`,
        type: 'success',
        timestamp: new Date()
      }]);
      
      // Remove from pending and add to accepted
      setCollaborationRequests(prev => prev.filter(r => r.id !== request.id));
      setAcceptedCollaborators(prev => [...prev, { ...request, status: 'accepted' as const }]);
      
      // Refresh collaboration requests to get updated data
      const requests = await advisorConnectionRequestService.getCollaboratorRequests(currentUser?.id || '');
      setCollaborationRequests(requests.filter(r => r.status === 'pending'));
      setAcceptedCollaborators(requests.filter(r => r.status === 'accepted'));
    } catch (error) {
      console.error('Error accepting collaboration request:', error);
      setNotifications(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Failed to accept collaboration request',
        type: 'error',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle rejecting collaboration requests - Delete the request
  const handleRejectCollaborationRequest = async (request: AdvisorConnectionRequest) => {
    if (!confirm(`Are you sure you want to reject the collaboration request from ${request.requester_type}?`)) {
      return;
    }
    
    try {
      setIsLoading(true);
      await advisorConnectionRequestService.deleteRequest(request.id, currentUser?.id || '');
      
      setNotifications(prev => [...prev, {
        id: Date.now().toString(),
        message: `${request.requester_type} collaboration request rejected and removed`,
        type: 'info',
        timestamp: new Date()
      }]);
      
      // Remove from pending requests
      setCollaborationRequests(prev => prev.filter(r => r.id !== request.id));
      
      // Remove from profiles cache
      setCollaboratorProfiles(prev => {
        const updated = { ...prev };
        delete updated[request.requester_id];
        return updated;
      });
    } catch (error) {
      console.error('Error rejecting collaboration request:', error);
      setNotifications(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Failed to reject collaboration request',
        type: 'error',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle viewing collaborator profile
  const handleViewCollaborator = (request: AdvisorConnectionRequest) => {
    if (request.collaborator_profile_url) {
      window.open(request.collaborator_profile_url, '_blank');
    } else {
      // Fallback: try to construct URL based on requester type
      const url = new URL(window.location.origin + window.location.pathname);
      if (request.requester_type === 'Investor') {
        url.searchParams.set('view', 'investor');
        url.searchParams.set('userId', request.requester_id);
      } else if (request.requester_type === 'Investment Advisor') {
        url.searchParams.set('view', 'advisor');
        url.searchParams.set('userId', request.requester_id);
      }
      window.open(url.toString(), '_blank');
    }
  };

  // Filter startups based on selected mandate
  const getFilteredMandateStartups = (mandate: AdvisorMandate | null): ActiveFundraisingStartup[] => {
    if (!mandate) return [];
    
    // If no active fundraising startups are loaded, return empty array
    if (activeFundraisingStartups.length === 0) {
      return [];
    }
    
    let filtered = [...activeFundraisingStartups];

    // Filter by round type (fundraisingType)
    if (mandate.round_type && mandate.round_type.trim() !== '') {
      filtered = filtered.filter(startup => 
        startup.fundraisingType === mandate.round_type
      );
    }

    // Filter by domain (sector)
    if (mandate.domain && mandate.domain.trim() !== '') {
      filtered = filtered.filter(startup => 
        startup.sector && startup.sector.toLowerCase() === mandate.domain!.toLowerCase()
      );
    }

    // Filter by amount range
    if (mandate.amount_min !== null && mandate.amount_min !== undefined) {
      filtered = filtered.filter(startup => startup.investmentValue >= mandate.amount_min!);
    }
    if (mandate.amount_max !== null && mandate.amount_max !== undefined) {
      filtered = filtered.filter(startup => startup.investmentValue <= mandate.amount_max!);
    }

    // Filter by equity range
    if (mandate.equity_min !== null && mandate.equity_min !== undefined) {
      filtered = filtered.filter(startup => startup.equityAllocation >= mandate.equity_min!);
    }
    if (mandate.equity_max !== null && mandate.equity_max !== undefined) {
      filtered = filtered.filter(startup => startup.equityAllocation <= mandate.equity_max!);
    }

    return filtered;
  };

  // Handle create/edit mandate
  const handleSaveMandate = async () => {
    if (!mandateFormData.name.trim()) {
      alert('Please enter a mandate name');
      return;
    }

    if (!currentUser?.id) {
      alert('User not found');
      return;
    }

    try {
      let result: AdvisorMandate | null = null;
      
      if (editingMandate) {
        // Update existing mandate
        result = await advisorMandateService.updateMandate(editingMandate.id, {
          name: mandateFormData.name,
          stage: mandateFormData.stage || undefined,
          round_type: mandateFormData.round_type || undefined,
          domain: mandateFormData.domain || undefined,
          amount_min: mandateFormData.amount_min || undefined,
          amount_max: mandateFormData.amount_max || undefined,
          equity_min: mandateFormData.equity_min || undefined,
          equity_max: mandateFormData.equity_max || undefined
        });
      } else {
        // Create new mandate
        result = await advisorMandateService.createMandate({
          ...mandateFormData,
          advisor_id: currentUser.id
        });
      }

      if (result) {
        // Reload mandates
        const updatedMandates = await advisorMandateService.getMandatesByAdvisor(currentUser.id);
        setMandates(updatedMandates);
        
        if (!editingMandate && result.id) {
          setSelectedMandateId(result.id);
        }
        
        setShowMandateModal(false);
        setEditingMandate(null);
        setMandateFormData({
          advisor_id: currentUser.id,
          name: '',
          stage: '',
          round_type: '',
          domain: '',
          amount_min: undefined,
          amount_max: undefined,
          equity_min: undefined,
          equity_max: undefined
        });
        alert(editingMandate ? 'Mandate updated successfully!' : 'Mandate created successfully!');
      } else {
        alert('Failed to save mandate');
      }
    } catch (error) {
      console.error('Error saving mandate:', error);
      alert('Failed to save mandate');
    }
  };

  // Handle delete mandate
  const handleDeleteMandate = async (mandateId: number) => {
    if (!confirm('Are you sure you want to delete this mandate?')) {
      return;
    }

    try {
      const success = await advisorMandateService.hardDeleteMandate(mandateId);
      if (success) {
        const updatedMandates = await advisorMandateService.getMandatesByAdvisor(currentUser?.id || '');
        setMandates(updatedMandates);
        
        if (selectedMandateId === mandateId) {
          setSelectedMandateId(updatedMandates.length > 0 ? updatedMandates[0].id : null);
        }
        
        alert('Mandate deleted successfully!');
      } else {
        alert('Failed to delete mandate');
      }
    } catch (error) {
      console.error('Error deleting mandate:', error);
      alert('Failed to delete mandate');
    }
  };

  // Handle edit mandate
  const handleEditMandate = (mandate: AdvisorMandate) => {
    setEditingMandate(mandate);
    setMandateFormData({
      advisor_id: mandate.advisor_id,
      name: mandate.name,
      stage: mandate.stage || '',
      round_type: mandate.round_type || '',
      domain: mandate.domain || '',
      amount_min: mandate.amount_min,
      amount_max: mandate.amount_max,
      equity_min: mandate.equity_min,
      equity_max: mandate.equity_max
    });
    setShowMandateModal(true);
  };

  // Handle add mandate
  const handleAddMandate = () => {
    setEditingMandate(null);
    setMandateFormData({
      advisor_id: currentUser?.id || '',
      name: '',
      stage: '',
      round_type: '',
      domain: '',
      amount_min: undefined,
      amount_max: undefined,
      equity_min: undefined,
      equity_max: undefined
    });
    setShowMandateModal(true);
  };

  // Handle accepting service requests
  const handleAcceptRequest = async (request: any) => {
    try {
      setIsLoading(true);
      
      if (request.type === 'investor') {
        await (userService as any).acceptInvestmentAdvisorRequest(request.id);
      } else {
        // For startup requests, request.id is the startup ID, we need to find the user ID
        const startup = startups.find(s => s.id === request.id);
        
        if (!startup) {
          throw new Error('Startup not found');
        }
        
        const startupUser = users.find(user => user.id === startup.user_id);
        if (!startupUser) {
          throw new Error('Startup user not found');
        }
        
        // Pass both startup ID and user ID to the function
        await (userService as any).acceptStartupAdvisorRequest(startup.id, startupUser.id);
      }
      
      // Add success notification
      setNotifications(prev => [...prev, {
        id: Date.now().toString(),
        message: `${request.type === 'investor' ? 'Investor' : 'Startup'} request accepted successfully!`,
        type: 'success',
        timestamp: new Date()
      }]);
      
      // Refresh the page to update the service requests list
      setTimeout(() => {
        window.location.reload();
      }, 1000); // Small delay to show success message
    } catch (error) {
      console.error('Error accepting request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Add error notification
      setNotifications(prev => [...prev, {
        id: Date.now().toString(),
        message: `Failed to accept request: ${errorMessage}`,
        type: 'error',
        timestamp: new Date()
      }]);
      
      // Auto-remove notification after 8 seconds for errors
      setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, 8000);
    } finally {
      setIsLoading(false);
    }
  };

  // Open recommendation modal and load existing recommendations
  const handleRecommendCoInvestment = async (startupId: number) => {
    setSelectedStartupForRecommendation(startupId);
    setSelectedInvestors(new Set()); // Reset selection
    setSelectedCollaborators(new Set()); // Reset collaborator selection
    setExistingRecommendations(new Set()); // Reset existing recommendations
    
    // Ensure collaborators are loaded before opening modal
    if (currentUser?.id) {
      try {
        const requests = await advisorConnectionRequestService.getCollaboratorRequests(currentUser.id);
        const accepted = requests.filter(r => r.status === 'accepted');
        setAcceptedCollaborators(accepted);
        console.log('📋 Loaded collaborators for recommendation modal:', accepted.length);
      } catch (error) {
        console.error('Error loading collaborators:', error);
      }
    }
    
    // Debug: Log investors and collaborators
    console.log('👥 My Investors count:', myInvestors.length);
    console.log('🤝 Accepted Collaborators count:', acceptedCollaborators.length);
    console.log('🔑 Advisor Code:', advisorCode);
    
    setShowRecommendModal(true);
    
    // Fetch existing recommendations for this startup (both investors and collaborators)
    if (currentUser?.id) {
      setIsLoadingRecommendations(true);
      try {
        const { data, error } = await supabase
          .from('investment_advisor_recommendations')
          .select('investor_id')
          .eq('investment_advisor_id', currentUser.id)
          .eq('startup_id', startupId);
        
        if (error) {
          console.error('Error fetching existing recommendations:', error);
        } else if (data) {
          // Create a set of recipient IDs who already have recommendations
          // Note: investor_id field stores both investor IDs and collaborator IDs
          const existingRecipientIds = new Set(data.map((rec: any) => rec.investor_id));
          setExistingRecommendations(existingRecipientIds);
        }
      } catch (error) {
        console.error('Error loading existing recommendations:', error);
      } finally {
        setIsLoadingRecommendations(false);
      }
    }
  };

  // Toggle investor selection (only if not already recommended)
  const toggleInvestorSelection = (investorId: string) => {
    // Don't allow selection if already recommended
    if (existingRecommendations.has(investorId)) {
      return;
    }
    
    setSelectedInvestors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(investorId)) {
        newSet.delete(investorId);
      } else {
        newSet.add(investorId);
      }
      return newSet;
    });
  };

  // Toggle collaborator selection (only if not already recommended)
  const toggleCollaboratorSelection = (collaboratorId: string) => {
    // Don't allow selection if already recommended
    if (existingRecommendations.has(collaboratorId)) {
      return;
    }
    
    setSelectedCollaborators(prev => {
      const newSet = new Set(prev);
      if (newSet.has(collaboratorId)) {
        newSet.delete(collaboratorId);
      } else {
        newSet.add(collaboratorId);
      }
      return newSet;
    });
  };

  // Select all available recipients (investors and collaborators who don't already have recommendations)
  const selectAllAvailable = () => {
    const availableInvestorIds = myInvestors
      .filter(inv => !existingRecommendations.has(inv.id))
      .map(inv => inv.id);
    setSelectedInvestors(new Set(availableInvestorIds));
    
    const availableCollaboratorIds = acceptedCollaborators
      .filter(collab => !existingRecommendations.has(collab.requester_id))
      .map(collab => collab.requester_id);
    setSelectedCollaborators(new Set(availableCollaboratorIds));
  };

  // Deselect all recipients
  const deselectAllRecipients = () => {
    setSelectedInvestors(new Set());
    setSelectedCollaborators(new Set());
  };

  // Submit recommendations to selected investors and collaborators
  const handleSubmitRecommendations = async () => {
    if (!selectedStartupForRecommendation) return;
    
    const totalSelected = selectedInvestors.size + selectedCollaborators.size;
    if (totalSelected === 0) {
        setNotifications(prev => [...prev, {
          id: Date.now().toString(),
        message: 'Please select at least one investor or collaborator to recommend this startup to.',
          type: 'warning',
          timestamp: new Date()
        }]);
        return;
      }
      
    try {
      setIsLoading(true);
      
      const startup = startups.find(s => s.id === selectedStartupForRecommendation);
      if (!startup) {
        setNotifications(prev => [...prev, {
          id: Date.now().toString(),
          message: 'Startup not found. Please refresh the page and try again.',
          type: 'error',
          timestamp: new Date()
        }]);
        return;
      }
      
      // Combine investors and collaborators
      const allRecipientIds = [
        ...Array.from(selectedInvestors),
        ...Array.from(selectedCollaborators)
      ];
      
      // Filter out recipients who already have recommendations
      const newRecipientIds = allRecipientIds.filter(recipientId => 
        !existingRecommendations.has(recipientId)
      );
      
      if (newRecipientIds.length === 0) {
        setNotifications(prev => [...prev, {
          id: Date.now().toString(),
          message: 'All selected recipients already have recommendations for this startup.',
          type: 'warning',
          timestamp: new Date()
        }]);
        setIsLoading(false);
        return;
      }
      
      // Check for duplicates before inserting
      const { data: existingData } = await supabase
        .from('investment_advisor_recommendations')
        .select('investor_id')
        .eq('investment_advisor_id', currentUser?.id || '')
        .eq('startup_id', selectedStartupForRecommendation)
        .in('investor_id', newRecipientIds);
      
      const existingRecipientIdsSet = new Set((existingData || []).map((rec: any) => rec.investor_id));
      const finalNewRecipientIds = newRecipientIds.filter(id => !existingRecipientIdsSet.has(id));
      
      if (finalNewRecipientIds.length === 0) {
        setNotifications(prev => [...prev, {
          id: Date.now().toString(),
          message: 'All selected recipients already have recommendations for this startup.',
          type: 'warning',
          timestamp: new Date()
        }]);
        setIsLoading(false);
        return;
      }
      
      // Create recommendations in the database for new recipients only
      // Note: investor_id field is used for both investors and collaborators
      const recommendationPromises = finalNewRecipientIds.map(recipientId => 
        supabase
          .from('investment_advisor_recommendations')
          .insert({
            investment_advisor_id: currentUser?.id || '',
            startup_id: selectedStartupForRecommendation,
            investor_id: recipientId,
            recommended_deal_value: 0,
            recommended_valuation: 0,
            recommendation_notes: `Recommended by ${currentUser?.name || 'Investment Advisor'} - Co-investment opportunity`,
            status: 'pending'
          })
      );
      
      const results = await Promise.all(recommendationPromises);
      const errors = results.filter(result => result.error);
      
      if (errors.length > 0) {
        console.error('Error creating recommendations:', errors);
        setNotifications(prev => [...prev, {
          id: Date.now().toString(),
          message: 'Failed to create some recommendations. Please try again.',
          type: 'error',
          timestamp: new Date()
        }]);
        return;
      }
      
      // Update existing recommendations set
      setExistingRecommendations(prev => {
        const updated = new Set(prev);
        finalNewRecipientIds.forEach(id => updated.add(id));
        return updated;
      });
      
      // Add to recommended startups set to change button color
      setRecommendedStartups(prev => new Set([...prev, selectedStartupForRecommendation]));
      
      const skippedCount = allRecipientIds.length - finalNewRecipientIds.length;
      const investorCount = finalNewRecipientIds.filter(id => selectedInvestors.has(id)).length;
      const collaboratorCount = finalNewRecipientIds.filter(id => selectedCollaborators.has(id)).length;
      
      let message = `Successfully recommended "${startup.name}" to `;
      const parts = [];
      if (investorCount > 0) parts.push(`${investorCount} investor${investorCount > 1 ? 's' : ''}`);
      if (collaboratorCount > 0) parts.push(`${collaboratorCount} collaborator${collaboratorCount > 1 ? 's' : ''}`);
      message += parts.join(' and ') + '!';
      
      if (skippedCount > 0) {
        message += ` (${skippedCount} already had recommendations)`;
      }
      
      setNotifications(prev => [...prev, {
        id: Date.now().toString(),
        message,
        type: 'success',
        timestamp: new Date()
      }]);
      
      // Clear selection but keep modal open to allow more selections
      setSelectedInvestors(new Set());
      setSelectedCollaborators(new Set());
      
    } catch (error) {
      console.error('Error recommending startup:', error);
      setNotifications(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Failed to recommend startup. Please try again.',
        type: 'error',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle advisor approval actions
  const handleAdvisorApproval = async (offerId: number | undefined, action: 'approve' | 'reject', type: 'investor' | 'startup') => {
    try {
      setIsLoading(true);
      
      console.log('🔍 handleAdvisorApproval called with:', {
        offerId,
        offerIdType: typeof offerId,
        action,
        type,
        offersMadeLength: offersMade.length,
        offersMadeSample: offersMade.slice(0, 3).map(o => ({
          id: o.id,
          isCoInvestment: (o as any).isCoInvestment,
          is_co_investment: (o as any).is_co_investment,
          co_investment_opportunity_id: (o as any).co_investment_opportunity_id
        }))
      });
      
      if (!offerId || offerId === undefined) {
        console.error('❌ Invalid offerId:', offerId);
        alert('Invalid offer ID. Please refresh the page and try again.');
        setIsLoading(false);
        return;
      }
      
      // Find the offer in the offersMade array - use the actual offer.id from the table
      // For both regular and co-investment offers, use offer.id
      // Co-investment offers have their ID from co_investment_offers table
      // Regular offers have their ID from investment_offers table
      const offer = offersMade.find(o => {
        const matches = o.id === offerId;
        
        if ((o as any).is_co_investment || (o as any).isCoInvestment) {
          console.log('🔍 Checking co-investment offer:', {
            offer_id: o.id,
            passed_offerId: offerId,
            is_co_investment: (o as any).is_co_investment,
            matches
          });
        } else {
        console.log('🔍 Checking regular offer:', {
          id: o.id,
          offerId,
          matches
        });
        }
        return matches;
      });
      
      console.log('🔍 Found offer:', {
        found: !!offer,
        offer_id: offer?.id,
        isCoInvestment: (offer as any)?.isCoInvestment || (offer as any)?.is_co_investment,
        is_co_investment: (offer as any)?.is_co_investment,
        co_investment_opportunity_id: (offer as any)?.co_investment_opportunity_id
      });
      
      if (!offer) {
        console.error('❌ Offer not found in offersMade array:', {
          offerId,
          totalOffers: offersMade.length,
          coInvestmentOffers: offersMade.filter(o => (o as any).is_co_investment || (o as any).isCoInvestment).length,
          regularOffers: offersMade.filter(o => !(o as any).is_co_investment && !(o as any).isCoInvestment).length,
          availableIds: offersMade.map(o => o.id)
        });
        alert(`Offer not found. Please refresh the page and try again.`);
        setIsLoading(false);
        return;
      }
      
      // Check if this is a co-investment offer (could be is_co_investment or isCoInvestment)
      const isCoInvestment = !!(offer as any)?.is_co_investment || !!(offer as any)?.isCoInvestment;
      
      // For co-investment offers, use the actual offer.id (from co_investment_offers table)
      // For regular offers, also use offer.id (from investment_offers table)
      const actualOfferId = offer.id;
      
      console.log('🔍 Processing approval:', {
        isCoInvestment,
        actualOfferId,
        passedOfferId: offerId,
        type,
        action
      });
      
      let result;
      if (isCoInvestment) {
        // Handle co-investment offer approval
        // For co-investment offers, we need to approve the offer itself, not the opportunity
        console.log(`🔍 Calling co-investment offer approval function: ${type === 'investor' ? 'approveCoInvestmentOfferInvestorAdvisor' : 'approveCoInvestmentOfferStartupAdvisor'}`);
        if (type === 'investor') {
          // Investor advisor approval for co-investment offer
          // Use actualOfferId which is the ID from co_investment_offers table
          result = await investmentService.approveCoInvestmentOfferInvestorAdvisor(actualOfferId, action);
        } else {
          // Startup advisor approval for co-investment offer
          // Note: Co-investment offers typically don't go through startup advisor approval
          // If they do, use the regular startup advisor approval flow
          result = await investmentService.approveStartupAdvisorOffer(actualOfferId, action);
        }
        console.log('✅ Co-investment offer approval result:', result);
      } else {
        // Handle regular investment offer approval
        console.log(`🔍 Calling regular offer approval function: ${type === 'investor' ? 'approveInvestorAdvisorOffer' : 'approveStartupAdvisorOffer'}`);
        if (type === 'investor') {
          // Stage 1: Investor advisor approval
          // Use actualOfferId which is the ID from investment_offers table
          result = await investmentService.approveInvestorAdvisorOffer(actualOfferId, action);
        } else {
          // Stage 2: Startup advisor approval
          // Use actualOfferId which is the ID from investment_offers table
          result = await investmentService.approveStartupAdvisorOffer(actualOfferId, action);
        }
        console.log('✅ Regular offer approval result:', result);
      }
      
      // Extract new stage from result
      const newStage = result?.new_stage || null;
      
      const offerType = isCoInvestment ? 'Co-investment opportunity' : 'Offer';
      alert(`${offerType} ${action}ed successfully!`);
      
      // Dispatch global event to notify other components
      window.dispatchEvent(new CustomEvent('offerStageUpdated', { 
        detail: { offerId, action, type, newStage, isCoInvestment }
      }));
      
      // Refresh offers made after approval
      await fetchOffersMade();
    } catch (error: any) {
      console.error(`❌ Error ${action}ing offer:`, error);
      console.error('❌ Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      const errorMessage = error?.message || `Failed to ${action} offer. Please try again.`;
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle negotiating an offer (move to Stage 4 and reveal contact details)
  const handleNegotiateOffer = async (offerId: number) => {
    try {
      setIsLoading(true);
      // Move directly to stage 4
      await investmentService.updateInvestmentOfferStage(offerId, 4);
      // Reveal contact details for both parties
      try {
        await investmentService.revealContactDetails(offerId);
      } catch (e) {
        // Non-fatal: contact reveal RPC may be optional depending on schema
        console.warn('Reveal contact details failed or not configured:', e);
      }
      alert('Offer moved to Stage 4. Contact details have been revealed.');
      
      // Dispatch global event to notify other components
      window.dispatchEvent(new CustomEvent('offerStageUpdated', { 
        detail: { offerId, action: 'negotiate', type: 'startup', newStage: 4 }
      }));
      
      await fetchOffersMade();
    } catch (error) {
      console.error('Error negotiating offer:', error);
      alert('Failed to negotiate offer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle viewing investor dashboard
  const handleViewInvestorDashboard = async (investor: User) => {
    setIsLoading(true);
    try {
      // Load investor's offers (same as App.tsx does)
      const investorOffersData = await investmentService.getUserInvestmentOffers(investor.email);
      setInvestorOffers(investorOffersData);

      // Fetch all startup addition requests (like App.tsx does)
      let allStartupAdditionRequests: any[] = [];
      try {
        const { data: requestsData, error: requestsError } = await supabase
          .from('startup_addition_requests')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!requestsError && requestsData) {
          allStartupAdditionRequests = requestsData;
        }
    } catch (error) {
        console.error('Error fetching startup addition requests:', error);
      }

      // Get investor code
      const investorCode = (investor as any).investor_code || (investor as any).investorCode;

      // Filter investor's startups (same logic as App.tsx lines 1246-1274)
      // 1. Start with startups from investment records
      const investorStartupIds = new Set<number>();
      
      if (investorCode) {
        // Get startups from investment records
        const { data: investorInvestments } = await supabase
          .from('investment_records')
          .select('startup_id')
          .eq('investor_code', investorCode);
        
        if (investorInvestments) {
          investorInvestments.forEach((inv: any) => {
            if (inv.startup_id) investorStartupIds.add(inv.startup_id);
          });
        }
      }

      // 2. Get startups from offers
      if (investorOffersData.length > 0) {
        investorOffersData.forEach(offer => {
          if (offer.startup_id) investorStartupIds.add(offer.startup_id);
        });
      }

      // 3. Augment with approved startup addition requests (same as App.tsx)
      let investorStartupsList = startups.filter(s => investorStartupIds.has(s.id));
      
      if (investorCode && Array.isArray(allStartupAdditionRequests)) {
        const approvedNames = allStartupAdditionRequests
          .filter((r: any) => (r.status || 'pending') === 'approved' && (
            !investorCode || !r?.investor_code || (r.investor_code === investorCode || r.investorCode === investorCode)
          ))
          .map((r: any) => r.name)
          .filter((n: any) => !!n);
        
        if (approvedNames.length > 0) {
          // Get startups by names (map to Startup format like startupService.getStartupsByNames does)
          const { data: approvedStartupsData } = await supabase
            .from('startups')
            .select('*')
            .in('name', approvedNames);
          
          if (approvedStartupsData) {
            // Map to Startup format
            const mappedApprovedStartups = approvedStartupsData.map((startup: any) => ({
              id: startup.id,
              name: startup.name,
              investmentType: startup.investment_type || 'Unknown',
              investmentValue: Number(startup.investment_value) || 0,
              equityAllocation: Number(startup.equity_allocation) || 0,
              currentValuation: Number(startup.current_valuation) || 0,
              complianceStatus: startup.compliance_status || 'Pending',
              sector: startup.sector || 'Unknown',
              totalFunding: Number(startup.total_funding) || 0,
              totalRevenue: Number(startup.total_revenue) || 0,
              registrationDate: startup.registration_date || '',
              founders: startup.founders || [],
              user_id: startup.user_id
            }));
            
            // Merge unique by name (same logic as App.tsx)
            const byName: Record<string, any> = {};
            investorStartupsList.forEach((s: any) => {
              if (s && s.name) byName[s.name] = s;
            });
            mappedApprovedStartups.forEach((s: any) => {
              if (s && s.name) byName[s.name] = s;
            });
            investorStartupsList = Object.values(byName) as Startup[];
          }
        }
      }

      // Format currentUser for InvestorView (must match what InvestorView expects)
      // Include advisor-related fields so AdvisorAwareLogo can show advisor logo
      const formattedInvestor = {
        id: investor.id,
        email: investor.email,
        name: investor.name, // Include name for display
        investorCode: investorCode || null,
        investor_code: investorCode || null,
        // Include advisor code so advisor logo is shown
        investment_advisor_code_entered: (investor as any).investment_advisor_code_entered || null,
        role: 'Investor' as const
      };

      // Store investor data - pass filtered startups (only investor's portfolio)
      setSelectedInvestor(formattedInvestor as any);
      setInvestorDashboardData({
        investorStartups: investorStartupsList, // Filtered to investor's startups only
        investorInvestments: investments, // Pass all investments (InvestorView may filter internally)
        investorStartupAdditionRequests: allStartupAdditionRequests // Pass all requests (InvestorView filters by investor code)
      });
    setViewingInvestorDashboard(true);
    } catch (error) {
      console.error('Error loading investor dashboard:', error);
      // Fallback: just set the investor
      const formattedInvestor = {
        id: investor.id,
        email: investor.email,
        name: investor.name, // Include name for display
        investorCode: (investor as any).investor_code || (investor as any).investorCode || null,
        investor_code: (investor as any).investor_code || (investor as any).investorCode || null,
        // Include advisor code so advisor logo is shown
        investment_advisor_code_entered: (investor as any).investment_advisor_code_entered || null,
        role: 'Investor' as const
      };
      setSelectedInvestor(formattedInvestor as any);
      setInvestorDashboardData({
        investorStartups: [],
        investorInvestments: investments,
        investorStartupAdditionRequests: []
      });
      setViewingInvestorDashboard(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle viewing startup dashboard
  const handleViewStartupDashboard = async (startup: Startup) => {
    setIsLoading(true);
    try {
      // Load startup's offers using the same logic as App.tsx
      const startupOffersData = await investmentService.getOffersForStartup(startup.id);
      setStartupOffers(startupOffersData);
      
      // Fetch enriched startup data from database (similar to handleFacilitatorStartupAccess in App.tsx)
      // This ensures all fields are populated: currency, pitch URLs, shares, founders, profile data, etc.
      const [startupResult, fundraisingResult, sharesResult, foundersResult, subsidiariesResult, internationalOpsResult] = await Promise.allSettled([
        supabase
          .from('startups')
          .select('*')
          .eq('id', startup.id)
          .single(),
        supabase
          .from('fundraising_details')
          .select('value, equity, domain, pitch_deck_url, pitch_video_url, currency')
          .eq('startup_id', startup.id)
          .limit(1),
        supabase
          .from('startup_shares')
          .select('total_shares, esop_reserved_shares, price_per_share')
          .eq('startup_id', startup.id)
          .single(),
        supabase
          .from('founders')
          .select('name, email, shares, equity_percentage')
          .eq('startup_id', startup.id),
        supabase
          .from('subsidiaries')
          .select('*')
          .eq('startup_id', startup.id),
        // international_operations table may not exist, Promise.allSettled handles errors gracefully
        supabase
          .from('international_operations')
          .select('*')
          .eq('startup_id', startup.id)
      ]);
      
      const startupData = startupResult.status === 'fulfilled' ? startupResult.value : null;
      const fundraisingData = fundraisingResult.status === 'fulfilled' ? fundraisingResult.value : null;
      const sharesData = sharesResult.status === 'fulfilled' ? sharesResult.value : null;
      const foundersData = foundersResult.status === 'fulfilled' ? foundersResult.value : null;
      const subsidiariesData = subsidiariesResult.status === 'fulfilled' ? subsidiariesResult.value : null;
      const internationalOpsData = internationalOpsResult.status === 'fulfilled' ? internationalOpsResult.value : null;
      
      if (startupData?.error || !startupData?.data) {
        console.error('Error fetching enriched startup data, using provided startup:', startupData?.error);
        // Fallback to provided startup if fetch fails
        setSelectedStartup(startup);
        setViewingStartupDashboard(true);
        return;
      }
      
      const fetchedStartup = startupData.data;
      const shares = sharesData?.data;
      const founders = foundersData?.data || [];
      const subsidiaries = subsidiariesData?.data || [];
      const internationalOps = internationalOpsData?.data || [];
      
      // Map founders data
      const totalSharesForDerivation = shares?.total_shares || 0;
      const mappedFounders = founders.map((founder: any) => {
        const equityPct = Number(founder.equity_percentage) || 0;
        const sharesFromEquity = totalSharesForDerivation > 0 && equityPct > 0
          ? Math.round((equityPct / 100) * totalSharesForDerivation)
          : 0;
        return {
          name: founder.name,
          email: founder.email,
          shares: Number(founder.shares) || sharesFromEquity,
          equityPercentage: equityPct
        };
      });
      
      // Map subsidiaries data
      const normalizeDate = (value: unknown): string => {
        if (!value) return '';
        if (value instanceof Date) return value.toISOString().split('T')[0];
        const str = String(value);
        return str.includes('T') ? str.split('T')[0] : str;
      };
      
      const mappedSubsidiaries = subsidiaries.map((sub: any) => ({
        id: sub.id,
        country: sub.country,
        companyType: sub.company_type,
        registrationDate: normalizeDate(sub.registration_date),
        caCode: sub.ca_service_code,
        csCode: sub.cs_service_code,
      }));
      
      // Map international operations data
      const mappedInternationalOps = internationalOps.map((op: any) => ({
        id: op.id,
        country: op.country,
        companyType: op.company_type,
        startDate: normalizeDate(op.start_date),
      }));
      
      // Build profile data object
      const profileData = {
        country: fetchedStartup.country_of_registration || fetchedStartup.country,
        companyType: fetchedStartup.company_type,
        registrationDate: normalizeDate(fetchedStartup.registration_date),
        currency: fetchedStartup.currency || 'USD',
        subsidiaries: mappedSubsidiaries,
        internationalOps: mappedInternationalOps,
        caServiceCode: fetchedStartup.ca_service_code,
        csServiceCode: fetchedStartup.cs_service_code,
        investmentAdvisorCode: fetchedStartup.investment_advisor_code
      };
      
      // Convert database format to Startup interface with all fields
      const fundraisingRow = (fundraisingData?.data && (fundraisingData as any).data[0]) || null;
      const enrichedStartup: Startup = {
        id: fetchedStartup.id,
        name: fetchedStartup.name,
        investmentType: fetchedStartup.investment_type,
        investmentValue: Number(fundraisingRow?.value ?? fetchedStartup.investment_value) || 0,
        equityAllocation: Number(fundraisingRow?.equity ?? fetchedStartup.equity_allocation) || 0,
        currentValuation: fetchedStartup.current_valuation,
        complianceStatus: fetchedStartup.compliance_status,
        sector: fundraisingRow?.domain || fetchedStartup.sector,
        totalFunding: fetchedStartup.total_funding,
        totalRevenue: fetchedStartup.total_revenue,
        registrationDate: normalizeDate(fetchedStartup.registration_date),
        currency: fundraisingRow?.currency || fetchedStartup.currency || 'USD',
        founders: mappedFounders,
        esopReservedShares: shares?.esop_reserved_shares || 0,
        totalShares: shares?.total_shares || 0,
        pricePerShare: shares?.price_per_share || 0,
        pitchDeckUrl: fundraisingRow?.pitch_deck_url || undefined,
        pitchVideoUrl: fundraisingRow?.pitch_video_url || undefined,
        // Add profile data for ComplianceTab and ProfileTab
        profile: profileData,
        // Add direct profile fields for compatibility with components that check startup.country_of_registration
        country_of_registration: fetchedStartup.country_of_registration || fetchedStartup.country,
        company_type: fetchedStartup.company_type,
        // Add additional fields for compatibility
        user_id: fetchedStartup.user_id,
        investment_advisor_code: fetchedStartup.investment_advisor_code,
        ca_service_code: fetchedStartup.ca_service_code,
        cs_service_code: fetchedStartup.cs_service_code
      } as any;
      
      console.log('✅ Enriched startup data fetched for Investment Advisor View:', enrichedStartup);
      setSelectedStartup(enrichedStartup);
      setViewingStartupDashboard(true);
    } catch (error) {
      console.error('Error loading startup dashboard:', error);
      // Fallback to provided startup if all else fails
    setSelectedStartup(startup);
      setStartupOffers([]);
    setViewingStartupDashboard(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle closing investor dashboard
  const handleCloseInvestorDashboard = () => {
    setViewingInvestorDashboard(false);
    setSelectedInvestor(null);
    setInvestorOffers([]);
    setInvestorDashboardData({ investorStartups: [], investorInvestments: [], investorStartupAdditionRequests: [] });
  };

  // Handle closing startup dashboard
  const handleCloseStartupDashboard = () => {
    setViewingStartupDashboard(false);
    setSelectedStartup(null);
    setStartupOffers([]);
  };

  // Handle contact details revelation
  const handleRevealContactDetails = async (offerId: number) => {
    try {
      setIsLoading(true);
      await investmentService.revealContactDetails(offerId);
      alert('Contact details have been revealed to both parties.');
      
      // Dispatch global event to notify other components
      window.dispatchEvent(new CustomEvent('offerStageUpdated', { 
        detail: { offerId, action: 'reveal_contact', type: 'advisor', newStage: null }
      }));
      
      // Refresh offers made after revealing contact details
      await fetchOffersMade();
    } catch (error) {
      console.error('Error revealing contact details:', error);
      alert('Failed to reveal contact details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle viewing investment details
  const handleViewInvestmentDetails = (offer: any) => {
    // Get advisor info from the offer data (now included in the offer object)
    const investorAdvisor = offer.investor_advisor;
    const startupAdvisor = offer.startup_advisor;
    
    // Determine contact details based on advisor assignment priority
    const startupContact = startupAdvisor ? 
      `Startup Advisor: ${startupAdvisor.email}` : 
      `Startup: ${offer.startup_user?.email || offer.startup_name || 'Not Available'}`;
    
    const investorContact = investorAdvisor ? 
      `Investor Advisor: ${investorAdvisor.email}` : 
      `Investor: ${offer.investor_email || 'Not Available'}`;
    
    // Create simplified contact details
    const contactDetails = `
🎯 INVESTMENT DEAL CONTACT INFORMATION

📊 DEAL DETAILS:
• Deal ID: ${offer.id}
• Amount: ${formatCurrency(Number(offer.offer_amount) || 0, offer.currency || 'USD')}
• Equity: ${Number(offer.equity_percentage) || 0}%
• Status: Stage 4 - Active Investment
• Date: ${offer.created_at ? new Date(offer.created_at).toLocaleDateString() : 'N/A'}

📧 CONTACT DETAILS:
• ${startupContact}
• ${investorContact}
    `;
    
    // Show the detailed contact information
    alert(contactDetails);
  };

  // Discovery tab handlers
  const handleFavoriteToggle = async (startupId: number) => {
    console.log('❤️ handleFavoriteToggle called for startup ID:', startupId);
    console.log('❤️ Current user ID:', currentUser?.id);
    console.log('❤️ Current user role:', currentUser?.role);
    
    if (!currentUser?.id) {
      alert('Please log in to favorite startups.');
      return;
    }

    const isCurrentlyFavorited = favoritedPitches.has(startupId);
    console.log('❤️ Is currently favorited:', isCurrentlyFavorited);
    
    try {
      if (isCurrentlyFavorited) {
        // Remove favorite
        console.log('❤️ Removing favorite...');
        const { error, data } = await supabase
          .from('investor_favorites')
          .delete()
          .eq('investor_id', currentUser.id)
          .eq('startup_id', startupId)
          .select();
        
        console.log('❤️ Delete result:', { error, data });
        
        if (error) {
          console.error('❤️ Delete error details:', error);
          throw error;
        }
        
        setFavoritedPitches(prev => {
          const newSet = new Set(prev);
          newSet.delete(startupId);
          console.log('❤️ Updated favoritedPitches after delete:', Array.from(newSet));
          return newSet;
        });
        console.log('❤️ Favorite removed successfully');
      } else {
        // Add favorite
        console.log('❤️ Adding favorite...');
        const { error, data } = await supabase
          .from('investor_favorites')
          .insert([{
            investor_id: currentUser.id,
            startup_id: startupId
          }])
          .select();
        
        console.log('❤️ Insert result:', { error, data });
        
        if (error) {
          console.error('❤️ Insert error details:', error);
          console.error('❤️ Error code:', error.code);
          console.error('❤️ Error message:', error.message);
          console.error('❤️ Error details:', error.details);
          throw error;
        }
        
        setFavoritedPitches(prev => {
          const newSet = new Set(prev);
          newSet.add(startupId);
          console.log('❤️ Updated favoritedPitches after insert:', Array.from(newSet));
          return newSet;
        });
        console.log('❤️ Favorite added successfully');
      }
    } catch (error: any) {
      console.error('❤️ Error toggling favorite:', error);
      console.error('❤️ Error type:', typeof error);
      console.error('❤️ Error object:', JSON.stringify(error, null, 2));
      
      // Show more detailed error message
      const errorMessage = error?.message || error?.details || 'Unknown error occurred';
      const errorCode = error?.code || 'UNKNOWN';
      alert(`Failed to update favorite. Error: ${errorCode} - ${errorMessage}\n\nPlease make sure you have run the FIX_INVESTMENT_ADVISOR_FAVORITES.sql script in your Supabase database.`);
    }
  };

  const handleShare = async (startup: ActiveFundraisingStartup) => {
    try {
      // Create clean public shareable link
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set('view', 'startup');
      url.searchParams.set('startupId', String(startup.id));
      const shareUrl = url.toString();
      const shareData = {
        title: `${startup.name} - Investment Opportunity`,
        text: `Check out this startup: ${startup.name} in ${startup.sector}\n\nView startup: ${shareUrl}`,
        url: shareUrl
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        alert('Startup link copied to clipboard');
      } else {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        alert('Startup details copied to clipboard');
      }
    } catch (err) {
      console.error('Share failed', err);
      alert('Unable to share. Try copying manually.');
    }
  };

  const handleDueDiligenceClick = async (startup: ActiveFundraisingStartup) => {
    try {
      if (!currentUser?.id) {
        alert('Please log in to request due diligence access.');
        return;
      }

      const approved = await paymentService.hasApprovedDueDiligence(currentUser.id, String(startup.id));
      if (approved) {
        addStartupToDueDiligenceSet(startup.id);
        setApprovedDueDiligenceStartups(prev => new Set([...prev, startup.id]));
        (onViewStartup as any)(startup.id, 'dashboard');
        return;
      }

      await paymentService.createPendingDueDiligenceIfNeeded(currentUser.id, String(startup.id));
      addStartupToDueDiligenceSet(startup.id);
      alert('Due diligence request sent. Access will unlock once the startup approves.');
    } catch (error) {
      console.error('Due diligence request failed:', error);
      alert('Failed to send due diligence request. Please try again.');
    }
  };

  const handleMakeOfferClick = (startup: ActiveFundraisingStartup) => {
    // For advisors, this could open a modal to help investors make offers
    alert(`Help investors make offers for ${startup.name} - This feature can be implemented for advisors`);
  };


  // If profile page is open, show it instead of main content
  if (showProfilePage) {
    return (
      <ProfilePage 
        currentUser={currentUser} 
        onBack={() => setShowProfilePage(false)} 
        onProfileUpdate={(updatedUser) => {
          // Update current user when profile is updated
          // This will be handled by App.tsx's onProfileUpdate if needed
        }}
        onLogout={() => {
          // Handle logout if needed
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white shadow-xl rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden animate-in slide-in-from-top-5 ${
                notification.type === 'success' ? 'border-l-4 border-green-500' :
                notification.type === 'error' ? 'border-l-4 border-red-500' :
                notification.type === 'warning' ? 'border-l-4 border-yellow-500' :
                'border-l-4 border-blue-500'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {notification.type === 'success' && (
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                        <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      </div>
                    )}
                    {notification.type === 'error' && (
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100">
                        <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      </div>
                    )}
                    {notification.type === 'warning' && (
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100">
                        <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      </div>
                    )}
                    {notification.type === 'info' && (
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                        <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 leading-relaxed break-words">
                      {notification.message}
                    </p>
                    <p className="mt-1.5 text-xs text-gray-500">
                      {notification.timestamp.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <button
                      onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                      className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      aria-label="Close notification"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 sm:py-6">
            <div className="flex items-center">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Investment Advisor Dashboard</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setShowProfilePage(true)}
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-200 font-medium text-sm sm:text-base"
                title="View Profile"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden sm:inline">Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap space-x-2 sm:space-x-8 px-4 sm:px-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                </svg>
                Dashboard
              </div>
            </button>
            <button
              onClick={() => setActiveTab('discovery')}
              className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'discovery'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Discover Pitches
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('management');
                setManagementSubTab('myInvestments');
              }}
              className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'management'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Management
              </div>
            </button>
            <button
              onClick={() => setActiveTab('interests')}
              className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'interests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Investment Interests
              </div>
            </button>
            <button
              onClick={() => setActiveTab('mandate')}
              className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'mandate'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Mandate
              </div>
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'portfolio'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Portfolio
              </div>
            </button>
            <button
              onClick={() => setActiveTab('collaboration')}
              className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'collaboration'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2a3 3 0 00-.879-2.121M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2a3 3 0 01.879-2.121M12 12a4 4 0 100-8 4 4 0 000 8zm0 0a4 4 0 01-3.121 1.5H9a3 3 0 013 3v1" />
                </svg>
                Collaboration
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Content Sections */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Dashboard Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Total Investors</p>
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">{myInvestors.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Total Startups</p>
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">{myStartups.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Pending Requests</p>
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">{serviceRequests.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Active Offers</p>
                  <p className="text-xl sm:text-2xl font-semibold text-gray-900">{offersMade.length}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Service Requests Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Service Requests</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
                Startups (Pitch) and Investors (manual code entry from dashboard) who have requested your services using your Investment Advisor Code
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Date</th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {serviceRequests.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 sm:px-6 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Requests</h3>
                            <p className="text-sm text-gray-500">No investors or startups have requested your services yet.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      serviceRequests.map((request) => (
                        <tr key={request.id}>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                            {request.name || 'N/A'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              request.type === 'investor' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {request.type === 'investor' ? 'Investor' : 'Startup'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            {new Date(request.created_at || Date.now()).toLocaleDateString()}
                          </td>
                          <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium space-x-3">
                            <button
                              onClick={() => handleAcceptRequest(request)}
                              disabled={isLoading}
                              className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isLoading ? 'Accepting...' : 'Accept'}
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request)}
                              disabled={isLoading}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleViewRequest(request)}
                              className="text-gray-700 hover:text-gray-900"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Offers Made Section - Split into Investor Offers and Startup Offers */}
          
          {/* Investor Offers Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Investor Offers</h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Investment offers made by your assigned investors
              </p>
                </div>
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">{investorOffersList.length}</div>
                  <div className="text-xs sm:text-sm text-gray-500">Investor Offers</div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Startup</th>
                      <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Investor</th>
                      <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Offer Details</th>
                      <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Startup Ask</th>
                      <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Approval Status</th>
                      <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Date</th>
                      <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loadingOffersMade ? (
                      <tr>
                        <td colSpan={7} className="px-3 sm:px-6 py-4 text-center text-xs sm:text-sm text-gray-500">
                          Loading offers...
                        </td>
                      </tr>
                    ) : investorOffersList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 sm:px-6 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <svg className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No Investor Offers Found</h3>
                            <p className="text-xs sm:text-sm text-gray-500 mb-4">
                              No investment offers from your assigned investors at this time.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      investorOffersList.map((offer) => {
                        const investorAdvisorStatus = (offer as any).investor_advisor_approval_status;
                        const startupAdvisorStatus = (offer as any).startup_advisor_approval_status;
                        const hasContactDetails = (offer as any).contact_details_revealed;
                        
                        return (
                          <tr key={offer.id}>
                            <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                              <div className="flex flex-col">
                                <span>{offer.startup_name || 'Unknown Startup'}</span>
                                {((offer as any).isCoInvestment || (offer as any).is_co_investment) && (
                                  <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-semibold mt-1">
                                    <Users className="h-3 w-3" />
                                    Co-Investment Offer
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                              <span className="text-xs sm:text-sm font-medium text-gray-900">{offer.investor_name || 'Unknown Investor'}</span>
                            </td>
                            <td className="px-2 sm:px-6 py-4 text-xs sm:text-sm text-gray-500">
                                <div className="text-xs sm:text-sm font-medium text-gray-900">
                                  {formatCurrency(Number(offer.offer_amount) || 0, offer.currency || 'USD')} for {Number(offer.equity_percentage) || 0}% equity
                                  {(offer as any).isCoInvestment && (offer as any).minimum_co_investment && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Co-investment: {formatCurrency(Number((offer as any).minimum_co_investment) || 0, offer.currency || 'USD')} - {formatCurrency(Number((offer as any).maximum_co_investment) || 0, offer.currency || 'USD')}
                                    </div>
                                  )}
                              </div>
                            </td>
                            <td className="px-2 sm:px-6 py-4 text-xs sm:text-sm text-gray-500">
                              <div className="text-xs sm:text-sm font-medium text-gray-900">
                                {(() => {
                                  // Use the correct column names from fundraising_details table
                                  const investmentValue = Number(offer.fundraising?.value) || 0;
                                  const equityAllocation = Number(offer.fundraising?.equity) || 0;
                                  
                                  // Get currency from startup table
                                  const currency = offer.startup?.currency || offer.currency || 'USD';
                                  
                                  if (investmentValue === 0 && equityAllocation === 0) {
                                    return (
                                      <span className="text-gray-500 italic">
                                        Funding ask not specified
                                      </span>
                                    );
                                  }
                                  
                                  return `Seeking ${formatCurrency(investmentValue, currency)} for ${equityAllocation}% equity`;
                                })()}
                              </div>
                            </td>
                            <td className="px-3 py-4">
                              {(() => {
                                // Check if this is a co-investment offer
                                const isCoInvestment = !!(offer as any).is_co_investment || !!(offer as any).co_investment_opportunity_id;
                                
                                // For co-investment offers, check status field
                                if (isCoInvestment) {
                                  const coStatus = (offer as any).status || 'pending';
                                  if (coStatus === 'pending_investor_advisor_approval') {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                        🔵 Co-Investment: Investor Advisor Approval
                              </span>
                                  );
                                }
                                  if (coStatus === 'pending_lead_investor_approval') {
                                  return (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                        🟠 Co-Investment: Lead Investor Approval
                                    </span>
                                  );
                                }
                                  if (coStatus === 'pending_startup_approval') {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                        🟢 Co-Investment: Startup Review
                                    </span>
                                  );
                                }
                                  if (coStatus === 'investor_advisor_rejected') {
                                    return (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                        ❌ Rejected by Investor Advisor
                                      </span>
                                    );
                                  }
                                  if (coStatus === 'lead_investor_rejected') {
                                    return (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                        ❌ Rejected by Lead Investor
                                      </span>
                                    );
                                  }
                                  if (coStatus === 'accepted') {
                                    return (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                        🎉 Co-Investment: Accepted
                                      </span>
                                    );
                                  }
                                  if (coStatus === 'rejected') {
                                    return (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                        ❌ Co-Investment: Rejected
                                      </span>
                                    );
                                  }
                                }
                                
                                // For regular offers, check stage and approval statuses
                                const offerStage = (offer as any).stage || 1;
                                const offerStatus = (offer as any).status || 'pending';
                                
                                // Check rejection statuses first
                                if (investorAdvisorStatus === 'rejected') {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                      ❌ Rejected by Investor Advisor
                                    </span>
                                  );
                                }
                                if (startupAdvisorStatus === 'rejected') {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                      ❌ Rejected by Startup Advisor
                                    </span>
                                  );
                                }
                                
                                // Check stage-based status
                                if (offerStage === 4 || offerStatus === 'accepted') {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                      🎉 Stage 4: Accepted by Startup
                                    </span>
                                  );
                                }
                                if (offerStage === 3) {
                                  // Check if investor advisor has approved
                                  if (investorAdvisorStatus === 'approved' && startupAdvisorStatus === 'approved') {
                                    return (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                        ✅ Stage 3: Ready for Startup Review
                                      </span>
                                    );
                                  }
                                  if (investorAdvisorStatus === 'approved') {
                                    return (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                        ✅ Stage 3: Ready for Startup Review
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                      ✅ Stage 3: Ready for Startup Review
                                    </span>
                                  );
                                }
                                if (offerStage === 2) {
                                  // Check if investor advisor has approved
                                  if (investorAdvisorStatus === 'approved') {
                                    if (startupAdvisorStatus === 'pending') {
                                      return (
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                          🟣 Stage 2: Startup Advisor Approval
                                        </span>
                                      );
                                    }
                                    if (startupAdvisorStatus === 'approved') {
                                      return (
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                          ✅ Stage 2: Approved, Moving to Startup Review
                                        </span>
                                      );
                                    }
                                  }
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                      🟣 Stage 2: Startup Advisor Approval
                                    </span>
                                  );
                                }
                                if (offerStage === 1) {
                                  // Check approval status
                                  if (investorAdvisorStatus === 'approved') {
                                    return (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                        ✅ Stage 1: Approved, Moving Forward
                                      </span>
                                    );
                                  }
                                  if (investorAdvisorStatus === 'pending') {
                                    return (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                        🔵 Stage 1: Investor Advisor Approval
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                      🔵 Stage 1: Investor Advisor Approval
                                    </span>
                                  );
                                }
                                
                                // Fallback: Check main status field
                                if (offerStatus === 'accepted') {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                      🎉 Accepted
                                    </span>
                                  );
                                }
                                if (offerStatus === 'rejected') {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                      ❌ Rejected
                                    </span>
                                  );
                                }
                                if (offerStatus === 'pending') {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                      ⏳ Pending
                                    </span>
                                  );
                                }
                                
                                // Debug: Log unknown status
                                console.log('🔍 Unknown approval status:', {
                                  offerId: offer.id,
                                  stage: offerStage,
                                  status: offerStatus,
                                  investorAdvisorStatus,
                                  startupAdvisorStatus,
                                  isCoInvestment
                                });
                                
                                return (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                    ❓ Unknown Status (Stage {offerStage})
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                              <div className="text-xs">
                                {offer.created_at ? new Date(offer.created_at).toLocaleDateString() : 'N/A'}
                              </div>
                            </td>
                            <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                              {(() => {
                                // Check if this is a co-investment offer
                                const isCoInvestment = !!(offer as any).is_co_investment || !!(offer as any).co_investment_opportunity_id;
                                const coStatus = (offer as any).status || 'pending';
                                const investorAdvisorStatus = (offer as any).investor_advisor_approval_status || 'not_required';
                                
                                // Get offer stage (default to 1 if not set)
                                const offerStage = (offer as any).stage || 1;
                                
                                // For co-investment offers: Only show Accept/Decline if status is still pending_investor_advisor_approval
                                if (isCoInvestment) {
                                  // If already approved by investor advisor, don't show action buttons
                                  if (coStatus !== 'pending_investor_advisor_approval' || investorAdvisorStatus === 'approved' || investorAdvisorStatus === 'rejected') {
                                    return (
                                      <div className="flex flex-col space-y-1">
                                        <button
                                          onClick={() => {
                                            if (offer.startup) {
                                              handleViewStartupDashboard(offer.startup as any);
                                            } else {
                                              const startup = startups.find(s => s.id === offer.startup_id);
                                              if (startup) {
                                                handleViewStartupDashboard(startup);
                                              } else {
                                                alert('Startup information not available. Please refresh the page.');
                                              }
                                            }
                                          }}
                                          disabled={isLoading || !offer.startup_id}
                                          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 disabled:opacity-50 font-medium"
                                        >
                                          View Startup
                                        </button>
                                        <span className="text-xs text-gray-500 mt-1">
                                          {investorAdvisorStatus === 'approved' ? '✅ Approved' : investorAdvisorStatus === 'rejected' ? '❌ Rejected' : 'No actions'}
                                        </span>
                                      </div>
                                    );
                                  }
                                  
                                  // Show Accept/Decline buttons only when status is pending_investor_advisor_approval
                                  return (
                                    <div className="flex flex-col space-y-1">
                                      <button
                                        onClick={() => {
                                          if (offer.startup) {
                                            handleViewStartupDashboard(offer.startup as any);
                                          } else {
                                            const startup = startups.find(s => s.id === offer.startup_id);
                                            if (startup) {
                                              handleViewStartupDashboard(startup);
                                            } else {
                                              alert('Startup information not available. Please refresh the page.');
                                            }
                                          }
                                        }}
                                        disabled={isLoading || !offer.startup_id}
                                        className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 disabled:opacity-50 font-medium"
                                      >
                                        View Startup
                                      </button>
                                      <button
                                        onClick={() => {
                                          const offerId = offer.id;
                                          console.log('🔍 Accept button clicked (Investor Offers - Co-Investment - Stage 1):', {
                                            isCoInvestment: true,
                                            is_co_investment: (offer as any).is_co_investment,
                                            offer_id: offer.id,
                                            co_investment_opportunity_id: (offer as any).co_investment_opportunity_id,
                                            passed_offerId: offerId,
                                            status: coStatus,
                                            investor_advisor_status: investorAdvisorStatus
                                          });
                                          handleAdvisorApproval(offerId, 'approve', 'investor');
                                        }}
                                        disabled={isLoading}
                                        className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50 font-medium"
                                      >
                                        Accept
                                      </button>
                                      <button
                                        onClick={() => {
                                          const offerId = offer.id;
                                          console.log('🔍 Decline button clicked (Investor Offers - Co-Investment - Stage 1):', {
                                            isCoInvestment: true,
                                            is_co_investment: (offer as any).is_co_investment,
                                            offer_id: offer.id,
                                            co_investment_opportunity_id: (offer as any).co_investment_opportunity_id,
                                            passed_offerId: offerId,
                                            status: coStatus,
                                            investor_advisor_status: investorAdvisorStatus
                                          });
                                          handleAdvisorApproval(offerId, 'reject', 'investor');
                                        }}
                                        disabled={isLoading}
                                        className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 disabled:opacity-50 font-medium"
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  );
                                }
                                
                                // For regular offers: Show approval buttons based on stage
                                if (offerStage === 1) {
                                  // Stage 1: Investor advisor approval
                                  // Only show Accept/Decline if not already approved/rejected
                                  if (investorAdvisorStatus === 'approved' || investorAdvisorStatus === 'rejected') {
                                    return (
                                      <div className="flex flex-col space-y-1">
                                        <button
                                          onClick={() => {
                                            if (offer.startup) {
                                              handleViewStartupDashboard(offer.startup as any);
                                            } else {
                                              const startup = startups.find(s => s.id === offer.startup_id);
                                              if (startup) {
                                                handleViewStartupDashboard(startup);
                                              } else {
                                                alert('Startup information not available. Please refresh the page.');
                                              }
                                            }
                                          }}
                                          disabled={isLoading || !offer.startup_id}
                                          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 disabled:opacity-50 font-medium"
                                        >
                                          View Startup
                                        </button>
                                        <span className="text-xs text-gray-500 mt-1">
                                          {investorAdvisorStatus === 'approved' ? '✅ Approved' : '❌ Rejected'}
                                        </span>
                                      </div>
                                    );
                                  }
                                  
                                  return (
                                    <div className="flex flex-col space-y-1">
                                      <button
                                        onClick={() => {
                                          if (offer.startup) {
                                            handleViewStartupDashboard(offer.startup as any);
                                          } else {
                                            // If startup object is not in offer, find it from startups array
                                            const startup = startups.find(s => s.id === offer.startup_id);
                                            if (startup) {
                                              handleViewStartupDashboard(startup);
                                            } else {
                                              alert('Startup information not available. Please refresh the page.');
                                            }
                                          }
                                        }}
                                        disabled={isLoading || !offer.startup_id}
                                        className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 disabled:opacity-50 font-medium"
                                      >
                                        View Startup
                                      </button>
                                      <button
                                        onClick={() => {
                                          // For co-investment offers, use the actual offer.id (from co_investment_offers table)
                                          // For regular offers, also use offer.id (from investment_offers table)
                                          const offerId = offer.id;
                                          console.log('🔍 Accept button clicked (Investor Offers - Stage 1):', {
                                            isCoInvestment: (offer as any).isCoInvestment || (offer as any).is_co_investment,
                                            is_co_investment: (offer as any).is_co_investment,
                                            offer_id: offer.id,
                                            co_investment_opportunity_id: (offer as any).co_investment_opportunity_id,
                                            passed_offerId: offerId,
                                            offer_data: {
                                              id: offer.id,
                                              stage: (offer as any).stage,
                                              startup_name: offer.startup_name
                                            }
                                          });
                                          handleAdvisorApproval(offerId, 'approve', 'investor');
                                        }}
                                        disabled={isLoading}
                                        className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50 font-medium"
                                      >
                                        Accept
                                      </button>
                                      <button
                                        onClick={() => {
                                          // For co-investment offers, use the actual offer.id (from co_investment_offers table)
                                          const offerId = offer.id;
                                          console.log('🔍 Decline button clicked (Investor Offers - Stage 1):', {
                                            isCoInvestment: (offer as any).isCoInvestment || (offer as any).is_co_investment,
                                            is_co_investment: (offer as any).is_co_investment,
                                            offer_id: offer.id,
                                            co_investment_opportunity_id: (offer as any).co_investment_opportunity_id,
                                            passed_offerId: offerId
                                          });
                                          handleAdvisorApproval(offerId, 'reject', 'investor');
                                        }}
                                        disabled={isLoading}
                                        className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 disabled:opacity-50 font-medium"
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  );
                                }
                                
                                if (offerStage === 2) {
                                  // Stage 2: Startup advisor approval
                                  return (
                                    <div className="flex flex-col space-y-1">
                                      <button
                                        onClick={() => {
                                          // For co-investment offers, use the actual offer.id (from co_investment_offers table)
                                          const offerId = offer.id;
                                          console.log('🔍 Accept button clicked (Startup Offers - Stage 2):', {
                                            isCoInvestment: (offer as any).isCoInvestment || (offer as any).is_co_investment,
                                            is_co_investment: (offer as any).is_co_investment,
                                            offer_id: offer.id,
                                            co_investment_opportunity_id: (offer as any).co_investment_opportunity_id,
                                            passed_offerId: offerId,
                                            offer_data: {
                                              id: offer.id,
                                              stage: (offer as any).stage,
                                              startup_name: offer.startup_name
                                            }
                                          });
                                          handleAdvisorApproval(offerId, 'approve', 'startup');
                                        }}
                                        disabled={isLoading}
                                        className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50 font-medium"
                                      >
                                        Accept
                                      </button>
                                      <button
                                        onClick={() => {
                                          // For co-investment offers, use the actual offer.id (from co_investment_offers table)
                                          const offerId = offer.id;
                                          console.log('🔍 Decline button clicked (Startup Offers - Stage 2):', {
                                            isCoInvestment: (offer as any).isCoInvestment || (offer as any).is_co_investment,
                                            is_co_investment: (offer as any).is_co_investment,
                                            offer_id: offer.id,
                                            co_investment_opportunity_id: (offer as any).co_investment_opportunity_id,
                                            passed_offerId: offerId
                                          });
                                          handleAdvisorApproval(offerId, 'reject', 'startup');
                                        }}
                                        disabled={isLoading}
                                        className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 disabled:opacity-50 font-medium"
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  );
                                }
                                
                                if (offerStage === 3) {
                                  // Stage 3: No advisor actions needed, offer is ready for startup
                                  return (
                                    <span className="text-xs text-gray-500">
                                      Ready
                                    </span>
                                  );
                                }
                                
                                // Show contact details button for approved offers
                                if (investorAdvisorStatus === 'approved' && startupAdvisorStatus === 'approved' && !hasContactDetails) {
                                  return (
                                    <button
                                      onClick={() => handleRevealContactDetails(offer.id)}
                                      disabled={isLoading}
                                      className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                                    >
                                      View Contact Details
                                    </button>
                                  );
                                }
                                
                                // Show status for other cases
                                if (hasContactDetails) {
                                  return <span className="text-green-600 text-xs">Contact Details Revealed</span>;
                                }
                                
                                if (investorAdvisorStatus === 'approved' && startupAdvisorStatus === 'approved') {
                                  return <span className="text-green-600 text-xs">Approved & Ready</span>;
                                }
                                
                                return <span className="text-gray-400 text-xs">No actions</span>;
                              })()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Startup Offers Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Startup Offers</h3>
                  <p className="text-sm text-gray-600">
                    Investment offers received by your assigned startups
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-600">{startupOffersList.length}</div>
                  <div className="text-sm text-gray-500">Startup Offers</div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Startup</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Investor</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Offer Details</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Startup Ask</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Approval Status</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Date</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loadingOffersMade ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                          Loading offers...
                        </td>
                      </tr>
                    ) : startupOffersList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Startup Offers Found</h3>
                            <p className="text-sm text-gray-500 mb-4">
                              No investment offers received by your assigned startups at this time.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      startupOffersList.map((offer) => {
                        const investorAdvisorStatus = (offer as any).investor_advisor_approval_status;
                        const startupAdvisorStatus = (offer as any).startup_advisor_approval_status;
                        const hasContactDetails = (offer as any).contact_details_revealed;
                        
                        return (
                          <tr key={offer.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <div className="flex flex-col">
                                <span>{offer.startup_name || 'Unknown Startup'}</span>
                                {((offer as any).isCoInvestment || (offer as any).is_co_investment) && (
                                  <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-semibold mt-1">
                                    <Users className="h-3 w-3" />
                                    Co-Investment Offer
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-500">
                              <span className="text-sm font-medium text-gray-900">{offer.investor_name || 'Unknown Investor'}</span>
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-500">
                              <div className="text-sm font-medium text-gray-900">
                                {formatCurrency(Number(offer.offer_amount) || 0, offer.currency || 'USD')} for {Number(offer.equity_percentage) || 0}% equity
                                {(offer as any).isCoInvestment && (offer as any).minimum_co_investment && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Co-investment: {formatCurrency(Number((offer as any).minimum_co_investment) || 0, offer.currency || 'USD')} - {formatCurrency(Number((offer as any).maximum_co_investment) || 0, offer.currency || 'USD')}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-500">
                              <div className="text-sm font-medium text-gray-900">
                                {(() => {
                                  const investmentValue = Number(offer.fundraising?.value) || 0;
                                  const equityAllocation = Number(offer.fundraising?.equity) || 0;
                                  const currency = offer.startup?.currency || offer.currency || 'USD';
                                  
                                  if (investmentValue === 0 && equityAllocation === 0) {
                                    return (
                                      <span className="text-gray-500 italic">
                                        Funding ask not specified
                                      </span>
                                    );
                                  }
                                  
                                  return `Seeking ${formatCurrency(investmentValue, currency)} for ${equityAllocation}% equity`;
                                })()}
                              </div>
                            </td>
                            <td className="px-3 py-4">
                              {(() => {
                                // Check if this is a co-investment offer
                                const isCoInvestment = !!(offer as any).is_co_investment || !!(offer as any).co_investment_opportunity_id;
                                
                                // For co-investment offers, check status field
                                if (isCoInvestment) {
                                  const coStatus = (offer as any).status || 'pending';
                                  if (coStatus === 'pending_investor_advisor_approval') {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                        🔵 Co-Investment: Investor Advisor Approval
                                    </span>
                                  );
                                }
                                  if (coStatus === 'pending_lead_investor_approval') {
                                  return (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                        🟠 Co-Investment: Lead Investor Approval
                                    </span>
                                  );
                                }
                                  if (coStatus === 'pending_startup_approval') {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                        🟢 Co-Investment: Startup Review
                                    </span>
                                  );
                                }
                                  if (coStatus === 'investor_advisor_rejected') {
                                    return (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                        ❌ Rejected by Investor Advisor
                                      </span>
                                    );
                                  }
                                  if (coStatus === 'lead_investor_rejected') {
                                    return (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                        ❌ Rejected by Lead Investor
                                      </span>
                                    );
                                  }
                                  if (coStatus === 'accepted') {
                                    return (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                        🎉 Co-Investment: Accepted
                                      </span>
                                    );
                                  }
                                  if (coStatus === 'rejected') {
                                    return (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                        ❌ Co-Investment: Rejected
                                      </span>
                                    );
                                  }
                                }
                                
                                // For regular offers, check stage and approval statuses
                                const offerStage = (offer as any).stage || 1;
                                const offerStatus = (offer as any).status || 'pending';
                                
                                // Check rejection statuses first
                                if (investorAdvisorStatus === 'rejected') {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                      ❌ Rejected by Investor Advisor
                                    </span>
                                  );
                                }
                                if (startupAdvisorStatus === 'rejected') {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                      ❌ Rejected by Startup Advisor
                                    </span>
                                  );
                                }
                                
                                // Check stage-based status
                                if (offerStage === 4 || offerStatus === 'accepted') {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                      🎉 Stage 4: Accepted by Startup
                                    </span>
                                  );
                                }
                                if (offerStage === 3) {
                                  // Check if both advisors have approved
                                  if (investorAdvisorStatus === 'approved' && startupAdvisorStatus === 'approved') {
                                    return (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                        ✅ Stage 3: Ready for Startup Review
                                      </span>
                                    );
                                  }
                                  if (investorAdvisorStatus === 'approved') {
                                    return (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                        ✅ Stage 3: Ready for Startup Review
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                      ✅ Stage 3: Ready for Startup Review
                                    </span>
                                  );
                                }
                                if (offerStage === 2) {
                                  // Check if investor advisor has approved
                                  if (investorAdvisorStatus === 'approved') {
                                    if (startupAdvisorStatus === 'pending') {
                                      return (
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                          🟣 Stage 2: Startup Advisor Approval
                                        </span>
                                      );
                                    }
                                    if (startupAdvisorStatus === 'approved') {
                                      return (
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                          ✅ Stage 2: Approved, Moving to Startup Review
                                        </span>
                                      );
                                    }
                                  }
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                      🟣 Stage 2: Startup Advisor Approval
                                    </span>
                                  );
                                }
                                if (offerStage === 1) {
                                  // Check approval status
                                  if (investorAdvisorStatus === 'approved') {
                                    return (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                        ✅ Stage 1: Approved, Moving Forward
                                      </span>
                                    );
                                  }
                                  if (investorAdvisorStatus === 'pending') {
                                    return (
                                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                        🔵 Stage 1: Investor Advisor Approval
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                      🔵 Stage 1: Investor Advisor Approval
                                    </span>
                                  );
                                }
                                
                                // Fallback: Check main status field
                                if (offerStatus === 'accepted') {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                      🎉 Accepted
                                    </span>
                                  );
                                }
                                if (offerStatus === 'rejected') {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                      ❌ Rejected
                                    </span>
                                  );
                                }
                                if (offerStatus === 'pending') {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                      ⏳ Pending
                                    </span>
                                  );
                                }
                                
                                // Debug: Log unknown status
                                console.log('🔍 Unknown approval status (Startup Offers):', {
                                  offerId: offer.id,
                                  stage: offerStage,
                                  status: offerStatus,
                                  investorAdvisorStatus,
                                  startupAdvisorStatus,
                                  isCoInvestment
                                });
                                
                                return (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                    ❓ Unknown Status (Stage {offerStage})
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-500">
                              <div className="text-xs">
                                {offer.created_at ? new Date(offer.created_at).toLocaleDateString() : 'N/A'}
                              </div>
                            </td>
                            <td className="px-3 py-4 text-sm font-medium">
                              {(() => {
                                const offerStage = (offer as any).stage || 1;
                                
                                if (offerStage === 1) {
                                  return (
                                    <div className="flex flex-col space-y-1">
                                      <button
                                        onClick={() => {
                                          if (offer.startup) {
                                            handleViewStartupDashboard(offer.startup as any);
                                          } else {
                                            const startup = startups.find(s => s.id === offer.startup_id);
                                            if (startup) {
                                              handleViewStartupDashboard(startup);
                                            } else {
                                              alert('Startup information not available. Please refresh the page.');
                                            }
                                          }
                                        }}
                                        disabled={isLoading || !offer.startup_id}
                                        className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 disabled:opacity-50 font-medium"
                                      >
                                        View Startup
                                      </button>
                                      <button
                                        onClick={() => handleAdvisorApproval(offer.id, 'approve', 'investor')}
                                        disabled={isLoading}
                                        className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50 font-medium"
                                      >
                                        Accept
                                      </button>
                                      <button
                                        onClick={() => handleAdvisorApproval(offer.id, 'reject', 'investor')}
                                        disabled={isLoading}
                                        className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 disabled:opacity-50 font-medium"
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  );
                                }
                                
                                if (offerStage === 2) {
                                  return (
                                    <div className="flex flex-col space-y-1">
                                      <button
                                        onClick={() => {
                                          // For co-investment offers, use the actual offer.id (from co_investment_offers table)
                                          // For regular offers, also use offer.id (from investment_offers table)
                                          const offerId = offer.id;
                                          console.log('🔍 Accept button clicked (Startup Offers - Stage 2):', {
                                            isCoInvestment: (offer as any).isCoInvestment || (offer as any).is_co_investment,
                                            is_co_investment: (offer as any).is_co_investment,
                                            offer_id: offer.id,
                                            co_investment_opportunity_id: (offer as any).co_investment_opportunity_id,
                                            passed_offerId: offerId,
                                            offer_data: {
                                              id: offer.id,
                                              stage: (offer as any).stage,
                                              startup_name: offer.startup_name
                                            }
                                          });
                                          handleAdvisorApproval(offerId, 'approve', 'startup');
                                        }}
                                        disabled={isLoading}
                                        className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50 font-medium"
                                      >
                                        Accept
                                      </button>
                                      <button
                                        onClick={() => {
                                          // For co-investment offers, use the actual offer.id (from co_investment_offers table)
                                          const offerId = offer.id;
                                          console.log('🔍 Decline button clicked (Startup Offers - Stage 2):', {
                                            isCoInvestment: (offer as any).isCoInvestment || (offer as any).is_co_investment,
                                            is_co_investment: (offer as any).is_co_investment,
                                            offer_id: offer.id,
                                            co_investment_opportunity_id: (offer as any).co_investment_opportunity_id,
                                            passed_offerId: offerId
                                          });
                                          handleAdvisorApproval(offerId, 'reject', 'startup');
                                        }}
                                        disabled={isLoading}
                                        className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 disabled:opacity-50 font-medium"
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  );
                                }
                                
                                if (offerStage === 3) {
                                  return (
                                    <span className="text-xs text-gray-500">
                                      Ready
                                    </span>
                                  );
                                }
                                
                                if (investorAdvisorStatus === 'approved' && startupAdvisorStatus === 'approved' && !hasContactDetails) {
                                  return (
                                    <button
                                      onClick={() => handleRevealContactDetails(offer.id)}
                                      disabled={isLoading}
                                      className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                                    >
                                      View Contact Details
                                    </button>
                                  );
                                }
                                
                                if (hasContactDetails) {
                                  return <span className="text-green-600 text-xs">Contact Details Revealed</span>;
                                }
                                
                                if (investorAdvisorStatus === 'approved' && startupAdvisorStatus === 'approved') {
                                  return <span className="text-green-600 text-xs">Approved & Ready</span>;
                                }
                                
                                return <span className="text-gray-400 text-xs">No actions</span>;
                              })()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Co-Investment Opportunities Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Co-Investment Opportunities</h3>
              <p className="text-sm text-gray-600 mb-4">
                All co-investment opportunities across the platform
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Startup Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Investor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sector</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Investment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Investor Invested</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining for Co-Investment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equity %</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">View Startup</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loadingAdvisorCoOpps ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-8 text-center text-gray-500">Loading co-investment opportunities...</td>
                      </tr>
                    ) : advisorCoOpps.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                          No Co-Investment Opportunities
                        </td>
                      </tr>
                    ) : (
                      advisorCoOpps.map((row) => {
                        // Calculate lead investor invested and remaining amounts
                        const totalInvestment = Number(row.investment_amount) || 0;
                        const remainingForCoInvestment = Number(row.maximum_co_investment) || 0;
                        const leadInvestorInvested = row.lead_investor_invested !== undefined 
                          ? row.lead_investor_invested 
                          : Math.max(totalInvestment - remainingForCoInvestment, 0);
                        const remaining = row.remaining_for_co_investment !== undefined 
                          ? row.remaining_for_co_investment 
                          : remainingForCoInvestment;
                        const startupCurrency = row.startup?.currency || 'USD';
                        
                        return (
                        <tr key={row.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {row.startup?.name || 'Unknown Startup'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                            {row.listed_by_user?.name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.startup?.sector || 'Not specified'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${row.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {row.stage === 4 ? 'Active' : row.status || 'Active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {totalInvestment > 0 ? formatCurrency(totalInvestment, startupCurrency) : 'Not specified'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-700">
                            {leadInvestorInvested > 0 ? formatCurrency(leadInvestorInvested, startupCurrency) : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700">
                            {remaining > 0 ? formatCurrency(remaining, startupCurrency) : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.equity_percentage ? `${row.equity_percentage}%` : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {
                                if (row.startup_id) {
                                  onViewStartup(row.startup_id, 'dashboard');
                                } else {
                                  alert('Startup information not available');
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            >
                              View Startup
                            </button>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discovery Tab */}
      {activeTab === 'discovery' && (
        <div className="animate-fade-in max-w-4xl mx-auto w-full px-4 sm:px-0">
          {/* Enhanced Header */}
          <div className="mb-6 sm:mb-8">
            <div className="text-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 mb-2">Discover Pitches</h2>
              <p className="text-xs sm:text-sm text-slate-600">Watch startup videos and explore opportunities for your investors</p>
            </div>
            
            {/* Search Bar */}
            <div className="mb-4 sm:mb-6">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search startups by name or sector..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100 gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      setShowOnlyValidated(false);
                      setShowOnlyFavorites(false);
                      setShowOnlyDueDiligence(false);
                    }}
                    className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm ${
                      !showOnlyValidated && !showOnlyFavorites && !showOnlyDueDiligence
                        ? 'bg-blue-600 text-white shadow-blue-200' 
                        : 'bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200'
                    }`}
                  >
                    <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="hidden sm:inline">All</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowOnlyValidated(true);
                      setShowOnlyFavorites(false);
                      setShowOnlyDueDiligence(false);
                    }}
                    className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm ${
                      showOnlyValidated && !showOnlyFavorites && !showOnlyDueDiligence
                        ? 'bg-green-600 text-white shadow-green-200' 
                        : 'bg-white text-slate-600 hover:bg-green-50 hover:text-green-600 border border-slate-200'
                    }`}
                  >
                    <svg className={`h-3 w-3 sm:h-4 sm:w-4 ${showOnlyValidated && !showOnlyFavorites && !showOnlyDueDiligence ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="hidden sm:inline">Verified</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowOnlyValidated(false);
                      setShowOnlyFavorites(true);
                      setShowOnlyDueDiligence(false);
                    }}
                    className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm ${
                      showOnlyFavorites
                        ? 'bg-red-600 text-white shadow-red-200' 
                        : 'bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200'
                    }`}
                  >
                    <svg className={`h-3 w-3 sm:h-4 sm:w-4 ${showOnlyFavorites ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="hidden sm:inline">Favorites</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowOnlyValidated(false);
                      setShowOnlyFavorites(false);
                      setShowOnlyDueDiligence(true);
                    }}
                    className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm ${
                      showOnlyDueDiligence
                        ? 'bg-purple-600 text-white shadow-purple-200' 
                        : 'bg-white text-slate-600 hover:bg-purple-50 hover:text-purple-600 border border-slate-200'
                    }`}
                  >
                    <svg className={`h-3 w-3 sm:h-4 sm:w-4 ${showOnlyDueDiligence ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="hidden sm:inline">Due Diligence</span>
                  </button>
                </div>
                
                <div className="flex items-center gap-2 text-slate-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs sm:text-sm font-medium">{activeFundraisingStartups.length} active pitches</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-slate-500">
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-xs sm:text-sm">Pitch Reels</span>
              </div>
            </div>
          </div>
                
          <div className="space-y-6 sm:space-y-8">
            {isLoadingPitches ? (
              <div className="bg-white rounded-lg shadow text-center py-12 sm:py-20">
                <div className="max-w-sm mx-auto px-4">
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2">Loading Pitches...</h3>
                  <p className="text-sm sm:text-base text-slate-500">Fetching active fundraising startups</p>
                </div>
              </div>
            ) : (() => {
              // Use activeFundraisingStartups for the main data source
              const pitchesToShow = activeTab === 'discovery' ? shuffledPitches : activeFundraisingStartups;
              let filteredPitches = pitchesToShow;
              
              // Apply search filter
              if (searchTerm.trim()) {
                filteredPitches = filteredPitches.filter(inv => 
                  inv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  inv.sector.toLowerCase().includes(searchTerm.toLowerCase())
                );
              }
              
              // Apply validation filter
              if (showOnlyValidated) {
                filteredPitches = filteredPitches.filter(inv => inv.isStartupNationValidated);
              }
              
              // Apply favorites filter
              if (showOnlyFavorites) {
                filteredPitches = filteredPitches.filter(inv => favoritedPitches.has(inv.id));
              }

              if (showOnlyDueDiligence) {
                filteredPitches = filteredPitches.filter(inv => dueDiligenceStartups.has(inv.id));
              }
              
              if (filteredPitches.length === 0) {
                return (
                  <div className="bg-white rounded-lg shadow text-center py-20">
                    <div className="max-w-sm mx-auto">
                      <svg className="h-16 w-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <h3 className="text-xl font-semibold text-slate-800 mb-2">
                        {searchTerm.trim()
                          ? 'No Matching Startups'
                          : showOnlyValidated 
                            ? 'No Verified Startups' 
                            : showOnlyFavorites 
                              ? 'No Favorited Pitches'
                              : showOnlyDueDiligence
                                ? 'No Due Diligence Access Yet'
                                : 'No Active Fundraising'
                        }
                      </h3>
                      <p className="text-slate-500">
                        {searchTerm.trim()
                          ? 'No startups found matching your search. Try adjusting your search terms or filters.'
                          : showOnlyValidated
                            ? 'No Startup Nation verified startups are currently fundraising. Try removing the verification filter or check back later.'
                            : showOnlyFavorites 
                              ? 'Start favoriting pitches to see them here.'
                              : showOnlyDueDiligence
                                ? 'Once due diligence access is granted for a startup, it will appear here for quick access.'
                                : 'No startups are currently fundraising. Check back later for new opportunities.'
                        }
                      </p>
                    </div>
                  </div>
                );
              }
              
              return filteredPitches.map(inv => {
                const videoEmbedInfo = inv.pitchVideoUrl ? getVideoEmbedUrl(inv.pitchVideoUrl, false) : null;
                const embedUrl = videoEmbedInfo?.embedUrl || null;
                const videoSource = videoEmbedInfo?.source || null;
                return (
                  <div key={inv.id} className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 overflow-hidden">
                    {/* Enhanced Video/Logo Section */}
                    <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                      {embedUrl ? (
                        playingVideoId === inv.id ? (
                          <div className="relative w-full h-full">
                            {videoSource === 'direct' ? (
                              <video
                                src={embedUrl}
                                controls
                                autoPlay
                                muted
                                playsInline
                                className="absolute top-0 left-0 w-full h-full object-cover"
                              >
                                Your browser does not support the video tag.
                              </video>
                            ) : (
                            <iframe
                              src={embedUrl}
                              title={`Pitch video for ${inv.name}`}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="absolute top-0 left-0 w-full h-full"
                            ></iframe>
                            )}
                            <button
                              onClick={() => setPlayingVideoId(null)}
                              className="absolute top-4 right-4 bg-black/70 text-white rounded-full p-2 hover:bg-black/90 transition-all duration-200 backdrop-blur-sm"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div
                            className="relative w-full h-full group cursor-pointer"
                            onClick={() => setPlayingVideoId(inv.id)}
                          >
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-all duration-300 group-hover:shadow-red-500/50">
                                <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                            <div className="absolute bottom-4 left-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <p className="text-sm font-medium">Click to play</p>
                            </div>
                          </div>
                        )
                      ) : inv.logoUrl ? (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100">
                          <img 
                            src={inv.logoUrl} 
                            alt={`${inv.name} Logo`} 
                            className="object-contain w-full h-full" 
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <div className="text-center">
                            <Video className="h-16 w-16 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No video or logo available</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Enhanced Content Section */}
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2 break-words">{inv.name}</h3>
                          {/* Domain, Round, Stage in one line */}
                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                            {inv.domain && (
                              <span>
                                <span className="font-medium text-slate-700">Domain:</span> {inv.domain}
                              </span>
                            )}
                            {inv.fundraisingType && (
                              <>
                                {inv.domain && <span className="text-slate-300">•</span>}
                                <span>
                                  <span className="font-medium text-slate-700">Round:</span> {inv.fundraisingType}
                                </span>
                              </>
                            )}
                            {inv.stage && (
                              <>
                                {(inv.domain || inv.fundraisingType) && <span className="text-slate-300">•</span>}
                                <span>
                                  <span className="font-medium text-slate-700">Stage:</span> {inv.stage}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {inv.isStartupNationValidated && (
                            <div className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium shadow-sm">
                              <CheckCircle className="h-3 w-3" />
                              <span className="hidden xs:inline">Verified</span>
                            </div>
                          )}
                        <button
                          onClick={() => handleShare(inv)}
                            className="!rounded-full !p-2 sm:!p-3 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all duration-200 border border-slate-200"
                        >
                            <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                        </div>
                      </div>

                      {/* Document Buttons Row - First Row */}
                      <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-4">
                        {inv.pitchDeckUrl && inv.pitchDeckUrl !== '#' && (
                          <a href={inv.pitchDeckUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[100px] sm:min-w-[120px]">
                            <button className="w-full hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 border border-slate-200 bg-white text-xs sm:text-sm py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg font-medium">
                              <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 inline" /> <span className="hidden xs:inline">View </span>Deck
                            </button>
                          </a>
                        )}

                        {inv.businessPlanUrl && inv.businessPlanUrl !== '#' && (
                          <a href={inv.businessPlanUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[100px] sm:min-w-[140px]">
                            <button className="w-full hover:bg-purple-50 hover:text-purple-600 transition-all duration-200 border border-slate-200 bg-white text-xs sm:text-sm py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg font-medium">
                              <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 inline" /> <span className="hidden xs:inline">Business </span>Plan
                            </button>
                          </a>
                        )}

                        {inv.onePagerUrl && inv.onePagerUrl !== '#' && (
                          <a href={inv.onePagerUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[100px] sm:min-w-[120px]">
                            <button className="w-full hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-200 border border-slate-200 bg-white text-xs sm:text-sm py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg font-medium">
                              <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 inline" /> One-Pager
                            </button>
                          </a>
                        )}
                      </div>

                      {/* Action Buttons Row - Second Row */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2">
                        <button
                          onClick={() => handleFavoriteToggle(inv.id)}
                          className={`!rounded-full !p-1.5 sm:!p-2 transition-all duration-200 ${
                            favoritedPitches.has(inv.id)
                              ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-200'
                              : 'hover:bg-red-50 hover:text-red-600 border border-slate-200 bg-white'
                          }`}
                        >
                          <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${favoritedPitches.has(inv.id) ? 'fill-current' : ''}`} />
                        </button>

                        <button
                          onClick={() => handleDueDiligenceClick(inv)}
                          className={`flex-1 min-w-[90px] sm:min-w-[120px] transition-all duration-200 border px-2 py-1 rounded-lg text-xs font-medium ${
                            approvedDueDiligenceStartups.has(inv.id)
                              ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700'
                              : 'hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300 border-slate-200 bg-white'
                          }`}
                        >
                          <HelpCircle className="h-3 w-3 mr-1 inline" />
                          <span className="hidden sm:inline">{approvedDueDiligenceStartups.has(inv.id) ? 'Due Diligence Accepted' : 'Due Diligence'}</span>
                          <span className="sm:hidden">DD</span>
                        </button>

                        <button
                          onClick={() => handleRecommendCoInvestment(inv.id)}
                          className={`flex-1 min-w-[90px] sm:min-w-[120px] bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg shadow-green-200 text-white px-2 py-1 rounded-lg text-xs font-medium ${
                            recommendedStartups.has(inv.id)
                              ? 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-blue-200'
                              : ''
                          }`}
                        >
                          <span className="hidden sm:inline">{recommendedStartups.has(inv.id) ? 'Recommended ✓' : 'Recommend'}</span>
                          <span className="sm:hidden">{recommendedStartups.has(inv.id) ? 'Rec ✓' : 'Recommend'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Enhanced Investment Details Footer */}
                    <div className="bg-gradient-to-r from-slate-50 to-purple-50 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 border-t border-slate-200">
                      <div className="flex items-center gap-4 flex-wrap">
                      <div className="text-sm sm:text-base">
                          <span className="font-semibold text-slate-800">Ask:</span> {investorService.formatCurrency(inv.investmentValue, inv.currency || 'USD')} for <span className="font-semibold text-purple-600">{inv.equityAllocation}%</span> equity
                        </div>
                        {(inv.websiteUrl || inv.linkedInUrl) && (
                          <div className="flex items-center gap-4">
                            {inv.websiteUrl && inv.websiteUrl !== '#' && (
                              <a 
                                href={inv.websiteUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors"
                                title={inv.websiteUrl}
                              >
                                <Globe className="h-4 w-4" />
                                <span className="truncate max-w-[200px]">Website</span>
                                <ExternalLink className="h-3 w-3 opacity-50" />
                              </a>
                            )}
                            {inv.linkedInUrl && inv.linkedInUrl !== '#' && (
                              <a 
                                href={inv.linkedInUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors"
                                title={inv.linkedInUrl}
                              >
                                <Linkedin className="h-4 w-4" />
                                <span className="truncate max-w-[200px]">LinkedIn</span>
                                <ExternalLink className="h-3 w-3 opacity-50" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      {inv.complianceStatus === ComplianceStatus.Compliant && (
                        <div className="flex items-center gap-1 text-green-600" title="This startup has been verified by Startup Nation">
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="text-xs font-semibold">Verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Management Tab */}
      {activeTab === 'management' && (
        <div className="space-y-6 animate-fade-in">
          {/* Sub-tabs Navigation */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Management Tabs">
                <button
                  onClick={() => setManagementSubTab('myInvestments')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    managementSubTab === 'myInvestments'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    My Investments
                  </div>
                </button>
                <button
                  onClick={() => setManagementSubTab('myInvestors')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    managementSubTab === 'myInvestors'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    My Investors
                  </div>
                </button>
                <button
                  onClick={() => setManagementSubTab('myStartups')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    managementSubTab === 'myStartups'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    My Startups
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* My Investments Sub-tab */}
          {managementSubTab === 'myInvestments' && (
        <div className="space-y-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">My Investments</h3>
                  <p className="text-sm text-gray-600">
                    Track active investments (Stage 4) from your assigned clients
            </p>
            </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {offersMade.filter(offer => (offer as any).stage === 4).length}
          </div>
                  <div className="text-sm text-gray-500">Active Investments</div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">User Type</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Offer Details</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Startup Ask</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Status</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Date</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {offersMade.filter(offer => (offer as any).stage === 4).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Investments</h3>
                            <p className="text-sm text-gray-500 mb-4">
                              No Stage 4 investments to track yet. Investments will appear here once they reach Stage 4.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      offersMade.filter(offer => (offer as any).stage === 4).map((offer) => (
                        <tr key={offer.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div className="flex items-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                                Startup
                              </span>
                              {offer.startup_name || 'Unknown Startup'}
                            </div>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            <div className="space-y-1">
                              <div className="flex items-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                                  Investor
                                </span>
                                <span className="text-xs truncate">{offer.investor_name || 'Unknown Investor'}</span>
                              </div>
                              <div className="text-sm font-medium text-gray-900">
                                {formatCurrency(Number(offer.offer_amount) || 0, offer.currency || 'USD')} for {Number(offer.equity_percentage) || 0}% equity
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            <div className="text-sm font-medium text-gray-900">
                              {(() => {
                                // Use the correct column names from fundraising_details table
                                const investmentValue = Number(offer.fundraising?.value) || 0;
                                const equityAllocation = Number(offer.fundraising?.equity) || 0;
                                
                                // Get currency from startup table
                                const currency = offer.startup?.currency || offer.currency || 'USD';
                                
                                if (investmentValue === 0 && equityAllocation === 0) {
                                  return (
                                    <span className="text-gray-500 italic">
                                      Funding ask not specified
                                    </span>
                                  );
                                }
                                
                                return `Seeking ${formatCurrency(investmentValue, currency)} for ${equityAllocation}% equity`;
                              })()}
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              🎉 Stage 4: Active Investment
                            </span>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            <div className="text-xs">
                              {offer.created_at ? new Date(offer.created_at).toLocaleDateString() : 'N/A'}
                            </div>
                          </td>
                          <td className="px-3 py-4 text-sm font-medium">
                            <button
                              onClick={() => handleViewInvestmentDetails(offer)}
                              className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

          {/* My Investors Sub-tab */}
          {managementSubTab === 'myInvestors' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">My Investors</h3>
                  <p className="text-sm text-gray-600">
                    TMS investors who have accepted your advisory services and manually added investors
                  </p>
                </div>
                <button
                  onClick={handleAddInvestor}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add Investor
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name/VC Firm</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Website</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* TMS Investors */}
                    {myInvestors.map((investor) => (
                      <tr key={`tms-${investor.id}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {investor.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {investor.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          -
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          -
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            TMS
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(investor as any).advisor_accepted_date 
                            ? new Date((investor as any).advisor_accepted_date).toLocaleDateString()
                            : investor.created_at 
                              ? new Date(investor.created_at).toLocaleDateString()
                              : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewInvestorDashboard(investor)}
                            className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                          >
                            View Dashboard
                          </button>
                        </td>
                      </tr>
                    ))}
                    
                    {/* Advisor-Added Investors */}
                    {loadingAddedInvestors ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                          Loading added investors...
                        </td>
                      </tr>
                    ) : advisorAddedInvestors.length === 0 && myInvestors.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                          No investors found. Click "Add Investor" to add investors who are not on TMS.
                        </td>
                      </tr>
                    ) : (
                      advisorAddedInvestors.map((investor) => (
                        <tr key={`added-${investor.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {investor.investor_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {investor.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {investor.contact_number || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {investor.website ? (
                              <a href={investor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                {investor.website}
                              </a>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                              Added
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(investor.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditAddedInvestor(investor)}
                                className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-xs font-medium transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteAddedInvestor(investor.id)}
                                className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs font-medium transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Investor Modal */}
      {showAddInvestorModal && (
        <Modal
          isOpen={showAddInvestorModal}
          onClose={() => {
            setShowAddInvestorModal(false);
            setEditingAddedInvestor(null);
          }}
          title={editingAddedInvestor ? 'Edit Investor' : 'Add Investor'}
        >
          <div className="space-y-4">
            <Input
              label="Investor Name / VC Firm *"
              value={addInvestorFormData.investor_name}
              onChange={(e) => setAddInvestorFormData({ ...addInvestorFormData, investor_name: e.target.value })}
              required
            />
            
            {/* Email and Contact Number in one line */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email *"
                type="email"
                value={addInvestorFormData.email}
                onChange={(e) => setAddInvestorFormData({ ...addInvestorFormData, email: e.target.value })}
                required
              />
              <Input
                label="Contact Number"
                value={addInvestorFormData.contact_number}
                onChange={(e) => setAddInvestorFormData({ ...addInvestorFormData, contact_number: e.target.value })}
              />
            </div>

            {/* Website and LinkedIn in one line */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Website"
                type="url"
                value={addInvestorFormData.website}
                onChange={(e) => setAddInvestorFormData({ ...addInvestorFormData, website: e.target.value })}
              />
              <Input
                label="LinkedIn URL"
                type="url"
                value={addInvestorFormData.linkedin_url}
                onChange={(e) => setAddInvestorFormData({ ...addInvestorFormData, linkedin_url: e.target.value })}
              />
            </div>

            {/* Firm Type and Country in one line */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Firm Type"
                value={addInvestorFormData.firm_type || ''}
                onChange={(e) => setAddInvestorFormData({ ...addInvestorFormData, firm_type: e.target.value })}
              >
                <option value="">Select Firm Type</option>
                {loadingFirmTypes ? (
                  <option>Loading...</option>
                ) : (
                  firmTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))
                )}
              </Select>
              <Select
                label="Country"
                value={addInvestorFormData.location || ''}
                onChange={(e) => setAddInvestorFormData({ ...addInvestorFormData, location: e.target.value })}
              >
                <option value="">Select Country</option>
                {loadingCountries ? (
                  <option>Loading...</option>
                ) : (
                  countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))
                )}
              </Select>
            </div>

            {/* Investment Focus and Domain in one line */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Investment Focus"
                value={addInvestorFormData.investment_focus || ''}
                onChange={(e) => setAddInvestorFormData({ ...addInvestorFormData, investment_focus: e.target.value })}
              >
                <option value="">Select Investment Focus</option>
                {loadingInvestmentStages ? (
                  <option>Loading...</option>
                ) : (
                  investmentStages.map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))
                )}
              </Select>
              <Select
                label="Domain"
                value={addInvestorFormData.domain || ''}
                onChange={(e) => setAddInvestorFormData({ ...addInvestorFormData, domain: e.target.value })}
              >
                <option value="">Select Domain</option>
                {loadingDomains ? (
                  <option>Loading...</option>
                ) : (
                  domains.map(domain => (
                    <option key={domain} value={domain}>{domain}</option>
                  ))
                )}
              </Select>
            </div>

            {/* Stage - Full width */}
            <Select
              label="Stage"
              value={addInvestorFormData.stage || ''}
              onChange={(e) => setAddInvestorFormData({ ...addInvestorFormData, stage: e.target.value })}
            >
              <option value="">Select Stage</option>
              {loadingStages ? (
                <option>Loading...</option>
              ) : (
                stages.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))
              )}
            </Select>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={addInvestorFormData.notes}
                onChange={(e) => setAddInvestorFormData({ ...addInvestorFormData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes about this investor"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => {
                  setShowAddInvestorModal(false);
                  setEditingAddedInvestor(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAddedInvestor}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : editingAddedInvestor ? 'Update' : 'Add Investor'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add/Edit Startup Modal */}
      {showAddStartupModal && (
        <Modal
          isOpen={showAddStartupModal}
          onClose={() => {
            setShowAddStartupModal(false);
            setEditingAddedStartup(null);
          }}
          title={editingAddedStartup ? 'Edit Startup' : 'Add Startup'}
        >
          <div className="space-y-4">
            <Input
              label="Startup Name *"
              value={addStartupFormData.startup_name}
              onChange={(e) => setAddStartupFormData({ ...addStartupFormData, startup_name: e.target.value })}
              required
            />
            
            {/* Contact Name and Contact Email in one line */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Contact Name *"
                value={addStartupFormData.contact_name}
                onChange={(e) => setAddStartupFormData({ ...addStartupFormData, contact_name: e.target.value })}
                required
              />
              <Input
                label="Contact Email *"
                type="email"
                value={addStartupFormData.contact_email}
                onChange={(e) => setAddStartupFormData({ ...addStartupFormData, contact_email: e.target.value })}
                required
              />
            </div>

            {/* Contact Number - Full width */}
            <Input
              label="Contact Number"
              value={addStartupFormData.contact_number || ''}
              onChange={(e) => setAddStartupFormData({ ...addStartupFormData, contact_number: e.target.value })}
            />

            {/* Website and LinkedIn URL in one line */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Website"
                value={addStartupFormData.website_url || ''}
                onChange={(e) => setAddStartupFormData({ ...addStartupFormData, website_url: e.target.value })}
              />
              <Input
                label="LinkedIn URL"
                value={addStartupFormData.linkedin_url || ''}
                onChange={(e) => setAddStartupFormData({ ...addStartupFormData, linkedin_url: e.target.value })}
              />
            </div>

            {/* Sector and Country in one line */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Sector"
                value={addStartupFormData.sector || ''}
                onChange={(e) => setAddStartupFormData({ ...addStartupFormData, sector: e.target.value })}
              >
                <option value="">Select Sector</option>
                {loadingSectors ? (
                  <option>Loading...</option>
                ) : (
                  sectors.map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))
                )}
              </Select>
              <Select
                label="Country"
                value={addStartupFormData.country || ''}
                onChange={(e) => setAddStartupFormData({ ...addStartupFormData, country: e.target.value })}
              >
                <option value="">Select Country</option>
                {loadingCountries ? (
                  <option>Loading...</option>
                ) : (
                  countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))
                )}
              </Select>
            </div>

            {/* Domain and Stage in one line */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Domain"
                value={addStartupFormData.domain || ''}
                onChange={(e) => setAddStartupFormData({ ...addStartupFormData, domain: e.target.value })}
              >
                <option value="">Select Domain</option>
                {loadingDomains ? (
                  <option>Loading...</option>
                ) : (
                  domains.map(domain => (
                    <option key={domain} value={domain}>{domain}</option>
                  ))
                )}
              </Select>
              <Select
                label="Stage"
                value={addStartupFormData.stage || ''}
                onChange={(e) => setAddStartupFormData({ ...addStartupFormData, stage: e.target.value })}
              >
                <option value="">Select Stage</option>
                {loadingStages ? (
                  <option>Loading...</option>
                ) : (
                  stages.map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))
                )}
              </Select>
            </div>

            {/* Round Type and Currency in one line */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Round Type"
                value={addStartupFormData.round_type || ''}
                onChange={(e) => setAddStartupFormData({ ...addStartupFormData, round_type: e.target.value })}
              >
                <option value="">Select Round Type</option>
                {loadingRoundTypes ? (
                  <option>Loading...</option>
                ) : (
                  roundTypes.map(roundType => (
                    <option key={roundType} value={roundType}>{roundType}</option>
                  ))
                )}
              </Select>
              <Select
                label="Currency"
                value={addStartupFormData.currency || 'USD'}
                onChange={(e) => setAddStartupFormData({ ...addStartupFormData, currency: e.target.value })}
              >
                {loadingCurrencies ? (
                  <option>Loading...</option>
                ) : (
                  currencies.map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))
                )}
              </Select>
            </div>

            {/* Current Valuation, Investment Amount, Equity Percentage in one line */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Current Valuation"
                type="number"
                value={addStartupFormData.current_valuation || ''}
                onChange={(e) => setAddStartupFormData({ ...addStartupFormData, current_valuation: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
              <Input
                label="Investment Amount"
                type="number"
                value={addStartupFormData.investment_amount || ''}
                onChange={(e) => setAddStartupFormData({ ...addStartupFormData, investment_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
              <Input
                label="Equity Percentage (%)"
                type="number"
                step="0.01"
                value={addStartupFormData.equity_percentage || ''}
                onChange={(e) => setAddStartupFormData({ ...addStartupFormData, equity_percentage: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
            </div>

            {/* Investment Date - Full width */}
            <Input
              label="Investment Date"
              type="date"
              value={addStartupFormData.investment_date || ''}
              onChange={(e) => setAddStartupFormData({ ...addStartupFormData, investment_date: e.target.value || undefined })}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={addStartupFormData.description || ''}
                onChange={(e) => setAddStartupFormData({ ...addStartupFormData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Description of the startup"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={addStartupFormData.notes || ''}
                onChange={(e) => setAddStartupFormData({ ...addStartupFormData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes about this startup"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => {
                  setShowAddStartupModal(false);
                  setEditingAddedStartup(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAddedStartup}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : editingAddedStartup ? 'Update' : 'Add Startup'}
              </button>
            </div>
          </div>
        </Modal>
      )}

          {/* My Startups Sub-tab */}
          {managementSubTab === 'myStartups' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">My Startups</h3>
                <p className="text-sm text-gray-600">
                  Startups that have accepted your advisory services
                </p>
              </div>
              <button
                onClick={handleAddStartup}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <PlusCircle className="h-4 w-4" />
                Add Startup
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sector</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Startup Ask</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* TMS Startups */}
                  {myStartups.map((startup) => (
                    <tr key={`tms-${startup.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {startup.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {startup.sector || 'Not specified'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          // Get startup ask from fundraising_details table
                          const fundraising = startupFundraisingData[startup.id];
                          const investmentValue = Number(fundraising?.value) || 0;
                          const equityAllocation = Number(fundraising?.equity) || 0;
                          const currency = fundraising?.currency || startup.currency || 'USD';
                          
                          if (investmentValue === 0 && equityAllocation === 0) {
                            return (
                              <span className="text-gray-500 italic">
                                Funding ask not specified
                              </span>
                            );
                          }
                          
                          return `Seeking ${formatCurrency(investmentValue, currency)} for ${equityAllocation}% equity`;
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          TMS
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {startup.created_at 
                          ? new Date(startup.created_at).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleViewStartupDashboard(startup)}
                          className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                        >
                          View Dashboard
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Advisor-Added Startups */}
                  {loadingAddedStartups ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        Loading added startups...
                      </td>
                    </tr>
                  ) : advisorAddedStartups.length === 0 && myStartups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        No startups found. Click "Add Startup" to add startups who are not on TMS.
                      </td>
                    </tr>
                  ) : (
                    advisorAddedStartups.map((startup) => (
                      <tr key={`added-${startup.id}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {startup.startup_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {startup.sector || startup.domain || 'Not specified'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {startup.investment_amount && startup.equity_percentage
                            ? `Seeking ${formatCurrency(startup.investment_amount, startup.currency || 'USD')} for ${startup.equity_percentage}% equity`
                            : startup.current_valuation
                              ? `Valuation: ${formatCurrency(startup.current_valuation, startup.currency || 'USD')}`
                              : <span className="text-gray-500 italic">Funding ask not specified</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                            Added
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(startup.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {startup.is_on_tms && startup.tms_startup_id ? (
                              <button
                                onClick={() => {
                                  const tmsStartup = startups.find(s => s.id === startup.tms_startup_id);
                                  if (tmsStartup) {
                                    handleViewStartupDashboard(tmsStartup);
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                              >
                                View Dashboard
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleSendInviteToTMS(startup.id)}
                                  disabled={isLoading || startup.invite_status === 'sent'}
                                  className={`text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed`}
                                  title={startup.invite_status === 'sent' ? 'Invite already sent' : 'Send invite'}
                                >
                                  {startup.invite_status === 'sent' ? 'Invite Sent' : 'Invite to TMS'}
                                </button>
                                <button
                                  onClick={() => handleEditAddedStartup(startup)}
                                  className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-xs font-medium transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAddedStartup(startup.id)}
                                  className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs font-medium transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
          )}
        </div>
      )}

      {/* Investment Interests Tab */}
      {activeTab === 'interests' && (
        <div className="space-y-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Investment Interests</h3>
                  <p className="text-sm text-gray-600">
                    Startups liked/favorited by your assigned investors from the Discover page
            </p>
            </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-600">
                    {investmentInterests.length}
          </div>
                  <div className="text-sm text-gray-500">Total Interests</div>
        </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investor Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Startup Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sector</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Liked Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">View in Discover</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loadingInvestmentInterests ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          Loading investment interests...
                        </td>
                      </tr>
                    ) : investmentInterests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Investment Interests</h3>
                            <p className="text-sm text-gray-500">
                              Your assigned investors haven't liked any startups yet. Interests will appear here when investors favorite startups from the Discover page.
                            </p>
                </div>
                        </td>
                      </tr>
                    ) : (
                      investmentInterests.map((interest) => (
                        <tr key={`${interest.investor_id}-${interest.startup_id}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {interest.investor_name || 'Unknown Investor'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {interest.startup_name || 'Unknown Startup'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {interest.startup_sector || 'Not specified'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {interest.created_at ? new Date(interest.created_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                              onClick={() => {
                                // Switch to discovery tab and set the pitch ID
                                setActiveTab('discovery');
                                // Find the startup in activeFundraisingStartups
                                const matchedPitch = activeFundraisingStartups.find(pitch => 
                                  pitch.id === interest.startup_id || 
                                  pitch.name === interest.startup_name
                                );
                                
                                if (matchedPitch) {
                                  setPlayingVideoId(matchedPitch.id);
                                  // Scroll to top to ensure the pitch is visible
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                } else {
                                  // If not found, just switch to discovery tab
                                  setActiveTab('discovery');
                                  alert(`Opening discover page. If ${interest.startup_name} is not visible, it may not be actively fundraising.`);
                                }
                              }}
                              className="text-blue-600 hover:text-blue-800 hover:underline font-medium flex items-center gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              View in Discover
                </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Tab */}
      {activeTab === 'portfolio' && currentUser && (
        <div className="space-y-6 animate-fade-in">
          {/* Two-column layout: Form on left, Preview on right */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-6 items-stretch">
            {/* Left: Investment Advisor Profile Form */}
            <Card className="p-4 sm:p-6 h-full">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Investment Advisor Profile</h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Fill out your Investment Advisor profile details. Changes will be reflected in the preview.
                </p>
              </div>
              <InvestmentAdvisorProfileForm
                currentUser={currentUser}
                onSave={(profile) => {
                  console.log('Profile saved:', profile);
                }}
                onProfileChange={(profile) => {
                  setPreviewProfile(profile);
                }}
                isViewOnly={false}
                computedMetrics={computedManagementMetrics}
              />
            </Card>

            {/* Right: Investment Advisor Profile Card Preview */}
            <div className="flex flex-col h-full max-w-xl w-full mx-auto xl:mx-0">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Profile Preview</h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  This is how your profile will appear to others.
                </p>
              </div>
              <InvestmentAdvisorCard
                advisor={previewProfile}
                isPublicPage={false}
                isAuthenticated={true}
                currentUser={currentUser}
              />
            </div>
          </div>
        </div>
      )}

      {/* Collaboration Tab */}
      {activeTab === 'collaboration' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Collaboration</h2>
                <p className="text-sm text-slate-600">Manage collaborators and incoming requests.</p>
              </div>
            </div>

            <div className="border-b border-slate-200 mb-4 flex flex-wrap gap-4">
              <button
                onClick={() => setCollaborationSubTab('myCollaborators')}
                className={`pb-2 text-sm font-medium ${
                  collaborationSubTab === 'myCollaborators'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-800 border-b-2 border-transparent'
                }`}
              >
                My Collaborators
              </button>
              <button
                onClick={() => setCollaborationSubTab('collaboratorRequests')}
                className={`pb-2 text-sm font-medium ${
                  collaborationSubTab === 'collaboratorRequests'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-800 border-b-2 border-transparent'
                }`}
              >
                Collaborator Requests
              </button>
            </div>

            {collaborationSubTab === 'myCollaborators' && (
              <div>
                {loadingCollaborationRequests ? (
                  <div className="text-center py-8 text-slate-600">Loading collaborators...</div>
                ) : acceptedCollaborators.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                    <p className="font-medium text-slate-800 mb-1">No collaborators yet</p>
                    <p className="text-slate-600">Accepted collaborators will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {acceptedCollaborators.map((request) => {
                      const requesterUser = users.find(u => u.id === request.requester_id);
                      const collaboratorProfile = collaboratorProfiles[request.requester_id] || null;
                      
                      // Get video URL and logo
                      const videoUrl = collaboratorProfile?.video_url || collaboratorProfile?.videoUrl;
                      const logoUrl = collaboratorProfile?.logo_url || requesterUser?.logo_url;
                      const firmName = collaboratorProfile?.firm_name || collaboratorProfile?.investor_name || collaboratorProfile?.advisor_name || collaboratorProfile?.mentor_name || '';
                      const location = collaboratorProfile?.global_hq || collaboratorProfile?.location || '';
                      
                      // Get YouTube embed URL if video exists
                      const getYoutubeEmbedUrl = (url?: string): string | null => {
                        if (!url) return null;
                        try {
                          const urlObj = new URL(url);
                          if (urlObj.hostname.includes('youtube.com')) {
                            const videoId = urlObj.searchParams.get('v');
                            return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
                          } else if (urlObj.hostname.includes('youtu.be')) {
                            const videoId = urlObj.pathname.slice(1);
                            return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
                          }
                        } catch {
                          return null;
                        }
                        return null;
                      };
                      
                      const videoEmbedUrl = videoUrl ? getYoutubeEmbedUrl(videoUrl) : null;
                      const mediaType = collaboratorProfile?.media_type || (videoUrl ? 'video' : 'logo');

                      // Format currency helper
                      const formatCurrency = (value?: number, currency?: string) => {
                        if (!value) return 'N/A';
                        const currencyCode = currency || 'USD';
                        return new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: currencyCode,
                          notation: 'compact',
                          maximumFractionDigits: 0
                        }).format(value);
                      };

                      return (
                        <Card key={request.id} className="!p-0 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 bg-white max-w-6xl">
                          <div className="flex flex-col md:flex-row">
                            {/* Left Side: Video/Logo Section - Smaller */}
                            <div className="md:w-1/4 relative h-48 md:h-auto md:min-h-[250px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                              {videoEmbedUrl && mediaType === 'video' ? (
                                <div className="relative w-full h-full">
                                  <iframe
                                    src={videoEmbedUrl}
                                    title={`Profile video for ${requesterUser?.name || 'Collaborator'}`}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="absolute top-0 left-0 w-full h-full"
                                  />
                                </div>
                              ) : logoUrl && logoUrl !== '#' ? (
                                <div className="w-full h-full flex items-center justify-center bg-white p-4">
                                  <img 
                                    src={logoUrl} 
                                    alt={`${requesterUser?.name || 'Collaborator'} logo`}
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <div className="text-center">
                                    <svg className="h-12 w-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <p className="text-xs">No media</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Right Side: Full Details Section */}
                            <div className="md:w-3/4 p-4 sm:p-6 flex flex-col">
                              {/* Header */}
                              <div className="mb-4">
                                <div className="flex items-start justify-between mb-2 gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1 break-words">
                                      {collaboratorProfile?.investor_name || collaboratorProfile?.advisor_name || collaboratorProfile?.mentor_name || requesterUser?.name || 'Unknown'}
                                    </h3>
                                    {firmName && (
                                      <p className="text-sm text-slate-600 font-medium">{firmName}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Accepted
                                    </span>
                                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {request.requester_type}
                                    </span>
                                  </div>
                                </div>

                                {/* Basic Info: Type, Location, Range (varies by user type) */}
                                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm mb-3 pb-3 border-b border-slate-200">
                                  {/* For Investors */}
                                  {request.requester_type === 'Investor' && (
                                    <>
                                      {collaboratorProfile?.firm_type && (
                                        <span className="text-slate-700 font-medium">{collaboratorProfile.firm_type}</span>
                                      )}
                                      {location && (
                                        <>
                                          {collaboratorProfile?.firm_type && <span className="text-slate-300">•</span>}
                                          <span className="text-slate-600 flex items-center gap-1">
                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span className="capitalize">{location}</span>
                                          </span>
                                        </>
                                      )}
                                      {collaboratorProfile?.ticket_size_min && collaboratorProfile?.ticket_size_max && (
                                        <>
                                          {(collaboratorProfile?.firm_type || location) && <span className="text-slate-300">•</span>}
                                          <span className="text-slate-600 flex items-center gap-1">
                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>{formatCurrency(collaboratorProfile.ticket_size_min, collaboratorProfile.currency)} - {formatCurrency(collaboratorProfile.ticket_size_max, collaboratorProfile.currency)}</span>
                                          </span>
                                        </>
                                      )}
                                    </>
                                  )}
                                  
                                  {/* For Investment Advisors */}
                                  {request.requester_type === 'Investment Advisor' && (
                                    <>
                                      {location && (
                                        <span className="text-slate-600 flex items-center gap-1">
                                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                          </svg>
                                          <span className="capitalize">{location}</span>
                                        </span>
                                      )}
                                      {collaboratorProfile?.minimum_investment && collaboratorProfile?.maximum_investment && (
                                        <>
                                          {location && <span className="text-slate-300">•</span>}
                                          <span className="text-slate-600 flex items-center gap-1">
                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>{formatCurrency(collaboratorProfile.minimum_investment, collaboratorProfile.currency)} - {formatCurrency(collaboratorProfile.maximum_investment, collaboratorProfile.currency)}</span>
                                          </span>
                                        </>
                                      )}
                                    </>
                                  )}
                                  
                                  {/* For Mentors */}
                                  {request.requester_type === 'Mentor' && (
                                    <>
                                      {collaboratorProfile?.mentor_type && (
                                        <span className="text-slate-700 font-medium">{collaboratorProfile.mentor_type}</span>
                                      )}
                                      {location && (
                                        <>
                                          {collaboratorProfile?.mentor_type && <span className="text-slate-300">•</span>}
                                          <span className="text-slate-600 flex items-center gap-1">
                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span className="capitalize">{location}</span>
                                          </span>
                                        </>
                                      )}
                                      {collaboratorProfile?.years_of_experience && (
                                        <>
                                          {(collaboratorProfile?.mentor_type || location) && <span className="text-slate-300">•</span>}
                                          <span className="text-slate-600">
                                            {collaboratorProfile.years_of_experience} years experience
                                          </span>
                                        </>
                                      )}
                                    </>
                                  )}
                                  
                                  {/* For other types (CA, CS, Incubation) */}
                                  {!['Investor', 'Investment Advisor', 'Mentor'].includes(request.requester_type) && location && (
                                    <span className="text-slate-600 flex items-center gap-1">
                                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      <span className="capitalize">{location}</span>
                                    </span>
                                  )}
                                </div>

                                {/* Contact Links */}
                                {(collaboratorProfile?.website || collaboratorProfile?.linkedin_link) && (
                                  <div className="flex flex-wrap items-center gap-3 mb-3 pb-3 border-b border-slate-200">
                                    {collaboratorProfile.website && (
                                      <a
                                        href={collaboratorProfile.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors"
                                      >
                                        <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                        </svg>
                                        Website
                                      </a>
                                    )}
                                    {collaboratorProfile.linkedin_link && (
                                      <a
                                        href={collaboratorProfile.linkedin_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors"
                                      >
                                        <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                        </svg>
                                        LinkedIn
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Details Section - Varies by User Type */}
                              <div className="space-y-3 mb-3 pb-3 border-b border-slate-200 flex-1">
                                {/* For Investors */}
                                {request.requester_type === 'Investor' && (
                                  <>
                                    {/* Investment Stages and Geography */}
                                    {(collaboratorProfile?.investment_stages && collaboratorProfile.investment_stages.length > 0) || (collaboratorProfile?.geography && collaboratorProfile.geography.length > 0) ? (
                                      <div className="flex flex-wrap items-center gap-2">
                                        {collaboratorProfile.investment_stages && collaboratorProfile.investment_stages.length > 0 && (
                                          <>
                                            <span className="text-xs font-medium text-slate-500">Investment Stages:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {collaboratorProfile.investment_stages.slice(0, 3).map((stage: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                                  {stage}
                                                </span>
                                              ))}
                                              {collaboratorProfile.investment_stages.length > 3 && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                  +{collaboratorProfile.investment_stages.length - 3} more
                                                </span>
                                              )}
                                            </div>
                                          </>
                                        )}
                                        {collaboratorProfile.geography && collaboratorProfile.geography.length > 0 && (
                                          <>
                                            {collaboratorProfile.investment_stages && collaboratorProfile.investment_stages.length > 0 && (
                                              <span className="text-slate-300 mx-1">•</span>
                                            )}
                                            <span className="text-xs font-medium text-slate-500">Geography:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {collaboratorProfile.geography.slice(0, 3).map((geo: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                                                  {geo}
                                                </span>
                                              ))}
                                              {collaboratorProfile.geography.length > 3 && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                  +{collaboratorProfile.geography.length - 3} more
                                                </span>
                                              )}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    ) : null}

                                    {/* Investment Thesis */}
                                    {collaboratorProfile?.investment_thesis && (
                                      <div>
                                        <div className="text-xs font-medium text-slate-500 mb-1">Investment Thesis</div>
                                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed line-clamp-2">{collaboratorProfile.investment_thesis}</p>
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* For Investment Advisors */}
                                {request.requester_type === 'Investment Advisor' && (
                                  <>
                                    {/* Service Types, Investment Stages, Domain, Geography */}
                                    {(collaboratorProfile?.service_types && collaboratorProfile.service_types.length > 0) || 
                                     (collaboratorProfile?.investment_stages && collaboratorProfile.investment_stages.length > 0) ||
                                     (collaboratorProfile?.domain && collaboratorProfile.domain.length > 0) ||
                                     (collaboratorProfile?.geography && collaboratorProfile.geography.length > 0) ? (
                                      <div className="space-y-2">
                                        {collaboratorProfile.service_types && collaboratorProfile.service_types.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-medium text-slate-500">Service Types:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {collaboratorProfile.service_types.slice(0, 3).map((type: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                                                  {type}
                                                </span>
                                              ))}
                                              {collaboratorProfile.service_types.length > 3 && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                  +{collaboratorProfile.service_types.length - 3} more
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        {collaboratorProfile.investment_stages && collaboratorProfile.investment_stages.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-medium text-slate-500">Investment Stages:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {collaboratorProfile.investment_stages.slice(0, 3).map((stage: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                                  {stage}
                                                </span>
                                              ))}
                                              {collaboratorProfile.investment_stages.length > 3 && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                  +{collaboratorProfile.investment_stages.length - 3} more
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        {collaboratorProfile.domain && collaboratorProfile.domain.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-medium text-slate-500">Domain:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {collaboratorProfile.domain.slice(0, 3).map((dom: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                                                  {dom}
                                                </span>
                                              ))}
                                              {collaboratorProfile.domain.length > 3 && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                  +{collaboratorProfile.domain.length - 3} more
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        {collaboratorProfile.geography && collaboratorProfile.geography.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-medium text-slate-500">Geography:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {collaboratorProfile.geography.slice(0, 3).map((geo: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                                                  {geo}
                                                </span>
                                              ))}
                                              {collaboratorProfile.geography.length > 3 && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                  +{collaboratorProfile.geography.length - 3} more
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : null}

                                    {/* Service Description */}
                                    {collaboratorProfile?.service_description && (
                                      <div>
                                        <div className="text-xs font-medium text-slate-500 mb-1">Service Description</div>
                                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed line-clamp-2">{collaboratorProfile.service_description}</p>
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* For Mentors */}
                                {request.requester_type === 'Mentor' && (
                                  <>
                                    {/* Expertise Areas, Sectors, Mentoring Stages */}
                                    {(collaboratorProfile?.expertise_areas && collaboratorProfile.expertise_areas.length > 0) ||
                                     (collaboratorProfile?.sectors && collaboratorProfile.sectors.length > 0) ||
                                     (collaboratorProfile?.mentoring_stages && collaboratorProfile.mentoring_stages.length > 0) ? (
                                      <div className="space-y-2">
                                        {collaboratorProfile.expertise_areas && collaboratorProfile.expertise_areas.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-medium text-slate-500">Expertise:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {collaboratorProfile.expertise_areas.slice(0, 3).map((area: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-medium rounded">
                                                  {area}
                                                </span>
                                              ))}
                                              {collaboratorProfile.expertise_areas.length > 3 && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                  +{collaboratorProfile.expertise_areas.length - 3} more
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        {collaboratorProfile.sectors && collaboratorProfile.sectors.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-medium text-slate-500">Sectors:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {collaboratorProfile.sectors.slice(0, 3).map((sector: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-pink-100 text-pink-800 text-xs font-medium rounded">
                                                  {sector}
                                                </span>
                                              ))}
                                              {collaboratorProfile.sectors.length > 3 && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                  +{collaboratorProfile.sectors.length - 3} more
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        {collaboratorProfile.mentoring_stages && collaboratorProfile.mentoring_stages.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-medium text-slate-500">Mentoring Stages:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {collaboratorProfile.mentoring_stages.slice(0, 3).map((stage: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-teal-100 text-teal-800 text-xs font-medium rounded">
                                                  {stage}
                                                </span>
                                              ))}
                                              {collaboratorProfile.mentoring_stages.length > 3 && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                  +{collaboratorProfile.mentoring_stages.length - 3} more
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : null}

                                    {/* Mentoring Approach */}
                                    {collaboratorProfile?.mentoring_approach && (
                                      <div>
                                        <div className="text-xs font-medium text-slate-500 mb-1">Mentoring Approach</div>
                                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed line-clamp-2">{collaboratorProfile.mentoring_approach}</p>
                                      </div>
                                    )}

                                    {/* Companies Mentored */}
                                    {collaboratorProfile?.companies_mentored && (
                                      <div className="text-xs text-slate-600">
                                        <span className="font-medium">Companies Mentored:</span> {collaboratorProfile.companies_mentored}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>

                              {/* Connection Details */}
                              <div className="mb-3 pb-3 border-b border-slate-200">
                                <div className="text-xs text-slate-600">
                                  <span className="font-medium">Connected:</span> {new Date(request.responded_at || request.created_at).toLocaleDateString()}
                                </div>
                              </div>

                              {/* Action Button */}
                              <div className="flex flex-wrap items-center gap-2 mt-auto">
                                <button
                                  onClick={() => handleViewCollaborator(request)}
                                  className="flex-1 min-w-[90px] hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 border border-slate-200 bg-white px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center"
                                >
                                  <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View Profile
                                </button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {collaborationSubTab === 'collaboratorRequests' && (
              <div>
                {loadingCollaborationRequests ? (
                  <div className="text-center py-8 text-slate-600">Loading requests...</div>
                ) : collaborationRequests.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                    <p className="font-medium text-slate-800 mb-1">No collaborator requests</p>
                    <p className="text-slate-600">Incoming requests will be listed here.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {collaborationRequests.map((request) => {
                      const requesterUser = users.find(u => u.id === request.requester_id);
                      const collaboratorProfile = collaboratorProfiles[request.requester_id] || null;
                      
                      // Get video URL and logo
                      const videoUrl = collaboratorProfile?.video_url || collaboratorProfile?.videoUrl;
                      const logoUrl = collaboratorProfile?.logo_url || requesterUser?.logo_url;
                      const firmName = collaboratorProfile?.firm_name || collaboratorProfile?.investor_name || collaboratorProfile?.advisor_name || collaboratorProfile?.mentor_name || '';
                      const location = collaboratorProfile?.global_hq || collaboratorProfile?.location || '';
                      
                      // Get YouTube embed URL if video exists
                      const getYoutubeEmbedUrl = (url?: string): string | null => {
                        if (!url) return null;
                        try {
                          const urlObj = new URL(url);
                          if (urlObj.hostname.includes('youtube.com')) {
                            const videoId = urlObj.searchParams.get('v');
                            return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
                          } else if (urlObj.hostname.includes('youtu.be')) {
                            const videoId = urlObj.pathname.slice(1);
                            return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
                          }
                        } catch {
                          return null;
                        }
                        return null;
                      };
                      
                      const videoEmbedUrl = videoUrl ? getYoutubeEmbedUrl(videoUrl) : null;
                      const mediaType = collaboratorProfile?.media_type || (videoUrl ? 'video' : 'logo');

                      // Format currency helper
                      const formatCurrency = (value?: number, currency?: string) => {
                        if (!value) return 'N/A';
                        const currencyCode = currency || 'USD';
                        return new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: currencyCode,
                          notation: 'compact',
                          maximumFractionDigits: 0
                        }).format(value);
                      };

                      return (
                        <Card key={request.id} className="!p-0 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200 bg-white max-w-6xl">
                          <div className="flex flex-col md:flex-row">
                            {/* Left Side: Video/Logo Section - Smaller */}
                            <div className="md:w-1/4 relative h-48 md:h-auto md:min-h-[250px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                              {videoEmbedUrl && mediaType === 'video' ? (
                                <div className="relative w-full h-full">
                                  <iframe
                                    src={videoEmbedUrl}
                                    title={`Profile video for ${requesterUser?.name || 'Collaborator'}`}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="absolute top-0 left-0 w-full h-full"
                                  />
                                </div>
                              ) : logoUrl && logoUrl !== '#' ? (
                                <div className="w-full h-full flex items-center justify-center bg-white p-4">
                                  <img 
                                    src={logoUrl} 
                                    alt={`${requesterUser?.name || 'Collaborator'} logo`}
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <div className="text-center">
                                    <svg className="h-12 w-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <p className="text-xs">No media</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Right Side: Full Details Section */}
                            <div className="md:w-3/4 p-4 sm:p-6 flex flex-col">
                              {/* Header */}
                              <div className="mb-4">
                                <div className="flex items-start justify-between mb-2 gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1 break-words">
                                      {collaboratorProfile?.investor_name || collaboratorProfile?.advisor_name || collaboratorProfile?.mentor_name || requesterUser?.name || 'Unknown'}
                                    </h3>
                                    {firmName && (
                                      <p className="text-sm text-slate-600 font-medium">{firmName}</p>
                                    )}
                                  </div>
                                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 flex-shrink-0">
                                    {request.requester_type}
                                  </span>
                                </div>

                                {/* Basic Info: Type, Location, Range (varies by user type) */}
                                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm mb-3 pb-3 border-b border-slate-200">
                                  {/* For Investors */}
                                  {request.requester_type === 'Investor' && (
                                    <>
                                      {collaboratorProfile?.firm_type && (
                                        <span className="text-slate-700 font-medium">{collaboratorProfile.firm_type}</span>
                                      )}
                                      {location && (
                                        <>
                                          {collaboratorProfile?.firm_type && <span className="text-slate-300">•</span>}
                                          <span className="text-slate-600 flex items-center gap-1">
                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span className="capitalize">{location}</span>
                                          </span>
                                        </>
                                      )}
                                      {collaboratorProfile?.ticket_size_min && collaboratorProfile?.ticket_size_max && (
                                        <>
                                          {(collaboratorProfile?.firm_type || location) && <span className="text-slate-300">•</span>}
                                          <span className="text-slate-600 flex items-center gap-1">
                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>{formatCurrency(collaboratorProfile.ticket_size_min, collaboratorProfile.currency)} - {formatCurrency(collaboratorProfile.ticket_size_max, collaboratorProfile.currency)}</span>
                                          </span>
                                        </>
                                      )}
                                    </>
                                  )}
                                  
                                  {/* For Investment Advisors */}
                                  {request.requester_type === 'Investment Advisor' && (
                                    <>
                                      {location && (
                                        <span className="text-slate-600 flex items-center gap-1">
                                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                          </svg>
                                          <span className="capitalize">{location}</span>
                                        </span>
                                      )}
                                      {collaboratorProfile?.minimum_investment && collaboratorProfile?.maximum_investment && (
                                        <>
                                          {location && <span className="text-slate-300">•</span>}
                                          <span className="text-slate-600 flex items-center gap-1">
                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>{formatCurrency(collaboratorProfile.minimum_investment, collaboratorProfile.currency)} - {formatCurrency(collaboratorProfile.maximum_investment, collaboratorProfile.currency)}</span>
                                          </span>
                                        </>
                                      )}
                                    </>
                                  )}
                                  
                                  {/* For Mentors */}
                                  {request.requester_type === 'Mentor' && (
                                    <>
                                      {collaboratorProfile?.mentor_type && (
                                        <span className="text-slate-700 font-medium">{collaboratorProfile.mentor_type}</span>
                                      )}
                                      {location && (
                                        <>
                                          {collaboratorProfile?.mentor_type && <span className="text-slate-300">•</span>}
                                          <span className="text-slate-600 flex items-center gap-1">
                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span className="capitalize">{location}</span>
                                          </span>
                                        </>
                                      )}
                                      {collaboratorProfile?.years_of_experience && (
                                        <>
                                          {(collaboratorProfile?.mentor_type || location) && <span className="text-slate-300">•</span>}
                                          <span className="text-slate-600">
                                            {collaboratorProfile.years_of_experience} years experience
                                          </span>
                                        </>
                                      )}
                                    </>
                                  )}
                                  
                                  {/* For other types (CA, CS, Incubation) */}
                                  {!['Investor', 'Investment Advisor', 'Mentor'].includes(request.requester_type) && location && (
                                    <span className="text-slate-600 flex items-center gap-1">
                                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      <span className="capitalize">{location}</span>
                                    </span>
                                  )}
                                </div>

                                {/* Contact Links */}
                                {(collaboratorProfile?.website || collaboratorProfile?.linkedin_link) && (
                                  <div className="flex flex-wrap items-center gap-3 mb-3 pb-3 border-b border-slate-200">
                                    {collaboratorProfile.website && (
                                      <a
                                        href={collaboratorProfile.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors"
                                      >
                                        <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                        </svg>
                                        Website
                                      </a>
                                    )}
                                    {collaboratorProfile.linkedin_link && (
                                      <a
                                        href={collaboratorProfile.linkedin_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700 flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors"
                                      >
                                        <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                                        </svg>
                                        LinkedIn
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Details Section - Varies by User Type */}
                              <div className="space-y-3 mb-3 pb-3 border-b border-slate-200 flex-1">
                                {/* For Investors */}
                                {request.requester_type === 'Investor' && (
                                  <>
                                    {/* Investment Stages and Geography */}
                                    {(collaboratorProfile?.investment_stages && collaboratorProfile.investment_stages.length > 0) || (collaboratorProfile?.geography && collaboratorProfile.geography.length > 0) ? (
                                      <div className="flex flex-wrap items-center gap-2">
                                        {collaboratorProfile.investment_stages && collaboratorProfile.investment_stages.length > 0 && (
                                          <>
                                            <span className="text-xs font-medium text-slate-500">Investment Stages:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {collaboratorProfile.investment_stages.slice(0, 3).map((stage: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                                  {stage}
                                                </span>
                                              ))}
                                              {collaboratorProfile.investment_stages.length > 3 && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                  +{collaboratorProfile.investment_stages.length - 3} more
                                                </span>
                                              )}
                                            </div>
                                          </>
                                        )}
                                        {collaboratorProfile.geography && collaboratorProfile.geography.length > 0 && (
                                          <>
                                            {collaboratorProfile.investment_stages && collaboratorProfile.investment_stages.length > 0 && (
                                              <span className="text-slate-300 mx-1">•</span>
                                            )}
                                            <span className="text-xs font-medium text-slate-500">Geography:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {collaboratorProfile.geography.slice(0, 3).map((geo: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                                                  {geo}
                                                </span>
                                              ))}
                                              {collaboratorProfile.geography.length > 3 && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                  +{collaboratorProfile.geography.length - 3} more
                                                </span>
                                              )}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    ) : null}

                                    {/* Investment Thesis */}
                                    {collaboratorProfile?.investment_thesis && (
                                      <div>
                                        <div className="text-xs font-medium text-slate-500 mb-1">Investment Thesis</div>
                                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed line-clamp-2">{collaboratorProfile.investment_thesis}</p>
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* For Investment Advisors */}
                                {request.requester_type === 'Investment Advisor' && (
                                  <>
                                    {/* Service Types, Investment Stages, Domain, Geography */}
                                    {(collaboratorProfile?.service_types && collaboratorProfile.service_types.length > 0) || 
                                     (collaboratorProfile?.investment_stages && collaboratorProfile.investment_stages.length > 0) ||
                                     (collaboratorProfile?.domain && collaboratorProfile.domain.length > 0) ||
                                     (collaboratorProfile?.geography && collaboratorProfile.geography.length > 0) ? (
                                      <div className="space-y-2">
                                        {collaboratorProfile.service_types && collaboratorProfile.service_types.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-medium text-slate-500">Service Types:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {collaboratorProfile.service_types.slice(0, 3).map((type: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                                                  {type}
                                                </span>
                                              ))}
                                              {collaboratorProfile.service_types.length > 3 && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                  +{collaboratorProfile.service_types.length - 3} more
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        {collaboratorProfile.investment_stages && collaboratorProfile.investment_stages.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-medium text-slate-500">Investment Stages:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {collaboratorProfile.investment_stages.slice(0, 3).map((stage: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                                  {stage}
                                                </span>
                                              ))}
                                              {collaboratorProfile.investment_stages.length > 3 && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                  +{collaboratorProfile.investment_stages.length - 3} more
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        {collaboratorProfile.domain && collaboratorProfile.domain.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-medium text-slate-500">Domain:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {collaboratorProfile.domain.slice(0, 3).map((dom: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                                                  {dom}
                                                </span>
                                              ))}
                                              {collaboratorProfile.domain.length > 3 && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                  +{collaboratorProfile.domain.length - 3} more
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        {collaboratorProfile.geography && collaboratorProfile.geography.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-medium text-slate-500">Geography:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {collaboratorProfile.geography.slice(0, 3).map((geo: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                                                  {geo}
                                                </span>
                                              ))}
                                              {collaboratorProfile.geography.length > 3 && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                  +{collaboratorProfile.geography.length - 3} more
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : null}

                                    {/* Service Description */}
                                    {collaboratorProfile?.service_description && (
                                      <div>
                                        <div className="text-xs font-medium text-slate-500 mb-1">Service Description</div>
                                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed line-clamp-2">{collaboratorProfile.service_description}</p>
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* For Mentors */}
                                {request.requester_type === 'Mentor' && (
                                  <>
                                    {/* Expertise Areas, Sectors, Mentoring Stages */}
                                    {(collaboratorProfile?.expertise_areas && collaboratorProfile.expertise_areas.length > 0) ||
                                     (collaboratorProfile?.sectors && collaboratorProfile.sectors.length > 0) ||
                                     (collaboratorProfile?.mentoring_stages && collaboratorProfile.mentoring_stages.length > 0) ? (
                                      <div className="space-y-2">
                                        {collaboratorProfile.expertise_areas && collaboratorProfile.expertise_areas.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-medium text-slate-500">Expertise:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {collaboratorProfile.expertise_areas.slice(0, 3).map((area: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-medium rounded">
                                                  {area}
                                                </span>
                                              ))}
                                              {collaboratorProfile.expertise_areas.length > 3 && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                  +{collaboratorProfile.expertise_areas.length - 3} more
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        {collaboratorProfile.sectors && collaboratorProfile.sectors.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-medium text-slate-500">Sectors:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {collaboratorProfile.sectors.slice(0, 3).map((sector: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-pink-100 text-pink-800 text-xs font-medium rounded">
                                                  {sector}
                                                </span>
                                              ))}
                                              {collaboratorProfile.sectors.length > 3 && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                  +{collaboratorProfile.sectors.length - 3} more
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        {collaboratorProfile.mentoring_stages && collaboratorProfile.mentoring_stages.length > 0 && (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-medium text-slate-500">Mentoring Stages:</span>
                                            <div className="flex flex-wrap gap-1">
                                              {collaboratorProfile.mentoring_stages.slice(0, 3).map((stage: string, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 bg-teal-100 text-teal-800 text-xs font-medium rounded">
                                                  {stage}
                                                </span>
                                              ))}
                                              {collaboratorProfile.mentoring_stages.length > 3 && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                  +{collaboratorProfile.mentoring_stages.length - 3} more
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : null}

                                    {/* Mentoring Approach */}
                                    {collaboratorProfile?.mentoring_approach && (
                                      <div>
                                        <div className="text-xs font-medium text-slate-500 mb-1">Mentoring Approach</div>
                                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed line-clamp-2">{collaboratorProfile.mentoring_approach}</p>
                                      </div>
                                    )}

                                    {/* Companies Mentored */}
                                    {collaboratorProfile?.companies_mentored && (
                                      <div className="text-xs text-slate-600">
                                        <span className="font-medium">Companies Mentored:</span> {collaboratorProfile.companies_mentored}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>

                              {/* Request Details */}
                              <div className="mb-3 pb-3 border-b border-slate-200">
                                <div className="text-xs text-slate-600 mb-1">
                                  <span className="font-medium">Request Date:</span> {new Date(request.created_at).toLocaleDateString()}
                                </div>
                                {request.message && (
                                  <div className="text-xs text-slate-600 mt-1 line-clamp-2">
                                    <span className="font-medium">Message:</span> {request.message}
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-wrap items-center gap-2 mt-auto">
                                <button
                                  onClick={() => handleViewCollaborator(request)}
                                  className="flex-1 min-w-[90px] hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 border border-slate-200 bg-white px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center"
                                >
                                  <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View
                                </button>
                                <button
                                  onClick={() => handleAcceptCollaborationRequest(request)}
                                  disabled={isLoading}
                                  className="flex-1 min-w-[90px] transition-all duration-200 shadow text-white px-2 py-1.5 rounded-lg text-xs font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isLoading ? 'Accepting...' : 'Accept'}
                                </button>
                                <button
                                  onClick={() => handleRejectCollaborationRequest(request)}
                                  disabled={isLoading}
                                  className="flex-1 min-w-[90px] transition-all duration-200 border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 px-2 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isLoading ? 'Rejecting...' : 'Reject'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Investor Dashboard Modal */}
      {viewingInvestorDashboard && selectedInvestor && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 mx-auto p-4 border w-full max-w-7xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Investor Dashboard - {selectedInvestor.name || 'Investor'}
              </h3>
              <button
                onClick={handleCloseInvestorDashboard}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto">
              <InvestorView
                startups={investorDashboardData.investorStartups}
                newInvestments={investorDashboardData.investorInvestments}
                startupAdditionRequests={investorDashboardData.investorStartupAdditionRequests}
                investmentOffers={investorOffers}
                currentUser={selectedInvestor}
                onViewStartup={() => {}}
                onAcceptRequest={() => {}}
                onMakeOffer={() => {}}
                onUpdateOffer={() => {}}
                onCancelOffer={() => {}}
                isViewOnly={true}
                initialTab="dashboard"
              />
            </div>
          </div>
        </div>
      )}

      {/* Startup Dashboard Modal */}
      {viewingStartupDashboard && selectedStartup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 mx-auto p-4 border w-full max-w-7xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Startup Dashboard - {selectedStartup.name}
              </h3>
              <button
                onClick={handleCloseStartupDashboard}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto">
              <StartupHealthView
                startup={selectedStartup}
                userRole={currentUser?.role || 'Investment Advisor'}
                user={currentUser}
                onBack={handleCloseStartupDashboard}
                onActivateFundraising={() => {}}
                onInvestorAdded={() => {}}
                onUpdateFounders={() => {}}
                isViewOnly={true}
                investmentOffers={startupOffers}
                onProcessOffer={() => {}}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mandate Tab */}
      {activeTab === 'mandate' && (
        <div className="animate-fade-in max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Mandate</h2>
                <p className="text-sm text-slate-600">Create and manage investment mandates with specific criteria</p>
              </div>
              <Button onClick={handleAddMandate} size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Mandate
              </Button>
            </div>

            {/* Mandate Tabs */}
            {isLoadingMandates ? (
              <div className="text-center py-4 text-slate-500">Loading mandates...</div>
            ) : mandates.length === 0 ? (
              <Card className="text-center py-12">
                <Filter className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-800 mb-2">No Mandates Created</h3>
                <p className="text-slate-500 mb-4">Create your first mandate to filter startups based on your investment criteria</p>
                <Button onClick={handleAddMandate}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Your First Mandate
                </Button>
              </Card>
            ) : (
              <div className="border-b border-slate-200 mb-6">
                <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto pb-2" aria-label="Mandate Tabs">
                  {mandates.map((mandate) => (
                    <div
                      key={mandate.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedMandateId(mandate.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedMandateId(mandate.id);
                        }
                      }}
                      className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                        selectedMandateId === mandate.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Filter className="h-4 w-4" />
                      {mandate.name}
                      <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditMandate(mandate);
                          }}
                          className="p-1 hover:bg-slate-100 rounded"
                          title="Edit mandate"
                          type="button"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMandate(mandate.id);
                          }}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                          title="Delete mandate"
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </nav>
              </div>
            )}
          </div>

          {/* Filtered Startups Display for Selected Mandate */}
          {selectedMandateId ? (
            (() => {
              const selectedMandate = mandates.find(m => m.id === selectedMandateId);
              if (!selectedMandate) {
                return (
                  <Card className="text-center py-20">
                    <div className="max-w-sm mx-auto">
                      <Filter className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-slate-800 mb-2">Mandate Not Found</h3>
                      <p className="text-slate-500">Please select a valid mandate</p>
                    </div>
                  </Card>
                );
              }

              const filteredStartups = getFilteredMandateStartups(selectedMandate);
              
              if (isLoadingPitches) {
                return (
                  <Card className="text-center py-20">
                    <div className="max-w-sm mx-auto">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading Startups...</h3>
                      <p className="text-slate-500">Fetching active fundraising startups</p>
                    </div>
                  </Card>
                );
              }
              
              if (filteredStartups.length === 0) {
                return (
                  <Card className="text-center py-20">
                    <div className="max-w-sm mx-auto">
                      <Filter className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-slate-800 mb-2">No Startups Found</h3>
                      <p className="text-slate-500 mb-4">No startups match the criteria for "{selectedMandate.name}". Try adjusting the mandate filters or create a new mandate.</p>
                      <Button
                        variant="secondary"
                        onClick={() => handleEditMandate(selectedMandate)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Mandate Criteria
                      </Button>
                    </div>
                  </Card>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      Showing <span className="font-semibold text-slate-800">{filteredStartups.length}</span> startup{filteredStartups.length !== 1 ? 's' : ''} matching <span className="font-semibold text-blue-600">"{selectedMandate.name}"</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditMandate(selectedMandate)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Mandate
                    </Button>
                  </div>
                  {filteredStartups.map((startup) => {
                    const videoUrl = investorService.getYoutubeEmbedUrl(startup.pitchVideoUrl);
                    const isFavorited = favoritedPitches.has(startup.id);

                    return (
                      <Card key={startup.id} className="p-6">
                        <div className="flex flex-col md:flex-row gap-6">
                          {/* Video/Logo Section */}
                          <div className="md:w-1/3">
                            {videoUrl ? (
                              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
                                <iframe
                                  src={videoUrl}
                                  title={`Pitch video for ${startup.name}`}
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  className="absolute top-0 left-0 w-full h-full"
                                />
                              </div>
                            ) : startup.logoUrl && startup.logoUrl !== '#' ? (
                              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-white flex items-center justify-center">
                                <img
                                  src={startup.logoUrl}
                                  alt={`${startup.name} logo`}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-full aspect-video bg-slate-200 rounded-lg flex items-center justify-center">
                                <svg className="h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* Content Section */}
                          <div className="md:w-2/3 flex flex-col">
                            <div className="mb-3">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <h3 className="text-xl font-bold text-slate-800 flex-1">{startup.name}</h3>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge status={startup.complianceStatus} />
                                {startup.isStartupNationValidated && (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Verified
                                  </span>
                                )}
                                <span className="text-sm text-slate-600">{startup.sector}</span>
                              </div>
                            </div>

                            {/* Investment Details */}
                            <div className="mb-4">
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-500">Investment Ask:</span>
                                  <span className="text-xs font-medium text-slate-600">
                                    {investorService.formatCurrency(startup.investmentValue, startup.currency || 'USD')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-500">Equity:</span>
                                  <span className="text-xs font-medium text-slate-600">{startup.equityAllocation}%</span>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-500">Round Type:</span>
                                  <span className="text-xs font-medium text-slate-600">{startup.fundraisingType}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-500">Currency:</span>
                                  <span className="text-xs font-medium text-slate-600">{startup.currency || 'USD'}</span>
                                </div>
                                {startup.stage && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-slate-500">Stage:</span>
                                    <span className="text-xs font-medium text-slate-600">{startup.stage}</span>
                                  </div>
                                )}
                                {startup.domain && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-slate-500">Domain:</span>
                                    <span className="text-xs font-medium text-slate-600">{startup.domain}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-auto flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onViewStartup(startup.id, 'discovery')}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              );
            })()
          ) : null}
        </div>
      )}

      {/* Recommend Modal - Available from all tabs */}
      {showRecommendModal && selectedStartupForRecommendation && (
            <Modal
              isOpen={showRecommendModal}
              onClose={() => {
                setShowRecommendModal(false);
                setSelectedStartupForRecommendation(null);
                setSelectedInvestors(new Set());
                setSelectedCollaborators(new Set());
                setExistingRecommendations(new Set());
              }}
              title="Recommend"
              size="large"
            >
              <div className="space-y-4">
                {/* Startup Info */}
                {(() => {
                  const startup = startups.find(s => s.id === selectedStartupForRecommendation);
                  return startup ? (
                    <div className="bg-slate-50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-slate-600 mb-1">Startup:</p>
                      <p className="text-lg font-semibold text-slate-800">{startup.name}</p>
                      <p className="text-sm text-slate-600">{startup.sector}</p>
                    </div>
                  ) : null;
                })()}

                {/* Select All / Deselect All */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <p className="text-sm font-medium text-slate-700">
                    Select investors and collaborators to recommend this startup to:
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllAvailable}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Select Available
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={deselectAllRecipients}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                
                {/* Info about existing recommendations */}
                {existingRecommendations.size > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <CheckCircle className="h-3 w-3 inline mr-1" />
                      {existingRecommendations.size} recipient{existingRecommendations.size > 1 ? 's have' : ' has'} already received a recommendation for this startup.
                    </p>
                  </div>
                )}

                {/* Recipients List */}
                <div className="max-h-[500px] overflow-y-auto space-y-4">
                  {isLoadingRecommendations ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-sm text-slate-600">Loading recipients...</span>
                    </div>
                  ) : (
                    <>
                      {/* My Investors Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="h-4 w-4 text-blue-600" />
                          <h3 className="text-sm font-semibold text-slate-700">My Investors</h3>
                          <span className="text-xs text-slate-500">({myInvestors.length})</span>
                        </div>
                        {myInvestors.length === 0 ? (
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                            <p className="text-xs text-slate-500">No assigned investors</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {myInvestors.map((investor) => {
                              const isSelected = selectedInvestors.has(investor.id);
                              const alreadyRecommended = existingRecommendations.has(investor.id);
                              const isDisabled = alreadyRecommended;
                              
                              return (
                                <div
                                  key={investor.id}
                                  onClick={() => !isDisabled && toggleInvestorSelection(investor.id)}
                                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                    isDisabled
                                      ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                                      : isSelected
                                      ? 'bg-blue-50 border-blue-300 shadow-sm cursor-pointer'
                                      : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50 cursor-pointer'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    disabled={isDisabled}
                                    onChange={() => !isDisabled && toggleInvestorSelection(investor.id)}
                                    className={`w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 ${
                                      isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                                    }`}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className={`text-sm font-medium truncate ${
                                        isDisabled ? 'text-slate-500' : 'text-slate-800'
                                      }`}>
                                        {investor.name || investor.email || 'Unknown Investor'}
                                      </p>
                                      {alreadyRecommended && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                          Already Recommended
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {isSelected && !isDisabled && (
                                    <div className="flex-shrink-0">
                                      <CheckCircle className="h-5 w-5 text-blue-600" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* My Collaborators Section */}
                      <div className="border-t border-slate-200 pt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="h-4 w-4 text-purple-600" />
                          <h3 className="text-sm font-semibold text-slate-700">My Collaborators</h3>
                          <span className="text-xs text-slate-500">({acceptedCollaborators.length})</span>
                        </div>
                        {acceptedCollaborators.length === 0 ? (
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                            <p className="text-xs text-slate-500">No collaborators yet</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {acceptedCollaborators.map((collaborator) => {
                              const requesterUser = users.find(u => u.id === collaborator.requester_id);
                              const collaboratorProfile = collaboratorProfiles[collaborator.requester_id] || null;
                              const isSelected = selectedCollaborators.has(collaborator.requester_id);
                              const alreadyRecommended = existingRecommendations.has(collaborator.requester_id);
                              const isDisabled = alreadyRecommended;
                              
                              // Get collaborator name
                              const collaboratorName = requesterUser?.name || 
                                collaboratorProfile?.firm_name || 
                                collaboratorProfile?.investor_name || 
                                collaboratorProfile?.advisor_name || 
                                collaboratorProfile?.mentor_name || 
                                requesterUser?.email || 
                                'Unknown Collaborator';
                              
                              return (
                                <div
                                  key={collaborator.requester_id}
                                  onClick={() => !isDisabled && toggleCollaboratorSelection(collaborator.requester_id)}
                                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                    isDisabled
                                      ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                                      : isSelected
                                      ? 'bg-purple-50 border-purple-300 shadow-sm cursor-pointer'
                                      : 'bg-white border-slate-200 hover:border-purple-200 hover:bg-slate-50 cursor-pointer'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    disabled={isDisabled}
                                    onChange={() => !isDisabled && toggleCollaboratorSelection(collaborator.requester_id)}
                                    className={`w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 ${
                                      isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                                    }`}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className={`text-sm font-medium truncate ${
                                        isDisabled ? 'text-slate-500' : 'text-slate-800'
                                      }`}>
                                        {collaboratorName}
                                      </p>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                        {collaborator.requester_type}
                                      </span>
                                      {alreadyRecommended && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                          Already Recommended
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {isSelected && !isDisabled && (
                                    <div className="flex-shrink-0">
                                      <CheckCircle className="h-5 w-5 text-purple-600" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Selection Count */}
                {(selectedInvestors.size > 0 || selectedCollaborators.size > 0) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-blue-800">
                      {selectedInvestors.size + selectedCollaborators.size} recipient{(selectedInvestors.size + selectedCollaborators.size) > 1 ? 's' : ''} selected
                      {selectedInvestors.size > 0 && (
                        <span className="text-blue-600"> ({selectedInvestors.size} investor{selectedInvestors.size > 1 ? 's' : ''}</span>
                      )}
                      {selectedInvestors.size > 0 && selectedCollaborators.size > 0 && <span className="text-blue-600">, </span>}
                      {selectedCollaborators.size > 0 && (
                        <span className="text-blue-600">{selectedCollaborators.size} collaborator{selectedCollaborators.size > 1 ? 's' : ''}</span>
                      )}
                      {selectedInvestors.size > 0 && <span className="text-blue-600">)</span>}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRecommendModal(false);
                      setSelectedStartupForRecommendation(null);
                      setSelectedInvestors(new Set());
                      setSelectedCollaborators(new Set());
                      setExistingRecommendations(new Set());
                    }}
                    disabled={isLoading}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleSubmitRecommendations}
                    disabled={isLoading || (selectedInvestors.size === 0 && selectedCollaborators.size === 0)}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Recommending...
                      </>
                    ) : (
                      `Recommend to ${selectedInvestors.size + selectedCollaborators.size} Recipient${(selectedInvestors.size + selectedCollaborators.size) !== 1 ? 's' : ''}`
                    )}
                  </Button>
                </div>
              </div>
            </Modal>
          )}

          {/* Create/Edit Mandate Modal */}
          {showMandateModal && (
            <Modal
              isOpen={showMandateModal}
              onClose={() => {
                setShowMandateModal(false);
                setEditingMandate(null);
                setMandateFormData({
                  advisor_id: currentUser?.id || '',
                  name: '',
                  stage: '',
                  round_type: '',
                  domain: '',
                  amount_min: undefined,
                  amount_max: undefined,
                  equity_min: undefined,
                  equity_max: undefined
                });
              }}
              title={editingMandate ? 'Edit Mandate' : 'Create New Mandate'}
              size="small"
            >
              <div className="space-y-3">
                <Input
                  label="Mandate Name *"
                  value={mandateFormData.name}
                  onChange={(e) => setMandateFormData({ ...mandateFormData, name: e.target.value })}
                  placeholder="e.g., Early Stage SaaS, Healthcare Series A"
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Stage Filter */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Stage</label>
                    <select
                      value={mandateFormData.stage || ''}
                      onChange={(e) => setMandateFormData({ ...mandateFormData, stage: e.target.value || undefined })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">All Stages</option>
                      {mandateFilterOptions.stages.map(stage => (
                        <option key={stage} value={stage}>{stage}</option>
                      ))}
                    </select>
                  </div>

                  {/* Round Type Filter */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Round Type</label>
                    <select
                      value={mandateFormData.round_type || ''}
                      onChange={(e) => setMandateFormData({ ...mandateFormData, round_type: e.target.value || undefined })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">All Round Types</option>
                      {mandateFilterOptions.roundTypes.map(roundType => (
                        <option key={roundType} value={roundType}>{roundType}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Domain Filter */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Domain</label>
                  <select
                    value={mandateFormData.domain || ''}
                    onChange={(e) => setMandateFormData({ ...mandateFormData, domain: e.target.value || undefined })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">All Domains</option>
                    {mandateFilterOptions.domains.map(domain => (
                      <option key={domain} value={domain}>{domain}</option>
                    ))}
                  </select>
                </div>

                {/* Amount Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Min Investment Amount"
                    type="number"
                    value={mandateFormData.amount_min || ''}
                    onChange={(e) => setMandateFormData({ ...mandateFormData, amount_min: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="Min amount"
                  />
                  <Input
                    label="Max Investment Amount"
                    type="number"
                    value={mandateFormData.amount_max || ''}
                    onChange={(e) => setMandateFormData({ ...mandateFormData, amount_max: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="Max amount"
                  />
                </div>

                {/* Equity Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Min Equity %"
                    type="number"
                    value={mandateFormData.equity_min || ''}
                    onChange={(e) => setMandateFormData({ ...mandateFormData, equity_min: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="Min equity"
                    min="0"
                    max="100"
                  />
                  <Input
                    label="Max Equity %"
                    type="number"
                    value={mandateFormData.equity_max || ''}
                    onChange={(e) => setMandateFormData({ ...mandateFormData, equity_max: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="Max equity"
                    min="0"
                    max="100"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowMandateModal(false);
                      setEditingMandate(null);
                      setMandateFormData({
                        advisor_id: currentUser?.id || '',
                        name: '',
                        stage: '',
                        round_type: '',
                        domain: '',
                        amount_min: undefined,
                        amount_max: undefined,
                        equity_min: undefined,
                        equity_max: undefined
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveMandate}>
                    {editingMandate ? 'Update Mandate' : 'Create Mandate'}
                  </Button>
                </div>
              </div>
            </Modal>
      )}
    </div>
  );
};

export default InvestmentAdvisorView;