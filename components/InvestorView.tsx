import React, { useState, useEffect } from 'react';
import { Startup, NewInvestment, ComplianceStatus, StartupAdditionRequest, InvestmentType, InvestmentOffer } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import PortfolioDistributionChart from './charts/PortfolioDistributionChart';
import Modal from './ui/Modal';
import Input from './ui/Input';
import { TrendingUp, DollarSign, CheckSquare, Eye, PlusCircle, Activity, FileText, Video, Users, Heart, CheckCircle, LayoutGrid, Film, Edit, X, Clock, CheckCircle2, Shield, Menu, User, Settings, LogOut, Star, Search, Share2 } from 'lucide-react';
import { getQueryParam, setQueryParam } from '../lib/urlState';
import { investorService, ActiveFundraisingStartup } from '../lib/investorService';
import { investmentService } from '../lib/database';
import { currencyRates } from '../lib/currencyUtils';
import ProfilePage from './ProfilePage';
import AdvisorAwareLogo from './AdvisorAwareLogo';
import ContactDetailsModal from './ContactDetailsModal';
import { supabase } from '../lib/supabase';
import { paymentService } from '../lib/paymentService';

interface InvestorViewProps {
  startups: Startup[];
  newInvestments: NewInvestment[];
  startupAdditionRequests: StartupAdditionRequest[];
  investmentOffers: InvestmentOffer[];
  currentUser?: { id: string; email: string; investorCode?: string; investor_code?: string };
  onViewStartup: (startup: Startup) => void;
  onAcceptRequest: (id: number) => void;
  onMakeOffer: (opportunity: NewInvestment, offerAmount: number, equityPercentage: number, currency?: string, wantsCoInvestment?: boolean) => void;
  onUpdateOffer?: (offerId: number, offerAmount: number, equityPercentage: number) => void;
  onCancelOffer?: (offerId: number) => void;
  isViewOnly?: boolean;
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
    isViewOnly = false
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
        // Build a deep link to this pitch in Discover (reels) tab
        const url = new URL(window.location.href);
        url.searchParams.set('tab', 'reels');
        url.searchParams.set('pitchId', String(startup.id));
        const shareUrl = url.toString();
        const details = `Startup: ${startup.name || 'N/A'}\nSector: ${startup.sector || 'N/A'}\nAsk: $${(startup.investmentValue || 0).toLocaleString()} for ${startup.equityAllocation || 0}% equity\n\nOpen pitch: ${shareUrl}`;
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
                alert('Startup details copied to clipboard');
            } else {
                console.log('Using fallback copy method');
                // Fallback: hidden textarea copy
                const textarea = document.createElement('textarea');
                textarea.value = details;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                alert('Startup details copied to clipboard');
            }
        } catch (err) {
            console.error('Share failed', err);
            alert('Unable to share. Try copying manually.');
        }
    };
    
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
    const [selectedOpportunity, setSelectedOpportunity] = useState<ActiveFundraisingStartup | null>(null);
    const [selectedCurrency, setSelectedCurrency] = useState<string>('INR');
    const [wantsCoInvestment, setWantsCoInvestment] = useState<boolean>(false);
    
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
    const [activeTab, setActiveTab] = useState<'dashboard' | 'reels' | 'offers' | 'recommendations'>(() => {
      const fromUrl = (getQueryParam('tab') as any) || 'dashboard';
      const valid = ['dashboard','reels','offers','recommendations'];
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
    const [favoritedPitches, setFavoritedPitches] = useState<Set<number>>(new Set());
    const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
    const [showOnlyValidated, setShowOnlyValidated] = useState(false);
    const [isLoadingPitches, setIsLoadingPitches] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // State for editing offers
    const [isEditOfferModalOpen, setIsEditOfferModalOpen] = useState(false);
    const [selectedOffer, setSelectedOffer] = useState<InvestmentOffer | null>(null);
    const [editOfferAmount, setEditOfferAmount] = useState('');
    const [editOfferEquity, setEditOfferEquity] = useState('');

    const [isLoadingInvestments, setIsLoadingInvestments] = useState(false);
    const [expandedVideoOfferId, setExpandedVideoOfferId] = useState<number | null>(null);

    // Profile page state (same as CA/CS)
    const [showProfilePage, setShowProfilePage] = useState(false);
    
    // Co-investment state management
    const [coInvestmentListings, setCoInvestmentListings] = useState<Set<number>>(new Set());

    // Recommendations state
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  // Co-investment opportunities created by this investor
  const [myCoInvestmentOpps, setMyCoInvestmentOpps] = useState<any[]>([]);
  const [startupNames, setStartupNames] = useState<Record<number, string>>({});
  const [isLoadingMyOpps, setIsLoadingMyOpps] = useState<boolean>(false);

  // Fetch recommendations or all active co-investment opportunities
  const fetchRecommendations = async () => {
    if (!currentUser?.id) return;
    try {
      setIsLoadingRecommendations(true);
      // If investor has advisor code, show advisor recommendations; otherwise show all active opportunities
      const hasAdvisor = !!((currentUser as any).investment_advisor_code || (currentUser as any).investment_advisor_code_entered);
      if (hasAdvisor) {
        const { data, error } = await supabase.rpc('get_investor_recommendations', {
          p_investor_id: currentUser.id
        });
        if (error) {
          console.error('Error fetching recommendations:', error);
          setRecommendations([]);
        } else {
          setRecommendations(data || []);
        }
      } else {
        // Public: fetch all active co-investment opportunities
        const { data, error } = await supabase
          .from('co_investment_opportunities')
          .select('id,startup_id,investment_amount,equity_percentage,status,stage,created_at, startup:startups(name, sector)')
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Error fetching active co-investment opportunities:', error);
          setRecommendations([]);
        } else {
          // Normalize to expected fields used by the table
          const normalized = (data || []).map((row: any) => ({
            recommendation_id: row.id,
            startup_name: row.startup?.name,
            sector: row.startup?.sector,
            compliance_status: `Stage ${row.stage || 1}`,
            investment_amount: row.investment_amount,
            advisor_name: '—',
            recommended_at: row.created_at,
            equity_percentage: row.equity_percentage,
            opportunity_id: row.id
          }));
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

    // Co-investment handler
    const handleSeekCoInvestors = (startupId: number) => {
      setCoInvestmentListings(prev => {
        const newSet = new Set(prev);
        if (newSet.has(startupId)) {
          newSet.delete(startupId);
        } else {
          newSet.add(startupId);
        }
        return newSet;
      });
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

    // Load recommended co-investment opportunities
    useEffect(() => {
        const loadRecommendedOpportunities = async () => {
            if (currentUser?.id) {
                try {
                    const opportunities = await investmentService.getRecommendedCoInvestmentOpportunities(currentUser.id);
                    setRecommendedOpportunities(opportunities);
                } catch (error) {
                    console.error('Error loading recommended opportunities:', error);
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
        console.log('🔎 Loading my co-investment opps for user:', currentUser.id);
        const { data, error } = await supabase
          .from('co_investment_opportunities')
          .select(
            `id,startup_id,listed_by_user_id,listed_by_type,investment_amount,equity_percentage,minimum_co_investment,maximum_co_investment,description,status,stage,lead_investor_advisor_approval_status,startup_advisor_approval_status,startup_approval_status,created_at,updated_at, startup:startups(name, sector)`
          )
          .eq('listed_by_user_id', currentUser.id)
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Error fetching my co-investment opportunities:', error);
          // Retry without join in case of join-related RLS or schema issues
          const retry = await supabase
            .from('co_investment_opportunities')
            .select('*')
            .eq('listed_by_user_id', currentUser.id)
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

    // Fetch recommendations when recommendations tab is active
    useEffect(() => {
        if (activeTab === 'recommendations') {
            fetchRecommendations();
        }
    }, [activeTab, currentUser?.id]);

    const totalFunding = startups.reduce((acc, s) => acc + s.totalFunding, 0);
    const totalRevenue = startups.reduce((acc, s) => acc + s.totalRevenue, 0);
    const compliantCount = startups.filter(s => s.complianceStatus === ComplianceStatus.Compliant).length;
    const complianceRate = startups.length > 0 ? (compliantCount / startups.length) * 100 : 0;

    const handleMakeOfferClick = (opportunity: ActiveFundraisingStartup) => {
        setSelectedOpportunity(opportunity);
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
                // Open full Startup Dashboard (read-only) for due diligence review
                // Pass target tab hint to ensure dashboard is shown first
                (onViewStartup as any)(startup.id, 'dashboard');
                return;
            }
            // Otherwise, create a pending request (idempotent)
            await paymentService.createPendingDueDiligenceIfNeeded(currentUser.id, String(startup.id));
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

        onMakeOffer(newInvestment, offerAmount, equityPercentage, selectedCurrency, wantsCoInvestment);
        // After submitting, switch to Offers tab
        setActiveTab('offers');
        
        setIsOfferModalOpen(false);
        setSelectedOpportunity(null);
        setSelectedCurrency('INR');
        setWantsCoInvestment(false);
    };
    
    const handleFavoriteToggle = (pitchId: number) => {
        setFavoritedPitches(prev => {
            const newSet = new Set(prev);
            if (newSet.has(pitchId)) {
                newSet.delete(pitchId);
            } else {
                newSet.add(pitchId);
            }
            return newSet;
        });
    };

    // Due diligence payment flow removed

    // Handle editing offers
    const handleEditOffer = (offer: InvestmentOffer) => {
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
        
        // Handle rejection cases
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
      {/* Header Section - Above Tabs */}
      <Card className="bg-white border-gray-200">
        <div className="flex items-center justify-between py-1 px-2">
          <div className="flex items-center space-x-1">
            {/* Three-dot Menu - Same as CA/CS */}
            <div className="relative profile-menu">
              <button
                onClick={() => {
                  console.log('🔍 InvestorView: Menu button clicked, setting showProfilePage to true');
                  setShowProfilePage(true);
                }}
                className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                aria-label="Profile menu"
              >
                <Menu className="h-6 w-6 text-slate-600" />
              </button>
            </div>
            
            <div className="flex-shrink-0">
              <AdvisorAwareLogo 
                currentUser={currentUser}
                className="h-24 w-24 sm:h-28 sm:w-28 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                showText={true}
                textClassName="text-xl sm:text-2xl font-semibold text-gray-800"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-500">Investor Code:</p>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg font-mono text-sm font-semibold">
                  {(currentUser as any)?.investor_code || (currentUser as any)?.investorCode || 'INV-XXXXXX'}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-6 w-6 text-purple-600" />
              <span className="text-gray-700 font-medium">Investor</span>
            </div>
          </div>
        </div>
      </Card>

       {/* Tab Navigation */}
        <div className="border-b border-slate-200">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                 <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`${
                        activeTab === 'dashboard'
                        ? 'border-brand-primary text-brand-primary'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    } flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                >
                    <LayoutGrid className="h-5 w-5" />
                    Dashboard
                </button>
                <button
                    onClick={() => setActiveTab('reels')}
                    className={`${
                        activeTab === 'reels'
                        ? 'border-brand-primary text-brand-primary'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    } flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                >
                    <Film className="h-5 w-5" />
                   Discover Pitches
                </button>
                <button
                    onClick={() => setActiveTab('offers')}
                    className={`${
                        activeTab === 'offers'
                        ? 'border-brand-primary text-brand-primary'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    } flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                >
                    <DollarSign className="h-5 w-5" />
                    Offers
                </button>
                <button
                    onClick={() => setActiveTab('recommendations')}
                    className={`${
                        activeTab === 'recommendations'
                        ? 'border-brand-primary text-brand-primary'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    } flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                >
                    <Star className="h-5 w-5" />
                    Recommendations
                </button>
            </nav>
        </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-fade-in">
            {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard title="Total Funding" value={formatCurrency(totalFunding)} icon={<DollarSign className="h-6 w-6 text-brand-primary" />} />
            <SummaryCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={<TrendingUp className="h-6 w-6 text-brand-primary" />} />
            <SummaryCard title="Compliance Rate" value={`${complianceRate.toFixed(1)}%`} icon={<CheckSquare className="h-6 w-6 text-brand-primary" />} />
            <SummaryCard title="My Startups" value={`${startups.length}`} icon={<Users className="h-6 w-6 text-brand-primary" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                {/* Approve Startup Requests */}
                 <Card>
                    <h3 className="text-lg font-semibold mb-4 text-slate-700">Approve Startup Requests</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Value</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Equity</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Status / Action</th>
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{req.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatCurrency(req.investmentValue)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{req.equityAllocation}%</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
                    <h3 className="text-lg font-semibold mb-4 text-slate-700">My Startups</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Current Valuation</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Compliance Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {startups.map(startup => (
                                    <tr key={startup.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-slate-900">{startup.name}</div>
                                            <div className="text-xs text-slate-500">{startup.sector}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatCurrency(startup.currentValuation)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500"><Badge status={startup.complianceStatus} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {!isViewOnly && (
                                            <div className="flex items-center justify-end gap-2">
                                                <Button size="sm" variant="outline" onClick={() => onViewStartup(startup)}><Eye className="mr-2 h-4 w-4" /> View</Button>
                                                <button
                                                    onClick={() => handleSeekCoInvestors(startup.id)}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                                                        coInvestmentListings.has(startup.id)
                                                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                            : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                                    }`}
                                                >
                                                    {coInvestmentListings.has(startup.id) ? 'Co-investment Listed' : 'Seek Co-Investors'}
                                                </button>
                                            </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
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
        <div className="animate-fade-in max-w-4xl mx-auto w-full">
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
                    <Film className="h-3 w-3 sm:h-4 sm:w-4" />
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
                    <CheckCircle className={`h-3 w-3 sm:h-4 sm:w-4 ${showOnlyValidated && !showOnlyFavorites ? 'fill-current' : ''}`} />
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
                    <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${showOnlyFavorites ? 'fill-current' : ''}`} />
                    <span className="hidden sm:inline">Favorites</span>
                  </button>
                </div>
                
                <div className="flex items-center gap-2 text-slate-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs sm:text-sm font-medium">{activeFundraisingStartups.length} active pitches</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-slate-500">
                <Film className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-xs sm:text-sm">Pitch Reels</span>
              </div>
            </div>
          </div>
                
          <div className="space-y-8">
            {isLoadingPitches ? (
              <Card className="text-center py-20">
                <div className="max-w-sm mx-auto">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading Pitches...</h3>
                  <p className="text-slate-500">Fetching active fundraising startups</p>
                </div>
              </Card>
            ) : (() => {
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
                const embedUrl = investorService.getYoutubeEmbedUrl(inv.pitchVideoUrl);
                return (
                  <Card key={inv.id} className="!p-0 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-white">
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
                            onClick={() => { setPlayingVideoId(inv.id); setSelectedPitchId(inv.id); }}
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
                              <CheckCircle className="h-3 w-3" />
                              Verified
                            </div>
                          )}
                          {(() => {
                            const existingOffer = investmentOffers.find(offer => 
                              offer.startupName === inv.name && 
                              offer.status === 'pending'
                            );
                            if (existingOffer) {
                              return (
                                <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                                  <CheckCircle className="h-3 w-3" />
                                  Offer Submitted
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                                        
                      {/* Enhanced Action Buttons */}
                      <div className="flex items-center gap-4 mt-6">
                        <Button
                          size="sm"
                          variant="secondary"
                          className={`!rounded-full !p-3 transition-all duration-200 ${
                            favoritedPitches.has(inv.id)
                              ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-200'
                              : 'hover:bg-red-50 hover:text-red-600 border border-slate-200'
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

                        <button
                          onClick={() => handleDueDiligenceClick(inv)}
                          className="flex-1 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300 transition-all duration-200 border border-slate-200 bg-white px-3 py-2 rounded-lg text-sm font-medium"
                        >
                          <svg className="h-4 w-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Due Diligence
                        </button>

                        {(() => {
                          // Check if user has already submitted an offer for this startup
                          const existingOffer = investmentOffers.find(offer => 
                            offer.startupName === inv.name && 
                            offer.status === 'pending'
                          );
                          
                          if (existingOffer) {
                            return (
                              <div className="flex-1">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled
                                  className="w-full bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200"
                                  title="View and edit your offer in the Dashboard → Recent Activity"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" /> Offer Submitted
                                </Button>
                                <div className="text-xs text-slate-400 mt-1 text-center">
                                  Edit in Dashboard
                                </div>
                              </div>
                            );
                          } else {
                            return !isViewOnly ? (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleMakeOfferClick(inv)}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-200"
                              >
                                <DollarSign className="h-4 w-4 mr-2" /> Make Offer
                              </Button>
                            ) : null;
                          }
                        })()}
                      </div>
                                    </div>

                      {/* Enhanced Investment Details Footer */}
                      <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 flex justify-between items-center border-t border-slate-200">
                        <div className="text-base">
                          <span className="font-semibold text-slate-800">Ask:</span> {investorService.formatCurrency(inv.investmentValue)} for <span className="font-semibold text-blue-600">{inv.equityAllocation}%</span> equity
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
              });
            })()}
          </div>
        </div>
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
            console.log('🔍 Offer data:', {
              id: offer.id,
              offerAmount: offer.offerAmount,
              equityPercentage: offer.equityPercentage,
              currency: (offer as any).currency,
              createdAt: offer.createdAt,
              startupName: offer.startupName,
              status: offer.status
            });
                  
                  return (
                  <div key={offer.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg">{getStageStatusDisplay(offer).icon}</span>
                        <div>
                          <div className="font-medium text-slate-900 truncate">Offer for {offer.startupName}</div>
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
                          {((offer as any).stage || 1) >= 2 && (
                            <div className="text-xs text-blue-600 mt-1">
                              {((offer as any).stage || 1) === 2 && "Awaiting startup advisor approval"}
                              {((offer as any).stage || 1) === 3 && "Awaiting startup review"}
                              {((offer as any).stage || 1) >= 4 && "Approved by startup"}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStageStatusDisplay(offer).color}`}>
                          {getStageStatusDisplay(offer).text}
                        </span>
                        {((offer as any).stage || 1) === 1 && (
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
                        )}
                        {((offer as any).stage || 1) >= 4 && (
                          <div className="flex gap-2">
                            {offer.contact_details_revealed ? (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  // Set the selected offer and open the modal
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
                        )}
                      </div>
                    </div>

                    {(() => {
                      const matchedPitch = activeFundraisingStartups.find(s => 
                        (offer.startup && s.id === offer.startup.id) || s.name === offer.startupName
                      );
                      const deckUrl = matchedPitch?.pitchDeckUrl;
                      const videoUrl = investorService.getYoutubeEmbedUrl(matchedPitch?.pitchVideoUrl);
                      if (!deckUrl && !videoUrl) return null;
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
                              return (
                                <div className="text-xs text-slate-600 mt-0.5">
                                  Total ask <span className="font-medium text-slate-800">{formatCurrency(totalAsk)}</span>
                                  {equityPct > 0 && <> for <span className="font-medium text-slate-800">{fmtPct(equityPct)}</span> equity</>}
                                  {' '}• You committed <span className="font-medium text-slate-800">{formatCurrency(leadCommitted)}</span>
                                  {leadEquityPct > 0 && <> for <span className="font-medium text-slate-800">{fmtPct(leadEquityPct)}</span> equity</>}
                                  {' '}• Remaining <span className="font-medium text-slate-800">{formatCurrency(remaining)}</span>
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

      {activeTab === 'recommendations' && (
        <div className="space-y-6 animate-fade-in">
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-700 flex items-center gap-2">
              <Star className="h-5 w-5 text-purple-600" />
              Recommended Startups
              <span className="text-sm font-normal text-slate-500">
                {((currentUser as any)?.investment_advisor_code || (currentUser as any)?.investment_advisor_code_entered)
                  ? '(Recommended by your Investment Advisor)'
                  : '(All available opportunities)'}
              </span>
            </h3>
            <div className="space-y-4">
              {isLoadingRecommendations ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-slate-500">Loading recommendations...</p>
                </div>
              ) : recommendations.length > 0 ? (
                <div className="space-y-4">
                  {recommendations.map((rec) => (
                    <div key={rec.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-semibold text-slate-800">{rec.startup_name}</h4>
                            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                              {rec.startup_sector}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">
                            <strong>Recommended by:</strong> {rec.advisor_name}
                          </p>
                          <p className="text-sm text-slate-600 mb-2">
                            <strong>Valuation:</strong> {formatCurrency(rec.startup_valuation || 0)}
                          </p>
                          {(rec.recommended_deal_value || rec.investment_amount) > 0 && (
                            <p className="text-sm text-slate-600 mb-2">
                              <strong>Investment Amount:</strong> {formatCurrency(rec.recommended_deal_value || rec.investment_amount)}
                            </p>
                          )}
                          {rec.recommendation_notes && (
                            <p className="text-sm text-slate-600 mb-3">
                              <strong>Notes:</strong> {rec.recommendation_notes}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>Status: {rec.status || rec.compliance_status}</span>
                            <span>{new Date((rec.created_at || rec.recommended_at)).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const startup = startups.find(s => s.name === rec.startup_name);
                              if (startup) onViewStartup(startup);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              const startup = startups.find(s => s.name === rec.startup_name);
                              if (startup) {
                                const activeStartup: ActiveFundraisingStartup = {
                                  id: startup.id,
                                  name: startup.name,
                                  sector: startup.sector,
                                  investmentValue: rec.recommended_deal_value || rec.investment_amount || 0,
                                  equityAllocation: rec.equity_percentage || 0,
                                  complianceStatus: startup.complianceStatus,
                                  videoUrl: startup.videoUrl,
                                  logoUrl: startup.logoUrl,
                                  description: startup.description,
                                  currentValuation: rec.startup_valuation || startup.currentValuation || 0
                                };
                                setSelectedOpportunity(activeStartup);
                                setIsOfferModalOpen(true);
                              } else {
                                alert('Startup details not found locally. Please open the startup from Discover and try again.');
                              }
                            }}
                          >
                            <PlusCircle className="h-4 w-4 mr-1" />
                            Make Offer
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
              <div className="text-center py-12">
                <Star className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-800 mb-2">No Recommendations Yet</h3>
                <p className="text-slate-500">
                  When your Investment Advisor recommends startups to you, they will appear here.
                </p>
              </div>
              )}
            </div>
          </Card>
          
          {/* Co-Investment Opportunities Table */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-700 flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Co-Investment Opportunities
              <span className="text-sm font-normal text-slate-500">
                {currentUser?.investment_advisor_code ? '(Approved by your Investment Advisor)' : '(All available opportunities)'}
              </span>
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Startup Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sector</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Investment Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Recommended By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date Recommended</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {recommendedOpportunities.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-slate-500">
                        No co-investment opportunities available yet
                      </td>
                    </tr>
                  ) : (
                    recommendedOpportunities.map((opportunity) => (
                      <tr key={opportunity.recommendation_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {opportunity.startup_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {opportunity.sector}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {opportunity.compliance_status}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {formatCurrency(opportunity.investment_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {opportunity.advisor_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {new Date(opportunity.recommended_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                // TODO: Implement due diligence request
                                alert('Due diligence request functionality coming soon!');
                              }}
                              className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
                            >
                              Due Diligence
                            </button>
                            <button
                              onClick={() => {
                                // Set the selected opportunity and open the offer modal
                                setSelectedOpportunity({
                                  id: opportunity.opportunity_id,
                                  name: opportunity.startup_name,
                                  investmentValue: opportunity.investment_amount,
                                  equityAllocation: opportunity.equity_percentage,
                                  totalFunding: opportunity.investment_amount
                                });
                                setIsOfferModalOpen(true);
                              }}
                              className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full hover:bg-green-200"
                            >
                              Make Offer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

       <Modal 
            isOpen={isOfferModalOpen} 
            onClose={() => {
                setIsOfferModalOpen(false);
                setSelectedCurrency('INR');
            }} 
            title={`Make an Offer for ${selectedOpportunity?.name}`}
        >
            <form onSubmit={handleOfferSubmit} className="space-y-4">
                <p className="text-sm text-slate-600">
                    You are making an offer for <span className="font-semibold">{selectedOpportunity?.name}</span>. 
                    The current ask is <span className="font-semibold">{investorService.formatCurrency(selectedOpportunity?.investmentValue || 0)}</span> for <span className="font-semibold">{selectedOpportunity?.equityAllocation}%</span> equity.
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
                
                {/* Co-investment option */}
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
                
                {/* Scouting fee information removed */}
                
                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={() => {
                        setIsOfferModalOpen(false);
                        setSelectedCurrency('INR');
                        setWantsCoInvestment(false);
                    }}>Cancel</Button>
                    <Button type="submit">Submit Offer</Button>
                </div>
            </form>
        </Modal>

        {/* Edit Offer Modal */}
        <Modal 
            isOpen={isEditOfferModalOpen} 
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
