import React, { useState, useEffect, useMemo } from 'react';
import { User, Startup, InvestmentOffer, ComplianceStatus } from '../types';
import { userService, investmentService } from '../lib/database';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatCurrencyCompact, getCurrencySymbol } from '../lib/utils';
import { useInvestmentAdvisorCurrency } from '../lib/hooks/useInvestmentAdvisorCurrency';
import { investorService, ActiveFundraisingStartup } from '../lib/investorService';
import { AuthUser, authService } from '../lib/auth';
import ProfilePage from './ProfilePage';
import UserDataManager from './UserDataManager';
import InvestorView from './InvestorView';
import StartupHealthView from './StartupHealthView';

interface InvestmentAdvisorViewProps {
  currentUser: AuthUser | null;
  users: User[];
  startups: Startup[];
  investments: any[];
  offers: InvestmentOffer[];
  interests: any[];
  pendingRelationships?: any[];
}

const InvestmentAdvisorView: React.FC<InvestmentAdvisorViewProps> = ({ 
  currentUser,
  users,
  startups,
  investments,
  offers,
  interests,
  pendingRelationships = []
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'discovery' | 'myInvestments' | 'myInvestors' | 'myStartups' | 'interests' | 'system'>('dashboard');
  const [showProfilePage, setShowProfilePage] = useState(false);
  const [isAcceptRequestModalOpen, setIsAcceptRequestModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [requestType, setRequestType] = useState<'investor' | 'startup'>('investor');
  const [financialMatrix, setFinancialMatrix] = useState({
    minimumInvestment: '',
    maximumInvestment: '',
    stage: '',
    successFee: '',
    successFeeType: 'percentage',
    scoutingFee: ''
  });
  const [agreementFile, setAgreementFile] = useState<File | null>(null);
  const [coInvestmentListings, setCoInvestmentListings] = useState<Set<number>>(new Set());
  
  // Track recommended startups to change button color
  const [recommendedStartups, setRecommendedStartups] = useState<Set<number>>(new Set());
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Discovery tab state
  const [activeFundraisingStartups, setActiveFundraisingStartups] = useState<ActiveFundraisingStartup[]>([]);
  const [shuffledPitches, setShuffledPitches] = useState<ActiveFundraisingStartup[]>([]);
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);
  const [favoritedPitches, setFavoritedPitches] = useState<Set<number>>(new Set());
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [showOnlyValidated, setShowOnlyValidated] = useState(false);
  const [isLoadingPitches, setIsLoadingPitches] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'info' | 'success' | 'warning' | 'error', timestamp: Date}>>([]);
  
  // Dashboard navigation state
  const [viewingInvestorDashboard, setViewingInvestorDashboard] = useState(false);
  const [viewingStartupDashboard, setViewingStartupDashboard] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState<User | null>(null);
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [investorOffers, setInvestorOffers] = useState<any[]>([]);
  const [startupOffers, setStartupOffers] = useState<any[]>([]);

  // Get the investment advisor's currency
  const advisorCurrency = useInvestmentAdvisorCurrency(currentUser);


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

  // Fetch active fundraising startups for Discovery tab
  useEffect(() => {
    const loadActiveFundraisingStartups = async () => {
      if (activeTab === 'discovery') {
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

  // Get pending startup requests - FIXED VERSION
  const pendingStartupRequests = useMemo(() => {
    if (!startups || !Array.isArray(startups) || !users || !Array.isArray(users)) {
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

      // Check if this user has entered the investment advisor code
      const hasEnteredCode = (startupUser as any).investment_advisor_code_entered === currentUser?.investment_advisor_code;
      const isNotAccepted = !(startupUser as any).advisor_accepted;

      return hasEnteredCode && isNotAccepted;
    });

    return pendingStartups;
  }, [startups, users, currentUser?.investment_advisor_code]);

  // Get pending investor requests - FIXED VERSION
  const pendingInvestorRequests = useMemo(() => {
    if (!users || !Array.isArray(users)) {
      return [];
    }

    // Find investors who have entered the investment advisor code but haven't been accepted
    const pendingInvestors = users.filter(user => {
      const hasEnteredCode = user.role === 'Investor' && 
        (user as any).investment_advisor_code_entered === currentUser?.investment_advisor_code;
      const isNotAccepted = !(user as any).advisor_accepted;

      return hasEnteredCode && isNotAccepted;
    });

    return pendingInvestors;
  }, [users, currentUser?.investment_advisor_code]);

  // Get accepted startups - FIXED VERSION
  const myStartups = useMemo(() => {
    if (!startups || !Array.isArray(startups) || !users || !Array.isArray(users)) {
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

      // Check if this user has entered the investment advisor code and has been accepted
      const hasEnteredCode = (startupUser as any).investment_advisor_code_entered === currentUser?.investment_advisor_code;
      const isAccepted = (startupUser as any).advisor_accepted === true;

      return hasEnteredCode && isAccepted;
    });

    return acceptedStartups;
  }, [startups, users, currentUser?.investment_advisor_code]);

  // Get accepted investors - FIXED VERSION
  const myInvestors = useMemo(() => {
    if (!users || !Array.isArray(users)) {
      return [];
    }

    // Find investors who have entered the investment advisor code (including new ones)
    const acceptedInvestors = users.filter(user => {
      const hasEnteredCode = user.role === 'Investor' && 
        (user as any).investment_advisor_code_entered === currentUser?.investment_advisor_code;
      const isAccepted = (user as any).advisor_accepted === true;

      return hasEnteredCode; // Include all investors who entered the code, regardless of acceptance status
    });

    return acceptedInvestors;
  }, [users, currentUser?.investment_advisor_code]);

  // Create serviceRequests by combining pending startups and investors - FIXED VERSION
  const serviceRequests = useMemo(() => {
    const startupRequests = pendingStartupRequests.map(startup => {
      const startupUser = users.find(user => user.id === startup.user_id);
      return {
        id: startup.id,
        name: startup.name,
        email: startupUser?.email || '',
        type: 'startup',
        created_at: startup.created_at || new Date().toISOString()
      };
    });

    const investorRequests = pendingInvestorRequests.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      type: 'investor',
      created_at: user.created_at || new Date().toISOString()
    }));

    const allRequests = [...startupRequests, ...investorRequests];

    return allRequests;
  }, [pendingStartupRequests, pendingInvestorRequests, users]);

  // Offers Made - Fetch directly from database based on advisor code and stages
  const [offersMade, setOffersMade] = useState<any[]>([]);
  const [loadingOffersMade, setLoadingOffersMade] = useState(false);
  
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
      
      // First, fetch offers at stages 1, 2, and 4
      const { data: offersData, error: offersError } = await supabase
        .from('investment_offers')
        .select('*')
        .in('stage', [1, 2, 4])
        .order('created_at', { ascending: false });

      if (offersError) {
        console.error('Error fetching offers:', offersError);
        return;
      }

      if (!offersData || offersData.length === 0) {
        setOffersMade([]);
        return;
      }

      // Get unique investor emails and startup IDs
      const investorEmails = [...new Set(offersData.map(offer => offer.investor_email))];
      const startupIds = [...new Set(offersData.map(offer => offer.startup_id))];

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
      const startupNames = [...new Set(offersData.map(offer => offer.startup_name))];
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
      const filteredOffers = offersData.filter(offer => {
        const investor = investorsMap[offer.investor_email];
        const startup = startupsMap[offer.startup_id];
        
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
      }).map(offer => ({
        ...offer,
        startup: startupsMap[offer.startup_id],
        fundraising: fundraisingMap[offer.startup_id],
        investor: investorsMap[offer.investor_email],
        startup_user: startupUsersMap[offer.startup_name],
        investor_advisor: advisorsMap[offer.investor_advisor_code],
        startup_advisor: advisorsMap[offer.startup_advisor_code]
      }));

      // Set the properly filtered offers (no debugging fallback)
      setOffersMade(filteredOffers);
      
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
    if (activeTab === 'myInvestments') {
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

  // Get co-investment opportunities
  const coInvestmentOpportunities = useMemo(() => {
    if (!investments || !Array.isArray(investments)) {
      return [];
    }
    
    // Filter and map investments to co-investment opportunities
    const opportunities = investments.map(investment => ({
      id: investment.id,
      name: investment.name,
      sector: investment.sector,
      investmentValue: investment.investmentValue,
      equityAllocation: investment.equityAllocation,
      complianceStatus: investment.complianceStatus,
      pitchDeckUrl: investment.pitchDeckUrl,
      pitchVideoUrl: investment.pitchVideoUrl,
      totalFunding: investment.totalFunding,
      totalRevenue: investment.totalRevenue,
      registrationDate: investment.registrationDate,
      investmentType: investment.investmentType
    }));
    
    return opportunities;
  }, [investments]);

  // Handle accepting service requests
  const handleAcceptRequest = async (request: any) => {
    // Validate form data before submission
    if (!financialMatrix.minimumInvestment || !financialMatrix.maximumInvestment) {
      setNotifications(prev => [...prev, {
        id: Date.now().toString(),
        message: 'Please fill in minimum and maximum investment amounts',
        type: 'error',
        timestamp: new Date()
      }]);
      return;
    }

    if (financialMatrix.successFee && financialMatrix.successFeeType === 'percentage') {
      const feeValue = parseFloat(financialMatrix.successFee);
      if (feeValue < 0 || feeValue > 100) {
        setNotifications(prev => [...prev, {
          id: Date.now().toString(),
          message: 'Success fee percentage must be between 0 and 100',
          type: 'error',
          timestamp: new Date()
        }]);
        return;
      }
    }

    if (financialMatrix.successFee && financialMatrix.successFeeType === 'fixed') {
      const feeValue = parseFloat(financialMatrix.successFee);
      if (feeValue < 0) {
        setNotifications(prev => [...prev, {
          id: Date.now().toString(),
          message: 'Success fee amount must be positive',
          type: 'error',
          timestamp: new Date()
        }]);
        return;
      }
    }

    try {
      setIsLoading(true);
      
      if (request.type === 'investor') {
        await (userService as any).acceptInvestmentAdvisorRequest(request.id, financialMatrix);
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
        await (userService as any).acceptStartupAdvisorRequest(startup.id, startupUser.id, financialMatrix);
      }
      
      // Add success notification
      setNotifications(prev => [...prev, {
        id: Date.now().toString(),
        message: `${request.type === 'investor' ? 'Investor' : 'Startup'} request accepted successfully!`,
        type: 'success',
        timestamp: new Date()
      }]);
      setIsAcceptRequestModalOpen(false);
      // Auto-remove notification after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, 5000);
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

  // Handle co-investment recommendations
  const handleRecommendCoInvestment = async (startupId: number) => {
    try {
      setIsLoading(true);
      
      if (myInvestors.length === 0) {
        setNotifications(prev => [...prev, {
          id: Date.now().toString(),
          message: 'You have no assigned investors to recommend this startup to. Please accept investor requests first.',
          type: 'warning',
          timestamp: new Date()
        }]);
        return;
      }
      
      const startup = startups.find(s => s.id === startupId);
      if (!startup) {
        setNotifications(prev => [...prev, {
          id: Date.now().toString(),
          message: 'Startup not found. Please refresh the page and try again.',
          type: 'error',
          timestamp: new Date()
        }]);
        return;
      }
      
      const investorIds = myInvestors.map(investor => investor.id);
      
      // Create recommendations in the database
      const recommendationPromises = investorIds.map(investorId => 
        supabase
          .from('investment_advisor_recommendations')
          .insert({
            investment_advisor_id: currentUser?.id || '',
            startup_id: startupId,
            investor_id: investorId,
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
      
      // Add to recommended startups set to change button color
      setRecommendedStartups(prev => new Set([...prev, startupId]));
      
      setNotifications(prev => [...prev, {
        id: Date.now().toString(),
        message: `Successfully recommended "${startup.name}" to ${myInvestors.length} investors!`,
        type: 'success',
        timestamp: new Date()
      }]);
      
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
  const handleAdvisorApproval = async (offerId: number, action: 'approve' | 'reject', type: 'investor' | 'startup') => {
    try {
      setIsLoading(true);
      
      let result;
      if (type === 'investor') {
        // Stage 1: Investor advisor approval
        result = await investmentService.approveInvestorAdvisorOffer(offerId, action);
      } else {
        // Stage 2: Startup advisor approval
        result = await investmentService.approveStartupAdvisorOffer(offerId, action);
      }
      
      // Extract new stage from result
      const newStage = result?.new_stage || null;
      
      alert(`Offer ${action}ed successfully!`);
      
      // Dispatch global event to notify other components
      window.dispatchEvent(new CustomEvent('offerStageUpdated', { 
        detail: { offerId, action, type, newStage }
      }));
      
      // Refresh offers made after approval
      await fetchOffersMade();
    } catch (error) {
      console.error(`Error ${action}ing offer:`, error);
      alert(`Failed to ${action} offer. Please try again.`);
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
    // Load investor's offers using the same logic as App.tsx
    try {
      const investorOffersData = await investmentService.getUserInvestmentOffers(investor.email);
      setInvestorOffers(investorOffersData);
    } catch (error) {
      console.error('Error loading investor offers:', error);
      setInvestorOffers([]);
    }
    
    setSelectedInvestor(investor);
    setViewingInvestorDashboard(true);
  };

  // Handle viewing startup dashboard
  const handleViewStartupDashboard = async (startup: Startup) => {
    // Load startup's offers using the same logic as App.tsx
    try {
      const startupOffersData = await investmentService.getOffersForStartup(startup.id);
      setStartupOffers(startupOffersData);
    } catch (error) {
      console.error('Error loading startup offers:', error);
      setStartupOffers([]);
    }
    
    setSelectedStartup(startup);
    setViewingStartupDashboard(true);
  };

  // Handle closing investor dashboard
  const handleCloseInvestorDashboard = () => {
    setViewingInvestorDashboard(false);
    setSelectedInvestor(null);
    setInvestorOffers([]);
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
      window.location.reload();
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
• Date: ${new Date(offer.created_at).toLocaleDateString()}

📧 CONTACT DETAILS:
• ${startupContact}
• ${investorContact}
    `;
    
    // Show the detailed contact information
    alert(contactDetails);
  };

  // Logout handler
  const handleLogout = () => {
    console.log('Logging out...');
    window.location.href = '/logout';
  };

  // Discovery tab handlers
  const handleFavoriteToggle = (startupId: number) => {
    setFavoritedPitches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(startupId)) {
        newSet.delete(startupId);
      } else {
        newSet.add(startupId);
      }
      return newSet;
    });
  };

  const handleShare = async (startup: ActiveFundraisingStartup) => {
    try {
      const shareData = {
        title: `${startup.name} - Investment Opportunity`,
        text: `Check out this startup: ${startup.name} in ${startup.sector}`,
        url: window.location.href
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        alert('Startup details copied to clipboard');
      }
    } catch (err) {
      console.error('Share failed', err);
      alert('Unable to share. Try copying manually.');
    }
  };

  const handleDueDiligenceClick = (startup: ActiveFundraisingStartup) => {
    // For advisors, this could open a modal or redirect to due diligence service
    alert(`Due Diligence service for ${startup.name} - This feature can be implemented for advisors`);
  };

  const handleMakeOfferClick = (startup: ActiveFundraisingStartup) => {
    // For advisors, this could open a modal to help investors make offers
    alert(`Help investors make offers for ${startup.name} - This feature can be implemented for advisors`);
  };


  // If profile page is open, show it instead of main content
  if (showProfilePage) {
    return (
      <ProfilePage 
        user={currentUser} 
        onBack={() => setShowProfilePage(false)} 
        onUpdateUser={() => {}} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden ${
                notification.type === 'success' ? 'border-l-4 border-green-400' :
                notification.type === 'error' ? 'border-l-4 border-red-400' :
                notification.type === 'warning' ? 'border-l-4 border-yellow-400' :
                'border-l-4 border-blue-400'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {notification.type === 'success' && (
                      <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {notification.type === 'error' && (
                      <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {notification.type === 'warning' && (
                      <svg className="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    )}
                    {notification.type === 'info' && (
                      <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-gray-900">{notification.message}</p>
                    <p className="mt-1 text-sm text-gray-500">{notification.timestamp.toLocaleTimeString()}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex">
                    <button
                      onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                      className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <span className="sr-only">Close</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Investment Advisor Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowProfilePage(true)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
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
              onClick={() => setActiveTab('myInvestments')}
              className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'myInvestments'
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
              onClick={() => setActiveTab('myInvestors')}
              className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'myInvestors'
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
              onClick={() => setActiveTab('myStartups')}
              className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'myStartups'
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
              onClick={() => setActiveTab('system')}
              className={`py-2 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'system'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                System Manager
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
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Investors</p>
                  <p className="text-2xl font-semibold text-gray-900">{myInvestors.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Startups</p>
                  <p className="text-2xl font-semibold text-gray-900">{myStartups.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending Requests</p>
                  <p className="text-2xl font-semibold text-gray-900">{serviceRequests.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Offers</p>
                  <p className="text-2xl font-semibold text-gray-900">{offersMade.length}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('discovery')}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-gray-900">Discover Pitches</h4>
                    <p className="text-xs text-gray-500">Browse startup pitches</p>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('myInvestors')}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-gray-900">My Investors</h4>
                    <p className="text-xs text-gray-500">Manage investor relationships</p>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('myStartups')}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-medium text-gray-900">My Startups</h4>
                    <p className="text-xs text-gray-500">Manage startup relationships</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
          
          {/* Service Requests Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Service Requests</h3>
              <p className="text-sm text-gray-600 mb-4">
                Investors and Startups who have requested your services using your Investment Advisor Code
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {serviceRequests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {request.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              request.type === 'investor' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {request.type === 'investor' ? 'Investor' : 'Startup'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(request.created_at || Date.now()).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setRequestType(request.type);
                                setIsAcceptRequestModalOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Accept Request
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

          {/* Offers Made Section */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Offers Made</h3>
                  <p className="text-sm text-gray-600">
                Investment offers made by your assigned investors or received by your assigned startups
              </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{offersMade.length}</div>
                  <div className="text-sm text-gray-500">Total Offers</div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">User Type</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Offer Details</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Startup Ask</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Approval Status</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Date</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {offersMade.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Offers Found</h3>
                            <p className="text-sm text-gray-500 mb-4">
                              No investment offers are currently requiring your approval or involving your clients.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : loadingOffersMade ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                          Loading offers...
                        </td>
                      </tr>
                    ) : offersMade.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Offers Found</h3>
                            <p className="text-sm text-gray-500 mb-4">
                              No investment offers are currently requiring your approval or involving your clients.
                            </p>
                            <div className="text-xs text-gray-400 bg-gray-50 p-3 rounded border max-w-md">
                              <div className="font-medium mb-2">How offers appear here:</div>
                              <div className="text-left space-y-1">
                                <div>• <strong>Stage 1:</strong> Offers from your investors (need your approval)</div>
                                <div>• <strong>Stage 2:</strong> Offers to your startups (need your approval)</div>
                                <div>• <strong>Stage 4:</strong> Completed deals involving your clients</div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      offersMade.map((offer) => {
                        const investorAdvisorStatus = (offer as any).investor_advisor_approval_status;
                        const startupAdvisorStatus = (offer as any).startup_advisor_approval_status;
                        const hasContactDetails = (offer as any).contact_details_revealed;
                        
                        return (
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
                                  <span className="text-xs truncate">{offer.investor_name || offer.investor_email || 'Unknown Investor'}</span>
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
                              {(() => {
                                // Get offer stage (default to 1 if not set)
                                const offerStage = (offer as any).stage || 1;
                                
                                // Determine the approval status to display based on stage
                                if (offerStage === 1) {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                      🔵 Stage 1: Investor Advisor Approval
                              </span>
                                  );
                                }
                                if (offerStage === 2) {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                      🟣 Stage 2: Startup Advisor Approval
                                    </span>
                                  );
                                }
                                if (offerStage === 3) {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                      ✅ Stage 3: Ready for Startup Review
                                    </span>
                                  );
                                }
                                if (investorAdvisorStatus === 'rejected') {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                      ❌ Rejected by Investor Advisor
                                    </span>
                                  );
                                }
                                if ((offer as any).startup_advisor_approval_status === 'rejected') {
                                  return (
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                      ❌ Rejected by Startup Advisor
                                    </span>
                                  );
                                }
                                
                                return (
                                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                    ❓ Unknown Status
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-500">
                              <div className="text-xs">
                                {new Date(offer.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-3 py-4 text-sm font-medium">
                              {(() => {
                                // Get offer stage (default to 1 if not set)
                                const offerStage = (offer as any).stage || 1;
                                
                                // Show approval buttons based on stage
                                if (offerStage === 1) {
                                  // Stage 1: Investor advisor approval
                                  return (
                                    <div className="flex flex-col space-y-1">
                                      <button
                                        onClick={() => offer.startup && handleViewStartupDashboard(offer.startup as any)}
                                        disabled={isLoading}
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
                                  // Stage 2: Startup advisor approval
                                  return (
                                    <div className="flex flex-col space-y-1">
                                      <button
                                        onClick={() => handleNegotiateOffer(offer.id)}
                                        disabled={isLoading}
                                        className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded hover:bg-purple-100 disabled:opacity-50 font-medium"
                                      >
                                        Negotiate Offer
                                      </button>
                                      <button
                                        onClick={() => handleAdvisorApproval(offer.id, 'approve', 'startup')}
                                        disabled={isLoading}
                                        className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50 font-medium"
                                      >
                                        Accept
                                      </button>
                                      <button
                                        onClick={() => handleAdvisorApproval(offer.id, 'reject', 'startup')}
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Startup</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sector</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investment Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equity %</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Investor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {coInvestmentOpportunities.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Co-Investment Opportunities</h3>
                            <p className="text-sm text-gray-500 mb-4">
                              No investment opportunities are currently available for co-investment. Check back later for new opportunities.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      coInvestmentOpportunities.map((investment) => (
                        <tr key={investment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {investment.name || 'Unknown Startup'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {investment.sector || 'Not specified'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {investment.investmentValue ? formatCurrency(investment.investmentValue) : 'Not specified'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {investment.equityAllocation ? `${investment.equityAllocation}%` : 'Not specified'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="text-gray-400 italic">TBD</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              investment.complianceStatus === 'Compliant' ? 'bg-green-100 text-green-800' :
                              investment.complianceStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                              investment.complianceStatus === 'Non-Compliant' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {investment.complianceStatus || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  alert('Due diligence functionality coming soon!');
                                }}
                                className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors"
                              >
                                Due Diligence
                              </button>
                              <button
                                onClick={() => handleRecommendCoInvestment(investment.id)}
                                disabled={isLoading || myInvestors.length === 0}
                                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                  myInvestors.length === 0 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                }`}
                                title={myInvestors.length === 0 ? 'No investors assigned to recommend to' : 'Recommend to your investors'}
                              >
                                {isLoading ? 'Recommending...' : 'Recommend to Investors'}
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

      {/* Discovery Tab */}
      {activeTab === 'discovery' && (
        <div className="animate-fade-in max-w-4xl mx-auto w-full">
          {/* Enhanced Header */}
          <div className="mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Discover Pitches</h2>
              <p className="text-sm text-slate-600">Watch startup videos and explore opportunities for your investors</p>
            </div>
            
            {/* Search Bar */}
            <div className="mb-6">
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
                    }}
                    className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm ${
                      !showOnlyValidated && !showOnlyFavorites
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
                    }}
                    className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm ${
                      showOnlyValidated && !showOnlyFavorites
                        ? 'bg-green-600 text-white shadow-green-200' 
                        : 'bg-white text-slate-600 hover:bg-green-50 hover:text-green-600 border border-slate-200'
                    }`}
                  >
                    <svg className={`h-3 w-3 sm:h-4 sm:w-4 ${showOnlyValidated && !showOnlyFavorites ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="hidden sm:inline">Verified</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowOnlyValidated(false);
                      setShowOnlyFavorites(true);
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
                
          <div className="space-y-8">
            {isLoadingPitches ? (
              <div className="bg-white rounded-lg shadow text-center py-20">
                <div className="max-w-sm mx-auto">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading Pitches...</h3>
                  <p className="text-slate-500">Fetching active fundraising startups</p>
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
                              : 'No startups are currently fundraising. Check back later for new opportunities.'
                        }
                      </p>
                    </div>
                  </div>
                );
              }
              
              return filteredPitches.map(inv => {
                const embedUrl = investorService.getYoutubeEmbedUrl(inv.pitchVideoUrl);
                return (
                  <div key={inv.id} className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 overflow-hidden">
                    {/* Enhanced Video Section */}
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
                            <svg className="h-16 w-16 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm">No video available</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Enhanced Content Section */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-slate-800 mb-2">{inv.name}</h3>
                          <p className="text-slate-600 font-medium">{inv.sector}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {inv.isStartupNationValidated && (
                            <div className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Verified
                            </div>
                          )}
                        </div>
                      </div>
                                        
                      {/* Enhanced Action Buttons */}
                      <div className="flex items-center gap-4 mt-6">
                        <button
                          onClick={() => handleFavoriteToggle(inv.id)}
                          className={`!rounded-full !p-3 transition-all duration-200 ${
                            favoritedPitches.has(inv.id)
                              ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-200'
                              : 'hover:bg-red-50 hover:text-red-600 border border-slate-200 bg-white'
                          } px-3 py-2 rounded-lg text-sm font-medium`}
                        >
                          <svg className={`h-5 w-5 ${favoritedPitches.has(inv.id) ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>

                        <button
                          onClick={() => handleShare(inv)}
                          className="!rounded-full !p-3 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all duration-200 border border-slate-200 bg-white px-3 py-2 rounded-lg text-sm font-medium"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                          </svg>
                        </button>

                        {inv.pitchDeckUrl && inv.pitchDeckUrl !== '#' && (
                          <a href={inv.pitchDeckUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                            <button className="w-full hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 border border-slate-200 bg-white px-3 py-2 rounded-lg text-sm font-medium">
                              <svg className="h-4 w-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              View Deck
                            </button>
                          </a>
                        )}

                        <button
                          onClick={() => handleDueDiligenceClick(inv)}
                          className="flex-1 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300 transition-all duration-200 border border-slate-200 bg-white px-3 py-2 rounded-lg text-sm font-medium"
                        >
                          <svg className="h-4 w-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Due Diligence (€150)
                        </button>

                        <button
                          onClick={() => handleRecommendCoInvestment(inv.id)}
                          className={`flex-1 transition-all duration-200 shadow-lg text-white px-3 py-2 rounded-lg text-sm font-medium ${
                            recommendedStartups.has(inv.id)
                              ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-blue-200'
                              : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-green-200'
                          }`}
                        >
                          <svg className="h-4 w-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          {recommendedStartups.has(inv.id) ? 'Recommended ✓' : 'Recommend to Investors'}
                        </button>
                      </div>
                    </div>

                    {/* Enhanced Investment Details Footer */}
                    <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 flex justify-between items-center border-t border-slate-200">
                      <div className="text-base">
                        <span className="font-semibold text-slate-800">Ask:</span> {investorService.formatCurrency(inv.investmentValue, inv.currency || 'USD')} for <span className="font-semibold text-blue-600">{inv.equityAllocation}%</span> equity
                      </div>
                      {inv.complianceStatus === ComplianceStatus.Compliant && (
                        <div className="flex items-center gap-1 text-green-600" title="This startup has been verified by Startup Nation">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
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

      {/* My Investments Tab - Shows Stage 4 offers with same structure as Offers Made */}
      {activeTab === 'myInvestments' && (
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
                                <span className="text-xs truncate">{offer.investor_name || offer.investor_email || 'Unknown Investor'}</span>
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
                              {new Date(offer.created_at).toLocaleDateString()}
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

      {/* My Investors Tab */}
      {activeTab === 'myInvestors' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">My Investors</h3>
            <p className="text-sm text-gray-600 mb-4">
              Investors who have accepted your advisory services
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accepted Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {myInvestors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No assigned investors
                      </td>
                    </tr>
                  ) : (
                    myInvestors.map((investor) => (
                      <tr key={investor.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {investor.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {investor.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(investor.created_at || Date.now()).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* My Startups Tab */}
      {activeTab === 'myStartups' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">My Startups</h3>
            <p className="text-sm text-gray-600 mb-4">
              Startups that have accepted your advisory services
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sector</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Startup Ask</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {myStartups.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No assigned startups
                      </td>
                    </tr>
                  ) : (
                    myStartups.map((startup) => (
                      <tr key={startup.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {startup.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {startup.sector}
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
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* Investment Interests Tab */}
      {activeTab === 'interests' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Investment Interests</h3>
            <p className="text-sm text-gray-600 mb-4">
              Investment interests and preferences from your assigned clients
            </p>
            <div className="text-center text-gray-500 py-8">
              Investment interests functionality coming soon
            </div>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <UserDataManager />
      )}

      {/* Accept Request Modal */}
      {isAcceptRequestModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Accept {selectedRequest.type === 'investor' ? 'Investor' : 'Startup'} Request
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Minimum Investment</label>
                  <input
                    type="number"
                    value={financialMatrix.minimumInvestment}
                    onChange={(e) => setFinancialMatrix({...financialMatrix, minimumInvestment: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Maximum Investment</label>
                  <input
                    type="number"
                    value={financialMatrix.maximumInvestment}
                    onChange={(e) => setFinancialMatrix({...financialMatrix, maximumInvestment: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Success Fee Type</label>
                  <select
                    value={financialMatrix.successFeeType}
                    onChange={(e) => setFinancialMatrix({...financialMatrix, successFeeType: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Success Fee {financialMatrix.successFeeType === 'percentage' ? '(%)' : '(Amount)'}
                  </label>
                  <input
                    type="number"
                    step={financialMatrix.successFeeType === 'percentage' ? '0.01' : '0.01'}
                    min={financialMatrix.successFeeType === 'percentage' ? '0' : '0'}
                    max={financialMatrix.successFeeType === 'percentage' ? '100' : undefined}
                    value={financialMatrix.successFee}
                    onChange={(e) => setFinancialMatrix({...financialMatrix, successFee: e.target.value})}
                    placeholder={financialMatrix.successFeeType === 'percentage' ? '2.5' : '500'}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  {financialMatrix.successFeeType === 'percentage' && (
                    <p className="text-xs text-gray-500 mt-1">Enter percentage (e.g., 2.5 for 2.5%)</p>
                  )}
                  {financialMatrix.successFeeType === 'fixed' && (
                    <p className="text-xs text-gray-500 mt-1">Enter fixed amount in your currency</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Scouting Fee</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={financialMatrix.scoutingFee}
                    onChange={(e) => setFinancialMatrix({...financialMatrix, scoutingFee: e.target.value})}
                    placeholder="100"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter scouting fee amount</p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setIsAcceptRequestModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAcceptRequest(selectedRequest)}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Accepting...' : 'Accept Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Investor Dashboard Modal */}
      {viewingInvestorDashboard && selectedInvestor && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 mx-auto p-4 border w-full max-w-7xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Investor Dashboard - {selectedInvestor.name || selectedInvestor.email}
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
                startups={startups}
                newInvestments={investments}
                startupAdditionRequests={[]}
                investmentOffers={investorOffers}
                currentUser={selectedInvestor}
                onViewStartup={() => {}}
                onAcceptRequest={() => {}}
                onMakeOffer={() => {}}
                onUpdateOffer={() => {}}
                onCancelOffer={() => {}}
                isViewOnly={true}
              />
              {process.env.NODE_ENV === 'development' && (
                <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded m-2">
                  <h4 className="font-bold">🔍 Investor Dashboard Debug:</h4>
                  <p><strong>Selected Investor:</strong> {selectedInvestor?.email}</p>
                  <p><strong>Total Offers (All):</strong> {offers?.length || 0}</p>
                  <p><strong>Loaded Investor Offers:</strong> {investorOffers?.length || 0}</p>
                  <p><strong>Total Startups:</strong> {startups?.length || 0}</p>
                  <p><strong>Total Investments:</strong> {investments?.length || 0}</p>
                  <p><strong>Investor ID:</strong> {selectedInvestor?.id}</p>
                  <p><strong>Investor Code:</strong> {selectedInvestor?.investor_code || selectedInvestor?.investorCode}</p>
                </div>
              )}
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
                userRole="Startup"
                user={currentUser}
                onBack={handleCloseStartupDashboard}
                onActivateFundraising={() => {}}
                onInvestorAdded={() => {}}
                onUpdateFounders={() => {}}
                isViewOnly={true}
                investmentOffers={startupOffers}
                onProcessOffer={() => {}}
              />
              {process.env.NODE_ENV === 'development' && (
                <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded m-2">
                  <h4 className="font-bold">🔍 Startup Dashboard Debug:</h4>
                  <p><strong>Selected Startup:</strong> {selectedStartup?.name}</p>
                  <p><strong>Startup ID:</strong> {selectedStartup?.id}</p>
                  <p><strong>Total Offers (All):</strong> {offers?.length || 0}</p>
                  <p><strong>Loaded Startup Offers:</strong> {startupOffers?.length || 0}</p>
                  <p><strong>Total Users:</strong> {users?.length || 0}</p>
                  <p><strong>Startup Advisor Code:</strong> {(selectedStartup as any)?.investment_advisor_code}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentAdvisorView;