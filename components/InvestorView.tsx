import React, { useState, useEffect } from 'react';
import { Startup, NewInvestment, ComplianceStatus, StartupAdditionRequest, InvestmentType, InvestmentOffer } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import PortfolioDistributionChart from './charts/PortfolioDistributionChart';
import Modal from './ui/Modal';
import Input from './ui/Input';
import { TrendingUp, DollarSign, CheckSquare, Eye, PlusCircle, Activity, FileText, Video, Users, Heart, CheckCircle, LayoutGrid, Film, Edit, X, Clock, CheckCircle2, Shield, Menu, User, Settings, LogOut, Star, Search, Share2, Briefcase, Filter, Linkedin, Globe, ExternalLink, HelpCircle, Save, Bell, UserCheck, XCircle } from 'lucide-react';
import { getQueryParam, setQueryParam } from '../lib/urlState';
import { investorService, ActiveFundraisingStartup } from '../lib/investorService';
import { investmentService } from '../lib/database';
import { currencyRates } from '../lib/currencyUtils';
import ProfilePage from './ProfilePage';
import AdvisorAwareLogo from './AdvisorAwareLogo';
import ContactDetailsModal from './ContactDetailsModal';
import { supabase } from '../lib/supabase';
import { paymentService } from '../lib/paymentService';
import InvestorProfileForm from './investor/InvestorProfileForm';
import InvestorCard from './investor/InvestorCard';
import { generalDataService } from '../lib/generalDataService';
import { investorMandateService, InvestorMandate, CreateInvestorMandate } from '../lib/investorMandateService';
import { getVideoEmbedUrl } from '../lib/videoUtils';
import { investorAddedStartupService, InvestorAddedStartup, CreateInvestorAddedStartup } from '../lib/investorAddedStartupService';
import { investorConnectionRequestService, InvestorConnectionRequest } from '../lib/investorConnectionRequestService';
import { advisorConnectionRequestService, AdvisorConnectionRequest } from '../lib/advisorConnectionRequestService';

interface InvestorViewProps {
  startups: Startup[];
  newInvestments: NewInvestment[];
  startupAdditionRequests: StartupAdditionRequest[];
  investmentOffers: InvestmentOffer[];
  currentUser?: { id: string; email: string; investorCode?: string; investor_code?: string };
  onViewStartup: (startup: Startup) => void;
  onAcceptRequest: (id: number) => void;
  onMakeOffer: (opportunity: NewInvestment, offerAmount: number, equityPercentage: number, currency?: string, wantsCoInvestment?: boolean, coInvestmentOpportunityId?: number) => void;
  onUpdateOffer?: (offerId: number, offerAmount: number, equityPercentage: number) => void;
  onCancelOffer?: (offerId: number) => void;
  isViewOnly?: boolean;
  initialTab?: 'dashboard' | 'reels' | 'mandate' | 'offers' | 'portfolio' | 'requests' | 'collaboration';
}

const SummaryCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <Card className="flex-1">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
            </div>
            <div className="p-3 bg-brand-light rounded-full">
                {icon}
            </div>
        </div>
    </Card>
);

