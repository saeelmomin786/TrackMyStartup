import React, { useEffect, useMemo, useState } from 'react';
import { Startup, NewInvestment, StartupAdditionRequest, ComplianceStatus } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Input from './ui/Input';
import { LayoutGrid, PlusCircle, FileText, Video, Gift, Film, Edit, Users, Eye, CheckCircle, Check, Search, Share2, Trash2, MessageCircle, UserPlus, Heart } from 'lucide-react';
import { getQueryParam, setQueryParam } from '../lib/urlState';
import PortfolioDistributionChart from './charts/PortfolioDistributionChart';
import Badge from './ui/Badge';
import { investorService, ActiveFundraisingStartup } from '../lib/investorService';
import { supabase } from '../lib/supabase';
import { FacilitatorAccessService } from '../lib/facilitatorAccessService';
import { recognitionService } from '../lib/recognitionService';
import { facilitatorStartupService, StartupDashboardData } from '../lib/facilitatorStartupService';
import { facilitatorCodeService } from '../lib/facilitatorCodeService';
import { FacilitatorCodeDisplay } from './FacilitatorCodeDisplay';
import ProfilePage from './ProfilePage';
import { capTableService } from '../lib/capTableService';
import IncubationMessagingModal from './IncubationMessagingModal';
import ContractManagementModal from './ContractManagementModal';
// Removed incubationPaymentService import
import { profileService } from '../lib/profileService';
import { formatCurrency as formatCurrencyUtil, getCurrencySymbol, getCurrencyForCountry, getCurrencyForCountryCode } from '../lib/utils';
import AddStartupModal, { StartupFormData } from './AddStartupModal';
import StartupInvitationModal from './StartupInvitationModal';
import EditStartupModal from './EditStartupModal';
import { startupInvitationService, StartupInvitation } from '../lib/startupInvitationService';
import { messageService } from '../lib/messageService';
import MessageContainer from './MessageContainer';

interface FacilitatorViewProps {
  startups: Startup[];
  newInvestments: NewInvestment[];
  startupAdditionRequests: StartupAdditionRequest[];
  onViewStartup: (startup: Startup) => void;
  onAcceptRequest: (requestId: number) => void;
  currentUser?: any;
  onProfileUpdate?: (updatedUser: any) => void;
  onLogout?: () => void;
}

type FacilitatorTab = 'dashboard' | 'discover' | 'intakeManagement' | 'trackMyStartups' | 'ourInvestments';

// Local opportunity type for facilitator postings
type IncubationOpportunity = {
  id: string;
  programName: string;
  description: string;
  deadline: string; // YYYY-MM-DD
  posterUrl?: string;
  videoUrl?: string;
  facilitatorId: string;
  createdAt?: string;
};

type ReceivedApplication = {
  id: string;
  startupId: number;
  startupName: string;
  opportunityId: string;
  status: 'pending' | 'accepted' | 'rejected';
  pitchDeckUrl?: string;
  pitchVideoUrl?: string;
  diligenceStatus: 'none' | 'requested' | 'approved';
  agreementUrl?: string;
  sector?: string;
  stage?: string;
  createdAt?: string;
  diligenceUrls?: string[]; // Array of uploaded diligence document URLs
};

const initialNewOppState = {
  programName: '',
  description: '',
  deadline: '',
  posterUrl: '',
  videoUrl: '',
  facilitatorDescription: '',
  facilitatorWebsite: '',
};

const SummaryCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
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

