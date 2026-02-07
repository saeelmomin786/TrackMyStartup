import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Startup, NewInvestment, ComplianceStatus, StartupAdditionRequest, FundraisingDetails, InvestmentRecord, InvestmentType, UserRole, Founder, User, VerificationRequest, InvestmentOffer } from './types';
import { authService, AuthUser } from './lib/auth';
import { startupService, investmentService, verificationService, userService, realtimeService, startupAdditionService } from './lib/database';
import { caService } from './lib/caService';
import { csService } from './lib/csService';
import { dataMigrationService } from './lib/dataMigration';
import { storageService } from './lib/storage';
import { validationService, ValidationRequest } from './lib/validationService';
import { supabase } from './lib/supabase';
import { TrialService } from './lib/trialService';
import TrialAlert from './components/TrialAlert';
import InvestorView from './components/InvestorView';
import StartupHealthView from './components/StartupHealthView';
import AdminView from './components/AdminView';
import CAView from './components/CAView';
import CSView from './components/CSView';
import FacilitatorView from './components/FacilitatorView';
import InvestmentAdvisorView from './components/InvestmentAdvisorView';
import MentorView from './components/MentorView';
import TrialStatusBanner from './components/TrialStatusBanner';
import LoginPage from './components/LoginPage';
import { TwoStepRegistration } from './components/TwoStepRegistration';
import { CompleteRegistrationPage } from './components/CompleteRegistrationPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import LandingPage from './components/LandingPage';
import { getQueryParam, setQueryParam } from './lib/urlState';
import { parseProfileUrl } from './lib/slugUtils';
import Footer from './components/Footer';
import PageRouter from './components/PageRouter';
import PublicProgramView from './components/PublicProgramView';
import PublicAdminProgramView from './components/PublicAdminProgramView';
import PublicStartupPage from './components/PublicStartupPage';
import PublicInvestorPage from './components/PublicInvestorPage';
import PublicMentorPage from './components/PublicMentorPage';
import PublicAdvisorPage from './components/PublicAdvisorPage';
import ExploreProfilesPage from './components/ExploreProfilesPage';
import StartupSubscriptionPage from './components/startup-health/StartupSubscriptionPage';
import DiagnosticPage from './components/DiagnosticPage';
import SubscriptionPlansPage from './components/SubscriptionPlansPage';

import { Briefcase, BarChart3, LogOut, UserPlus } from 'lucide-react';
import LogoTMS from './components/public/logoTMS.svg';
import { FacilitatorCodeDisplay } from './components/FacilitatorCodeDisplay';
import MessageContainer from './components/MessageContainer';
import { messageService } from './lib/messageService';
import { ProfileSwitcher } from './components/ProfileSwitcher';
import { AddProfileModal } from './components/AddProfileModal';

