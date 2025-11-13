import React, { useState, useEffect, useMemo } from 'react';
import { User, Startup, InvestmentOffer, ComplianceStatus } from '../types';
import { userService, investmentService } from '../lib/database';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatCurrencyCompact, getCurrencySymbol } from '../lib/utils';
import { useInvestmentAdvisorCurrency } from '../lib/hooks/useInvestmentAdvisorCurrency';
import { investorService, ActiveFundraisingStartup } from '../lib/investorService';
import { AuthUser, authService } from '../lib/auth';
import { Eye, Users } from 'lucide-react';
import ProfilePage from './ProfilePage';
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'discovery' | 'myInvestments' | 'myInvestors' | 'myStartups' | 'interests'>('dashboard');
  const [showProfilePage, setShowProfilePage] = useState(false);
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
  const [investorDashboardData, setInvestorDashboardData] = useState<{
    investorStartups: Startup[];
    investorInvestments: any[];
    investorStartupAdditionRequests: any[];
  }>({ investorStartups: [], investorInvestments: [], investorStartupAdditionRequests: [] });
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

  // Fetch active fundraising startups for Discovery tab and Investment Interests tab
  useEffect(() => {
    const loadActiveFundraisingStartups = async () => {
      if (activeTab === 'discovery' || activeTab === 'interests') {
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

    // Find investors who have entered the investment advisor code AND have been accepted
    const acceptedInvestors = users.filter(user => {
      const hasEnteredCode = user.role === 'Investor' && 
        (user as any).investment_advisor_code_entered === currentUser?.investment_advisor_code;
      const isAccepted = (user as any).advisor_accepted === true;

      return hasEnteredCode && isAccepted; // Only include investors who have been accepted
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
  
  // Separate offers into investor offers and startup offers for the "Offers Made" section
  const investorOffersList = useMemo(() => {
    return offersMade.filter(offer => (offer as any).isInvestorOffer);
  }, [offersMade]);
  
  const startupOffersList = useMemo(() => {
    return offersMade.filter(offer => (offer as any).isStartupOffer);
  }, [offersMade]);
  
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
          const investorHasThisAdvisor = investor.investment_advisor_code_entered === currentUser?.investment_advisor_code;
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
    // Open full Startup Dashboard (read-only) for advisor-led due diligence review
    (onViewStartup as any)(startup.id, 'dashboard');
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
            <div className="flex items-center">
              <button
                onClick={() => setShowProfilePage(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                title="View Profile"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Profile</span>
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
                              onClick={() => handleAcceptRequest(request)}
                              disabled={isLoading}
                              className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isLoading ? 'Accepting...' : 'Accept Request'}
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
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Investor Offers</h3>
                  <p className="text-sm text-gray-600">
                    Investment offers made by your assigned investors
              </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{investorOffersList.length}</div>
                  <div className="text-sm text-gray-500">Investor Offers</div>
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
                    ) : investorOffersList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Investor Offers Found</h3>
                            <p className="text-sm text-gray-500 mb-4">
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
                            <td className="px-3 py-4 text-sm text-gray-500">
                              <div className="text-xs">
                                {offer.created_at ? new Date(offer.created_at).toLocaleDateString() : 'N/A'}
                              </div>
                            </td>
                            <td className="px-3 py-4 text-sm font-medium">
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
                          {(investor as any).advisor_accepted_date 
                            ? new Date((investor as any).advisor_accepted_date).toLocaleDateString()
                            : investor.created_at 
                              ? new Date(investor.created_at).toLocaleDateString()
                              : 'N/A'}
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
    </div>
  );
};

export default InvestmentAdvisorView;