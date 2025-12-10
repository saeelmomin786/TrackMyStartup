import React, { useEffect, useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { ArrowLeft, Share2, MapPin, DollarSign, Building2, Globe, Linkedin, Mail, Video, Image as ImageIcon, Send, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { messageService } from '../lib/messageService';
import { getQueryParam } from '../lib/urlState';
import { authService, AuthUser } from '../lib/auth';
import { getVideoEmbedUrl } from '../lib/videoUtils';
import LogoTMS from './public/logoTMS.svg';
import InvestorCard from './investor/InvestorCard';
import { investorConnectionRequestService } from '../lib/investorConnectionRequestService';

interface InvestorProfile {
  id?: string;
  user_id: string;
  firm_type?: string;
  global_hq?: string;
  investor_name?: string;
  website?: string;
  linkedin_link?: string;
  email?: string;
  geography?: string[];
  ticket_size_min?: number;
  ticket_size_max?: number;
  currency?: string;
  investment_stages?: string[];
  investment_thesis?: string;
  logo_url?: string;
  video_url?: string;
  media_type?: 'logo' | 'video';
  user?: {
    name?: string;
    email?: string;
  };
}

const PublicInvestorPage: React.FC = () => {
  const [investor, setInvestor] = useState<InvestorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [totalStartupsInvested, setTotalStartupsInvested] = useState<number>(0);

  const investorId = getQueryParam('investorId');
  const userId = getQueryParam('userId');

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        const authenticated = await authService.isAuthenticated();
        setIsAuthenticated(authenticated);
        if (authenticated) {
          const user = await authService.getCurrentUser();
          setCurrentUser(user);
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        checkAuth();
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load investor profile
  useEffect(() => {
    if (!investorId && !userId) {
      setError('Investor ID is required');
      setLoading(false);
      return;
    }

    const loadInvestor = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load investor profile
        let query = supabase
          .from('investor_profiles')
          .select('*');

        if (investorId) {
          query = query.eq('id', investorId);
        } else if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data: investorData, error: investorError } = await query.single();

        if (investorError) {
          console.error('Error loading investor:', investorError);
          throw new Error(investorError.message || 'Investor not found');
        }

        if (!investorData) {
          throw new Error('Investor not found');
        }

        setInvestor(investorData as InvestorProfile);

        // Load user info if available
        if (investorData.user_id) {
          const { data: userData } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id', investorData.user_id)
            .single();

          if (userData) {
            setInvestor(prev => ({
              ...prev,
              user: {
                name: userData.name,
                email: userData.email
              }
            }));
          }
        }

        // Load number of startups invested
        if (investorData.user_id) {
          try {
            // Count investor-added startups
            const { count: addedCount } = await supabase
              .from('investor_added_startups')
              .select('*', { count: 'exact', head: true })
              .eq('investor_id', investorData.user_id);

            // Get user's investor code from users table
            const { data: userData } = await supabase
              .from('users')
              .select('investor_code')
              .eq('id', investorData.user_id)
              .single();

            let investmentCount = 0;
            if (userData?.investor_code) {
              // Count unique startups from investment records
              const { data: investments } = await supabase
                .from('investment_records')
                .select('startup_id')
                .eq('investor_code', userData.investor_code);

              if (investments) {
                // Count unique startup IDs
                const uniqueStartups = new Set(investments.map(inv => inv.startup_id));
                investmentCount = uniqueStartups.size;
              }
            }

            const total = (addedCount || 0) + investmentCount;
            setTotalStartupsInvested(total);
          } catch (err) {
            console.error('Error loading startups count:', err);
            setTotalStartupsInvested(0);
          }
        }
      } catch (err: any) {
        console.error('Error loading investor profile:', err);
        setError(err.message || 'Failed to load investor profile');
      } finally {
        setLoading(false);
      }
    };

    loadInvestor();
  }, [investorId, userId, isAuthenticated]);

  const handleShare = async () => {
    if (!investor) return;

    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('view', 'investor');
    if (investor.id) {
      url.searchParams.set('investorId', investor.id);
    } else if (investor.user_id) {
      url.searchParams.set('userId', investor.user_id);
    }
    const shareUrl = url.toString();
    
    const formatCurrency = (value?: number) => {
      if (!value) return 'N/A';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 0
      }).format(value);
    };

    const shareText = `Investor: ${investor.investor_name || 'Investor'}\nFirm Type: ${investor.firm_type || 'N/A'}\nLocation: ${investor.global_hq || 'N/A'}\nInvestment Range: ${investor.ticket_size_min && investor.ticket_size_max ? `${formatCurrency(investor.ticket_size_min)} - ${formatCurrency(investor.ticket_size_max)}` : 'N/A'}\n\nView investor profile: ${shareUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: investor.investor_name || 'Investor Profile',
          text: shareText,
          url: shareUrl,
        });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        messageService.success('Link Copied', 'Investor profile link copied to clipboard!', 2000);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        messageService.success('Link Copied', 'Investor profile link copied to clipboard!', 2000);
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const handleConnect = async () => {
    if (!isAuthenticated) {
      // Save current URL to redirect back after login
      const currentUrl = window.location.href;
      sessionStorage.setItem('redirectAfterLogin', currentUrl);
      
      // Redirect to login page
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.delete('view');
      url.searchParams.delete('investorId');
      url.searchParams.delete('userId');
      url.searchParams.set('page', 'login');
      window.location.href = url.toString();
      return;
    }

    // Check if user is Investment Advisor
    if (currentUser?.role === 'Investment Advisor') {
      // Create connection request for Investment Advisor
      try {
        const advisorProfileUrl = window.location.origin + window.location.pathname + `?view=investor&userId=${currentUser.id}`;
        await investorConnectionRequestService.createRequest({
          investor_id: investor.user_id,
          requester_id: currentUser.id,
          requester_type: 'Investment Advisor',
          advisor_profile_url: advisorProfileUrl
          // No message field - will be undefined/null
        });
        messageService.success('Request Sent', 'Connection request sent successfully!', 2000);
      } catch (error) {
        console.error('Error creating connection request:', error);
        messageService.error('Error', 'Failed to send connection request. Please try again.', 3000);
      }
    } else {
      // For other roles, just open email
      if (investor.email) {
        window.location.href = `mailto:${investor.email}`;
      } else {
        messageService.info('No Email', 'Contact email is not available for this investor.', 3000);
      }
    }
  };

  const handleApproach = async () => {
    if (!isAuthenticated) {
      // Save current URL to redirect back after login
      const currentUrl = window.location.href;
      sessionStorage.setItem('redirectAfterLogin', currentUrl);
      
      // Redirect to login page
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.delete('view');
      url.searchParams.delete('investorId');
      url.searchParams.delete('userId');
      url.searchParams.set('page', 'login');
      window.location.href = url.toString();
      return;
    }

    // Check if user is a startup
    if (currentUser?.role !== 'Startup') {
      messageService.error('Access Restricted', 'Only startups can approach investors. Please log in with a Startup account.', 3000);
      return;
    }

    // Get user's startup
    const { data: userStartups } = await supabase
      .from('startups')
      .select('id, name')
      .eq('user_id', currentUser.id)
      .limit(1);

    if (!userStartups || userStartups.length === 0) {
      messageService.error('No Startup Found', 'Please create a startup profile first.', 3000);
      return;
    }

    const startup = userStartups[0];
    
    // Create shareable startup link
    const startupUrl = new URL(window.location.origin + window.location.pathname);
    startupUrl.searchParams.set('view', 'startup');
    startupUrl.searchParams.set('startupId', String(startup.id));
    const shareUrl = startupUrl.toString();

    // Create connection request in database
    try {
      await investorConnectionRequestService.createRequest({
        investor_id: investor.user_id,
        requester_id: currentUser.id,
        requester_type: 'Startup',
        startup_id: startup.id,
        startup_profile_url: shareUrl
        // No message field - will be undefined/null, so no default message is sent
      });
    } catch (err) {
      console.error('Error creating connection request:', err);
    }

    // Share startup profile with investor
    const shareText = `View my startup profile: ${shareUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${startup.name} - Investment Opportunity`,
          text: shareText,
          url: shareUrl,
        });
        messageService.success('Shared', 'Startup profile shared successfully! Pitch request sent.', 2000);
      } else if (investor.email) {
        // Fallback: open email client
        const subject = encodeURIComponent(`Investment Opportunity - ${startup.name}`);
        const body = encodeURIComponent(shareText);
        window.location.href = `mailto:${investor.email}?subject=${subject}&body=${body}`;
        messageService.success('Shared', 'Pitch request sent!', 2000);
      } else {
        // Copy to clipboard
        await navigator.clipboard.writeText(shareText);
        messageService.success('Copied', 'Startup profile link copied to clipboard! Pitch request sent.', 2000);
      }
    } catch (err) {
      console.error('Error sharing startup:', err);
      if (err instanceof Error && err.name !== 'AbortError') {
        messageService.error('Error', 'Failed to share startup profile. Please try again.', 3000);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading investor profile...</p>
        </div>
      </div>
    );
  }

  if (error || !investor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <div className="text-center py-8">
            <Building2 className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Investor Not Found</h2>
            <p className="text-slate-600 mb-6">{error || 'The investor profile you are looking for does not exist or has been removed.'}</p>
            <Button
              variant="primary"
              onClick={() => {
                window.location.href = '/';
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Homepage
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = '/'}
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <img src={LogoTMS} alt="Track My Startup" className="h-8" />
            </div>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center">
          <div className="w-full max-w-2xl">
            <InvestorCard
              investor={investor}
              onView={undefined}
              totalStartupsInvested={totalStartupsInvested}
              isPublicPage={true}
              isAuthenticated={isAuthenticated}
              currentUser={currentUser}
              onConnect={handleConnect}
              onApproach={handleApproach}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicInvestorPage;