const InvestorView: React.FC<InvestorViewProps> = ({ 
    startups, 
    newInvestments, 
    startupAdditionRequests, 
    investmentOffers,
    currentUser,
    onViewStartup, 
    onAcceptRequest, 
    onMakeOffer,
    onUpdateOffer,
    onCancelOffer,
    isViewOnly = false,
    initialTab
}) => {
    const formatCurrency = (value: number, currency: string = 'INR') => {
      try {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency, notation: 'compact' }).format(value);
      } catch (error) {
        // Fallback to INR if currency is invalid
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' }).format(value);
      }
    };
    
    

    const handleShare = async (startup: ActiveFundraisingStartup) => {
        console.log('Share button clicked for startup:', startup.name);
        console.log('Startup object:', startup);
        // Build a SEO-friendly public shareable link to the startup page
        const { createSlug, createProfileUrl } = await import('../lib/slugUtils');
        const startupName = startup.name || 'Startup';
        const slug = createSlug(startupName);
        const baseUrl = window.location.origin;
        const shareUrl = createProfileUrl(baseUrl, 'startup', slug, String(startup.id));
        const details = `Startup: ${startup.name || 'N/A'}\nSector: ${startup.sector || 'N/A'}\nAsk: $${(startup.investmentValue || 0).toLocaleString()} for ${startup.equityAllocation || 0}% equity\n\nView startup: ${shareUrl}`;
        console.log('Share details:', details);
        try {
            if (navigator.share) {
                console.log('Using native share API');
                const shareData = {
                    title: startup.name || 'Startup Pitch',
                    text: details,
                    url: shareUrl
                };
                await navigator.share(shareData);
            } else if (navigator.clipboard && navigator.clipboard.writeText) {
                console.log('Using clipboard API');
                await navigator.clipboard.writeText(shareUrl);
                alert('Startup link copied to clipboard');
            } else {
                console.log('Using fallback copy method');
                // Fallback: hidden textarea copy
                const textarea = document.createElement('textarea');
                textarea.value = shareUrl;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                alert('Startup link copied to clipboard');
            }
        } catch (err) {
            console.error('Share failed', err);
            if (err instanceof Error && err.name === 'AbortError') {
                // User cancelled the share dialog; don't show an error
                return;
            }
            alert('Unable to share. Try copying manually.');
        }
    };
    
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
    const [selectedOpportunity, setSelectedOpportunity] = useState<ActiveFundraisingStartup | null>(null);
    const [selectedCurrency, setSelectedCurrency] = useState<string>('INR');
    const [wantsCoInvestment, setWantsCoInvestment] = useState<boolean>(false);
    const [isCoInvestmentOffer, setIsCoInvestmentOffer] = useState<boolean>(false); // Track if offer is for existing co-investment opportunity
    
    // Get available currencies from the currency rates
    const getAvailableCurrencies = () => {
        return Object.keys(currencyRates).map(code => ({
            code,
            name: getCurrencyName(code)
        }));
    };
    
    // Get currency display name
    const getCurrencyName = (code: string): string => {
        const currencyNames: { [key: string]: string } = {
            'EUR': 'Euro',
            'USD': 'US Dollar',
            'INR': 'Indian Rupee',
            'GBP': 'British Pound',
            'CAD': 'Canadian Dollar',
            'AUD': 'Australian Dollar',
            'SGD': 'Singapore Dollar',
            'JPY': 'Japanese Yen',
            'CNY': 'Chinese Yuan',
            'BRL': 'Brazilian Real',
            'MXN': 'Mexican Peso',
            'ZAR': 'South African Rand',
            'NGN': 'Nigerian Naira',
            'KES': 'Kenyan Shilling',
            'EGP': 'Egyptian Pound',
            'AED': 'UAE Dirham',
            'SAR': 'Saudi Riyal',
            'ILS': 'Israeli Shekel'
        };
        return currencyNames[code] || code;
    };
    const [selectedPitchId, setSelectedPitchId] = useState<number | null>(() => {
      const fromUrl = getQueryParam('pitchId');
      return fromUrl ? Number(fromUrl) : null;
    });
    const [activeTab, setActiveTab] = useState<'dashboard' | 'reels' | 'mandate' | 'offers' | 'portfolio' | 'requests' | 'collaboration'>(() => {
      // If initialTab is provided (e.g., from modal), use it
      if (initialTab) {
        return initialTab;
      }
      // Otherwise, try to get from URL, default to 'dashboard'
      const fromUrl = (getQueryParam('tab') as any) || 'dashboard';
      const valid = ['dashboard','reels','mandate','offers','portfolio','requests','collaboration'];
      return valid.includes(fromUrl) ? fromUrl : 'dashboard';
    });
    useEffect(() => {
      setQueryParam('tab', activeTab, true);
    }, [activeTab]);

    // Keep selected pitch in URL when on reels tab
    useEffect(() => {
      if (activeTab === 'reels') {
        setQueryParam('pitchId', selectedPitchId ? String(selectedPitchId) : '', true);
      }
    }, [selectedPitchId, activeTab]);
    const [activeFundraisingStartups, setActiveFundraisingStartups] = useState<ActiveFundraisingStartup[]>([]);
    const [recommendedOpportunities, setRecommendedOpportunities] = useState<any[]>([]);
    const [shuffledPitches, setShuffledPitches] = useState<ActiveFundraisingStartup[]>([]);
    const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);
    
    // State for contact details modal
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [contactModalOffer, setContactModalOffer] = useState<InvestmentOffer | null>(null);
  
  // State for co-investment offer details modal
  const [isCoInvestmentDetailsModalOpen, setIsCoInvestmentDetailsModalOpen] = useState(false);
  const [coInvestmentDetails, setCoInvestmentDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
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
    
    // Discovery sub-tab state
    const [discoverySubTab, setDiscoverySubTab] = useState<'all' | 'verified' | 'favorites' | 'due-diligence' | 'recommended' | 'co-investment'>('all');
    // Collaboration sub-tab state
    const [collaborationSubTab, setCollaborationSubTab] = useState<'my-collaborators' | 'requests'>('my-collaborators');
    
    // Co-investment opportunities state (for discover page)
    const [coInvestmentOpportunities, setCoInvestmentOpportunities] = useState<any[]>([]);
    const [isLoadingCoInvestment, setIsLoadingCoInvestment] = useState(false);
    
    // Mandate state
    const [mandates, setMandates] = useState<InvestorMandate[]>([]);
    const [selectedMandateId, setSelectedMandateId] = useState<number | null>(null);
    const [isLoadingMandates, setIsLoadingMandates] = useState(false);
    const [showMandateModal, setShowMandateModal] = useState(false);
    const [editingMandate, setEditingMandate] = useState<InvestorMandate | null>(null);
    const [connectionRequests, setConnectionRequests] = useState<InvestorConnectionRequest[]>([]);
    const [collaboratorRequests, setCollaboratorRequests] = useState<InvestorConnectionRequest[]>([]);
    const [collaborators, setCollaborators] = useState<InvestorConnectionRequest[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [allowStartupRequests, setAllowStartupRequests] = useState<boolean>(true);
    const [isSavingToggle, setIsSavingToggle] = useState(false);
    const [startupProfiles, setStartupProfiles] = useState<{ [key: number]: ActiveFundraisingStartup }>({});
    const [loadingStartupProfiles, setLoadingStartupProfiles] = useState<Set<number>>(new Set());
    const [showRecommendModal, setShowRecommendModal] = useState(false);
    const [startupToRecommend, setStartupToRecommend] = useState<ActiveFundraisingStartup | null>(null);
    const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string | null>(null);
    const [isSendingRecommendation, setIsSendingRecommendation] = useState(false);
    const [mandateFormData, setMandateFormData] = useState<CreateInvestorMandate>({
        investor_id: currentUser?.id || '',
        name: '',
        stage: '',
        round_type: '',
        domain: '',
        country: '',
        amount_min: undefined,
        amount_max: undefined,
        equity_min: undefined,
        equity_max: undefined
    });
    const [mandateFilterOptions, setMandateFilterOptions] = useState({
      stages: [] as string[],
      roundTypes: [] as string[],
      domains: [] as string[],
      countries: [] as string[]
    });
    const [isLoadingMandateFilters, setIsLoadingMandateFilters] = useState(false);
    
    // Investor Added Startups state
    const [investorAddedStartups, setInvestorAddedStartups] = useState<InvestorAddedStartup[]>([]);
    const [isLoadingAddedStartups, setIsLoadingAddedStartups] = useState(false);
    const [showAddStartupModal, setShowAddStartupModal] = useState(false);
    const [editingAddedStartup, setEditingAddedStartup] = useState<InvestorAddedStartup | null>(null);
    const [addStartupFormData, setAddStartupFormData] = useState<CreateInvestorAddedStartup>({
      investor_id: currentUser?.id || '',
      startup_name: '',
      sector: '',
      website_url: '',
      contact_email: '',
      contact_name: '',
      contact_number: '',
      current_valuation: undefined,
      investment_amount: undefined,
      equity_percentage: undefined,
      investment_date: undefined,
      currency: 'USD',
      notes: ''
    });
    const [sectors, setSectors] = useState<string[]>([]);
    const [loadingSectors, setLoadingSectors] = useState(false);
    const [currencies, setCurrencies] = useState<Array<{ code: string; name: string }>>([]);
    const [loadingCurrencies, setLoadingCurrencies] = useState(false);
    
    // State for editing offers
    const [isEditOfferModalOpen, setIsEditOfferModalOpen] = useState(false);
    const [selectedOffer, setSelectedOffer] = useState<InvestmentOffer | null>(null);
    const [editOfferAmount, setEditOfferAmount] = useState('');
    const [editOfferEquity, setEditOfferEquity] = useState('');

    const [isLoadingInvestments, setIsLoadingInvestments] = useState(false);
    const [expandedVideoOfferId, setExpandedVideoOfferId] = useState<number | null>(null);

    // Profile page state (same as CA/CS)
    const [showProfilePage, setShowProfilePage] = useState(false);

    // Recommendations state
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

    // Investor profiles state
    const [investorProfiles, setInvestorProfiles] = useState<any[]>([]);
    const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
    const [showInvestorCards, setShowInvestorCards] = useState(false);
    const [previewProfile, setPreviewProfile] = useState<any>(null);

    // Load all investor profiles
    const loadInvestorProfiles = async () => {
      setIsLoadingProfiles(true);
      try {
        const { data, error } = await supabase
          .from('investor_profiles')
          .select(`
            *,
            user:users!investor_profiles_user_id_fkey (
              id,
              name,
              email
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading investor profiles:', error);
          return;
        }

        setInvestorProfiles(data || []);
      } catch (error) {
        console.error('Error loading investor profiles:', error);
      } finally {
        setIsLoadingProfiles(false);
      }
    };
  // Co-investment opportunities created by this investor
  const [myCoInvestmentOpps, setMyCoInvestmentOpps] = useState<any[]>([]);
  const [startupNames, setStartupNames] = useState<Record<number, string>>({});
  const [isLoadingMyOpps, setIsLoadingMyOpps] = useState<boolean>(false);
  
  // Co-investment offers pending lead investor approval
  const [pendingCoInvestmentOffers, setPendingCoInvestmentOffers] = useState<any[]>([]);
  const [isLoadingPendingOffers, setIsLoadingPendingOffers] = useState<boolean>(false);

  // Fetch recommendations or all active co-investment opportunities
  const fetchRecommendations = async () => {
    if (!currentUser?.id) return;
    try {
      setIsLoadingRecommendations(true);
      
      // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const authUserId = authUser?.id || currentUser.id;
      
      // If investor has advisor code, show advisor recommendations; otherwise show all active opportunities
      const hasAdvisor = !!((currentUser as any).investment_advisor_code || (currentUser as any).investment_advisor_code_entered);
      if (hasAdvisor) {
        // Fetch recommendations with startup_id by querying the table directly
        // Note: investment_advisor_id is auth_user_id, fetch advisor name separately from user_profiles
        const { data: recData, error: recError } = await supabase
          .from('investment_advisor_recommendations')
          .select(`
            id,
            startup_id,
            investment_advisor_id,
            recommended_deal_value,
            recommended_valuation,
            recommendation_notes,
            status,
            created_at,
            startup:startups(name, sector, current_valuation, investment_value, equity_allocation)
          `)
          .eq('investor_id', authUserId) // Use auth.uid() instead of profile ID
          .order('created_at', { ascending: false });
        
        // Fetch advisor names separately from user_profiles
        if (recData && recData.length > 0) {
          const advisorIds = [...new Set(recData.map((r: any) => r.investment_advisor_id).filter(Boolean))];
          if (advisorIds.length > 0) {
            const { data: advisorData } = await supabase
              .from('user_profiles')
              .select('auth_user_id, name')
              .in('auth_user_id', advisorIds);
            
            if (advisorData) {
              const advisorMap = new Map(advisorData.map((a: any) => [a.auth_user_id, a.name]));
              recData.forEach((rec: any) => {
                rec.investment_advisor = { name: advisorMap.get(rec.investment_advisor_id) || 'Unknown Advisor' };
              });
            }
          }
        }
        
        if (recError) {
          console.error('Error fetching recommendations:', recError);
          setRecommendations([]);
        } else {
          // Fetch fundraising_details for all startup_ids in parallel
          const startupIds = (recData || []).map((row: any) => row.startup_id).filter(Boolean);
          let fundraisingMap: Record<number, { value: number; equity: number }> = {};
          
          if (startupIds.length > 0) {
            try {
              const { data: fdData } = await supabase
                .from('fundraising_details')
                .select('startup_id, value, equity')
                .in('startup_id', startupIds)
                .eq('active', true);
              
              if (fdData) {
                fdData.forEach((fd: any) => {
                  if (!fundraisingMap[fd.startup_id] || Number(fd.value) > Number(fundraisingMap[fd.startup_id].value)) {
                    fundraisingMap[fd.startup_id] = {
                      value: Number(fd.value) || 0,
                      equity: Number(fd.equity) || 0
                    };
                  }
                });
              }
            } catch (fdError) {
              console.error('Error fetching fundraising_details:', fdError);
            }
          }
          
          // Normalize the data to match expected structure
          const normalized = (recData || []).map((row: any) => {
            // Get ask amount and equity - priority: recommended_deal_value > fundraising_details > startups table
            const fundraising = fundraisingMap[row.startup_id];
            const askAmount = row.recommended_deal_value || fundraising?.value || row.startup?.investment_value || 0;
            const equity = fundraising?.equity || row.startup?.equity_allocation || 0;
            
            return {
              id: row.id,
              startup_id: row.startup_id,
              startup_name: row.startup?.name,
              startup_sector: row.startup?.sector,
              startup_valuation: row.startup?.current_valuation || row.recommended_valuation,
              recommended_deal_value: row.recommended_deal_value,
              recommended_valuation: row.recommended_valuation,
              // Include ask amount and equity from fundraising_details
              investment_amount: askAmount,
              equity_percentage: equity,
              recommendation_notes: row.recommendation_notes,
              advisor_name: row.investment_advisor?.name || 'Unknown Advisor',
              status: row.status,
              created_at: row.created_at,
              recommended_at: row.created_at
            };
          });
          setRecommendations(normalized);
        }
      } else {
        // Public: fetch all active co-investment opportunities
        const { data, error } = await supabase
          .from('co_investment_opportunities')
          .select('id,startup_id,investment_amount,equity_percentage,status,stage,created_at, startup:startups(name, sector, investment_value, equity_allocation)')
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Error fetching active co-investment opportunities:', error);
          setRecommendations([]);
        } else {
          // Fetch fundraising_details for all startup_ids in parallel if needed
          const startupIds = (data || []).map((row: any) => row.startup_id).filter(Boolean);
          let fundraisingMap: Record<number, { value: number; equity: number }> = {};
          
          // Only fetch if we need fallback values (when investment_amount or equity_percentage is missing)
          const needsFallback = (data || []).some((row: any) => !row.investment_amount || !row.equity_percentage);
          
          if (needsFallback && startupIds.length > 0) {
            try {
              const { data: fdData } = await supabase
                .from('fundraising_details')
                .select('startup_id, value, equity')
                .in('startup_id', startupIds)
                .eq('active', true);
              
              if (fdData) {
                fdData.forEach((fd: any) => {
                  if (!fundraisingMap[fd.startup_id] || Number(fd.value) > Number(fundraisingMap[fd.startup_id].value)) {
                    fundraisingMap[fd.startup_id] = {
                      value: Number(fd.value) || 0,
                      equity: Number(fd.equity) || 0
                    };
                  }
                });
              }
            } catch (fdError) {
              console.error('Error fetching fundraising_details:', fdError);
            }
          }
          
          // Normalize to expected fields used by the table
          const normalized = (data || []).map((row: any) => {
            // Get ask amount and equity - prioritize co_investment_opportunities values, fallback to fundraising_details or startups table
            const fundraising = fundraisingMap[row.startup_id];
            const askAmount = row.investment_amount || fundraising?.value || row.startup?.investment_value || 0;
            const equity = row.equity_percentage || fundraising?.equity || row.startup?.equity_allocation || 0;
            
            return {
              recommendation_id: row.id,
              id: row.id,
              startup_id: row.startup_id,
              startup_name: row.startup?.name,
              startup_sector: row.startup?.sector,
              sector: row.startup?.sector,
              compliance_status: `Stage ${row.stage || 1}`,
              investment_amount: askAmount,
              equity_percentage: equity,
              advisor_name: '—',
              recommended_at: row.created_at,
              created_at: row.created_at,
              opportunity_id: row.id
            };
          });
          setRecommendations(normalized);
        }
      }
    } catch (error) {
      console.error('Error fetching recommendations/opportunities:', error);
      setRecommendations([]);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

    // Logout handler
    const handleLogout = () => {
      // Redirect to logout or call parent logout function
      window.location.href = '/logout';
    };


    // Profile update handler
    const handleProfileUpdate = (updatedUser: any) => {
      console.log('Profile updated in InvestorView:', updatedUser);
      // You can add logic here to update the currentUser state if needed
      // This would require passing a callback from the parent App component
    };

    // Fetch active fundraising startups when component mounts
    useEffect(() => {
        const fetchActiveFundraisingStartups = async () => {
            setIsLoadingPitches(true);
            try {
                const startups = await investorService.getActiveFundraisingStartups();
                setActiveFundraisingStartups(startups);
            } catch (error) {
                console.error('Error fetching active fundraising startups:', error);
            } finally {
                setIsLoadingPitches(false);
            }
        };

        fetchActiveFundraisingStartups();
    }, []);

    // Load favorited pitches from database
    useEffect(() => {
        const loadFavorites = async () => {
            if (!currentUser?.id) return;
            
            try {
                // Get auth user ID (required for foreign key constraint)
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser) return;
                const authUserId = authUser.id;
                
                const { data, error } = await supabase
                    .from('investor_favorites')
                    .select('startup_id')
                    .eq('investor_id', authUserId); // Use auth user ID, not profile ID
                
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

    // Load ALL active co-investment opportunities (not just recommended ones)
    useEffect(() => {
        const loadRecommendedOpportunities = async () => {
            if (currentUser?.id) {
                try {
                    // Fetch all active co-investment opportunities with lead investor name
                    console.log('🔍 Fetching co-investment opportunities for user:', currentUser.id);
                    const { data, error } = await supabase
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
                            created_at,
                            startup:startups!fk_startup_id(id, name, sector),
                            listed_by_user_id
                        `)
                        .eq('status', 'active')
                        .eq('stage', 4)  // Only show fully approved opportunities (after all approvals)
                        .eq('startup_approval_status', 'approved')  // Only show startup-approved opportunities
                        .order('created_at', { ascending: false });
                    
                    console.log('🔍 Co-investment opportunities fetch result:', { data, error, count: data?.length || 0 });
                    
                    if (error) {
                        console.error('Error fetching co-investment opportunities with join:', error);
                        // Fallback: try without join if RLS blocks it
                        const { data: fallbackData, error: fallbackError } = await supabase
                            .from('co_investment_opportunities')
                            .select('*')
                            .eq('status', 'active')
                            .eq('stage', 4)  // Only show fully approved opportunities (after all approvals)
                            .eq('startup_approval_status', 'approved')  // Only show startup-approved opportunities
                            .order('created_at', { ascending: false });
                        
                        if (fallbackError) {
                            console.error('Fallback fetch also failed:', fallbackError);
                            setRecommendedOpportunities([]);
                        } else {
                            // Fetch user names separately
                            const userIds = Array.from(new Set((fallbackData || []).map((row: any) => row.listed_by_user_id).filter(Boolean)));
                            const userMap: Record<string, { name: string; email: string }> = {};
                            
                            if (userIds.length > 0) {
                                const { data: usersData } = await supabase
                                    .from('users')
                                    .select('id, name, email')
                                    .in('id', userIds);
                                
                                if (usersData) {
                                    usersData.forEach((user: any) => {
                                        userMap[user.id] = { name: user.name || 'Unknown', email: user.email || '' };
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
                            
                            // Normalize fallback data with fetched user and startup names
                            const normalized = (fallbackData || []).map((row: any) => ({
                                recommendation_id: row.id,
                                startup_name: startupMap[row.startup_id]?.name || 'Unknown Startup',
                                sector: startupMap[row.startup_id]?.sector || 'Unknown',
                                compliance_status: `Stage ${row.stage || 1}`,
                                investment_amount: row.investment_amount,
                                equity_percentage: row.equity_percentage,
                                minimum_co_investment: row.minimum_co_investment,
                                maximum_co_investment: row.maximum_co_investment,
                                lead_investor_name: userMap[row.listed_by_user_id]?.name || 'Unknown',
                                lead_investor_email: userMap[row.listed_by_user_id]?.email || null,
                                advisor_name: '—',
                                recommended_at: row.created_at,
                                created_at: row.created_at,
                                opportunity_id: row.id
                            }));
                            setRecommendedOpportunities(normalized);
                        }
                    } else {
                        // Normalize data with lead investor name
                        console.log('🔍 Normalizing co-investment opportunities data:', data?.length || 0);
                        const normalized = (data || []).map((row: any) => {
                            console.log('🔍 Processing opportunity:', {
                                id: row.id,
                                startup: row.startup,
                                listed_by_user: row.listed_by_user,
                                startup_name: row.startup?.name,
                                investor_name: row.listed_by_user?.name
                            });
                            return {
                                recommendation_id: row.id,
                                startup_id: row.startup_id,
                                startup_name: row.startup?.name || 'Unknown Startup',
                                sector: row.startup?.sector || 'Unknown',
                                compliance_status: `Stage ${row.stage || 1}`,
                                investment_amount: row.investment_amount,
                                equity_percentage: row.equity_percentage,
                                minimum_co_investment: row.minimum_co_investment,
                                maximum_co_investment: row.maximum_co_investment,
                                lead_investor_name: row.listed_by_user?.name || 'Unknown',
                                lead_investor_email: row.listed_by_user?.email || null,
                                advisor_name: '—',
                                recommended_at: row.created_at,
                                created_at: row.created_at,
                                opportunity_id: row.id
                            };
                        });
                        console.log('🔍 Normalized opportunities:', normalized);
                        setRecommendedOpportunities(normalized);
                    }
                } catch (error) {
                    console.error('Error loading co-investment opportunities:', error);
                    setRecommendedOpportunities([]);
                }
            }
        };

        loadRecommendedOpportunities();
    }, [currentUser?.id]);

  // Load co-investment opportunities created by this investor (for Offers tab)
  useEffect(() => {
    const loadMyCoInvestmentOpps = async () => {
      if (activeTab !== 'offers' || !currentUser?.id) return;
      try {
        setIsLoadingMyOpps(true);
        
        // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const authUserId = authUser?.id || currentUser.id;
        
        console.log('🔎 Loading my co-investment opps for user:', authUserId);
        const { data, error } = await supabase
          .from('co_investment_opportunities')
          .select(
            `id,startup_id,listed_by_user_id,listed_by_type,investment_amount,equity_percentage,minimum_co_investment,maximum_co_investment,description,status,stage,lead_investor_advisor_approval_status,startup_advisor_approval_status,startup_approval_status,created_at,updated_at, startup:startups!fk_startup_id(name, sector)`
          )
          .eq('listed_by_user_id', authUserId) // Use auth.uid() instead of profile ID
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Error fetching my co-investment opportunities:', error);
          // Retry without join in case of join-related RLS or schema issues
          const retry = await supabase
            .from('co_investment_opportunities')
            .select('*')
            .eq('listed_by_user_id', authUserId) // Use auth.uid() instead of profile ID
            .order('created_at', { ascending: false });
          if (retry.error) {
            console.error('Retry (no join) failed:', retry.error);
            setMyCoInvestmentOpps([]);
          } else {
            setMyCoInvestmentOpps(retry.data || []);
          }
        } else {
          // If empty, attempt fallback using possible alternate user id field
          if (!data || data.length === 0) {
            const fallbackUserId = (currentUser as any).user_id; // some profiles store auth uid in user_id
            if (fallbackUserId && typeof fallbackUserId === 'string') {
              const { data: data2, error: err2 } = await supabase
                .from('co_investment_opportunities')
                .select('*')
                .eq('listed_by_user_id', fallbackUserId)
                .order('created_at', { ascending: false });
              if (err2) {
                console.error('Fallback fetch error:', err2);
                setMyCoInvestmentOpps([]);
              } else {
                setMyCoInvestmentOpps(data2 || []);
              }
            } else {
              setMyCoInvestmentOpps([]);
            }
          } else {
            setMyCoInvestmentOpps(data || []);
          }
        }
      } catch (e) {
        console.error('Error loading my co-investment opportunities:', e);
        setMyCoInvestmentOpps([]);
      } finally {
        setIsLoadingMyOpps(false);
      }
    };

    loadMyCoInvestmentOpps();
  }, [activeTab, currentUser?.id]);

  // Resolve missing startup names if join was not allowed
  useEffect(() => {
    const fillMissingStartupNames = async () => {
      try {
        const missingIds = myCoInvestmentOpps
          .filter((o) => !o.startup?.name && !startupNames[o.startup_id])
          .map((o) => o.startup_id);
        const uniqueMissing = Array.from(new Set(missingIds)).filter(Boolean);
        if (uniqueMissing.length === 0) return;

        const { data, error } = await supabase
          .from('startups')
          .select('id,name')
          .in('id', uniqueMissing);
        if (error) {
          console.error('Failed to resolve startup names:', error);
          return;
        }
        const map: Record<number, string> = { ...startupNames };
        (data || []).forEach((row: any) => {
          map[row.id] = row.name;
        });
        setStartupNames(map);
      } catch (e) {
        console.error('Error resolving startup names:', e);
      }
    };
    if (activeTab === 'offers' && myCoInvestmentOpps.length > 0) {
      fillMissingStartupNames();
    }
  }, [activeTab, myCoInvestmentOpps, startupNames]);

  // Load co-investment offers pending lead investor approval
  useEffect(() => {
    const loadPendingCoInvestmentOffers = async () => {
      if (activeTab !== 'offers' || !currentUser?.id) return;
      try {
        setIsLoadingPendingOffers(true);
        console.log('🔍 Loading pending co-investment offers for lead investor:', currentUser.id);
        
        // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const authUserId = authUser?.id || currentUser.id;
        
        // Fetch co-investment offers that need this user's (lead investor's) approval
        // Now query from the new co_investment_offers table
        // Get co-investment opportunities created by this user
        const { data: myOpps } = await supabase
          .from('co_investment_opportunities')
          .select('id')
          .eq('listed_by_user_id', authUserId); // Use auth.uid() instead of profile ID
        
        if (!myOpps || myOpps.length === 0) {
          setPendingCoInvestmentOffers([]);
          return;
        }
        
        const myOppIds = myOpps.map(opp => opp.id);
        
        // Fetch co-investment offers for this user's opportunities
        // IMPORTANT: Only show offers that have passed investor advisor approval
        // Only show offers that are ready for lead investor approval or beyond
        const { data: offersData, error: offersError } = await supabase
          .from('co_investment_offers')
          .select(`
            *,
            startup:startups(id, name, sector, currency),
            investor_id
          `)
          // Show offers where investor advisor has approved OR where investor has no advisor (not_required)
          .in('investor_advisor_approval_status', ['approved', 'not_required'])
          .in('status', ['pending_lead_investor_approval', 'pending_startup_approval', 'accepted', 'rejected']) // Only show offers ready for lead investor or already processed
          .in('co_investment_opportunity_id', myOppIds)
          .order('created_at', { ascending: false });
        
        if (offersError) {
          console.error('Error fetching pending co-investment offers:', offersError);
          // Fallback: try without join and fetch manually
          const { data: offersDataSimple, error: simpleError } = await supabase
            .from('co_investment_offers')
            .select('*')
            .eq('investor_advisor_approval_status', 'approved') // Must have investor advisor approval
            .in('status', ['pending_lead_investor_approval', 'pending_startup_approval', 'accepted', 'rejected']) // Only show offers ready for lead investor or already processed
            .in('co_investment_opportunity_id', myOppIds)
            .order('created_at', { ascending: false });
          
          if (simpleError) {
            console.error('Error fetching pending co-investment offers (simple):', simpleError);
            setPendingCoInvestmentOffers([]);
            return;
          }
          
          // Manually fetch startup and investor data
          const offersWithData = await Promise.all(
            (offersDataSimple || []).map(async (offer: any) => {
              const { data: startupData } = await supabase
                .from('startups')
                .select('id, name, sector, currency')
                .eq('name', offer.startup_name)
                .single();
              
              const { data: investorData } = await supabase
                .from('users')
                .select('id, name, email')
                .eq('email', offer.investor_email)
                .single();
              
              return {
                ...offer,
                startup: startupData || null,
                investor: investorData || null
              };
            })
          );
          
          setPendingCoInvestmentOffers(offersWithData);
          return;
        }
        
        // Format the offers data
        const offersWithData = (offersData || []).map((offer: any) => ({
          ...offer,
          startup: offer.startup || null,
          investor: offer.investor || null
        }));
        
        console.log('✅ Found pending co-investment offers:', offersWithData.length);
        setPendingCoInvestmentOffers(offersWithData);
      } catch (error) {
        console.error('Error loading pending co-investment offers:', error);
        setPendingCoInvestmentOffers([]);
      } finally {
        setIsLoadingPendingOffers(false);
      }
    };
    
    loadPendingCoInvestmentOffers();
  }, [activeTab, currentUser?.id, myCoInvestmentOpps]);

  // Fetch co-investment offer details
  const handleViewCoInvestmentDetails = async (offer: any) => {
    const offerId = offer.id || offer.co_investment_offer_id;
    if (!offerId) return;
    
    setIsLoadingDetails(true);
    setIsCoInvestmentDetailsModalOpen(true);
    
    try {
      console.log('🔍 Fetching co-investment offer details:', offerId);
      
      // Fetch the co-investment offer
      const { data: offerData, error: offerError } = await supabase
        .from('co_investment_offers')
        .select('*')
        .eq('id', offerId)
        .single();
      
      if (offerError || !offerData) {
        console.error('❌ Error fetching co-investment offer details:', offerError);
        throw offerError || new Error('Co-investment offer not found');
      }
      
      console.log('✅ Co-investment offer details fetched:', offerData);
      
      // Extract data from offer (using stored fields)
      const investorData = {
        id: offerData.investor_id,
        name: offerData.investor_name,
        email: offerData.investor_email,
        company_name: null
      };
      
      const startupData = {
        id: offerData.startup_id,
        name: offerData.startup_name,
        currency: offerData.currency || 'USD'
      };
      
      // Fetch opportunity data separately
      let opportunityData = null;
      let leadInvestorData = null;
      
      if (offerData.co_investment_opportunity_id) {
        console.log('🔍 Fetching co-investment opportunity:', offerData.co_investment_opportunity_id);
        const { data: opportunity, error: opportunityError } = await supabase
          .from('co_investment_opportunities')
          .select('id, investment_amount, equity_percentage, minimum_co_investment, maximum_co_investment, listed_by_user_id, listed_by_user_name, listed_by_user_email')
          .eq('id', offerData.co_investment_opportunity_id)
          .single();
        
        if (!opportunityError && opportunity) {
          opportunityData = opportunity;
          console.log('✅ Opportunity fetched:', opportunity);
          
          // Use stored lead investor info
          if (opportunity.listed_by_user_name || opportunity.listed_by_user_email) {
            leadInvestorData = {
              name: opportunity.listed_by_user_name,
              email: opportunity.listed_by_user_email,
              company_name: opportunity.listed_by_user_name
            };
            console.log('✅ Lead investor info from stored fields:', leadInvestorData);
          } else if (opportunity.listed_by_user_id) {
            // Fallback: Try RPC function
            try {
              const { data: leadInvestorRpc, error: rpcError } = await supabase.rpc('get_user_public_info', {
                p_user_id: String(opportunity.listed_by_user_id)
              });
              
              if (!rpcError && leadInvestorRpc) {
                leadInvestorData = typeof leadInvestorRpc === 'string' ? JSON.parse(leadInvestorRpc) : leadInvestorRpc;
                console.log('✅ Lead investor fetched via RPC:', leadInvestorData);
              }
            } catch (rpcErr) {
              console.warn('⚠️ RPC function not available:', rpcErr);
            }
          }
        }
      }
      
      // Calculate amounts
      const totalInvestment = Number(opportunityData?.investment_amount) || 0;
      const maximumCoInvestment = Number(opportunityData?.maximum_co_investment) || 0;
      const leadInvestorInvested = Math.max(totalInvestment - maximumCoInvestment, 0);
      const newOfferAmount = Number(offerData.offer_amount) || 0;
      const newEquityPercentage = Number(offerData.equity_percentage) || 0;
      const totalEquityPercentage = Number(opportunityData?.equity_percentage) || 0;
      
      // Calculate equity allocation
      const leadInvestorEquity = totalInvestment > 0 && totalEquityPercentage > 0 
        ? (totalEquityPercentage * (leadInvestorInvested / totalInvestment))
        : 0;
      
      // Combine all data
      const finalCoInvestmentDetails: any = {
        ...offerData,
        investor: investorData,
        startup: startupData,
        co_investment_opportunity: opportunityData ? {
          ...opportunityData,
          listed_by_user: leadInvestorData
        } : null,
        leadInvestor: leadInvestorData,
        leadInvestorInvested,
        remainingForCoInvestment: maximumCoInvestment,
        newOfferAmount,
        newEquityPercentage,
        totalInvestment,
        totalEquityPercentage,
        leadInvestorEquity,
        currency: offerData.currency || startupData?.currency || 'USD'
      };
      
      console.log('📦 Final co-investment details:', finalCoInvestmentDetails);
      setCoInvestmentDetails(finalCoInvestmentDetails);
      
    } catch (err) {
      console.error('Error loading co-investment details:', err);
      alert('Failed to load co-investment offer details. Please try again.');
      setIsCoInvestmentDetailsModalOpen(false);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Handle lead investor approval/rejection
  const handleLeadInvestorApproval = async (offerId: number, action: 'approve' | 'reject') => {
    if (!currentUser?.id) return;
    
    try {
      console.log(`🔍 Lead investor ${action}ing co-investment offer:`, offerId);
      const result = await investmentService.approveCoInvestmentOfferLeadInvestor(
        offerId,
        currentUser.id,
        action
      );
      
      console.log('✅ Lead investor approval result:', result);
      
      // Refresh co-investment offers after approval
      // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const authUserId = authUser?.id || currentUser.id;
      
      // This will reload the offers list including approved ones
      const { data: myOpps } = await supabase
        .from('co_investment_opportunities')
        .select('id')
        .eq('listed_by_user_id', authUserId); // Use auth.uid() instead of profile ID
      
      if (myOpps && myOpps.length > 0) {
        const myOppIds = myOpps.map(opp => opp.id);
        
        const { data: offersData, error: offersError } = await supabase
          .from('co_investment_offers')
          .select(`
            *,
            startup:startups(id, name, sector, currency),
            investor_id
          `)
          // Show offers where investor advisor has approved OR where investor has no advisor (not_required)
          .in('investor_advisor_approval_status', ['approved', 'not_required'])
          .in('status', ['pending_lead_investor_approval', 'pending_startup_approval', 'accepted', 'rejected']) // Only show offers ready for lead investor or already processed
          .in('co_investment_opportunity_id', myOppIds)
          .order('created_at', { ascending: false });
        
        if (!offersError && offersData) {
          // Fetch startup data manually if needed
          const offersWithData = offersData.map(offer => ({
            ...offer,
            startup: offer.startup || { id: offer.startup_id, name: offer.startup_name, sector: null, currency: offer.currency },
            investor: offer.investor || { id: offer.investor_id, name: offer.investor_name, email: offer.investor_email }
          }));
          
          setPendingCoInvestmentOffers(offersWithData);
        }
      }
      
      alert(`Co-investment offer ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
    } catch (error) {
      console.error('Error in lead investor approval:', error);
      alert(`Failed to ${action} co-investment offer. Please try again.`);
    }
  };

    // No separate investor investments list needed; approvals drive portfolio

    // Shuffle pitches when reels tab is active
    useEffect(() => {
        if (activeTab === 'reels' && activeFundraisingStartups.length > 0) {
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
            
            const shuffledVerified = shuffleArray(verified);
            const shuffledUnverified = shuffleArray(unverified);

            const result: ActiveFundraisingStartup[] = [];
            let i = 0, j = 0;
            // Interleave with a 2:1 ratio (approx 66%) for verified to unverified
            while (i < shuffledVerified.length || j < shuffledUnverified.length) {
                // Add 2 verified pitches if available
                if (i < shuffledVerified.length) result.push(shuffledVerified[i++]);
                if (i < shuffledVerified.length) result.push(shuffledVerified[i++]);
                
                // Add 1 unverified pitch if available
                if (j < shuffledUnverified.length) result.push(shuffledUnverified[j++]);
            }
            setShuffledPitches(result);
        }
    }, [activeFundraisingStartups, activeTab]);

    // Note: Recommendations are now only shown in the "reels" tab under "Recommended Startups" sub-tab

    // Fetch recommendations when discovery recommended sub-tab is active
    useEffect(() => {
        if (activeTab === 'reels' && discoverySubTab === 'recommended') {
            fetchRecommendations();
        }
    }, [activeTab, discoverySubTab, currentUser?.id]);
    
    // Fetch co-investment opportunities when discovery co-investment sub-tab is active
    useEffect(() => {
        const loadCoInvestmentOpportunities = async () => {
            if (activeTab === 'reels' && discoverySubTab === 'co-investment') {
                try {
                    setIsLoadingCoInvestment(true);
                    console.log('🔍 Fetching co-investment opportunities for discover page');
                    
                    const { data, error } = await supabase
                        .from('co_investment_opportunities')
                        .select(`
                            id,
                            startup_id,
                            listed_by_user_id,
                            investment_amount,
                            equity_percentage,
                            minimum_co_investment,
                            maximum_co_investment,
                            description,
                            status,
                            stage,
                            startup_approval_status,
                            created_at,
                            startup:startups!fk_startup_id(id, name, sector, currency),
                            listed_by_user_id
                        `)
                        .eq('status', 'active')
                        .eq('stage', 4)
                        .eq('startup_approval_status', 'approved')
                        .order('created_at', { ascending: false });
                    
                    if (error) {
                        console.error('Error fetching co-investment opportunities:', error);
                        setCoInvestmentOpportunities([]);
                        return;
                    }
                    
                    console.log('✅ Fetched co-investment opportunities:', data?.length || 0);
                    
                    // Calculate lead investor investment and remaining amount
                    const formatted = (data || []).map((opp: any) => {
                        const totalInvestment = Number(opp.investment_amount) || 0;
                        const remainingForCoInvestment = Number(opp.maximum_co_investment) || 0;
                        const leadInvestorInvested = totalInvestment - remainingForCoInvestment;
                        
                        return {
                            ...opp,
                            leadInvestorInvested,
                            remainingForCoInvestment,
                            totalInvestment
                        };
                    });
                    
                    setCoInvestmentOpportunities(formatted);
                } catch (err) {
                    console.error('Error loading co-investment opportunities:', err);
                    setCoInvestmentOpportunities([]);
                } finally {
                    setIsLoadingCoInvestment(false);
                }
            } else {
                setCoInvestmentOpportunities([]);
            }
        };
        
        loadCoInvestmentOpportunities();
    }, [activeTab, discoverySubTab, currentUser?.id]);

    useEffect(() => {
        const loadDueDiligenceAccess = async () => {
            if (!currentUser?.id) {
                setDueDiligenceStartups(new Set<number>());
                return;
            }
            try {
                // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
                const { data: { user: authUser } } = await supabase.auth.getUser();
                const authUserId = authUser?.id || currentUser.id;
                
                const { data, error } = await supabase
                    .from('due_diligence_requests')
                    .select('startup_id, status')
                    .eq('user_id', authUserId) // Use auth.uid() instead of profile ID
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

    // Load mandates and filter options
    useEffect(() => {
        const loadMandateData = async () => {
            if (activeTab === 'mandate') {
                // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser?.id) {
                    return;
                }
                const authUserId = authUser.id;

                setIsLoadingMandates(true);
                setIsLoadingMandateFilters(true);
                try {
                    // Load mandates
                    const mandatesData = await investorMandateService.getMandatesByInvestor(authUserId); // Use auth.uid() instead of profile ID
                    setMandates(mandatesData);
                    
                    // Select first mandate if available
                    if (mandatesData.length > 0 && !selectedMandateId) {
                        setSelectedMandateId(mandatesData[0].id);
                    }
                    
                    // Load filter options
                    const [stagesData, roundTypesData, domainsData, countriesData] = await Promise.all([
                        generalDataService.getItemsByCategory('stage'),
                        generalDataService.getItemsByCategory('round_type'),
                        generalDataService.getItemsByCategory('domain'),
                        generalDataService.getItemsByCategory('country')
                    ]);
                    
                    setMandateFilterOptions({
                        stages: stagesData.map(s => s.name),
                        roundTypes: roundTypesData.map(r => r.name),
                        domains: domainsData.map(d => d.name),
                        countries: countriesData.map(c => c.name)
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
    }, [activeTab]);

    // Load mandates when component mounts (for mandate tab)
    useEffect(() => {
        if (activeTab === 'mandate') {
            const loadMandates = async () => {
                // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser?.id) {
                    return;
                }
                const authUserId = authUser.id;

                const mandatesData = await investorMandateService.getMandatesByInvestor(authUserId); // Use auth.uid() instead of profile ID
                setMandates(mandatesData);
                if (mandatesData.length > 0 && !selectedMandateId) {
                    setSelectedMandateId(mandatesData[0].id);
                }
            };
            loadMandates();
        }
    }, [activeTab]);

    // Load investor added startups
    useEffect(() => {
        if (activeTab === 'dashboard' || activeTab === 'portfolio') {
            const loadAddedStartups = async () => {
                // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser?.id) {
                    return;
                }
                const authUserId = authUser.id;

                setIsLoadingAddedStartups(true);
                try {
                    const data = await investorAddedStartupService.getStartupsByInvestor(authUserId); // Use auth.uid() instead of profile ID
                    setInvestorAddedStartups(data);
                } catch (error) {
                    console.error('Error loading added startups:', error);
                } finally {
                    setIsLoadingAddedStartups(false);
                }
            };
            loadAddedStartups();
        }
    }, [activeTab]);

    // Load investor profile preference for startup requests
    useEffect(() => {
        if (currentUser?.id) {
            const loadProfilePreference = async () => {
                try {
                    // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
                    const { data: { user: authUser } } = await supabase.auth.getUser();
                    const authUserId = authUser?.id || currentUser.id;
                    
                    const { data, error } = await supabase
                        .from('investor_profiles')
                        .select('allow_startup_requests')
                        .eq('user_id', authUserId) // Use auth.uid() instead of profile ID
                        .maybeSingle();
                    
                    if (error && error.code !== 'PGRST116') {
                        console.error('Error loading profile preference:', error);
                        return;
                    }
                    
                    if (data) {
                        setAllowStartupRequests(data.allow_startup_requests !== false); // Default to true if null
                    }
                } catch (error) {
                    console.error('Error loading profile preference:', error);
                }
            };
            loadProfilePreference();
        }
    }, [currentUser?.id]);

    // Load mandates when requests tab is active
    useEffect(() => {
        if (activeTab === 'requests') {
            const loadMandates = async () => {
                try {
                    // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
                    const { data: { user: authUser } } = await supabase.auth.getUser();
                    if (!authUser?.id) {
                        return;
                    }
                    const authUserId = authUser.id;

                    const mandatesData = await investorMandateService.getMandatesByInvestor(authUserId, false); // Use auth.uid() instead of profile ID
                    setMandates(mandatesData);
                } catch (error) {
                    console.error('Error loading mandates:', error);
                }
            };
            loadMandates();
        }
    }, [activeTab]);

    // Function to calculate mandate match percentage
    const calculateMandateMatch = (startup: ActiveFundraisingStartup, mandate: InvestorMandate): number => {
        let matchScore = 0;
        let totalCriteria = 0;
        const weights = {
            domain: 25,
            amount: 25,
            equity: 20,
            roundType: 15,
            stage: 15
        };

        // Domain match (25%)
        if (mandate.domain) {
            totalCriteria += weights.domain;
            if (startup.domain && startup.domain.toLowerCase() === mandate.domain.toLowerCase()) {
                matchScore += weights.domain;
            } else if (startup.sector && startup.sector.toLowerCase() === mandate.domain.toLowerCase()) {
                matchScore += weights.domain;
            }
        }

        // Amount match (25%)
        if (mandate.amount_min !== undefined || mandate.amount_max !== undefined) {
            totalCriteria += weights.amount;
            const startupAmount = startup.investmentValue || 0;
            const minAmount = mandate.amount_min || 0;
            const maxAmount = mandate.amount_max || Infinity;
            
            if (startupAmount >= minAmount && startupAmount <= maxAmount) {
                matchScore += weights.amount; // Perfect match
            } else if (startupAmount > 0) {
                // Partial match based on how close it is
                const range = maxAmount - minAmount;
                if (range > 0) {
                    const distance = Math.min(
                        Math.abs(startupAmount - minAmount),
                        Math.abs(startupAmount - maxAmount)
                    );
                    const matchRatio = Math.max(0, 1 - (distance / range));
                    matchScore += weights.amount * matchRatio * 0.5; // Max 50% for partial match
                }
            }
        }

        // Equity match (20%)
        if (mandate.equity_min !== undefined || mandate.equity_max !== undefined) {
            totalCriteria += weights.equity;
            const startupEquity = startup.equityAllocation || 0;
            const minEquity = mandate.equity_min || 0;
            const maxEquity = mandate.equity_max || 100;
            
            if (startupEquity >= minEquity && startupEquity <= maxEquity) {
                matchScore += weights.equity; // Perfect match
            } else if (startupEquity > 0) {
                // Partial match
                const range = maxEquity - minEquity;
                if (range > 0) {
                    const distance = Math.min(
                        Math.abs(startupEquity - minEquity),
                        Math.abs(startupEquity - maxEquity)
                    );
                    const matchRatio = Math.max(0, 1 - (distance / range));
                    matchScore += weights.equity * matchRatio * 0.5; // Max 50% for partial match
                }
            }
        }

        // Round type match (15%)
        if (mandate.round_type) {
            totalCriteria += weights.roundType;
            if (startup.fundraisingType && startup.fundraisingType.toLowerCase() === mandate.round_type.toLowerCase()) {
                matchScore += weights.roundType;
            }
        }

        // Stage match (15%)
        if (mandate.stage) {
            totalCriteria += weights.stage;
            if (startup.stage && startup.stage.toLowerCase() === mandate.stage.toLowerCase()) {
                matchScore += weights.stage;
            }
        }

        // Calculate percentage
        if (totalCriteria === 0) return 0;
        return Math.round((matchScore / totalCriteria) * 100);
    };

    // Load connection requests and collaborators (prefetch for Discover tab)
    useEffect(() => {
        if (currentUser?.id && (activeTab === 'requests' || activeTab === 'collaboration' || activeTab === 'reels')) {
            const loadConnectionRequests = async () => {
                // Only show loading spinner for requests/collaboration tabs, not for reels (prefetch)
                if (activeTab === 'requests' || activeTab === 'collaboration') {
                    setLoadingRequests(true);
                }
                try {
                    // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
                    const { data: { user: authUser } } = await supabase.auth.getUser();
                    if (!authUser?.id) {
                        setLoadingRequests(false);
                        return;
                    }
                    const authUserId = authUser.id;

                    // Load from investor_connection_requests (for requests TO the investor)
                    const investorRequests = await investorConnectionRequestService.getRequestsForInvestor(authUserId); // Use auth.uid() instead of profile ID
                    const startupOnlyRequests = (investorRequests || []).filter(
                        r => r.requester_type === 'Startup' && !!r.startup_id
                    );
                    const collaboratorSide = (investorRequests || []).filter(
                        r => r.requester_type !== 'Startup'
                    );

                    // Also load from advisor_connection_requests (for requests FROM the investor TO advisors)
                    // This is where the investor appears as requester_id
                    let advisorRequests: AdvisorConnectionRequest[] = [];
                    try {
                        advisorRequests = await advisorConnectionRequestService.getRequestsByRequester(authUserId); // Use auth.uid() instead of profile ID
                    } catch (error) {
                        console.error('Error loading advisor connection requests:', error);
                    }

                    // Merge collaborator requests from both tables
                    // Convert advisor_connection_requests to match the format expected
                    const advisorCollaboratorRequests = advisorRequests
                        .filter(r => r.requester_type !== 'Startup')
                        .map(r => ({
                            ...r,
                            // Map advisor_id to investor_id for consistency in display
                            investor_id: r.advisor_id,
                            advisor_profile_url: r.collaborator_profile_url || undefined
                        } as any));

                    const allCollaboratorRequests = [...collaboratorSide, ...advisorCollaboratorRequests];

                    setConnectionRequests(startupOnlyRequests);
                    setCollaboratorRequests(allCollaboratorRequests);
                    // Always update collaborators list (needed for Recommend button in Discover tab)
                    // Include accepted requests from both tables
                    const acceptedFromInvestorTable = collaboratorSide.filter(r => r.status === 'accepted');
                    const acceptedFromAdvisorTable = advisorCollaboratorRequests.filter(r => r.status === 'accepted');
                    setCollaborators([...acceptedFromInvestorTable, ...acceptedFromAdvisorTable]);
                    
                    // Load startup profiles for startup requests (only for requests tab)
                    if (activeTab === 'requests') {
                        const startupRequests = startupOnlyRequests;
                        for (const request of startupRequests) {
                            if (request.startup_id && !startupProfiles[request.startup_id]) {
                                loadStartupProfile(request.startup_id);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error loading connection requests:', error);
                } finally {
                    if (activeTab === 'requests' || activeTab === 'collaboration') {
                        setLoadingRequests(false);
                    }
                }
            };
            loadConnectionRequests();
        }
    }, [currentUser?.id, activeTab]);

    const handleToggleStartupRequests = async () => {
        if (!currentUser?.id || isSavingToggle) return;
        
        const newValue = !allowStartupRequests;
        setIsSavingToggle(true);
        
        try {
            // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const authUserId = authUser?.id || currentUser.id;
            
            // First check if profile exists
            const { data: existingProfile, error: checkError } = await supabase
                .from('investor_profiles')
                .select('id')
                .eq('user_id', authUserId) // Use auth.uid() instead of profile ID
                .maybeSingle();
            
            if (checkError && checkError.code !== 'PGRST116') {
                console.error('Error checking profile:', checkError);
                alert('Failed to update preference. Please try again.');
                return;
            }
            
            if (existingProfile) {
                // Update existing profile
                const { error } = await supabase
                    .from('investor_profiles')
                    .update({ allow_startup_requests: newValue })
                    .eq('user_id', authUserId); // Use auth.uid() instead of profile ID
                
                if (error) {
                    console.error('Error updating preference:', error);
                    alert('Failed to update preference. Please try again.');
                    return;
                }
            } else {
                // Profile doesn't exist yet, create it with minimal required fields
                const { error } = await supabase
                    .from('investor_profiles')
                    .insert({
                        user_id: authUserId, // Use auth.uid() instead of profile ID
                        investor_name: currentUser.name || currentUser.email?.split('@')[0] || 'Investor',
                        allow_startup_requests: newValue
                    });
                
                if (error) {
                    console.error('Error creating profile preference:', error);
                    alert('Failed to update preference. Please try again.');
                    return;
                }
            }
            
            setAllowStartupRequests(newValue);
        } catch (error) {
            console.error('Error toggling preference:', error);
            alert('Failed to update preference. Please try again.');
        } finally {
            setIsSavingToggle(false);
        }
    };

    // Function to load startup profile with fundraising details
    const loadStartupProfile = async (startupId: number) => {
        if (loadingStartupProfiles.has(startupId)) return;
        
        setLoadingStartupProfiles(prev => new Set(prev).add(startupId));
        try {
            // Fetch startup data
            const { data: startupData, error: startupError } = await supabase
                .from('startups')
                .select('*')
                .eq('id', startupId)
                .single();

            if (startupError) throw startupError;

            // Fetch fundraising details (get latest, even if not active)
            const { data: fundraisingData, error: fundraisingError } = await supabase
                .from('fundraising_details')
                .select('*')
                .eq('startup_id', startupId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (fundraisingError && fundraisingError.code !== 'PGRST116') {
                console.error('Error loading fundraising details:', fundraisingError);
            }

            if (startupData) {
                // Convert to ActiveFundraisingStartup format
                const fundraising = fundraisingData || null;
                const startup = startupData as any;
                const activeStartup: ActiveFundraisingStartup = {
                    id: startup.id,
                    name: startup.name,
                    sector: startup.sector || fundraising?.domain || 'Not specified',
                    investmentValue: Number(fundraising?.value || 0),
                    equityAllocation: Number(fundraising?.equity || 0),
                    complianceStatus: (startup.compliance_status || 'Pending') as ComplianceStatus,
                    pitchDeckUrl: fundraising?.pitch_deck_url || undefined,
                    pitchVideoUrl: fundraising?.pitch_video_url || undefined,
                    logoUrl: startup.logo_url || undefined,
                    onePagerUrl: fundraising?.one_pager_url || undefined,
                    businessPlanUrl: fundraising?.business_plan_url || undefined,
                    websiteUrl: startup.website_url || undefined,
                    linkedInUrl: startup.linkedin_url || undefined,
                    fundraisingType: (fundraising?.type || startup.investment_type || 'Seed') as InvestmentType,
                    domain: fundraising?.domain || undefined,
                    stage: fundraising?.stage || undefined,
                    description: startup.description || undefined,
                    createdAt: startup.created_at || new Date().toISOString(),
                    fundraisingId: fundraising?.id?.toString() || '',
                    isStartupNationValidated: startup.startup_nation_validated || false,
                    validationDate: startup.validation_date || undefined,
                    currency: startup.currency || fundraising?.currency || 'USD'
                };

                setStartupProfiles(prev => ({
                    ...prev,
                    [startupId]: activeStartup
                }));
            }
        } catch (error) {
            console.error('Error loading startup profile:', error);
        } finally {
            setLoadingStartupProfiles(prev => {
                const next = new Set(prev);
                next.delete(startupId);
                return next;
            });
        }
    };

    // Load sectors for dropdown
    useEffect(() => {
        const loadSectors = async () => {
            setLoadingSectors(true);
            try {
                const sectorData = await generalDataService.getItemsByCategory('sector');
                const sectorNames = sectorData.map(s => s.name);
                setSectors(sectorNames);
            } catch (error) {
                console.error('Error loading sectors:', error);
                setSectors(['SaaS', 'E-commerce', 'FinTech', 'HealthTech', 'EdTech', 'AgriTech', 'AI/ML', 'Other']);
            } finally {
                setLoadingSectors(false);
            }
        };
        loadSectors();
    }, []);

    // Load currencies for dropdown
    useEffect(() => {
        const loadCurrencies = async () => {
            setLoadingCurrencies(true);
            try {
                const currencyData = await generalDataService.getItemsByCategory('currency');
                const currencyList = currencyData.map(c => ({
                    code: c.code || c.name,
                    name: c.name
                }));
                setCurrencies(currencyList);
            } catch (error) {
                console.error('Error loading currencies:', error);
                // Fallback to hardcoded list
                setCurrencies([
                    { code: 'USD', name: 'US Dollar' },
                    { code: 'INR', name: 'Indian Rupee' },
                    { code: 'EUR', name: 'Euro' },
                    { code: 'GBP', name: 'British Pound' }
                ]);
            } finally {
                setLoadingCurrencies(false);
            }
        };
        loadCurrencies();
    }, []);

    const totalFunding = startups.reduce((acc, s) => acc + s.totalFunding, 0);
    const totalRevenue = startups.reduce((acc, s) => acc + s.totalRevenue, 0);
    const compliantCount = startups.filter(s => s.complianceStatus === ComplianceStatus.Compliant).length;
    const complianceRate = startups.length > 0 ? (compliantCount / startups.length) * 100 : 0;

    // Filter startups based on selected mandate
    const getFilteredMandateStartups = (mandate: InvestorMandate | null): ActiveFundraisingStartup[] => {
        if (!mandate) return [];
        
        const normalize = (value?: string | null) => (value || '').trim().toLowerCase();
        const mandateRound = normalize(mandate.round_type);
        const mandateDomain = normalize(mandate.domain);
        const mandateStage = normalize(mandate.stage);
        const mandateCountry = normalize(mandate.country);
        
        let filtered = [...activeFundraisingStartups];

        // Filter by round type (fundraisingType) - case-insensitive
        if (mandateRound) {
            filtered = filtered.filter(startup => normalize(startup.fundraisingType) === mandateRound);
        }

        // Filter by domain/sector (allow partial, case-insensitive)
        if (mandateDomain) {
            filtered = filtered.filter(startup => {
                const sector = normalize(startup.sector);
                const domain = normalize((startup as any).domain);
                return sector.includes(mandateDomain) || domain.includes(mandateDomain);
            });
        }

        // Filter by stage (case-insensitive)
        if (mandateStage) {
            filtered = filtered.filter(startup => normalize(startup.stage) === mandateStage);
        }

        // Filter by country (case-insensitive)
        if (mandateCountry) {
            filtered = filtered.filter(startup => normalize((startup as any).country || (startup as any).country_of_registration) === mandateCountry);
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

        // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser?.id) {
            alert('User not found');
            return;
        }
        const authUserId = authUser.id;

        try {
            let result: InvestorMandate | null = null;
            
            if (editingMandate) {
                // Update existing mandate
                result = await investorMandateService.updateMandate(editingMandate.id, {
                    name: mandateFormData.name,
                    stage: mandateFormData.stage || undefined,
                    round_type: mandateFormData.round_type || undefined,
                    domain: mandateFormData.domain || undefined,
                    country: mandateFormData.country || undefined,
                    amount_min: mandateFormData.amount_min || undefined,
                    amount_max: mandateFormData.amount_max || undefined,
                    equity_min: mandateFormData.equity_min || undefined,
                    equity_max: mandateFormData.equity_max || undefined
                });
            } else {
                // Create new mandate
                result = await investorMandateService.createMandate({
                    ...mandateFormData,
                    country: mandateFormData.country || undefined,
                    investor_id: authUserId // Use auth.uid() instead of profile ID
                });
            }

            if (result) {
                // Reload mandates
                const updatedMandates = await investorMandateService.getMandatesByInvestor(authUserId); // Use auth.uid() instead of profile ID
                setMandates(updatedMandates);
                
                if (!editingMandate && result.id) {
                    setSelectedMandateId(result.id);
                }
                
                setShowMandateModal(false);
                setEditingMandate(null);
                setMandateFormData({
                    investor_id: authUserId, // Use auth.uid() instead of profile ID
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
            // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser?.id) {
                alert('User not found');
                return;
            }
            const authUserId = authUser.id;

            const success = await investorMandateService.hardDeleteMandate(mandateId);
            if (success) {
                const updatedMandates = await investorMandateService.getMandatesByInvestor(authUserId); // Use auth.uid() instead of profile ID
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
    const handleEditMandate = (mandate: InvestorMandate) => {
        setEditingMandate(mandate);
        setMandateFormData({
            investor_id: mandate.investor_id,
            name: mandate.name,
            stage: mandate.stage || '',
            round_type: mandate.round_type || '',
            domain: mandate.domain || '',
            country: mandate.country || '',
            amount_min: mandate.amount_min || undefined,
            amount_max: mandate.amount_max || undefined,
            equity_min: mandate.equity_min || undefined,
            equity_max: mandate.equity_max || undefined
        });
        setShowMandateModal(true);
    };

    // Handle add new mandate
    const handleAddMandate = async () => {
        // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser?.id) {
            alert('User not found');
            return;
        }
        const authUserId = authUser.id;

        setEditingMandate(null);
        setMandateFormData({
            investor_id: authUserId, // Use auth.uid() instead of profile ID
            name: '',
            stage: '',
            round_type: '',
            domain: '',
            country: '',
            amount_min: undefined,
            amount_max: undefined,
            equity_min: undefined,
            equity_max: undefined
        });
        setShowMandateModal(true);
    };

    // Handle save added startup
    const handleSaveAddedStartup = async () => {
        if (!addStartupFormData.startup_name.trim()) {
            alert('Please enter a startup name');
            return;
        }

        if (!addStartupFormData.contact_name?.trim()) {
            alert('Please enter a contact name');
            return;
        }

        if (!addStartupFormData.contact_email?.trim()) {
            alert('Please enter a contact email');
            return;
        }

        // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser?.id) {
            alert('User not found');
            return;
        }
        const authUserId = authUser.id;

        try {
            let result: InvestorAddedStartup | null = null;
            
            if (editingAddedStartup) {
                // Update existing startup
                result = await investorAddedStartupService.updateStartup(editingAddedStartup.id, {
                    startup_name: addStartupFormData.startup_name,
                    sector: addStartupFormData.sector || undefined,
                    website_url: addStartupFormData.website_url || undefined,
                    contact_email: addStartupFormData.contact_email,
                    contact_name: addStartupFormData.contact_name,
                    contact_number: addStartupFormData.contact_number || undefined,
                    current_valuation: addStartupFormData.current_valuation || undefined,
                    investment_amount: addStartupFormData.investment_amount || undefined,
                    equity_percentage: addStartupFormData.equity_percentage || undefined,
                    investment_date: addStartupFormData.investment_date || undefined,
                    currency: addStartupFormData.currency || 'USD',
                    notes: addStartupFormData.notes || undefined
                });
            } else {
                // Create new startup
                result = await investorAddedStartupService.createStartup({
                    ...addStartupFormData,
                    investor_id: authUserId // Use auth.uid() instead of profile ID
                });
            }

            if (result) {
                // Reload added startups
                const updatedStartups = await investorAddedStartupService.getStartupsByInvestor(authUserId); // Use auth.uid() instead of profile ID
                setInvestorAddedStartups(updatedStartups);
                
                setShowAddStartupModal(false);
                setEditingAddedStartup(null);
                setAddStartupFormData({
                  investor_id: authUserId, // Use auth.uid() instead of profile ID
                  startup_name: '',
                  sector: '',
                  website_url: '',
                  contact_email: '',
                  contact_name: '',
                  contact_number: '',
                  current_valuation: undefined,
                  investment_amount: undefined,
                  equity_percentage: undefined,
                  investment_date: undefined,
                  currency: 'USD',
                  notes: ''
                });
                alert(editingAddedStartup ? 'Startup updated successfully!' : 'Startup added successfully!');
            } else {
                alert('Failed to save startup');
            }
        } catch (error) {
            console.error('Error saving startup:', error);
            alert('Failed to save startup');
        }
    };

    // Handle delete added startup
    const handleDeleteAddedStartup = async (startupId: number) => {
        if (!confirm('Are you sure you want to delete this startup?')) {
            return;
        }

        try {
            // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser?.id) {
                alert('User not found');
                return;
            }
            const authUserId = authUser.id;

            const success = await investorAddedStartupService.deleteStartup(startupId);
            if (success) {
                const updatedStartups = await investorAddedStartupService.getStartupsByInvestor(authUserId); // Use auth.uid() instead of profile ID
                setInvestorAddedStartups(updatedStartups);
                alert('Startup deleted successfully!');
            } else {
                alert('Failed to delete startup');
            }
        } catch (error) {
            console.error('Error deleting startup:', error);
            alert('Failed to delete startup');
        }
    };

    // Handle invite to TMS
    const handleInviteToTMS = async (startupId: number) => {
        try {
            // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser?.id) {
                alert('User not found');
                return;
            }
            const authUserId = authUser.id;

            const success = await investorAddedStartupService.sendInviteToTMS(startupId);
            if (success) {
                const updatedStartups = await investorAddedStartupService.getStartupsByInvestor(authUserId); // Use auth.uid() instead of profile ID
                setInvestorAddedStartups(updatedStartups);
                alert('Invite sent to startup! They will receive an email invitation to join TMS.');
            } else {
                alert('Failed to send invite');
            }
        } catch (error) {
            console.error('Error sending invite:', error);
            alert('Failed to send invite');
        }
    };

    // Handle add new startup
    const handleAddStartup = () => {
        setEditingAddedStartup(null);
        setAddStartupFormData({
            investor_id: currentUser?.id || '',
            startup_name: '',
            sector: '',
            website_url: '',
            linkedin_url: '',
            contact_email: '',
            contact_name: '',
            description: '',
            current_valuation: undefined,
            investment_amount: undefined,
            equity_percentage: undefined,
            investment_date: undefined,
            currency: 'USD',
            notes: ''
        });
        setShowAddStartupModal(true);
    };

    // Handle edit added startup
    const handleEditAddedStartup = (startup: InvestorAddedStartup) => {
        setEditingAddedStartup(startup);
        setAddStartupFormData({
          investor_id: startup.investor_id,
          startup_name: startup.startup_name,
          sector: startup.sector || '',
          website_url: startup.website_url || '',
          contact_email: startup.contact_email || '',
          contact_name: startup.contact_name || '',
          contact_number: (startup as any).contact_number || '',
          current_valuation: startup.current_valuation || undefined,
          investment_amount: startup.investment_amount || undefined,
          equity_percentage: startup.equity_percentage || undefined,
          investment_date: startup.investment_date || undefined,
          currency: startup.currency || 'USD',
          notes: startup.notes || ''
        });
        setShowAddStartupModal(true);
    };

    const handleMakeOfferClick = (opportunity: ActiveFundraisingStartup, isFromCoInvestment: boolean = false, coInvestmentOpportunityId?: number) => {
        // Preserve coInvestmentOpportunityId if it exists in the opportunity object or is passed
        const opportunityWithCoInvestment = coInvestmentOpportunityId 
          ? {...opportunity, coInvestmentOpportunityId} as any
          : opportunity;
        setSelectedOpportunity(opportunityWithCoInvestment);
        setIsCoInvestmentOffer(isFromCoInvestment);
        setWantsCoInvestment(false); // Always reset to false - co-investment checkbox should not be checked when making offer for existing co-investment
        setIsOfferModalOpen(true);
    };
    
    const handleDueDiligenceClick = async (startup: ActiveFundraisingStartup) => {
        try {
            if (!currentUser?.id) {
                alert('Please log in to send a due diligence request.');
                return;
            }
            // If an approved/completed request already exists, allow access immediately
            const approved = await paymentService.hasApprovedDueDiligence(currentUser.id, String(startup.id));
            if (approved) {
                addStartupToDueDiligenceSet(startup.id);
                setApprovedDueDiligenceStartups(prev => new Set([...prev, startup.id]));
                // Open full Startup Dashboard (read-only) for due diligence review
                // Pass target tab hint to ensure dashboard is shown first
                (onViewStartup as any)(startup.id, 'dashboard');
                return;
            }
            // Otherwise, create a pending request (idempotent)
            await paymentService.createPendingDueDiligenceIfNeeded(currentUser.id, String(startup.id));
            addStartupToDueDiligenceSet(startup.id);
            alert('Due diligence request sent to the startup. You will gain access once the startup accepts.');
        } catch (e) {
            console.error('Due diligence request failed:', e);
            alert('Failed to send due diligence request. Please try again.');
        }
    };
    
    const handleOfferSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOpportunity) return;
        
        const form = e.currentTarget as HTMLFormElement;
        const offerAmountInput = form.elements.namedItem('offer-amount') as HTMLInputElement;
        const offerEquityInput = form.elements.namedItem('offer-equity') as HTMLInputElement;
        
        const offerAmount = Number(offerAmountInput.value);
        const equityPercentage = Number(offerEquityInput.value);

        // Convert ActiveFundraisingStartup to NewInvestment format for compatibility
        const newInvestment: NewInvestment = {
            id: selectedOpportunity.id,
            name: selectedOpportunity.name,
            investmentType: selectedOpportunity.investmentType || 'Seed' as any,
            investmentValue: selectedOpportunity.investmentValue,
            equityAllocation: selectedOpportunity.equityAllocation,
            sector: selectedOpportunity.sector,
            totalFunding: selectedOpportunity.totalFunding || 0,
            totalRevenue: selectedOpportunity.totalRevenue || 0,
            registrationDate: selectedOpportunity.registrationDate || new Date().toISOString().split('T')[0],
            complianceStatus: selectedOpportunity.complianceStatus,
            pitchDeckUrl: selectedOpportunity.pitchDeckUrl,
            pitchVideoUrl: selectedOpportunity.pitchVideoUrl
        };

        // When making offer for existing co-investment opportunity, don't pass wantsCoInvestment=true
        // because that would create a NEW co-investment opportunity
        // We only want to create a regular offer as a co-investor
        const shouldCreateCoInvestment = isCoInvestmentOffer ? false : wantsCoInvestment;
        const coInvestmentOpportunityId = isCoInvestmentOffer && (selectedOpportunity as any)?.coInvestmentOpportunityId 
          ? (selectedOpportunity as any).coInvestmentOpportunityId 
          : undefined;
        
        console.log('🔍 Submitting co-investment offer:', {
          isCoInvestmentOffer,
          selectedOpportunity: selectedOpportunity ? {
            id: selectedOpportunity.id,
            name: selectedOpportunity.name,
            coInvestmentOpportunityId: (selectedOpportunity as any)?.coInvestmentOpportunityId
          } : null,
          coInvestmentOpportunityId,
          shouldCreateCoInvestment,
          offerAmount,
          equityPercentage
        });
        
        onMakeOffer(newInvestment, offerAmount, equityPercentage, selectedCurrency, shouldCreateCoInvestment, coInvestmentOpportunityId);
        // After submitting, switch to Offers tab
        setActiveTab('offers');
        
        setIsOfferModalOpen(false);
        setSelectedOpportunity(null);
        setSelectedCurrency('INR');
        setWantsCoInvestment(false);
        setIsCoInvestmentOffer(false);
    };
    
    const handleFavoriteToggle = async (pitchId: number) => {
        if (isViewOnly) return; // Prevent favoriting in view-only mode
        
        // Get auth user ID (required for foreign key constraint)
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
            alert('Please log in to favorite startups.');
            return;
        }
        const authUserId = authUser.id;

        const isCurrentlyFavorited = favoritedPitches.has(pitchId);
        
        try {
            if (isCurrentlyFavorited) {
                // Remove favorite
                const { error } = await supabase
                    .from('investor_favorites')
                    .delete()
                    .eq('investor_id', authUserId) // Use auth user ID, not profile ID
                    .eq('startup_id', pitchId);
                
                if (error) throw error;
                
        setFavoritedPitches(prev => {
            const newSet = new Set(prev);
                newSet.delete(pitchId);
                    return newSet;
                });
            } else {
                // Add favorite
                const { error } = await supabase
                    .from('investor_favorites')
                    .insert([{
                        investor_id: authUserId, // Use auth user ID, not profile ID (satisfies foreign key)
                        startup_id: pitchId
                    }]);
                
                if (error) throw error;
                
                setFavoritedPitches(prev => {
                    const newSet = new Set(prev);
                newSet.add(pitchId);
            return newSet;
        });
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            alert('Failed to update favorite. Please try again.');
        }
    };

    // Due diligence payment flow removed

    // Handle editing offers
    const handleEditOffer = (offer: InvestmentOffer) => {
        if (isViewOnly) return; // Prevent editing in view-only mode
        setSelectedOffer(offer);
        setEditOfferAmount(offer.offerAmount.toString());
        setEditOfferEquity(offer.equityPercentage.toString());
        setIsEditOfferModalOpen(true);
    };

    const handleUpdateOffer = () => {
        if (!selectedOffer || !onUpdateOffer) return;
        
        const offerAmount = Number(editOfferAmount);
        const equityPercentage = Number(editOfferEquity);
        
        if (isNaN(offerAmount) || isNaN(equityPercentage) || offerAmount <= 0 || equityPercentage <= 0) {
            alert('Please enter valid amounts');
            return;
        }
        
        onUpdateOffer(selectedOffer.id, offerAmount, equityPercentage);
        setIsEditOfferModalOpen(false);
        setSelectedOffer(null);
    };

    const handleCancelOffer = (offerId: number) => {
        if (isViewOnly) return; // Prevent canceling in view-only mode
        if (onCancelOffer && confirm('Are you sure you want to cancel this offer?')) {
            onCancelOffer(offerId);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <Clock className="h-4 w-4 text-yellow-500" />;
            case 'approved':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'rejected':
                return <X className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'approved':
                return 'bg-green-100 text-green-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            case 'pending_investor_advisor_approval':
                return 'bg-blue-100 text-blue-800';
            case 'pending_startup_advisor_approval':
                return 'bg-purple-100 text-purple-800';
            case 'investor_advisor_approved':
                return 'bg-green-100 text-green-800';
            case 'startup_advisor_approved':
                return 'bg-green-100 text-green-800';
            case 'investor_advisor_rejected':
                return 'bg-red-100 text-red-800';
            case 'startup_advisor_rejected':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    
    const getStageStatusDisplay = (offer: any) => {
        // IMPORTANT: Check for rejections first (before checking stages)
        // Check advisor rejections first
        if (offer.investor_advisor_approval_status === 'rejected') {
            return {
                color: 'bg-red-100 text-red-800',
                text: '❌ Rejected by Investor Advisor',
                icon: '❌'
            };
        }
        if (offer.startup_advisor_approval_status === 'rejected') {
            return {
                color: 'bg-red-100 text-red-800',
                text: '❌ Rejected by Startup Advisor',
                icon: '❌'
            };
        }
        // Check for startup rejection (status='rejected' at stage 3)
        const offerStatus = offer.status || 'pending';
        if (offerStatus === 'rejected' && (offer.stage === 3 || offer.stage === 4)) {
            return {
                color: 'bg-red-100 text-red-800',
                text: '❌ Rejected by Startup',
                icon: '❌'
            };
        }
        
        // Check if this is a co-investment offer (either by flag or co_investment_opportunity_id)
        // OR if the user created a co-investment opportunity for this startup (lead investor)
        const isCoInvestmentOffer = !!(offer as any).is_co_investment || 
                                   !!(offer as any).co_investment_opportunity_id ||
                                   !!(offer as any).is_co_investment_related ||
                                   !!(offer as any).created_co_investment_opportunity_id;
        
        if (isCoInvestmentOffer) {
            // Co-investment offer flow: Investor Advisor → Lead Investor → Startup
            const status = offer.status || 'pending';
            
            if (status === 'pending_investor_advisor_approval') {
                return {
                    color: 'bg-blue-100 text-blue-800',
                    text: '🔵 Co-Investment: Investor Advisor Approval',
                    icon: '🔵'
                };
            }
            if (status === 'pending_lead_investor_approval') {
                return {
                    color: 'bg-orange-100 text-orange-800',
                    text: '🟠 Co-Investment: Lead Investor Approval',
                    icon: '🟠'
                };
            }
            if (status === 'pending_startup_approval') {
                return {
                    color: 'bg-green-100 text-green-800',
                    text: '🟢 Co-Investment: Startup Review',
                    icon: '🟢'
                };
            }
            if (status === 'investor_advisor_rejected') {
                return {
                    color: 'bg-red-100 text-red-800',
                    text: '❌ Rejected by Investor Advisor',
                    icon: '❌'
                };
            }
            if (status === 'lead_investor_rejected') {
                return {
                    color: 'bg-red-100 text-red-800',
                    text: '❌ Rejected by Lead Investor',
                    icon: '❌'
                };
            }
            if (status === 'accepted') {
                return {
                    color: 'bg-emerald-100 text-emerald-800',
                    text: '✅ Co-Investment: Accepted',
                    icon: '✅'
                };
            }
            if (status === 'rejected') {
                return {
                    color: 'bg-red-100 text-red-800',
                    text: '❌ Rejected by Startup',
                    icon: '❌'
                };
            }
        }
        
        // Regular offer flow: Investor Advisor → Startup Advisor → Startup
        // Get offer stage (default to 1 if not set)
        const offerStage = offer.stage || 1;
        
        // Check if investor has advisor
        const investorHasAdvisor = currentUser?.investment_advisor_code_entered || 
                                 (currentUser as any)?.investment_advisor_code;
        
        // Check if startup has advisor (from offer data)
        const startupHasAdvisor = offer.startup?.investment_advisor_code;
        
        // Determine the approval status to display based on stage AND advisor status
        if (offerStage === 1) {
            if (investorHasAdvisor) {
                return {
                    color: 'bg-blue-100 text-blue-800',
                    text: '🔵 Stage 1: Investor Advisor Approval',
                    icon: '🔵'
                };
            } else {
                return {
                    color: 'bg-yellow-100 text-yellow-800',
                    text: '⚡ Stage 1: Auto-Processing (No Advisor)',
                    icon: '⚡'
                };
            }
        }
        if (offerStage === 2) {
            if (startupHasAdvisor) {
                return {
                    color: 'bg-purple-100 text-purple-800',
                    text: '🟣 Stage 2: Startup Advisor Approval',
                    icon: '🟣'
                };
            } else {
                return {
                    color: 'bg-yellow-100 text-yellow-800',
                    text: '⚡ Stage 2: Auto-Processing (No Startup Advisor)',
                    icon: '⚡'
                };
            }
        }
        if (offerStage === 3) {
            return {
                color: 'bg-green-100 text-green-800',
                text: '✅ Stage 3: Ready for Startup Review',
                icon: '✅'
            };
        }
        if (offerStage === 4) {
            return {
                color: 'bg-green-100 text-green-800',
                text: '🎉 Stage 4: Accepted by Startup',
                icon: '🎉'
            };
        }
        
        return {
            color: 'bg-gray-100 text-gray-800',
            text: '❓ Unknown Status',
            icon: '❓'
        };
    };
    

    
  // If profile page is open, show it instead of main content
  if (showProfilePage) {
    console.log('🔍 InvestorView: Rendering ProfilePage, showProfilePage =', showProfilePage);
    return (
      <ProfilePage
        currentUser={currentUser}
        onBack={() => {
          console.log('🔍 InvestorView: Back button clicked, setting showProfilePage to false');
          setShowProfilePage(false);
        }}
        onProfileUpdate={(updatedUser) => {
          console.log('Profile updated in InvestorView:', updatedUser);
          // Update the currentUser in parent component if needed
          // But don't close the ProfilePage - let user stay there
          // The ProfilePage will handle its own state updates
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 sm:py-6">
            <div className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Investor Dashboard</h1>
            </div>
            <div className="flex items-center">
              {!isViewOnly && (
              <button
                onClick={() => {
                  console.log('🔍 InvestorView: Profile button clicked, setting showProfilePage to true');
                  setShowProfilePage(true);
                }}
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-200 font-medium text-sm sm:text-base"
                title="View Profile"
              >
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Profile</span>
              </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap space-x-2 sm:space-x-8 px-4 sm:px-6 overflow-x-auto" aria-label="Tabs">
                 <button
                    onClick={() => setActiveTab('dashboard')}
              className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                        activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <LayoutGrid className="h-5 w-5 mr-2" />
                    Dashboard
              </div>
                </button>
                <button
                    onClick={() => setActiveTab('reels')}
              className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                        activeTab === 'reels'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Film className="h-5 w-5 mr-2" />
                   Discover Pitches
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
                <Filter className="h-5 w-5 mr-2" />
                   Mandate
              </div>
                </button>
                <button
                    onClick={() => setActiveTab('offers')}
              className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                        activeTab === 'offers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                    Offers
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
                <Briefcase className="h-5 w-5 mr-2" />
                    Portfolio
              </div>
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
              className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap relative ${
                        activeTab === 'requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                    Requests
                {connectionRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-white bg-red-500 rounded-full">
                    {connectionRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </div>
                </button>
                <button
                    onClick={() => setActiveTab('collaboration')}
              className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap relative ${
                        activeTab === 'collaboration'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                    Collaboration
                {collaboratorRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-white bg-amber-500 rounded-full">
                    {collaboratorRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </div>
                </button>
            </nav>
        </div>
        </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-fade-in">
            {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard title="Total Funding" value={formatCurrency(totalFunding, 'USD')} icon={<DollarSign className="h-6 w-6 text-brand-primary" />} />
            <SummaryCard title="Total Revenue" value={formatCurrency(totalRevenue, 'USD')} icon={<TrendingUp className="h-6 w-6 text-brand-primary" />} />
            <SummaryCard title="Compliance Rate" value={`${complianceRate.toFixed(1)}%`} icon={<CheckSquare className="h-6 w-6 text-brand-primary" />} />
            <SummaryCard title="My Startups" value={`${startups.length}`} icon={<Users className="h-6 w-6 text-brand-primary" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                {/* Approve Startup Requests */}
                 <Card>
                    <h3 className="text-base sm:text-lg font-semibold mb-4 text-slate-700">Approve Startup Requests</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Value</th>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Equity</th>
                                    <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Status / Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {startupAdditionRequests
                                    .filter(req => {
                                        const code = (req as any)?.investor_code;
                                        const userCode = (currentUser as any)?.investorCode || (currentUser as any)?.investor_code;
                                        const isPending = (req.status || 'pending') === 'pending';
                                        // Only show pending requests that match investor code
                                        return isPending && code && code === userCode;
                                    })
                                    .map(req => (
                                    <tr key={req.id}>
                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-slate-900">{req.name}</td>
                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">{formatCurrency(req.investmentValue, (req as any).currency || 'USD')}</td>
                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">{req.equityAllocation}%</td>
                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                                            {!isViewOnly && (
                                            <Button size="sm" onClick={() => onAcceptRequest(req.id)}>
                                                <PlusCircle className="mr-2 h-4 w-4"/> Approve
                                            </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                 {startupAdditionRequests.filter(req => {
                                     const code = (req as any)?.investor_code;
                                     const userCode = (currentUser as any)?.investorCode || (currentUser as any)?.investor_code;
                                     const isPending = (req.status || 'pending') === 'pending';
                                     return isPending && code && code === userCode;
                                 }).length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-slate-500">No pending startup requests.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Old Table for New Investment Opportunities - can be removed or kept */}

                {/* My Startups Table */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-700">My Startups</h3>
                        {!isViewOnly && (
                            <Button onClick={handleAddStartup} size="sm">
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Add Startup
                            </Button>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Current Valuation</th>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Investment Amount</th>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Equity Percentage (%)</th>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {/* TMS Startups */}
                                {startups.map(startup => {
                                    // Try to get investment data from investment_records if available
                                    const investmentRecord = startup.investments?.find((inv: any) => {
                                        const investorCode = (currentUser as any)?.investorCode || (currentUser as any)?.investor_code;
                                        return inv.investor_code === investorCode;
                                    });
                                    const investmentAmount = investmentRecord?.amount || null;
                                    const equityPercentage = investmentRecord?.equity_allocated || null;
                                    
                                    return (
                                    <tr key={startup.id}>
                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                            <div className="text-xs sm:text-sm font-medium text-slate-900">{startup.name}</div>
                                            <div className="text-xs text-slate-500">{startup.sector}</div>
                                        </td>
                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">{formatCurrency(startup.currentValuation, startup.currency || 'USD')}</td>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                                {investmentAmount ? formatCurrency(investmentAmount, startup.currency || 'USD') : 'N/A'}
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                                {equityPercentage !== null && equityPercentage !== undefined ? `${equityPercentage}%` : 'N/A'}
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                                <Badge status={startup.complianceStatus} />
                                                <span className="ml-2 text-xs text-green-600">On TMS</span>
                                            </td>
                                        <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                                            {!isViewOnly && (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    onClick={() => {
                                                        onViewStartup(startup, 'dashboard');
                                                    }}
                                                >
                                                    <Eye className="mr-2 h-4 w-4" /> View
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                    );
                                })}
                                {/* Investor Added Startups (Not on TMS) */}
                                {isLoadingAddedStartups ? (
                                    <tr>
                                        <td colSpan={6} className="px-3 sm:px-6 py-4 text-center text-sm text-slate-500">
                                            Loading added startups...
                                        </td>
                                    </tr>
                                ) : investorAddedStartups.length > 0 ? (
                                    investorAddedStartups.map(addedStartup => (
                                        <tr key={`added-${addedStartup.id}`}>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                                <div className="text-xs sm:text-sm font-medium text-slate-900">{addedStartup.startup_name}</div>
                                                <div className="text-xs text-slate-500">{addedStartup.sector || 'N/A'}</div>
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                                {addedStartup.current_valuation ? formatCurrency(addedStartup.current_valuation, addedStartup.currency || 'USD') : 'N/A'}
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                                {addedStartup.investment_amount ? formatCurrency(addedStartup.investment_amount, addedStartup.currency || 'USD') : 'N/A'}
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                                {addedStartup.equity_percentage !== null && addedStartup.equity_percentage !== undefined ? `${addedStartup.equity_percentage}%` : 'N/A'}
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-slate-500">
                                                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                                                    {addedStartup.is_on_tms ? 'On TMS' : 'Not on TMS'}
                                                </span>
                                                {addedStartup.invite_status === 'sent' && (
                                                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                                        Invite Sent
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                                                {!isViewOnly && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        {!addedStartup.is_on_tms && (
                                                            <Button 
                                                                size="sm" 
                                                                variant="primary"
                                                                onClick={() => handleInviteToTMS(addedStartup.id)}
                                                                disabled={addedStartup.invite_status === 'sent'}
                                                            >
                                                                <Users className="mr-2 h-4 w-4" />
                                                                {addedStartup.invite_status === 'sent' ? 'Invite Sent' : 'Invite to TMS'}
                                                            </Button>
                                                        )}
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => handleEditAddedStartup(addedStartup)}
                                                        >
                                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            onClick={() => handleDeleteAddedStartup(addedStartup.id)}
                                                        >
                                                            <X className="mr-2 h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : null}
                                {startups.length === 0 && investorAddedStartups.length === 0 && !isLoadingAddedStartups && (
                                    <tr>
                                        <td colSpan={6} className="px-3 sm:px-6 py-8 text-center text-sm text-slate-500">
                                            No startups found. Click "Add Startup" to add a startup to your portfolio.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
            <div className="space-y-8">
                <PortfolioDistributionChart data={startups} />
            </div>
          </div>
        </div>
      )}

       {activeTab === 'reels' && (
        <div className="animate-fade-in max-w-6xl mx-auto w-full">
          {/* Enhanced Header */}
          <div className="mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Discover Pitches</h2>
              <p className="text-sm text-slate-600">Watch startup videos and explore opportunities</p>
            </div>
            
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search startups by name or sector..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                />
              </div>
            </div>
            
            {/* Discovery Sub-Tabs */}
            <div className="mb-6 border-b border-gray-200">
              <nav className="-mb-px flex space-x-2 sm:space-x-4 md:space-x-8 overflow-x-auto pb-2" aria-label="Discovery Tabs">
                  <button
                    onClick={() => {
                    setDiscoverySubTab('all');
                      setShowOnlyValidated(false);
                      setShowOnlyFavorites(false);
                      setShowOnlyDueDiligence(false);
                    }}
                  className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                    discoverySubTab === 'all'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Film className="h-3 w-3 sm:h-4 sm:w-4" />
                  All
                  </button>
                  
                  <button
                    onClick={() => {
                    setDiscoverySubTab('verified');
                      setShowOnlyValidated(true);
                      setShowOnlyFavorites(false);
                      setShowOnlyDueDiligence(false);
                    }}
                  className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                    discoverySubTab === 'verified'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>Verified</span>
                  </button>
                  
                  <button
                    onClick={() => {
                    setDiscoverySubTab('favorites');
                      setShowOnlyValidated(false);
                      setShowOnlyFavorites(true);
                      setShowOnlyDueDiligence(false);
                    }}
                  className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                    discoverySubTab === 'favorites'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${discoverySubTab === 'favorites' ? 'fill-current' : ''}`} />
                  <span className="hidden sm:inline">Favorites</span>
                  <span className="sm:hidden">Fav</span>
                  </button>
                
                <button
                  onClick={() => {
                    setDiscoverySubTab('due-diligence');
                    setShowOnlyValidated(false);
                    setShowOnlyFavorites(false);
                    setShowOnlyDueDiligence(true);
                  }}
                  className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                    discoverySubTab === 'due-diligence'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden md:inline">Due Diligence</span>
                  <span className="md:hidden">DD</span>
                </button>
                
                <button
                  onClick={() => {
                    setDiscoverySubTab('recommended');
                    setShowOnlyValidated(false);
                    setShowOnlyFavorites(false);
                    setShowOnlyDueDiligence(false);
                  }}
                  className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                    discoverySubTab === 'recommended'
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Star className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden lg:inline">Recommended Startups</span>
                  <span className="lg:hidden hidden md:inline">Recommended</span>
                  <span className="md:hidden">Rec</span>
                </button>
                
                <button
                  onClick={() => {
                    setDiscoverySubTab('co-investment');
                    setShowOnlyValidated(false);
                    setShowOnlyFavorites(false);
                    setShowOnlyDueDiligence(false);
                  }}
                  className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-1 sm:gap-2 ${
                    discoverySubTab === 'co-investment'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden md:inline">Co-Investment</span>
                  <span className="md:hidden">Co-Invest</span>
                </button>
              </nav>
                </div>
                
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 p-3 sm:p-4 rounded-xl border border-blue-100 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 text-slate-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs sm:text-sm font-medium">
                  {discoverySubTab === 'recommended' 
                    ? `${recommendations.length} recommended startups`
                  : discoverySubTab === 'co-investment'
                  ? `${coInvestmentOpportunities.length} co-investment opportunities`
                  : discoverySubTab === 'due-diligence'
                    ? `${dueDiligenceStartups.size} due diligence requests`
                    : `${activeFundraisingStartups.length} active pitches`}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-slate-500">
                <Film className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm">Pitch Reels</span>
              </div>
            </div>
          </div>
                
          <div className="space-y-6 sm:space-y-8">
            {(() => {
              // Show co-investment opportunities if co-investment sub-tab is active
              if (discoverySubTab === 'co-investment') {
                if (isLoadingCoInvestment) {
                  return (
                    <Card className="text-center py-20">
                      <div className="max-w-sm mx-auto">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading Co-Investment Opportunities...</h3>
                        <p className="text-slate-500">Fetching approved co-investment opportunities</p>
                      </div>
                    </Card>
                  );
                }
                
                if (coInvestmentOpportunities.length === 0) {
                  return (
                    <Card className="text-center py-20">
                      <div className="max-w-sm mx-auto">
                        <Users className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">No Co-Investment Opportunities</h3>
                        <p className="text-slate-500">
                          No approved co-investment opportunities available at this time. Check back later for new opportunities.
                        </p>
                      </div>
                    </Card>
                  );
                }
                
                // Display co-investment opportunities
                return (
                  <>
                    {coInvestmentOpportunities.map((opp: any) => {
                      const startupCurrency = opp.startup?.currency || 'USD';
                      const leadInvestorName = opp.listed_by_user?.name || 'Unknown Investor';
                      const leadInvestorInvested = opp.leadInvestorInvested || 0;
                      const remainingAmount = opp.remainingForCoInvestment || 0;
                      const totalInvestment = opp.totalInvestment || 0;
                      const equityPct = opp.equity_percentage || 0;
                      
                      return (
                        <Card key={opp.id} className="!p-0 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-white">
                          {/* Co-Investment Badge */}
                          <div className="absolute top-4 right-4 z-10 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
                            <Users className="h-3 w-3 fill-current" />
                            Co-Investment Opportunity
                          </div>
                          
                          {/* Startup Info Section */}
                          <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 border-b border-orange-100">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="text-2xl font-bold text-slate-800 mb-2">{opp.startup?.name || 'Unknown Startup'}</h3>
                                <p className="text-slate-600 font-medium">{opp.startup?.sector || 'Not specified'}</p>
                              </div>
                              <div className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-medium">
                                <CheckCircle className="h-3 w-3" />
                                Approved
                              </div>
                            </div>
                            
                            {/* Lead Investor Info */}
                            <div className="bg-white rounded-lg p-4 border border-orange-200 mb-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Users className="h-4 w-4 text-orange-600" />
                                <span className="text-sm font-semibold text-slate-700">Lead Investor:</span>
                                <span className="text-sm font-bold text-orange-700">{leadInvestorName}</span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 mt-3">
                                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                  <div className="text-xs text-slate-600 mb-1">Already Invested</div>
                                  <div className="text-lg font-bold text-blue-700">
                                    {investorService.formatCurrency(leadInvestorInvested, startupCurrency)}
                                  </div>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                  <div className="text-xs text-slate-600 mb-1">Remaining for Co-Investment</div>
                                  <div className="text-lg font-bold text-green-700">
                                    {investorService.formatCurrency(remainingAmount, startupCurrency)}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-3 pt-3 border-t border-orange-200">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-600">Total Investment Ask:</span>
                                  <span className="font-semibold text-slate-800">
                                    {investorService.formatCurrency(totalInvestment, startupCurrency)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm mt-1">
                                  <span className="text-slate-600">Equity:</span>
                                  <span className="font-semibold text-slate-800">{equityPct}%</span>
                                </div>
                                <div className="flex items-center justify-between text-sm mt-1">
                                  <span className="text-slate-600">Co-Investment Range:</span>
                                  <span className="font-semibold text-orange-700">
                                    {investorService.formatCurrency(opp.minimum_co_investment || 0, startupCurrency)} - {investorService.formatCurrency(opp.maximum_co_investment || 0, startupCurrency)}
                                  </span>
                                </div>
                              </div>
                              
                              {opp.description && (
                                <div className="mt-3 pt-3 border-t border-orange-200">
                                  <p className="text-xs text-slate-600 leading-relaxed">{opp.description}</p>
                                </div>
                              )}
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center gap-3">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => {
                                  // Find the startup in activeFundraisingStartups to navigate to the startup
                                  const matchedPitch = activeFundraisingStartups.find(pitch => 
                                    pitch.id === opp.startup_id || 
                                    pitch.name === opp.startup?.name
                                  );
                                  
                                  if (matchedPitch) {
                                    setActiveTab('reels');
                                    setSelectedPitchId(matchedPitch.id);
                                    setDiscoverySubTab('all');
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  } else {
                                    // If startup not found, try to view it directly
                                    const startup = startups.find(s => s.id === opp.startup_id);
                                    if (startup) {
                                      onViewStartup(startup);
                                    } else {
                                      alert(`Startup "${opp.startup?.name}" not found.`);
                                    }
                                  }
                                }}
                                className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 transition-all duration-200 shadow-lg shadow-orange-200"
                              >
                                <Eye className="h-4 w-4 mr-2" /> View Startup Profile
                              </Button>
                              
                              {/* Check if current user is the lead investor */}
                              {(() => {
                                const isLeadInvestor = currentUser?.id === opp.listed_by_user_id;
                                
                                if (isLeadInvestor) {
                                  // Lead investor cannot make offer on their own co-investment opportunity
                                  return (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      disabled
                                      className="flex-1 bg-gray-100 border border-gray-300 text-gray-500 cursor-not-allowed"
                                      title="You are the lead investor for this co-investment opportunity. You cannot make an offer on your own opportunity."
                                    >
                                      <DollarSign className="h-4 w-4 mr-2" /> You Created This Opportunity
                                    </Button>
                                  );
                                }
                                
                                // Regular investor can make offer
                                return (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                      // Find the startup and open make offer modal
                                      const matchedPitch = activeFundraisingStartups.find(pitch => 
                                        pitch.id === opp.startup_id || 
                                        pitch.name === opp.startup?.name
                                      );
                                      
                                      if (matchedPitch) {
                                        // Store the co-investment opportunity ID for later use
                                        console.log('🔍 Setting selectedOpportunity with co-investment ID:', {
                                          opportunityId: opp.id,
                                          matchedPitch: matchedPitch.name,
                                          matchedPitchId: matchedPitch.id
                                        });
                                        // Pass coInvestmentOpportunityId to handleMakeOfferClick so it's preserved
                                        handleMakeOfferClick(matchedPitch, true, opp.id); // true = this is an offer for existing co-investment opportunity
                                      } else {
                                        alert(`Startup "${opp.startup?.name}" is not currently fundraising.`);
                                      }
                                    }}
                                    className="flex-1 bg-white border border-orange-300 text-orange-700 hover:bg-orange-50 transition-all duration-200"
                                  >
                                    <DollarSign className="h-4 w-4 mr-2" /> Make Co-Investment Offer
                                  </Button>
                                );
                              })()}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </>
                );
              }
              
              // Show recommended startups if recommended sub-tab is active
              if (discoverySubTab === 'recommended') {
                if (isLoadingRecommendations) {
                  return (
                    <Card className="text-center py-20">
                      <div className="max-w-sm mx-auto">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading Recommended Startups...</h3>
                        <p className="text-slate-500">Fetching recommendations from your advisor</p>
                      </div>
                    </Card>
                  );
                }
                
                if (recommendations.length === 0) {
                  return (
                    <Card className="text-center py-20">
                      <div className="max-w-sm mx-auto">
                        <Star className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">No Recommended Startups</h3>
                        <p className="text-slate-500">
                          {((currentUser as any)?.investment_advisor_code || (currentUser as any)?.investment_advisor_code_entered)
                            ? 'Your investment advisor has not recommended any startups yet. Check back later for recommendations.'
                            : 'No recommendations available at this time.'}
                        </p>
                      </div>
                    </Card>
                  );
                }
                
                // Convert recommendations to ActiveFundraisingStartup format for display
                const recommendedStartupsForDisplay = recommendations.map(rec => {
                  // Find the corresponding startup in activeFundraisingStartups
                  const matchingStartup = activeFundraisingStartups.find(s => 
                    s.id === rec.startup_id || s.name === rec.startup_name
                  );
                  
                  if (matchingStartup) {
                    return matchingStartup;
                  }
                  
                  // Create a new ActiveFundraisingStartup from recommendation data
                  return {
                    id: rec.startup_id || rec.id || 0,
                    name: rec.startup_name || 'Unknown Startup',
                    investmentType: 'Seed' as InvestmentType,
                    investmentValue: rec.investment_amount || rec.recommended_deal_value || 0,
                    equityAllocation: rec.equity_percentage || 0,
                    sector: rec.startup_sector || rec.sector || 'Unknown',
                    totalFunding: 0,
                    totalRevenue: 0,
                    registrationDate: rec.created_at || new Date().toISOString().split('T')[0],
                    complianceStatus: ComplianceStatus.Pending,
                    currentValuation: rec.startup_valuation || rec.recommended_valuation || 0,
                    pitchDeckUrl: '',
                    pitchVideoUrl: '',
                    isStartupNationValidated: false,
                    fundraisingDetails: {
                      active: true,
                      type: 'Seed' as InvestmentType,
                      value: rec.investment_amount || rec.recommended_deal_value || 0,
                      equity: rec.equity_percentage || 0
                    }
                  } as ActiveFundraisingStartup;
                }).filter(s => s.id > 0); // Filter out invalid entries
                
                // Apply search filter to recommended startups
                let filteredRecommended = recommendedStartupsForDisplay;
                if (searchTerm.trim()) {
                  filteredRecommended = filteredRecommended.filter(inv => 
                    inv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    inv.sector.toLowerCase().includes(searchTerm.toLowerCase())
                  );
                }
                
                if (filteredRecommended.length === 0) {
                  return (
                    <Card className="text-center py-20">
                      <div className="max-w-sm mx-auto">
                        <Star className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">No Matching Startups</h3>
                        <p className="text-slate-500">No recommended startups found matching your search.</p>
                      </div>
                    </Card>
                  );
                }
                
                // Display recommended startups (use same card format as favorites tab)
                return (
                  <>
                    {filteredRecommended.map(inv => {
                      const videoUrl = investorService.getYoutubeEmbedUrl(inv.pitchVideoUrl);
                      const isFavorited = favoritedPitches.has(inv.id);
                      const hasDueDiligence = dueDiligenceStartups.has(inv.id);
                      const isApprovedDueDiligence = approvedDueDiligenceStartups.has(inv.id);
                      const rec = recommendations.find(r => r.startup_id === inv.id || r.startup_name === inv.name);

                      return (
                        <Card key={inv.id} className="p-6 relative">
                          {/* Recommended Badge */}
                          {rec && (
                            <div className="absolute top-4 right-4 z-10 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
                              <Star className="h-3 w-3 fill-current" />
                              Recommended
                            </div>
                          )}
                          
                          <div className="flex flex-col md:flex-row gap-6">
                            {/* Video/Logo Section */}
                            <div className="md:w-1/3">
                              {videoUrl ? (
                                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
                                  <iframe
                                    src={videoUrl}
                                    title={`Pitch video for ${inv.name}`}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="absolute top-0 left-0 w-full h-full"
                                  />
                                </div>
                              ) : inv.logoUrl && inv.logoUrl !== '#' ? (
                                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-white flex items-center justify-center">
                                  <img
                                    src={inv.logoUrl}
                                    alt={`${inv.name} logo`}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-full aspect-video bg-slate-200 rounded-lg flex items-center justify-center">
                                  <Video className="h-12 w-12 text-slate-400" />
                                </div>
                              )}
                            </div>

                            {/* Content Section */}
                            <div className="md:w-2/3 flex flex-col relative">
                              {/* Header Section */}
                              <div className="mb-3">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <h3 className="text-xl font-bold text-slate-800 flex-1">{inv.name}</h3>
                                  {!isViewOnly && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleShare(inv)}
                                      className="flex-shrink-0"
                                    >
                                      <Share2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge status={inv.complianceStatus} />
                                  {inv.isStartupNationValidated && (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" />
                                      Verified
                                    </span>
                                  )}
                                  <span className="text-sm text-slate-600">{inv.sector}</span>
                                  {rec?.advisor_name && rec.advisor_name !== '—' && (
                                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center gap-1">
                                      <Star className="h-3 w-3" />
                                      Recommended by {rec.advisor_name}
                                    </span>
                                  )}
                                </div>
                                {rec?.recommendation_notes && (
                                  <p className="text-xs text-slate-500 mt-2 italic">{rec.recommendation_notes}</p>
                                )}
                              </div>

                              {/* Investment Details */}
                              <div className="mb-4">
                                {/* Investment Ask and Equity in one line */}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-slate-500">Investment Ask:</span>
                                    <span className="text-xs font-medium text-slate-600">
                                      {investorService.formatCurrency(inv.investmentValue, inv.currency || 'USD')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-slate-500">Equity:</span>
                                    <span className="text-xs font-medium text-slate-600">{inv.equityAllocation}%</span>
                                  </div>
                                </div>
                                {/* Round Type, Currency, Stage, Domain in one line */}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                  {inv.fundraisingType && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-slate-500">Round Type:</span>
                                      <span className="text-xs font-medium text-slate-600">{inv.fundraisingType}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-slate-500">Currency:</span>
                                    <span className="text-xs font-medium text-slate-600">{inv.currency || 'USD'}</span>
                                  </div>
                                  {inv.stage && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-slate-500">Stage:</span>
                                      <span className="text-xs font-medium text-slate-600">{inv.stage}</span>
                                    </div>
                                  )}
                                  {inv.domain && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-slate-500">Domain:</span>
                                      <span className="text-xs font-medium text-slate-600">{inv.domain}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Links & Documents Section */}
                              <div className="mb-4 pb-3 border-b border-slate-200">
                                <div className="text-xs font-medium text-slate-500 mb-2">Links & Documents</div>
                                <div className="flex flex-wrap gap-2">
                                  {inv.websiteUrl && inv.websiteUrl !== '#' && (
                                    <a
                                      href={inv.websiteUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                    >
                                      <Globe className="h-3.5 w-3.5" />
                                      Website
                                      <ExternalLink className="h-3 w-3 opacity-50" />
                                    </a>
                                  )}
                                  {inv.linkedInUrl && inv.linkedInUrl !== '#' && (
                                    <a
                                      href={inv.linkedInUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                    >
                                      <Linkedin className="h-3.5 w-3.5" />
                                      LinkedIn
                                      <ExternalLink className="h-3 w-3 opacity-50" />
                                    </a>
                                  )}
                                  {inv.pitchDeckUrl && inv.pitchDeckUrl !== '#' && (
                                    <a
                                      href={inv.pitchDeckUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                      Pitch Deck
                                      <ExternalLink className="h-3 w-3 opacity-50" />
                                    </a>
                                  )}
                                  {inv.onePagerUrl && inv.onePagerUrl !== '#' && (
                                    <a
                                      href={inv.onePagerUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                      One-Pager
                                      <ExternalLink className="h-3 w-3 opacity-50" />
                                    </a>
                                  )}
                                  {inv.businessPlanUrl && inv.businessPlanUrl !== '#' && (
                                    <a
                                      href={inv.businessPlanUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                      Business Plan
                                      <ExternalLink className="h-3 w-3 opacity-50" />
                                    </a>
                                  )}
                                  {(!inv.websiteUrl || inv.websiteUrl === '#') && 
                                   (!inv.linkedInUrl || inv.linkedInUrl === '#') && 
                                   (!inv.pitchDeckUrl || inv.pitchDeckUrl === '#') && 
                                   (!inv.onePagerUrl || inv.onePagerUrl === '#') && 
                                   (!inv.businessPlanUrl || inv.businessPlanUrl === '#') && (
                                    <span className="text-xs text-slate-400 italic">No links available</span>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-wrap gap-2 pt-3">
                                {!isViewOnly && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleFavoriteToggle(inv.id)}
                                    >
                                      <Heart className={`h-4 w-4 mr-2 ${isFavorited ? 'fill-current text-red-500' : ''}`} />
                                      {isFavorited ? 'Favorited' : 'Favorite'}
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDueDiligenceClick(inv)}
                                    >
                                      <Shield className="h-4 w-4 mr-2" />
                                      {isApprovedDueDiligence ? 'Due Diligence Accepted' : 'Due Diligence'}
                                    </Button>

                                    {(() => {
                                      const existingOffer = investmentOffers.find(offer => 
                                        offer.startupName === inv.name && 
                                        offer.status === 'pending'
                                      );
                                      
                                      if (existingOffer) {
                                        return (
                                          <Button
                                            size="sm"
                                            variant="secondary"
                                            disabled
                                            className="bg-slate-100 text-slate-500 cursor-not-allowed"
                                            title="View and edit your offer in the Dashboard → Recent Activity"
                                          >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Offer Submitted
                                          </Button>
                                        );
                                      } else {
                                        return (
                                          <Button
                                            size="sm"
                                            variant="primary"
                                            onClick={() => handleMakeOfferClick(inv)}
                                          >
                                            <DollarSign className="h-4 w-4 mr-2" />
                                            Make Offer
                                          </Button>
                                        );
                                      }
                                    })()}
                                    
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setStartupToRecommend(inv);
                                        setSelectedCollaboratorId(null);
                                        setShowRecommendModal(true);
                                      }}
                                    >
                                      <Users className="h-4 w-4 mr-2" />
                                      Recommend
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </>
                );
              }
              
              // Regular pitches display (when not on recommended sub-tab)
              if (isLoadingPitches) {
                return (
              <Card className="text-center py-20">
                <div className="max-w-sm mx-auto">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading Pitches...</h3>
                  <p className="text-slate-500">Fetching active fundraising startups</p>
                </div>
              </Card>
                );
              }
              
              // Use activeFundraisingStartups for the main data source
              const pitchesToShow = activeTab === 'reels' ? shuffledPitches : activeFundraisingStartups;
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
                // Check if all pitches have offers submitted
                const allPitchesHaveOffers = shuffledPitches.every(pitch => 
                  investmentOffers.some(offer => 
                    offer.startupName === pitch.name && 
                    offer.status === 'pending'
                  )
                );

                return (
                  <Card className="text-center py-20">
                    <div className="max-w-sm mx-auto">
                      <Film className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-slate-800 mb-2">
                        {searchTerm.trim()
                          ? 'No Matching Startups'
                          : showOnlyValidated 
                            ? 'No Verified Startups' 
                            : showOnlyFavorites 
                              ? 'No Favorited Pitches'
                              : showOnlyDueDiligence
                                ? 'No Due Diligence Access Yet'
                                : allPitchesHaveOffers 
                                  ? 'All Offers Submitted!' 
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
                                ? 'Due diligence requests you send will appear here immediately, even before startups approve them.'
                                : allPitchesHaveOffers
                                  ? 'You\'ve submitted offers for all available startups. Check your Dashboard → Recent Activity to manage your offers.'
                                  : 'No startups are currently fundraising. Check back later for new opportunities.'
                        }
                      </p>
                      {allPitchesHaveOffers && (
                        <Button 
                          onClick={() => setActiveTab('dashboard')}
                          className="mt-4"
                        >
                          Go to Dashboard
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              }
              
              return filteredPitches.map(inv => {
                const videoEmbedInfo = inv.pitchVideoUrl ? getVideoEmbedUrl(inv.pitchVideoUrl, false) : null;
                const embedUrl = videoEmbedInfo?.embedUrl || null;
                const videoSource = videoEmbedInfo?.source || null;
                const isFavorited = favoritedPitches.has(inv.id);
                const hasDueDiligence = dueDiligenceStartups.has(inv.id);
                const isApprovedDueDiligence = approvedDueDiligenceStartups.has(inv.id);

                return (
                  <Card key={inv.id} className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Video/Logo Section */}
                      <div className="md:w-1/3">
                        {embedUrl ? (
                          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
                            {videoSource === 'direct' ? (
                              <video
                                src={embedUrl}
                                controls
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
                              />
                            )}
                          </div>
                        ) : inv.logoUrl && inv.logoUrl !== '#' ? (
                          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-white flex items-center justify-center">
                            <img
                              src={inv.logoUrl}
                              alt={`${inv.name} logo`}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-full aspect-video bg-slate-200 rounded-lg flex items-center justify-center">
                            <Video className="h-12 w-12 text-slate-400" />
                          </div>
                        )}
                      </div>

                      {/* Content Section */}
                      <div className="md:w-2/3 flex flex-col relative">
                        {/* Header Section */}
                        <div className="mb-3">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h3 className="text-xl font-bold text-slate-800 flex-1">{inv.name}</h3>
                            {!isViewOnly && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleShare(inv)}
                                className="flex-shrink-0"
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge status={inv.complianceStatus} />
                            {inv.isStartupNationValidated && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Verified
                              </span>
                            )}
                            <span className="text-sm text-slate-600">{inv.sector}</span>
                          </div>
                        </div>

                        {/* Investment Details */}
                        <div className="mb-4">
                          {/* Investment Ask and Equity in one line */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">Investment Ask:</span>
                              <span className="text-xs font-medium text-slate-600">
                                {investorService.formatCurrency(inv.investmentValue, inv.currency || 'USD')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">Equity:</span>
                              <span className="text-xs font-medium text-slate-600">{inv.equityAllocation}%</span>
                            </div>
                          </div>
                          {/* Round Type, Currency, Stage, Domain in one line */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            {inv.fundraisingType && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-500">Round Type:</span>
                                <span className="text-xs font-medium text-slate-600">{inv.fundraisingType}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">Currency:</span>
                              <span className="text-xs font-medium text-slate-600">{inv.currency || 'USD'}</span>
                            </div>
                            {inv.stage && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-500">Stage:</span>
                                <span className="text-xs font-medium text-slate-600">{inv.stage}</span>
                              </div>
                            )}
                            {inv.domain && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-500">Domain:</span>
                                <span className="text-xs font-medium text-slate-600">{inv.domain}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Links & Documents Section */}
                        <div className="mb-4 pb-3 border-b border-slate-200">
                          <div className="text-xs font-medium text-slate-500 mb-2">Links & Documents</div>
                          <div className="flex flex-wrap gap-2">
                            {inv.websiteUrl && inv.websiteUrl !== '#' && (
                              <a
                                href={inv.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                              >
                                <Globe className="h-3.5 w-3.5" />
                                Website
                                <ExternalLink className="h-3 w-3 opacity-50" />
                              </a>
                            )}
                            {inv.linkedInUrl && inv.linkedInUrl !== '#' && (
                              <a
                                href={inv.linkedInUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                              >
                                <Linkedin className="h-3.5 w-3.5" />
                                LinkedIn
                                <ExternalLink className="h-3 w-3 opacity-50" />
                              </a>
                            )}
                            {inv.pitchDeckUrl && inv.pitchDeckUrl !== '#' && (
                              <a
                                href={inv.pitchDeckUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Pitch Deck
                                <ExternalLink className="h-3 w-3 opacity-50" />
                              </a>
                            )}
                            {inv.onePagerUrl && inv.onePagerUrl !== '#' && (
                              <a
                                href={inv.onePagerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                One-Pager
                                <ExternalLink className="h-3 w-3 opacity-50" />
                              </a>
                            )}
                            {inv.businessPlanUrl && inv.businessPlanUrl !== '#' && (
                              <a
                                href={inv.businessPlanUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Business Plan
                                <ExternalLink className="h-3 w-3 opacity-50" />
                              </a>
                            )}
                            {(!inv.websiteUrl || inv.websiteUrl === '#') && 
                             (!inv.linkedInUrl || inv.linkedInUrl === '#') && 
                             (!inv.pitchDeckUrl || inv.pitchDeckUrl === '#') && 
                             (!inv.onePagerUrl || inv.onePagerUrl === '#') && 
                             (!inv.businessPlanUrl || inv.businessPlanUrl === '#') && (
                              <span className="text-xs text-slate-400 italic">No links available</span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2 pt-3">
                          {!isViewOnly && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleFavoriteToggle(inv.id)}
                              >
                                <Heart className={`h-4 w-4 mr-2 ${isFavorited ? 'fill-current text-red-500' : ''}`} />
                                {isFavorited ? 'Favorited' : 'Favorite'}
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDueDiligenceClick(inv)}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                {isApprovedDueDiligence ? 'Due Diligence Accepted' : 'Due Diligence'}
                              </Button>

                              {(() => {
                                const existingOffer = investmentOffers.find(offer => 
                                  offer.startupName === inv.name && 
                                  offer.status === 'pending'
                                );
                                
                                if (existingOffer) {
                                  return (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      disabled
                                      className="bg-slate-100 text-slate-500 cursor-not-allowed"
                                      title="View and edit your offer in the Dashboard → Recent Activity"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Offer Submitted
                                    </Button>
                                  );
                                } else {
                                  return (
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      onClick={() => handleMakeOfferClick(inv)}
                                    >
                                      <DollarSign className="h-4 w-4 mr-2" />
                                      Make Offer
                                    </Button>
                                  );
                                }
                              })()}
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setStartupToRecommend(inv);
                                  setSelectedCollaboratorId(null);
                                  setShowRecommendModal(true);
                                }}
                              >
                                <Users className="h-4 w-4 mr-2" />
                                Recommend
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              });
            })()}
          </div>
        </div>
      )}

      {activeTab === 'mandate' && (
        <div className="animate-fade-in max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Mandate</h2>
                <p className="text-sm text-slate-600">Create and manage investment mandates with specific criteria</p>
              </div>
              {!isViewOnly && (
                <Button onClick={handleAddMandate} size="sm">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Mandate
                </Button>
              )}
            </div>

            {/* Mandate Tabs */}
            {isLoadingMandates ? (
              <div className="text-center py-4 text-slate-500">Loading mandates...</div>
            ) : mandates.length === 0 ? (
              <Card className="text-center py-12">
                <Filter className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-800 mb-2">No Mandates Created</h3>
                <p className="text-slate-500 mb-4">Create your first mandate to filter startups based on your investment criteria</p>
                {!isViewOnly && (
                  <Button onClick={handleAddMandate}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Your First Mandate
                  </Button>
                )}
              </Card>
            ) : (
              <div className="border-b border-slate-200 mb-6">
                <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto pb-2" aria-label="Mandate Tabs">
                  {mandates.map((mandate) => (
                    <button
                      key={mandate.id}
                      onClick={() => setSelectedMandateId(mandate.id)}
                      className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-2 ${
                        selectedMandateId === mandate.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Filter className="h-4 w-4" />
                      {mandate.name}
                      {!isViewOnly && (
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditMandate(mandate);
                            }}
                            className="p-1 hover:bg-slate-100 rounded"
                            title="Edit mandate"
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
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </button>
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
                      {!isViewOnly && (
                        <Button
                          variant="secondary"
                          onClick={() => handleEditMandate(selectedMandate)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Mandate Criteria
                        </Button>
                      )}
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
                    {!isViewOnly && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditMandate(selectedMandate)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Mandate
                      </Button>
                    )}
                  </div>
                  {filteredStartups.map((startup) => {
                    const videoEmbedInfo = startup.pitchVideoUrl ? getVideoEmbedUrl(startup.pitchVideoUrl, false) : null;
                    const embedUrl = videoEmbedInfo?.embedUrl || null;
                    const videoSource = videoEmbedInfo?.source || null;
                    const isFavorited = favoritedPitches.has(startup.id);
                    const hasDueDiligence = dueDiligenceStartups.has(startup.id);
                    const isApprovedDueDiligence = approvedDueDiligenceStartups.has(startup.id);

                    return (
                      <Card key={startup.id} className="p-6">
                        <div className="flex flex-col md:flex-row gap-6">
                          {/* Video/Logo Section */}
                          <div className="md:w-1/3">
                            {embedUrl ? (
                              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
                                {videoSource === 'direct' ? (
                                  <video
                                    src={embedUrl}
                                    controls
                                    className="absolute top-0 left-0 w-full h-full object-cover"
                                  >
                                    Your browser does not support the video tag.
                                  </video>
                                ) : (
                                  <iframe
                                    src={embedUrl}
                                    title={`Pitch video for ${startup.name}`}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="absolute top-0 left-0 w-full h-full"
                                  />
                                )}
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
                                <Video className="h-12 w-12 text-slate-400" />
                              </div>
                            )}
                          </div>

                          {/* Content Section */}
                          <div className="md:w-2/3 flex flex-col relative">
                            {/* Header Section */}
                            <div className="mb-3">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <h3 className="text-xl font-bold text-slate-800 flex-1">{startup.name}</h3>
                                {!isViewOnly && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleShare(startup)}
                                    className="flex-shrink-0"
                                  >
                                    <Share2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge status={startup.complianceStatus} />
                                {startup.isStartupNationValidated && (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Verified
                                  </span>
                                )}
                                <span className="text-sm text-slate-600">{startup.sector}</span>
                              </div>
                            </div>

                            {/* Investment Details */}
                            <div className="mb-4">
                              {/* Investment Ask and Equity in one line */}
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
                              {/* Round Type, Currency, Stage, Domain in one line */}
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

                            {/* Links & Documents Section */}
                            <div className="mb-4 pb-3 border-b border-slate-200">
                              <div className="text-xs font-medium text-slate-500 mb-2">Links & Documents</div>
                              <div className="flex flex-wrap gap-2">
                                {startup.websiteUrl && startup.websiteUrl !== '#' && (
                                  <a
                                    href={startup.websiteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                  >
                                    <Globe className="h-3.5 w-3.5" />
                                    Website
                                    <ExternalLink className="h-3 w-3 opacity-50" />
                                  </a>
                                )}
                                {startup.linkedInUrl && startup.linkedInUrl !== '#' && (
                                  <a
                                    href={startup.linkedInUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                  >
                                    <Linkedin className="h-3.5 w-3.5" />
                                    LinkedIn
                                    <ExternalLink className="h-3 w-3 opacity-50" />
                                  </a>
                                )}
                                {startup.pitchDeckUrl && startup.pitchDeckUrl !== '#' && (
                                  <a
                                    href={startup.pitchDeckUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    Pitch Deck
                                    <ExternalLink className="h-3 w-3 opacity-50" />
                                  </a>
                                )}
                                {startup.onePagerUrl && startup.onePagerUrl !== '#' && (
                                  <a
                                    href={startup.onePagerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    One-Pager
                                    <ExternalLink className="h-3 w-3 opacity-50" />
                                  </a>
                                )}
                                {startup.businessPlanUrl && startup.businessPlanUrl !== '#' && (
                                  <a
                                    href={startup.businessPlanUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    Business Plan
                                    <ExternalLink className="h-3 w-3 opacity-50" />
                                  </a>
                                )}
                                {(!startup.websiteUrl || startup.websiteUrl === '#') && 
                                 (!startup.linkedInUrl || startup.linkedInUrl === '#') && 
                                 (!startup.pitchDeckUrl || startup.pitchDeckUrl === '#') && 
                                 (!startup.onePagerUrl || startup.onePagerUrl === '#') && 
                                 (!startup.businessPlanUrl || startup.businessPlanUrl === '#') && (
                                  <span className="text-xs text-slate-400 italic">No links available</span>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2 pt-3">
                              {!isViewOnly && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleFavoriteToggle(startup.id)}
                                  >
                                    <Heart className={`h-4 w-4 mr-2 ${isFavorited ? 'fill-current text-red-500' : ''}`} />
                                    {isFavorited ? 'Favorited' : 'Favorite'}
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDueDiligenceClick(startup)}
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    {isApprovedDueDiligence ? 'Due Diligence Accepted' : 'Due Diligence'}
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => handleMakeOfferClick(startup)}
                                  >
                                    <DollarSign className="h-4 w-4 mr-2" />
                                    Make Offer
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setStartupToRecommend(startup);
                                      setSelectedCollaboratorId(null);
                                      setShowRecommendModal(true);
                                    }}
                                  >
                                    <Users className="h-4 w-4 mr-2" />
                                    Recommend
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              );
            })()
          ) : (
            <Card className="text-center py-20">
              <div className="max-w-sm mx-auto">
                <Filter className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Select a Mandate</h3>
                <p className="text-slate-500">Please select a mandate from the tabs above to view filtered startups</p>
              </div>
            </Card>
          )}

          {/* Create/Edit Mandate Modal */}
          {showMandateModal && (
            <Modal
              isOpen={showMandateModal}
              onClose={() => {
                setShowMandateModal(false);
                setEditingMandate(null);
                setMandateFormData({
                  investor_id: currentUser?.id || '',
                  name: '',
                  stage: '',
                  round_type: '',
                  domain: '',
                  amount_min: undefined,
                  amount_max: undefined,
                  equity_min: undefined,
                  equity_max: undefined,
                  country: ''
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

                {/* Country Filter */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Country</label>
                  <select
                    value={mandateFormData.country || ''}
                    onChange={(e) => setMandateFormData({ ...mandateFormData, country: e.target.value || '' })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">All Countries</option>
                    {mandateFilterOptions.countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>

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

                  {/* Domain Filter */}
                  <div className="sm:col-span-2">
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Amount Min */}
                  <Input
                    label="Amount Min (USD)"
                    type="number"
                    value={mandateFormData.amount_min?.toString() || ''}
                    onChange={(e) => setMandateFormData({ ...mandateFormData, amount_min: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="e.g., 100000"
                  />

                  {/* Amount Max */}
                  <Input
                    label="Amount Max (USD)"
                    type="number"
                    value={mandateFormData.amount_max?.toString() || ''}
                    onChange={(e) => setMandateFormData({ ...mandateFormData, amount_max: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="e.g., 5000000"
                  />

                  {/* Equity Min */}
                  <Input
                    label="Equity Min (%)"
                    type="number"
                    value={mandateFormData.equity_min?.toString() || ''}
                    onChange={(e) => setMandateFormData({ ...mandateFormData, equity_min: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="e.g., 5"
                    step="0.1"
                  />

                  {/* Equity Max */}
                  <Input
                    label="Equity Max (%)"
                    type="number"
                    value={mandateFormData.equity_max?.toString() || ''}
                    onChange={(e) => setMandateFormData({ ...mandateFormData, equity_max: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="e.g., 25"
                    step="0.1"
                  />
                </div>

                <div className="pt-2">
                  <Button onClick={handleSaveMandate} className="w-full text-sm py-2">
                    <Save className="h-4 w-4 mr-2" />
                    {editingMandate ? 'Update' : 'Create'} Mandate
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* Add/Edit Startup Modal */}
      {showAddStartupModal && (
        <Modal
          isOpen={showAddStartupModal}
          onClose={() => {
            setShowAddStartupModal(false);
            setEditingAddedStartup(null);
            setAddStartupFormData({
              investor_id: currentUser?.id || '',
              startup_name: '',
              sector: '',
              website_url: '',
              contact_email: '',
              contact_name: '',
              contact_number: '',
              current_valuation: undefined,
              investment_amount: undefined,
              equity_percentage: undefined,
              investment_date: undefined,
              currency: 'USD',
              notes: ''
            });
          }}
          title={editingAddedStartup ? 'Edit Startup' : 'Add Startup (Not on TMS)'}
          size="small"
        >
          <div className="space-y-3">
            <Input
              label="Startup Name *"
              value={addStartupFormData.startup_name}
              onChange={(e) => setAddStartupFormData({ ...addStartupFormData, startup_name: e.target.value })}
              placeholder="Enter startup name"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Sector</label>
                <select
                  value={addStartupFormData.sector || ''}
                  onChange={(e) => setAddStartupFormData({ ...addStartupFormData, sector: e.target.value || undefined })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  disabled={loadingSectors}
                >
                  <option value="">Select Sector</option>
                  {loadingSectors ? (
                    <option value="">Loading sectors...</option>
                  ) : (
                    sectors.map(sector => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Currency</label>
                <select
                  value={addStartupFormData.currency || 'USD'}
                  onChange={(e) => setAddStartupFormData({ ...addStartupFormData, currency: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  disabled={loadingCurrencies}
                >
                  {loadingCurrencies ? (
                    <option value="USD">Loading currencies...</option>
                  ) : (
                    currencies.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <Input
              label="Website URL"
              type="url"
              value={addStartupFormData.website_url || ''}
              onChange={(e) => setAddStartupFormData({ ...addStartupFormData, website_url: e.target.value || undefined })}
              placeholder="https://example.com"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Contact Name *"
                value={addStartupFormData.contact_name || ''}
                onChange={(e) => setAddStartupFormData({ ...addStartupFormData, contact_name: e.target.value })}
                placeholder="Contact person name"
                required
              />

              <Input
                label="Contact Email *"
                type="email"
                value={addStartupFormData.contact_email || ''}
                onChange={(e) => setAddStartupFormData({ ...addStartupFormData, contact_email: e.target.value })}
                placeholder="contact@startup.com"
                required
              />
            </div>

            <Input
              label="Contact Number"
              type="tel"
              value={addStartupFormData.contact_number || ''}
              onChange={(e) => setAddStartupFormData({ ...addStartupFormData, contact_number: e.target.value || undefined })}
              placeholder="+1234567890"
            />

            <Input
              label="Current Valuation"
              type="number"
              value={addStartupFormData.current_valuation?.toString() || ''}
              onChange={(e) => setAddStartupFormData({ ...addStartupFormData, current_valuation: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="e.g., 1000000"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Investment Amount"
                type="number"
                value={addStartupFormData.investment_amount?.toString() || ''}
                onChange={(e) => setAddStartupFormData({ ...addStartupFormData, investment_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="e.g., 500000"
              />

              <Input
                label="Equity Percentage (%)"
                type="number"
                value={addStartupFormData.equity_percentage?.toString() || ''}
                onChange={(e) => setAddStartupFormData({ ...addStartupFormData, equity_percentage: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="e.g., 10"
                step="0.1"
              />
            </div>

            <Input
              label="Investment Date"
              type="date"
              value={addStartupFormData.investment_date || ''}
              onChange={(e) => setAddStartupFormData({ ...addStartupFormData, investment_date: e.target.value || undefined })}
            />

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={addStartupFormData.notes || ''}
                onChange={(e) => setAddStartupFormData({ ...addStartupFormData, notes: e.target.value || undefined })}
                placeholder="Additional notes"
                rows={2}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="pt-2">
              <Button onClick={handleSaveAddedStartup} className="w-full text-sm py-2">
                <Save className="h-4 w-4 mr-2" />
                {editingAddedStartup ? 'Update' : 'Add'} Startup
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {activeTab === 'offers' && (
        <div className="space-y-6 animate-fade-in">
                      <Card>
              <h3 className="text-lg font-semibold mb-4 text-slate-700 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Your Offers
                <span className="text-sm font-normal text-slate-500">
                  ({investmentOffers.length} total)
                </span>
              </h3>
            <div className="space-y-4">
              {investmentOffers.length > 0 ? (
                investmentOffers.map(offer => {
                  // Debug logging
            // Check if this is a co-investment offer (either by flag or co_investment_opportunity_id)
            // OR if the user created a co-investment opportunity for this startup (lead investor)
            const isCoInvestment = !!(offer as any).is_co_investment || 
                                   !!(offer as any).co_investment_opportunity_id ||
                                   !!(offer as any).is_co_investment_related ||
                                   !!(offer as any).created_co_investment_opportunity_id;
            console.log('🔍 Offer data:', {
              id: offer.id,
              offerAmount: offer.offerAmount,
              equityPercentage: offer.equityPercentage,
              currency: (offer as any).currency,
              createdAt: offer.createdAt,
              startupName: offer.startupName,
              status: offer.status,
              isCoInvestment: isCoInvestment,
              is_co_investment: (offer as any).is_co_investment,
              co_investment_opportunity_id: (offer as any).co_investment_opportunity_id
            });
                  
                  return (
                  <div key={offer.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg">{getStageStatusDisplay(offer).icon}</span>
                        <div>
                          <div className="font-medium text-slate-900 truncate">
                            {(() => {
                              const isCoInvestmentOffer = !!(offer as any).is_co_investment || 
                                                          !!(offer as any).co_investment_opportunity_id ||
                                                          !!(offer as any).is_co_investment_related ||
                                                          !!(offer as any).created_co_investment_opportunity_id;
                              return isCoInvestmentOffer ? (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3 text-orange-600" />
                                  Co-Investment Offer for {offer.startupName}
                                </span>
                              ) : (
                                `Offer for ${offer.startupName}`
                              );
                            })()}
                          </div>
                          <div className="text-sm text-slate-500">
                            {(() => {
                              const amount = Number(offer.offerAmount) || 0;
                              const equity = Number(offer.equityPercentage) || 0;
                              const currency = (offer as any).currency || 'INR';
                              return `${formatCurrency(amount, currency)} • ${equity}% equity`;
                            })()}
                          </div>
                          <div className="text-xs text-slate-400">
                            Submitted on {(() => {
                              try {
                                const date = new Date(offer.createdAt);
                                return isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString();
                              } catch (error) {
                                return 'Unknown date';
                              }
                            })()}
                          </div>
                          {/* Show status message for co-investment offers */}
                          {(() => {
                            const isCoInvestmentOffer = !!(offer as any).is_co_investment || 
                                                        !!(offer as any).co_investment_opportunity_id ||
                                                        !!(offer as any).is_co_investment_related ||
                                                        !!(offer as any).created_co_investment_opportunity_id;
                            if (isCoInvestmentOffer) {
                              const status = offer.status || 'pending';
                              if (status === 'pending_investor_advisor_approval') {
                                return <div className="text-xs text-blue-600 mt-1">Awaiting investor advisor approval</div>;
                              }
                              if (status === 'pending_lead_investor_approval') {
                                return <div className="text-xs text-orange-600 mt-1">Awaiting lead investor approval</div>;
                              }
                              if (status === 'pending_startup_approval') {
                                return <div className="text-xs text-green-600 mt-1">Awaiting startup review</div>;
                              }
                              if (status === 'accepted') {
                                return <div className="text-xs text-emerald-600 mt-1">Co-investment offer accepted</div>;
                              }
                            }
                            // Regular offer status messages
                            if (((offer as any).stage || 1) >= 2) {
                              return (
                            <div className="text-xs text-blue-600 mt-1">
                              {((offer as any).stage || 1) === 2 && "Awaiting startup advisor approval"}
                              {((offer as any).stage || 1) === 3 && "Awaiting startup review"}
                              {((offer as any).stage || 1) >= 4 && "Approved by startup"}
                            </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStageStatusDisplay(offer).color}`}>
                          {getStageStatusDisplay(offer).text}
                        </span>
                        {(() => {
                          const isCoInvestmentOffer = !!(offer as any).is_co_investment || 
                                                      !!(offer as any).co_investment_opportunity_id ||
                                                      !!(offer as any).is_co_investment_related ||
                                                      !!(offer as any).created_co_investment_opportunity_id;
                          const status = offer.status || 'pending';
                          const stage = (offer as any).stage || 1;
                          const investorAdvisorStatus = (offer as any).investor_advisor_approval_status || 'not_required';
                          
                          // For co-investment offers: Only show edit/cancel if investor advisor hasn't approved yet
                          if (isCoInvestmentOffer) {
                            // Show edit/cancel only if status is still pending_investor_advisor_approval
                            // Once approved (status becomes pending_lead_investor_approval or beyond), hide them
                            if (status === 'pending_investor_advisor_approval' && investorAdvisorStatus === 'pending' && !isViewOnly) {
                              return (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditOffer(offer)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleCancelOffer(offer.id)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          </>
                              );
                            }
                            // After investor advisor approval, don't show edit/cancel
                            return null;
                          }
                          
                          // For regular offers: Show edit/cancel only at stage 1 (before any approvals)
                          if (stage === 1 && !isViewOnly) {
                            return (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleEditOffer(offer)}
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleCancelOffer(offer.id)}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                              </>
                            );
                          }
                          
                          return null;
                        })()}
                        {(() => {
                          const isCoInvestmentOffer = !!(offer as any).is_co_investment || 
                                                      !!(offer as any).co_investment_opportunity_id ||
                                                      !!(offer as any).is_co_investment_related ||
                                                      !!(offer as any).created_co_investment_opportunity_id;
                          const status = offer.status || 'pending';
                          const isAccepted = status === 'accepted' || ((offer as any).stage || 1) >= 4;
                          
                          // For co-investment offers that are accepted, show "View Details" button
                          if (isCoInvestmentOffer && status === 'accepted' && !isViewOnly) {
                            return (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleViewCoInvestmentDetails(offer)}
                              >
                                View Details
                              </Button>
                            );
                          }
                          
                          // For regular offers or non-accepted co-investment offers
                          if (isAccepted && !isViewOnly) {
                            return (
                          <div className="flex gap-2">
                            {offer.contact_details_revealed ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setContactModalOffer(offer);
                                  setIsContactModalOpen(true);
                                }}
                              >
                                View Contact Details
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => alert('Contact details will be revealed once the investment advisor approves or if no advisor is assigned.')}
                              >
                                Contact Details Pending
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => alert('Our team will contact you soon')}
                            >
                              Next Steps
                            </Button>
                          </div>
                            );
                          }
                          
                          return null;
                        })()}
                        {isViewOnly && ((offer as any).stage || 1) >= 4 && (
                          <span className="text-xs text-slate-500 italic">View Only - Actions Disabled</span>
                        )}
                      </div>
                    </div>

                    {(() => {
                      const matchedPitch = activeFundraisingStartups.find(s => 
                        (offer.startup && s.id === offer.startup.id) || s.name === offer.startupName
                      );
                      const deckUrl = matchedPitch?.pitchDeckUrl;
                      const onePagerUrl = matchedPitch?.onePagerUrl;
                      const videoUrl = investorService.getYoutubeEmbedUrl(matchedPitch?.pitchVideoUrl);
                      if (!deckUrl && !onePagerUrl && !videoUrl) return null;
                      return (
                        <div className="mt-3 flex flex-col gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {deckUrl && deckUrl !== '#' && (
                              <a href={deckUrl} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="secondary">
                                  <FileText className="h-4 w-4 mr-2" /> View Deck
                                </Button>
                              </a>
                            )}
                            {onePagerUrl && onePagerUrl !== '#' && (
                              <a href={onePagerUrl} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="secondary" className="hover:bg-purple-50 hover:text-purple-600">
                                  <FileText className="h-4 w-4 mr-2" /> Business Plan
                                </Button>
                              </a>
                            )}
                            {videoUrl && (
                              <Button 
                                size="sm" 
                                variant="secondary"
                                onClick={() => setExpandedVideoOfferId(expandedVideoOfferId === offer.id ? null : offer.id)}
                              >
                                <Video className="h-4 w-4 mr-2" /> {expandedVideoOfferId === offer.id ? 'Hide Video' : 'Watch Video'}
                              </Button>
                            )}
                          </div>
                          {videoUrl && expandedVideoOfferId === offer.id && (
                            <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-black/5">
                              <iframe
                                src={videoUrl}
                                title={`Pitch video for ${offer.startupName}`}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="absolute top-0 left-0 w-full h-full"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  );
                })
               ) : (
                 <div className="text-sm text-slate-500 text-center py-10">
                   You have not submitted any offers yet.
                 </div>
               )}
            </div>
          </Card>

          {/* Co-Investment Offers - Pending and Approved */}
          {pendingCoInvestmentOffers.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold mb-4 text-slate-700 flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-600" />
                Co-Investment Offers
                <span className="text-sm font-normal text-slate-500">
                  ({pendingCoInvestmentOffers.filter((o: any) => o.status === 'pending_lead_investor_approval' || o.lead_investor_approval_status === 'pending').length} pending, {pendingCoInvestmentOffers.filter((o: any) => o.status === 'pending_startup_approval' || o.lead_investor_approval_status === 'approved').length} approved)
                </span>
              </h3>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> As the lead investor, please review and approve co-investment offers. Once approved, they will be sent directly to the startup for final approval.
                </p>
              </div>
              <div className="space-y-3">
                {pendingCoInvestmentOffers.map((offer: any) => {
                  const isPending = offer.status === 'pending_lead_investor_approval' || offer.lead_investor_approval_status === 'pending';
                  const isApproved = offer.status === 'pending_startup_approval' || offer.lead_investor_approval_status === 'approved';
                  
                  return (
                    <div key={offer.id} className={`p-4 rounded-lg border ${isPending ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="h-4 w-4 text-orange-600" />
                              <span className="text-xs font-medium text-orange-700 uppercase tracking-wide">Co-Investment Offer</span>
                            </div>
                            <div className="text-sm text-slate-500 mb-0.5">From Investor:</div>
                            <div className="text-base font-semibold text-slate-900">
                              {offer.investor?.name || offer.investor_email || 'Unknown Investor'}
                            </div>
                            <div className="text-xs text-slate-600 mt-2">
                              Startup: <span className="font-medium">{offer.startup?.name || offer.startup_name}</span>
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                              Offer Amount: <span className="font-medium">
                                {formatCurrency(Number(offer.offer_amount) || 0, offer.currency || 'USD')}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                              Equity Requested: <span className="font-medium">{offer.equity_percentage || 0}%</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {isPending ? (
                              <>
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                                  Awaiting Your Approval
                                </span>
                                <span className="text-xs text-slate-500 text-right">
                                  Will go to<br />Startup after<br />approval
                                </span>
                              </>
                            ) : isApproved ? (
                              <>
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                  ✓ Approved by You
                                </span>
                                <span className="text-xs text-slate-500 text-right">
                                  Sent to<br />Startup for<br />review
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                        {isPending && (
                          <div className="pt-2 border-t border-orange-200">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleLeadInvestorApproval(offer.id, 'approve')}
                              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" /> Approve Co-Investment Offer
                            </Button>
                            <p className="text-xs text-slate-500 mt-2 text-center">
                              Approving this offer will send it directly to the startup for final review
                            </p>
                          </div>
                        )}
                        {isApproved && (
                          <div className="pt-2 border-t border-green-200">
                            <p className="text-xs text-green-700 text-center font-medium">
                              ✓ This offer has been approved by you and is now pending startup approval
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Co-Investment You Created (moved after Your Offers) */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-700 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Co-Investment You Created
              <span className="text-sm font-normal text-slate-500">
                ({myCoInvestmentOpps.length} total)
              </span>
            </h3>
            {isLoadingMyOpps ? (
              <div className="text-sm text-slate-500 py-8 text-center">Loading your co-investment opportunities...</div>
            ) : myCoInvestmentOpps.length === 0 ? (
              <div className="text-sm text-slate-500 py-8 text-center">No co-investment opportunities created yet.</div>
            ) : (
              <div className="space-y-3">
                {myCoInvestmentOpps.map((opp) => {
                  // Derive effective stage from approval statuses so 'not_required' skips earlier stages
                  const lead = (opp.lead_investor_advisor_approval_status || '').toLowerCase();
                  const startupAdv = (opp.startup_advisor_approval_status || '').toLowerCase();
                  const startupAppr = (opp.startup_approval_status || '').toLowerCase();

                  let effectiveStage = 1;
                  if (lead === 'pending') {
                    effectiveStage = 1;
                  } else if (startupAdv === 'pending') {
                    effectiveStage = 2;
                  } else if (startupAppr === 'pending' || startupAppr === '' || startupAppr === 'not_required') {
                    effectiveStage = 3;
                  } else if (startupAppr === 'approved' || startupAppr === 'accepted' || opp.status === 'completed') {
                    effectiveStage = 4;
                  }

                  const stageText = effectiveStage === 1
                    ? 'Stage 1: Lead investor advisor approval'
                    : effectiveStage === 2
                      ? 'Stage 2: Startup advisor approval'
                      : effectiveStage === 3
                        ? 'Stage 3: Startup review'
                        : 'Stage 4: Accepted by startup';
                  const stageColor = effectiveStage === 1
                    ? 'bg-blue-100 text-blue-800'
                    : effectiveStage === 2
                      ? 'bg-purple-100 text-purple-800'
                      : effectiveStage === 3
                        ? 'bg-green-100 text-green-800'
                        : 'bg-emerald-100 text-emerald-800';
                  return (
                    <div key={opp.id} className="p-4 bg-white rounded-lg border border-slate-200">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm text-slate-500 mb-0.5">Co‑Investment for</div>
                            <div className="text-base font-semibold text-slate-900 truncate">{opp.startup?.name || startupNames[opp.startup_id] || `Startup #${opp.startup_id}`}</div>
                            {(() => {
                              const totalAsk = Number(opp.investment_amount) || 0;
                              const remaining = Math.max(Number(opp.maximum_co_investment) || 0, 0);
                              const leadCommitted = Math.max(totalAsk - remaining, 0);
                              const equityPct = Number(opp.equity_percentage) || 0;
                              const resolvedName = opp.startup?.name || startupNames[opp.startup_id];
                              const matchedOffer = investmentOffers.find(o => (
                                (resolvedName && o.startupName === resolvedName) ||
                                ((o as any).startup?.id && (o as any).startup.id === opp.startup_id)
                              ));
                              const leadEquityFromOffer = matchedOffer ? Number(matchedOffer.equityPercentage) : 0;
                              const proportionalLeadEquity = totalAsk > 0 && equityPct > 0 ? (equityPct * (leadCommitted / totalAsk)) : 0;
                              const leadEquityPct = leadEquityFromOffer > 0 ? leadEquityFromOffer : proportionalLeadEquity;
                              const fmtPct = (v: number) => `${Number.isFinite(v) ? v.toFixed(2) : '0.00'}%`;
                              const startupCurrency = opp.startup?.currency || (opp as any).currency || 'USD';
                              return (
                                <div className="text-xs text-slate-600 mt-0.5">
                                  Total ask <span className="font-medium text-slate-800">{formatCurrency(totalAsk, startupCurrency)}</span>
                                  {equityPct > 0 && <> for <span className="font-medium text-slate-800">{fmtPct(equityPct)}</span> equity</>}
                                  {' '}• You committed <span className="font-medium text-slate-800">{formatCurrency(leadCommitted, startupCurrency)}</span>
                                  {leadEquityPct > 0 && <> for <span className="font-medium text-slate-800">{fmtPct(leadEquityPct)}</span> equity</>}
                                  {' '}• Remaining <span className="font-medium text-slate-800">{formatCurrency(remaining, startupCurrency)}</span>
                                </div>
                              );
                            })()}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${stageColor}`}>{stageText}</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${opp.status === 'active' ? 'bg-teal-100 text-teal-800' : opp.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{opp.status}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                          <div>
                            <div className="text-xs text-slate-500">Lead Advisor</div>
                            <div className="text-sm font-medium text-slate-800 capitalize">{opp.lead_investor_advisor_approval_status?.replaceAll('_',' ')}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Startup Advisor</div>
                            <div className="text-sm font-medium text-slate-800 capitalize">{opp.startup_advisor_approval_status?.replaceAll('_',' ')}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Startup</div>
                            <div className="text-sm font-medium text-slate-800 capitalize">{opp.startup_approval_status?.replaceAll('_',' ')}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Equity</div>
                            <div className="text-sm font-medium text-slate-800">{opp.equity_percentage || 0}%</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => alert('We will soon allow editing the co-investment details here.')}
                          >
                            <Edit className="h-3 w-3 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => alert('Contact details and next steps will be surfaced upon approvals.')}
                          >
                            Next Steps
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'portfolio' && (
        <div className="space-y-6 animate-fade-in">
          {/* Two-column layout: Form on left, Preview on right */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-6 items-stretch">
            {/* Left: Investor Profile Form */}
            {currentUser && (
              <Card className="p-4 sm:p-6 h-full">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Investor Profile</h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Fill out your investor profile details. Changes will be reflected in the preview.
                  </p>
                </div>
                <InvestorProfileForm
                  currentUser={currentUser}
                  onSave={(profile) => {
                    console.log('Profile saved:', profile);
                  }}
                  onProfileChange={(profile) => {
                    setPreviewProfile(profile);
                  }}
                  isViewOnly={isViewOnly}
                  totalStartupsInvested={startups.length + investorAddedStartups.length}
                  totalVerifiedStartups={startups.length}
                  onAddStartup={handleAddStartup}
                />
              </Card>
            )}

            {/* Right: Investor Profile Card Preview */}
            <div className="flex flex-col h-full max-w-xl w-full mx-auto xl:mx-0">
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-slate-900">Your Investor Card</h3>
                <p className="text-xs text-slate-500">
                  This is how your profile will appear to startups on the Discover page
                </p>
              </div>
              {previewProfile && currentUser ? (
                <InvestorCard
                  investor={{
                    ...previewProfile,
                    user: {
                      name: currentUser.name || currentUser.email?.split('@')[0],
                      email: currentUser.email
                    }
                  }}
                  onView={undefined}
                  totalStartupsInvested={startups.length + investorAddedStartups.length}
                />
              ) : (
                <Card className="flex-1 !p-0 overflow-hidden shadow-lg border-0 bg-white">
                  <div className="w-full aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <div className="text-center text-slate-400">
                      <Briefcase className="h-16 w-16 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Fill out the form to see preview</p>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="h-32 bg-slate-50 rounded"></div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-6 animate-fade-in">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Startup Pitch Requests</h2>
                <p className="text-sm text-slate-600 mt-1">
                  View and manage pitch requests sent by startups
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-slate-700 font-medium">
                      {allowStartupRequests ? 'Profile Visible' : 'Profile Hidden'}
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={allowStartupRequests}
                        onChange={handleToggleStartupRequests}
                        disabled={isSavingToggle}
                        className="sr-only"
                      />
                      <div
                        className={`w-14 h-7 rounded-full transition-colors duration-200 ${
                          allowStartupRequests ? 'bg-blue-600' : 'bg-slate-300'
                        } ${isSavingToggle ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        onClick={!isSavingToggle ? handleToggleStartupRequests : undefined}
                      >
                        <div
                          className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                            allowStartupRequests ? 'translate-x-7' : 'translate-x-1'
                          } mt-0.5`}
                        />
                      </div>
                    </div>
                  </label>
                  {isSavingToggle && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {allowStartupRequests 
                    ? 'Startups can see your profile and send requests' 
                    : 'Your profile is hidden from startups'}
                </span>
              </div>
            </div>

            {loadingRequests ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading requests...</p>
              </div>
            ) : connectionRequests.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No startup pitch requests yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {connectionRequests.map((request) => (
                  <Card key={request.id} className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge variant={request.status === 'pending' ? 'warning' : request.status === 'accepted' ? 'success' : 'danger'}>
                            {request.status}
                          </Badge>
                          <span className="text-sm text-slate-500">
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {request.requester_type === 'Startup' && request.startup_id ? (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-semibold text-slate-900">Startup Pitch Request</h3>
                              <Badge variant={request.status === 'pending' ? 'warning' : request.status === 'accepted' ? 'success' : 'danger'}>
                                {request.status}
                              </Badge>
                            </div>
                            
                            {/* Display Full Startup Profile Card (same format as Discover Pitches) */}
                            {startupProfiles[request.startup_id] ? (
                              <Card className="mt-3 p-6 border-2 border-blue-200">
                                {(() => {
                                  const startup = startupProfiles[request.startup_id];
                                  const videoUrl = investorService.getYoutubeEmbedUrl(startup.pitchVideoUrl);
                                  const isFavorited = favoritedPitches.has(startup.id);
                                  const hasDueDiligence = dueDiligenceStartups.has(startup.id);
                                  const isApprovedDueDiligence = approvedDueDiligenceStartups.has(startup.id);

                                  return (
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
                                            <Video className="h-12 w-12 text-slate-400" />
                                          </div>
                                        )}
                                      </div>

                                      {/* Content Section */}
                                      <div className="md:w-2/3 flex flex-col relative">
                                        {/* Header Section */}
                                        <div className="mb-3">
                                          <div className="flex items-start justify-between gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-slate-800 flex-1">{startup.name}</h3>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleShare(startup)}
                                              className="flex-shrink-0"
                                            >
                                              <Share2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <Badge status={startup.complianceStatus} />
                                            {startup.isStartupNationValidated && (
                                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                                                <CheckCircle className="h-3 w-3" />
                                                Verified
                                              </span>
                                            )}
                                            <span className="text-sm text-slate-600">{startup.sector}</span>
                                          </div>
                                        </div>

                                        {/* Investment Details */}
                                        <div className="mb-4">
                                          {/* Investment Ask and Equity in one line */}
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
                                          {/* Round Type, Currency, Stage, Domain in one line */}
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

                                        {/* Mandate Matching Section */}
                                        {mandates.length > 0 && (() => {
                                          const matches = mandates
                                            .map(mandate => ({
                                              mandate,
                                              matchPercentage: calculateMandateMatch(startup, mandate)
                                            }))
                                            .filter(m => m.matchPercentage > 0)
                                            .sort((a, b) => b.matchPercentage - a.matchPercentage);
                                          
                                          if (matches.length === 0) return null;
                                          
                                          return (
                                            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                                              <div className="flex items-center gap-2 mb-2">
                                                <Briefcase className="h-4 w-4 text-blue-600" />
                                                <span className="text-sm font-semibold text-slate-700">Mandate Matching</span>
                                              </div>
                                              <div className="space-y-2">
                                                {matches.map(({ mandate, matchPercentage }) => (
                                                  <div key={mandate.id} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                      <span className="text-xs font-medium text-slate-700">{mandate.name}</span>
                                                      <span className="text-xs text-slate-500">
                                                        {mandate.domain && `• ${mandate.domain}`}
                                                        {mandate.round_type && ` • ${mandate.round_type}`}
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                      <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                        <div
                                                          className={`h-full rounded-full transition-all ${
                                                            matchPercentage >= 80 ? 'bg-green-500' :
                                                            matchPercentage >= 60 ? 'bg-blue-500' :
                                                            matchPercentage >= 40 ? 'bg-yellow-500' :
                                                            'bg-orange-500'
                                                          }`}
                                                          style={{ width: `${matchPercentage}%` }}
                                                        />
                                                      </div>
                                                      <span className={`text-xs font-bold min-w-[3rem] text-right ${
                                                        matchPercentage >= 80 ? 'text-green-600' :
                                                        matchPercentage >= 60 ? 'text-blue-600' :
                                                        matchPercentage >= 40 ? 'text-yellow-600' :
                                                        'text-orange-600'
                                                      }`}>
                                                        {matchPercentage}%
                                                      </span>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        })()}

                                        {/* Links & Documents Section */}
                                        <div className="mb-4 pb-3 border-b border-slate-200">
                                          <div className="text-xs font-medium text-slate-500 mb-2">Links & Documents</div>
                                          <div className="flex flex-wrap gap-2">
                                            {startup.websiteUrl && startup.websiteUrl !== '#' && (
                                              <a
                                                href={startup.websiteUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                              >
                                                <Globe className="h-3.5 w-3.5" />
                                                Website
                                                <ExternalLink className="h-3 w-3 opacity-50" />
                                              </a>
                                            )}
                                            {startup.linkedInUrl && startup.linkedInUrl !== '#' && (
                                              <a
                                                href={startup.linkedInUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                              >
                                                <Linkedin className="h-3.5 w-3.5" />
                                                LinkedIn
                                                <ExternalLink className="h-3 w-3 opacity-50" />
                                              </a>
                                            )}
                                            {startup.pitchDeckUrl && startup.pitchDeckUrl !== '#' && (
                                              <a
                                                href={startup.pitchDeckUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                              >
                                                <FileText className="h-3.5 w-3.5" />
                                                Pitch Deck
                                                <ExternalLink className="h-3 w-3 opacity-50" />
                                              </a>
                                            )}
                                            {startup.onePagerUrl && startup.onePagerUrl !== '#' && (
                                              <a
                                                href={startup.onePagerUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                              >
                                                <FileText className="h-3.5 w-3.5" />
                                                One-Pager
                                                <ExternalLink className="h-3 w-3 opacity-50" />
                                              </a>
                                            )}
                                            {startup.businessPlanUrl && startup.businessPlanUrl !== '#' && (
                                              <a
                                                href={startup.businessPlanUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors border border-slate-200"
                                              >
                                                <FileText className="h-3.5 w-3.5" />
                                                Business Plan
                                                <ExternalLink className="h-3 w-3 opacity-50" />
                                              </a>
                                            )}
                                            {(!startup.websiteUrl || startup.websiteUrl === '#') && 
                                             (!startup.linkedInUrl || startup.linkedInUrl === '#') && 
                                             (!startup.pitchDeckUrl || startup.pitchDeckUrl === '#') && 
                                             (!startup.onePagerUrl || startup.onePagerUrl === '#') && 
                                             (!startup.businessPlanUrl || startup.businessPlanUrl === '#') && (
                                              <span className="text-xs text-slate-400 italic">No links available</span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex flex-wrap gap-2 pt-3">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleFavoriteToggle(startup.id)}
                                          >
                                            <Heart className={`h-4 w-4 mr-2 ${isFavorited ? 'fill-current text-red-500' : ''}`} />
                                            {isFavorited ? 'Favorited' : 'Favorite'}
                                          </Button>

                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDueDiligenceClick(startup)}
                                          >
                                            <Shield className="h-4 w-4 mr-2" />
                                            {isApprovedDueDiligence ? 'Due Diligence Accepted' : 'Due Diligence'}
                                          </Button>

                                          <Button
                                            size="sm"
                                            variant="primary"
                                            onClick={() => handleMakeOfferClick(startup)}
                                          >
                                            <DollarSign className="h-4 w-4 mr-2" />
                                            Make Offer
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </Card>
                            ) : loadingStartupProfiles.has(request.startup_id) ? (
                              <div className="mt-3 p-4 border border-slate-200 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                  <span className="text-sm text-slate-600">Loading startup profile...</span>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (request.startup_id) {
                                      loadStartupProfile(request.startup_id);
                                    }
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Load Startup Profile
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-semibold text-slate-900">Investment Advisor Connection Request</h3>
                              <Badge variant={request.status === 'pending' ? 'warning' : request.status === 'accepted' ? 'success' : 'danger'}>
                                {request.status}
                              </Badge>
                            </div>
                            <span className="text-sm text-slate-500 mb-3 block">
                              {new Date(request.created_at).toLocaleDateString()}
                            </span>
                            {request.advisor_profile_url && (
                              <div className="mt-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    window.open(request.advisor_profile_url, '_blank');
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Advisor Profile
                                </Button>
                              </div>
                            )}
                            {request.message && request.message.trim() && (
                              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{request.message}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {request.requester_type === 'Startup' && request.message && request.message.trim() && (
                          <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{request.message}</p>
                          </div>
                        )}
                      </div>

                      {request.status === 'pending' && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={async () => {
                              try {
                                // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
                                const { data: { user: authUser } } = await supabase.auth.getUser();
                                if (!authUser?.id) {
                                  alert('User not found');
                                  return;
                                }
                                const authUserId = authUser.id;

                                await investorConnectionRequestService.updateRequestStatus(request.id, 'accepted', authUserId); // Use auth.uid() instead of profile ID
                                setConnectionRequests(prev => 
                                  prev.map(r => r.id === request.id ? { ...r, status: 'accepted' as const } : r)
                                );
                              } catch (error) {
                                console.error('Error accepting request:', error);
                                alert('Failed to accept request. Please try again.');
                              }
                            }}
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
                                const { data: { user: authUser } } = await supabase.auth.getUser();
                                if (!authUser?.id) {
                                  alert('User not found');
                                  return;
                                }
                                const authUserId = authUser.id;

                                await investorConnectionRequestService.updateRequestStatus(request.id, 'rejected', authUserId); // Use auth.uid() instead of profile ID
                                setConnectionRequests(prev => 
                                  prev.map(r => r.id === request.id ? { ...r, status: 'rejected' as const } : r)
                                );
                              } catch (error) {
                                console.error('Error rejecting request:', error);
                                alert('Failed to reject request. Please try again.');
                              }
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'collaboration' && (
        <div className="space-y-6 animate-fade-in">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Collaboration</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Manage collaboration with investment advisors (non-startup requests)
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                size="sm"
                variant={collaborationSubTab === 'my-collaborators' ? 'primary' : 'outline'}
                onClick={() => setCollaborationSubTab('my-collaborators')}
              >
                My Collaborators
              </Button>
              <Button
                size="sm"
                variant={collaborationSubTab === 'requests' ? 'primary' : 'outline'}
                onClick={() => setCollaborationSubTab('requests')}
              >
                Collaborator Requests
                {collaboratorRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-white bg-amber-500 rounded-full">
                    {collaboratorRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </Button>
            </div>

            {loadingRequests ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading collaboration data...</p>
              </div>
            ) : collaborationSubTab === 'my-collaborators' ? (
              collaborators.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">No collaborators yet</p>
                  <p className="text-sm text-slate-500 mt-1">Accepted non-startup requests will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {collaborators.map((request) => (
                    <Card key={request.id} className="p-0 overflow-hidden border border-slate-200">
                      <div className="flex flex-col md:flex-row gap-4">
                        {/* Media / Avatar */}
                        <div className="md:w-1/4 bg-slate-50 flex items-center justify-center p-6">
                          <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-semibold">
                            {request.requester_type?.[0] || 'C'}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="md:w-3/4 p-4 sm:p-6 flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="success">Accepted</Badge>
                                <span className="text-xs text-slate-500">{new Date(request.created_at).toLocaleDateString()}</span>
                              </div>
                              <h3 className="text-lg font-semibold text-slate-900 capitalize">
                                {request.requester_type || 'Collaborator'}
                              </h3>
                              <p className="text-sm text-slate-600">Requester ID: {request.requester_id}</p>
                            </div>
                            {request.advisor_profile_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(request.advisor_profile_url!, '_blank')}
                                className="flex-shrink-0"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                              </Button>
                            )}
                          </div>

                          {request.message && request.message.trim() && (
                            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">
                              {request.message}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )
            ) : collaboratorRequests.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No collaborator requests yet</p>
                <p className="text-sm text-slate-500 mt-1">Requests from other dashboards (except startups) will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {collaboratorRequests.map((request) => (
                  <Card key={request.id} className="p-0 overflow-hidden border border-slate-200">
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Media / Avatar */}
                      <div className="md:w-1/4 bg-slate-50 flex items-center justify-center p-6">
                        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xl font-semibold">
                          {request.requester_type?.[0] || 'C'}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="md:w-3/4 p-4 sm:p-6 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={request.status === 'pending' ? 'warning' : request.status === 'accepted' ? 'success' : 'danger'}>
                                {request.status}
                              </Badge>
                              <span className="text-xs text-slate-500">{new Date(request.created_at).toLocaleDateString()}</span>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 capitalize">
                              {request.requester_type || 'Collaborator'} Request
                            </h3>
                            <p className="text-sm text-slate-600">Requester ID: {request.requester_id}</p>
                          </div>
                          {request.advisor_profile_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(request.advisor_profile_url!, '_blank')}
                              className="flex-shrink-0"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Profile
                            </Button>
                          )}
                        </div>

                        {request.message && request.message.trim() && (
                          <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">
                            {request.message}
                          </div>
                        )}

                        {request.status === 'pending' && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={async () => {
                                try {
                                  // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
                                  const { data: { user: authUser } } = await supabase.auth.getUser();
                                  if (!authUser?.id) {
                                    alert('User not found');
                                    return;
                                  }
                                  const authUserId = authUser.id;

                                  await investorConnectionRequestService.updateRequestStatus(request.id, 'accepted', authUserId); // Use auth.uid() instead of profile ID
                                  setConnectionRequests(prev => 
                                    prev.map(r => r.id === request.id ? { ...r, status: 'accepted' as const } : r)
                                  );
                                } catch (error) {
                                  console.error('Error accepting request:', error);
                                  alert('Failed to accept request. Please try again.');
                                }
                              }}
                            >
                              <CheckSquare className="h-4 w-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  // CRITICAL FIX: Use auth.uid() instead of currentUser.id (profile ID)
                                  const { data: { user: authUser } } = await supabase.auth.getUser();
                                  if (!authUser?.id) {
                                    alert('User not found');
                                    return;
                                  }
                                  const authUserId = authUser.id;

                                  await investorConnectionRequestService.updateRequestStatus(request.id, 'rejected', authUserId); // Use auth.uid() instead of profile ID
                                  setConnectionRequests(prev => 
                                    prev.map(r => r.id === request.id ? { ...r, status: 'rejected' as const } : r)
                                  );
                                } catch (error) {
                                  console.error('Error rejecting request:', error);
                                  alert('Failed to reject request. Please try again.');
                                }
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Recommend Modal */}
      <Modal
        isOpen={showRecommendModal}
        onClose={() => setShowRecommendModal(false)}
        title="Recommend to Collaborator"
      >
        <div className="space-y-4">
          {startupToRecommend && (
            <div className="p-3 bg-slate-50 rounded-md text-sm text-slate-700">
              <div className="font-semibold text-slate-900">{startupToRecommend.name}</div>
              <div className="text-xs text-slate-500">Sector: {startupToRecommend.sector} • Ask: {investorService.formatCurrency(startupToRecommend.investmentValue, startupToRecommend.currency || 'USD')}</div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Choose a collaborator from your accepted collaborators</p>
            {loadingRequests && collaborators.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Loading collaborators...
              </div>
            ) : collaborators.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800 font-medium mb-1">No collaborators available</p>
                <p className="text-xs text-amber-700">Go to <strong>Collaboration</strong> tab and accept collaborator requests first.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {collaborators.map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:border-blue-300 transition-colors ${
                      selectedCollaboratorId === c.requester_id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="collaborator"
                      value={c.requester_id}
                      checked={selectedCollaboratorId === c.requester_id}
                      onChange={() => setSelectedCollaboratorId(c.requester_id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-semibold text-slate-900 capitalize">{c.requester_type || 'Collaborator'}</div>
                        <Badge variant="success" className="text-xs">Accepted</Badge>
                      </div>
                      <div className="text-xs text-slate-600">Requester ID: {c.requester_id}</div>
                      {c.message && (
                        <div className="text-xs text-slate-500 mt-1 line-clamp-1">{c.message}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowRecommendModal(false)} disabled={isSendingRecommendation}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!selectedCollaboratorId || !startupToRecommend || isSendingRecommendation}
              onClick={async () => {
                if (!selectedCollaboratorId || !startupToRecommend || !currentUser?.id) return;
                try {
                  setIsSendingRecommendation(true);
                  // Get auth_user_id - collaborator_recommendations uses auth_user_id, not profile ID
                  const { data: { user: authUser } } = await supabase.auth.getUser();
                  if (!authUser) {
                    alert('Not authenticated');
                    setIsSendingRecommendation(false);
                    return;
                  }
                  const payload: any = {
                    sender_user_id: authUser.id, // Use auth_user_id, not profile ID
                    collaborator_user_id: selectedCollaboratorId,
                    startup_id: startupToRecommend.id,
                    startup_name: startupToRecommend.name,
                    sender_name: (currentUser as any).name || currentUser.email || 'Investor',
                    created_at: new Date().toISOString(),
                    status: 'pending'
                  };
                  const { error } = await supabase.from('collaborator_recommendations').insert(payload);
                  if (error) throw error;
                  alert('Recommendation sent!');
                  setShowRecommendModal(false);
                } catch (err) {
                  console.error('Error sending recommendation:', err);
                  alert('Failed to send recommendation. Please try again.');
                } finally {
                  setIsSendingRecommendation(false);
                }
              }}
            >
              {isSendingRecommendation ? 'Sending...' : 'Send Recommendation'}
            </Button>
          </div>
        </div>
      </Modal>

       <Modal 
            isOpen={isOfferModalOpen} 
            onClose={() => {
                setIsOfferModalOpen(false);
                setSelectedCurrency('INR');
                setWantsCoInvestment(false);
                setIsCoInvestmentOffer(false);
            }} 
            title={`Make an Offer for ${selectedOpportunity?.name}`}
        >
            <form onSubmit={handleOfferSubmit} className="space-y-4">
                <p className="text-sm text-slate-600">
                    You are making an offer for <span className="font-semibold">{selectedOpportunity?.name}</span>. 
                    The current ask is <span className="font-semibold">{investorService.formatCurrency(selectedOpportunity?.investmentValue || 0, (selectedOpportunity as any)?.currency || 'USD')}</span> for <span className="font-semibold">{selectedOpportunity?.equityAllocation}%</span> equity.
                </p>
                
                <div>
                    <label htmlFor="currency" className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                    <select
                        id="currency"
                        name="currency"
                        value={selectedCurrency}
                        onChange={(e) => setSelectedCurrency(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {getAvailableCurrencies().map(currency => (
                            <option key={currency.code} value={currency.code}>
                                {currency.code} - {currency.name}
                            </option>
                        ))}
                    </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                        label={`Your Investment Offer (${selectedCurrency})`} 
                        id="offer-amount" 
                        name="offer-amount" 
                        type="number" 
                        required 
                    />
                    <Input label="Equity Requested (%)" id="offer-equity" name="offer-equity" type="number" step="0.1" required />
                </div>
                
                {/* Co-investment option - Only show if NOT making offer for existing co-investment opportunity */}
                {!isCoInvestmentOffer && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                        <input
                            type="checkbox"
                            id="co-investment"
                            name="co-investment"
                            checked={wantsCoInvestment}
                            onChange={(e) => setWantsCoInvestment(e.target.checked)}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                            <label htmlFor="co-investment" className="text-sm font-medium text-blue-900 cursor-pointer">
                                Looking for Co-Investment Partners
                            </label>
                            <p className="text-xs text-blue-700 mt-1">
                                Check this if you want to find other investors to complete the funding round. 
                                The remaining amount will be listed as a co-investment opportunity for other investors.
                            </p>
                        </div>
                    </div>
                </div>
                )}
                
                {/* Show info message when making offer for existing co-investment opportunity */}
                {isCoInvestmentOffer && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-start space-x-2">
                            <Users className="h-5 w-5 text-orange-600 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-orange-900">
                                    Making Co-Investment Offer
                                </p>
                                <p className="text-xs text-orange-700 mt-1">
                                    You are making an offer as a co-investor. Your offer will be considered along with the lead investor's commitment.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Scouting fee information removed */}
                
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={() => {
                        setIsOfferModalOpen(false);
                        setSelectedCurrency('INR');
                        setWantsCoInvestment(false);
                        setIsCoInvestmentOffer(false);
                    }}>Cancel</Button>
                    <Button type="submit">Submit Offer</Button>
                </div>
            </form>
        </Modal>

        {/* Edit Offer Modal */}
        <Modal 
            isOpen={isEditOfferModalOpen && !isViewOnly} 
            onClose={() => setIsEditOfferModalOpen(false)} 
            title={`Edit Offer for ${selectedOffer?.startupName}`}
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-600">
                    Update your offer for <span className="font-semibold">{selectedOffer?.startupName}</span>.
                </p>
                <Input 
                    label="Your Investment Offer (USD)" 
                    id="edit-offer-amount" 
                    name="edit-offer-amount" 
                    type="number" 
                    value={editOfferAmount}
                    onChange={(e) => setEditOfferAmount(e.target.value)}
                    required 
                />
                <Input 
                    label="Equity Requested (%)" 
                    id="edit-offer-equity" 
                    name="edit-offer-equity" 
                    type="number" 
                    step="0.1" 
                    value={editOfferEquity}
                    onChange={(e) => setEditOfferEquity(e.target.value)}
                    required 
                />
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={() => setIsEditOfferModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdateOffer}>Update Offer</Button>
                </div>
            </div>
        </Modal>

        {/* Contact Details Modal */}
        {contactModalOffer && (
          <ContactDetailsModal
            isOpen={isContactModalOpen}
            onClose={() => {
              setIsContactModalOpen(false);
              setContactModalOffer(null);
            }}
            offer={contactModalOffer}
          />
        )}

        {/* Co-Investment Offer Details Modal */}
        <Modal
          isOpen={isCoInvestmentDetailsModalOpen}
          onClose={() => setIsCoInvestmentDetailsModalOpen(false)}
          title="Co-Investment Offer Details"
          size="large"
        >
          {isLoadingDetails ? (
            <div className="py-8 text-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2">Loading details...</p>
            </div>
          ) : coInvestmentDetails ? (
            <div className="space-y-6">
              {/* Lead Investor Section */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Lead Investor Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Name:</span>
                    <span className="font-medium">
                      {coInvestmentDetails.leadInvestor?.name || 
                       coInvestmentDetails.co_investment_opportunity?.listed_by_user?.name ||
                       coInvestmentDetails.leadInvestor?.company_name || 
                       coInvestmentDetails.co_investment_opportunity?.listed_by_user?.company_name || 
                       coInvestmentDetails.leadInvestorName ||
                       'Not Available'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Email:</span>
                    <span className="font-medium">
                      {coInvestmentDetails.leadInvestor?.email || 
                       coInvestmentDetails.co_investment_opportunity?.listed_by_user?.email || 
                       coInvestmentDetails.leadInvestorEmail ||
                       'Not Available'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Lead Investment Amount:</span>
                    <span className="font-semibold text-blue-700">
                      {formatCurrency(coInvestmentDetails.leadInvestorInvested, coInvestmentDetails.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Lead Equity Percentage:</span>
                    <span className="font-semibold text-blue-700">
                      {coInvestmentDetails.leadInvestorEquity?.toFixed(2) || '0.00'}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Co-Investment Summary */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Co-Investment Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Investment Amount:</span>
                    <span className="font-semibold">
                      {formatCurrency(coInvestmentDetails.totalInvestment, coInvestmentDetails.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Equity Percentage:</span>
                    <span className="font-semibold">
                      {coInvestmentDetails.totalEquityPercentage?.toFixed(2) || '0.00'}%
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="text-slate-600">Remaining for Co-Investment:</span>
                    <span className="font-semibold text-orange-600">
                      {formatCurrency(coInvestmentDetails.remainingForCoInvestment, coInvestmentDetails.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* New Investor Offer Section */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h3 className="text-lg font-semibold text-green-900 mb-3">Your Investment Offer</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Investor Name:</span>
                    <span className="font-medium">
                      {coInvestmentDetails.investor?.name || 
                       coInvestmentDetails.investor?.company_name || 
                       coInvestmentDetails.investor_name || 
                       currentUser?.name ||
                       'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Investor Email:</span>
                    <span className="font-medium">
                      {coInvestmentDetails.investor?.email || 
                       coInvestmentDetails.investor_email || 
                       currentUser?.email ||
                       'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="text-slate-600">Offer Amount:</span>
                    <span className="font-semibold text-green-700">
                      {formatCurrency(coInvestmentDetails.newOfferAmount, coInvestmentDetails.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Equity Percentage:</span>
                    <span className="font-semibold text-green-700">
                      {coInvestmentDetails.newEquityPercentage?.toFixed(2) || '0.00'}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Currency:</span>
                    <span className="font-medium">{coInvestmentDetails.currency || 'USD'}</span>
                  </div>
                </div>
              </div>

              {/* Approval Process Timeline */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h3 className="text-lg font-semibold text-purple-900 mb-3">Approval Process</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${coInvestmentDetails.investor_advisor_approval_status === 'approved' ? 'bg-green-500 text-white' : coInvestmentDetails.investor_advisor_approval_status === 'rejected' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                      {coInvestmentDetails.investor_advisor_approval_status === 'approved' ? '✓' : coInvestmentDetails.investor_advisor_approval_status === 'rejected' ? '✗' : '1'}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Investor Advisor Approval</div>
                      <div className="text-sm text-slate-600 capitalize">
                        {coInvestmentDetails.investor_advisor_approval_status?.replaceAll('_', ' ') || 'Pending'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${coInvestmentDetails.lead_investor_approval_status === 'approved' ? 'bg-green-500 text-white' : coInvestmentDetails.lead_investor_approval_status === 'rejected' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                      {coInvestmentDetails.lead_investor_approval_status === 'approved' ? '✓' : coInvestmentDetails.lead_investor_approval_status === 'rejected' ? '✗' : '2'}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Lead Investor Approval</div>
                      <div className="text-sm text-slate-600 capitalize">
                        {coInvestmentDetails.lead_investor_approval_status?.replaceAll('_', ' ') || 'Pending'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${coInvestmentDetails.status === 'accepted' ? 'bg-green-500 text-white' : coInvestmentDetails.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-green-400 text-white'}`}>
                      {coInvestmentDetails.status === 'accepted' ? '✓' : coInvestmentDetails.status === 'rejected' ? '✗' : '3'}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Startup Approval</div>
                      <div className="text-sm text-slate-600 capitalize">
                        {coInvestmentDetails.status?.replaceAll('_', ' ') || 'Pending'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsCoInvestmentDetailsModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500">
              <p>No details available</p>
            </div>
          )}
        </Modal>

        <style>{`
            @keyframes fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .animate-fade-in {
                animation: fade-in 0.5s ease-in-out forwards;
            }
            /* Custom scrollbar for webkit browsers */
            .snap-y {
                scrollbar-width: none; /* For Firefox */
            }
            .snap-y::-webkit-scrollbar {
                display: none; /* For Chrome, Safari, and Opera */
            }
        `}</style>
    </div>
  );
};

export default InvestorView;