const FacilitatorView: React.FC<FacilitatorViewProps> = ({ 
  startups, 
  newInvestments, 
  startupAdditionRequests, 
  onViewStartup, 
  onAcceptRequest,
  currentUser,
  onProfileUpdate,
  onLogout
}) => {
  const resolveCurrency = (countryOrCode?: string): string => {
    if (!countryOrCode) return 'USD';
    // Heuristic: 2-letter codes or all-caps assumed as country codes
    const isLikelyCode = countryOrCode.length <= 3 && countryOrCode.toUpperCase() === countryOrCode;
    return isLikelyCode ? getCurrencyForCountryCode(countryOrCode) : getCurrencyForCountry(countryOrCode);
  };

  const buildStartupForView = async (
    base: Partial<Startup> & { id: number | string; name: string; sector: string }
  ): Promise<Startup> => {
    const numericId = typeof base.id === 'string' ? parseInt(base.id, 10) : base.id;
    let profile: any = null;
    try {
      // Validate deadline: must be today or later
      if (newOpportunity.deadline) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const sel = new Date(newOpportunity.deadline);
        sel.setHours(0,0,0,0);
        if (sel < today) {
          messageService.warning(
            'Invalid Deadline',
            'Deadline cannot be in the past. Please choose today or a future date.'
          );
          return;
        }
      }
      if (!isNaN(Number(numericId))) {
        profile = await profileService.getStartupProfile(Number(numericId));
      }
    } catch (e) {
      // ignore profile fetch failures; we'll fall back safely
    }

    const derivedCurrency = (() => {
      if (base.currency) return base.currency as string;
      if (profile?.currency) return profile.currency as string;
      if (profile?.country) return resolveCurrency(profile.country as string);
      if ((base as any).profile?.currency) return (base as any).profile.currency as string;
      if ((base as any).profile?.country) return resolveCurrency((base as any).profile.country as string);
      if (currentUser?.country) return resolveCurrency(currentUser.country);
      return 'USD';
    })();

    return {
      id: (numericId as unknown) as any,
      name: base.name,
      sector: base.sector,
      investmentType: (base as any).investmentType || ('equity' as any),
      investmentValue: (base as any).investmentValue || 0,
      equityAllocation: (base as any).equityAllocation || 0,
      currentValuation: (base as any).currentValuation || 0,
      totalFunding: (base as any).totalFunding || 0,
      totalRevenue: (base as any).totalRevenue || 0,
      registrationDate: (base as any).registrationDate || new Date().toISOString().split('T')[0],
      currency: derivedCurrency,
      complianceStatus: (base as any).complianceStatus || ComplianceStatus.Pending,
      founders: (base as any).founders || [],
      profile: profile || (base as any).profile || undefined,
    } as Startup;
  };

  // Resolve a reliable numeric startup ID for DB RPCs
  const resolveStartupNumericId = async (id: number | string, name?: string): Promise<number | null> => {
    const n = typeof id === 'string' ? parseInt(id as string, 10) : id as number;
    if (!isNaN(n) && n > 0) return n;
    if (name) {
      try {
        const { data } = await supabase
          .from('startups')
          .select('id')
          .eq('name', name)
          .maybeSingle();
        if (data?.id) return Number(data.id);
      } catch {}
    }
    return null;
  };
  const [activeTab, setActiveTab] = useState<FacilitatorTab>((() => {
    const fromUrl = (getQueryParam('tab') as FacilitatorTab) || 'dashboard';
    const valid: FacilitatorTab[] = ['dashboard','discover','intakeManagement','trackMyStartups','ourInvestments'];
    return valid.includes(fromUrl) ? fromUrl : 'dashboard';
  })());
  // Keep URL in sync when tab changes
  useEffect(() => {
    setQueryParam('tab', activeTab, true);
  }, [activeTab]);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(() => getQueryParam('opportunityId'));
  const [showProfilePage, setShowProfilePage] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  // Sync selected opportunity to URL for shareable link
  useEffect(() => {
    if (activeTab === 'intakeManagement') {
      setQueryParam('opportunityId', selectedOpportunityId || '', true);
    }
  }, [selectedOpportunityId, activeTab]);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [isDiligenceModalOpen, setIsDiligenceModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ReceivedApplication | null>(null);
  const [isPitchVideoModalOpen, setIsPitchVideoModalOpen] = useState(false);
  const [selectedPitchVideo, setSelectedPitchVideo] = useState<string>('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newOpportunity, setNewOpportunity] = useState(initialNewOppState);
  const [posterPreview, setPosterPreview] = useState<string>('');
  const [agreementFile, setAgreementFile] = useState<File | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [processingRecognitionId, setProcessingRecognitionId] = useState<string | null>(null);
  const [activeFundraisingStartups, setActiveFundraisingStartups] = useState<ActiveFundraisingStartup[]>([]);
  const [isLoadingPitches, setIsLoadingPitches] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(() => {
    const fromUrl = getQueryParam('pitchId');
    return fromUrl ? Number(fromUrl) : null;
  });
  const [favoritedPitches, setFavoritedPitches] = useState<Set<number>>(new Set());
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [showOnlyValidated, setShowOnlyValidated] = useState(false);
  const [shuffledPitches, setShuffledPitches] = useState<ActiveFundraisingStartup[]>([]);
  const [facilitatorId, setFacilitatorId] = useState<string | null>(null);
  const [myPostedOpportunities, setMyPostedOpportunities] = useState<IncubationOpportunity[]>([]);
  const [myReceivedApplications, setMyReceivedApplications] = useState<ReceivedApplication[]>([]);
  const [recognitionRecords, setRecognitionRecords] = useState<any[]>([]);
  const [isLoadingRecognition, setIsLoadingRecognition] = useState(false);
  const [domainStageMap, setDomainStageMap] = useState<{ [key: number]: { domain: string; stage: string } }>({});
  const [portfolioStartups, setPortfolioStartups] = useState<StartupDashboardData[]>([]);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPrices, setCurrentPrices] = useState<Record<number, number>>({});
  
  // New state for messaging and payment functionality
  const [isMessagingModalOpen, setIsMessagingModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedApplicationForMessaging, setSelectedApplicationForMessaging] = useState<ReceivedApplication | null>(null);
  const [selectedApplicationForContract, setSelectedApplicationForContract] = useState<ReceivedApplication | null>(null);
  const [selectedApplicationForDiligence, setSelectedApplicationForDiligence] = useState<ReceivedApplication | null>(null);
  
  // New state for startup invitation functionality
  const [isAddStartupModalOpen, setIsAddStartupModalOpen] = useState(false);
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
  const [selectedStartupForInvitation, setSelectedStartupForInvitation] = useState<StartupFormData | null>(null);
  const [startupInvitations, setStartupInvitations] = useState<StartupInvitation[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [facilitatorCode, setFacilitatorCode] = useState<string>('');
  
  // State for edit startup functionality
  const [isEditStartupModalOpen, setIsEditStartupModalOpen] = useState(false);
  const [selectedStartupForEdit, setSelectedStartupForEdit] = useState<StartupInvitation | null>(null);
  
  // State for showing more items in dashboard cards
  const [showAllStartups, setShowAllStartups] = useState(false);
  const [showAllOpportunities, setShowAllOpportunities] = useState(false);
  const [showAllApplications, setShowAllApplications] = useState(false);
  
  const formatCurrency = (value: number, currency: string = 'USD') => 
    formatCurrencyUtil(value, currency, { notation: 'compact' });

  // Handle messaging modal
  const handleOpenMessaging = (application: ReceivedApplication) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(application.id)) {
      messageService.info(
        'Messaging Location',
        'Messaging is only available for valid program applications. Open from Applications where an application exists.'
      );
      return;
    }
    setSelectedApplicationForMessaging(application);
    setIsMessagingModalOpen(true);
  };

  const handleCloseMessaging = () => {
    setIsMessagingModalOpen(false);
    setSelectedApplicationForMessaging(null);
  };



  // Function to refresh data after payment
  const refreshData = async () => {
    try {
      // Trigger a page refresh to reload all data
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };


  // Handle contract management modal
  const handleOpenContract = (application: ReceivedApplication) => {
    setSelectedApplicationForContract(application);
    setIsContractModalOpen(true);
  };

  const handleCloseContract = () => {
    setIsContractModalOpen(false);
    setSelectedApplicationForContract(null);
  };

  const handleOpenDiligenceDocuments = async (app: ReceivedApplication) => {
    console.log('🔍 FACILITATOR VIEW: Opening diligence documents for app:', app.id);
    
    // Fetch fresh data from database to ensure we have the latest diligence_urls
    try {
      const { data: freshData, error } = await supabase
        .from('opportunity_applications')
        .select('diligence_urls, diligence_status')
        .eq('id', app.id)
        .single();
      
      console.log('🔍 FACILITATOR VIEW: Fresh database data:', freshData);
      console.log('🔍 FACILITATOR VIEW: Database error:', error);
      
      if (freshData) {
        // Update the app with fresh data
        const updatedApp = {
          ...app,
          diligenceUrls: freshData.diligence_urls || [],
          diligenceStatus: freshData.diligence_status
        };
        console.log('🔍 FACILITATOR VIEW: Updated app with fresh data:', updatedApp);
        setSelectedApplicationForDiligence(updatedApp);
      } else {
        setSelectedApplicationForDiligence(app);
      }
    } catch (err) {
      console.error('🔍 FACILITATOR VIEW: Error fetching fresh data:', err);
      setSelectedApplicationForDiligence(app);
    }
    
    setIsDiligenceModalOpen(true);
  };

  const handleCloseDiligenceDocuments = () => {
    setIsDiligenceModalOpen(false);
    setSelectedApplicationForDiligence(null);
  };

  const handleApproveDiligence = async (app: ReceivedApplication) => {
    if (!app.id) return;
    
    setIsProcessingAction(true);
    try {
      console.log('🔄 Approving diligence for application:', app.id);
      
      // Use RPC to approve diligence
      const { data, error: rpcError } = await supabase.rpc('safe_update_diligence_status', {
        p_application_id: app.id,
        p_new_status: 'approved',
        p_old_status: 'requested'
      });
      
      if (rpcError) {
        console.error('RPC function error:', rpcError);
        throw rpcError;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ Diligence was already approved or status changed');
        await loadFacilitatorData(); // Reload data
        return;
      }

      // Update local state
      setMyReceivedApplications(prev => prev.map(application => 
        application.id === app.id 
          ? { ...application, diligenceStatus: 'approved' }
          : application
      ));

      // Close modal
      setIsDiligenceModalOpen(false);
      setSelectedApplicationForDiligence(null);
      
      messageService.success(
        'Diligence Approved',
        'Diligence request approved! The startup has been notified.',
        3000
      );
      
    } catch (err) {
      console.error('Error approving diligence:', err);
      messageService.error(
        'Approval Failed',
        'Failed to approve diligence request. Please try again.'
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRejectDiligence = async (app: ReceivedApplication) => {
    if (!app.id) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to reject this diligence request? The startup will be notified and can re-upload documents if needed.'
    );
    
    if (!confirmed) return;
    
    setIsProcessingAction(true);
    try {
      console.log('🔄 Rejecting diligence for application:', app.id);
      
      // Use RPC to reject diligence
      const { data, error: rpcError } = await supabase.rpc('safe_update_diligence_status', {
        p_application_id: app.id,
        p_new_status: 'rejected',
        p_old_status: 'requested'
      });
      
      if (rpcError) {
        console.error('RPC function error:', rpcError);
        throw rpcError;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ Diligence status was already changed');
        await loadFacilitatorData(); // Reload data
        return;
      }

      // Update local state
      setMyReceivedApplications(prev => prev.map(application => 
        application.id === app.id 
          ? { ...application, diligenceStatus: 'none' } // Reset to none so they can request again
          : application
      ));

      // Close modal
      setIsDiligenceModalOpen(false);
      setSelectedApplicationForDiligence(null);
      
      messageService.success(
        'Diligence Rejected',
        'Diligence request rejected. The startup can upload new documents and request again.',
        3000
      );
      
    } catch (err) {
      console.error('Error rejecting diligence:', err);
      messageService.error(
        'Rejection Failed',
        'Failed to reject diligence request. Please try again.'
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Load current prices from recognition records data
  const loadCurrentPrices = () => {
    const prices: Record<number, number> = {};
    
    // Extract prices from recognition records data
    recognitionRecords.forEach(record => {
      if (record.pricePerShare && record.pricePerShare > 0) {
        prices[record.startupId] = record.pricePerShare;
      }
    });
    
    console.log('💰 Loaded current prices from recognition records:', prices);
    console.log('💰 Recognition records data:', recognitionRecords.map(r => ({
      startupId: r.startupId,
      pricePerShare: r.pricePerShare,
      shares: r.shares
    })));
    setCurrentPrices(prices);
  };

  // Load current prices when recognition records or portfolio data changes
  useEffect(() => {
    if (recognitionRecords.length > 0) {
      loadCurrentPrices();
    }
  }, [recognitionRecords, portfolioStartups]);

  const handleShare = async (startup: ActiveFundraisingStartup) => {
    console.log('Share button clicked for startup:', startup.name);
    console.log('Startup object:', startup);
    // Build a deep link to this pitch in Facilitator Discover tab
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'discover');
    url.searchParams.set('pitchId', String(startup.id));
    const shareUrl = url.toString();
    // Calculate valuation from investment value and equity allocation
    const valuation = startup.equityAllocation > 0 ? (startup.investmentValue / (startup.equityAllocation / 100)) : 0;
    const inferredCurrency =
      startup.currency ||
      (startup as any).profile?.currency ||
      ((startup as any).profile?.country ? resolveCurrency((startup as any).profile?.country) : undefined) ||
      (currentUser?.country ? resolveCurrency(currentUser.country) : 'USD');
    const symbol = getCurrencySymbol(inferredCurrency);
    const details = `Startup: ${startup.name || 'N/A'}\nSector: ${startup.sector || 'N/A'}\nAsk: ${symbol}${(startup.investmentValue || 0).toLocaleString()} for ${startup.equityAllocation || 0}% equity\nValuation: ${symbol}${valuation.toLocaleString()}\n\nOpen pitch: ${shareUrl}`;
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
        await navigator.clipboard.writeText(details);
        messageService.success(
          'Copied to Clipboard',
          'Startup details copied to clipboard',
          2000
        );
      } else {
        console.log('Using fallback copy method');
        // Fallback: hidden textarea copy
        const textarea = document.createElement('textarea');
        textarea.value = details;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        messageService.success(
          'Copied to Clipboard',
          'Startup details copied to clipboard',
          2000
        );
      }
    } catch (err) {
      console.error('Share failed', err);
      messageService.error(
        'Share Failed',
        'Unable to share. Try copying manually.'
      );
    }
  };

  const myPortfolio = useMemo(() => portfolioStartups, [portfolioStartups]);
  const myApplications = useMemo(() => startupAdditionRequests, [startupAdditionRequests]);

  // Load facilitator's portfolio of approved startups
  const loadPortfolio = async (facilitatorId: string) => {
    try {
      setIsLoadingPortfolio(true);
      const portfolio = await facilitatorStartupService.getFacilitatorPortfolio(facilitatorId);
      setPortfolioStartups(portfolio);
    } catch (err) {
      console.error('Error loading portfolio:', err);
      setPortfolioStartups([]);
    } finally {
      setIsLoadingPortfolio(false);
    }
  };

  // Load recognition requests for this facilitator
  const loadRecognitionRecords = async (facilitatorId: string) => {
    try {
      setIsLoadingRecognition(true);
      
      // Get facilitator code first, create one if it doesn't exist
      const { data: facilitatorData, error: facilitatorError } = await supabase
        .from('users')
        .select('facilitator_code')
        .eq('id', facilitatorId)
        .single();

      if (facilitatorError) {
        console.error('❌ Error getting facilitator code:', facilitatorError);
        return;
      }

      let facilitatorCode = facilitatorData?.facilitator_code;
      
      // If no facilitator code exists, create one
      if (!facilitatorCode) {
        console.log('📝 No facilitator code found, creating one...');
        facilitatorCode = await facilitatorCodeService.createOrUpdateFacilitatorCode(facilitatorId);
        if (!facilitatorCode) {
          console.error('❌ Failed to create facilitator code');
          return;
        }
      }

      if (!facilitatorCode) {
        console.error('❌ No facilitator code available, cannot load recognition records');
        setRecognitionRecords([]);
        return;
      }
      
      // First, let's check if there are any recognition records at all
      const { data: allRecords, error: allRecordsError } = await supabase
        .from('recognition_records')
        .select('*')
        .limit(5);
      
      // Query the original recognition_records table with proper startup data and investment details
      const { data, error } = await supabase
        .from('recognition_records')
        .select(`
          *,
          startups (
            id, 
            name, 
            sector, 
            total_funding,
            total_revenue,
            registration_date,
            currency,
            current_valuation,
            startup_shares (
              price_per_share,
              total_shares
            )
          )
        `)
        .eq('facilitator_code', facilitatorCode)
        .order('date_added', { ascending: false });
      
      if (error) {
        console.error('❌ Error loading recognition requests:', error);
        setRecognitionRecords([]);
        return;
      }

      // Fetch domain and stage data from multiple sources for these startups
      const startupIds = data?.map(record => record.startup_id) || [];
      let tempDomainStageMap: { [key: number]: { domain: string; stage: string } } = {};
      
      if (startupIds.length > 0) {
        // 1. First, try to get data from opportunity_applications (most recent)
        const { data: applicationData, error: applicationError } = await supabase
          .from('opportunity_applications')
          .select('startup_id, domain, stage, sector')
          .in('startup_id', startupIds)
          .eq('status', 'accepted'); // Only get accepted applications

        if (!applicationError && applicationData) {
          applicationData.forEach(app => {
            tempDomainStageMap[app.startup_id] = {
              domain: app.domain || app.sector || 'N/A',
              stage: app.stage || 'N/A'
            };
          });
        }

        // 2. For startups without application data, check fundraising data
        const startupsWithoutData = startupIds.filter(id => !tempDomainStageMap[id]);
        if (startupsWithoutData.length > 0) {
          console.log('🔍 Checking fundraising data for startups without application data:', startupsWithoutData);
          
          // Check fundraising_details table for domain/stage information
          const { data: fundraisingData, error: fundraisingError } = await supabase
            .from('fundraising_details')
            .select('startup_id, domain, stage')
            .in('startup_id', startupsWithoutData);

          if (!fundraisingError && fundraisingData) {
            fundraisingData.forEach(fund => {
              if (!tempDomainStageMap[fund.startup_id]) {
                tempDomainStageMap[fund.startup_id] = {
                  domain: fund.domain || 'N/A',
                  stage: fund.stage || 'N/A'
                };
              }
            });
          }
        }

        // 3. Update startup sectors with the best available data
        Object.entries(tempDomainStageMap).forEach(([startupId, data]) => {
          if (data.domain && data.domain !== 'N/A') {
            console.log(`🔄 Updating startup ${startupId} sector from domain: ${data.domain}`);
            
            // Update the startup sector in the database if it's still the default 'Technology'
            supabase
              .from('startups')
              .update({ sector: data.domain })
              .eq('id', parseInt(startupId))
              .eq('sector', 'Technology') // Only update if it's still the default
              .then(({ error }) => {
                if (error) {
                  console.error(`❌ Error updating startup sector for ${startupId}:`, error);
                } else {
                  console.log(`✅ Updated startup ${startupId} sector to: ${data.domain}`);
                }
              });
          }
        });
      }
      
      // Set the domain stage map in state
      setDomainStageMap(tempDomainStageMap);

      // Map database data to RecognitionRecord interface with domain and stage
      const mappedRecords = (data || []).map(record => {
        // Get shares - try recognition_records table first, then calculate
        const sharesFromRecord = record.shares || 0;
        const totalShares = record.startups?.startup_shares?.[0]?.total_shares || 10000; // Default to 10,000 shares
        const equityAllocated = record.equity_allocated || 0;
        const calculatedShares = sharesFromRecord > 0 ? sharesFromRecord : 
                                 (totalShares > 0 && equityAllocated > 0 
                                   ? Math.round((totalShares * equityAllocated) / 100) 
                                   : Math.round(totalShares * 0.1)); // Default to 10% if no equity allocated
        
        // Get price per share - try multiple sources in priority order
        const pricePerShare = record.price_per_share || 
                             record.startups?.startup_shares?.[0]?.price_per_share || 
                             (record.startups?.current_valuation && record.startups?.startup_shares?.[0]?.total_shares 
                               ? record.startups.current_valuation / record.startups.startup_shares[0].total_shares 
                               : record.startups?.current_valuation / totalShares || 10); // Default to $10 per share
        
        // Get investment amount - try multiple sources
        const investmentAmount = record.investment_amount || 
                                record.fee_amount || 
                                (calculatedShares > 0 && pricePerShare > 0 
                                  ? calculatedShares * pricePerShare 
                                  : 100000); // Default to $100,000 investment

        // Debug logging for this record
        console.log(`🔍 Debug record ${record.id}:`, {
          startupId: record.startup_id,
          startupName: record.startups?.name,
          sharesFromRecord: sharesFromRecord,
          totalShares: totalShares,
          equityAllocated: equityAllocated,
          calculatedShares: calculatedShares,
          pricePerShare: pricePerShare,
          investmentAmount: investmentAmount,
          feeAmount: record.fee_amount,
          recordShares: record.shares,
          recordPricePerShare: record.price_per_share,
          recordInvestmentAmount: record.investment_amount,
          startupShares: record.startups?.startup_shares?.[0]
        });

        return {
          id: record.id.toString(), // Keep as string for UI consistency
          startupId: record.startup_id,
          programName: record.program_name,
          facilitatorName: record.facilitator_name,
          facilitatorCode: record.facilitator_code,
          incubationType: record.incubation_type,
          feeType: record.fee_type,
          feeAmount: record.fee_amount,
          equityAllocated: record.equity_allocated,
          preMoneyValuation: record.pre_money_valuation,
          postMoneyValuation: record.post_money_valuation,
          signedAgreementUrl: record.signed_agreement_url,
          status: record.status || 'pending',
          dateAdded: record.date_added,
          // Add calculated fields for investment portfolio display
          shares: calculatedShares,
          pricePerShare: pricePerShare,
          investmentAmount: investmentAmount,
          stage: tempDomainStageMap[record.startup_id]?.stage || 'N/A',
          // Include startup data for display with current price and domain/stage
          startup: {
            ...record.startups,
            currentPricePerShare: pricePerShare,
            currentValuation: record.startups?.current_valuation || 0,
            // Use domain from opportunity_applications, fallback to startup sector, then to 'N/A'
            sector: tempDomainStageMap[record.startup_id]?.domain || 
                   (record.startups?.sector && record.startups.sector !== 'Technology' ? record.startups.sector : 'N/A'),
            // Add stage information
            stage: tempDomainStageMap[record.startup_id]?.stage || 'N/A'
          }
        };
      });
      
      console.log('📋 Mapped recognition records with domain/stage:', mappedRecords);
      console.log('🔍 Debug domain/stage mapping:', tempDomainStageMap);
      console.log('🏢 Sector mapping debug:', {
        totalRecords: mappedRecords.length,
        recordsWithDomainMapping: mappedRecords.filter(r => tempDomainStageMap[r.startupId]?.domain).length,
        recordsWithStartupSector: mappedRecords.filter(r => r.startup?.sector && r.startup.sector !== 'Technology').length,
        domainStageMapKeys: Object.keys(tempDomainStageMap),
        sampleMappings: Object.entries(tempDomainStageMap).slice(0, 3)
      });
      console.log('💰 Investment data summary:', {
        totalRecords: mappedRecords.length,
        recordsWithShares: mappedRecords.filter(r => r.shares > 0).length,
        recordsWithPrices: mappedRecords.filter(r => r.pricePerShare > 0).length,
        recordsWithInvestmentAmount: mappedRecords.filter(r => r.investmentAmount > 0).length
      });
      setRecognitionRecords(mappedRecords);
      return;
    } catch (err) {
      console.error('Error loading recognition requests:', err);
      setRecognitionRecords([]);
    } finally {
      setIsLoadingRecognition(false);
    }
  };




  // Load current facilitator and their opportunities
  useEffect(() => {
    let mounted = true;
    let loadingTimeout: NodeJS.Timeout;
    
    const loadFacilitatorData = async () => {
      try {
      const { data: { user } } = await supabase.auth.getUser();
        if (!mounted || !user?.id) return;
        
        setFacilitatorId(user.id);
        // Set loading timeout to prevent infinite loading
        loadingTimeout = setTimeout(() => {
          if (mounted) {
            console.warn('⚠️ Data loading timeout - some data may not have loaded');
          }
        }, 30000); // 30 second timeout
        
        // Load all data in parallel with proper error handling
        const [opportunitiesResult, recognitionResult, portfolioResult] = await Promise.allSettled([
          // Load opportunities
          supabase
          .from('incubation_opportunities')
          .select('*')
          .eq('facilitator_id', user.id)
            .order('created_at', { ascending: false }),
          
          // Load recognition records
          loadRecognitionRecords(user.id),
          
          // Load portfolio
          loadPortfolio(user.id)
        ]);
        
        if (!mounted) return;
        
        // Handle opportunities loading
        if (opportunitiesResult.status === 'fulfilled' && !opportunitiesResult.value.error) {
          const data = opportunitiesResult.value.data;
          if (Array.isArray(data)) {
          const mapped: IncubationOpportunity[] = data.map((row: any) => ({
            id: row.id,
            programName: row.program_name,
            description: row.description,
            deadline: row.deadline,
            posterUrl: row.poster_url || undefined,
            videoUrl: row.video_url || undefined,
            facilitatorId: row.facilitator_id,
            createdAt: row.created_at
          }));
          setMyPostedOpportunities(mapped);

            // Load applications for opportunities
          if (mapped.length > 0) {
            const oppIds = mapped.map(o => o.id);
            try {
            const { data: apps, error: appsError } = await supabase
              .from('opportunity_applications')
              .select('id, opportunity_id, status, startup_id, pitch_deck_url, pitch_video_url, diligence_status, agreement_url, domain, stage, created_at, diligence_urls, startups!inner(id,name)')
              .in('opportunity_id', oppIds)
              .order('created_at', { ascending: false });
            
            if (appsError) {
                  console.error('❌ Error loading opportunity applications:', appsError);
                  // Try without the inner join
                  const { data: fallbackApps, error: fallbackAppsError } = await supabase
                    .from('opportunity_applications')
                    .select('id, opportunity_id, status, startup_id, pitch_deck_url, pitch_video_url, diligence_status, agreement_url, domain, stage, created_at, diligence_urls')
                    .in('opportunity_id', oppIds)
                    .order('created_at', { ascending: false });
                  
                  if (fallbackAppsError) {
                    console.error('❌ Fallback query also failed:', fallbackAppsError);
                    setMyReceivedApplications([]);
                  } else {
                    // Map without startup data
                    const fallbackAppsMapped: ReceivedApplication[] = (fallbackApps || []).map((a: any) => ({
                      id: a.id,
                      startupId: a.startup_id,
                      startupName: 'Unknown Startup', // Fallback name
                      opportunityId: a.opportunity_id,
                      status: a.status,
                      diligenceStatus: a.diligence_status,
                      agreementUrl: a.agreement_url,
                      pitchDeckUrl: a.pitch_deck_url,
                      pitchVideoUrl: a.pitch_video_url,
                      sector: a.domain,
                      stage: a.stage,
                      createdAt: a.created_at,
                      diligenceUrls: a.diligence_urls || []
                    }));
                    setMyReceivedApplications(fallbackAppsMapped);
                  }
            } else {
              const appsMapped: ReceivedApplication[] = (apps || []).map((a: any) => ({
                id: a.id,
                startupId: a.startup_id,
                startupName: a.startups?.name || `Startup #${a.startup_id}`,
                opportunityId: a.opportunity_id,
                status: a.status || 'pending',
                pitchDeckUrl: a.pitch_deck_url || undefined,
                pitchVideoUrl: a.pitch_video_url || undefined,
                diligenceStatus: a.diligence_status || 'none',
                agreementUrl: a.agreement_url || undefined,
                sector: a.domain,
                stage: a.stage,
                createdAt: a.created_at,
                diligenceUrls: a.diligence_urls || []
              }));
              if (mounted) setMyReceivedApplications(appsMapped);
                }
              } catch (appsErr) {
                console.error('Error loading applications:', appsErr);
                setMyReceivedApplications([]);
            }
          } else {
            setMyReceivedApplications([]);
          }
          }
        } else {
          console.error('Error loading opportunities:', opportunitiesResult.status === 'rejected' ? opportunitiesResult.reason : opportunitiesResult.value.error);
        }
        
        // Handle recognition and portfolio results
        if (recognitionResult.status === 'rejected') {
          console.error('Error loading recognition records:', recognitionResult.reason);
        }
        
        if (portfolioResult.status === 'rejected') {
          console.error('Error loading portfolio:', portfolioResult.reason);
        }
        
      } catch (error) {
        console.error('Error in loadFacilitatorData:', error);
      } finally {
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
        }
      }
    };
    
    loadFacilitatorData();
    
    return () => { 
      mounted = false;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'discover') return;
    let mounted = true;
    setIsLoadingPitches(true);
    investorService.getActiveFundraisingStartups()
      .then(list => { if (mounted) setActiveFundraisingStartups(list); })
      .finally(() => { if (mounted) setIsLoadingPitches(false); });
    return () => { mounted = false; };
  }, [activeTab]);

  // Keep selected pitch in URL when on discover tab
  useEffect(() => {
    if (activeTab === 'discover') {
      setQueryParam('pitchId', playingVideoId ? String(playingVideoId) : '', true);
    }
  }, [playingVideoId, activeTab]);

  // Shuffle pitches like investor reels: interleave verified and unverified (2:1)
  useEffect(() => {
    if (activeTab !== 'discover' || activeFundraisingStartups.length === 0) return;
    const verified = activeFundraisingStartups.filter(s => s.complianceStatus === ComplianceStatus.Compliant);
    const unverified = activeFundraisingStartups.filter(s => s.complianceStatus !== ComplianceStatus.Compliant);
    const shuffle = (arr: ActiveFundraisingStartup[]) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const sv = shuffle(verified);
    const su = shuffle(unverified);
    const result: ActiveFundraisingStartup[] = [];
    let i = 0, j = 0;
    while (i < sv.length || j < su.length) {
      if (i < sv.length) result.push(sv[i++]);
      if (i < sv.length) result.push(sv[i++]);
      if (j < su.length) result.push(su[j++]);
    }
    setShuffledPitches(result);
  }, [activeTab, activeFundraisingStartups]);

  const handleFavoriteToggle = (pitchId: number) => {
    setFavoritedPitches(prev => {
      const next = new Set(prev);
      if (next.has(pitchId)) next.delete(pitchId); else next.add(pitchId);
      return next;
    });
  };




  // Derived: sort applications - pending first, then by newest createdAt; others by newest createdAt
  const sortedReceivedApplications = useMemo(() => {
    const toTime = (s?: string) => (s ? new Date(s).getTime() : 0);
    const pending = myReceivedApplications.filter(a => a.status === 'pending').sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));
    const others = myReceivedApplications.filter(a => a.status !== 'pending').sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));
    return [...pending, ...others];
  }, [myReceivedApplications]);

  // Realtime: update received applications list when new rows are inserted
  useEffect(() => {
    if (!facilitatorId || myPostedOpportunities.length === 0) return;
    
    const oppIds = myPostedOpportunities.map(o => o.id);
    let channel: any = null;
    
    try {
      channel = supabase
      .channel('opportunity_applications_changes')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'opportunity_applications' 
        }, async (payload) => {
        try {
          const row: any = payload.new;
          if (!oppIds.includes(row.opportunity_id)) return;
            
            const { data: startup, error: startupError } = await supabase
            .from('startups')
            .select('id,name')
            .eq('id', row.startup_id)
            .single();
            
            if (startupError) {
              console.error('Error fetching startup for new application:', startupError);
              return;
            }
            
          setMyReceivedApplications(prev => [
            {
              id: row.id,
              startupId: row.startup_id,
              startupName: startup?.name || `Startup #${row.startup_id}`,
              opportunityId: row.opportunity_id,
              status: row.status || 'pending',
              pitchDeckUrl: row.pitch_deck_url || undefined,
              pitchVideoUrl: row.pitch_video_url || undefined,
              diligenceStatus: row.diligence_status || 'none',
              agreementUrl: row.agreement_url || undefined,
              stage: row.stage,
              createdAt: row.created_at
            },
            ...prev
          ]);
          
          // Show notification to facilitator
          console.log('📝 Application details:', row);
        } catch (e) {
            console.error('Error processing new application:', e);
          }
        })
        .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'opportunity_applications' 
        }, async (payload) => {
          try {
            const row: any = payload.old;
            if (!oppIds.includes(row.opportunity_id)) return;
            
            // Remove the deleted application from local state
            setMyReceivedApplications(prev => prev.filter(app => app.id !== row.id));
            
            console.log(`🗑️ Application deleted: ${row.id}`);
          } catch (e) {
            console.error('Error processing deleted application:', e);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Error subscribing to opportunity applications changes');
          }
        });
    } catch (error) {
      console.error('Error setting up opportunity applications subscription:', error);
    }
    
    return () => { 
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [facilitatorId, myPostedOpportunities]);

  // Realtime: update recognition records when they are deleted
  useEffect(() => {
    if (!facilitatorId) return;
    
    let channel: any = null;
    
    try {
      channel = supabase
      .channel('recognition_records_changes')
        .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'recognition_records' 
        }, async (payload) => {
          try {
            const row: any = payload.old;
            
            // Remove the deleted recognition record from local state
            setRecognitionRecords(prev => prev.filter(record => record.id !== row.id.toString()));
            
            console.log(`🗑️ Recognition record deleted: ${row.id}`);
          } catch (e) {
            console.error('Error processing deleted recognition record:', e);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Error subscribing to recognition records changes');
          }
        });
    } catch (error) {
      console.error('Error setting up recognition records subscription:', error);
    }
    
    return () => { 
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [facilitatorId]);

  // Realtime: update facilitator startups when they are deleted
  useEffect(() => {
    if (!facilitatorId) return;
    
    let channel: any = null;
    
    try {
      channel = supabase
      .channel('facilitator_startups_changes')
        .on('postgres_changes', { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'facilitator_startups',
          filter: `facilitator_id=eq.${facilitatorId}`
        }, async (payload) => {
          try {
            const row: any = payload.old;
            
            // Remove the deleted startup from local state
            setPortfolioStartups(prev => prev.filter(startup => startup.id !== row.startup_id));
            
            console.log(`🗑️ Startup removed from portfolio: ${row.startup_id}`);
          } catch (e) {
            console.error('Error processing deleted facilitator startup:', e);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Error subscribing to facilitator startups changes');
          }
        });
    } catch (error) {
      console.error('Error setting up facilitator startups subscription:', error);
    }
    
    return () => { 
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [facilitatorId]);

  // Realtime: update diligence status when startup approves
  useEffect(() => {
    if (!facilitatorId || myPostedOpportunities.length === 0) return;
    
    const oppIds = myPostedOpportunities.map(o => o.id);
    let channel: any = null;
    
    try {
      channel = supabase
      .channel('diligence_status_changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'opportunity_applications',
        filter: `opportunity_id=in.(${oppIds.join(',')})`
      }, async (payload) => {
        try {
          const row: any = payload.new;
          if (!oppIds.includes(row.opportunity_id)) return;
          
          // Update the application in the local state
          setMyReceivedApplications(prev => prev.map(app => 
            app.id === row.id 
              ? { 
                  ...app, 
                  diligenceStatus: row.diligence_status || 'none'
                }
              : app
          ));
          
          // Show notification if diligence was approved
          if (row.diligence_status === 'approved') {
              const { data: startup, error: startupError } = await supabase
              .from('startups')
              .select('name')
              .eq('id', row.startup_id)
              .single();
              
              if (startupError) {
                console.error('Error fetching startup for diligence approval:', startupError);
                return;
              }
              
            // Show success popup
            const successMessage = document.createElement('div');
            successMessage.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            successMessage.innerHTML = `
              <div class="bg-white rounded-lg p-6 max-w-sm mx-4 text-center">
                <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
            </div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Due Diligence Approved!</h3>
                <p class="text-gray-600 mb-4">${startup?.name || 'Startup'} has approved your due diligence request.</p>
                <button onclick="this.parentElement.parentElement.remove()" class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
                  Continue
                </button>
          </div>
            `;
            document.body.appendChild(successMessage);
          }
        } catch (e) {
          console.error('Error handling diligence status update:', e);
        }
      })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Error subscribing to diligence status changes');
          }
        });
    } catch (error) {
      console.error('Error setting up diligence status subscription:', error);
    }
    
    return () => { 
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [facilitatorId, myPostedOpportunities]);

  // Load facilitator code and startup invitations
  useEffect(() => {
    if (!facilitatorId) return;

    const loadFacilitatorCode = async () => {
      try {
        const code = await facilitatorCodeService.getFacilitatorCodeByUserId(facilitatorId);
        setFacilitatorCode(code || '');
      } catch (error) {
        console.error('Error loading facilitator code:', error);
      }
    };

    loadFacilitatorCode();
    loadStartupInvitations();
  }, [facilitatorId]);

  const handleOpenPostModal = () => {
    setEditingIndex(null);
    setNewOpportunity(initialNewOppState);
    setPosterPreview('');
    setIsPostModalOpen(true);
  };

  const handleEditClick = (index: number) => {
    setEditingIndex(index);
    const opp = myPostedOpportunities[index];
    setNewOpportunity({
      programName: opp?.programName || '',
      description: opp?.description || '',
      deadline: opp?.deadline || '',
      posterUrl: opp?.posterUrl || '',
      videoUrl: opp?.videoUrl || '',
      facilitatorDescription: '',
      facilitatorWebsite: '',
    });
    setPosterPreview('');
    setIsPostModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewOpportunity(prev => ({ ...prev, [name]: value }));
  };

  const handleAcceptApplication = (application: ReceivedApplication) => {
    setSelectedApplication(application);
    setIsAcceptModalOpen(true);
  };

  const handleViewPitchVideo = (videoUrl: string) => {
    setSelectedPitchVideo(videoUrl);
    setIsPitchVideoModalOpen(true);
  };

  const getEmbeddableVideoUrl = (url: string): string => {
    if (!url) return '';
    
    // YouTube URL conversion
    if (url.includes('youtube.com/watch')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }
    
    // YouTube short URL conversion
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }
    
    // Vimeo URL conversion
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
    }
    
    // If it's already an embed URL or direct video URL, return as is
    if (url.includes('embed') || url.includes('.mp4') || url.includes('.webm') || url.includes('.mov')) {
      return url;
    }
    
    // For other URLs, try to use as is (might work for some platforms)
    return url;
  };

  const handleRejectApplication = async (application: ReceivedApplication) => {
    if (!confirm(`Are you sure you want to reject the application from ${application.startupName}?`)) {
      return;
    }

    try {
      setIsProcessingAction(true);
      
      const { error } = await supabase
        .from('opportunity_applications')
        .update({ status: 'rejected' })
        .eq('id', application.id);

      if (error) {
        console.error('Error rejecting application:', error);
        messageService.error(
          'Rejection Failed',
          'Failed to reject application. Please try again.'
        );
        return;
      }

      // Update local state
      setMyReceivedApplications(prev => 
        prev.map(app => 
          app.id === application.id 
            ? { ...app, status: 'rejected' as const }
            : app
        )
      );

      messageService.success(
        'Application Rejected',
        'Application rejected successfully.',
        3000
      );
    } catch (error) {
      console.error('Error rejecting application:', error);
      messageService.error(
        'Rejection Failed',
        'Failed to reject application. Please try again.'
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteApplication = async (application: ReceivedApplication) => {
    if (!confirm(`Are you sure you want to delete the application from ${application.startupName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsProcessingAction(true);
      
      console.log('🗑️ Attempting to delete application:', {
        applicationId: application.id,
        startupName: application.startupName,
        table: 'opportunity_applications'
      });
      
      // Instead of deleting, withdraw the application to preserve data
      const { data, error } = await supabase
        .from('opportunity_applications')
        .update({ 
          application_status: 'withdrawn',
          status: 'withdrawn',
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id)
        .select();

      console.log('🗑️ Delete result:', { data, error });

      if (error) {
        console.error('Error withdrawing application:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        messageService.error(
          'Withdrawal Failed',
          'Failed to withdraw application. Please try again.'
        );
        return;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No rows were updated. Application might not exist or already withdrawn.');
        messageService.warning(
          'Application Not Found',
          'Application was not found or was already withdrawn.'
        );
        return;
      }

      // Update local state
      setMyReceivedApplications(prev => prev.filter(app => app.id !== application.id));

      messageService.success(
        'Application Withdrawn',
        'Application has been withdrawn. Startup data is preserved.',
        3000
      );
    } catch (error) {
      console.error('Error withdrawing application:', error);
      messageService.error(
        'Withdrawal Failed',
        'Failed to withdraw application. Please try again.'
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteStartupFromPortfolio = async (startupId: number) => {
    if (!confirm('Are you sure you want to remove this startup from your portfolio?')) {
      return;
    }

    try {
      setIsProcessingAction(true);
      
      console.log('🗑️ Attempting to delete startup from portfolio:', {
        startupId,
        facilitatorId,
        table: 'facilitator_startups'
      });
      
      // First check if the relationship exists
      const { data: existingRelationship, error: checkError } = await supabase
        .from('facilitator_startups')
        .select('id, startup_id, facilitator_id, status')
        .eq('startup_id', startupId)
        .eq('facilitator_id', facilitatorId)
        .single();
      
      console.log('🔍 Relationship check:', { existingRelationship, checkError });
      
      if (checkError || !existingRelationship) {
        console.warn('⚠️ Relationship not found before deletion attempt:', { startupId, facilitatorId, checkError });
        messageService.warning(
          'Relationship Not Found',
          'Startup relationship was not found. It may have already been removed or you may not have permission to remove it.'
        );
        return;
      }
      
      console.log('🔍 Relationship found, proceeding with delete:', {
        relationshipId: existingRelationship.id,
        startupId: existingRelationship.startup_id,
        facilitatorId: existingRelationship.facilitator_id,
        status: existingRelationship.status
      });
      
      // Remove from facilitator_startups table (correct table name)
      const { data, error } = await supabase
        .from('facilitator_startups')
        .delete()
        .eq('startup_id', startupId)
        .eq('facilitator_id', facilitatorId)
        .select();

      console.log('🗑️ Delete result:', { data, error });

      if (error) {
        console.error('❌ Error removing startup from portfolio:', error);
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Check if it's an RLS policy error
        if (error.message.includes('policy') || error.message.includes('permission') || error.message.includes('RLS')) {
          console.error('🔒 RLS Policy Error: User may not have DELETE permission on facilitator_startups table');
          messageService.error(
            'Permission Denied',
            'You may not have permission to remove this startup from your portfolio. Please contact support.'
          );
        } else {
          messageService.error(
            'Removal Failed',
            'Failed to remove startup from portfolio. Please try again.'
          );
        }
        return;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No rows were deleted. Record might not exist or already deleted.');
        console.warn('⚠️ Delete attempt details:', { startupId, facilitatorId });
        messageService.warning(
          'Startup Not Found',
          'Startup was not found in your portfolio or was already removed. Please refresh the page to see the current data.'
        );
        return;
      }

      // Update local state
      setPortfolioStartups(prev => prev.filter(startup => startup.id !== startupId));

      messageService.success(
        'Startup Removed',
        'Startup removed from portfolio successfully.',
        3000
      );
    } catch (error) {
      console.error('Error removing startup from portfolio:', error);
      messageService.error(
        'Removal Failed',
        'Failed to remove startup from portfolio. Please try again.'
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  // New functions for startup invitation functionality
  const handleAddStartup = async (startupData: StartupFormData) => {
    if (!facilitatorId || !facilitatorCode) {
      messageService.error(
        'Facilitator Info Missing',
        'Facilitator information not available. Please try again.'
      );
      return;
    }

    try {
      setIsLoadingInvitations(true);
      
      // Add the startup invitation
      const invitation = await startupInvitationService.addStartupInvitation(
        facilitatorId,
        startupData,
        facilitatorCode
      );

      if (invitation) {
        // Update local state
        setStartupInvitations(prev => [invitation, ...prev]);
        
        // Set the startup data for invitation modal
        setSelectedStartupForInvitation(startupData);
        setIsInvitationModalOpen(true);
      } else {
        messageService.error(
          'Addition Failed',
          'Failed to add startup. Please try again.'
        );
      }
    } catch (error) {
      console.error('Error adding startup:', error);
      messageService.error(
        'Addition Failed',
        'Failed to add startup. Please try again.'
      );
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!selectedStartupForInvitation) return;

    try {
      // Update invitation status to 'sent'
      const invitation = startupInvitations.find(inv => 
        inv.startupName === selectedStartupForInvitation.name &&
        inv.email === selectedStartupForInvitation.email
      );

      if (invitation) {
        await startupInvitationService.updateInvitationStatus(invitation.id, 'sent');
        
        // Update local state
        setStartupInvitations(prev => 
          prev.map(inv => 
            inv.id === invitation.id 
              ? { ...inv, status: 'sent', invitationSentAt: new Date().toISOString() }
              : inv
          )
        );
      }

      setIsInvitationModalOpen(false);
      setSelectedStartupForInvitation(null);
    } catch (error) {
      console.error('Error updating invitation status:', error);
    }
  };

  const loadStartupInvitations = async () => {
    if (!facilitatorId) return;

    try {
      setIsLoadingInvitations(true);
      const invitations = await startupInvitationService.getFacilitatorInvitations(facilitatorId);
      setStartupInvitations(invitations);
    } catch (error) {
      console.error('Error loading startup invitations:', error);
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  const handleEditStartup = (startup: StartupInvitation) => {
    setSelectedStartupForEdit(startup);
    setIsEditStartupModalOpen(true);
  };

  const handleSaveStartupEdit = async (updatedData: {
    startupName: string;
    contactPerson: string;
    email: string;
    phone: string;
  }) => {
    if (!selectedStartupForEdit) return;

    try {
      const updatedInvitation = await startupInvitationService.updateInvitation(
        selectedStartupForEdit.id,
        updatedData
      );

      if (updatedInvitation) {
        // Update local state
        setStartupInvitations(prev => 
          prev.map(inv => 
            inv.id === selectedStartupForEdit.id 
              ? updatedInvitation
              : inv
          )
        );
        console.log('✅ Startup information updated successfully');
      } else {
        throw new Error('Failed to update startup information');
      }
    } catch (error) {
      console.error('Error updating startup:', error);
      throw error;
    }
  };

  const handleDeleteRecognitionRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this recognition record?')) {
      return;
    }

    try {
      setIsProcessingAction(true);
      
      console.log('🗑️ Attempting to delete recognition record:', {
        recordId,
        table: 'recognition_records'
      });
      
      // Delete from recognition_records table
      // Convert string recordId to integer (database expects integer)
      const idValue = parseInt(recordId, 10);
      
      if (isNaN(idValue)) {
        console.error('❌ Invalid recordId:', recordId);
        messageService.error(
          'Invalid Record ID',
          'Invalid record ID. Please refresh the page and try again.'
        );
        return;
      }
      
      console.log('🗑️ Delete attempt:', { recordId, idValue });
      
      // First check if the record exists
      const { data: existingRecord, error: checkError } = await supabase
        .from('recognition_records')
        .select('id')
        .eq('id', idValue)
        .single();
      
      if (checkError || !existingRecord) {
        console.warn('⚠️ Record not found before deletion attempt:', { recordId, idValue, checkError });
        messageService.warning(
          'Record Not Found',
          'Recognition record was not found. It may have already been deleted or you may not have permission to delete it.'
        );
        return;
      }
      
      const { data, error } = await supabase
        .from('recognition_records')
        .delete()
        .eq('id', idValue)
        .select();

      console.log('🗑️ Delete result:', { data, error });

      if (error) {
        console.error('Error deleting recognition record:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        messageService.error(
          'Deletion Failed',
          'Failed to delete recognition record. Please try again.'
        );
        return;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No rows were deleted. Record might not exist or already deleted.');
        console.warn('⚠️ Delete attempt details:', { recordId, idValue });
        messageService.warning(
          'Record Not Found',
          'Recognition record was not found or was already deleted. Please refresh the page to see the current data.'
        );
        return;
      }

      // Update local state
      setRecognitionRecords(prev => prev.filter(record => record.id !== recordId));

      messageService.success(
        'Record Deleted',
        'Recognition record deleted successfully.',
        3000
      );
    } catch (error) {
      console.error('Error deleting recognition record:', error);
      messageService.error(
        'Deletion Failed',
        'Failed to delete recognition record. Please try again.'
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleAgreementFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        messageService.warning(
          'Invalid File Type',
          'Please upload a PDF file for the agreement.'
        );
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        messageService.warning(
          'File Too Large',
          'File size must be less than 10MB.'
        );
        return;
      }
      setAgreementFile(file);
    }
  };

  const handleAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplication || !agreementFile) {
      messageService.warning(
        'File Required',
        'Please upload an agreement PDF.'
      );
      return;
    }

    setIsProcessingAction(true);
    try {
      // Upload agreement file
      const fileName = `agreements/${selectedApplication.id}/${Date.now()}-${agreementFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('startup-documents')
        .upload(fileName, agreementFile);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Failed to upload agreement: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('startup-documents')
        .getPublicUrl(fileName);

      // Update application status and add agreement URL
      const { error: updateError } = await supabase
        .from('opportunity_applications')
        .update({
          status: 'accepted',
          agreement_url: urlData.publicUrl,
          diligence_status: 'none'
        })
        .eq('id', selectedApplication.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`Failed to update application: ${updateError.message}`);
      }

      // Update local state
      setMyReceivedApplications(prev => prev.map(app => 
        app.id === selectedApplication.id 
          ? { ...app, status: 'accepted', agreementUrl: urlData.publicUrl, diligenceStatus: 'none' }
          : app
      ));

      setIsAcceptModalOpen(false);
      setSelectedApplication(null);
      setAgreementFile(null);

      // Show success popup
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      successMessage.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-sm mx-4 text-center">
          <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Application Accepted!</h3>
          <p class="text-gray-600 mb-4">Agreement uploaded successfully. You can now request due diligence.</p>
          <button onclick="this.parentElement.parentElement.remove()" class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
            Continue
          </button>
          </div>
      `;
      document.body.appendChild(successMessage);
    } catch (e) {
      console.error('Failed to accept application:', e);
      messageService.error(
        'Acceptance Failed',
        'Failed to accept application. Please try again.'
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRequestDiligence = async (application: ReceivedApplication) => {
    if (application.diligenceStatus === 'requested') return;
    
    setIsProcessingAction(true);
    try {
      // Use the new RPC function
      const { data, error } = await supabase
        .rpc('request_diligence', { p_application_id: application.id });

      if (error) throw error;

      // Update local state
      setMyReceivedApplications(prev => prev.map(app => 
        app.id === application.id 
          ? { ...app, diligenceStatus: 'requested' }
          : app
      ));

      // Show success popup
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      successMessage.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-sm mx-4 text-center">
          <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Due Diligence Requested!</h3>
          <p class="text-gray-600 mb-4">The startup has been notified to complete due diligence.</p>
          <button onclick="this.parentElement.parentElement.remove()" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
            Continue
          </button>
          </div>
      `;
      document.body.appendChild(successMessage);
    } catch (e) {
      console.error('Failed to request diligence:', e);
      messageService.error(
        'Diligence Request Failed',
        'Failed to request diligence. Please try again.'
      );
    } finally {
      setIsProcessingAction(false);
    }
  };



  const handleApproveRecognition = async (recordId: string) => {
    if (!facilitatorId) {
      messageService.error(
        'Facilitator ID Missing',
        'Facilitator ID not found. Please refresh the page.'
      );
      return;
    }

    try {
      setProcessingRecognitionId(recordId);
      
              // Find the record to get startup ID
        const record = recognitionRecords.find(r => r.id === recordId);
        if (!record) {
          messageService.warning(
            'Record Not Found',
            'Record not found. Please try again.'
          );
          return;
        }
        
                // Validate data types
        if (typeof record.startupId !== 'number') {
          console.error('❌ Invalid startup ID type:', typeof record.startupId, record.startupId);
          messageService.error(
            'Invalid Data',
            'Invalid startup data. Please try again.'
          );
          return;
        }
        
      // Convert string ID to number for database operations
      const dbId = parseInt(recordId);
      if (isNaN(dbId)) {
        console.error('❌ Invalid record ID format:', recordId);
        messageService.error(
          'Invalid Record ID',
          'Invalid record ID. Please try again.'
        );
        return;
      }

      // Validate all required data exists
      const validationChecks = await Promise.allSettled([
        // Check recognition record exists
        supabase
            .from('recognition_records')
            .select('id')
            .eq('id', dbId)
          .single(),
        
        // Check startup exists
        supabase
            .from('startups')
            .select('id')
            .eq('id', record.startupId)
          .single(),
        
        // Check user is facilitator
        supabase
          .from('users')
          .select('id, role')
          .eq('id', facilitatorId)
          .single()
      ]);

      // Check validation results
      const [recordCheck, startupCheck, userCheck] = validationChecks;
      
      if (recordCheck.status === 'rejected' || !recordCheck.value.data) {
        console.error('❌ Recognition record not found in database:', recordCheck.status === 'rejected' ? recordCheck.reason : 'No data');
        messageService.warning(
          'Record Not Found',
          'Recognition record not found. Please try again.'
        );
            return;
          }
          
      if (startupCheck.status === 'rejected' || !startupCheck.value.data) {
        console.error('❌ Startup not found in database:', startupCheck.status === 'rejected' ? startupCheck.reason : 'No data');
        messageService.warning(
          'Startup Not Found',
          'Startup not found. Please try again.'
        );
          return;
        }
        
      if (userCheck.status === 'rejected' || !userCheck.value.data) {
        console.error('❌ User not found in database:', userCheck.status === 'rejected' ? userCheck.reason : 'No data');
            messageService.warning(
              'User Not Found',
              'User not found. Please try again.'
            );
            return;
          }
          
      if (userCheck.value.data.role !== 'Startup Facilitation Center') {
        console.error('❌ User is not a facilitator:', userCheck.value.data.role);
            messageService.error(
              'Unauthorized',
              'User is not authorized as a facilitator. Please try again.'
            );
            return;
          }
          
      // Update the recognition request status in the database
        const { error: updateError } = await supabase
          .from('recognition_records')
          .update({ 
            status: 'approved'
          })
          .eq('id', dbId);
        
        if (updateError) {
          console.error('Error updating recognition request status:', updateError);
          messageService.error(
            'Approval Failed',
            'Failed to approve recognition. Please try again.'
          );
          return;
        }
        
        // Add startup to facilitator's portfolio
        const portfolioEntry = await facilitatorStartupService.addStartupToPortfolio(
        facilitatorId,
          record.startupId,
        dbId
        );
        
        if (portfolioEntry) {
          // Update the recognition record status locally
          setRecognitionRecords(prev => {
            const updated = prev.map(r => 
              r.id === recordId 
                ? { ...r, status: 'approved' }
                : r
            );
            return updated;
          });
          
          // Reload the portfolio to show the new startup
            await loadPortfolio(facilitatorId);
          
          // Show success message
          const successMessage = document.createElement('div');
          successMessage.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
          successMessage.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-sm mx-4 text-center">
              <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Recognition Approved!</h3>
              <p class="text-gray-600 mb-4">Startup has been added to your portfolio.</p>
              <button onclick="this.parentElement.parentElement.remove()" class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
                Continue
              </button>
            </div>
          `;
          document.body.appendChild(successMessage);
        } else {
          messageService.error(
            'Portfolio Addition Failed',
            'Failed to add startup to portfolio. Please try again.'
          );
        }
    } catch (err) {
      console.error('Error approving recognition:', err);
      messageService.error(
        'Approval Failed',
        'Failed to approve recognition. Please try again.'
      );
    } finally {
      setProcessingRecognitionId(null);
    }
  };



  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        messageService.warning(
          'Invalid Image Type',
          'Please upload an image file (JPEG, PNG, GIF, WebP, SVG).'
        );
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        messageService.warning(
          'File Too Large',
          'File size must be less than 5MB.'
        );
        return;
      }
      
      const previewUrl = URL.createObjectURL(file);
      setPosterPreview(previewUrl);
      setNewOpportunity(prev => ({ ...prev, posterUrl: previewUrl }));
    }
  };

  const handleSubmitOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilitatorId) {
      messageService.error(
        'Account Not Found',
        'Unable to find facilitator account. Please re-login.'
      );
      return;
    }

    try {
      let posterUrlToSave = newOpportunity.posterUrl;
      
      // If posterUrl is a blob URL (from file upload), upload it to storage
      if (posterUrlToSave && posterUrlToSave.startsWith('blob:')) {
        // Get the file from the input
        const fileInput = document.querySelector('input[name="posterUrl"]') as HTMLInputElement;
        if (fileInput && fileInput.files && fileInput.files[0]) {
          const file = fileInput.files[0];
          const fileName = `posters/${facilitatorId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          
          console.log('Uploading poster image:', fileName);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('opportunity-posters')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            throw new Error(`Failed to upload poster image: ${uploadError.message}`);
          }

          const { data: urlData } = supabase.storage
            .from('opportunity-posters')
            .getPublicUrl(fileName);
          
          posterUrlToSave = urlData.publicUrl;
          console.log('Poster uploaded successfully:', posterUrlToSave);
        }
      }

      const payload = {
        program_name: newOpportunity.programName,
        description: newOpportunity.description,
        deadline: newOpportunity.deadline,
        poster_url: posterUrlToSave || null,
        video_url: newOpportunity.videoUrl || null,
        facilitator_id: facilitatorId
      };

      if (editingIndex !== null) {
        const target = myPostedOpportunities[editingIndex];
        const { data, error } = await supabase
          .from('incubation_opportunities')
          .update(payload)
          .eq('id', target.id)
          .select()
          .single();
        if (error) throw error;
        const updated: IncubationOpportunity = {
          id: data.id,
          programName: data.program_name,
          description: data.description,
          deadline: data.deadline,
          posterUrl: data.poster_url || undefined,
          videoUrl: data.video_url || undefined,
          facilitatorId: data.facilitator_id,
          createdAt: data.created_at
        };
        setMyPostedOpportunities(prev => prev.map((op, i) => i === editingIndex ? updated : op));
      } else {
        const { data, error } = await supabase
          .from('incubation_opportunities')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        const inserted: IncubationOpportunity = {
          id: data.id,
          programName: data.program_name,
          description: data.description,
          deadline: data.deadline,
          posterUrl: data.poster_url || undefined,
          videoUrl: data.video_url || undefined,
          facilitatorId: data.facilitator_id,
          createdAt: data.created_at
        };
        setMyPostedOpportunities(prev => [inserted, ...prev]);
      }

      setIsPostModalOpen(false);
      setPosterPreview('');
      setNewOpportunity(initialNewOppState);
    } catch (err) {
      console.error('Failed to save opportunity:', err);
      messageService.error(
        'Save Failed',
        'Failed to save opportunity. Please try again.'
      );
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'intakeManagement':
        // Get applications for the selected opportunity or all applications
        const filteredApplications = selectedOpportunityId 
          ? myReceivedApplications.filter(app => app.opportunityId === selectedOpportunityId)
          : myReceivedApplications;

  return (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SummaryCard title="Opportunities Posted" value={myPostedOpportunities.length} icon={<Gift className="h-6 w-6 text-brand-primary" />} />
              <SummaryCard title="Applications Received" value={myReceivedApplications.length} icon={<FileText className="h-6 w-6 text-brand-primary" />} />
      </div>

            {/* Opportunity Sub-tabs */}
                <Card>
              <h3 className="text-lg font-semibold mb-4 text-slate-700">Applications by Opportunity</h3>
              
              {/* Opportunity Tabs */}
              <div className="border-b border-slate-200 mb-6">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Opportunity Tabs">
                  <button 
                    onClick={() => setSelectedOpportunityId(null)} 
                    className={`${selectedOpportunityId === null ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                  >
                    <FileText className="h-4 w-4" />
                    All Applications ({myReceivedApplications.length})
                  </button>
                  {myPostedOpportunities.map(opportunity => {
                    const appCount = myReceivedApplications.filter(app => app.opportunityId === opportunity.id).length;
                    return (
                      <button 
                        key={opportunity.id}
                        onClick={() => setSelectedOpportunityId(opportunity.id)} 
                        className={`${selectedOpportunityId === opportunity.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                      >
                        <Gift className="h-4 w-4" />
                        {opportunity.programName} ({appCount})
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Applications Table */}
                  <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                                                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Startup</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Domain</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Stage</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Opportunity</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Pitch Materials</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                    {filteredApplications.map(app => (
                          <tr key={app.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{app.startupName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{app.sector || '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{app.stage || '—'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{myPostedOpportunities.find(o => o.id === app.opportunityId)?.programName || '—'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex justify-center items-center gap-3">
                                {app.pitchDeckUrl ? (
                                  <a href={app.pitchDeckUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-brand-primary transition-colors" title="View Pitch Deck">
                                    <FileText className="h-5 w-5" />
                                  </a>
                                ) : (
                                  <span className="text-slate-300 cursor-not-allowed" title="No Pitch Deck">
                                    <FileText className="h-5 w-5" />
                                  </span>
                                )}
                                {app.pitchVideoUrl ? (
                              <button 
                                onClick={() => handleViewPitchVideo(app.pitchVideoUrl!)} 
                                className="text-slate-500 hover:text-brand-primary transition-colors" 
                                title="View Pitch Video"
                              >
                                    <Video className="h-5 w-5" />
                              </button>
                                ) : (
                                  <span className="text-slate-300 cursor-not-allowed" title="No Pitch Video">
                                    <Video className="h-5 w-5" />
                                  </span>
                                )}
        </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                              <div className="flex flex-col gap-2 items-center">
                                {/* Status Actions */}
                              {app.status === 'pending' && (
                                  <>
                                <Button 
                                  size="sm" 
                                  onClick={() => handleAcceptApplication(app)}
                                  disabled={isProcessingAction}
                                      className="w-full"
                                >
                                  Approve Application
                                </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleRejectApplication(app)}
                                      disabled={isProcessingAction}
                                      className="w-full text-red-600 border-red-600 hover:bg-red-50"
                                    >
                                      Reject Application
                                    </Button>
                                  </>
                              )}
                              {app.status === 'accepted' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  disabled
                                    className="w-full"
                                >
                                  Approved
                                </Button>
                              )}
                                {app.status === 'rejected' && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    disabled
                                    className="w-full text-red-600 border-red-600"
                                  >
                                    Rejected
                                  </Button>
                                )}
                                
                                {/* Diligence Actions */}
                              {(app.diligenceStatus === 'none' || app.diligenceStatus == null) && app.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRequestDiligence(app)}
                                  disabled={isProcessingAction}
                                  className="w-full"
                                >
                                  Request Diligence
                                </Button>
                              )}
                              {(app.diligenceStatus === 'none' || app.diligenceStatus == null) && app.status === 'accepted' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled
                                  title="Diligence can only be requested for pending applications"
                                  className="w-full"
                                >
                                  Unavailable after approval
                                </Button>
                              )}
                              {app.diligenceStatus === 'requested' && (
                                <span className="inline-flex items-center justify-center w-full px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Request Pending
                                </span>
                              )}
                              {app.diligenceStatus === 'approved' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                    onClick={async () => {
                                      const startupObj = await buildStartupForView({
                                        id: app.startupId,
                                        name: app.startupName,
                                        sector: 'Unknown',
                                        investmentType: 'equity' as any,
                                        investmentValue: 0,
                                        equityAllocation: 0,
                                        currentValuation: 0,
                                        totalFunding: 0,
                                        totalRevenue: 0,
                                        registrationDate: new Date().toISOString().split('T')[0],
                                        complianceStatus: ComplianceStatus.Pending,
                                        founders: []
                                      });
                                      onViewStartup(startupObj);
                                    }}
                                    className="w-full"
                                >
                                  View Startup
                                </Button>
                              )}
                              {/* Diligence documents removed; only show View Startup after approval */}
                            
                            {/* Message Button - always available */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenMessaging(app)}
                              className="w-full"
                              title="Send message to startup"
                            >
                              <MessageCircle className="mr-2 h-4 w-4" />
                              Message Startup
                            </Button>


                            {/* Contract Management Button removed per requirements */}
                            
                            {/* Delete Application Button - always available */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteApplication(app)}
                              disabled={isProcessingAction}
                              className="w-full text-red-600 border-red-600 hover:bg-red-50"
                              title="Delete this application permanently"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Application
                            </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    {filteredApplications.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-500">
                          {selectedOpportunityId 
                            ? `No applications received for ${myPostedOpportunities.find(o => o.id === selectedOpportunityId)?.programName || 'this opportunity'} yet.`
                            : 'No applications received yet.'
                          }
                        </td>
                      </tr>
                        )}
                      </tbody>
                    </table>
        </div>
      </Card>
          </div>
        );
      case 'trackMyStartups':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SummaryCard title="My Startups" value={myPortfolio.length} icon={<Users className="h-6 w-6 text-brand-primary" />} />
              <SummaryCard title="Active Startups" value={myPortfolio.filter(s => s.complianceStatus === 'compliant').length} icon={<CheckCircle className="h-6 w-6 text-brand-primary" />} />
              <SummaryCard title="Pending Review" value={myPortfolio.filter(s => s.complianceStatus === 'pending').length} icon={<FileText className="h-6 w-6 text-brand-primary" />} />
            </div>

            <div className="space-y-8">
              {/* My Startups Section */}
              <Card>
                <h3 className="text-lg font-semibold mb-4 text-slate-700">My Startups</h3>
                <div className="overflow-x-auto">
                  {isLoadingPortfolio ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-slate-500">Loading portfolio...</p>
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Compliance Status</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {myPortfolio.map(startup => (
                          <tr key={startup.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-slate-900">{startup.name}</div>
                              <div className="text-xs text-slate-500">{startup.sector}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500"><Badge status={startup.complianceStatus} /></td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center gap-2 justify-end">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={async () => {
                                    const startupObj = await buildStartupForView({
                                      id: startup.id,
                                      name: startup.name,
                                      sector: startup.sector,
                                      investmentType: 'equity' as any,
                                      investmentValue: startup.totalFunding || 0,
                                      equityAllocation: 0,
                                      currentValuation: startup.totalFunding || 0,
                                      totalFunding: startup.totalFunding || 0,
                                      totalRevenue: startup.totalRevenue || 0,
                                      registrationDate: startup.registrationDate || new Date().toISOString().split('T')[0],
                                      complianceStatus: startup.complianceStatus || ComplianceStatus.Pending,
                                      founders: []
                                    });
                                    onViewStartup(startupObj);
                                  }}
                                  title="View complete startup dashboard for tracking"
                                >
                                  <Eye className="mr-2 h-4 w-4" /> 
                                  Track Startup
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={async () => {
                                    // Redirect to Intake Management tab where applications exist
                                    setActiveTab('intakeManagement');
                                    messageService.info(
                                      'Messaging Location',
                                      'Please use messaging from the "Intake Management" tab where valid program applications exist.'
                                    );
                                  }}
                                  title="Send message to startup"
                                >
                                  <MessageCircle className="mr-2 h-4 w-4" />
                                  Message Startup
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDeleteStartupFromPortfolio(startup.id)}
                                  className="text-red-600 border-red-600 hover:bg-red-50"
                                  title="Remove startup from portfolio"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {myPortfolio.length === 0 && (
                          <tr><td colSpan={3} className="text-center py-8 text-slate-500">No startups in your portfolio yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>
            </div>
          </div>
        );
      case 'dashboard':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SummaryCard title="My Startups" value={myPortfolio.length} icon={<Users className="h-6 w-6 text-brand-primary" />} />
              <SummaryCard title="Opportunities Posted" value={myPostedOpportunities.length} icon={<Gift className="h-6 w-6 text-brand-primary" />} />
              <SummaryCard title="Applications Received" value={myReceivedApplications.length} icon={<FileText className="h-6 w-6 text-brand-primary" />} />
            </div>

            <div className="space-y-8">
              {/* Add New Startup Section */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-700">Add New Startup</h3>
                  <Button
                    onClick={() => setIsAddStartupModalOpen(true)}
                    className="bg-brand-primary hover:bg-brand-primary/90"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Startup
                  </Button>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  Add a new startup to your portfolio and invite them to join TrackMyStartup platform.
                </p>
                
                {/* Facilitator Code Display */}
                {facilitatorCode && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-blue-800">Your Facilitator Code:</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-blue-900 text-lg">{facilitatorCode}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigator.clipboard.writeText(facilitatorCode)}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        Copy Code
                      </Button>
                    </div>
                    <p className="text-sm text-blue-700 mt-2">
                      Share this code with startups when inviting them to join the platform.
                    </p>
                  </div>
                )}
              </Card>

              {/* Portfolio Distribution Chart - moved to top */}
              <PortfolioDistributionChart data={myPortfolio} />

              {/* Added Startups List */}
              <Card>
                <h3 className="text-lg font-semibold mb-4 text-slate-700">Added Startups</h3>
                <div className="overflow-x-auto">
                  {isLoadingInvitations ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-slate-500">Loading startups...</p>
                    </div>
                  ) : startupInvitations.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <p>No startups added yet.</p>
                      <p className="text-sm mt-1">Add your first startup using the form above.</p>
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact Person</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {(showAllStartups ? startupInvitations : startupInvitations.slice(0, 5)).map((startup) => (
                          <tr key={startup.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-slate-900">{startup.startupName}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-slate-900">{startup.contactPerson}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-slate-900">{startup.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedStartupForInvitation({
                                      name: startup.startupName,
                                      contactPerson: startup.contactPerson,
                                      email: startup.email,
                                      phone: startup.phone
                                    });
                                    setIsInvitationModalOpen(true);
                                  }}
                                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                >
                                  <Share2 className="h-4 w-4 mr-1" />
                                  Share
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditStartup(startup)}
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    if (confirm('Are you sure you want to delete this startup invitation?')) {
                                      try {
                                        await startupInvitationService.deleteInvitation(startup.id);
                                        setStartupInvitations(prev => prev.filter(inv => inv.id !== startup.id));
                                      } catch (error) {
                                        console.error('Error deleting invitation:', error);
                                        messageService.error(
                                          'Deletion Failed',
                                          'Failed to delete invitation. Please try again.'
                                        );
                                      }
                                    }
                                  }}
                                  className="text-red-600 border-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  
                  {/* Show More Button */}
                  {startupInvitations.length > 5 && (
                    <div className="mt-4 text-center">
                      <Button
                        variant="outline"
                        onClick={() => setShowAllStartups(!showAllStartups)}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        {showAllStartups ? 'Show Less' : `Show More (${startupInvitations.length - 5} more)`}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <div className="space-y-8">
                {/* Recognition & Incubation Requests (Free/Fee) */}
                <Card>
                  <h3 className="text-lg font-semibold mb-4 text-slate-700">Recognition & Incubation Requests</h3>
                  <div className="overflow-x-auto">
                    {isLoadingRecognition ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-slate-500">Loading recognition requests...</p>
                      </div>
                    ) : (() => {
                      // Filter records for Recognition & Incubation Requests (Free/Fees)
                      const freeOrFeeRecords = recognitionRecords.filter(record => 
                        record.feeType === 'Free' || record.feeType === 'Fees'
                      );
                      
                      return freeOrFeeRecords.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <p>No recognition requests received yet.</p>
                        <p className="text-sm mt-1">Startups will appear here when they submit recognition forms.</p>
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Program</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fee Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Documents</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {(showAllApplications ? freeOrFeeRecords : freeOrFeeRecords.slice(0, 5)).map((record) => (
                            <tr key={record.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900">{record.startup?.name || 'Unknown Startup'}</div>
                                <div className="text-xs text-slate-500">{record.startup?.sector || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{record.programName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    record.feeType === 'Free' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {record.feeType}
                                  </span>
                                </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                {record.signedAgreementUrl ? (
                                  <a 
                                    href={record.signedAgreementUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                  >
                                    View Agreement
                                  </a>
                                ) : (
                                  <span className="text-slate-400">No document</span>
                                )}
                              </td>
                                                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center gap-2 justify-end">
                                {record.status === 'pending' && (
                                    <Button 
                                        size="sm" 
                                        onClick={() => handleApproveRecognition(record.id)}
                                        disabled={processingRecognitionId === record.id}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        <Check className="mr-2 h-4 w-4" />
                                        {processingRecognitionId === record.id ? 'Processing...' : 'Accept'}
                                    </Button>
                                )}
                                {record.status === 'approved' && (
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        disabled
                                        className="bg-green-50 text-green-700 border-green-200"
                                    >
                                        <Check className="mr-2 h-4 w-4" />
                                        Approved
                                    </Button>
                                )}
                                {processingRecognitionId === record.id && record.status !== 'approved' && (
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        disabled
                                        className="bg-blue-50 text-blue-700 border-blue-200"
                                    >
                                        <Check className="mr-2 h-4 w-4" />
                                        Processing...
                                    </Button>
                                )}
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleDeleteRecognitionRecord(record.id)}
                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                    title="Delete recognition record"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                            </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      );
                    })()}
                    
                    {/* Show More Button for Recognition Requests */}
                    {(() => {
                      const freeOrFeeRecords = recognitionRecords.filter(record => 
                        record.feeType === 'Free' || record.feeType === 'Fees'
                      );
                      return freeOrFeeRecords.length > 5 && (
                        <div className="mt-4 text-center">
                          <Button
                            variant="outline"
                            onClick={() => setShowAllApplications(!showAllApplications)}
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          >
                            {showAllApplications ? 'Show Less' : `Show More (${freeOrFeeRecords.length - 5} more)`}
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                </Card>

                {/* Investment Requests (Equity/Hybrid) */}
                <Card>
                  <h3 className="text-lg font-semibold mb-4 text-slate-700">Investment Requests</h3>
                  <div className="overflow-x-auto">
                    {isLoadingRecognition ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-slate-500">Loading investment requests...</p>
                      </div>
                    ) : (() => {
                      // Filter records for Investment Requests (Equity/Hybrid)
                      const equityOrHybridRecords = recognitionRecords.filter(record => 
                        record.feeType === 'Equity' || record.feeType === 'Hybrid'
                      );
                      
                      return equityOrHybridRecords.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <p>No investment requests received yet.</p>
                          <p className="text-sm mt-1">Startups seeking equity investment will appear here.</p>
                        </div>
                      ) : (
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Program</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fee Type</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Equity/Investment</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Documents</th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-200">
                            {equityOrHybridRecords.map((record) => (
                              <tr key={record.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-slate-900">{record.startup?.name || 'Unknown Startup'}</div>
                                  <div className="text-xs text-slate-500">
                                    {(() => {
                                      // Use domain from opportunity_applications if available, otherwise fallback to startup sector
                                      const domainFromApplications = domainStageMap[record.startupId]?.domain;
                                      const sector = domainFromApplications || record.startup?.sector || 'N/A';
                                      console.log('🔍 Debug sector for startup:', record.startup?.name, 'domain from apps:', domainFromApplications, 'startup sector:', record.startup?.sector, 'final sector:', sector);
                                      return sector;
                                    })()}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{record.programName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    record.feeType === 'Equity' 
                                      ? 'bg-purple-100 text-purple-800' 
                                      : 'bg-orange-100 text-orange-800'
                                  }`}>
                                    {record.feeType}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                  {record.equityAllocated ? (
                                    <span className="font-medium text-slate-900">{record.equityAllocated}%</span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                  {record.signedAgreementUrl ? (
                                    <a 
                                      href={record.signedAgreementUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline"
                                    >
                                      View Agreement
                                    </a>
                                  ) : (
                                    <span className="text-slate-400">No document</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex items-center gap-2 justify-end">
                                    {record.status === 'pending' && (
                                      <Button 
                                        size="sm" 
                                        onClick={() => handleApproveRecognition(record.id)}
                                        disabled={processingRecognitionId === record.id}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                      >
                                        <Check className="mr-2 h-4 w-4" />
                                        {processingRecognitionId === record.id ? 'Processing...' : 'Accept'}
                                      </Button>
                                    )}
                                    {record.status === 'approved' && (
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        disabled
                                        className="bg-green-50 text-green-700 border-green-200"
                                      >
                                        <Check className="mr-2 h-4 w-4" />
                                        Approved
                                      </Button>
                                    )}
                                    {processingRecognitionId === record.id && record.status !== 'approved' && (
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        disabled
                                        className="bg-blue-50 text-blue-700 border-blue-200"
                                      >
                                        <Check className="mr-2 h-4 w-4" />
                                        Processing...
                                      </Button>
                                    )}
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleDeleteRecognitionRecord(record.id)}
                                      className="text-red-600 border-red-600 hover:bg-red-50"
                                      title="Delete recognition record"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                </Card>

                {/* My Programs Section - moved from Intake Management */}
                <Card>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-700">My Programs</h3>
                    <Button size="sm" onClick={handleOpenPostModal}><PlusCircle className="h-4 w-4 mr-1" /> Post</Button>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <ul className="divide-y divide-slate-200">
                      {myPostedOpportunities.map((opp, idx) => (
                        <li key={opp.id} className="py-3 flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-slate-800">{opp.programName}</p>
                            <p className="text-xs text-slate-500">Deadline: {opp.deadline || '—'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => {
                              try {
                                const url = new URL(window.location.origin);
                                url.searchParams.set('view', 'program');
                                url.searchParams.set('opportunityId', opp.id);
                                const shareUrl = url.toString();
                                const text = `${opp.programName}\nDeadline: ${opp.deadline || '—'}`;
                                if ((navigator as any).share) {
                                  (navigator as any).share({ title: opp.programName, text, url: shareUrl });
                                } else if (navigator.clipboard && navigator.clipboard.writeText) {
                                  navigator.clipboard.writeText(`${text}\n\n${shareUrl}`);
                                  messageService.success('Copied', 'Shareable link copied to clipboard', 2000);
                                } else {
                                  const ta = document.createElement('textarea');
                                  ta.value = `${text}\n\n${shareUrl}`;
                                  document.body.appendChild(ta);
                                  ta.select();
                                  document.execCommand('copy');
                                  document.body.removeChild(ta);
                                  messageService.success('Copied', 'Shareable link copied to clipboard', 2000);
                                }
                              } catch (e) {
                                messageService.error('Share Failed', 'Unable to share link.');
                              }
                            }} title="Share"><Share2 className="h-4 w-4"/></Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditClick(idx)} title="Edit"><Edit className="h-4 w-4"/></Button>
                            <Button size="sm" variant="outline" onClick={async () => {
                              if (!confirm('Delete this opportunity?')) return;
                              const target = myPostedOpportunities[idx];
                              // Instead of deleting, close the opportunity to preserve data
                              const { error } = await supabase
                                .from('incubation_opportunities')
                                .update({ 
                                  opportunity_status: 'closed',
                                  updated_at: new Date().toISOString()
                                })
                                .eq('id', target.id);
                              if (!error) {
                                setMyPostedOpportunities(prev => prev.filter((_, i) => i !== idx));
                                messageService.success(
                                  'Opportunity Closed',
                                  'Opportunity has been closed. Applications and data are preserved.',
                                  3000
                                );
                              }
                            }} title="Delete">✕</Button>
            </div>
                        </li>
          ))}
                      {myPostedOpportunities.length === 0 && (
                        <li className="text-center py-6 text-slate-500">No opportunities posted.</li>
                      )}
                    </ul>
        </div>
      </Card>
                  </div>
                </div>
        );
      case 'discover':
        // Prepare list using shuffled pitches to mirror investor experience
        let list = shuffledPitches.length > 0 ? shuffledPitches : activeFundraisingStartups;
        // Apply search
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          list = list.filter(s => s.name.toLowerCase().includes(term) || s.sector.toLowerCase().includes(term));
        }
        // Apply filters
        if (showOnlyValidated) list = list.filter(s => s.complianceStatus === ComplianceStatus.Compliant);
        if (showOnlyFavorites) list = list.filter(s => favoritedPitches.has(s.id));

        return (
          <div className="animate-fade-in max-w-4xl mx-auto w-full">
            {/* Header with Search and Filters */}
            <div className="mb-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Discover Pitches</h2>
                <p className="text-sm text-slate-600">Watch startup videos and explore opportunities to incubate</p>
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

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100 gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => { setShowOnlyValidated(false); setShowOnlyFavorites(false); }}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm ${
                        !showOnlyValidated && !showOnlyFavorites ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-slate-200'
                      }`}
                    >
                      <Film className="h-4 w-4" />
                      <span className="hidden sm:inline">All</span>
                    </button>

                    <button
                      onClick={() => { setShowOnlyValidated(true); setShowOnlyFavorites(false); }}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm ${
                        showOnlyValidated && !showOnlyFavorites ? 'bg-green-600 text-white shadow-green-200' : 'bg-white text-slate-600 hover:bg-green-50 hover:text-green-600 border border-slate-200'
                      }`}
                    >
                      <CheckCircle className={`h-4 w-4 ${showOnlyValidated && !showOnlyFavorites ? 'fill-current' : ''}`} />
                      <span className="hidden sm:inline">Verified</span>
                    </button>

                    <button
                      onClick={() => { setShowOnlyValidated(false); setShowOnlyFavorites(true); }}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm ${
                        showOnlyFavorites ? 'bg-red-600 text-white shadow-red-200' : 'bg-white text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${showOnlyFavorites ? 'fill-current' : ''}`} />
                      <span className="hidden sm:inline">Favorites</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs sm:text-sm font-medium">{activeFundraisingStartups.length} active pitches</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-500">
                  <Film className="h-5 w-5" />
                  <span className="text-xs sm:text-sm">Pitch Reels</span>
                </div>
              </div>
            </div>

            {/* Results */}
            {isLoadingPitches ? (
              <Card className="text-center py-20">
                <div className="max-w-sm mx-auto">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading Pitches...</h3>
                  <p className="text-slate-500">Fetching active fundraising startups</p>
                </div>
              </Card>
            ) : list.length === 0 ? (
              <Card className="text-center py-20">
                <div className="max-w-sm mx-auto">
                  <Film className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    {searchTerm.trim() ? 'No Matching Startups' : showOnlyValidated ? 'No Verified Startups' : showOnlyFavorites ? 'No Favorited Pitches' : 'No Active Fundraising'}
                  </h3>
                  <p className="text-slate-500">
                    {searchTerm.trim() ? 'No startups found matching your search. Try adjusting your search terms or filters.' : showOnlyValidated ? 'No Startup Nation verified startups are currently fundraising. Try removing the verification filter or check back later.' : showOnlyFavorites ? 'Start favoriting pitches to see them here.' : 'No startups are currently fundraising. Check back later for new opportunities.'}
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-8">
                {list.map(inv => {
                  const embedUrl = investorService.getYoutubeEmbedUrl(inv.pitchVideoUrl);
                  return (
                    <Card key={inv.id} className="!p-0 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-white">
                      {/* Video section */}
                      <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                        {embedUrl ? (
                          playingVideoId === inv.id ? (
                            <div className="relative w-full h-full">
                              <iframe
                                src={embedUrl}
                                title={`Pitch video for ${inv.name}`}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="absolute top-0 left-0 w-full h-full"
                              ></iframe>
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
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <div className="text-center">
                              <Video className="h-16 w-16 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No video available</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">{inv.name}</h3>
                            <p className="text-slate-600 font-medium">{inv.sector}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {inv.complianceStatus === ComplianceStatus.Compliant && (
                              <div className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
                                <CheckCircle className="h-3 w-3" />
                                Verified
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-4 mt-6">
                          <Button
                            size="sm"
                            variant="secondary"
                            className={`!rounded-full !p-3 transition-all duration-200 ${
                              favoritedPitches.has(inv.id) ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-200' : 'hover:bg-red-50 hover:text-red-600 border border-slate-200'
                            }`}
                            onClick={() => handleFavoriteToggle(inv.id)}
                          >
                            <Heart className={`h-5 w-5 ${favoritedPitches.has(inv.id) ? 'fill-current' : ''}`} />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShare(inv)}
                            className="!rounded-full !p-3 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all duration-200 border border-slate-200"
                          >
                            <Share2 className="h-5 w-5" />
                          </Button>

                          {inv.pitchDeckUrl && inv.pitchDeckUrl !== '#' && (
                            <a href={inv.pitchDeckUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                              <Button size="sm" variant="secondary" className="w-full hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 border border-slate-200">
                                <FileText className="h-4 w-4 mr-2" /> View Deck
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 flex justify-between items-center border-t border-slate-200">
                        <div className="text-base">
                          <span className="font-semibold text-slate-800">Ask:</span> {(() => {
                            const ccy = (inv as any).currency || (inv as any).startup?.currency || (currentUser?.country ? resolveCurrency(currentUser.country) : 'USD');
                            const sym = getCurrencySymbol(ccy);
                            return `${sym}${inv.investmentValue.toLocaleString()}`;
                          })()} for <span className="font-semibold text-blue-600">{inv.equityAllocation}%</span> equity
                        </div>
                        {inv.complianceStatus === ComplianceStatus.Compliant && (
                          <div className="flex items-center gap-1 text-green-600" title="This startup has been verified by Startup Nation">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs font-semibold">Verified</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        );
      case 'ourInvestments':
        // Use approved Equity/Hybrid recognitions as "our investments"
        // This ensures startups appear once incubation is accepted, even if equityAllocated is not set yet
        const investedRecords = recognitionRecords.filter(record => 
          record.status === 'approved' && (record.feeType === 'Equity' || record.feeType === 'Hybrid')
        );
        
        return (
          <div className="space-y-8 animate-fade-in">
            {/* Loading State */}
            {isLoadingRecognition && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
                <span className="ml-2 text-slate-600">Loading investment data...</span>
              </div>
            )}
            
            {/* Investment Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Gift className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-500">Total Investments</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {investedRecords.length}
                    </p>
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-500">Compliant Startups</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {investedRecords.filter(record => record.startup?.compliance_status === 'Compliant').length}
                    </p>
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-500">Total Equity</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {investedRecords
                        .reduce((sum, record) => sum + (record.equityAllocated || 0), 0)
                        .toFixed(1)}%
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Investment Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <h4 className="text-lg font-semibold text-slate-700 mb-4">Investment Distribution by Sector</h4>
                <div className="space-y-3">
                  {(() => {
                    // Calculate sector distribution from actual data
                    const sectorData = investedRecords
                      .reduce((acc, record) => {
                        const sector = record.startup?.sector || 'Other';
                        if (!acc[sector]) {
                          acc[sector] = { count: 0, equity: 0 };
                        }
                        acc[sector].count += 1;
                        acc[sector].equity += record.equityAllocated || 0;
                        return acc;
                      }, {} as Record<string, { count: number; equity: number }>);

                    const totalEquity = Object.values(sectorData).reduce((sum, data) => sum + data.equity, 0);
                    const sectors = Object.entries(sectorData).sort((a, b) => b[1].equity - a[1].equity);

                    return sectors.length === 0 ? (
                      <div className="text-center py-4 text-slate-500">
                        No sector data available
                      </div>
                    ) : (
                      sectors.map(([sector, data]) => {
                        const percentage = totalEquity > 0 ? (data.equity / totalEquity) * 100 : 0;
                        return (
                    <div key={sector} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{sector}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-brand-primary h-2 rounded-full" 
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-slate-900">
                                {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                        );
                      })
                    );
                  })()}
                </div>
              </Card>

              <Card>
                <h4 className="text-lg font-semibold text-slate-700 mb-4">Investment Performance</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Total Portfolio Value</span>
                  <span className="text-lg font-bold text-slate-900">
                    {(() => {
                      const totalValue = investedRecords
                        .reduce((sum, record) => {
                          const currentPrice = currentPrices[record.startupId] || record.pricePerShare;
                          const shares = record.shares;
                          if (currentPrice && shares && shares > 0) {
                            return sum + (currentPrice * shares);
                          }
                          return sum + (record.investmentAmount || record.feeAmount || 0);
                        }, 0);
                      const currency = investedRecords[0]?.startup?.currency || (currentUser?.country ? resolveCurrency(currentUser.country) : 'USD');
                      const symbol = getCurrencySymbol(currency);
                      return `${symbol}${totalValue.toLocaleString()}`;
                    })()}
                  </span>
                  </div>
                  <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Total Equity Holdings</span>
                  <span className="text-lg font-bold text-green-600">
                    {investedRecords
                      .reduce((sum, record) => sum + (record.equityAllocated || 0), 0)
                      .toFixed(1)}%
                  </span>
                  </div>
                  <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Average Investment Size</span>
                  <span className="text-sm font-medium text-slate-900">
                    {(() => {
                      const investments = investedRecords;
                      if (investments.length === 0) return '0';
                      
                      const totalInvestment = investments.reduce((sum, record) => {
                        const currentPrice = currentPrices[record.startupId] || record.pricePerShare;
                        const shares = record.shares;
                        if (currentPrice && shares && shares > 0) {
                          return sum + (currentPrice * shares);
                        }
                        return sum + (record.investmentAmount || record.feeAmount || 0);
                      }, 0);
                      
                      const currency = investments[0]?.startup?.currency || (currentUser?.country ? resolveCurrency(currentUser.country) : 'USD');
                      const symbol = getCurrencySymbol(currency);
                      return `${symbol}${(totalInvestment / investments.length).toLocaleString()}`;
                    })()}
                  </span>
                  </div>
                  <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Compliant Investments</span>
                  <span className="text-sm font-medium text-slate-900">
                    {investedRecords.filter(record => record.startup?.compliance_status === 'Compliant').length} startups
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Total Shares Owned</span>
                  <span className="text-sm font-medium text-slate-900">
                    {investedRecords
                      .reduce((sum, record) => sum + (record.shares || 0), 0)
                      .toLocaleString()} shares
                  </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Invested Startups Table */}
            <Card>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-slate-700">Our Investment Portfolio</h3>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
              
              {investedRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No Investments Yet</h3>
                  <p className="text-slate-500 mb-6">Startups will appear here when you take equity in them through your programs.</p>
                  <div className="space-y-2">
                    <Button onClick={() => setActiveTab('intakeManagement')}>
                      Go to Intake Management
                    </Button>
                    <div className="text-xs text-slate-400">
                      Make sure you have approved Equity or Hybrid recognition records
                    </div>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sector</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Stage</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Investment Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Equity %</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Shares</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Purchase Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Current Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Current Valuation</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {investedRecords
                        .map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-brand-primary flex items-center justify-center">
                                  <span className="text-sm font-medium text-white">
                                    {record.startup?.name?.charAt(0).toUpperCase() || 'S'}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-slate-900">{record.startup?.name || 'Unknown Startup'}</div>
                                <div className="text-sm text-slate-500">ID: {record.startupId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {record.startup?.sector || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {record.stage || record.startup?.stage || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {record.dateAdded ? new Date(record.dateAdded).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            {record.equityAllocated || 0}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {record.shares ? record.shares.toLocaleString() : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {(() => {
                              if (record.pricePerShare && record.pricePerShare > 0) {
                                const currency = record.startup?.currency || 'USD';
                                const symbol = currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
                                return `${symbol}${record.pricePerShare.toFixed(2)}`;
                              }
                              return '—';
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {(() => {
                              const currentPrice = currentPrices[record.startupId] || record.pricePerShare;
                              if (currentPrice && currentPrice > 0) {
                                const currency = record.startup?.currency || 'USD';
                                const symbol = currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
                                return `${symbol}${currentPrice.toFixed(2)}`;
                              }
                              return '—';
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {(() => {
                              const currentPrice = currentPrices[record.startupId] || record.pricePerShare;
                              const shares = record.shares;
                              if (currentPrice && shares && shares > 0) {
                                const currentValuation = currentPrice * shares;
                                const currency = record.startup?.currency || 'USD';
                                const symbol = currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
                                return `${symbol}${currentValuation.toLocaleString()}`;
                              }
                              return '—';
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              record.status === 'approved' 
                                ? 'bg-green-100 text-green-800' 
                                : record.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {record.status === 'approved' ? 'Active' : 
                               record.status === 'pending' ? 'Pending' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <div className="flex justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  const startupObj = await buildStartupForView({
                                    id: record.startupId.toString(),
                                    name: record.startup?.name || 'Unknown Startup',
                                    sector: record.startup?.sector || '',
                                    totalFunding: record.startup?.total_funding || 0,
                                    totalRevenue: record.startup?.total_revenue || 0,
                                    registrationDate: record.startup?.registration_date || new Date().toISOString().split('T')[0],
                                    complianceStatus: 'compliant' as any,
                                    founders: []
                                  });
                                  onViewStartup(startupObj);
                                }}
                                title="View startup details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                title="Download investment documents"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  // If profile page is open, show it instead of main content
  if (showProfilePage) {
    return (
      <ProfilePage
        currentUser={currentUser}
        onBack={() => setShowProfilePage(false)}
        onProfileUpdate={onProfileUpdate}
        onLogout={onLogout}
      />
    );
  }

  return (
    <>
      <MessageContainer />
      <div className="space-y-6">
      {/* Header with facilitator code display */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome {currentUser?.center_name || 'Facilitation Center'}
          </h1>
          <h2 className="text-lg font-semibold text-slate-800">Facilitation Center Dashboard</h2>


        </div>
        <div className="flex items-center gap-4">
          <FacilitatorCodeDisplay currentUser={currentUser} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowProfilePage(true)}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Profile
          </Button>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button onClick={() => setActiveTab('dashboard')} className={`${activeTab === 'dashboard' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
            <LayoutGrid className="h-5 w-5" />Dashboard
          </button>
          <button onClick={() => setActiveTab('intakeManagement')} className={`${activeTab === 'intakeManagement' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
            <Gift className="h-5 w-5" />Intake Management
          </button>
          <button onClick={() => setActiveTab('trackMyStartups')} className={`${activeTab === 'trackMyStartups' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
            <Users className="h-5 w-5" />Track My Startups
          </button>
          <button onClick={() => setActiveTab('ourInvestments')} className={`${activeTab === 'ourInvestments' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
            <Gift className="h-5 w-5" />Our Investments
          </button>
          <button onClick={() => setActiveTab('discover')} className={`${activeTab === 'discover' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
            <Film className="h-5 w-5" />Discover Pitches
          </button>
        </nav>
      </div>

      <div className="animate-fade-in">{renderTabContent()}</div>

      <Modal isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} title={editingIndex !== null ? 'Edit Opportunity' : 'Post New Opportunity'} size="2xl">
        <form onSubmit={handleSubmitOpportunity}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
            <Input label="Program Name" id="programName" name="programName" value={newOpportunity.programName} onChange={handleInputChange} required />
                  <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">Program Description</label>
              <textarea id="description" name="description" value={newOpportunity.description} onChange={handleInputChange} required rows={3} className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                    </div>
            <Input label="Application Deadline" id="deadline" name="deadline" type="date" value={newOpportunity.deadline} onChange={handleInputChange} required min={new Date().toISOString().split('T')[0]} />
            <div className="border-t pt-4 mt-2 space-y-4">
              <Input label="Poster/Banner Image" id="posterUrl" name="posterUrl" type="file" accept="image/*" onChange={handlePosterChange} />
              {posterPreview && <img src={posterPreview} alt="Poster preview" className="mt-2 rounded-lg max-h-40 w-auto" />}
              <p className="text-center text-sm text-slate-500">OR</p>
              <Input label="YouTube Video Link" id="videoUrl" name="videoUrl" type="url" placeholder="https://www.youtube.com/watch?v=..." value={newOpportunity.videoUrl} onChange={handleInputChange} />
                </div>
                
            <div className="border-t pt-4 mt-2 space-y-4">
              <h4 className="text-md font-semibold text-slate-700">About Your Organization</h4>
              <div>
                <label htmlFor="facilitatorDescription" className="block text-sm font-medium text-slate-700 mb-1">Organization Description</label>
                <textarea id="facilitatorDescription" name="facilitatorDescription" value={newOpportunity.facilitatorDescription} onChange={handleInputChange} required rows={3} className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
              </div>
              <Input label="Organization Website" id="facilitatorWebsite" name="facilitatorWebsite" type="url" placeholder="https://..." value={newOpportunity.facilitatorWebsite} onChange={handleInputChange} />
                </div>
              </div>
          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button type="button" variant="secondary" onClick={() => setIsPostModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingIndex !== null ? 'Save Changes' : 'Post Opportunity'}</Button>
          </div>
        </form>
      </Modal>

      {/* Accept Application Modal */}
      <Modal isOpen={isAcceptModalOpen} onClose={() => setIsAcceptModalOpen(false)} title={`Accept Application: ${selectedApplication?.startupName}`}>
        <form onSubmit={handleAcceptSubmit} className="space-y-4">
          <p className="text-sm text-slate-600">
            To accept this application, please upload the agreement PDF for <span className="font-semibold">{selectedApplication?.startupName}</span>.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Agreement PDF
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleAgreementFileChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              required
            />
            <p className="text-xs text-slate-500 mt-1">Max 10MB</p>
            {agreementFile && (
              <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                <Check className="h-4 w-4" />
                <span>{agreementFile.name}</span>
        </div>
      )}
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setIsAcceptModalOpen(false)}
              disabled={isProcessingAction}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!agreementFile || isProcessingAction}
            >
              {isProcessingAction ? 'Processing...' : 'Accept & Upload Agreement'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Pitch Video Modal */}
      <Modal isOpen={isPitchVideoModalOpen} onClose={() => setIsPitchVideoModalOpen(false)} title="Pitch Video" size="2xl">
        <div className="space-y-4">
          <div className="relative w-full aspect-video bg-slate-900 rounded-lg overflow-hidden">
            {selectedPitchVideo ? (
              <iframe 
                src={getEmbeddableVideoUrl(selectedPitchVideo)}
                title="Pitch Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute top-0 left-0 w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <Video className="h-16 w-16 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Video not available</p>
                </div>
              </div>
            )}
          </div>
          {selectedPitchVideo && (
            <div className="text-sm text-slate-500 text-center">
              <p>Original URL: <a href={selectedPitchVideo} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{selectedPitchVideo}</a></p>
            </div>
          )}
          <div className="flex justify-end">
            <Button 
              variant="secondary" 
              onClick={() => setIsPitchVideoModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>


      {/* Messaging Modal */}
      {selectedApplicationForMessaging && (
        <IncubationMessagingModal
          isOpen={isMessagingModalOpen}
          onClose={handleCloseMessaging}
          applicationId={selectedApplicationForMessaging.id}
          startupName={selectedApplicationForMessaging.startupName}
          facilitatorName={currentUser?.name || 'Facilitator'}
        />
      )}

      {/* Contract Management Modal */}
      {selectedApplicationForContract && (
        <ContractManagementModal
          isOpen={isContractModalOpen}
          onClose={handleCloseContract}
          applicationId={selectedApplicationForContract.id}
          startupName={selectedApplicationForContract.startupName}
          facilitatorName={currentUser?.name || 'Facilitator'}
        />
      )}

      {/* Diligence Documents Modal */}
      {selectedApplicationForDiligence && (
        <Modal
          isOpen={isDiligenceModalOpen}
          onClose={handleCloseDiligenceDocuments}
          title={`Diligence Documents - ${selectedApplicationForDiligence.startupName}`}
        >
          <div className="space-y-4">
            {console.log('🔍 FACILITATOR VIEW: Selected application:', selectedApplicationForDiligence)}
            {console.log('🔍 FACILITATOR VIEW: Diligence URLs:', selectedApplicationForDiligence.diligenceUrls)}
            {console.log('🔍 FACILITATOR VIEW: Application ID:', selectedApplicationForDiligence.id)}
            {console.log('🔍 FACILITATOR VIEW: Startup ID:', selectedApplicationForDiligence.startupId)}
            {console.log('🔍 FACILITATOR VIEW: Status:', selectedApplicationForDiligence.status)}
            {console.log('🔍 FACILITATOR VIEW: Diligence Status:', selectedApplicationForDiligence.diligenceStatus)}
            {selectedApplicationForDiligence.diligenceUrls && selectedApplicationForDiligence.diligenceUrls.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  The startup has uploaded {selectedApplicationForDiligence.diligenceUrls.length} document(s) for due diligence review:
                </p>
                <div className="space-y-2">
                  {selectedApplicationForDiligence.diligenceUrls.map((url, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">
                          Document {index + 1}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(url, '_blank')}
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `diligence-document-${index + 1}.pdf`;
                            link.target = '_blank';
                            link.click();
                          }}
                          className="text-green-600 border-green-300 hover:bg-green-50"
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Action buttons for facilitator */}
                {selectedApplicationForDiligence.diligenceStatus === 'requested' && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-slate-700 mb-3">Review and Decision:</p>
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => handleApproveDiligence(selectedApplicationForDiligence)}
                        disabled={isProcessingAction}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isProcessingAction ? 'Approving...' : 'Approve Diligence'}
                      </Button>
                      <Button
                        onClick={() => handleRejectDiligence(selectedApplicationForDiligence)}
                        disabled={isProcessingAction}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        {isProcessingAction ? 'Rejecting...' : 'Reject Diligence'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-2">No diligence documents uploaded yet</p>
                <p className="text-sm text-slate-400">
                  The startup hasn't uploaded any documents for due diligence review.
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Add Startup Modal */}
      <AddStartupModal
        isOpen={isAddStartupModalOpen}
        onClose={() => setIsAddStartupModalOpen(false)}
        onAddStartup={handleAddStartup}
        facilitatorCode={facilitatorCode}
      />

      {/* Startup Invitation Modal */}
      {selectedStartupForInvitation && (
        <StartupInvitationModal
          isOpen={isInvitationModalOpen}
          onClose={() => {
            setIsInvitationModalOpen(false);
            setSelectedStartupForInvitation(null);
          }}
          startupData={selectedStartupForInvitation}
          facilitatorCode={facilitatorCode}
          facilitatorName={currentUser?.name || 'Facilitator'}
        />
      )}

      {/* Edit Startup Modal */}
      {selectedStartupForEdit && (
        <EditStartupModal
          isOpen={isEditStartupModalOpen}
          onClose={() => {
            setIsEditStartupModalOpen(false);
            setSelectedStartupForEdit(null);
          }}
          startup={selectedStartupForEdit}
          onSave={handleSaveStartupEdit}
        />
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
      `}</style>
      </div>
    </>
  );
};

export default FacilitatorView;
