import React, { useEffect, useRef, useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { ArrowLeft, Share2, Building2, TrendingUp, DollarSign, Users, FileText, Video, ExternalLink, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { messageService } from '../lib/messageService';
import { Startup, FundraisingDetails, ComplianceStatus, InvestmentType } from '../types';
import { formatCurrency } from '../lib/utils';
import { getQueryParam, setQueryParam } from '../lib/urlState';
import { capTableService } from '../lib/capTableService';
import { toDirectImageUrl } from '../lib/imageUrl';
import { authService, AuthUser } from '../lib/auth';
import { paymentService } from '../lib/paymentService';
import { investorService, ActiveFundraisingStartup } from '../lib/investorService';
import LogoTMS from './public/logoTMS.svg';
import html2canvas from 'html2canvas';

const PublicStartupPage: React.FC = () => {
  const [startup, setStartup] = useState<Startup | null>(null);
  const [fundraisingDetails, setFundraisingDetails] = useState<FundraisingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasDueDiligenceAccess, setHasDueDiligenceAccess] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const startupId = getQueryParam('startupId') || getQueryParam('id');

  const buildShareUrl = () => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('view', 'startup');
    url.searchParams.set('startupId', String(startup?.id || startupId || ''));
    return url.toString();
  };

  const updateMetaTag = (key: 'name' | 'property', id: string, content: string) => {
    if (!content) return;
    let tag = document.head.querySelector(`meta[${key}="${id}"]`) as HTMLMetaElement | null;
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(key, id);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };

  // Best-effort: keep OG/Twitter tags in sync so shares have a card preview where crawlers allow JS-rendered head updates
  useEffect(() => {
    if (!startup) return;
    const title = startup.name ? `${startup.name} | TrackMyStartup` : 'TrackMyStartup';
    const description = (fundraisingDetails as any)?.onePagerOneLiner
      ? (fundraisingDetails as any).onePagerOneLiner
      : (startup as any)?.description || `Discover ${startup.name || 'this startup'} on TrackMyStartup`;
    const shareUrl = buildShareUrl();
    const fallbackImg = new URL(LogoTMS, window.location.origin).toString();
    
    // Extract YouTube video ID and use thumbnail as OG image (priority: YouTube thumbnail > Logo > Default)
    const getYoutubeVideoId = (url?: string): string | null => {
      if (!url) return null;
      try {
        if (url.includes('youtube.com/watch')) {
          const urlObj = new URL(url);
          return urlObj.searchParams.get('v');
        }
        if (url.includes('youtu.be/')) {
          const urlObj = new URL(url);
          return urlObj.pathname.slice(1).split('?')[0];
        }
        if (url.includes('youtube.com/embed/')) {
          const match = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
          return match ? match[1] : null;
        }
        if (url.includes('youtube.com/shorts/')) {
          const match = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
          return match ? match[1] : null;
        }
      } catch {
        return null;
      }
      return null;
    };

    let image = fallbackImg;
    const videoId = getYoutubeVideoId((fundraisingDetails as any)?.pitchVideoUrl);
    if (videoId) {
      // Use YouTube thumbnail (maxresdefault.jpg is highest quality, 1280x720)
      image = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    } else if ((startup as any)?.logo_url) {
      image = toDirectImageUrl((startup as any).logo_url) || fallbackImg;
    }

    document.title = title;
    updateMetaTag('property', 'og:type', 'website');
    updateMetaTag('property', 'og:title', title);
    updateMetaTag('property', 'og:description', description);
    updateMetaTag('property', 'og:image', image);
    updateMetaTag('property', 'og:url', shareUrl);
    updateMetaTag('name', 'twitter:card', 'summary_large_image');
    updateMetaTag('name', 'twitter:title', title);
    updateMetaTag('name', 'twitter:description', description);
    updateMetaTag('name', 'twitter:image', image);
  }, [startup, fundraisingDetails]);

  // Check authentication - re-check when URL changes or component mounts
  // Also check periodically to catch auth state changes from App.tsx
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Wait a bit for App.tsx to finish auth initialization
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const authenticated = await authService.isAuthenticated();
        setIsAuthenticated(authenticated);
        if (authenticated) {
          const user = await authService.getCurrentUser();
          setCurrentUser(user);
          console.log('✅ PublicStartupPage: User authenticated as', user?.role, user?.email);
        } else {
          console.log('ℹ️ PublicStartupPage: User not authenticated');
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        setIsAuthenticated(false);
      }
    };
    
    // Initial check
    checkAuth();
    
    // Re-check after a delay to catch auth initialization from App.tsx
    const delayedCheck = setTimeout(() => {
      checkAuth();
    }, 500);
    
    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 PublicStartupPage: Auth state changed', event, session?.user?.email);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        checkAuth();
      }
    });
    
    // Also check periodically (every 1 second) to catch auth state from App.tsx
    const intervalId = setInterval(() => {
      checkAuth();
    }, 1000);
    
    return () => {
      clearTimeout(delayedCheck);
      clearInterval(intervalId);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!startupId) {
      setError('Startup ID is required');
      setLoading(false);
      return;
    }

    const loadStartup = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check authentication status at load time
        const authStatus = await authService.isAuthenticated();
        const currentAuthUser = authStatus ? await authService.getCurrentUser() : null;
        const isUserAuthenticated = !!currentAuthUser;

        // Load startup data - use public view if not authenticated, full table if authenticated
        // Public view only exposes: id, name, sector, current_valuation, currency, compliance_status
        // Note: pitch_video_url is in fundraising_details, not startups table
        const tableName = isUserAuthenticated ? 'startups' : 'startups_public';
        const { data: startupData, error: startupError } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', startupId)
          .single();

        if (startupError) {
          console.error('Error loading startup:', startupError);
          // Check if it's an RLS/permission error
          if (startupError.code === '42501' || startupError.message?.includes('permission') || startupError.message?.includes('policy')) {
            throw new Error('Access denied. Please ensure RLS policies allow public read access to startups table.');
          }
          throw new Error(startupError.message || 'Startup not found');
        }

        if (!startupData) {
          throw new Error('Startup not found');
        }

        setStartup(startupData as Startup);

        // Load fundraising details if available (load latest, even if not active)
        try {
          // Use public view if not authenticated, direct query if authenticated
          const fundraisingTableName = isUserAuthenticated ? 'fundraising_details' : 'fundraising_details_public';
          const { data: fundraisingData, error: fundraisingError } = await supabase
            .from(fundraisingTableName)
            .select('*')
            .eq('startup_id', (startupData as any).id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (!fundraisingError && fundraisingData && (fundraisingData as any[]).length > 0) {
            const fd = (fundraisingData as any[])[0] as any;
            // Map to FundraisingDetails format
            // Note: domain and validationRequested are not in public view, so they'll be undefined
            setFundraisingDetails({
              active: fd.active,
              type: fd.type,
              value: fd.value,
              equity: fd.equity,
              stage: fd.stage,
              domain: fd.domain || undefined, // May not be in public view
              validationRequested: fd.validation_requested || false, // May not be in public view
              pitchDeckUrl: fd.pitch_deck_url,
              pitchVideoUrl: fd.pitch_video_url
            });
          }
        } catch (e: any) {
          console.log('No fundraising details found - will show basic startup info', e);
          // Log RLS errors for debugging
          if (e?.code === '42501' || e?.message?.includes('permission') || e?.message?.includes('policy')) {
            console.warn('RLS policy may be blocking fundraising_details access for anonymous users');
          }
        }
      } catch (err: any) {
        console.error('Error loading startup:', err);
        setError(err?.message || 'Failed to load startup details');
        messageService.error('Startup Not Found', 'This startup may have been removed or is no longer available.');
      } finally {
        setLoading(false);
      }
    };

    loadStartup();
  }, [startupId, isAuthenticated]);

  // Check due diligence access when authenticated and startup is loaded
  useEffect(() => {
    const checkDueDiligence = async () => {
      if (isAuthenticated && currentUser?.id && startup?.id) {
        try {
          const hasAccess = await paymentService.hasApprovedDueDiligence(currentUser.id, String(startup.id));
          setHasDueDiligenceAccess(hasAccess);
        } catch (e) {
          console.error('Error checking due diligence access:', e);
        }
      }
    };
    checkDueDiligence();
  }, [isAuthenticated, currentUser?.id, startup?.id]);

  const handleShare = async () => {
    if (!startup) return;

    const shareUrl = buildShareUrl();
    // Format matches WhatsApp share format exactly as shown in image
    const details = `Startup: ${startup.name || 'N/A'}\nSector: ${startup.sector || 'N/A'}\nValuation: ${formatCurrency(startup.current_valuation || 0, startup.currency || 'INR')}\n\nView startup: ${shareUrl}`;

    try {
      // PRIORITY: Share as URL first - this creates a clickable link preview card
      // When someone clicks the preview, it opens in browser (Chrome)
      // WhatsApp and other apps will fetch OG tags and show a nice card preview
      if (navigator.share) {
        const shareData: ShareData = {
          title: startup.name || 'Startup Profile',
          text: details,
          url: shareUrl, // URL is primary - creates clickable preview
        };
        await navigator.share(shareData);
        messageService.success('Shared', 'Link shared! Click the preview to open in browser.', 2000);
        return;
      }

      // Fallback: Copy URL to clipboard (user can paste in WhatsApp)
      // When they paste the URL, WhatsApp will show a clickable preview card
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        messageService.success('Link Copied', 'Startup link copied! Paste in WhatsApp to share with preview card.', 2000);
      } else {
        // Final fallback
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        messageService.success('Link Copied', 'Startup link copied! Paste in WhatsApp to share.', 2000);
      }
    } catch (err) {
      console.error('Error sharing:', err);
      // Final fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        messageService.success('Link Copied', 'Startup link copied to clipboard!', 2000);
      } catch (clipErr) {
        messageService.error('Share Failed', 'Unable to share. Please copy the link manually.');
      }
    }
  };

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

  const handleMakeOffer = async () => {
    console.log('🔍 handleMakeOffer called', { isAuthenticated, currentUser: currentUser?.role, startupId: startup?.id });
    
    // Double-check authentication status before proceeding
    const authCheck = await authService.isAuthenticated();
    const currentAuthUser = authCheck ? await authService.getCurrentUser() : null;
    
    // Check if user is Startup role - they cannot make offers
    if (currentAuthUser?.role === 'Startup' || currentUser?.role === 'Startup') {
      messageService.error('Access Restricted', 'Please login as investor to view due diligence or make offer.', 4000);
      return;
    }
    
    if (!authCheck || !currentAuthUser) {
      // Show message and redirect to login page immediately
      messageService.error('Login Required', 'You must be logged in to make an offer. Please log in to continue.', 3000);
      // Store the current URL to redirect back after login (preserve the startup card view)
      const currentUrl = window.location.href;
      sessionStorage.setItem('redirectAfterLogin', currentUrl);
      // Redirect to login page immediately (remove page=landing if present to avoid conflicts)
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.delete('view');
      url.searchParams.delete('startupId');
      url.searchParams.delete('id');
      url.searchParams.set('page', 'login');
      window.location.href = url.toString();
      return;
    }

    // Check if user is Investor or Investment Advisor
    if (currentUser?.role !== 'Investor' && currentUser?.role !== 'Investment Advisor') {
      messageService.error('Access Restricted', 'Only Investors and Investment Advisors can make offers. Please log in with an Investor or Investment Advisor account.', 3000);
      // Store the current URL to redirect back after login (preserve the startup card view)
      const currentUrl = window.location.href;
      sessionStorage.setItem('redirectAfterLogin', currentUrl);
      // Redirect to login page (remove page=landing if present to avoid conflicts)
      const url = new URL(window.location.href);
      url.searchParams.delete('page');
      url.searchParams.set('page', 'login');
      window.location.href = url.toString();
      return;
    }

    if (!startup?.id) {
      console.log('❌ No startup ID available');
      messageService.error('Error', 'Startup information not available. Please refresh the page.', 3000);
      return;
    }

    console.log('✅ Redirecting to investor view with make offer modal for startup:', startup.id);
    // Redirect to investor view with make offer modal
    // Remove public startup page params and set investor view params
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.delete('view');
    url.searchParams.delete('startupId');
    url.searchParams.delete('id');
    url.searchParams.delete('page');
    url.searchParams.set('view', 'investor');
    url.searchParams.set('tab', 'reels');
    url.searchParams.set('pitchId', String(startup.id));
    url.searchParams.set('makeOffer', 'true');
    window.location.href = url.toString();
  };

  const handleDueDiligence = async () => {
    console.log('🔍 handleDueDiligence called', { isAuthenticated, currentUser: currentUser?.role, currentUserId: currentUser?.id, startupId: startup?.id, hasDueDiligenceAccess });
    
    // Double-check authentication status before proceeding
    const authCheck = await authService.isAuthenticated();
    const currentAuthUser = authCheck ? await authService.getCurrentUser() : null;
    
    // Check if user is Startup role - they cannot access due diligence
    if (currentAuthUser?.role === 'Startup' || currentUser?.role === 'Startup') {
      messageService.error('Access Restricted', 'Please login as investor to view due diligence or make offer.', 4000);
      return;
    }
    
    if (!authCheck || !currentAuthUser?.id) {
      // Show message and redirect to login page immediately
      messageService.error('Login Required', 'You must be logged in to request due diligence access. Please log in to continue.', 3000);
      // Store the current URL to redirect back after login (preserve the startup card view)
      const currentUrl = window.location.href;
      sessionStorage.setItem('redirectAfterLogin', currentUrl);
      // Redirect to login page immediately (remove page=landing if present to avoid conflicts)
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.delete('view');
      url.searchParams.delete('startupId');
      url.searchParams.delete('id');
      url.searchParams.set('page', 'login');
      window.location.href = url.toString();
      return;
    }

    // Use the freshly checked auth user
    const user = currentAuthUser || currentUser;
    
    // Check if user is Investor or Investment Advisor
    if (user?.role !== 'Investor' && user?.role !== 'Investment Advisor') {
      console.log('❌ User role not allowed for due diligence:', user?.role);
      messageService.error('Access Restricted', 'Only Investors and Investment Advisors can request due diligence. Please log in with an Investor or Investment Advisor account.', 3000);
      // Store the current URL to redirect back after login (preserve the startup card view)
      const currentUrl = window.location.href;
      sessionStorage.setItem('redirectAfterLogin', currentUrl);
      // Redirect to login page (remove page=landing if present to avoid conflicts)
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.delete('view');
      url.searchParams.delete('startupId');
      url.searchParams.delete('id');
      url.searchParams.set('page', 'login');
      window.location.href = url.toString();
      return;
    }

    if (!startup?.id) {
      console.log('❌ No startup ID available for due diligence');
      messageService.error('Error', 'Startup information not available. Please refresh the page.', 3000);
      return;
    }
    
    console.log('✅ Processing due diligence request for startup:', startup.id);

    try {
      // Check due diligence access with the authenticated user
      const hasAccess = await paymentService.hasApprovedDueDiligence(user.id, String(startup.id));
      
      // If already approved, redirect to dashboard
      if (hasAccess) {
        // Remove public startup page params and set investor view params
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.delete('view');
        url.searchParams.delete('startupId');
        url.searchParams.delete('id');
        url.searchParams.delete('page');
        url.searchParams.set('view', 'investor');
        url.searchParams.set('startupId', String(startup.id));
        url.searchParams.set('tab', 'dashboard');
        window.location.href = url.toString();
        return;
      }

      // Create pending request
      await paymentService.createPendingDueDiligenceIfNeeded(user.id, String(startup.id));
      messageService.success('Request Sent', 'Due diligence request sent to the startup. You will gain access once the startup accepts.', 4000);
    } catch (e: any) {
      console.error('Due diligence request failed:', e);
      messageService.error('Request Failed', 'Failed to send due diligence request. Please try again.', 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              <img 
                src={LogoTMS} 
                alt="TrackMyStartup" 
                className="h-7 w-7 sm:h-8 sm:w-8 scale-[5] sm:scale-[5] origin-left cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={() => {
                  const url = new URL(window.location.origin + window.location.pathname);
                  url.searchParams.delete('view');
                  url.searchParams.delete('startupId');
                  url.searchParams.delete('id');
                  url.searchParams.set('page', 'landing');
                  window.location.href = url.toString();
                }}
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {!isAuthenticated ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const url = new URL(window.location.origin + window.location.pathname);
                      url.searchParams.delete('view');
                      url.searchParams.delete('startupId');
                      url.searchParams.delete('id');
                      url.searchParams.set('page', 'login');
                      window.location.href = url.toString();
                    }}
                    className="hidden sm:inline-flex"
                  >
                    Login
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={() => {
                      const url = new URL(window.location.origin + window.location.pathname);
                      url.searchParams.delete('view');
                      url.searchParams.delete('startupId');
                      url.searchParams.delete('id');
                      url.searchParams.set('page', 'register');
                      window.location.href = url.toString();
                    }}
                    className="px-3 py-1.5"
                  >
                    Get Started
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const url = new URL(window.location.origin + window.location.pathname);
                    url.searchParams.delete('view');
                    url.searchParams.delete('startupId');
                    url.searchParams.delete('id');
                    url.searchParams.set('page', 'login');
                    window.location.href = url.toString();
                  }}
                  className="flex items-center gap-2"
                >
                  Dashboard
                </Button>
              )}
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="inline-block h-6 w-6 border-2 border-b-transparent border-slate-400 rounded-full animate-spin" />
            Loading startup details...
          </div>
        </div>
      </div>
    );
  }

  if (error || !startup) {
    return (
      <div className="min-h-screen bg-slate-100">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              <img 
                src={LogoTMS} 
                alt="TrackMyStartup" 
                className="h-7 w-7 sm:h-8 sm:w-8 scale-[5] sm:scale-[5] origin-left cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={() => {
                  const url = new URL(window.location.origin + window.location.pathname);
                  url.searchParams.delete('view');
                  url.searchParams.delete('startupId');
                  url.searchParams.delete('id');
                  url.searchParams.set('page', 'landing');
                  window.location.href = url.toString();
                }}
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {!isAuthenticated ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const url = new URL(window.location.origin + window.location.pathname);
                      url.searchParams.delete('view');
                      url.searchParams.delete('startupId');
                      url.searchParams.delete('id');
                      url.searchParams.set('page', 'login');
                      window.location.href = url.toString();
                    }}
                    className="hidden sm:inline-flex"
                  >
                    Login
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={() => {
                      const url = new URL(window.location.origin + window.location.pathname);
                      url.searchParams.delete('view');
                      url.searchParams.delete('startupId');
                      url.searchParams.delete('id');
                      url.searchParams.set('page', 'register');
                      window.location.href = url.toString();
                    }}
                    className="px-3 py-1.5"
                  >
                    Get Started
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const url = new URL(window.location.origin + window.location.pathname);
                    url.searchParams.delete('view');
                    url.searchParams.delete('startupId');
                    url.searchParams.delete('id');
                    url.searchParams.set('page', 'login');
                    window.location.href = url.toString();
                  }}
                  className="flex items-center gap-2"
                >
                  Dashboard
                </Button>
              )}
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="p-8 text-center max-w-md">
            <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Startup Not Found</h2>
            <p className="text-slate-600 mb-4">{error || 'This startup may have been removed or is no longer available.'}</p>
            <Button onClick={() => {
              const url = new URL(window.location.origin + window.location.pathname);
              url.searchParams.delete('view');
              url.searchParams.delete('startupId');
              url.searchParams.delete('id');
              url.searchParams.set('page', 'landing');
              window.location.href = url.toString();
            }} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Home
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Pitch video URL comes from fundraising_details, not startups table
  const videoEmbedUrl = fundraisingDetails?.pitchVideoUrl
    ? getYoutubeEmbedUrl(fundraisingDetails.pitchVideoUrl)
    : null;

  // Convert to ActiveFundraisingStartup format for compatibility
  const activeFundraisingStartup: ActiveFundraisingStartup | null = startup && fundraisingDetails ? {
    id: startup.id,
    name: startup.name,
    sector: startup.sector || fundraisingDetails?.domain || 'Not specified',
    investmentValue: fundraisingDetails?.value || 0,
    equityAllocation: fundraisingDetails?.equity || 0,
    complianceStatus: startup.compliance_status as ComplianceStatus,
    pitchDeckUrl: fundraisingDetails?.pitchDeckUrl || undefined,
    pitchVideoUrl: fundraisingDetails?.pitchVideoUrl || undefined,
    fundraisingType: fundraisingDetails?.type || InvestmentType.Seed,
    description: startup.description || undefined,
    createdAt: startup.created_at || new Date().toISOString(),
    fundraisingId: '', // Not needed for public view
    isStartupNationValidated: startup.compliance_status === 'Compliant',
    validationDate: undefined,
    currency: startup.currency || 'INR',
  } : null;

  // Show startup card even if fundraising is not active - just show basic info
  const hasActiveFundraising = fundraisingDetails && fundraisingDetails.active;
  const hasFundraisingDetails = fundraisingDetails && (fundraisingDetails.value > 0 || fundraisingDetails.equity > 0);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src={LogoTMS} 
              alt="TrackMyStartup" 
              className="h-7 w-7 sm:h-8 sm:w-8 scale-[5] sm:scale-[5] origin-left cursor-pointer hover:opacity-80 transition-opacity" 
              onClick={() => {
                const url = new URL(window.location.origin + window.location.pathname);
                url.searchParams.delete('view');
                url.searchParams.delete('startupId');
                url.searchParams.delete('id');
                url.searchParams.set('page', 'landing');
                window.location.href = url.toString();
              }}
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {!isAuthenticated ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const url = new URL(window.location.origin + window.location.pathname);
                    url.searchParams.delete('view');
                    url.searchParams.delete('startupId');
                    url.searchParams.delete('id');
                    url.searchParams.set('page', 'login');
                    window.location.href = url.toString();
                  }}
                  className="hidden sm:inline-flex"
                >
                  Login
                </Button>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => {
                    const url = new URL(window.location.origin + window.location.pathname);
                    url.searchParams.delete('view');
                    url.searchParams.delete('startupId');
                    url.searchParams.delete('id');
                    url.searchParams.set('page', 'register');
                    window.location.href = url.toString();
                  }}
                  className="px-3 py-1.5"
                >
                  Get Started
                </Button>
              </>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const url = new URL(window.location.origin + window.location.pathname);
                  url.searchParams.delete('view');
                  url.searchParams.delete('startupId');
                  url.searchParams.delete('id');
                  url.searchParams.set('page', 'login');
                  window.location.href = url.toString();
                }}
                className="flex items-center gap-2"
              >
                Dashboard
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Back row */}
        <div className="flex mb-6">
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Discover Page Style Card */}
        <div ref={shareCardRef}>
        <Card className="!p-0 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-white">
          {/* Video Section */}
          <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {videoEmbedUrl ? (
              <div className="relative w-full h-full">
                <iframe
                  src={videoEmbedUrl}
                  title={`Pitch video for ${startup?.name}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full"
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <Video className="h-16 w-16 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No video available</p>
                </div>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">{startup?.name}</h3>
                <p className="text-slate-600 font-medium mb-2">{startup?.sector || fundraisingDetails?.domain || 'Not specified'}</p>
                {(fundraisingDetails?.type || fundraisingDetails?.stage) && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {fundraisingDetails?.type && (
                      <span className="text-slate-500">
                        <span className="font-medium text-slate-700">Round:</span> {fundraisingDetails?.type}
                      </span>
                    )}
                    {fundraisingDetails?.stage && (
                      <>
                        {fundraisingDetails?.type && <span className="text-slate-300">•</span>}
                        <span className="text-slate-500">
                          <span className="font-medium text-slate-700">Stage:</span> {fundraisingDetails?.stage}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {fundraisingDetails?.active && (
                  <div className="flex items-center gap-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
                    <CheckCircle className="h-3 w-3" />
                    Active
                  </div>
                )}
                {startup?.compliance_status === 'Compliant' && (
                  <div className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <Button
                size="sm"
                variant="outline"
                onClick={handleShare}
                className="!rounded-full !p-3 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all duration-200 border border-slate-200 self-start sm:self-auto"
              >
                <Share2 className="h-5 w-5" />
              </Button>

              {fundraisingDetails?.pitchDeckUrl && fundraisingDetails?.pitchDeckUrl !== '#' && (
                <a
                  href={fundraisingDetails?.pitchDeckUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 border border-slate-200"
                  >
                    <FileText className="h-4 w-4 mr-2" /> View Deck
                  </Button>
                </a>
              )}

              {/* Due Diligence Button - Always visible, redirects to login if needed */}
              <button
                onClick={handleDueDiligence}
                disabled={currentUser?.role === 'Startup'}
                className={`flex-1 transition-all duration-200 border px-3 py-2 rounded-lg text-sm font-medium text-center ${
                  currentUser?.role === 'Startup'
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                    : isAuthenticated && hasDueDiligenceAccess
                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700'
                    : 'hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300 border-slate-200 bg-white'
                }`}
                title={currentUser?.role === 'Startup' ? 'Please login as investor to view due diligence or make offer' : ''}
              >
                <svg className="h-4 w-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {isAuthenticated && hasDueDiligenceAccess ? 'Due Diligence Accepted' : 'Due Diligence'}
              </button>

              {/* Make Offer Button - Always visible, redirects to login if needed */}
              <Button
                size="sm"
                variant="primary"
                onClick={handleMakeOffer}
                disabled={currentUser?.role === 'Startup'}
                className={`flex-1 min-w-[140px] transition-all duration-200 text-xs sm:text-sm text-center ${
                  currentUser?.role === 'Startup'
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60 shadow-none'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-200'
                }`}
                title={currentUser?.role === 'Startup' ? 'Please login as investor to view due diligence or make offer' : ''}
              >
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Make </span>Offer
              </Button>
            </div>
          </div>

          {/* Investment Details Footer - Only show if fundraising details exist */}
          {hasFundraisingDetails && (
            <div className="bg-gradient-to-r from-slate-50 to-purple-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 border-t border-slate-200">
              <div className="text-sm sm:text-base">
                <span className="font-semibold text-slate-800">Ask:</span> {formatCurrency(fundraisingDetails?.value || 0, startup?.currency || 'INR')} for <span className="font-semibold text-purple-600">{fundraisingDetails?.equity || 0}%</span> equity
              </div>
              {startup?.compliance_status === 'Compliant' && (
                <div className="flex items-center gap-1 text-green-600" title="This startup has been verified">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs font-semibold">Verified</span>
                </div>
              )}
            </div>
          )}
          
          {/* Basic Info Footer - Show if no fundraising details */}
          {!hasFundraisingDetails && (
            <div className="bg-gradient-to-r from-slate-50 to-purple-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 border-t border-slate-200">
              <div className="text-sm sm:text-base text-slate-600">
                {startup?.current_valuation ? (
                  <>Valuation: <span className="font-semibold text-slate-800">{formatCurrency(startup.current_valuation, startup.currency || 'INR')}</span></>
                ) : (
                  <span>Startup Profile</span>
                )}
              </div>
              {startup?.compliance_status === 'Compliant' && (
                <div className="flex items-center gap-1 text-green-600" title="This startup has been verified">
                  <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs font-semibold">Verified</span>
                </div>
              )}
            </div>
          )}
        </Card>
        </div>
      </div>
    </div>
  );
};

export default PublicStartupPage;

