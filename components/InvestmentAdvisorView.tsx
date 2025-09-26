import React, { useState, useEffect, useMemo } from 'react';
import { User, Startup, InvestmentOffer, ComplianceStatus } from '../types';
import { userService, investmentService } from '../lib/database';
import { formatCurrency, formatCurrencyCompact, getCurrencySymbol } from '../lib/utils';
import { useInvestmentAdvisorCurrency } from '../lib/hooks/useInvestmentAdvisorCurrency';
import { investorService, ActiveFundraisingStartup } from '../lib/investorService';
import { AuthUser } from '../lib/auth';
import ProfilePage from './ProfilePage';

interface InvestmentAdvisorViewProps {
  currentUser: AuthUser | null;
  users: User[];
  startups: Startup[];
  investments: any[];
  offers: InvestmentOffer[];
  interests: any[];
}

const InvestmentAdvisorView: React.FC<InvestmentAdvisorViewProps> = ({ 
  currentUser,
  users,
  startups,
  investments,
  offers,
  interests
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'discovery' | 'myInvestments' | 'myInvestors' | 'myStartups' | 'interests'>('dashboard');
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

  // Get the investment advisor's currency
  const advisorCurrency = useInvestmentAdvisorCurrency(currentUser);

  // Debug: Log all users data when component mounts or data changes
  useEffect(() => {
    console.log('🔍 InvestmentAdvisorView - All users data:', users);
    console.log('🔍 InvestmentAdvisorView - Current user data:', currentUser);
    console.log('🔍 InvestmentAdvisorView - All startups data:', startups);
  }, [users, currentUser, startups]);

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

  // Get all pending requests (both investors and startups) who have entered the advisor code but haven't been accepted
  const serviceRequests = useMemo(() => {
    if (!users || !Array.isArray(users) || !startups || !Array.isArray(startups)) return [];
    
    console.log('🔍 InvestmentAdvisorView Debug - serviceRequests:', {
      totalUsers: users.length,
      totalStartups: startups.length,
      currentAdvisorCode: currentUser?.investment_advisor_code,
      currentUserRole: currentUser?.role,
      currentUserId: currentUser?.id
    });
    
    const allUsersWithCodes = users.filter(user => 
      user.role === 'Investor' || user.role === 'Startup'
    );

    console.log('🔍 All users with Investor/Startup roles:', allUsersWithCodes.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      investment_advisor_code_entered: (user as any).investment_advisor_code_entered,
      advisor_accepted: (user as any).advisor_accepted,
      advisor_accepted_date: (user as any).advisor_accepted_date
    })));

    // Debug: Check each user individually
    allUsersWithCodes.forEach(user => {
      const userCode = (user as any).investment_advisor_code_entered;
      const advisorCode = currentUser?.investment_advisor_code;
      const isAccepted = (user as any).advisor_accepted === true;
      
      console.log(`🔍 User ${user.name} (${user.role}):`, {
        userCode: userCode,
        advisorCode: advisorCode,
        codesMatch: userCode === advisorCode,
        isAccepted: isAccepted,
        shouldShow: userCode === advisorCode && !isAccepted
      });
    });

    const pendingRequests = allUsersWithCodes.filter(user => {
      const hasCode = (user as any).investment_advisor_code_entered === currentUser?.investment_advisor_code;
      const notAccepted = (user as any).advisor_accepted !== true;
      return hasCode && notAccepted;
    });

    console.log('🔍 Pending requests found:', pendingRequests.length);
    console.log('🔍 Pending requests details:', pendingRequests.map(req => ({
      id: req.id,
      name: req.name,
      email: req.email,
      role: req.role,
      code: (req as any).investment_advisor_code_entered
    })));

    return pendingRequests.map(user => ({
      ...user,
      type: user.role === 'Investor' ? 'investor' : 'startup'
    }));
  }, [users, startups, currentUser?.investment_advisor_code]);

  // Get accepted investors and startups
  const myInvestors = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    
    const acceptedInvestors = users.filter(user => 
      user.role === 'Investor' &&
      (user as any).investment_advisor_code_entered === currentUser?.investment_advisor_code &&
      (user as any).advisor_accepted === true
    );
    
    console.log('🔍 Accepted investors found:', acceptedInvestors.length, acceptedInvestors.map(inv => ({
      id: inv.id,
      name: inv.name,
      email: inv.email,
      code: (inv as any).investment_advisor_code_entered,
      accepted: (inv as any).advisor_accepted
    })));
    
    return acceptedInvestors;
  }, [users, currentUser?.investment_advisor_code]);

  const myStartups = useMemo(() => {
    if (!startups || !Array.isArray(startups)) return [];
    return startups.filter(startup => 
      (startup as any).investment_advisor_code === currentUser?.investment_advisor_code
    );
  }, [startups, currentUser?.investment_advisor_code]);

  // Get offers made by my investors or received by my startups
  const offersMade = useMemo(() => {
    if (!offers || !Array.isArray(offers)) {
      console.log('🔍 Offers Made Debug: No offers data or not an array', { offers });
      return [];
    }
    
    console.log('🔍 Offers Made Debug: Starting filtering', {
      totalOffers: offers.length,
      currentAdvisorCode: currentUser?.investment_advisor_code,
      totalUsers: users?.length || 0,
      totalStartups: startups?.length || 0
    });

    const filteredOffers = offers.filter(offer => {
      // Check if investor is assigned to this advisor
      const investorHasAdvisor = users.some(user => {
        const match = user.email === offer.investorEmail && 
          (user as any).investment_advisor_code_entered === currentUser?.investment_advisor_code;
        if (match) {
          console.log('🔍 Found investor match:', {
            userEmail: user.email,
            offerInvestorEmail: offer.investorEmail,
            userAdvisorCode: (user as any).investment_advisor_code_entered,
            currentAdvisorCode: currentUser?.investment_advisor_code
          });
        }
        return match;
      });
      
      // Check if startup is assigned to this advisor
      const startupHasAdvisor = startups.some(startup => {
        const match = startup.id === offer.startupId && 
          (startup as any).investment_advisor_code === currentUser?.investment_advisor_code;
        if (match) {
          console.log('🔍 Found startup match:', {
            startupId: startup.id,
            offerStartupId: offer.startupId,
            startupAdvisorCode: (startup as any).investment_advisor_code,
            currentAdvisorCode: currentUser?.investment_advisor_code
          });
        }
        return match;
      });
      
      const shouldInclude = investorHasAdvisor || startupHasAdvisor;
      
      if (shouldInclude) {
        console.log('🔍 Including offer:', {
          offerId: offer.id,
          investorEmail: offer.investorEmail,
          startupId: offer.startupId,
          startupName: offer.startupName,
          investorHasAdvisor,
          startupHasAdvisor
        });
      }
      
      return shouldInclude;
    });

    console.log('🔍 Offers Made Debug: Filtering complete', {
      totalOffers: offers.length,
      filteredOffers: filteredOffers.length,
      filteredOfferIds: filteredOffers.map(o => o.id)
    });

    return filteredOffers;
  }, [offers, users, startups, currentUser?.investment_advisor_code]);

  // Get co-investment opportunities
  const coInvestmentOpportunities = useMemo(() => {
    if (!investments || !Array.isArray(investments)) return [];
    return investments;
  }, [investments]);

  // Handle accepting service requests
  const handleAcceptRequest = async (request: any) => {
    try {
      setIsLoading(true);
      
      if (request.type === 'investor') {
        await (userService as any).acceptInvestmentAdvisorRequest(request.id, financialMatrix);
      } else {
        // For startup requests, we need to find the startup ID associated with the user
        console.log('🔍 Finding startup for user:', request.id);
        const userStartup = startups.find(startup => startup.user_id === request.id);
        
        if (!userStartup) {
          throw new Error('Startup not found for this user');
        }
        
        console.log('🔍 Found startup:', userStartup);
        // Pass both startup ID and user ID to the function
        await (userService as any).acceptStartupAdvisorRequest(userStartup.id, request.id, financialMatrix);
      }
      
      alert(`${request.type === 'investor' ? 'Investor' : 'Startup'} request accepted successfully!`);
      setIsAcceptRequestModalOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle co-investment recommendations
  const handleRecommendCoInvestment = async (opportunityId: number) => {
    try {
      setIsLoading(true);
      
      if (myInvestors.length === 0) {
        alert('You have no assigned investors to recommend this opportunity to.');
        return;
      }
      
      const investorIds = myInvestors.map(investor => investor.id);
      const recommendationCount = await investmentService.recommendCoInvestmentOpportunity(
        opportunityId,
        currentUser?.id || '',
        investorIds
      );
      
      alert(`Successfully recommended this opportunity to ${recommendationCount} investors!`);
      window.location.reload();
    } catch (error) {
      console.error('Error recommending opportunity:', error);
      alert('Failed to recommend opportunity. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle advisor approval actions
  const handleAdvisorApproval = async (offerId: number, action: 'approve' | 'reject', type: 'investor' | 'startup') => {
    try {
      setIsLoading(true);
      
      if (type === 'investor') {
        await investmentService.approveInvestorAdvisorOffer(offerId, action);
      } else {
        await investmentService.approveStartupAdvisorOffer(offerId, action);
      }
      
      alert(`Offer ${action}ed successfully!`);
      window.location.reload();
    } catch (error) {
      console.error(`Error ${action}ing offer:`, error);
      alert(`Failed to ${action} offer. Please try again.`);
    } finally {
      setIsLoading(false);
    }
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
      {/* Debug Panel - Remove this after debugging */}
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 m-4 rounded">
        <h4 className="font-bold">🔍 Debug Information:</h4>
        <p><strong>Current Advisor Code:</strong> {currentUser?.investment_advisor_code || 'None'}</p>
        <p><strong>Total Users:</strong> {users?.length || 0}</p>
        <p><strong>Investors with your code:</strong> {users?.filter(u => u.role === 'Investor' && (u as any).investment_advisor_code_entered === currentUser?.investment_advisor_code).length || 0}</p>
        <p><strong>Pending Requests:</strong> {serviceRequests.length}</p>
        <p><strong>Accepted Investors:</strong> {myInvestors.length}</p>
        <details className="mt-2">
          <summary className="cursor-pointer font-medium">Show All Users with Advisor Codes</summary>
          <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(users?.filter(u => (u as any).investment_advisor_code_entered).map(u => ({
              name: u.name,
              role: u.role,
              code: (u as any).investment_advisor_code_entered,
              accepted: (u as any).advisor_accepted
            })), null, 2)}
          </pre>
        </details>
      </div>
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
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
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
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
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
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
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
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
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
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
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
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
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
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                          No pending service requests
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Offers Made</h3>
              <p className="text-sm text-gray-600 mb-4">
                Investment offers made by your assigned investors or received by your assigned startups
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Startup</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Offer Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equity %</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scouting Fees</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {offersMade.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                          <div className="space-y-2">
                            <div>No relevant offers found</div>
                            <div className="text-xs text-gray-400">
                              Debug Info: Total offers: {offers?.length || 0} | 
                              Current advisor code: {currentUser?.investment_advisor_code || 'None'} | 
                              Users with advisor codes: {users?.filter(u => (u as any).investment_advisor_code_entered).length || 0} | 
                              Startups with advisor codes: {startups?.filter(s => (s as any).investment_advisor_code).length || 0}
                            </div>
                            <div className="text-xs text-gray-400">
                              Sample offer data: {offers?.length > 0 ? JSON.stringify({
                                investorEmail: offers[0]?.investorEmail,
                                startupId: offers[0]?.startupId,
                                startupName: offers[0]?.startupName
                              }) : 'No offers'}
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
                              {offer.startupName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {offer.investorEmail}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(offer.offerAmount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {offer.equityPercentage}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                offer.status === 'pending_investor_advisor_approval' ? 'bg-blue-100 text-blue-800' :
                                offer.status === 'pending_startup_advisor_approval' ? 'bg-purple-100 text-purple-800' :
                                offer.status === 'investor_advisor_approved' ? 'bg-green-100 text-green-800' :
                                offer.status === 'startup_advisor_approved' ? 'bg-green-100 text-green-800' :
                                offer.status === 'investor_advisor_rejected' ? 'bg-red-100 text-red-800' :
                                offer.status === 'startup_advisor_rejected' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {offer.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="text-xs">
                                <div>Startup: {formatCurrency((offer as any).startup_scouting_fee_amount || 0)}</div>
                                <div>Investor: {formatCurrency((offer as any).investor_scouting_fee_amount || 0)}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(offer.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {(() => {
                                // Show approval buttons if advisor approval is pending
                                if (investorAdvisorStatus === 'pending' || startupAdvisorStatus === 'pending') {
                                  return (
                                    <div className="space-x-2">
                                      <button
                                        onClick={() => handleAdvisorApproval(offer.id, 'approve', 
                                          investorAdvisorStatus === 'pending' ? 'investor' : 'startup')}
                                        disabled={isLoading}
                                        className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full hover:bg-green-200 disabled:opacity-50"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleAdvisorApproval(offer.id, 'reject', 
                                          investorAdvisorStatus === 'pending' ? 'investor' : 'startup')}
                                        disabled={isLoading}
                                        className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded-full hover:bg-red-200 disabled:opacity-50"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  );
                                }
                                
                                // Show contact details button for accepted offers
                                if (!hasContactDetails && offer.status === 'accepted') {
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
                                  return <span className="text-green-600">Contact Details Revealed</span>;
                                }
                                
                                return <span className="text-gray-400">Pending</span>;
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
                        <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                          No co-investment opportunities available
                        </td>
                      </tr>
                    ) : (
                      coInvestmentOpportunities.map((investment) => (
                        <tr key={investment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {investment.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {investment.sector}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(investment.investmentValue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {investment.equityAllocation}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            Lead Investor Name
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              investment.complianceStatus === 'Approved' ? 'bg-green-100 text-green-800' :
                              investment.complianceStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {investment.complianceStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  alert('Due diligence functionality coming soon!');
                                }}
                                className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 hover:bg-purple-200"
                              >
                                Due Diligence
                              </button>
                              <button
                                onClick={() => handleRecommendCoInvestment(investment.id)}
                                disabled={isLoading}
                                className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-50"
                              >
                                Recommend to My Investors
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
                          onClick={() => handleMakeOfferClick(inv)}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-200 text-white px-3 py-2 rounded-lg text-sm font-medium"
                        >
                          <svg className="h-4 w-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          Help Make Offer
                        </button>
                      </div>
                    </div>

                    {/* Enhanced Investment Details Footer */}
                    <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 flex justify-between items-center border-t border-slate-200">
                      <div className="text-base">
                        <span className="font-semibold text-slate-800">Ask:</span> {investorService.formatCurrency(inv.investmentValue, advisorCurrency)} for <span className="font-semibold text-blue-600">{inv.equityAllocation}%</span> equity
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

      {/* My Investments Tab */}
      {activeTab === 'myInvestments' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">My Investments</h3>
            <p className="text-sm text-gray-600 mb-4">
              Investment deals facilitated through your advisory services
            </p>
            <div className="text-center text-gray-500 py-8">
              Investment tracking functionality coming soon
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {myInvestors.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investment Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {myStartups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
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
                          {formatCurrency(startup.investmentValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
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
                  <label className="block text-sm font-medium text-gray-700">Success Fee</label>
                  <input
                    type="number"
                    value={financialMatrix.successFee}
                    onChange={(e) => setFinancialMatrix({...financialMatrix, successFee: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
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
    </div>
  );
};

export default InvestmentAdvisorView;