const App: React.FC = () => {
  // Subdomain detection utility function
  const getSubdomain = (): string | null => {
    if (typeof window === 'undefined') return null;
    const hostname = window.location.hostname;
    
    // Handle localhost for development
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost:')) {
      return null;
    }
    
    // Split hostname by dots
    const parts = hostname.split('.');
    
    // If we have at least 3 parts (e.g., subdomain.trackmystartup.com)
    // or 2 parts with a subdomain (e.g., subdomain.trackmystartup)
    if (parts.length >= 3) {
      const subdomain = parts[0];
      // Check if it's not 'www' and not empty
      if (subdomain && subdomain !== 'www') {
        return subdomain;
      }
    }
    
    return null;
  };

  // Check if we're on the main domain (trackmystartup.com or www.trackmystartup.com)
  const isMainDomain = (): boolean => {
    if (typeof window === 'undefined') return true;
    const hostname = window.location.hostname;
    
    // Handle localhost for development
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost:')) {
      return true;
    }
    
    const subdomain = getSubdomain();
    return subdomain === null; // No subdomain means main domain
  };

  // Subdomain redirect logic - redirect subdomains to login page
  // This must be called before any conditional returns to follow Rules of Hooks
  useEffect(() => {
    const subdomain = getSubdomain();
    const currentPageParam = getQueryParam('page');
    
    // If we're on a subdomain and not already on login/reset-password/register/complete-registration
    if (subdomain && !isMainDomain()) {
      // Allow reset-password, register, complete-registration, and subscription pages on subdomains
      // (needed for invite flows and registration)
      const allowedPages = ['login', 'reset-password', 'register', 'complete-registration', 'subscription'];
      
      // If trying to access landing page or any other non-allowed page on subdomain, redirect to login
      if (!currentPageParam || currentPageParam === 'landing' || !allowedPages.includes(currentPageParam)) {
        console.log('🔀 Subdomain detected:', subdomain, '- Redirecting to login page');
        // Redirect to login page on subdomain
        const url = new URL(window.location.href);
        url.searchParams.set('page', 'login');
        // Preserve other query params (like advisorCode, email, etc.)
        window.location.replace(url.toString());
      }
    }
  }, []); // Run once on mount

  // Check if we're on a standalone page (footer links and service pages)
  const standalonePages = ['/privacy-policy', '/cancellation-refunds', '/shipping', '/terms-conditions', '/about', '/contact', '/products', '/diagnostic', '/unified-mentor-network', '/tms-virtual-conference', '/grant-opportunities', '/blogs', '/events'];
  const currentPath = window.location.pathname;
  const isServicePage = currentPath.startsWith('/services/');
  const isBlogDetailPage = currentPath.startsWith('/blogs/') && currentPath !== '/blogs';
  const isEventDetailPage = currentPath.startsWith('/events/') && currentPath !== '/events';
  const isPaymentPage = currentPath.startsWith('/payment');
  const isMentorPaymentPage = currentPath.startsWith('/mentor-payment');
  
  // Check if we're on a public program view page
  const isPublicProgramView = getQueryParam('view') === 'program' && getQueryParam('opportunityId');
  const isPublicAdminProgramView = getQueryParam('view') === 'admin-program' && getQueryParam('programId');
  
  // Check for path-based URLs (e.g., /startup/startup-name, /investor/investor-name)
  // Use useMemo to ensure parseProfileUrl is available
  const pathProfile = useMemo(() => {
    try {
      return parseProfileUrl(window.location.pathname);
    } catch (e) {
      console.error('Error parsing profile URL:', e);
      return null;
    }
  }, []);
  const isPathBasedStartup = pathProfile?.view === 'startup';
  const isPathBasedInvestor = pathProfile?.view === 'investor';
  const isPathBasedAdvisor = pathProfile?.view === 'advisor';
  const isPathBasedMentor = pathProfile?.view === 'mentor';
  
  // Check if we're on a public startup page (path-based or query param)
  // This should work even when user is authenticated - it's a public view of a startup
  // Support both 'startupId'/'id' (new format) and 'startup' (backward compatibility)
  const startupIdParam = getQueryParam('startupId') || getQueryParam('id') || getQueryParam('startup');
  const isPublicStartupPage = isPathBasedStartup || ((getQueryParam('view') === 'startup' || startupIdParam) && startupIdParam);
  
  // Check if we're on a public investor page
  const isPublicInvestorPage = isPathBasedInvestor || (getQueryParam('view') === 'investor' && (getQueryParam('investorId') || getQueryParam('userId')));
  // Check if we're on a public investment advisor page
  const isPublicAdvisorPage = isPathBasedAdvisor || (getQueryParam('view') === 'advisor' && (getQueryParam('advisorId') || getQueryParam('userId')));
  // Check if we're on a public mentor page
  const isPublicMentorPage = isPathBasedMentor || (getQueryParam('view') === 'mentor' && (getQueryParam('mentorId') || getQueryParam('userId')));
  // Check if we're on explore profiles page
  const isExploreProfilesPage = getQueryParam('view') === 'explore' && getQueryParam('role');
  
  // Redirect old query-parameter URLs to SEO-friendly path-based URLs
  useEffect(() => {
    const redirectToSeoUrl = async () => {
      // Check for old startup URL format
      // Support both 'startupId'/'id' (new format) and 'startup' (backward compatibility)
      const queryStartupId = getQueryParam('startupId') || getQueryParam('id') || getQueryParam('startup');
      if (queryStartupId && !pathProfile) {
        try {
          // Load startup name and redirect
          const { data: startupData, error } = await supabase
            .from('startups_public')
            .select('id, name')
            .eq('id', queryStartupId)
            .single();
          
          if (!error && startupData && (startupData as any).name) {
            const { createSlug } = await import('./lib/slugUtils');
            const slug = createSlug((startupData as any).name);
            const newUrl = `${window.location.origin}/startup/${slug}`;
            window.location.replace(newUrl);
            return;
          }
        } catch (err) {
          console.error('Error redirecting startup URL:', err);
        }
      }
      
      // Check for old mentor URL format (query params)
      const queryMentorId = getQueryParam('mentorId');
      const queryUserId = getQueryParam('userId');
      if ((queryMentorId || queryUserId) && getQueryParam('view') === 'mentor' && !pathProfile) {
        try {
          const userIdToCheck = queryUserId || queryMentorId;
          // Load mentor name and redirect
          const { data: mentorData, error } = await supabase
            .from('mentor_profiles')
            .select('user_id, mentor_name')
            .eq('user_id', userIdToCheck)
            .single();
          
          if (!error && mentorData && mentorData.mentor_name) {
            const { createSlug } = await import('./lib/slugUtils');
            const slug = createSlug(mentorData.mentor_name);
            const newUrl = `${window.location.origin}/mentor/${slug}`;
            window.location.replace(newUrl);
            return;
          }
        } catch (err) {
          console.error('Error redirecting mentor URL:', err);
        }
      }
      
      // Check for invalid mentor slug (like "mentorId" as literal text)
      if (pathProfile && pathProfile.view === 'mentor' && (pathProfile.slug === 'mentorId' || pathProfile.slug === 'mentorid')) {
        // This is an invalid slug, try to get mentor from query params or redirect to error
        const queryMentorId = getQueryParam('mentorId');
        const queryUserId = getQueryParam('userId');
        if (queryMentorId || queryUserId) {
          try {
            const userIdToCheck = queryUserId || queryMentorId;
            const { data: mentorData, error } = await supabase
              .from('mentor_profiles')
              .select('user_id, mentor_name')
              .eq('user_id', userIdToCheck)
              .single();
            
            if (!error && mentorData && mentorData.mentor_name) {
              const { createSlug } = await import('./lib/slugUtils');
              const slug = createSlug(mentorData.mentor_name);
              const newUrl = `${window.location.origin}/mentor/${slug}`;
              window.location.replace(newUrl);
              return;
            }
          } catch (err) {
            console.error('Error redirecting invalid mentor slug:', err);
          }
        }
      }
      
      // Clean up page=landing from public startup URLs
      if (isPublicStartupPage && getQueryParam('page') === 'landing') {
        const url = new URL(window.location.href);
        url.searchParams.delete('page');
        window.history.replaceState({}, '', url.toString());
      }
      if (isPublicInvestorPage && getQueryParam('page') === 'landing') {
        const url = new URL(window.location.href);
        url.searchParams.delete('page');
        window.history.replaceState({}, '', url.toString());
      }
    };
    
    redirectToSeoUrl();
  }, [isPublicStartupPage, isPublicInvestorPage, pathProfile]);
  
  
  
  if (standalonePages.includes(currentPath) || isServicePage || isBlogDetailPage || isEventDetailPage || isPaymentPage || isMentorPaymentPage) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <main className="flex-1">
          <PageRouter />
        </main>
      </div>
    );
  }


  // Cookie utility functions
  const setCookie = (name: string, value: string, days: number = 7) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  };

  const getCookie = (name: string): string | null => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  const deleteCookie = (name: string) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  };

  // Initialize view from cookie or default to dashboard
  const [view, setView] = useState<'startupHealth' | 'dashboard'>(() => {
    const savedView = getCookie('currentView');
    return (savedView === 'startupHealth' || savedView === 'dashboard') ? savedView : 'dashboard';
  });
  const [viewKey, setViewKey] = useState(0); // Force re-render key
  const [forceRender, setForceRender] = useState(0); // Additional force render
  const [currentPage, setCurrentPage] = useState<'landing' | 'login' | 'register' | 'complete-registration' | 'payment' | 'reset-password' | 'subscription'>(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      
      // Check for invite link errors first (otp_expired, access_denied)
      const error = searchParams.get('error') || (hash.includes('error=') ? hash.split('error=')[1]?.split('&')[0] : null);
      const errorCode = searchParams.get('error_code') || (hash.includes('error_code=') ? hash.split('error_code=')[1]?.split('&')[0] : null);
      const type = searchParams.get('type') || (hash.includes('type=') ? hash.split('type=')[1]?.split('&')[0] : null);
      
      // Check for invite link (type=invite) - should go to reset-password page for password setup
      if (type === 'invite' || errorCode === 'otp_expired') {
        console.log('📧 Invite link detected (type=invite or expired), routing to password setup');
        return 'reset-password';
      }
      
      // Reset-password has priority over query param
      // Check for code parameter (password reset/invite codes)
      const hasCode = searchParams.get('code') || (hash.includes('code=') ? hash.split('code=')[1]?.split('&')[0] : null);
      
      if (pathname === '/reset-password' || 
          searchParams.get('page') === 'reset-password' ||
          type === 'recovery' ||
          hash.includes('type=recovery') ||
          searchParams.get('access_token') ||
          searchParams.get('refresh_token') ||
          hasCode) {
        console.log('🔐 Reset password page detected:', { pathname, hasCode, type, page: searchParams.get('page') });
        return 'reset-password';
      }
      
      // Check for invite link (has advisorCode) - should go to reset-password FIRST for password setup
      // Then after password is set and user logs in, go to complete-registration
      const advisorCode = searchParams.get('advisorCode') || getQueryParam('advisorCode');
      const pageParam = searchParams.get('page') || getQueryParam('page');
      
      // Priority 1: If page=reset-password is explicitly set, go to reset-password (for invite flow)
      if (pageParam === 'reset-password') {
        console.log('📧 Reset password page requested');
        return 'reset-password';
      }
      
      // Priority 2: If advisorCode is present but we're on login page, stay on login
      // After login, we'll redirect to complete-registration
      if (advisorCode && pageParam === 'login') {
        console.log('📧 Login page with advisorCode - user will login then go to Form 2');
        return 'login';
      }
      
      // Priority 3: If advisorCode is present but page is complete-registration
      // This is an invite flow - user needs to set password first, so go to reset-password
      if (advisorCode && pageParam === 'complete-registration') {
        console.log('📧 Invite link with complete-registration detected - user needs to set password first, redirecting to reset-password');
        return 'reset-password'; // Will redirect via useEffect below
      }
      
      // Priority 4: If advisorCode is present without explicit page param
      // Default to reset-password for invite flow (user needs to set password first)
      if (advisorCode && !error && !pageParam) {
        console.log('📧 Invite link detected with advisorCode (no page param) - defaulting to reset-password');
        return 'reset-password';
      }
      const fromQuery = (getQueryParam('page') as any) || 'landing';
      const valid = ['landing','login','register','complete-registration','payment','reset-password','subscription'];
      const page = valid.includes(fromQuery) ? fromQuery : 'landing';
      
      // If on subdomain, don't allow landing page - redirect to login
      const subdomain = getSubdomain();
      if (subdomain && !isMainDomain() && page === 'landing') {
        console.log('🔀 Subdomain detected - preventing landing page, defaulting to login');
        return 'login';
      }
      
      return page;
    }
    
    // Default to login on subdomains, landing on main domain
    const subdomain = getSubdomain();
    if (subdomain && !isMainDomain()) {
      return 'login';
    }
    return 'landing';
  });

  // Keep URL ?page= in sync with currentPage
  // Use pushState to maintain browser history for back button
  // Only replace on initial load to avoid duplicate history entries
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // Track when redirecting to complete-registration due to incomplete Form 2
  // This prevents back button from going to dashboard when Form 2 is incomplete
  const [shouldReplaceHistory, setShouldReplaceHistory] = useState(false);
  useEffect(() => {
    if (isInitialLoad) {
      // On initial load, use replaceState to avoid adding unnecessary history entry
      setQueryParam('page', currentPage, true);
      setIsInitialLoad(false);
    } else if (shouldReplaceHistory && currentPage === 'complete-registration') {
      // When redirecting to complete-registration due to incomplete Form 2,
      // use replaceState to prevent back button from going to dashboard
      setQueryParam('page', currentPage, true);
      setShouldReplaceHistory(false); // Reset flag after using it
    } else {
      // On subsequent navigations, use pushState to maintain history
      setQueryParam('page', currentPage, false);
    }
  }, [currentPage, isInitialLoad, shouldReplaceHistory]);

  // Redirect from complete-registration to reset-password for invite flows
  useEffect(() => {
    const advisorCode = getQueryParam('advisorCode');
    const pageParam = getQueryParam('page');
    
    // If user lands on complete-registration with advisorCode, redirect to reset-password
    if (advisorCode && pageParam === 'complete-registration') {
      console.log('📧 Redirecting from complete-registration to reset-password for invite flow');
      const email = getQueryParam('email');
      if (email) {
        const encodedEmail = encodeURIComponent(email);
        window.location.href = `/?page=reset-password&advisorCode=${advisorCode}&email=${encodedEmail}`;
      } else {
        window.location.href = `/?page=reset-password&advisorCode=${advisorCode}`;
      }
    }
  }, []); // Run once on mount

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
        const pageParam = getQueryParam('page') as 'landing' | 'login' | 'register' | 'complete-registration' | 'payment' | 'reset-password' | 'subscription' | null;
        if (pageParam) {
          const valid = ['landing', 'login', 'register', 'complete-registration', 'payment', 'reset-password', 'subscription'];
        if (valid.includes(pageParam)) {
          setCurrentPage(pageParam);
        }
      } else {
        setCurrentPage('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [assignedInvestmentAdvisor, setAssignedInvestmentAdvisor] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);

  // Check Form 2 completion when navigating to dashboard via back button or when accessing dashboard
  useEffect(() => {
    if (isAuthenticated && currentUser && currentPage === 'login' && !isLoading) {
      // Check if Form 2 is complete - if not, redirect to complete-registration
      authService.isProfileComplete(currentUser.id).then((isComplete) => {
        if (!isComplete) {
          console.log('🔒 Profile incomplete - preventing dashboard access, redirecting to Form 2');
          setShouldReplaceHistory(true);
          setCurrentPage('complete-registration');
        }
      }).catch((error) => {
        console.error('❌ Error checking profile completion:', error);
      });
    }
  }, [isAuthenticated, currentUser, currentPage, isLoading]);

  // NEW: Check subscription in background after login (non-blocking)
  // Shows dashboard immediately, then checks subscription in background
  // Only redirects to subscription page if user has NO subscription
  useEffect(() => {
    const checkSubscriptionAfterLogin = async () => {
      if (isAuthenticated && currentUser && currentUser.role === 'Startup' && !isLoading) {
        try {
          console.log('🔍 Background: Checking subscription for logged-in Startup user...');
          const { subscriptionService } = await import('./lib/subscriptionService');
          const subscription = await subscriptionService.getUserSubscription(currentUser.id);
          
          if (!subscription) {
            // No subscription found - redirect to subscription page
            console.log('❌ No subscription found → redirecting to subscription page');
            setCurrentPage('subscription');
            setQueryParam('page', 'subscription', true);
            return;
          }
          
          // ✅ Subscription found - ensure dashboard is showing with correct URL
          console.log('✅ Background: Subscription found:', subscription.plan_tier);
          
          // Make sure we're on dashboard (currentPage='login') with correct URL param
          if (currentPage !== 'login') {
            console.log('🔄 Fixing page: subscription found, updating to dashboard');
            setCurrentPage('login');
            setQueryParam('page', 'login', false);
          }
        } catch (error) {
          console.error('❌ Error checking subscription in background:', error);
          // Error checking subscription - allow dashboard to stay visible
        }
      }
    };
    
    // Run check in background without blocking UI
    if (isAuthenticated && currentUser && currentUser.role === 'Startup' && !isLoading) {
      checkSubscriptionAfterLogin();
    }
  }, [isAuthenticated, currentUser?.id, isLoading]);

  // EXISTING: Check if Startup user has selected a subscription plan (MANDATORY)
  // This is a secondary check - only fires if we're already on login page
  // Prevents showing subscription page if user already has a subscription
  useEffect(() => {
    const checkSubscriptionSelection = async () => {
      if (isAuthenticated && currentUser && currentUser.role === 'Startup' && !isLoading && currentPage === 'login') {
        try {
          console.log('🔍 Secondary: Checking subscription plan selection for Startup user...');
          const { subscriptionService } = await import('./lib/subscriptionService');
          const subscription = await subscriptionService.getUserSubscription(currentUser.id);
          
          if (subscription) {
            // ✅ Subscription found - keep dashboard showing
            console.log('✅ Secondary: Subscription plan found:', subscription.plan_tier);
            setSubscriptionChecked(true);
            return;
          }
          
          // No subscription found - redirect to subscription page
          console.log('❌ Secondary: No subscription plan found → forcing plan selection');
          setCurrentPage('subscription');
          setQueryParam('page', 'subscription', true);
          setSubscriptionChecked(true);
        } catch (error) {
          console.error('❌ Secondary: Error checking subscription:', error);
          setSubscriptionChecked(true);
        }
      } else {
        setSubscriptionChecked(true);
      }
    };

    checkSubscriptionSelection();
  }, [isAuthenticated, currentUser, currentPage, isLoading]);

  const [isProcessingAuthChange, setIsProcessingAuthChange] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialDataLoaded, setHasInitialDataLoaded] = useState(false);
  const [ignoreAuthEvents, setIgnoreAuthEvents] = useState(false);
  const ignoreAuthEventsRef = useRef(false);
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  // Refresh user data when accessing payment page to ensure Form 2 completion is checked with latest data
  useEffect(() => {
    if (currentPage === 'payment' && currentUser?.id) {
      const refreshUserForPayment = async () => {
        try {
          console.log('🔄 Refreshing user data for payment page Form 2 check...');
          const refreshedUser = await authService.getCurrentUser();
          if (refreshedUser) {
            console.log('✅ User data refreshed for payment page:', refreshedUser);
            setCurrentUser(refreshedUser);
          }
        } catch (error) {
          console.error('❌ Error refreshing user data for payment page:', error);
        }
      };
      refreshUserForPayment();
    }
  }, [currentPage, currentUser?.id]);

  // CRITICAL FIX: Refresh user data if startup_name is missing for Startup users
  useEffect(() => {
    if (isAuthenticated && currentUser && currentUser.role === 'Startup' && !currentUser.startup_name) {
      console.log('🔍 Startup user missing startup_name, attempting to refresh user data...');
      const refreshStartupData = async () => {
        try {
          const refreshedUser = await authService.getCurrentUser();
          if (refreshedUser && refreshedUser.startup_name) {
            console.log('✅ Startup data refreshed:', refreshedUser.startup_name);
            setCurrentUser(refreshedUser);
          } else {
            console.log('❌ Still no startup_name after refresh, checking startups table...');
            // Fallback: try to get startup name from startups table
            // IMPORTANT: startups table uses auth_user_id, not profile ID!
            const { data: { user: authUser } } = await authService.supabase.auth.getUser();
            const authUserId = authUser?.id;
            if (authUserId) {
              const { data: startupData, error: startupError } = await authService.supabase
                .from('startups')
                .select('name')
                .eq('user_id', authUserId)  // Use auth_user_id, not profile ID!
                .maybeSingle();
            
              if (startupData && !startupError) {
                console.log('✅ Found startup name from startups table:', startupData.name);
                setCurrentUser({ ...currentUser, startup_name: startupData.name });
              }
            }
          }
        } catch (error) {
          console.error('❌ Error refreshing startup data:', error);
        }
      };
      
      // Add a small delay to avoid race conditions
      const timeoutId = setTimeout(refreshStartupData, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, currentUser]);

  // Listen for URL changes to handle reset password links
  useEffect(() => {
    const handleUrlChange = () => {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      
      // Check for reset password indicators
      if (pathname === '/reset-password' || 
          searchParams.get('type') === 'recovery' ||
          hash.includes('type=recovery') ||
          searchParams.get('access_token') ||
          searchParams.get('refresh_token')) {
        setCurrentPage('reset-password');
      }
    };

    // Check on mount
    handleUrlChange();

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleUrlChange);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  
  






  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const selectedStartupRef = useRef<Startup | null>(null);
  const currentUserRef = useRef<AuthUser | null>(null);
  
  // Monitor view changes
  useEffect(() => {
    // View change monitoring
  }, [view, selectedStartup, isViewOnly]);

  // Global tab change tracker - listen for any tab changes in the app
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
    };

    // Listen for custom tab change events
    window.addEventListener('tab-change', handleTabChange as EventListener);
    
    return () => {
      window.removeEventListener('tab-change', handleTabChange as EventListener);
    };
  }, []);

  // Keep refs in sync with state
  useEffect(() => {
    selectedStartupRef.current = selectedStartup;
  }, [selectedStartup]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [newInvestments, setNewInvestments] = useState<NewInvestment[]>([]);
  const [startupAdditionRequests, setStartupAdditionRequests] = useState<StartupAdditionRequest[]>([]);

  // Check if Startup profile is incomplete and redirect to Form 2
  // This must be after startups is declared
  // IMPORTANT: Only check if we're NOT already on complete-registration page (prevents redirect loop)
  useEffect(() => {
    // Don't check if we're already on complete-registration page (prevents infinite redirect loop)
    if (currentPage === 'complete-registration') {
      return;
    }
    
    if (isAuthenticated && currentUser && currentUser.role === 'Startup' && hasInitialDataLoaded && currentPage === 'login' && startups.length === 0) {
      // Add a small delay to ensure any recent Form 2 completion has been saved
      const checkTimer = setTimeout(() => {
        // Check if profile is incomplete - if so, redirect to Form 2
        authService.isProfileComplete(currentUser.id).then((isComplete) => {
          // Double-check we're still on login page (might have changed during async check)
          if (currentPage === 'complete-registration') {
            return; // Already redirected, don't redirect again
          }
          
          if (!isComplete) {
            console.log('📝 Startup profile incomplete and no startup found, redirecting to Form 2');
            setCurrentPage('complete-registration');
            setHasInitialDataLoaded(false);
          }
        }).catch((error) => {
          console.error('Error checking profile completion:', error);
        });
      }, 500); // Small delay to allow Form 2 completion to save
      
      return () => clearTimeout(checkTimer);
    }
  }, [isAuthenticated, currentUser, hasInitialDataLoaded, currentPage, startups.length]);
  
  // Admin-related state
  const [users, setUsers] = useState<User[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [investmentOffers, setInvestmentOffers] = useState<InvestmentOffer[]>([]);
  const [validationRequests, setValidationRequests] = useState<ValidationRequest[]>([]);
  const [pendingRelationships, setPendingRelationships] = useState<any[]>([]);

  // Subscription modal removed
  const [pendingStartupRequest, setPendingStartupRequest] = useState<StartupAdditionRequest | null>(null);
  
  // Trial subscription modal state
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const [showTrialBanner, setShowTrialBanner] = useState(false);
  
  // 5-minute trial system (visual only; no dashboard lock)
  const [trialStatus, setTrialStatus] = useState<any>(null);

  // Refs for state variables to avoid dependency issues
  const startupsRef = useRef<Startup[]>([]);
  const investmentOffersRef = useRef<InvestmentOffer[]>([]);
  const validationRequestsRef = useRef<ValidationRequest[]>([]);
  const startupRecoveryAttemptedRef = useRef<boolean>(false);
  const startupRecoveryAttemptsRef = useRef<number>(0);
  const startupRecoveryLastAtRef = useRef<number>(0);

  // Trial control refs (one-shot guard and timers)
  const hasHandledTrialEndRef = useRef(false);
  const trialEndTimeoutRef = useRef<number | null>(null);
  const trialCountdownIntervalRef = useRef<number | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    startupsRef.current = startups;
  }, [startups]);

  useEffect(() => {
    investmentOffersRef.current = investmentOffers;
  }, [investmentOffers]);

  useEffect(() => {
    validationRequestsRef.current = validationRequests;
  }, [validationRequests]);


  const [loadingProgress, setLoadingProgress] = useState<string>('Initializing...');

  // Additional refs for fetchData dependencies
  const isAuthenticatedRef = useRef<boolean>(false);
  const hasInitialDataLoadedRef = useRef<boolean>(false);
  const autoReloadGuardRef = useRef<boolean>(false);

  // Keep refs in sync with state
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    hasInitialDataLoadedRef.current = hasInitialDataLoaded;
  }, [hasInitialDataLoaded]);

  // Mobile Chrome safety: if we stay in loading too long, perform a one-time hard refresh
  useEffect(() => {
    if (autoReloadGuardRef.current) return;
    const isMobileChrome = (() => {
      try {
        const ua = navigator.userAgent || '';
        return /Chrome\/\d+/.test(ua) && /Mobile/.test(ua);
      } catch { return false; }
    })();
    if (!isMobileChrome) return;
    let t: any = null;
    const arm = () => {
      if (t) clearTimeout(t);
      if (isLoading) {
        t = setTimeout(() => {
          if (isLoading && !hasInitialDataLoadedRef.current && !autoReloadGuardRef.current) {
            autoReloadGuardRef.current = true;
            try { window.location.reload(); } catch {}
          }
        }, 20000); // 20s hard-refresh safeguard
      }
    };
    arm();
    return () => { if (t) clearTimeout(t); };
  }, [isLoading]);

  // Disable any accidental full page reloads in development to prevent refresh loops
  useEffect(() => {
    try {
      if (import.meta && (import.meta as any).env && (import.meta as any).env.DEV) {
        const originalReload = window.location.reload;
        (window as any).__originalReload = originalReload;
        // No-op reload in dev
        (window.location as any).reload = () => {
          console.log('⚠️ Reload blocked in DEV to avoid loops');
        };
      }
    } catch {}
  }, []);

  // (Payment/subscription gating removed – dashboard access is not blocked by payment status)

  // Disable trial logic entirely
  useEffect(() => {}, [currentUser]);

  // Handle trial end (one-shot)
  const handleTrialEnd = useCallback(() => {
    if (hasHandledTrialEndRef.current) return;
    hasHandledTrialEndRef.current = true;

    console.log('🔍 Trial ended - redirecting to subscription page');
    // No gating: do not lock or redirect to subscription page
    setTrialEnded(true);
    setShowSubscriptionPage(false);
    setUserHasAccess(true);

    // Cleanup timers
    if (trialEndTimeoutRef.current) {
      clearTimeout(trialEndTimeoutRef.current);
      trialEndTimeoutRef.current = null;
    }
    if (trialCountdownIntervalRef.current) {
      clearInterval(trialCountdownIntervalRef.current);
      trialCountdownIntervalRef.current = null;
    }
  }, []);

  // Update trial countdown every second (UI only; end handled by single timeout)
  useEffect(() => {
    if (trialStatus && trialStatus.hasActiveTrial) {
      if (trialCountdownIntervalRef.current) clearInterval(trialCountdownIntervalRef.current);
      trialCountdownIntervalRef.current = window.setInterval(() => {
        const now = Date.now();
        const end = new Date(trialStatus.trialEndTime).getTime();
        const minutesRemaining = Math.max(0, Math.ceil((end - now) / 60000));
        setTrialStatus(prev => (prev ? { ...prev, minutesRemaining } : prev));
      }, 1000);

      return () => {
        if (trialCountdownIntervalRef.current) {
          clearInterval(trialCountdownIntervalRef.current);
          trialCountdownIntervalRef.current = null;
        }
      };
    }
  }, [trialStatus]);


  // Utility function to emit tab change events (can be used by dashboard components)
  const emitTabChange = (tabName: string, component: string) => {
    const event = new CustomEvent('tab-change', {
      detail: { tabName, component }
    });
    window.dispatchEvent(event);
  };

  // Make emitTabChange available globally for dashboard components
  (window as any).emitTabChange = emitTabChange;
  
  // Add global function to force data refresh
  (window as any).forceDataRefresh = () => {
    console.log('🔄 Global force data refresh triggered');
    setHasInitialDataLoaded(false);
    hasInitialDataLoadedRef.current = false;
    // Reinitialize auth to reload data
    // NOTE: We now attach the auth listener first (below) and then call
    // initializeAuth() later to avoid a race on mobile browsers where the
    // INITIAL_SESSION event can fire before the listener is attached.
  };
  
  // Add global function to reset auth state (for debugging)
  (window as any).resetAuthState = () => {
    console.log('🔄 Global auth state reset triggered');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setHasInitialDataLoaded(false);
    currentUserRef.current = null;
    isAuthenticatedRef.current = false;
    hasInitialDataLoadedRef.current = false;
    // Clear cookies
    setCookie('lastAuthUserId', '');
    setCookie('lastAuthTimestamp', '');
    // Reinitialize auth
    initializeAuth();
  };

  // Save view to cookie whenever it changes
  useEffect(() => {
    setCookie('currentView', view, 1); // 1 day expiry
  }, [view]);


  useEffect(() => {
    let isMounted = true;
    
    // Track focus/visibility timing to avoid instant re-inits on quick tab switches
    const lastHiddenAtRef = { current: 0 } as { current: number };
    const REFRESH_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
    
    const initializeAuth = async () => {
      try {
        console.log('Starting auth initialization...');
        
        // Remove timeout to prevent hanging
        // const authTimeout = new Promise((_, reject) => {
        //   setTimeout(() => reject(new Error('Auth initialization timeout')), 10000);
        // });
        
        const authPromise = (async () => {
          // Handle access token from email confirmation first
          const hash = window.location.hash;
          const searchParams = new URLSearchParams(window.location.search);
          
          // Check for access token in hash or query parameters
          let accessToken = null;
          if (hash.includes('access_token=')) {
            accessToken = hash.split('access_token=')[1]?.split('&')[0];
          } else if (searchParams.has('access_token')) {
            accessToken = searchParams.get('access_token');
          }
          
          if (accessToken) {
            console.log('Found access token in URL');
            try {
              console.log('Setting session with access token...');
              const { data, error } = await authService.supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: ''
              });
              
              if (error) {
                console.error('Error setting session:', error);
              } else if (data.user) {
                console.log('Session set successfully, handling email confirmation...');
                const { user, error: profileError } = await authService.handleEmailConfirmation();
                if (user && isMounted) {
                  console.log('Email confirmation successful, user:', user.email);
                  setCurrentUser(user);
                  setIsAuthenticated(true);
                  
              // (Payment lock after email confirmation removed – user can proceed directly)
                } else if (profileError) {
                  console.error('Email confirmation failed:', profileError);
                  // If profile creation failed, try to create it manually
                  console.log('Attempting to create profile manually...');
                  const { user: createdUser, error: createError } = await authService.createProfile(
                    data.user.user_metadata?.name || 'Unknown',
                    data.user.user_metadata?.role || 'Investor'
                  );
                  if (createdUser && isMounted) {
                    console.log('Profile created manually:', createdUser.email);
                    setCurrentUser(createdUser);
                    setIsAuthenticated(true);
                    
                    // (Payment lock after manual profile creation removed – user can proceed directly)
                  } else {
                    console.error('Manual profile creation failed:', createError);
                  }
                }
              }
              
              // Clean up the URL
              window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) {
              console.error('Error during email confirmation:', error);
            }
          }

          // Don't call getCurrentUser here - let the auth state listener handle it
          console.log('Auth initialization complete, waiting for auth state...');
        })();
        
        await authPromise;
        
      } catch (error) {
        console.error('Error in auth initialization:', error);
      } finally {
        // Don't set loading to false here - let the auth state change handle it
        if (isMounted) {
          console.log('Auth initialization complete');
        }
      }
    };

    // Visibility/focus handlers: DISABLED to prevent reload on tab switch
    // The old version didn't refresh on tab switch - only on actual long absences
    // We'll keep the tracking but not trigger refresh automatically
    const maybeRefreshAfterAway = () => {
      // DISABLED: Don't refresh on tab switch
      // Only track when user was away, but don't auto-refresh
      // Users can manually refresh if needed
      lastHiddenAtRef.current = 0;
    };

    const onHidden = () => { lastHiddenAtRef.current = Date.now(); };
    const onVisible = () => maybeRefreshAfterAway();
    const onFocus = () => maybeRefreshAfterAway();
    const onBlur = () => { lastHiddenAtRef.current = Date.now(); };

    const visibilityHandler = () => {
      if (document.hidden) onHidden(); else onVisible();
    };

    // Debounce focus to avoid rapid toggles
    let __focusDebounce: any = null;
    const debouncedFocus = () => {
      if (__focusDebounce) clearTimeout(__focusDebounce);
      __focusDebounce = setTimeout(() => { onFocus(); }, 300);
    };

    document.addEventListener('visibilitychange', visibilityHandler);
    window.addEventListener('focus', debouncedFocus);
    window.addEventListener('blur', onBlur);

    // Track if we received any auth event on first load
    let __initialAuthEventReceived = false;

    // Set up auth state listener
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      __initialAuthEventReceived = true;
      
      if (!isMounted) return;
      
      // Prevent unnecessary refreshes for TOKEN_REFRESHED events
      if (event === 'TOKEN_REFRESHED') {
        return;
      }
      
      // AGGRESSIVE FIX: Check ignoreAuthEvents FIRST before any processing (using ref for immediate check)
      if (ignoreAuthEventsRef.current || ignoreAuthEvents) {
        console.log('🚫 Ignoring auth event because ignoreAuthEvents flag is set');
        return;
      }
      
      // AGGRESSIVE FIX: If we already have data loaded and this is the same user, skip entirely
      // This prevents any reload or view reset on tab switch
      // CRITICAL FIX: Compare auth_user_id, not profile_id
      // currentUser.id is now profile_id, but session.user.id is auth_user_id
      // Get auth_user_id from current session to compare properly
      const { data: { user: currentAuthUser } } = await authService.supabase.auth.getUser();
      const currentAuthUserId = currentAuthUser?.id;
      
      if (hasInitialDataLoadedRef.current && 
          isAuthenticatedRef.current && 
          currentUserRef.current && 
          session?.user && 
          currentAuthUserId === session.user.id &&
          event !== 'SIGNED_OUT') {
        console.log('🚫 Data already loaded for this user, skipping auth event to prevent reload');
        return;
      }
      
      const microSteps = [
        `1. Auth event received: ${event}`,
        `2. Session user: ${session?.user?.email || 'none'}`,
        `3. Is authenticated: ${isAuthenticated}`,
        `4. Current user: ${currentUser?.email || 'none'}`,
        `5. Has initial data loaded: ${hasInitialDataLoaded}`,
        `6. Current view: ${view}`,
        `7. Is processing auth change: ${isProcessingAuthChange}`,
        `8. Ignore auth events: ${ignoreAuthEvents}`
      ];

      // Note: Duplicate auth event filtering is now handled at the Supabase level in auth.ts
      
        // Prevent multiple simultaneous auth state changes
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          // Check if we're already processing an auth state change
          if (isProcessingAuthChange) {
            console.log('Auth state change already in progress, skipping...');
            return;
          }
          
          // Additional check: if we already have the same user authenticated, skip
          // CRITICAL FIX: Compare auth_user_id, not profile_id
          if (isAuthenticatedRef.current && currentUserRef.current && session?.user && currentAuthUserId === session.user.id) {
            console.log('🚫 User already authenticated with same ID, skipping duplicate auth event');
            return;
          }
        
        // IMPROVED FIX: Only block duplicate auth events, not all auth events
        // CRITICAL FIX: Compare auth_user_id, not profile_id
        if (isAuthenticatedRef.current && currentUserRef.current && hasInitialDataLoadedRef.current && session?.user && currentAuthUserId === session.user.id) {
          // Only block token refresh duplicates; never block INITIAL_SESSION across tabs
          if (event === 'TOKEN_REFRESHED') {
            console.log('🚫 IMPROVED FIX: Blocking duplicate auth event to prevent unnecessary refresh');
            return;
          }
          // Allow other auth events to proceed (like profile updates, data changes)
          console.log('✅ Allowing auth event to proceed:', event);
        }
        
        // Check if this is a duplicate auth event using cookies
        const lastAuthUserId = getCookie('lastAuthUserId');
        const lastAuthTimestamp = getCookie('lastAuthTimestamp');
        const currentTime = Date.now().toString();
        
        console.log('🔍 Auth event debug:', {
          event,
          sessionUserId: session?.user?.id,
          lastAuthUserId,
          lastAuthTimestamp,
          currentTime,
          isAuthenticated: isAuthenticatedRef.current,
          currentUserId: currentUserRef.current?.id
        });
        
        if (session?.user && lastAuthUserId === session.user.id && lastAuthTimestamp) {
          const timeDiff = parseInt(currentTime) - parseInt(lastAuthTimestamp);
          console.log('🔍 Time difference:', timeDiff, 'ms');
          // If less than 30 seconds have passed AND we already have data loaded, it's likely a duplicate event from window focus
          // BUT do not skip during initial boot while the UI is still loading.
          if (timeDiff < 30000 && hasInitialDataLoadedRef.current) {
            if (isLoading) {
              console.log('ℹ️ Duplicate auth event during initial boot – proceeding to finish initialization');
            } else {
              console.log('🚫 Duplicate auth event detected (likely from tab switch), skipping to prevent refresh');
              return;
            }
          }
        }
        
        // Store current auth info in cookies
        if (session?.user) {
          setCookie('lastAuthUserId', session.user.id, 1); // 1 day expiry
          setCookie('lastAuthTimestamp', currentTime, 1);
          console.log('💾 Stored auth info in cookies:', { userId: session.user.id, timestamp: currentTime });
        }
        
        setIsProcessingAuthChange(true);
        
        try {
          if (session?.user) {
            // Check if email is confirmed before allowing login
            if (!session.user.email_confirmed_at) {
              console.log('Email not confirmed, signing out user');
              await authService.supabase.auth.signOut();
              setError('Please confirm your email before logging in. Check your inbox for the confirmation link.');
              return;
            }
            
            // Optimistic: set minimal user immediately so data hooks can proceed
            if (isMounted) {
              const minimalUser: any = {
                id: session.user.id,
                email: session.user.email || '',
                name: (session.user.user_metadata as any)?.name || 'Unknown',
                role: (session.user.user_metadata as any)?.role || 'Investor',
                registration_date: new Date().toISOString().split('T')[0]
              };
              setCurrentUser(minimalUser);
              setIsAuthenticated(true);
              // Only reset data-loaded flag if we don't already have data loaded
              // This prevents reload on tab switch
              if (!hasInitialDataLoadedRef.current) {
                setHasInitialDataLoaded(false);
                // Only fetch data if we don't already have it loaded
                try { fetchData(true).catch(() => {}); } catch {}
              }
              // Proactively fetch the user's startup by user_id to avoid blank state on mobile refresh
              // ONLY if we don't already have data loaded (prevents view reset on tab switch)
              if (!hasInitialDataLoadedRef.current) {
                (async () => {
                  try {
                    if ((minimalUser as any).role === 'Startup') {
                      console.log('🔍 Proactive fetch: loading startup by user_id after auth event...');
                      const { data: startupsByUser, error: startupsByUserError } = await authService.supabase
                        .from('startups')
                        .select('*')
                        .eq('user_id', session.user.id);
                      if (!startupsByUserError && startupsByUser && startupsByUser.length > 0) {
                        setStartups(startupsByUser as any);
                        setSelectedStartup(startupsByUser[0] as any);
                        setView('startupHealth');
                        setIsLoading(false);
                        // Persist startup_name to user profile to make next refresh instant
                        try {
                          // CRITICAL FIX: users table removed, use user_profiles instead
                          // Get the active profile_id for this auth user
                          const { data: sessionData } = await authService.supabase
                            .from('user_profile_sessions')
                            .select('current_profile_id')
                            .eq('auth_user_id', session.user.id)
                            .maybeSingle();
                          
                          if (sessionData?.current_profile_id) {
                            await authService.supabase
                              .from('user_profiles')
                              .update({ startup_name: (startupsByUser[0] as any).name })
                              .eq('id', sessionData.current_profile_id);
                          }
                        } catch {}
                      }
                    }
                  } catch (e) {
                    console.warn('⚠️ Proactive startup fetch failed (non-blocking):', e);
                  }
                })();
              }
            }

            // Get complete user data from database
            // Only fetch if we don't already have complete user data
            // AND only if we haven't already loaded it (prevents multiple calls on tab switch)
            if (isMounted && (!currentUserRef.current || !currentUserRef.current.role) && !hasInitialDataLoadedRef.current) {
              try {
                const completeUser = await authService.getCurrentUser();
                if (completeUser) {
                  console.log('✅ Complete user data loaded:', completeUser);
                  console.log('🔍 User startup_name from complete data:', completeUser.startup_name);
                  
                  // CRITICAL FIX: If startup_name is missing, try to fetch it from startups table
                  if (!completeUser.startup_name && completeUser.role === 'Startup') {
                    console.log('🔍 Startup user missing startup_name, attempting to fetch from startups table...');
                    try {
                      const { data: startupData, error: startupError } = await authService.supabase
                        .from('startups')
                        .select('name')
                        .eq('user_id', completeUser.id)
                        .maybeSingle();
                      
                      if (startupData && !startupError) {
                        console.log('✅ Found startup name from startups table:', startupData.name);
                        completeUser.startup_name = startupData.name;
                      } else {
                        console.log('❌ No startup found in startups table for user:', completeUser.id);
                      }
                    } catch (startupFetchError) {
                      console.error('❌ Error fetching startup name:', startupFetchError);
                    }
                  }
                  
                  // ADDITIONAL FIX: If user has startup_name but no startup record, create one
                  // BUT ONLY if profile is complete (Form 2 is done) - incomplete profiles should go to Form 2
                  if (completeUser.startup_name && completeUser.role === 'Startup') {
                    // Check if profile is complete before trying to create startup
                    const isProfileComplete = await authService.isProfileComplete(completeUser.id);
                    
                    if (!isProfileComplete) {
                      console.log('⏭️ Profile incomplete - skipping startup creation. User should complete Form 2 first.');
                      // Don't create startup - let Form 2 handle it when profile is completed
                      return;
                    }
                    
                    console.log('🔍 User has startup_name, checking if startup record exists...');
                    try {
                      // IMPORTANT: startups table uses auth_user_id, not profile ID!
                      const { data: { user: authUser } } = await authService.supabase.auth.getUser();
                      if (!authUser) {
                        console.error('❌ Cannot create startup: not authenticated');
                        return;
                      }
                      const authUserId = authUser.id;
                      
                      // Check for existing startup by user_id (more reliable)
                      const { data: existingStartup, error: startupCheckError } = await authService.supabase
                        .from('startups')
                        .select('id, name, user_id')
                        .eq('user_id', authUserId)  // Use auth_user_id, not profile ID!
                        .maybeSingle();
                      
                      // Also check by name as fallback (in case user_id check fails)
                      let existingStartupByName = null;
                      if (!existingStartup && completeUser.startup_name) {
                        const { data: startupByName } = await authService.supabase
                          .from('startups')
                          .select('id, name, user_id')
                          .eq('name', completeUser.startup_name)
                          .maybeSingle();
                        existingStartupByName = startupByName;
                      }
                      
                      const finalExistingStartup = existingStartup || existingStartupByName;
                      
                      if (!finalExistingStartup && !startupCheckError) {
                        console.log('🔍 No startup record found, creating one for user:', completeUser.startup_name);
                        console.log('🆕 Creating startup with auth_user_id:', authUserId, 'Profile ID:', completeUser.id);
                        
                        const { data: newStartup, error: createStartupError } = await authService.supabase
                          .from('startups')
                          .insert({
                            name: completeUser.startup_name || 'Unnamed Startup',
                            user_id: authUserId,  // Use auth_user_id, not profile ID!
                            sector: 'Unknown', // Default sector - will be updated when domain is selected
                            current_valuation: 0,
                            total_funding: 0,
                            total_revenue: 0,
                            compliance_status: 'Pending',
                            registration_date: new Date().toISOString().split('T')[0],
                            investment_type: 'Seed',
                            investment_value: 0,
                            equity_allocation: 0
                          } as any)
                          .select()
                          .single();
                        
                        if (newStartup && !createStartupError) {
                          console.log('✅ Created startup record:', newStartup);
                        } else if (createStartupError) {
                          // Handle 409 Conflict (startup already exists) or other errors
                          if (createStartupError.code === '23505' || createStartupError.message?.includes('duplicate') || createStartupError.message?.includes('409')) {
                            console.log('ℹ️ Startup already exists (409/duplicate), fetching existing startup...');
                            // Try to fetch the existing startup
                            const { data: existingStartup, error: fetchError } = await authService.supabase
                              .from('startups')
                              .select('*')
                              .eq('user_id', authUserId)
                              .maybeSingle();
                            
                            if (existingStartup && !fetchError) {
                              console.log('✅ Found existing startup:', existingStartup);
                            } else {
                              console.error('❌ Error fetching existing startup:', fetchError);
                            }
                          } else {
                            console.error('❌ Error creating startup record:', createStartupError);
                            console.error('❌ Startup creation failed. Details:', {
                              error: createStartupError,
                              user_id: completeUser.id,
                              startup_name: completeUser.startup_name,
                              user_role: completeUser.role
                            });
                          }
                        }
                      } else if (finalExistingStartup) {
                        console.log('✅ Startup record already exists:', finalExistingStartup.name);
                      }
                    } catch (startupRecordError) {
                      console.error('❌ Error checking/creating startup record:', startupRecordError);
                    }
                  }
                  
                  setCurrentUser(completeUser);
                  setIsAuthenticated(true);
                  setIsLoading(false);
                } else {
                  console.log('❌ Could not load complete user data, creating basic profile...');
                  
                  // Create a basic profile for users who don't have one
                  // CRITICAL FIX: users table removed, use user_profiles instead
                  try {
                    const { data: newProfile, error: createError } = await authService.supabase
                      .from('user_profiles')
                      .insert({
                        auth_user_id: session.user.id,  // Use auth_user_id, not id
                        email: session.user.email,
                        name: session.user.user_metadata?.name || 'Unknown',
                        role: session.user.user_metadata?.role || 'Investor',
                        startup_name: session.user.user_metadata?.startupName || null,
                        registration_date: new Date().toISOString().split('T')[0]
                      })
                      .select()
                      .single();
                    
                    if (newProfile && !createError) {
                      console.log('✅ Created new user profile:', newProfile);
                      
                      // CRITICAL FIX: Create session entry to set this as active profile
                      try {
                        await authService.supabase
                          .from('user_profile_sessions')
                          .upsert({
                            auth_user_id: session.user.id,
                            current_profile_id: newProfile.id
                          }, {
                            onConflict: 'auth_user_id'
                          });
                        console.log('✅ Created user_profile_sessions entry');
                      } catch (sessionError) {
                        console.error('❌ Error creating session entry:', sessionError);
                      }
                      
                      // Map the profile to AuthUser format
                      const mappedUser: AuthUser = {
                        id: newProfile.id, // profile_id
                        email: newProfile.email,
                        name: newProfile.name,
                        role: newProfile.role,
                        startup_name: newProfile.startup_name,
                        registration_date: newProfile.registration_date
                      };
                      
                      setCurrentUser(mappedUser);
                      setIsAuthenticated(true);
                      setIsLoading(false);
                      
                      // For new users, redirect to Form 2 to complete their profile
                      if (newProfile.role === 'Startup') {
                        console.log('🔄 New startup user created, redirecting to Form 2');
                        setCurrentPage('complete-registration');
                        return;
                      }
                    } else {
                      console.error('❌ Error creating user profile:', createError);
                      throw createError;
                    }
                  } catch (profileCreateError) {
                    console.error('❌ Failed to create user profile, using basic user:', profileCreateError);
                    const basicUser: AuthUser = {
                      id: session.user.id,
                      email: session.user.email || '',
                      name: session.user.user_metadata?.name || 'Unknown',
                      role: session.user.user_metadata?.role || 'Investor',
                      startup_name: session.user.user_metadata?.startupName || undefined,
                      registration_date: new Date().toISOString().split('T')[0]
                    };
                    setCurrentUser(basicUser);
                    setIsAuthenticated(true);
                    setIsLoading(false);
                  }
                }
              } catch (error) {
                console.error('❌ Error loading complete user data:', error);
                const basicUser: AuthUser = {
                  id: session.user.id,
                  email: session.user.email || '',
                  name: session.user.user_metadata?.name || 'Unknown',
                  role: session.user.user_metadata?.role || 'Investor',
                  startup_name: session.user.user_metadata?.startupName || undefined,
                  registration_date: new Date().toISOString().split('T')[0]
                };
                setCurrentUser(basicUser);
                setIsAuthenticated(true);
                setIsLoading(false);
              }
              
              // Only reset data loading flag if this is a truly new user
              if (!hasInitialDataLoaded) {
                setHasInitialDataLoaded(false);
              }
            }

            // Try to get full profile, and if it doesn't exist, create it automatically
            // ONLY if we don't already have data loaded (prevents reload on tab switch)
            if (!hasInitialDataLoadedRef.current) {
              (async () => {
                try {
                  console.log('Fetching full profile after sign-in...');
                  let profileUser = await authService.getCurrentUser();
                
                if (!profileUser) {
                  console.log('Profile not found, attempting to create it automatically...');
                  // Profile doesn't exist, try to create it from user metadata
                  const metadata = session.user.user_metadata;
                  if (metadata?.name && metadata?.role) {
                    console.log('Creating profile automatically with metadata:', { name: metadata.name, role: metadata.role });
                    
                    // Profile creation from metadata is deprecated - users should use registration flow
                    // This will not work with user_profiles (requires proper profile creation flow)
                    console.warn('⚠️ Automatic profile creation from metadata is deprecated. User should complete registration.');
                    // Don't create profile - let user complete registration
                    // Profile must be created through verify-otp.ts registration flow
                  }
                }
                
                if (profileUser && isMounted && !hasInitialDataLoadedRef.current) {
                  console.log('Full profile loaded. Updating currentUser with startup_name:', profileUser.startup_name);
                  
                  // Check if profile is complete using the proper method
                  const isProfileComplete = await authService.isProfileComplete(profileUser.id);
                  console.log('Profile completion status:', isProfileComplete);
                  
                  // Check if profile is complete before setting as authenticated
                  // BUT: Don't redirect to complete-registration if this is an invite flow (user needs to set password first)
                  if (!isProfileComplete) {
                    const advisorCode = getQueryParam('advisorCode');
                    const pageParam = getQueryParam('page');
                    const isResetPasswordPage = currentPage === 'reset-password' || 
                                               window.location.href.includes('reset-password') ||
                                               pageParam === 'reset-password';
                    
                    // If this is an invite flow, ALWAYS redirect to reset-password page (user needs to set password via OTP first)
                    // This applies even if they're on complete-registration - they must set password first
                    if (advisorCode) {
                      // Only redirect if we're NOT already on reset-password page
                      if (!isResetPasswordPage) {
                        console.log('📧 Invite flow detected - user needs to set password first, redirecting to reset-password page');
                        setCurrentUser(profileUser);
                        const email = getQueryParam('email');
                        if (email) {
                          const encodedEmail = encodeURIComponent(email);
                          window.location.href = `/?page=reset-password&advisorCode=${advisorCode}&email=${encodedEmail}`;
                        } else {
                          window.location.href = `/?page=reset-password&advisorCode=${advisorCode}`;
                        }
                        setIsLoading(false);
                        setIsProcessingAuthChange(false);
                        return; // Don't redirect to complete-registration, go to reset-password first
                      } else {
                        // Already on reset-password page, just stay there
                        console.log('📧 Invite flow detected - user is on reset-password page, staying here');
                        setCurrentUser(profileUser);
                        setIsLoading(false);
                        setIsProcessingAuthChange(false);
                        return; // Don't redirect, let user set password first
                      }
                    }
                    
                    console.log('Profile not complete, redirecting to complete-registration page');
                    setCurrentUser(profileUser);
                    setCurrentPage('complete-registration');
                    setIsLoading(false);
                    setIsProcessingAuthChange(false);
                    return;
                  }
                  
                  setCurrentUser(profileUser);
                }
              } catch (e) {
                console.error('Failed to load/create full user profile after sign-in (non-blocking):', e);
              } finally {
                // Reset the flag when done
                if (isMounted) {
                  setIsProcessingAuthChange(false);
                }
              }
            })();
            }
          } else {
            // No existing session; show login page
            if (isMounted) {
              setCurrentUser(null);
              setIsAuthenticated(false);
              setIsLoading(false);
              setIsProcessingAuthChange(false);
            }
          }
        } catch (error) {
          console.error('Error processing auth state change:', error);
          if (isMounted) {
            setIsProcessingAuthChange(false);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setCurrentUser(null);
          setAssignedInvestmentAdvisor(null);
          setIsAuthenticated(false);
          setIsLoading(false);
          setIsProcessingAuthChange(false);
          setHasInitialDataLoaded(false); // Reset data loading flag on logout
        }
      }
    });

      // Remove the loading timeout - it's causing issues
  // const timeoutId = setTimeout(() => {
  //   if (isMounted && isLoading) {
  //     console.log('Loading timeout reached, setting loading to false');
  //     setIsLoading(false);
  //   }
  // }, 10000); // 10 seconds timeout

    // After listener is attached, kick off initialization (prevents mobile race)
    initializeAuth();

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      document.removeEventListener('visibilitychange', visibilityHandler);
      window.removeEventListener('focus', debouncedFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);


  // Fetch assigned investment advisor data
  const fetchAssignedInvestmentAdvisor = useCallback(async (advisorCode: string) => {
    try {
      console.log('🔍 Fetching investment advisor data for code:', advisorCode);
      // CRITICAL FIX: Use investmentService.getInvestmentAdvisorByCode instead of direct query
      // This handles both old (users) and new (user_profiles) registrations
      const advisor = await investmentService.getInvestmentAdvisorByCode(advisorCode);
      
      if (!advisor) {
        console.error('❌ Error fetching investment advisor: Not found');
        return null;
      }
      
      console.log('✅ Found assigned investment advisor:', advisor);
      console.log('🔍 Advisor logo_url:', advisor.logo_url);
      console.log('🔍 Advisor has logo:', !!advisor.logo_url);
      console.log('🔍 Advisor firm_name:', advisor.firm_name);
      setAssignedInvestmentAdvisor(advisor);
      return advisor;
    } catch (error) {
      console.error('❌ Error in fetchAssignedInvestmentAdvisor:', error);
      return null;
    }
  }, []);

  // Fetch data function - simplified without window monitoring
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticatedRef.current || !currentUserRef.current) {
      return;
    }
    
    // Don't fetch data if we already have it and this isn't a forced refresh
    if (hasInitialDataLoadedRef.current && !forceRefresh) {
      return;
    }
    
    let didSucceed = false;
    // Phase 0: for Startup role, load startup FIRST and show dashboard immediately
    const cu = currentUserRef.current;
    if (cu?.role === 'Startup' && !selectedStartupRef.current) {
      try {
        // IMPORTANT: startups table uses auth_user_id, not profile ID!
        // Get auth_user_id from auth session
        const { data: { user: authUser } } = await authService.supabase.auth.getUser();
        if (!authUser) {
          console.warn('No auth user found, skipping startup fetch');
          return;
        }
        const authUserId = authUser.id;
        console.log('🔍 Fetching startup for auth_user_id:', authUserId, 'Profile ID:', cu.id, 'Profile startup_name:', cu.startup_name);
        
        // CRITICAL FIX: First try to find startup by user_id only (more flexible)
        // This handles cases where startup name might differ slightly
        let query = authService.supabase
          .from('startups')
          .select('id, name, user_id, sector, current_valuation, total_funding, total_revenue, compliance_status, registration_date, investment_type, investment_value, equity_allocation, currency')
          .eq('user_id', authUserId);  // Use auth_user_id, not profile ID!
        
        const { data: startupsByUserId, error: queryErr } = await query;
        
        let row: any = null;
        if (startupsByUserId && startupsByUserId.length > 0) {
          // If multiple startups for this user, prefer the one matching startup_name
          if (cu.startup_name && startupsByUserId.length > 1) {
            const matchedByName = startupsByUserId.find((s: any) => s.name === cu.startup_name);
            row = matchedByName || startupsByUserId[0]; // Use matched one or first one
          } else {
            row = startupsByUserId[0]; // Use first (and likely only) startup
          }
          console.log('✅ Found startup by user_id:', (row as any).name);
        } else if (queryErr) {
          console.error('❌ Error fetching startup in Phase 0:', queryErr);
        } else if (cu.startup_name) {
          // Fallback: If not found by user_id, try by name (in case user_id is wrong)
          console.log('🔍 No startup found by user_id, trying by name:', cu.startup_name);
          const { data: startupByName, error: nameErr } = await authService.supabase
            .from('startups')
            .select('id, name, user_id, sector, current_valuation, total_funding, total_revenue, compliance_status, registration_date, investment_type, investment_value, equity_allocation, currency')
            .eq('name', cu.startup_name)
            .maybeSingle();
          
          if (startupByName && !nameErr) {
            row = startupByName;
            console.log('✅ Found startup by name:', row.name);
          }
        }
        
        if (row) {
          console.log('✅ Setting startup:', row.name);
          // Map database fields to Startup interface format
          const mappedStartup: Startup = {
            id: row.id,
            name: row.name,
            investmentType: row.investment_type || 'Unknown',
            investmentValue: Number(row.investment_value) || 0,
            equityAllocation: Number(row.equity_allocation) || 0,
            currentValuation: Number(row.current_valuation) || 0,
            complianceStatus: row.compliance_status || 'Pending',
            sector: row.sector || 'Unknown',
            totalFunding: Number(row.total_funding) || 0,
            totalRevenue: Number(row.total_revenue) || 0,
            registrationDate: row.registration_date || '', // Map registration_date to registrationDate
            currency: row.currency || undefined, // Will be set from profile if not in startup table
            country_of_registration: row.country_of_registration || row.country,
            country: row.country,
            founders: []
          } as any;
          // Load profile data to ensure currency and other profile fields are available
          try {
            const { profileService } = await import('./lib/profileService');
            const profileData = await profileService.getStartupProfile(row.id);
            if (profileData) {
              // Update startup with profile data including currency
              mappedStartup.profile = profileData;
              // Add subsidiaries and international operations directly to startup object
              mappedStartup.subsidiaries = profileData.subsidiaries || [];
              mappedStartup.internationalOps = profileData.internationalOps || [];
              console.log('✅ Subsidiaries loaded in initial fetch:', {
                subsidiariesCount: profileData.subsidiaries?.length || 0,
                internationalOpsCount: profileData.internationalOps?.length || 0,
                subsidiaries: profileData.subsidiaries,
                internationalOps: profileData.internationalOps
              });
              // Priority: startup.currency > profile.currency > USD
              if (!mappedStartup.currency) {
                mappedStartup.currency = profileData.currency || 'USD';
                console.log('💰 Currency set from profile:', mappedStartup.currency);
              } else {
                console.log('💰 Currency from startup table:', mappedStartup.currency);
              }
            }
          } catch (profileError) {
            console.warn('⚠️ Could not load profile data on initial startup fetch:', profileError);
            // Fallback to USD if profile load fails
            if (!mappedStartup.currency) {
              mappedStartup.currency = 'USD';
            }
          }
          
          setStartups([mappedStartup]);
          setSelectedStartup(mappedStartup);
          setIsLoading(false);
          setView('startupHealth');
          // Load other data in background without blocking
          (async () => {
            try {
              const bgOffers = await investmentService.getOffersForStartup(row.id);
              setInvestmentOffers(bgOffers);
            } catch {}
          })();
          // Mark as loaded so main batch doesn't run for Startup users
          setHasInitialDataLoaded(true);
          return;
        }
      } catch (error) {
        console.error('❌ Exception in Phase 0 startup fetch:', error);
      }
    }
    try {
      console.log('Fetching data for authenticated user...', { forceRefresh, hasInitialDataLoaded: hasInitialDataLoadedRef.current });
      
      // Fetch data with timeout to detect network issues
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - network may be unavailable')), 45000); // 45s timeout for mobile
      });

             // Determine startup fetching method based on role (skip if already loaded for Startup)
         let startupPromise;
         if (currentUserRef.current?.role === 'Startup' && selectedStartupRef.current) {
           startupPromise = Promise.resolve([selectedStartupRef.current]);
         } else if (currentUserRef.current?.role === 'Admin') {
           console.log('🔍 Using getAllStartupsForAdmin for Admin role');
           startupPromise = startupService.getAllStartupsForAdmin();
         } else if (currentUserRef.current?.role === 'Investment Advisor') {
           console.log('🔍 Using getAllStartupsForInvestmentAdvisor for Investment Advisor role');
           startupPromise = startupService.getAllStartupsForInvestmentAdvisor();
         } else if (currentUserRef.current?.role === 'CA') {
           startupPromise = caService.getAssignedStartups().then(startups => 
             startups.map(s => ({
               id: s.id,
               name: s.name,
               investmentType: 'Seed' as any,
               investmentValue: s.totalFunding || 0,
               equityAllocation: 0,
               currentValuation: s.totalFunding || 0,
               complianceStatus: s.complianceStatus,
               sector: s.sector,
               totalFunding: s.totalFunding,
               totalRevenue: s.totalRevenue,
               registrationDate: s.registrationDate,
               founders: []
             }))
           );
         } else if (currentUserRef.current?.role === 'CS') {
           startupPromise = csService.getAssignedStartups().then(startups =>
             startups.map(s => ({
               id: s.id,
               name: s.name,
               investmentType: 'Seed' as any,
               investmentValue: s.totalFunding || 0,
               equityAllocation: 0,
               currentValuation: s.totalFunding || 0,
               complianceStatus: s.complianceStatus,
               sector: s.sector,
               totalFunding: s.totalFunding,
               totalRevenue: s.totalRevenue,
               registrationDate: s.registrationDate,
               founders: []
             }))
           );
         } else {
           console.log('🔍 Using default startup fetching for role:', currentUserRef.current?.role);
           startupPromise = startupService.getAllStartups();
         }

         const dataPromise = Promise.allSettled([
           startupPromise,
           investmentService.getNewInvestments(),
         userService.getStartupAdditionRequests(),
         // Fetch all users if user is Admin or Investment Advisor (advisors need users to match startups with their profiles)
         (currentUserRef.current?.role === 'Admin' || currentUserRef.current?.role === 'Investment Advisor') 
           ? userService.getAllUsers() 
           : Promise.resolve([]),
         verificationService.getVerificationRequests(),
         currentUserRef.current?.role === 'Investor' 
           ? investmentService.getUserInvestmentOffers(currentUserRef.current.email)
           : currentUserRef.current?.role === 'Admin'
             ? investmentService.getAllInvestmentOffers()
             : Promise.resolve([]),
         validationService.getAllValidationRequests()
       ]);

       const [startupsData, investmentsData, requestsData, usersData, verificationData, offersData, validationData] = await Promise.race([
         dataPromise,
         timeoutPromise
       ]) as any;

             // Set data with fallbacks
       let baseStartups = startupsData.status === 'fulfilled' ? startupsData.value : [];
       const requests = requestsData.status === 'fulfilled' ? requestsData.value : [];

       // If investor, augment portfolio with approved requests
      // Use currentUserRef.current instead of currentUser since currentUser might be undefined during fetch
      const actualCurrentUser = currentUserRef.current || currentUser;
      if (actualCurrentUser?.role === 'Investor' && Array.isArray(requests)) {
        const investorCode = (actualCurrentUser as any)?.investor_code || (actualCurrentUser as any)?.investorCode;
        console.log('🔍 Filtering approved startup requests for investor:', {
          investorCode,
          totalRequests: requests.length,
          requestsWithStatus: requests.map((r: any) => ({ id: r.id, name: r.name, status: r.status, investor_code: r.investor_code }))
        });
        
        const approvedNames = requests
          .filter((r: any) => {
            const status = (r.status || 'pending');
            const isApproved = status === 'approved';
            const matchesCode = !investorCode || !r?.investor_code || (r.investor_code === investorCode || r.investorCode === investorCode);
            
            console.log('🔍 Checking request:', {
              id: r.id,
              name: r.name,
              status,
              isApproved,
              investor_code: r.investor_code,
              userCode: investorCode,
              matchesCode,
              willInclude: isApproved && matchesCode
            });
            
            return isApproved && matchesCode;
          })
          .map((r: any) => r.name)
          .filter((n: any) => !!n);
        
        console.log('✅ Approved startup names for portfolio:', approvedNames);
        
        if (approvedNames.length > 0) {
          const canonical = await startupService.getStartupsByNames(approvedNames);
          console.log('✅ Found startups for approved requests:', canonical.map((s: any) => s.name));
          
          // Merge unique by name (not id) to prevent duplicates
          const byName: Record<string, any> = {};
          
          // First add existing startups
          baseStartups.forEach((s: any) => { 
            if (s && s.name) byName[s.name] = s; 
          });
          
          // Then add approved startups (overwrite if duplicate name)
          canonical.forEach((s: any) => { 
            if (s && s.name) {
              console.log('✅ Adding approved startup to portfolio:', s.name);
              byName[s.name] = s; 
            }
          });
          
          baseStartups = Object.values(byName) as any[];
          console.log('✅ Final portfolio size:', baseStartups.length);
        }
      }

       setStartups(baseStartups);
       setNewInvestments(investmentsData.status === 'fulfilled' ? investmentsData.value : []);
       setStartupAdditionRequests(requests);
       setUsers(usersData.status === 'fulfilled' ? usersData.value : []);
       setVerificationRequests(verificationData.status === 'fulfilled' ? verificationData.value : []);
       setInvestmentOffers(offersData.status === 'fulfilled' ? offersData.value : []);
       
       // Debug: Log investment offers data
       if (process.env.NODE_ENV === 'development') {
         console.log('🔍 Investment Offers Debug:', {
           status: offersData.status,
           count: offersData.status === 'fulfilled' ? offersData.value?.length : 0,
           sample: offersData.status === 'fulfilled' ? offersData.value?.slice(0, 3) : []
         });
       }
       setValidationRequests(validationData.status === 'fulfilled' ? validationData.value : []);

       // Fetch pending relationships for Investment Advisors
       if (currentUser?.role === 'Investment Advisor' && currentUser?.id) {
         try {
           // CRITICAL FIX: getPendingInvestmentAdvisorRelationships expects auth_user_id, not profile_id
           const { data: { user: authUser } } = await authService.supabase.auth.getUser();
           const authUserId = authUser?.id;
           if (!authUserId) {
             console.error('❌ No auth user found for pending relationships');
             return;
           }
           console.log('🔍 Fetching pending relationships for Investment Advisor:', authUserId);
           const pendingRelationshipsData = await investmentService.getPendingInvestmentAdvisorRelationships(authUserId);
           setPendingRelationships(pendingRelationshipsData);
           console.log('🔍 Pending relationships loaded:', pendingRelationshipsData.length);
         } catch (error) {
           console.error('❌ Error fetching pending relationships:', error);
           setPendingRelationships([]);
         }
       } else {
         setPendingRelationships([]);
       }

      console.log('Data fetched successfully!');
      console.log('Startups loaded:', startupsData.status === 'fulfilled' ? startupsData.value.length : 0);
      console.log('Users loaded:', usersData.status === 'fulfilled' ? usersData.value.length : 0);
      console.log('Current user role:', currentUser?.role);
      didSucceed = true;
      
      // Fetch assigned investment advisor if user has one
      console.log('🔍 Checking for investment advisor code...');
      console.log('🔍 Current user:', currentUserRef.current);
      console.log('🔍 Investment advisor code entered:', currentUserRef.current?.investment_advisor_code_entered);
      
      if (currentUserRef.current?.investment_advisor_code_entered) {
        console.log('🔍 User has assigned investment advisor code:', currentUserRef.current.investment_advisor_code_entered);
        const advisorResult = await fetchAssignedInvestmentAdvisor(currentUserRef.current.investment_advisor_code_entered);
        console.log('🔍 Advisor fetch result:', advisorResult);
      } else {
        console.log('🔍 User has no assigned investment advisor');
        setAssignedInvestmentAdvisor(null);
      }
      
      // For startup users, automatically find their startup
      if (currentUserRef.current?.role === 'Startup' && startupsData.status === 'fulfilled') {
        console.log('🔍 Auto-finding startup for user:', currentUserRef.current.email);
        console.log('🔍 User startup_name:', currentUserRef.current.startup_name);
        console.log('🔍 Available startups:', startupsData.value.map(s => ({ name: s.name, id: s.id })));
        console.log('🔍 Current selectedStartup:', selectedStartupRef.current?.name, selectedStartupRef.current?.id);
        
        // CRITICAL FIX: Verify selectedStartup matches current profile's startup_name
        // If it doesn't match, clear it and re-match
        if (selectedStartupRef.current) {
          const currentStartupName = currentUserRef.current.startup_name;
          const selectedStartupName = selectedStartupRef.current.name;
          
          if (currentStartupName && selectedStartupName !== currentStartupName) {
            console.log('⚠️ Selected startup does not match profile startup_name!');
            console.log('⚠️ Profile startup_name:', currentStartupName);
            console.log('⚠️ Selected startup name:', selectedStartupName);
            console.log('🔄 Clearing selectedStartup to re-match based on profile');
            setSelectedStartup(null);
            selectedStartupRef.current = null;
          }
        }
        
        // If no selectedStartup, find it based on profile's startup_name
        if (!selectedStartupRef.current) {
          // Primary: match by startup_name from user profile
          let userStartup = startupsData.value.find(startup => startup.name === currentUserRef.current.startup_name);

          // Fallback: if startup_name missing or mismatch, but user has exactly one startup, use it
          if (!userStartup && startupsData.value.length === 1) {
            console.log('🔁 Fallback: selecting the only startup available for this user');
            userStartup = startupsData.value[0];
          }
          
          console.log('🔍 Auto-found startup:', userStartup);
          
          if (userStartup) {
            setSelectedStartup(userStartup);
            // Only set view to startupHealth on initial load, not on subsequent data fetches
            if (!hasInitialDataLoadedRef.current) {
              setView('startupHealth');
            }
          } else {
            console.warn('⚠️ No startup found matching profile startup_name:', currentUserRef.current.startup_name);
          }
        } else {
          // Update selectedStartup with fresh data from the startups array
          const updatedStartup = startupsData.value.find(s => s.id === selectedStartupRef.current?.id);
          if (updatedStartup) {
            console.log('🔄 Updating selectedStartup with fresh data from database');
            setSelectedStartup(updatedStartup);
          } else {
            console.warn('⚠️ Selected startup not found in startups array, clearing it');
            setSelectedStartup(null);
            selectedStartupRef.current = null;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      
      // Set empty arrays if data fetch fails
      setStartups([]);
      setNewInvestments([]);
      setStartupAdditionRequests([]);
      setUsers([]);
      setVerificationRequests([]);
      setInvestmentOffers([]);
    } finally {
      // Only set loading to false if we're still in loading state
      setIsLoading(false);
      // Mark that initial data has been loaded ONLY on success; leave false on error to allow retries
      if (didSucceed) {
        setHasInitialDataLoaded(true);
      }
    }
  }, [fetchAssignedInvestmentAdvisor]);

  // Fetch data when authenticated - with small post-refresh delay for mobile
  useEffect(() => {
    if (isAuthenticated && currentUser && !hasInitialDataLoaded) {
      const t = setTimeout(() => { fetchData(); }, 400); // 400ms debounce after refresh
      return () => clearTimeout(t);
    }
  }, [isAuthenticated, currentUser?.id, hasInitialDataLoaded]);

  // Watchdog: if authenticated but data hasn't loaded within 15s, retry fetch a few times
  useEffect(() => {
    if (!isAuthenticated || !currentUser || hasInitialDataLoaded) return;
    let cancelled = false;
    const backoffs = [1000, 2000, 4000, 8000, 16000, 32000]; // ~63s total
    let idx = 0;
    const schedule = () => {
      if (cancelled || hasInitialDataLoadedRef.current) return;
      const delay = backoffs[Math.min(idx, backoffs.length - 1)];
      setTimeout(async () => {
        if (cancelled || hasInitialDataLoadedRef.current) return;
        idx += 1;
        try {
          console.log(`⏳ Data watchdog retry (backoff ${delay}ms), attempt ${idx}`);
          await fetchData(true);
        } catch {}
        if (!cancelled && !hasInitialDataLoadedRef.current && idx < backoffs.length) {
          schedule();
        }
      }, delay);
    };
    schedule();
    return () => { cancelled = true; };
  }, [isAuthenticated, currentUser?.id, hasInitialDataLoaded]);

  // Listen for offer stage updates and refresh investor offers
  useEffect(() => {
    const handleOfferStageUpdate = async (event: CustomEvent) => {
      const detail = event.detail;
      console.log('🔔 Offer stage updated event received:', detail);
      
      // Only refresh if current user is an Investor
      if (currentUser?.role === 'Investor' && currentUser?.email) {
        console.log('🔄 Refreshing investor offers after stage update...');
        try {
          // Use getUserInvestmentOffers which is what App.tsx uses
          const refreshedOffers = await investmentService.getUserInvestmentOffers(currentUser.email);
          console.log('✅ Refreshed offers:', refreshedOffers.length);
          setInvestmentOffers(refreshedOffers);
        } catch (error) {
          console.error('❌ Error refreshing offers after stage update:', error);
        }
      }
    };

    window.addEventListener('offerStageUpdated', handleOfferStageUpdate as EventListener);
    
    return () => {
      window.removeEventListener('offerStageUpdated', handleOfferStageUpdate as EventListener);
    };
  }, [currentUser?.role, currentUser?.email]);

  // Set ignore flag when user is fully authenticated and has data
  // This prevents auth events from triggering reloads on tab switch
  useEffect(() => {
    if (isAuthenticated && currentUser && hasInitialDataLoaded) {
      console.log('✅ User fully authenticated with data loaded, setting ignoreAuthEvents flag');
      setIgnoreAuthEvents(true);
      // Also update the ref immediately for synchronous checks in auth handler
      ignoreAuthEventsRef.current = true;
    } else {
      setIgnoreAuthEvents(false);
      ignoreAuthEventsRef.current = false;
    }
  }, [isAuthenticated, currentUser, hasInitialDataLoaded]);


  // Load startup-scoped offers after startup is resolved to avoid being overwritten by global fetch
  useEffect(() => {
    (async () => {
      if (currentUser?.role === 'Startup' && selectedStartup?.id) {
        const rows = await investmentService.getOffersForStartup(selectedStartup.id);
        setInvestmentOffers(rows);
      }
    })();
  }, [selectedStartup?.id]);



  const handleLogin = useCallback(async (user: AuthUser) => {
    // Check if user logged in with advisorCode (from invite flow)
    const advisorCode = getQueryParam('advisorCode');
    if (advisorCode) {
      console.log('🔗 User logged in with advisorCode, redirecting to Form 2:', advisorCode);
      setIsAuthenticated(true);
      setCurrentUser(user);
      // Redirect to Form 2 after login
      setCurrentPage('complete-registration');
      // Keep advisorCode in URL
      setQueryParam('page', 'complete-registration', false);
      return; // Don't proceed with normal login flow, let Form 2 handle it
    }
    
    // Check if there's a redirect URL stored (e.g., from public startup page)
    const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
    if (redirectUrl) {
      sessionStorage.removeItem('redirectAfterLogin');
      // Redirect to the stored URL (e.g., public startup page)
      window.location.href = redirectUrl;
      return;
    }
    console.log(`User ${user.email} logged in as ${user.role}`);
    setIsAuthenticated(true);
    setCurrentUser(user);
    
    // Check for returnUrl to redirect back to program view
    const returnUrl = getQueryParam('returnUrl');
    if (returnUrl) {
      console.log('🔄 Redirecting to returnUrl:', returnUrl);
      window.location.href = returnUrl;
      return;
    }
    
    // For non-startup users, set the view after data is loaded
    if (user.role !== 'Startup') {
      setView('investor'); // Default view for non-startup users
    }
  }, []);

  const handleRegister = useCallback((user: AuthUser, foundersData: Founder[], startupName?: string, investmentAdvisorCode?: string) => {
    console.log(`User ${user.email} registered as ${user.role}`);
    
    if (user.role === 'Startup' && foundersData.length > 0) {
        console.log('Registering with founders:', foundersData);
        const newStartup: Startup = {
            id: Date.now(),
            name: startupName || "Newly Registered Co",
            investmentType: InvestmentType.Seed,
            investmentValue: 0,
            equityAllocation: 0,
            currentValuation: 0,
            complianceStatus: ComplianceStatus.Pending,
            sector: "Unknown",
            totalFunding: 0,
            totalRevenue: 0,
            registrationDate: new Date().toISOString().split('T')[0],
            founders: foundersData,
        };
        setStartups(prev => [newStartup, ...prev]);
        setSelectedStartup(newStartup);
        setView('startupHealth');
    }
     
    handleLogin(user);
  }, [handleLogin]);

  const handleLogout = useCallback(async () => {
    try {
      console.log('🚪 Logging out user...');
      
      // Sign out and clear cache (signOut already clears cache, but doing it here too for safety)
      await authService.signOut();
      authService.clearCache(); // Extra safety - ensure cache is cleared
      
      // Clear all application state
      setIsAuthenticated(false);
      setCurrentUser(null);
      setAssignedInvestmentAdvisor(null);
      setSelectedStartup(null);
      setCurrentPage('login');
      setView('investor');
      setHasInitialDataLoaded(false); // Reset data loading flag on logout
      setIgnoreAuthEvents(false); // Reset ignore flag on logout
      
      // Clear auth cookies on logout
      deleteCookie('lastAuthUserId');
      deleteCookie('lastAuthTimestamp');
      deleteCookie('currentView');
      
      // Clear any localStorage/sessionStorage that might contain user data
      // Note: Be careful not to clear everything as some data might be needed
      // Only clear auth-related data
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('auth') || key.includes('user') || key.includes('profile'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('✅ Cleared auth-related localStorage items');
      } catch (storageError) {
        console.warn('Could not clear localStorage:', storageError);
      }
      
      console.log('✅ Logout complete - all data cleared');
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, clear cache and state for security
      authService.clearCache();
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  }, []);

  const handleViewStartup = useCallback((startup: Startup | number, targetTab?: string) => {
    // logDiagnostic disabled to prevent interference
    
    // Handle both startup object and startup ID
    let startupObj: Startup;
    if (typeof startup === 'number') {
      // Find startup by ID
      startupObj = startupsRef.current.find(s => s.id === startup);
      if (!startupObj) {
        console.error('Startup not found with ID:', startup, 'in available startups:', startupsRef.current.map(s => ({ id: s.id, name: s.name })));
        // Fetch from database as a fallback for all roles (including Investor)
        console.log('🔍 Fallback: fetching startup from database for direct view access...');
        handleFacilitatorStartupAccess(startup, targetTab);
        return;
      }
    } else {
      startupObj = startup;
    }
    
    // For investors and investment advisors, always fetch fresh, enriched startup data from DB so all fields are populated
    if (currentUser?.role === 'Investor' || currentUser?.role === 'Investment Advisor') {
      console.log('🔍 Investor access: fetching enriched startup data for view');
      handleFacilitatorStartupAccess(startupObj.id, targetTab);
      return;
    }
    
    console.log('🔍 Setting selectedStartup to:', startupObj);
    
    // Set view-only mode based on user role
    const isViewOnlyMode = currentUser?.role === 'CA' || currentUser?.role === 'CS' || currentUser?.role === 'Startup Facilitation Center' || currentUser?.role === 'Investor' || currentUser?.role === 'Investment Advisor';
    console.log('🔍 Setting isViewOnly to:', isViewOnlyMode);
    
    // Set the startup and view
    setSelectedStartup(startupObj);
    setIsViewOnly(isViewOnlyMode);
    // logDiagnostic disabled to prevent interference
    setView('startupHealth');
    
    // If facilitator is accessing, set the target tab
    if (currentUser?.role === 'Startup Facilitation Center' && targetTab) {
      // Store the target tab for the StartupHealthView to use
      (window as any).facilitatorTargetTab = targetTab;
    }
    
    setViewKey(prev => prev + 1); // Force re-render
    setForceRender(prev => prev + 1); // Additional force render
    
    // Force additional re-renders to ensure state changes are applied
    setTimeout(() => {
      console.log('🔍 Forcing additional re-render...');
      setViewKey(prev => prev + 1);
      setForceRender(prev => prev + 1);
    }, 50);
    
    setTimeout(() => {
      console.log('🔍 Forcing final re-render...');
      setViewKey(prev => prev + 1);
      setForceRender(prev => prev + 1);
    }, 100);
    
    console.log('🔍 handleViewStartup completed');
  }, [currentUser?.role]);

  // Separate async function to handle facilitator startup access
  const handleFacilitatorStartupAccess = async (startupId: number, targetTab?: string) => {
    try {
      console.log('🔍 Fetching startup data for facilitator, ID:', startupId);
      
      // Fetch startup data, fundraising details, share data, founders data, subsidiaries, and international operations in parallel
      const [startupResult, fundraisingResult, sharesResult, foundersResult, subsidiariesResult, internationalOpsResult] = await Promise.allSettled([
        supabase
          .from('startups')
          .select('*')
          .eq('id', startupId)
          .single(),
        supabase
          .from('fundraising_details')
          .select('value, equity, domain, pitch_deck_url, pitch_video_url, currency')
          .eq('startup_id', startupId)
          .limit(1),
        supabase
          .from('startup_shares')
          .select('total_shares, esop_reserved_shares, price_per_share')
          .eq('startup_id', startupId)
          .single(),
        supabase
          .from('founders')
          .select('name, email, shares, equity_percentage')
          .eq('startup_id', startupId),
        supabase
          .from('subsidiaries')
          .select('*')
          .eq('startup_id', startupId),
        // international_operations table may not exist, Promise.allSettled handles errors gracefully
        supabase
          .from('international_operations')
          .select('*')
          .eq('startup_id', startupId)
      ]);
      
      const startupData = startupResult.status === 'fulfilled' ? startupResult.value : null;
      const fundraisingData = fundraisingResult.status === 'fulfilled' ? fundraisingResult.value : null;
      const sharesData = sharesResult.status === 'fulfilled' ? sharesResult.value : null;
      const foundersData = foundersResult.status === 'fulfilled' ? foundersResult.value : null;
      const subsidiariesData = subsidiariesResult.status === 'fulfilled' ? subsidiariesResult.value : null;
      const internationalOpsData = internationalOpsResult.status === 'fulfilled' ? internationalOpsResult.value : null;
      
      if (startupData.error || !startupData.data) {
        console.error('Error fetching startup from database:', startupData.error);
        messageService.error(
          'Access Denied',
          'Unable to access startup. Please check your permissions.'
        );
        return;
      }
      
      const fetchedStartup = startupData.data;
      const shares = sharesData?.data;
      const founders = foundersData?.data || [];
      const subsidiaries = subsidiariesData?.data || [];
      const internationalOps = internationalOpsData?.data || [];
      
      // Map founders data to include shares; if shares are missing, derive from equity percentage
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
      
      // Convert database format to Startup interface
      const fundraisingRow = (fundraisingData?.data && (fundraisingData as any).data[0]) || null;
      const startupObj: Startup = {
        id: fetchedStartup.id,
        name: fetchedStartup.name,
        investmentType: fetchedStartup.investment_type,
        // Prefer fundraising_details values when present
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
        // Add share data
        esopReservedShares: shares?.esop_reserved_shares || 0,
        totalShares: shares?.total_shares || 0,
        pricePerShare: shares?.price_per_share || 0,
        // Add pitch materials from fundraising_details
        pitchDeckUrl: fundraisingRow?.pitch_deck_url || undefined,
        pitchVideoUrl: fundraisingRow?.pitch_video_url || undefined,
        // Add profile data for ComplianceTab and ProfileTab
        profile: profileData,
        // Add subsidiaries and international operations directly to startup object
        subsidiaries: mappedSubsidiaries,
        internationalOps: mappedInternationalOps,
        // Add direct profile fields for compatibility with components that check startup.country_of_registration
        country_of_registration: fetchedStartup.country_of_registration || fetchedStartup.country,
        company_type: fetchedStartup.company_type,
        // Add user_id and investment_advisor_code for compatibility
        user_id: fetchedStartup.user_id,
        investment_advisor_code: fetchedStartup.investment_advisor_code,
        ca_service_code: fetchedStartup.ca_service_code,
        cs_service_code: fetchedStartup.cs_service_code
      } as any;
      
      console.log('✅ Startup fetched from database with shares and founders:', startupObj);
      console.log('📊 Share data:', shares);
      console.log('👥 Founders data:', mappedFounders);
      
      // Set view-only mode for facilitator
      setIsViewOnly(true);
      setSelectedStartup(startupObj);
      setView('startupHealth');
      
      // Store the target tab for the StartupHealthView to use
      // Default to 'dashboard' for investors/advisors if no targetTab specified
      const finalTargetTab = targetTab || (currentUser?.role === 'Investor' || currentUser?.role === 'Investment Advisor' ? 'dashboard' : targetTab);
      if (finalTargetTab) {
        (window as any).facilitatorTargetTab = finalTargetTab;
      }
      
      setViewKey(prev => prev + 1); // Force re-render
      setForceRender(prev => prev + 1); // Additional force render
      
      // Force additional re-renders to ensure state changes are applied
      setTimeout(() => {
        console.log('🔍 Forcing additional re-render...');
        setViewKey(prev => prev + 1);
        setForceRender(prev => prev + 1);
      }, 50);
      
      setTimeout(() => {
        console.log('🔍 Forcing final re-render...');
        setViewKey(prev => prev + 1);
        setForceRender(prev => prev + 1);
      }, 100);
      
      console.log('🔍 Facilitator startup access completed');
    } catch (error) {
      console.error('Error in facilitator startup access:', error);
      messageService.error(
        'Access Failed',
        'Unable to access startup. Please try again.'
      );
    }
  };

  const handleBackToPortfolio = useCallback(() => {
    // logDiagnostic disabled to prevent interference
    setSelectedStartup(null);
    setIsViewOnly(false);
    setView('dashboard');
    setViewKey(prev => prev + 1); // Force re-render
  }, []);

  // Add logging to view changes
  const handleViewChange = useCallback((newView: 'startupHealth' | 'dashboard') => {
    // logDiagnostic disabled to prevent interference
    setView(newView);
    setCookie('currentView', newView, 30);
  }, [view]);

  const handleAcceptStartupRequest = useCallback(async (requestId: number) => {
    try {
      // Find the startup request
      const startupRequest = startupAdditionRequests.find(req => req.id === requestId);
      if (!startupRequest) {
        messageService.warning(
          'Request Not Found',
          'Startup request not found.'
        );
        return;
      }

      // Directly approve the request without subscription modal
      console.log('🔍 Approving startup addition request:', requestId);
      const newStartup = await startupAdditionService.acceptStartupRequest(requestId);
      
      console.log('✅ Startup approval successful:', {
        startupId: newStartup.id,
        startupName: newStartup.name,
        requestId
      });
      
      // Update local state - remove the approved request from the list
      setStartupAdditionRequests(prev => {
        const filtered = prev.filter(req => req.id !== requestId);
        console.log('🔍 Updated startupAdditionRequests:', {
          before: prev.length,
          after: filtered.length,
          removedId: requestId
        });
        return filtered;
      });
      
      // Add startup to portfolio if not already present
      setStartups(prev => {
        const exists = prev.find(s => s.id === newStartup.id || s.name === newStartup.name);
        if (exists) {
          console.log('✅ Startup already in portfolio:', newStartup.name);
          return prev;
        }
        console.log('✅ Adding startup to portfolio:', newStartup.name);
        return [...prev, newStartup];
      });
      
      messageService.success(
        'Startup Added',
        `${newStartup.name} has been added to your portfolio.`,
        3000
      );
      
      // Refresh data to ensure everything is up to date (including fetching updated requests)
      console.log('🔄 Refreshing data after approval...');
      await fetchData(true); // Force refresh
    } catch (error) {
      console.error('Error accepting startup request:', error);
      messageService.error(
        'Acceptance Failed',
        'Failed to accept startup request. Please try again.'
      );
    }
  }, [startupAdditionRequests, fetchData]);

  const handleSubscriptionSuccess = useCallback(async () => {
    // Handle regular subscription success (for startup requests)
    if (!pendingStartupRequest) return;

    try {
      const newStartup = await startupAdditionService.acceptStartupRequest(pendingStartupRequest.id);
      
      // Update local state
      setStartups(prev => [...prev, newStartup]);
      setStartupAdditionRequests(prev => prev.filter(req => req.id !== pendingStartupRequest.id));
      
      messageService.success(
        'Startup Added',
        `${newStartup.name} has been added to your portfolio.`,
        3000
      );
      
      // Reset pending request
      setPendingStartupRequest(null);
    } catch (error) {
      console.error('Error accepting startup request:', error);
      messageService.error(
        'Acceptance Failed',
        'Failed to accept startup request. Please try again.'
      );
    }
  }, [pendingStartupRequest, fetchData]);

  const handleSubscriptionModalClose = useCallback(() => {
    setPendingStartupRequest(null);
  }, []);

  // Trial subscription modal handlers
  const handleTrialModalClose = useCallback(() => {
    console.log('🔍 Trial modal close handler called');
    setIsTrialModalOpen(false);
  }, []);

  const handleTrialSuccess = useCallback(() => {
    console.log('🔍 Trial success handler called');
    setIsTrialModalOpen(false);
    setShowTrialBanner(true);
    setUserHasAccess(true); // Grant access after successful trial start
    try { localStorage.removeItem('subscription_required'); } catch {} // Clear subscription lock
    
    // Set trial status for 5 minutes
    const trialStart = new Date();
    const trialEnd = new Date(Date.now() + 5 * 60 * 1000);
    setTrialStatus({
      hasActiveTrial: true,
      trialStartTime: trialStart.toISOString(),
      trialEndTime: trialEnd.toISOString(),
      minutesRemaining: 5,
      hasUsedTrial: false
    });
    
    // Set timer to end trial after 5 minutes
    setTimeout(() => {
      handleTrialEnd();
    }, 5 * 60 * 1000);
    
    // Refresh data to show trial status
    fetchData();
  }, [fetchData, handleTrialEnd]);

  // Client-side trial redirect disabled
  useEffect(() => {}, []);

  // Remove subscription-related URL toggles
  useEffect(() => {}, []);

  // Remove subscription localStorage lock behavior
  useEffect(() => {}, []);

  
  const handleActivateFundraising = useCallback((details: FundraisingDetails, startup: Startup) => {
    const newOpportunity: NewInvestment = {
      id: Date.now(),
      name: startup.name,
      investmentType: details.type,
      investmentValue: details.value,
      equityAllocation: details.equity,
      sector: startup.sector,
      totalFunding: startup.totalFunding,
      totalRevenue: startup.totalRevenue,
      registrationDate: startup.registrationDate,
      pitchDeckUrl: details.pitchDeckUrl,
      pitchVideoUrl: details.pitchVideoUrl,
      complianceStatus: startup.complianceStatus,
    };
    setNewInvestments(prev => [newOpportunity, ...prev]);
    
    if (details.validationRequested) {
        const newRequest: VerificationRequest = {
            id: Date.now(),
            startupId: startup.id,
            startupName: startup.name,
            requestDate: new Date().toISOString().split('T')[0],
        };
        setVerificationRequests(prev => [newRequest, ...prev]);
        messageService.success(
          'Startup Listed',
          `${startup.name} is now listed for fundraising and a verification request has been sent to the admin.`,
          3000
        );
    } else {
        messageService.success(
          'Startup Listed',
          `${startup.name} is now listed for fundraising.`,
          3000
        );
    }
  }, []);

  const handleInvestorAdded = useCallback(async (investment: InvestmentRecord, startup: Startup) => {
      console.log('🔄 handleInvestorAdded called with:', { investment, startup });
      console.log('🔍 Investment object keys:', Object.keys(investment));
      console.log('🔍 Investment investor code:', investment.investorCode);
      console.log('🔍 Current user investor codes:', { 
          investor_code: (currentUser as any)?.investor_code, 
          investorCode: (currentUser as any)?.investorCode 
      });
      
      const normalizedInvestorCode = (currentUserRef.current as any)?.investor_code || (currentUserRef.current as any)?.investorCode || investment.investorCode;
      console.log('🔍 Normalized investor code:', normalizedInvestorCode);
      
      if (!investment.investorCode) {
          console.log('❌ No investor code found in investment, returning early');
          return;
      }
      
      console.log('✅ Investor code found, proceeding to create startup addition request...');
      
      try {
          // Create an approval request for the investor who owns this code
          const newRequest: StartupAdditionRequest = {
              id: Date.now(),
              name: startup.name,
              investmentType: startup.investmentType,
              investmentValue: investment.amount,
              equityAllocation: investment.equityAllocated,
              sector: startup.sector,
              totalFunding: startup.totalFunding + investment.amount,
              totalRevenue: startup.totalRevenue,
              registrationDate: startup.registrationDate,
              investorCode: investment.investorCode,
              status: 'pending'
          };
          
          // Save to database first
          const savedRequest = await startupAdditionService.createStartupAdditionRequest({
              name: startup.name,
              investment_type: startup.investmentType,
              investment_value: investment.amount,
              equity_allocation: investment.equityAllocated,
              sector: startup.sector,
              total_funding: startup.totalFunding + investment.amount,
              total_revenue: startup.totalRevenue,
              registration_date: startup.registrationDate,
              investor_code: investment.investorCode,
              status: 'pending'
          });
          
          // Update local state with the saved request (use database ID)
          const requestWithDbId = { ...newRequest, id: savedRequest.id };
          setStartupAdditionRequests(prev => [requestWithDbId, ...prev]);
          
          console.log('✅ Startup addition request created and saved to database:', savedRequest);
          console.log('✅ Local state updated with request ID:', requestWithDbId.id);
          
          messageService.success(
            'Request Created',
            `Investor request created for ${startup.name}. It will appear in the investor's Approve Startup Requests.`,
            3000
          );
      } catch (error) {
          console.error('❌ Error creating startup addition request:', error);
          messageService.error(
            'Request Failed',
            'Failed to create investor request. Please try again.'
          );
      }
  }, []);

  const handleUpdateFounders = useCallback((startupId: number, founders: Founder[]) => {
    setStartups(prevStartups => 
        prevStartups.map(s => 
            s.id === startupId ? { ...s, founders } : s
        )
    );
    if (selectedStartup?.id === startupId) {
        setSelectedStartup(prev => prev ? { ...prev, founders } : null);
    }
    messageService.success(
      'Founder Updated',
      'Founder information updated successfully.',
      3000
    );
  }, []);

  const handleSubmitOffer = useCallback(async (opportunity: NewInvestment, offerAmount: number, equityPercentage: number, currency?: string, wantsCoInvestment?: boolean, coInvestmentOpportunityId?: number) => {
    if (!currentUserRef.current) return;
    
    console.log('🔍 handleSubmitOffer called with:', {
      opportunity: opportunity.name,
      offerAmount,
      equityPercentage,
      currency,
      wantsCoInvestment,
      coInvestmentOpportunityId,
      coInvestmentOpportunityIdType: typeof coInvestmentOpportunityId
    });
    
    try {
      // Check if user already has an offer for this startup
      const existingOffers = await investmentService.getUserOffers(currentUserRef.current.email);
      const existingOffer = existingOffers.find(offer => 
        offer.startup_name === opportunity.name || 
        offer.startup_id === opportunity.id
      );
      
      if (existingOffer) {
        // If there's an existing offer, ask user if they want to update it
        const shouldUpdate = window.confirm(
          `You already have an offer for ${opportunity.name}:\n` +
          `Amount: ${existingOffer.offer_amount} ${existingOffer.currency || 'USD'}\n` +
          `Equity: ${existingOffer.equity_percentage}%\n\n` +
          `Do you want to update this offer with your new details?\n\n` +
          `New Amount: ${offerAmount} ${currency || 'USD'}\n` +
          `New Equity: ${equityPercentage}%\n` +
          `Co-investment: ${wantsCoInvestment ? 'Yes' : 'No'}`
        );
        
        if (shouldUpdate) {
          // Update the existing offer
          const updatedOffer = await investmentService.updateInvestmentOffer(existingOffer.id, {
            offer_amount: offerAmount,
            equity_percentage: equityPercentage,
            currency: currency || 'USD',
            wants_co_investment: wantsCoInvestment
          });
          
          // Update local state
          setInvestmentOffers(prev => 
            prev.map(offer => 
              offer.id === existingOffer.id ? { ...offer, ...updatedOffer } : offer
            )
          );
          
          // Notification removed - offer updated silently
          
          return;
        } else {
          // Notification removed - offer cancelled silently
          return;
        }
      }
      
      // CRITICAL FIX: If wantsCoInvestment is true, create co-investment opportunity FIRST
      // Then use its ID when creating the offer
      let finalCoInvestmentOpportunityId = coInvestmentOpportunityId;
      
      if (wantsCoInvestment && !coInvestmentOpportunityId) {
        const remainingAmount = opportunity.investmentValue - offerAmount;
        // IMPORTANT: Always create co-investment opportunity when wantsCoInvestment is true
        // Even if remainingAmount is 0 or negative, we should still create it
        // The co-investment opportunity represents the full investment, and the lead investor's offer is part of it
        try {
          console.log('🔄 Creating co-investment opportunity BEFORE creating offer...');
          console.log('🔍 Co-investment details:', {
            offerAmount,
            investmentValue: opportunity.investmentValue,
            remainingAmount,
            wantsCoInvestment
          });
          
          // For co-investment, use opportunity.id directly as it's the startup_id
          // This avoids the issue when multiple startups have the same name
          const startupId = opportunity.id;
          
          // Verify the startup exists (optional check)
          const { data: startupData, error: startupError } = await supabase
            .from('startups')
            .select('id, name')
            .eq('id', startupId)
            .single();
          
          if (startupError || !startupData) {
            console.error('❌ Startup not found for co-investment:', startupId, startupError);
            // Notification removed - startup not found error logged silently
            return;
          }
          
          console.log('✅ Found startup for co-investment:', startupData);
          
          // CRITICAL FIX: listed_by_user_id expects auth_user_id, not profile_id
          const { data: { user: authUser } } = await authService.supabase.auth.getUser();
          const authUserId = authUser?.id;
          if (!authUserId) {
            console.error('❌ No auth user found for co-investment opportunity');
            return;
          }
          
          // Calculate min/max co-investment amounts
          // If remainingAmount is 0 or negative, set minimum to a small amount (1% of offer) and max to offer amount
          // This allows the lead investor to still create the opportunity and potentially adjust later
          const minCoInvestment = remainingAmount > 0 
            ? Math.min(remainingAmount * 0.1, 10000) 
            : Math.max(offerAmount * 0.01, 1000); // 1% of offer or 1000 minimum
          const maxCoInvestment = remainingAmount > 0 
            ? remainingAmount 
            : offerAmount; // If no remaining, allow up to the offer amount
          
          console.log('🔍 Co-investment opportunity parameters:', {
            startup_id: startupId,
            listed_by_user_id: authUserId,
            investment_amount: opportunity.investmentValue,
            equity_percentage: opportunity.equityAllocation,
            minimum_co_investment: minCoInvestment,
            maximum_co_investment: maxCoInvestment
          });
          
          const coInvestmentOpportunity = await investmentService.createCoInvestmentOpportunity({
            startup_id: startupId,
            listed_by_user_id: authUserId,  // Use auth_user_id, not profile ID!
            listed_by_type: 'Investor',
            investment_amount: opportunity.investmentValue,
            equity_percentage: opportunity.equityAllocation,
            minimum_co_investment: minCoInvestment,
            maximum_co_investment: maxCoInvestment,
            description: remainingAmount > 0
              ? `Co-investment opportunity for ${opportunity.name}. Lead investor has committed ${currency || 'USD'} ${offerAmount.toLocaleString()} for ${equityPercentage}% equity. Remaining ${currency || 'USD'} ${remainingAmount.toLocaleString()} available for co-investors.`
              : `Co-investment opportunity for ${opportunity.name}. Lead investor has committed ${currency || 'USD'} ${offerAmount.toLocaleString()} for ${equityPercentage}% equity.`
          });
          
          if (coInvestmentOpportunity && coInvestmentOpportunity.id) {
            finalCoInvestmentOpportunityId = coInvestmentOpportunity.id;
            console.log('✅ Co-investment opportunity created successfully with ID:', finalCoInvestmentOpportunityId);
          } else {
            console.error('❌ Co-investment opportunity created but no ID returned');
            console.error('❌ Returned data:', coInvestmentOpportunity);
            return; // Don't create the offer if we don't have the opportunity ID
          }
          
        } catch (coInvestmentError) {
          console.error('❌ Error creating co-investment opportunity:', coInvestmentError);
          console.error('❌ Error details:', {
            message: coInvestmentError instanceof Error ? coInvestmentError.message : String(coInvestmentError),
            stack: coInvestmentError instanceof Error ? coInvestmentError.stack : undefined
          });
          // Notification removed - co-investment error logged silently
          return; // Don't create the offer if co-investment opportunity creation failed
        }
      }
      
      // Use opportunity.id which is the new_investments.id
      // IMPORTANT: If wantsCoInvestment is true, the lead investor's offer should be a REGULAR offer
      // (not a co-investment offer). The co-investment opportunity is for OTHER investors to join.
      // Only pass co_investment_opportunity_id if this is NOT the lead investor making the offer
      const createdOffer = await investmentService.createInvestmentOffer({
        investor_email: currentUserRef.current.email,
        startup_name: opportunity.name,
        investment_id: opportunity.id, // This is the new_investments.id
        offer_amount: offerAmount,
        equity_percentage: equityPercentage,
        currency: currency || 'USD',
        // Don't pass co_investment_opportunity_id for lead investor's own offer
        // The lead investor creates a regular offer, and the co-investment opportunity is for others
        co_investment_opportunity_id: undefined // Lead investor's offer is always regular
      });
      
      // Format the offer to match the InvestmentOffer interface format (camelCase)
      // IMPORTANT: Lead investor's offer is always a regular offer, even if they created a co-investment opportunity
      // The co-investment opportunity is for OTHER investors to join
      const isCoInvestment = false; // Lead investor's offer is never a co-investment offer
      
      const formattedNewOffer: any = {
        id: createdOffer.id,
        investorEmail: createdOffer.investor_email || currentUserRef.current.email,
        investorName: (createdOffer as any).investor_name || currentUserRef.current.name || undefined,
        startupName: createdOffer.startup_name || opportunity.name,
        startupId: (createdOffer as any).startup_id,
        startup: (createdOffer as any).startup || null,
        offerAmount: Number(createdOffer.offer_amount) || offerAmount,
        equityPercentage: Number(createdOffer.equity_percentage) || equityPercentage,
        status: createdOffer.status || 'pending',
        currency: createdOffer.currency || currency || 'USD',
        createdAt: createdOffer.created_at ? new Date(createdOffer.created_at).toISOString() : new Date().toISOString(),
        // Co-investment fields
        // Note: Lead investor's offer is always a regular offer, even if they created a co-investment opportunity
        is_co_investment: isCoInvestment, // Flag to identify co-investment offers (false for lead investor)
        co_investment_opportunity_id: null, // Lead investor's offer doesn't have co_investment_opportunity_id
        // Store the co-investment opportunity ID separately for reference (if created)
        created_co_investment_opportunity_id: finalCoInvestmentOpportunityId || null,
        lead_investor_approval_status: (createdOffer as any).lead_investor_approval_status || 'not_required',
        lead_investor_approval_at: (createdOffer as any).lead_investor_approval_at,
        investor_advisor_approval_status: (createdOffer as any).investor_advisor_approval_status || 'not_required',
        investor_advisor_approval_at: (createdOffer as any).investor_advisor_approval_at,
        startup_advisor_approval_status: (createdOffer as any).startup_advisor_approval_status || 'not_required',
        startup_advisor_approval_at: (createdOffer as any).startup_advisor_approval_at,
        stage: (createdOffer as any).stage || 1,
        contact_details_revealed: (createdOffer as any).contact_details_revealed || false,
        contact_details_revealed_at: (createdOffer as any).contact_details_revealed_at
      };
      
      // Update local state
      setInvestmentOffers(prev => [formattedNewOffer, ...prev]);
      
      // Handle co-investment opportunity creation
      if (finalCoInvestmentOpportunityId) {
        // Lead investor created a co-investment opportunity
        // Their own offer is a regular offer (not a co-investment offer)
        // The co-investment opportunity is for OTHER investors to join
        console.log('✅ Co-investment opportunity created with ID:', finalCoInvestmentOpportunityId);
        console.log('✅ Lead investor\'s regular offer created (ID:', formattedNewOffer.id, ')');
        console.log('📋 Note: Lead investor\'s offer is regular, co-investment opportunity is for other investors');
      }
    } catch (error) {
      console.error('Error submitting offer:', error);
      // Notification removed - error logged silently
    }
  }, []);

  const handleProcessVerification = useCallback(async (requestId: number, status: 'approved' | 'rejected') => {
    try {
      const result = await verificationService.processVerification(requestId, status);
      
      if (result.success) {
        // Update local state
        setVerificationRequests(prev => prev.filter(r => r.id !== requestId));
        
        if (status === 'approved') {
          messageService.success(
            'Verification Approved',
            'Verification request has been approved and startup is now "Startup Nation Verified".',
            3000
          );
        } else {
          messageService.warning(
            'Verification Rejected',
            'Verification request has been rejected.',
            3000
          );
        }
      }
    } catch (error) {
      console.error('Error processing verification:', error);
      messageService.error(
        'Processing Failed',
        'Failed to process verification. Please try again.'
      );
    }
  }, []);

  const handleProcessOffer = useCallback(async (offerId: number, status: 'approved' | 'rejected' | 'accepted' | 'completed') => {
    try {
      await investmentService.updateOfferStatus(offerId, status);
      
      // Update local state
      setInvestmentOffers(prev => prev.map(o => 
        o.id === offerId ? { ...o, status } : o
      ));
      
      const offer = investmentOffersRef.current.find(o => o.id === offerId);
      if (offer) {
        let message = `The offer for ${offer.startupName} from ${offer.investorEmail} has been ${status}.`;
        
        if (status === 'accepted') {
          message += ' The investment deal is now finalized!';
        } else if (status === 'completed') {
          message += ' The investment transaction has been completed!';
        }
        
        messageService.info(
          'Offer Status',
          message
        );
      }
    } catch (error) {
      console.error('Error processing offer:', error);
      messageService.error(
        'Processing Failed',
        'Failed to process offer. Please try again.'
      );
    }
  }, []);

  const handleUpdateOffer = useCallback(async (offerId: number, offerAmount: number, equityPercentage: number) => {
    try {
      console.log('Attempting to update offer:', { offerId, offerAmount, equityPercentage });
      
      const updatedOffer = await investmentService.updateInvestmentOffer(offerId, offerAmount, equityPercentage);
      
      // Update local state
      setInvestmentOffers(prev => prev.map(o => 
        o.id === offerId ? { ...o, offerAmount, equityPercentage } : o
      ));
      
      messageService.success(
        'Offer Updated',
        'Offer updated successfully!',
        3000
      );
    } catch (error) {
      console.error('Error updating offer:', error);
      
      // Show more specific error message
      let errorMessage = 'Failed to update offer. Please try again.';
      if (error instanceof Error) {
        errorMessage = `Update failed: ${error.message}`;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = `Update failed: ${JSON.stringify(error)}`;
      }
      
      messageService.error(
        'Submission Failed',
        errorMessage
      );
    }
  }, []);

  const handleCancelOffer = useCallback(async (offerId: number) => {
    try {
      await investmentService.deleteInvestmentOffer(offerId);
      
      // Update local state
      setInvestmentOffers(prev => prev.filter(o => o.id !== offerId));
      
      messageService.success(
        'Offer Cancelled',
        'Offer cancelled successfully!',
        3000
      );
    } catch (error) {
      console.error('Error cancelling offer:', error);
      messageService.error(
        'Cancellation Failed',
        'Failed to cancel offer. Please try again.'
      );
    }
  }, []);

  const handleProcessValidationRequest = useCallback(async (requestId: number, status: 'approved' | 'rejected', notes?: string) => {
    try {
      const updatedRequest = await validationService.processValidationRequest(requestId, status, notes);
      
      // Update local state
      setValidationRequests(prev => prev.map(r => 
        r.id === requestId ? updatedRequest : r
      ));
      
      const request = validationRequestsRef.current.find(r => r.id === requestId);
      if (request) {
        messageService.success(
          'Validation Processed',
          `The validation request for ${request.startupName} has been ${status}.`,
          3000
        );
      }
    } catch (error) {
      console.error('Error processing validation request:', error);
      messageService.error(
        'Processing Failed',
        'Failed to process validation request. Please try again.'
      );
    }
  }, []);

  const handleUpdateCompliance = useCallback(async (startupId: number, status: ComplianceStatus) => {
    try {
      console.log(`🔄 Updating compliance status for startup ${startupId} to: ${status}`);
      console.log(`📊 Status type: ${typeof status}, Value: "${status}"`);
      
      // First, let's check if the startup actually exists in the database
      const { data: existingStartup, error: checkError } = await supabase
        .from('startups')
        .select('id, name, compliance_status')
        .eq('id', startupId)
        .single();
      
      if (checkError) {
        console.error('❌ Error checking startup existence:', checkError);
        throw new Error(`Startup with ID ${startupId} not found in database`);
      }
      
      console.log('🔍 Found startup in database:', existingStartup);
      console.log('🔍 Current database status:', existingStartup.compliance_status);
      
      // For CA compliance updates, we need to update the compliance_checks table
      // This function is called from CA dashboard when updating overall compliance
      const { data, error } = await supabase
        .from('startups')
        .update({ compliance_status: status })
        .eq('id', startupId)
        .select(); // Add select to see what was updated
      
      if (error) {
        console.error('❌ Database update error:', error);
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('✅ Database update successful:', data);
      console.log('✅ Rows affected:', data.length);
      
      if (data.length === 0) {
        throw new Error(`No rows were updated. Startup ID ${startupId} may not exist or have different permissions.`);
      }
      
      // Update local state
      setStartups(prev => prev.map(s => 
        s.id === startupId ? { ...s, complianceStatus: status } : s
      ));
      
      // Get startup name for alert
      const startup = startupsRef.current.find(s => s.id === startupId);
      const startupName = startup?.name || 'Startup';
      
      console.log(`✅ Successfully updated ${startupName} compliance status to ${status}`);
      messageService.success(
        'Compliance Updated',
        `${startupName} compliance status has been updated to ${status}.`,
        3000
      );
    } catch (error) {
      console.error('❌ Error updating compliance:', error);
      messageService.error(
        'Update Failed',
        `Failed to update compliance status: ${error.message || 'Unknown error'}. Please try again.`
      );
    }
  }, []);

  const handleProfileUpdate = useCallback((updatedUser: any) => {
    console.log('🚨 handleProfileUpdate called - this might trigger refresh');
    // Update the currentUser state with the new profile data
    setCurrentUser(prevUser => ({
      ...prevUser,
      ...updatedUser
    }));
    console.log('✅ Profile updated in App.tsx:', updatedUser);
  }, []);

  const getPanelTitle = () => {
    return 'TrackMyStartup';
  }



  // Show the global loading screen ONLY before we know the auth state.
  // Once the user is authenticated, never block the UI here – even if data is still loading –
  // otherwise newly registered/logged-in users can get stuck on this screen until a manual refresh.
  if (
    isLoading &&
    !isAuthenticated &&
    !currentUser &&
    !selectedStartup &&
    currentPage !== 'login' &&
    currentPage !== 'register'
  ) {
      console.log('Rendering loading screen...', { isAuthenticated, currentUser: !!currentUser });
      return (
          <div className="flex items-center justify-center min-h-screen bg-slate-50 text-brand-primary">
              <div className="flex flex-col items-center gap-4">
                  <BarChart3 className="w-16 h-16 animate-pulse" />
                  <p className="text-xl font-semibold">Loading Application...</p>
                  <p className="text-sm text-slate-600">
                    Auth: {isAuthenticated ? 'Yes' : 'No'} | 
                    User: {currentUser ? 'Yes' : 'No'} | 
                    Role: {currentUser?.role || 'None'}
                  </p>
                  {loadingProgress && (
                      <p className="text-sm text-slate-600">{loadingProgress}</p>
                  )}
                  {/* Safety control so users aren't stuck on mobile */}
                  <div className="mt-2">
                    <button
                      onClick={() => { try { window.location.reload(); } catch {} }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm"
                    >
                      Refresh
                    </button>
                  </div>
              </div>
          </div>
      )
  }

  // Subscription page removed (always allow dashboard)



  // Check if we need to show complete-registration page (even when authenticated)
  if (currentPage === 'complete-registration') {
    console.log('🎯 Showing CompleteRegistrationPage (Form 2)');
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <CompleteRegistrationPage 
            onNavigateToRegister={() => setCurrentPage('register')}
            onNavigateToDashboard={async () => {
              console.log('🔄 Registration completed, refreshing user data first...');
              
              // CRITICAL: Refresh user data FIRST before any checks
              try {
                const refreshedUser = await authService.getCurrentUser();
                if (refreshedUser) {
                  console.log('✅ User data refreshed after Form 2 completion:', refreshedUser);
                  setCurrentUser(refreshedUser);
                  setIsAuthenticated(true);
                  
                  // ⚠️ CRITICAL: ONLY show subscription page for Startup users
                  // Other roles (Mentor, Admin, Investor, etc.) should go directly to dashboard
                  if (refreshedUser.role === 'Startup') {
                    console.log('✅ Startup user - navigating to subscription page for plan selection');
                    setCurrentPage('subscription');
                    setQueryParam('page', 'subscription', false);
                  } else {
                    console.log('✅ Non-Startup user (role:', refreshedUser.role, ') - navigating directly to dashboard');
                    setCurrentPage('login');
                    setQueryParam('page', 'login', false);
                  }
                } else {
                  console.error('❌ Failed to refresh user data after Form 2 completion');
                  // Fallback: go to dashboard, let role check handle it
                  setIsAuthenticated(true);
                  setCurrentPage('login');
                  setQueryParam('page', 'login', false);
                }
              } catch (error) {
                console.error('❌ Error refreshing user data after Form 2 completion:', error);
                // Fallback: go to dashboard, let role check handle it
                setIsAuthenticated(true);
                setCurrentPage('login');
                setQueryParam('page', 'login', false);
              }
            }}
          />
        </div>
        {/* Footer for complete-registration page */}
        <Footer />
      </div>
    );
  }

  // Show subscription page after Form 2 completion
  if (currentPage === 'subscription') {
    console.log('💳 Showing Subscription Plans Page');
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <div className="flex-1">
          <SubscriptionPlansPage
            userId={currentUser?.id}
            onPlanSelected={async (planTier) => {
              console.log('✅ Plan selected:', planTier);
              // After plan selection, navigate to dashboard
              try {
                const refreshedUser = await authService.getCurrentUser();
                if (refreshedUser) {
                  setCurrentUser(refreshedUser);
                  setIsAuthenticated(true);
                }
                setCurrentPage('login'); // Navigate to dashboard
                setQueryParam('page', 'login', false);
              } catch (error) {
                console.error('❌ Error after plan selection:', error);
                setCurrentPage('login');
                setQueryParam('page', 'login', false);
              }
            }}
            onBack={() => {
              // Allow going back to complete-registration if needed
              setCurrentPage('complete-registration');
              setQueryParam('page', 'complete-registration', false);
            }}
            onLogout={handleLogout}
          />
        </div>
        <Footer />
      </div>
    );
  }

  // Guard: never show payment unless registration Form 2 is complete
  // Minimal completeness: require government_id and ca_license (extend as needed)
  if (currentPage === 'payment') {
    // Only Startup users should ever see the payment page
    if (!currentUser || currentUser.role !== 'Startup') {
      console.log('🔒 Blocking payment: non-Startup user attempted to access payment, redirecting');
      setCurrentPage('login');
      // Fall through to render the appropriate view after page change
    }
    
    const requiresForm2 = !currentUser?.government_id;
    console.log('🔍 Form 2 check for payment:', {
      currentUser: currentUser,
      government_id: currentUser?.government_id,
      requiresForm2: requiresForm2,
      currentUserKeys: currentUser ? Object.keys(currentUser) : 'null',
      currentUserRole: currentUser?.role,
      currentUserEmail: currentUser?.email
    });
    if (requiresForm2) {
      console.log('🔒 Blocking payment: Form 2 incomplete, redirecting to complete-registration');
      setCurrentPage('complete-registration');
    }
    console.log('💳 Showing Payment Page (mandatory after registration)');
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <StartupSubscriptionPage 
            currentUser={currentUser}
            onPaymentSuccess={async () => {
              console.log('🎉 CENTRALIZED PAYMENT SUCCESS: Navigating to dashboard immediately');
              
              // IMMEDIATE dashboard navigation - no delays
              console.log('✅ Payment successful, showing dashboard immediately');
              
              // Set access flags to prevent redirect back to payment page
              setUserHasAccess(true);
              setShowSubscriptionPage(false);
              
              setIsAuthenticated(true);
              setCurrentPage('login'); // This will show the main dashboard immediately
              
              // Background refresh of user data with retry mechanism
              const refreshUserData = async (retryCount = 0) => {
                try {
                  console.log(`🔄 Refreshing user data in background (attempt ${retryCount + 1})...`);
                  const refreshedUser = await authService.getCurrentUser();
                  if (refreshedUser) {
                    console.log('✅ User data refreshed in background:', refreshedUser);
                    setCurrentUser(refreshedUser);
                  } else if (retryCount < 3) {
                    // Retry after a short delay if profile not found
                    console.log(`⚠️ Profile not found, retrying in 2 seconds (attempt ${retryCount + 1}/3)`);
                    setTimeout(() => refreshUserData(retryCount + 1), 2000);
                  } else {
                    console.log('⚠️ Profile refresh failed after 3 attempts, but dashboard is already shown');
                  }
                } catch (error) {
                  console.error(`⚠️ Background user data refresh failed (attempt ${retryCount + 1}):`, error);
                  if (retryCount < 3) {
                    console.log(`🔄 Retrying in 2 seconds (attempt ${retryCount + 1}/3)`);
                    setTimeout(() => refreshUserData(retryCount + 1), 2000);
                  } else {
                    console.log('⚠️ Profile refresh failed after 3 attempts, but dashboard is already shown');
                  }
                }
              };
              
              // Start the refresh process
              refreshUserData();
            }}
            onLogout={async () => {
              console.log('🚪 Logout initiated from subscription page');
              setIsAuthenticated(false);
              setCurrentUser(null);
              setCurrentPage('landing');
            }}
          />
        </div>
        {/* Footer for payment page */}
        <Footer />
      </div>
    );
  }

  // Check if we need to show reset-password page
  // Show reset-password page even during loading if URL has code parameter
  if (currentPage === 'reset-password') {
    console.log('🎯 Showing ResetPasswordPage');
    // Don't wait for loading to complete - show reset password page immediately
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <ResetPasswordPage 
            onNavigateToLogin={() => {
              setCurrentPage('login');
              setIsAuthenticated(false);
              setCurrentUser(null);
            }}
          />
        </div>
        {/* Footer for reset-password page */}
        <Footer />
      </div>
    );
  }

  console.log('🔍 App.tsx render - currentPage:', currentPage, 'isAuthenticated:', isAuthenticated);
  
  // Show public program view if on /program with opportunityId (BEFORE auth check)
  if (isPublicProgramView) {
    return <PublicProgramView />;
  }

  if (isPublicAdminProgramView) {
    return <PublicAdminProgramView />;
  }
  
  // Show public startup page if on /startup with startupId (BEFORE auth check)
  if (isPublicStartupPage) {
    return <PublicStartupPage />;
  }

  // Show public investor page if on /investor with investorId or userId (BEFORE auth check)
  if (isPublicInvestorPage) {
    return <PublicInvestorPage />;
  }
  if (isPublicAdvisorPage) {
    return <PublicAdvisorPage />;
  }
  if (isPublicMentorPage) {
    return <PublicMentorPage />;
  }
  if (isExploreProfilesPage) {
    return <ExploreProfilesPage />;
  }
  if (!isAuthenticated) {
    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            <div className="flex-1 flex items-center justify-center">
                {currentPage === 'landing' ? (
                    <LandingPage
                      onNavigateToLogin={() => setCurrentPage('login')}
                      onNavigateToRegister={() => setCurrentPage('register')}
                    />
                ) : currentPage === 'login' ? (
                    <LoginPage 
                        onLogin={handleLogin} 
                        onNavigateToRegister={() => setCurrentPage('register')} 
                        onNavigateToCompleteRegistration={() => {
                            console.log('🔄 Navigating to complete-registration page (Form 2 incomplete)');
                            // Use replaceState to prevent back button from going to dashboard
                            setShouldReplaceHistory(true);
                            setCurrentPage('complete-registration');
                        }}
                        onNavigateToLanding={() => setCurrentPage('landing')}
                    />
                ) : currentPage === 'register' ? (
                    <TwoStepRegistration 
                        onRegister={handleRegister} 
                        onNavigateToLogin={() => setCurrentPage('login')} 
                        onNavigateToLanding={() => setCurrentPage('landing')}
                    />
                ) : (
                    <CompleteRegistrationPage 
                      onNavigateToRegister={() => setCurrentPage('register')}
                      onNavigateToDashboard={async () => {
                        console.log('🔄 Navigating to dashboard after registration completion');
                        // Refresh the current user data to get updated Investment Advisor code and logo
                        try {
                          const refreshedUser = await authService.getCurrentUser();
                          if (refreshedUser) {
                            console.log('✅ User data refreshed for dashboard:', refreshedUser);
                            setCurrentUser(refreshedUser);
                            setIsAuthenticated(true);
                            setCurrentPage('login'); // This will show the main dashboard
                            // Force refresh startup data after registration
                            console.log('🔄 Forcing startup data refresh after registration...');
                            setTimeout(() => {
                              fetchData(true); // Force refresh with true parameter
                            }, 1000); // Small delay to ensure database transaction is committed
                          }
                        } catch (error) {
                          console.error('❌ Error refreshing user data:', error);
                          // Still navigate even if refresh fails
                          setIsAuthenticated(true);
                          setCurrentPage('login');
                        }
                      }}
                    />
                )}
            </div>
            {/* Footer only for landing page */}
            {currentPage === 'landing' && <Footer />}
        </div>
    )
  }

  // Auth redirect guard: if authenticated and still on 'landing', check profile completion first
  // BUT: Don't redirect if this is an invite flow (user needs to set password first)
  if (isAuthenticated && currentPage === 'landing') {
    const advisorCode = getQueryParam('advisorCode');
    const isResetPasswordPage = getQueryParam('page') === 'reset-password' || 
                               window.location.href.includes('reset-password');
    
    // If this is an invite flow, redirect to reset-password instead of complete-registration
    if (advisorCode && !isResetPasswordPage) {
      console.log('📧 Invite flow detected in auth redirect guard - redirecting to reset-password');
      const email = getQueryParam('email');
      if (email) {
        const encodedEmail = encodeURIComponent(email);
        window.location.href = `/?page=reset-password&advisorCode=${advisorCode}&email=${encodedEmail}`;
      } else {
        window.location.href = `/?page=reset-password&advisorCode=${advisorCode}`;
      }
      return; // Don't proceed with profile completion check
    }
    
    console.log('🔁 Auth redirect guard: checking profile completion before redirect');
    
    // Check if user profile is complete before redirecting to dashboard
    if (currentUser) {
      authService.isProfileComplete(currentUser.id).then((isComplete) => {
        if (isComplete) {
          console.log('🔁 Profile complete, redirecting to dashboard');
          setCurrentPage('login');
        } else {
          // Don't redirect to complete-registration if this is an invite flow
          if (advisorCode) {
            console.log('📧 Invite flow detected - redirecting to reset-password instead of complete-registration');
            const email = getQueryParam('email');
            if (email) {
              const encodedEmail = encodeURIComponent(email);
              window.location.href = `/?page=reset-password&advisorCode=${advisorCode}&email=${encodedEmail}`;
            } else {
              window.location.href = `/?page=reset-password&advisorCode=${advisorCode}`;
            }
          } else {
            console.log('🔁 Profile incomplete, redirecting to complete-registration');
            setCurrentPage('complete-registration');
          }
        }
      }).catch((error) => {
        console.error('❌ Error checking profile completion:', error);
        // Default to reset-password for invite flows, complete-registration otherwise
        if (advisorCode) {
          const email = getQueryParam('email');
          if (email) {
            const encodedEmail = encodeURIComponent(email);
            window.location.href = `/?page=reset-password&advisorCode=${advisorCode}&email=${encodedEmail}`;
          } else {
            window.location.href = `/?page=reset-password&advisorCode=${advisorCode}`;
          }
        } else {
          setCurrentPage('complete-registration');
        }
      });
    } else {
      // If no current user but advisorCode is present, redirect to reset-password
      if (advisorCode) {
        console.log('📧 Invite flow detected (no user) - redirecting to reset-password');
        const email = getQueryParam('email');
        if (email) {
          const encodedEmail = encodeURIComponent(email);
          window.location.href = `/?page=reset-password&advisorCode=${advisorCode}&email=${encodedEmail}`;
        } else {
          window.location.href = `/?page=reset-password&advisorCode=${advisorCode}`;
        }
      } else {
        console.log('🔁 No current user, redirecting to complete-registration');
        setCurrentPage('complete-registration');
      }
    }
  }

  const MainContent = () => {
    // Wait for user role to be loaded before showing role-based views
    // Also wait if still loading to prevent race condition where default role shows before correct role loads
    if (isLoading || (isAuthenticated && currentUser && !currentUser.role)) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
            <p className="text-slate-600">Loading your dashboard...</p>
          </div>
        </div>
      );
    }


    // If a startup is selected for detailed view, show it regardless of role
    if (view === 'startupHealth' && selectedStartup) {
      return (
        <StartupHealthView 
          startup={selectedStartup}
          userRole={currentUser?.role}
          user={currentUser}
          onBack={handleBackToPortfolio}
          onActivateFundraising={handleActivateFundraising}
          onInvestorAdded={handleInvestorAdded}
          onUpdateFounders={handleUpdateFounders}
          isViewOnly={isViewOnly}
          investmentOffers={investmentOffers}
          onProcessOffer={handleProcessOffer}
        />
      );
    }


    // Role-based views
    if (currentUser?.role === 'Admin') {
      return (
        <AdminView
          users={users}
          startups={startups}
          verificationRequests={verificationRequests}
          investmentOffers={investmentOffers}
          validationRequests={validationRequests}
          onProcessVerification={handleProcessVerification}
          onProcessOffer={handleProcessOffer}
          onProcessValidationRequest={handleProcessValidationRequest}
          onViewStartup={handleViewStartup}
        />
      );
    }

    if (currentUser?.role === 'CA') {
      return (
        <CAView
          startups={startups}
          onUpdateCompliance={handleUpdateCompliance}
          onViewStartup={handleViewStartup}
          currentUser={currentUser}
          onProfileUpdate={handleProfileUpdate}
          onLogout={handleLogout}
        />
      );
    }

    if (currentUser?.role === 'CS') {
      return (
        <CSView
          startups={startups}
          onUpdateCompliance={handleUpdateCompliance}
          onViewStartup={handleViewStartup}
          currentUser={currentUser}
          onProfileUpdate={handleProfileUpdate}
          onLogout={handleLogout}
        />
      );
    }

    if (currentUser?.role === 'Startup Facilitation Center') {
      return (
        <FacilitatorView
          startups={startups}
          newInvestments={newInvestments}
          startupAdditionRequests={startupAdditionRequests}
          onViewStartup={handleViewStartup}
          onAcceptRequest={handleAcceptStartupRequest}
          currentUser={currentUser}
          onProfileUpdate={handleProfileUpdate}
          onLogout={handleLogout}
        />
      );
    }

    if (currentUser?.role === 'Investment Advisor') {
      return (
        <InvestmentAdvisorView
          currentUser={currentUser}
          users={users}
          startups={startups}
          investments={newInvestments}
          offers={investmentOffers}
          interests={[]} // TODO: Add investment interests data
          pendingRelationships={pendingRelationships}
          onViewStartup={handleViewStartup}
        />
      );
    }

    if (currentUser?.role === 'Mentor') {
      return (
        <MentorView
          currentUser={currentUser}
          users={users}
          startups={startups}
          onViewStartup={handleViewStartup}
        />
      );
    }

    if (currentUser?.role === 'Investor') {
      return (
        <InvestorView 
          startups={startups} 
          newInvestments={newInvestments}
          startupAdditionRequests={startupAdditionRequests}
          investmentOffers={investmentOffers}
          currentUser={currentUser}
          onViewStartup={handleViewStartup}
          onAcceptRequest={handleAcceptStartupRequest}
          onMakeOffer={handleSubmitOffer}
          onUpdateOffer={handleUpdateOffer}
          onCancelOffer={handleCancelOffer}
        />
      );
    }

    if (currentUser?.role === 'Startup') {
      console.log('🔍 Startup user detected:', currentUser.email);
      console.log('🔍 User startup_name:', currentUser.startup_name);
      console.log('🔍 Available startups:', startups.map(s => ({ name: s.name, id: s.id })));
      
      // NEW: Check if user has selected a subscription plan (MANDATORY)
      // This will be checked asynchronously, but we can block rendering if needed
      // For now, log the check and proceed - subscription page will be enforced by route guard
      console.log('🔍 Checking subscription status for startup user...');
      
      // Find the user's startup by startup_name from users table
      let userStartup = startups.find(startup => startup.name === currentUser.startup_name);
      // Fallback: if no match but exactly one startup is available, pick it
      if (!userStartup && startups.length === 1) {
        console.log('🔁 Fallback in renderer: selecting the only startup available for this user');
        userStartup = startups[0];
      }
      
      // Check if startup user needs to start trial subscription
      // This will be handled by the trial modal logic
      if (userStartup && !showTrialBanner) {
        console.log('🔍 DEBUG: Checking trial status for user:', currentUser?.email, 'startup:', userStartup.name);
        // Check if user has active trial or subscription
        // For now, we'll show the trial modal for new startup users
        // You can add more sophisticated logic here to check existing subscriptions
      }
      
      // User startup data processed
      
      // Show subscription page if user needs to subscribe
      // Subscription page removed entirely

      // If user's startup is found, show the health view
      if (userStartup) {
        console.log('✅ Rendering StartupHealthView for startup:', userStartup.name);
        
        return (
          <div>
            {/* Trial Alert - Shows when trial is active */}
            {trialStatus && trialStatus.hasActiveTrial && (
              <TrialAlert
                userId={currentUser?.id || ''}
                onTrialEnd={handleTrialEnd}
              />
            )}
            
            {/* Trial Status Banner */}
            {trialStatus && trialStatus.hasActiveTrial && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-green-900">🎉 Free Trial Active</h3>
                    <p className="text-green-700">
                      You have {Math.ceil(trialStatus.minutesRemaining)} minutes remaining in your free trial
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Trial ends at: {trialStatus.trialEndTime ? new Date(trialStatus.trialEndTime).toLocaleTimeString() : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.ceil(trialStatus.minutesRemaining)}m
                    </div>
                    <div className="text-xs text-green-600">remaining</div>
                  </div>
                </div>
              </div>
            )}
          <StartupHealthView 
            startup={userStartup}
            userRole={currentUser?.role}
            user={currentUser}
            onBack={() => {}} // No back button needed for startup users
              onTrialButtonClick={() => {
                console.log('🔍 Trial button clicked in App.tsx - setting modal to open');
                setIsTrialModalOpen(true);
              }} // Connect trial button to modal
            onActivateFundraising={handleActivateFundraising}
            onInvestorAdded={handleInvestorAdded}
            onUpdateFounders={handleUpdateFounders}
            investmentOffers={investmentOffers}
            onProcessOffer={handleProcessOffer}
          />
          </div>
        );
      }
      
      // If no startup found, only show the message AFTER initial data has fully loaded.
      // During quick tab switches or initial load, keep the previous UI (no flashing).
      if (hasInitialDataLoaded) {
        // Robust mobile recovery: perform up to 3 background attempts before showing the message
        const now = Date.now();
        const shouldAttempt =
          startupRecoveryAttemptsRef.current < 3 &&
          (now - startupRecoveryLastAtRef.current > 2000); // at most every 2s

        if (shouldAttempt) {
          startupRecoveryAttemptsRef.current += 1;
          startupRecoveryLastAtRef.current = now;
          startupRecoveryAttemptedRef.current = true;
          (async () => {
            try {
              console.log(`🔍 Recovery attempt #${startupRecoveryAttemptsRef.current}: fetching startup by user_id...`);
              // IMPORTANT: startups table uses auth_user_id, not profile ID!
              const { data: { user: authUser } } = await authService.supabase.auth.getUser();
              const authUserId = authUser?.id;
              if (!authUserId) {
                console.error('❌ No auth user found for startup recovery');
                return;
              }
              const { data: startupsByUser, error: startupsByUserError } = await authService.supabase
                .from('startups')
                .select('*')
                .eq('user_id', authUserId);  // Use auth_user_id, not profile ID!
              if (!startupsByUserError && startupsByUser && startupsByUser.length > 0) {
                console.log('✅ Recovery success: found startups by user_id');
                setStartups(startupsByUser as any);
                setSelectedStartup(startupsByUser[0] as any);
                setView('startupHealth');
                // Persist startup_name for future refreshes
                try {
                  // CRITICAL FIX: Update user_profiles table (users table removed)
                  // Get the active profile_id from currentUser
                  const profileId = currentUser.id; // This is profile_id
                  if (profileId) {
                    await authService.supabase
                      .from('user_profiles')
                      .update({ startup_name: (startupsByUser[0] as any).name })
                      .eq('id', profileId);  // Use profile_id to update the active profile
                  }
                } catch {}
                return;
              }
              console.log('❌ Recovery: still no startup by user_id');
            } catch (e) {
              console.warn('⚠️ Recovery fetch failed (non-blocking):', e);
            }
          })();
          // Keep showing a spinner while recovery is running
          return (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
            </div>
          );
        }
        
        console.log('❌ No startup found for user:', currentUser.email);
        return (
          <div className="text-center py-20">
            <h2 className="text-xl font-semibold">No Startup Found</h2>
            <p className="text-slate-500 mt-2">No startup associated with your account. Please contact support.</p>
            <div className="mt-4 text-sm text-slate-400">
              <p>Debug Info:</p>
              <p>User startup_name: {currentUser.startup_name || 'NULL'}</p>
              <p>Available startups: {startups.length}</p>
            </div>
          </div>
        );
      }
      // Not loaded yet: preserve screen without showing fallback
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
        </div>
      );
    }

    // Default fallback
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold">TrackMyStartup - Welcome, {currentUser?.email}</h2>
        <p className="text-slate-500 mt-2">Startup user view - select a startup to view details.</p>
      </div>
    );
  };


    return (
      <>
        <MessageContainer />
        <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col overflow-x-hidden">
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Show investment advisor logo if user is an Investment Advisor OR has an assigned investment advisor */}
              {(() => {
                const isInvestmentAdvisor = currentUser?.role === 'Investment Advisor' && (currentUser as any)?.logo_url;
                const hasAssignedAdvisor = assignedInvestmentAdvisor && (currentUser?.role === 'Investor' || currentUser?.role === 'Startup');
                const shouldShowAdvisorLogo = Boolean(isInvestmentAdvisor || hasAssignedAdvisor);
                
                // Check if on subdomain
                const isOnSubdomain = (): boolean => {
                  if (typeof window === 'undefined') return false;
                  const hostname = window.location.hostname;
                  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost:')) {
                    return false;
                  }
                  const parts = hostname.split('.');
                  if (parts.length >= 3) {
                    const subdomain = parts[0];
                    if (subdomain && subdomain !== 'www') {
                      return true;
                    }
                  }
                  return false;
                };
                
                console.log('🔍 Header logo display check:', {
                  currentUserRole: currentUser?.role,
                  currentUserLogo: (currentUser as any)?.logo_url,
                  assignedAdvisor: !!assignedInvestmentAdvisor,
                  assignedAdvisorLogo: assignedInvestmentAdvisor?.logo_url,
                  isInvestmentAdvisor,
                  hasAssignedAdvisor,
                  shouldShowAdvisorLogo,
                  isOnSubdomain: isOnSubdomain()
                });
                return shouldShowAdvisorLogo;
              })() ? (
                <div className="flex items-center gap-3">
                  {(() => {
                    const isOnSubdomain = (): boolean => {
                      if (typeof window === 'undefined') return false;
                      const hostname = window.location.hostname;
                      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost:')) {
                        return false;
                      }
                      const parts = hostname.split('.');
                      if (parts.length >= 3) {
                        const subdomain = parts[0];
                        if (subdomain && subdomain !== 'www') {
                          return true;
                        }
                      }
                      return false;
                    };

                    const hasLogo = currentUser?.role === 'Investment Advisor' 
                      ? (currentUser as any)?.logo_url 
                      : assignedInvestmentAdvisor?.logo_url;

                    if (hasLogo) {
                      return (
                        <>
                          <img 
                            src={currentUser?.role === 'Investment Advisor' 
                              ? (currentUser as any).logo_url 
                              : assignedInvestmentAdvisor?.logo_url} 
                            alt="Company Logo" 
                            className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28 rounded object-contain bg-white border border-gray-200 p-1"
                            onError={(e) => {
                              // On subdomain: hide on error (no fallback)
                              // On main domain: fallback to TrackMyStartup logo
                              if (isOnSubdomain()) {
                                e.currentTarget.style.display = 'none';
                              } else {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }
                            }}
                          />
                          {/* Fallback logo only shown on main domain */}
                          {!isOnSubdomain() && (
                            <img src={LogoTMS} alt="TrackMyStartup" className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28 object-contain hidden" />
                          )}
                        </>
                      );
                    } else if (!isOnSubdomain()) {
                      // Show IA badge only on main domain if no logo
                      return (
                        <div className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28 rounded bg-purple-100 border border-purple-200 flex items-center justify-center">
                          <span className="text-purple-600 font-semibold text-sm sm:text-base md:text-lg">IA</span>
                        </div>
                      );
                    } else {
                      // On subdomain with no logo: show blank space
                      return (
                        <div className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28 rounded bg-transparent" />
                      );
                    }
                  })()}
                  <div className="min-w-0">
                    <h1 className="text-sm sm:text-lg font-semibold text-gray-800 truncate">
                      {currentUser?.role === 'Investment Advisor' 
                        ? (currentUser as any).firm_name || (currentUser as any).name || 'Investment Advisor'
                        : assignedInvestmentAdvisor?.firm_name || assignedInvestmentAdvisor?.name || 'Investment Advisor'}
                    </h1>
                    {!(() => {
                      const isOnSubdomain = (): boolean => {
                        if (typeof window === 'undefined') return false;
                        const hostname = window.location.hostname;
                        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost:')) {
                          return false;
                        }
                        const parts = hostname.split('.');
                        if (parts.length >= 3) {
                          const subdomain = parts[0];
                          if (subdomain && subdomain !== 'www') {
                            return true;
                          }
                        }
                        return false;
                      };
                      return isOnSubdomain();
                    })() && (
                      <p className="text-[10px] sm:text-xs text-blue-600 truncate">
                        Supported by Track My Startup
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <img src={LogoTMS} alt="TrackMyStartup" className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28 object-contain" />
              )}
            </div>
             {/* Desktop header actions */}
             <div className="hidden sm:flex flex-wrap items-center justify-end gap-2 sm:gap-3 w-full sm:w-auto">
              {currentUser?.role === 'Investor' && (
                  <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md font-mono">
                      Investor Code: <span className="font-semibold text-brand-primary">
                          {currentUser.investor_code || currentUser.investorCode || 'Not Set'}
                      </span>
                      {!currentUser.investor_code && !currentUser.investorCode && (
                          <span className="text-red-500 text-xs ml-2">⚠️ Code missing</span>
                      )}
                  </div>
              )}

              {currentUser?.role === 'Startup Facilitation Center' && (
                  <FacilitatorCodeDisplay 
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md text-sm font-medium" 
                      currentUser={currentUser}
                  />
              )}

              {currentUser?.role === 'Investment Advisor' && (
                  <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md font-mono">
                      Advisor Code: <span className="font-semibold text-brand-primary">
                          {(currentUser as any)?.investment_advisor_code || 'IA-XXXXXX'}
                      </span>
                  </div>
              )}

              {currentUser?.role === 'Mentor' && (
                  <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md font-mono">
                      Mentor Code: <span className="font-semibold text-brand-primary">
                          {(currentUser as any)?.mentor_code || 'MEN-XXXXXX'}
                      </span>
                  </div>
              )}

              {(currentUser?.role === 'Investor' || currentUser?.role === 'Startup') && currentUser?.investment_advisor_code_entered && (
                  <div className="text-sm text-slate-500 bg-purple-100 px-3 py-1.5 rounded-md font-mono">
                      Advisor: <span className="font-semibold text-purple-800">
                          {currentUser.investment_advisor_code_entered}
                      </span>
                  </div>
              )}

              {/* Profile Switcher and Add Profile */}
              {isAuthenticated && currentUser && (
                <>
                  <ProfileSwitcher
                    currentProfileId={currentUser.id}
                    onProfileSwitch={async (profile) => {
                      console.log('🔄 Profile switched to:', profile.role, profile.id);
                      
                      try {
                        // Wait a moment for the database to update (switchProfile already waits 300ms)
                        await new Promise(resolve => setTimeout(resolve, 300));
                        
                        // Verify the switch worked by checking current user
                        const refreshedUser = await authService.getCurrentUser(true); // Force refresh
                        console.log('🔄 Verified profile after switch:', refreshedUser?.role, refreshedUser?.id, 'Expected:', profile.role, profile.id);
                        
                        // Verify we got the right profile
                        if (refreshedUser && refreshedUser.id === profile.id) {
                          console.log('✅ Profile switch verified successfully!');
                        } else {
                          console.warn('⚠️ Profile ID mismatch! Expected:', profile.id, 'Got:', refreshedUser?.id);
                        }
                        
                        // AUTOMATIC REFRESH: Reload page to ensure all data loads correctly with new profile
                        console.log('🔄 Refreshing page to load all data for new profile...');
                        window.location.reload();
                        
                        // Note: Code below won't execute due to page reload, but kept for reference
                        return;
                        
                        // Check if profile is complete
                        const isComplete = await authService.isProfileComplete(refreshedUser.id);
                        console.log('🔄 Profile complete status:', isComplete, 'for role:', refreshedUser.role);
                        
                        if (!isComplete) {
                          // Profile not complete - redirect to Form 2 (complete-registration)
                          console.log('📝 Profile incomplete, redirecting to complete-registration page');
                          setCurrentPage('complete-registration');
                          setHasInitialDataLoaded(false); // Reset so Form 2 can load properly
                          setIsLoading(false);
                          // Force re-render to show Form 2
                          setViewKey(prev => prev + 1);
                          return; // Don't proceed to dashboard
                        }
                        
                        // Profile is complete - reload all data for new profile and show correct dashboard
                        console.log('🔄 Profile complete, reloading data for role:', refreshedUser.role);
                        setHasInitialDataLoaded(false);
                        // Reset view to dashboard for the new role
                        setView('dashboard');
                        setViewKey(prev => prev + 1);
                        // Fetch data for the new profile
                        fetchData(true);
                      } catch (error) {
                        console.error('❌ Error switching profile:', error);
                        alert('Failed to switch profile. Please refresh the page.');
                        window.location.reload();
                      }
                    }}
                  />
                  <button
                    onClick={() => setShowAddProfileModal(true)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-primary transition-colors px-3 py-1.5 rounded-md hover:bg-slate-50"
                    title="Add New Profile"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Add Profile</span>
                  </button>
                </>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-primary transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
             </div>

             {/* Mobile header actions */}
             <div className="flex sm:hidden items-center justify-end gap-1 w-full">
               {isAuthenticated && currentUser && (
                 <button
                   onClick={() => setIsHeaderMenuOpen(prev => !prev)}
                   className="flex-1 max-w-[65%] flex items-center justify-center gap-1 text-xs font-medium text-slate-600 hover:text-brand-primary transition-colors px-2 py-1 rounded-md hover:bg-slate-50 border border-slate-200"
                 >
                   <BarChart3 className="h-3 w-3" />
                   <span className="truncate">Profile & Codes</span>
                 </button>
               )}
               <button
                 onClick={handleLogout}
                 className="flex items-center justify-center gap-1 text-xs font-medium text-slate-600 hover:text-brand-primary transition-colors px-2 py-1 rounded-md hover:bg-slate-50 border border-slate-200"
               >
                 <LogOut className="h-3 w-3" />
                 <span>Logout</span>
               </button>
             </div>
          </div>
        </header>
        {/* Mobile header dropdown */}
        {isHeaderMenuOpen && isAuthenticated && currentUser && (
          <div className="sm:hidden border-b border-slate-200 bg-white">
            <div className="container mx-auto px-3 py-3 space-y-3">
              <div className="flex flex-col gap-2">
                {currentUser?.role === 'Investor' && (
                  <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md font-mono flex justify-between">
                    <span>Investor Code</span>
                    <span className="font-semibold text-brand-primary">
                      {currentUser.investor_code || currentUser.investorCode || 'Not Set'}
                    </span>
                  </div>
                )}

                {currentUser?.role === 'Startup Facilitation Center' && (
                  <FacilitatorCodeDisplay 
                    className="bg-blue-50 text-blue-800 px-3 py-1.5 rounded-md text-xs font-medium w-full flex justify-between"
                    currentUser={currentUser}
                  />
                )}

                {currentUser?.role === 'Investment Advisor' && (
                  <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md font-mono flex justify-between">
                    <span>Advisor Code</span>
                    <span className="font-semibold text-brand-primary">
                      {(currentUser as any)?.investment_advisor_code || 'IA-XXXXXX'}
                    </span>
                  </div>
                )}

                {currentUser?.role === 'Mentor' && (
                  <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md font-mono flex justify-between">
                    <span>Mentor Code</span>
                    <span className="font-semibold text-brand-primary">
                      {(currentUser as any)?.mentor_code || 'MEN-XXXXXX'}
                    </span>
                  </div>
                )}

                {(currentUser?.role === 'Investor' || currentUser?.role === 'Startup') &&
                  currentUser?.investment_advisor_code_entered && (
                  <div className="text-xs text-slate-500 bg-purple-50 px-3 py-1.5 rounded-md font-mono flex justify-between">
                    <span>Advisor</span>
                    <span className="font-semibold text-purple-800">
                      {currentUser.investment_advisor_code_entered}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-2">
                {/* Profile switcher */}
                <div className="w-full">
                  <ProfileSwitcher
                    currentProfileId={currentUser.id}
                    onProfileSwitch={async (profile) => {
                      console.log('🔄 Profile switched to (mobile menu):', profile.role, profile.id);
                      
                      try {
                        // Wait longer for the database to fully update
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        // Verify the switch worked by checking current user (with retry)
                        let refreshedUser = null;
                        for (let attempt = 1; attempt <= 3; attempt++) {
                          refreshedUser = await authService.getCurrentUser(true); // Force refresh
                          console.log(`🔄 Attempt ${attempt} (mobile): Verified profile after switch:`, refreshedUser?.role, refreshedUser?.id, 'Expected:', profile.role, profile.id);
                          
                          if (refreshedUser && refreshedUser.id === profile.id) {
                            console.log('✅ Profile switch verified successfully (mobile)!');
                            break;
                          }
                          
                          if (attempt < 3) {
                            console.log(`⏳ Waiting for profile to update (attempt ${attempt}/3)...`);
                            await new Promise(resolve => setTimeout(resolve, 300));
                          }
                        }
                        
                        // Verify we got the right profile
                        if (!refreshedUser || refreshedUser.id !== profile.id) {
                          console.warn('⚠️ Profile ID mismatch (mobile)! Expected:', profile.id, 'Got:', refreshedUser?.id);
                          // Still proceed with refresh - the database should be correct
                        }
                        
                        // AUTOMATIC REFRESH: Reload page to ensure all data loads correctly with new profile
                        console.log('🔄 Refreshing page to load all data for new profile (mobile)...');
                        window.location.reload();
                      } catch (error) {
                        console.error('❌ Error switching profile (mobile):', error);
                        alert('Failed to switch profile. Please refresh the page.');
                        window.location.reload();
                      }
                    }}
                  />
                </div>

                {/* Add profile */}
                <button
                  onClick={() => {
                    setShowAddProfileModal(true);
                    setIsHeaderMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-primary transition-colors px-3 py-2 rounded-md hover:bg-slate-50 border border-slate-200"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Add Profile</span>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mx-4 mt-4">
            <div className="flex items-center">
              <div className="text-sm text-red-800">
                <strong>Error:</strong> {error}
              </div>
              <button 
                onClick={() => setError(null)} 
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          </div>
        )}
        
        <main className="container mx-auto p-4 sm:p-6 lg:p-8 flex-1">
          {/* Trial Status Banner */}
          {currentUser && showTrialBanner && (
            <TrialStatusBanner
              userId={currentUser.id}
              onTrialEnd={() => {
                setShowTrialBanner(false);
                fetchData();
              }}
            />
          )}
          <MainContent key={`${viewKey}-${forceRender}`} />
        </main>
      
        {/* Razorpay Subscription Modal removed */}

        {/* Trial Subscription Modal removed */}

        {/* Add Profile Modal */}
        {isAuthenticated && currentUser && (
          <AddProfileModal
            isOpen={showAddProfileModal}
            onClose={() => setShowAddProfileModal(false)}
            onProfileCreated={async () => {
              // Reload user data after profile creation
              const refreshedUser = await authService.getCurrentUser();
              if (refreshedUser) {
                setCurrentUser(refreshedUser);
                // Reload all data for new profile
                setHasInitialDataLoaded(false);
                fetchData(true);
              }
            }}
          />
        )}
      
      {/* Footer removed - only shows on landing page */}
      <Analytics />
        </div>
      </>
    );
};

export default App;
