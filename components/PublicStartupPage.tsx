import React, { useEffect, useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { ArrowLeft, Share2, Building2, TrendingUp, DollarSign, Users, FileText, Video, ExternalLink, CheckCircle, Linkedin, Globe } from 'lucide-react';
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
import { getVideoEmbedUrl, VideoSource } from '../lib/videoUtils';
import LogoTMS from './public/logoTMS.svg';
import { createSlug, createProfileUrl, parseProfileUrl } from '../lib/slugUtils';
import { resolveSlug } from '../lib/slugResolver';
import SEOHead from './SEOHead';

const PublicStartupPage: React.FC = () => {
  const [startup, setStartup] = useState<Startup | null>(null);
  const [fundraisingDetails, setFundraisingDetails] = useState<FundraisingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasDueDiligenceAccess, setHasDueDiligenceAccess] = useState(false);

  // Check for path-based URL first (e.g., /startup/startup-name)
  const pathProfile = parseProfileUrl(window.location.pathname);
  const queryStartupId = getQueryParam('startupId') || getQueryParam('id');
  
  // Resolve startup ID from slug if path-based URL is used
  const [startupId, setStartupId] = useState<string | null>(null);
  
  useEffect(() => {
    const resolveStartupId = async () => {
      if (pathProfile && pathProfile.view === 'startup') {
        // Path-based URL: resolve slug to ID
        console.log('🔍 Resolving startup slug:', pathProfile.slug);
        const resolvedId = await resolveSlug('startup', pathProfile.slug);
        console.log('🔍 Resolved startup ID:', resolvedId);
        if (resolvedId) {
          setStartupId(String(resolvedId));
        } else {
          console.error('❌ Startup not found for slug:', pathProfile.slug);
          setError(`Startup not found: ${pathProfile.slug}`);
          setLoading(false);
        }
      } else if (queryStartupId) {
        // Query param URL (backward compatibility)
        // Note: Redirect is handled in App.tsx, but we still need to set the ID for loading
        setStartupId(queryStartupId);
      } else {
        setError('Startup ID is required');
        setLoading(false);
      }
    };
    
    resolveStartupId();
  }, [pathProfile, queryStartupId]);

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
      // Don't set error here - it's already handled in resolveStartupId
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

        // Try startups_public first (works for both authenticated and unauthenticated)
        // If that fails and user is authenticated, try startups table
        let startupData = null;
        let startupError = null;
        
        // First try public view (accessible to everyone)
        let { data, error } = await supabase
          .from('startups_public')
          .select('*')
          .eq('id', startupId)
          .single();
        
        if (!error && data) {
          startupData = data;
        } else {
          startupError = error;
          // If public view fails and user is authenticated, try full table
          if (isUserAuthenticated) {
            console.log('Public view failed, trying startups table for authenticated user');
            const result = await supabase
              .from('startups')
              .select('*')
              .eq('id', startupId)
              .single();
            startupData = result.data;
            startupError = result.error;
          }
        }

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
          // Try public view first if not authenticated, fallback to direct table if view fails
          let fundraisingTableName = isUserAuthenticated ? 'fundraising_details' : 'fundraising_details_public';
          let { data: fundraisingData, error: fundraisingError } = await supabase
            .from(fundraisingTableName)
            .select('*')
            .eq('startup_id', (startupData as any).id)
            .order('created_at', { ascending: false })
            .limit(1);

          // If view fails and user is not authenticated, try direct table access (RLS policy should allow it)
          if (fundraisingError && !isUserAuthenticated) {
            console.log('Public view failed, trying direct table access with RLS policy...', fundraisingError);
            fundraisingTableName = 'fundraising_details';
            const retryResult = await supabase
              .from(fundraisingTableName)
              .select('*')
              .eq('startup_id', (startupData as any).id)
              .order('created_at', { ascending: false })
              .limit(1);
            fundraisingData = retryResult.data;
            fundraisingError = retryResult.error;
          }

          if (!fundraisingError && fundraisingData && (fundraisingData as any[]).length > 0) {
            const fd = (fundraisingData as any[])[0] as any;
            // Map to FundraisingDetails format
            setFundraisingDetails({
              active: fd.active,
              type: fd.type,
              value: fd.value,
              equity: fd.equity,
              stage: fd.stage,
              domain: fd.domain || undefined,
              validationRequested: fd.validation_requested || false, // May not be in public view
              pitchDeckUrl: fd.pitch_deck_url,
              pitchVideoUrl: fd.pitch_video_url,
              logoUrl: fd.logo_url, // Logo URL
              businessPlanUrl: fd.business_plan_url,
              websiteUrl: fd.website_url,
              linkedInUrl: fd.linkedin_url,
              onePagerUrl: fd.one_pager_url
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

  // Clean up ?page=landing from URL if present (for SEO) - MUST be before any early returns
  useEffect(() => {
    if (getQueryParam('page') === 'landing' && pathProfile) {
      // Remove page=landing from URL for cleaner SEO
      const url = new URL(window.location.href);
      url.searchParams.delete('page');
      window.history.replaceState({}, '', url.toString());
    }
  }, [pathProfile]);

  const handleShare = async () => {
    if (!startup) return;

    // Create SEO-friendly public shareable link with slug in path
    const startupName = startup.name || 'Startup';
    const slug = createSlug(startupName);
    const baseUrl = window.location.origin;
    const shareUrl = createProfileUrl(baseUrl, 'startup', slug, String(startup.id));
    const details = `Startup: ${startup.name || 'N/A'}\nSector: ${startup.sector || 'N/A'}\nValuation: ${formatCurrency(startup.current_valuation || 0, startup.currency || 'INR')}\n\nView startup: ${shareUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: startup.name || 'Startup Profile',
          text: details,
          url: shareUrl,
        });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        messageService.success('Link Copied', 'Startup link copied to clipboard!', 2000);
      } else {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        messageService.success('Link Copied', 'Startup link copied to clipboard!', 2000);
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  // Autoplay state - can be controlled via URL parameter or user preference
  const [autoplayVideo, setAutoplayVideo] = useState(false);
  
  useEffect(() => {
    // Check if autoplay is requested via URL parameter
    const autoplayParam = getQueryParam('autoplay');
    if (autoplayParam === 'true' || autoplayParam === '1') {
      setAutoplayVideo(true);
    }
  }, []);

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
      // Store the current URL to redirect back after login (preserve the SEO-friendly URL)
      const currentUrl = window.location.href;
      sessionStorage.setItem('redirectAfterLogin', currentUrl);
      // Redirect to clean login page
      const url = new URL(window.location.origin);
      url.searchParams.set('page', 'login');
      window.location.href = url.toString();
      return;
    }

    // Check if user is Investor or Investment Advisor
    if (currentUser?.role !== 'Investor' && currentUser?.role !== 'Investment Advisor') {
      messageService.error('Access Restricted', 'Only Investors and Investment Advisors can make offers. Please log in with an Investor or Investment Advisor account.', 3000);
      // Store the current URL to redirect back after login (preserve the SEO-friendly URL)
      const currentUrl = window.location.href;
      sessionStorage.setItem('redirectAfterLogin', currentUrl);
      // Redirect to clean login page
      const url = new URL(window.location.origin);
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
    // Use clean URL without path-based params
    const url = new URL(window.location.origin);
    url.searchParams.set('view', 'investor');
    url.searchParams.set('tab', 'reels');
    url.searchParams.set('pitchId', String(startup.id));
    url.searchParams.set('makeOffer', 'true');
    window.location.href = url.toString();
  };

  const handleDocumentClick = async (url: string | undefined, documentType: string) => {
    if (!url || url === '#') return;
    
    // Double-check authentication status before proceeding
    const authCheck = await authService.isAuthenticated();
    const currentAuthUser = authCheck ? await authService.getCurrentUser() : null;
    
    if (!authCheck || !currentAuthUser) {
      // Show message and redirect to login page
      messageService.error('Login Required', `You must be logged in to view the ${documentType}. Please log in to continue.`, 3000);
      // Store the current URL to redirect back after login (preserve SEO-friendly URL)
      const currentUrl = window.location.href;
      sessionStorage.setItem('redirectAfterLogin', currentUrl);
      // Redirect to clean login page
      const url = new URL(window.location.origin);
      url.searchParams.set('page', 'login');
      window.location.href = url.toString();
      return;
    }
    
    // User is authenticated, open the document
    window.open(url, '_blank', 'noopener,noreferrer');
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
      // Store the current URL to redirect back after login (preserve SEO-friendly URL)
      const currentUrl = window.location.href;
      sessionStorage.setItem('redirectAfterLogin', currentUrl);
      // Redirect to clean login page
      const url = new URL(window.location.origin);
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
      // Store the current URL to redirect back after login (preserve SEO-friendly URL)
      const currentUrl = window.location.href;
      sessionStorage.setItem('redirectAfterLogin', currentUrl);
      // Redirect to clean login page
      const url = new URL(window.location.origin);
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
        // Redirect to investor view with clean URL
        const url = new URL(window.location.origin);
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
  // Get video embed info with autoplay support
  const videoEmbedInfo = fundraisingDetails?.pitchVideoUrl
    ? getVideoEmbedUrl(fundraisingDetails.pitchVideoUrl, autoplayVideo)
    : null;
  
  const videoEmbedUrl = videoEmbedInfo?.embedUrl || null;
  const videoSource = videoEmbedInfo?.source || null;

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

  // Show startup card only if fundraising is active
  const hasActiveFundraising = fundraisingDetails && fundraisingDetails.active;
  const hasFundraisingDetails = fundraisingDetails && (fundraisingDetails.value > 0 || fundraisingDetails.equity > 0);

  // Check if fundraising is inactive - if so, show closed message
  // Only show closed message if fundraising details exist AND active is explicitly false
  // If no fundraising details exist, still show the profile (startup may not have set up fundraising yet)
  const isFundraisingInactive = fundraisingDetails !== null && fundraisingDetails.active === false;

  // SEO data - Clean URL (remove query parameters like ?page=landing for SEO)
  const startupName = startup?.name || 'Startup';
  const startupDescription = startup?.description || 
    `${startupName} is ${startup?.sector ? `a ${startup.sector} startup` : 'a startup'}${fundraisingDetails?.active ? ' actively raising funds' : ''}. ${fundraisingDetails?.value && fundraisingDetails?.equity ? `Seeking ${formatCurrency(fundraisingDetails.value, startup?.currency || 'INR')} for ${fundraisingDetails.equity}% equity.` : ''}${startup?.current_valuation ? ` Current valuation: ${formatCurrency(startup.current_valuation, startup.currency || 'INR')}.` : ''}`;
  // Canonical URL should be clean (no query parameters) for SEO
  const cleanPath = window.location.pathname; // Already clean from slug-based URL
  const canonicalUrl = `${window.location.origin}${cleanPath}`;
  const ogImage = fundraisingDetails?.logoUrl && fundraisingDetails.logoUrl !== '#' 
    ? fundraisingDetails.logoUrl 
    : undefined;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* SEO Head Component */}
      {startup && (
        <SEOHead
          title={`${startupName} - Startup Profile | TrackMyStartup`}
          description={startupDescription}
          canonicalUrl={canonicalUrl}
          ogImage={ogImage}
          ogType="website"
          profileType="startup"
          name={startupName}
          website={fundraisingDetails?.websiteUrl && fundraisingDetails.websiteUrl !== '#' ? fundraisingDetails.websiteUrl : undefined}
          linkedin={fundraisingDetails?.linkedInUrl && fundraisingDetails.linkedInUrl !== '#' ? fundraisingDetails.linkedInUrl : undefined}
          location={startup.sector}
          sector={startup.sector}
          valuation={startup.current_valuation}
          currency={startup.currency || 'INR'}
          investmentAsk={fundraisingDetails?.value}
          equityOffered={fundraisingDetails?.equity}
        />
      )}
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

        {/* Show closed message if fundraising is inactive */}
        {isFundraisingInactive && (
          <Card className="mb-6">
            <div className="text-center py-8 sm:py-12">
              <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">
                Profile Sharing Inactive
              </h2>
              <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto">
                This startup has inactive profile sharing.
              </p>
              <p className="text-xs sm:text-sm text-slate-500 mt-2">
                Please contact the startup directly for more information.
              </p>
            </div>
          </Card>
        )}

        {/* Discover Page Style Card - Only show if fundraising is active */}
        {!isFundraisingInactive && (
        <Card className="!p-0 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 bg-white max-w-4xl mx-auto">
          {/* Video/Logo Section */}
          <div className="relative w-full aspect-[16/7] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {videoEmbedUrl ? (
              <div className="relative w-full h-full">
                {videoSource === 'direct' ? (
                  // Direct video URL - use HTML5 video player
                  <video
                    src={videoEmbedUrl}
                    controls
                    autoPlay={autoplayVideo}
                    muted={autoplayVideo}
                    playsInline
                    className="absolute top-0 left-0 w-full h-full object-cover"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  // Embedded video (YouTube, Vimeo, Google Drive, OneDrive, etc.)
                  <iframe
                    src={videoEmbedUrl}
                    title={`Pitch video for ${startup?.name}`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full"
                  />
                )}
                {/* Autoplay toggle button */}
                <div className="absolute top-2 right-2 z-10">
                  <button
                    onClick={() => setAutoplayVideo(!autoplayVideo)}
                    className="bg-black/70 hover:bg-black/90 text-white px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors"
                    title={autoplayVideo ? 'Disable autoplay' : 'Enable autoplay'}
                  >
                    {autoplayVideo ? '⏸️ Autoplay ON' : '▶️ Autoplay OFF'}
                  </button>
                </div>
              </div>
            ) : fundraisingDetails?.logoUrl && fundraisingDetails.logoUrl !== '#' ? (
              // Show logo if video is not available - auto-fit to card
              <div className="relative w-full h-full flex items-center justify-center bg-white overflow-hidden">
                <img
                  src={fundraisingDetails.logoUrl}
                  alt={`${startup?.name} logo`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback if image fails to load
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              // No video or logo - show placeholder
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <Video className="h-16 w-16 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No video or logo available</p>
                </div>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-3 sm:p-4">
            <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0 pr-10 sm:pr-0">
                <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-1.5 line-clamp-2">{startup?.name}</h3>
                <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
                  {fundraisingDetails?.domain && (
                    <span className="text-slate-500">
                      <span className="font-medium text-slate-700">Domain:</span> {fundraisingDetails.domain}
                    </span>
                  )}
                  {fundraisingDetails?.type && (
                    <>
                      {fundraisingDetails?.domain && <span className="text-slate-300">•</span>}
                      <span className="text-slate-500">
                        <span className="font-medium text-slate-700">Round:</span> {fundraisingDetails.type}
                      </span>
                    </>
                  )}
                  {fundraisingDetails?.stage && (
                    <>
                      {(fundraisingDetails?.domain || fundraisingDetails?.type) && <span className="text-slate-300">•</span>}
                      <span className="text-slate-500">
                        <span className="font-medium text-slate-700">Stage:</span> {fundraisingDetails.stage}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="absolute top-0 right-0 sm:relative sm:flex sm:items-center gap-1.5 shrink-0">
                <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                  {fundraisingDetails?.active && (
                    <div className="flex items-center gap-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-2 py-1 rounded-full text-xs font-medium shadow-sm">
                      <CheckCircle className="h-3 w-3" />
                      <span className="hidden xs:inline">Active</span>
                    </div>
                  )}
                  {startup?.compliance_status === 'Compliant' && (
                    <div className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-2 py-1 rounded-full text-xs font-medium shadow-sm">
                      <CheckCircle className="h-3 w-3" />
                      <span className="hidden xs:inline">Verified</span>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleShare}
                    className="!rounded-full !p-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all duration-200 border border-slate-200"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-3 space-y-2">
              {/* First Row: Document Buttons - Always visible, redirects to login if not authenticated */}
              <div className="flex flex-wrap items-center gap-2">
                {fundraisingDetails?.pitchDeckUrl && fundraisingDetails?.pitchDeckUrl !== '#' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDocumentClick(fundraisingDetails?.pitchDeckUrl, 'Pitch Deck')}
                    className="flex-1 min-w-[100px] sm:min-w-[120px] w-full hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 border border-slate-200 text-xs sm:text-sm py-1.5"
                  >
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> <span className="hidden xs:inline">View </span>Deck
                  </Button>
                )}

                {fundraisingDetails?.businessPlanUrl && fundraisingDetails?.businessPlanUrl !== '#' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDocumentClick(fundraisingDetails?.businessPlanUrl, 'Business Plan')}
                    className="flex-1 min-w-[100px] sm:min-w-[140px] w-full hover:bg-purple-50 hover:text-purple-600 transition-all duration-200 border border-slate-200 text-xs sm:text-sm py-1.5"
                  >
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> <span className="hidden xs:inline">Business </span>Plan
                  </Button>
                )}

                {fundraisingDetails?.onePagerUrl && fundraisingDetails?.onePagerUrl !== '#' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDocumentClick(fundraisingDetails?.onePagerUrl, 'One-Pager')}
                    className="flex-1 min-w-[100px] sm:min-w-[120px] w-full hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-200 border border-slate-200 text-xs sm:text-sm py-1.5"
                  >
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> One-Pager
                  </Button>
                )}
              </div>

              {/* Second Row: Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Due Diligence Button - Always visible, redirects to login if needed */}
                <button
                  onClick={handleDueDiligence}
                  disabled={currentUser?.role === 'Startup'}
                  className={`flex-1 min-w-[120px] transition-all duration-200 border px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-center ${
                    currentUser?.role === 'Startup'
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                      : isAuthenticated && hasDueDiligenceAccess
                      ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700'
                      : 'hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300 border-slate-200 bg-white'
                  }`}
                  title={currentUser?.role === 'Startup' ? 'Please login as investor to view due diligence or make offer' : ''}
                >
                  <svg className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="hidden sm:inline">{isAuthenticated && hasDueDiligenceAccess ? 'Due Diligence Accepted' : 'Due Diligence'}</span>
                  <span className="sm:hidden">DD</span>
                </button>

                {/* Make Offer Button - Always visible, redirects to login if needed */}
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleMakeOffer}
                  disabled={currentUser?.role === 'Startup'}
                  className={`flex-1 min-w-[120px] sm:min-w-[140px] transition-all duration-200 text-xs sm:text-sm text-center py-1.5 ${
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
          </div>

          {/* Investment Details Footer - Only show if fundraising details exist */}
          {hasFundraisingDetails && (
            <div className="bg-gradient-to-r from-slate-50 to-purple-50 px-3 sm:px-4 py-2 sm:py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 border-t border-slate-200">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="text-xs sm:text-sm">
                  <span className="font-semibold text-slate-800">Ask:</span> {formatCurrency(fundraisingDetails?.value || 0, startup?.currency || 'INR')} for <span className="font-semibold text-purple-600">{fundraisingDetails?.equity || 0}%</span> equity
                </div>
                {(fundraisingDetails?.websiteUrl || fundraisingDetails?.linkedInUrl) && (
                  <div className="flex items-center gap-2 sm:gap-3">
                    {fundraisingDetails?.websiteUrl && fundraisingDetails?.websiteUrl !== '#' && (
                      <a 
                        href={fundraisingDetails.websiteUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-slate-600 hover:text-blue-600 transition-colors"
                        title={fundraisingDetails.websiteUrl}
                      >
                        <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="truncate max-w-[150px] sm:max-w-[200px]">Website</span>
                        <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3 opacity-50" />
                      </a>
                    )}
                    {fundraisingDetails?.linkedInUrl && fundraisingDetails?.linkedInUrl !== '#' && (
                      <a 
                        href={fundraisingDetails.linkedInUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-slate-600 hover:text-blue-600 transition-colors"
                        title={fundraisingDetails.linkedInUrl}
                      >
                        <Linkedin className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="truncate max-w-[150px] sm:max-w-[200px]">LinkedIn</span>
                        <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3 opacity-50" />
                      </a>
                    )}
                  </div>
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
        )}
      </div>
    </div>
  );
};

export default PublicStartupPage;


