import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Startup, NewInvestment, ComplianceStatus, StartupAdditionRequest, FundraisingDetails, InvestmentRecord, InvestmentType, UserRole, Founder, User, VerificationRequest, InvestmentOffer } from './types';
import { authService, AuthUser } from './lib/auth';
import { startupService, investmentService, verificationService, userService, realtimeService, startupAdditionService } from './lib/database';
import { caService } from './lib/caService';
import { csService } from './lib/csService';
import { dataMigrationService } from './lib/dataMigration';
import { storageService } from './lib/storage';
import { validationService, ValidationRequest } from './lib/validationService';
import { supabase } from './lib/supabase';
import InvestorView from './components/InvestorView';
import StartupHealthView from './components/StartupHealthView';
import AdminView from './components/AdminView';
import CAView from './components/CAView';
import CSView from './components/CSView';
import FacilitatorView from './components/FacilitatorView';
import InvestmentAdvisorView from './components/InvestmentAdvisorView';
import LoginPage from './components/LoginPage';
import { TwoStepRegistration } from './components/TwoStepRegistration';
import { CompleteRegistrationPage } from './components/CompleteRegistrationPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import LandingPage from './components/LandingPage';
import Footer from './components/Footer';
import PageRouter from './components/PageRouter';

import { Briefcase, BarChart3, LogOut } from 'lucide-react';
import LogoTMS from './components/public/logoTMS.svg';
import { FacilitatorCodeDisplay } from './components/FacilitatorCodeDisplay';

const App: React.FC = () => {
  // Check if we're on a standalone page (footer links)
  const standalonePages = ['/privacy-policy', '/cancellation-refunds', '/shipping', '/terms-conditions', '/about', '/contact', '/products'];
  const currentPath = window.location.pathname;
  
  if (standalonePages.includes(currentPath)) {
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
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  };

  // Initialize view from cookie or default to dashboard
  const [view, setView] = useState<'startupHealth' | 'dashboard'>(() => {
    const savedView = getCookie('currentView');
    return (savedView === 'startupHealth' || savedView === 'dashboard') ? savedView : 'dashboard';
  });
  const [viewKey, setViewKey] = useState(0); // Force re-render key
  const [forceRender, setForceRender] = useState(0); // Additional force render
  const [currentPage, setCurrentPage] = useState<'landing' | 'login' | 'register' | 'complete-registration' | 'reset-password'>(() => {
    // Check if we're on a reset password URL
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      
      // Check for reset password indicators
      if (pathname === '/reset-password' || 
          searchParams.get('type') === 'recovery' ||
          hash.includes('type=recovery') ||
          searchParams.get('access_token') ||
          searchParams.get('refresh_token')) {
        return 'reset-password';
      }
    }
    return 'landing';
  });
  
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [assignedInvestmentAdvisor, setAssignedInvestmentAdvisor] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAuthChange, setIsProcessingAuthChange] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialDataLoaded, setHasInitialDataLoaded] = useState(false);
  const [ignoreAuthEvents, setIgnoreAuthEvents] = useState(false);

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
  
  // Admin-related state
  const [users, setUsers] = useState<User[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [investmentOffers, setInvestmentOffers] = useState<InvestmentOffer[]>([]);
  const [validationRequests, setValidationRequests] = useState<ValidationRequest[]>([]);

  // Refs for state variables to avoid dependency issues
  const startupsRef = useRef<Startup[]>([]);
  const investmentOffersRef = useRef<InvestmentOffer[]>([]);
  const validationRequestsRef = useRef<ValidationRequest[]>([]);

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

  // Keep refs in sync with state
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    hasInitialDataLoadedRef.current = hasInitialDataLoaded;
  }, [hasInitialDataLoaded]);


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
    initializeAuth();
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

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      // SIMPLE FIX: If we're ignoring auth events, skip everything
      if (ignoreAuthEvents) {
        console.log('🚫 Ignoring auth event because ignoreAuthEvents flag is set');
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
      
      
      if (!isMounted) return;
      
      // Prevent unnecessary refreshes for TOKEN_REFRESHED events
      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      // Note: Duplicate auth event filtering is now handled at the Supabase level in auth.ts
      
      // Prevent multiple simultaneous auth state changes
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        // Check if we're already processing an auth state change
        if (isProcessingAuthChange) {
          console.log('Auth state change already in progress, skipping...');
          return;
        }
        
        // AGGRESSIVE FIX: Only block duplicate auth events, not all auth events
        if (isAuthenticatedRef.current && currentUserRef.current && hasInitialDataLoadedRef.current && session?.user && currentUserRef.current.id === session.user.id) {
          // Only block if this is a duplicate event (like window focus), not legitimate auth changes
          if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            console.log('🚫 AGGRESSIVE FIX: Blocking duplicate auth event to prevent unnecessary refresh');
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
          // If less than 5 seconds have passed, it's likely a duplicate event from window focus
          if (timeDiff < 5000) {
            console.log('🚫 Duplicate auth event detected (likely from window focus), skipping to prevent refresh');
            return;
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
            
            // Immediately set minimal user so UI can proceed
            if (isMounted) {
              const basicUser: AuthUser = {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name || 'Unknown',
                role: session.user.user_metadata?.role || 'Investor',
                startup_name: session.user.user_metadata?.startupName || undefined,
                registration_date: new Date().toISOString().split('T')[0]
              };
              const beforeUser = currentUser;
              const microSteps = [
                `1. Creating basic user from session`,
                `2. User email: ${basicUser.email}`,
                `3. User role: ${basicUser.role}`,
                `4. User startup name: ${basicUser.startup_name || 'none'}`,
                `5. Registration date: ${basicUser.registration_date}`,
                `6. Previous user: ${beforeUser?.email || 'none'}`,
                `7. Previous role: ${beforeUser?.role || 'none'}`,
                `8. About to call setCurrentUser`
              ];
              
              setCurrentUser(basicUser);
              setIsAuthenticated(true);
              setIsLoading(false);
              // Only reset data loading flag if this is a truly new user
              if (!hasInitialDataLoaded) {
                setHasInitialDataLoaded(false);
              }
            }

            // Try to get full profile, and if it doesn't exist, create it automatically
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
                    
                    // Create the profile
                    const { data: newProfile, error: createError } = await authService.supabase
                      .from('users')
                      .insert({
                        id: session.user.id,
                        email: session.user.email,
                        name: metadata.name,
                        role: metadata.role,
                        startup_name: metadata.startupName || null,
                        registration_date: new Date().toISOString().split('T')[0]
                      })
                      .select()
                      .single();

                    if (createError) {
                      console.error('Error creating profile automatically:', createError);
                    } else {
                      console.log('Profile created automatically:', newProfile);
                      
                      // If role is Startup and startup_name was provided, create startup record
                      if (metadata.role === 'Startup' && metadata.startupName) {
                        try {
                          const { data: existingStartup } = await authService.supabase
                            .from('startups')
                            .select('id')
                            .eq('name', metadata.startupName)
                            .single();

                          if (!existingStartup) {
                            await authService.supabase
                              .from('startups')
                              .insert({
                                name: metadata.startupName,
                                investment_type: 'Seed',
                                investment_value: 0,
                                equity_allocation: 0,
                                current_valuation: 0,
                                compliance_status: 'Pending',
                                sector: 'Technology',
                                total_funding: 0,
                                total_revenue: 0,
                                registration_date: new Date().toISOString().split('T')[0],
                                user_id: session.user.id
                              });
                            console.log('Startup record created automatically');
                          }
                        } catch (e) {
                          console.warn('Failed to create startup record automatically (non-blocking):', e);
                        }
                      }
                      
                      // Now try to get the profile again
                      profileUser = await authService.getCurrentUser();
                    }
                  }
                }
                
                if (profileUser && isMounted) {
                  console.log('Full profile loaded. Updating currentUser with startup_name:', profileUser.startup_name);
                  console.log('Profile completion status:', profileUser.is_profile_complete);
                  
                  // Check if profile is complete before setting as authenticated
                  if (!profileUser.is_profile_complete) {
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

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      // clearTimeout(timeoutId); // Removed timeout
    };
  }, []);


  // Fetch assigned investment advisor data
  const fetchAssignedInvestmentAdvisor = useCallback(async (advisorCode: string) => {
    try {
      console.log('🔍 Fetching investment advisor data for code:', advisorCode);
      const { data: advisor, error } = await supabase
        .from('users')
        .select('id, email, name, role, investment_advisor_code, logo_url')
        .eq('investment_advisor_code', advisorCode)
        .eq('role', 'Investment Advisor')
        .single();
      
      if (error) {
        console.error('❌ Error fetching investment advisor:', error);
        return null;
      }
      
      if (advisor) {
        console.log('✅ Found assigned investment advisor:', advisor);
        console.log('🔍 Advisor logo_url:', advisor.logo_url);
        console.log('🔍 Advisor has logo:', !!advisor.logo_url);
        setAssignedInvestmentAdvisor(advisor);
        return advisor;
      }
      
      return null;
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
    
    try {
      console.log('Fetching data for authenticated user...', { forceRefresh, hasInitialDataLoaded: hasInitialDataLoadedRef.current });
      
      // Fetch data with timeout to detect network issues
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - network may be unavailable')), 10000); // 10 second timeout
      });

             // Determine startup fetching method based on role
         let startupPromise;
         if (currentUserRef.current?.role === 'Admin') {
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
         userService.getAllUsers(),
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
      if (currentUser?.role === 'Investor' && Array.isArray(requests)) {
        const investorCode = (currentUser as any)?.investor_code || (currentUser as any)?.investorCode;
        const approvedNames = requests
          .filter((r: any) => (r.status || 'pending') === 'approved' && (
            // keep backward-compatible behavior when no investor_code stored
            !investorCode || !r?.investor_code || (r.investor_code === investorCode || r.investorCode === investorCode)
          ))
          .map((r: any) => r.name)
          .filter((n: any) => !!n);
        
        if (approvedNames.length > 0) {
          const canonical = await startupService.getStartupsByNames(approvedNames);
          
          // Merge unique by name (not id) to prevent duplicates
          const byName: Record<string, any> = {};
          
          // First add existing startups
          baseStartups.forEach((s: any) => { 
            if (s && s.name) byName[s.name] = s; 
          });
          
          // Then add approved startups (overwrite if duplicate name)
          canonical.forEach((s: any) => { 
            if (s && s.name) byName[s.name] = s; 
          });
          
          baseStartups = Object.values(byName) as any[];
        }
      }

       setStartups(baseStartups);
       setNewInvestments(investmentsData.status === 'fulfilled' ? investmentsData.value : []);
       setStartupAdditionRequests(requests);
       setUsers(usersData.status === 'fulfilled' ? usersData.value : []);
       setVerificationRequests(verificationData.status === 'fulfilled' ? verificationData.value : []);
       setInvestmentOffers(offersData.status === 'fulfilled' ? offersData.value : []);
       setValidationRequests(validationData.status === 'fulfilled' ? validationData.value : []);

      console.log('Data fetched successfully!');
      console.log('Startups loaded:', startupsData.status === 'fulfilled' ? startupsData.value.length : 0);
      console.log('Users loaded:', usersData.status === 'fulfilled' ? usersData.value.length : 0);
      console.log('Current user role:', currentUser?.role);
      
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
      
      // For startup users, automatically find their startup (only if not already set)
      if (currentUserRef.current?.role === 'Startup' && startupsData.status === 'fulfilled' && !selectedStartupRef.current) {
        console.log('🔍 Auto-finding startup for user:', currentUserRef.current.email);
        console.log('🔍 User startup_name:', currentUserRef.current.startup_name);
        console.log('🔍 Available startups:', startupsData.value.map(s => ({ name: s.name, id: s.id })));
        
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
          } else {
          }
        } else {
        }
      } else if (currentUserRef.current?.role === 'Startup' && selectedStartupRef.current) {
        console.log('🔍 Startup user already has selected startup, preserving current state');
        // Update selectedStartup with fresh data from the startups array
        if (startupsData.status === 'fulfilled') {
          const updatedStartup = startupsData.value.find(s => s.id === selectedStartupRef.current?.id);
          if (updatedStartup) {
            console.log('🔄 Updating selectedStartup with fresh data from database');
            setSelectedStartup(updatedStartup);
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
      // Mark that initial data has been loaded
      setHasInitialDataLoaded(true);
    }
  }, [fetchAssignedInvestmentAdvisor]);

  // Fetch data when authenticated - simplified approach
  useEffect(() => {
    if (isAuthenticated && currentUser && !hasInitialDataLoaded) {
      fetchData();
    }
  }, [isAuthenticated, currentUser?.id]);

  // Set ignore flag when user is fully authenticated and has data
  useEffect(() => {
    if (isAuthenticated && currentUser && hasInitialDataLoaded) {
      console.log('✅ User fully authenticated with data loaded, setting ignoreAuthEvents flag');
      setIgnoreAuthEvents(true);
    } else {
      setIgnoreAuthEvents(false);
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



  const handleLogin = useCallback((user: AuthUser) => {
    console.log(`User ${user.email} logged in as ${user.role}`);
    setIsAuthenticated(true);
    setCurrentUser(user);
    
    // For startup users, we'll set the view after data is loaded
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
            sector: "Technology",
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
      await authService.signOut();
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
    } catch (error) {
      console.error('Logout failed:', error);
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
        
        // If facilitator is trying to access a startup, we need to fetch it from the database
        if (currentUser?.role === 'Startup Facilitation Center') {
          console.log('🔍 Facilitator accessing startup, fetching from database...');
          
          // Call the async function to fetch startup data
          handleFacilitatorStartupAccess(startup, targetTab);
          return;
        } else {
          return; // For non-facilitator users, return if startup not found
        }
      }
    } else {
      startupObj = startup;
    }
    
    console.log('🔍 Setting selectedStartup to:', startupObj);
    
    // Set view-only mode based on user role
    const isViewOnlyMode = currentUser?.role === 'CA' || currentUser?.role === 'CS' || currentUser?.role === 'Startup Facilitation Center' || currentUser?.role === 'Investor';
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
      
      // Fetch startup data, share data, and founders data in parallel
      const [startupResult, sharesResult, foundersResult] = await Promise.allSettled([
        supabase
          .from('startups')
          .select('*')
          .eq('id', startupId)
          .single(),
        supabase
          .from('startup_shares')
          .select('total_shares, esop_reserved_shares, price_per_share')
          .eq('startup_id', startupId)
          .single(),
        supabase
          .from('founders')
          .select('name, email, shares, equity_percentage')
          .eq('startup_id', startupId)
      ]);
      
      const startupData = startupResult.status === 'fulfilled' ? startupResult.value : null;
      const sharesData = sharesResult.status === 'fulfilled' ? sharesResult.value : null;
      const foundersData = foundersResult.status === 'fulfilled' ? foundersResult.value : null;
      
      if (startupData.error || !startupData.data) {
        console.error('Error fetching startup from database:', startupData.error);
        alert('Unable to access startup. Please check your permissions.');
        return;
      }
      
      const fetchedStartup = startupData.data;
      const shares = sharesData.data;
      const founders = foundersData.data || [];
      
      // Map founders data to include shares
      const mappedFounders = founders.map((founder: any) => ({
        name: founder.name,
        email: founder.email,
        shares: founder.shares || 0,
        equityPercentage: founder.equity_percentage || 0
      }));
      
      // Convert database format to Startup interface
      const startupObj: Startup = {
        id: fetchedStartup.id,
        name: fetchedStartup.name,
        investmentType: fetchedStartup.investment_type,
        investmentValue: fetchedStartup.investment_value,
        equityAllocation: fetchedStartup.equity_allocation,
        currentValuation: fetchedStartup.current_valuation,
        complianceStatus: fetchedStartup.compliance_status,
        sector: fetchedStartup.sector,
        totalFunding: fetchedStartup.total_funding,
        totalRevenue: fetchedStartup.total_revenue,
        registrationDate: fetchedStartup.registration_date,
        founders: mappedFounders,
        // Add share data
        esopReservedShares: shares?.esop_reserved_shares || 0,
        totalShares: shares?.total_shares || 0,
        pricePerShare: shares?.price_per_share || 0
      };
      
      console.log('✅ Startup fetched from database with shares and founders:', startupObj);
      console.log('📊 Share data:', shares);
      console.log('👥 Founders data:', mappedFounders);
      
      // Set view-only mode for facilitator
      setIsViewOnly(true);
      setSelectedStartup(startupObj);
      setView('startupHealth');
      
      // Store the target tab for the StartupHealthView to use
      if (targetTab) {
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
      
      console.log('🔍 Facilitator startup access completed');
    } catch (error) {
      console.error('Error in facilitator startup access:', error);
      alert('Unable to access startup. Please try again.');
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
      const newStartup = await startupAdditionService.acceptStartupRequest(requestId);
      
      // Update local state
      setStartups(prev => [...prev, newStartup]);
      setStartupAdditionRequests(prev => prev.filter(req => req.id !== requestId));
      
      alert(`${newStartup.name} has been added to your portfolio.`);
    } catch (error) {
      console.error('Error accepting startup request:', error);
      alert('Failed to accept startup request. Please try again.');
    }
  }, []);
  
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
        alert(`${startup.name} is now listed for fundraising and a verification request has been sent to the admin.`);
    } else {
        alert(`${startup.name} is now listed for fundraising.`);
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
          
          alert(`Investor request created for ${startup.name}. It will appear in the investor's Approve Startup Requests.`);
      } catch (error) {
          console.error('❌ Error creating startup addition request:', error);
          alert('Failed to create investor request. Please try again.');
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
    alert('Founder information updated successfully.');
  }, []);

  const handleSubmitOffer = useCallback(async (opportunity: NewInvestment, offerAmount: number, equityPercentage: number, country?: string, startupAmountRaised?: number) => {
    if (!currentUserRef.current) return;
    
    try {
      // Since we're now referencing new_investments table which has the same IDs as startups,
      // we can use the opportunity.id directly (which is the startup ID)
      const newOffer = await investmentService.createInvestmentOffer({
        investor_email: currentUserRef.current.email,
        startup_name: opportunity.name,
        startup_id: opportunity.id, // This is the startup ID from the startups table
        offer_amount: offerAmount,
        equity_percentage: equityPercentage,
        country: country || 'United States',
        startup_amount_raised: startupAmountRaised || opportunity.totalFunding
      });
      
      // Update local state
      setInvestmentOffers(prev => [newOffer, ...prev]);
      
      const scoutingFee = newOffer.startup_scouting_fee_paid || 0;
      if (scoutingFee > 0) {
        alert(`Your offer for ${opportunity.name} has been submitted successfully! A startup scouting fee of $${scoutingFee.toFixed(2)} has been paid. The startup will now review your offer.`);
      } else {
        alert(`Your offer for ${opportunity.name} has been submitted successfully! The startup will now review your offer.`);
      }
    } catch (error) {
      console.error('Error submitting offer:', error);
      
      // Show more specific error message
      let errorMessage = 'Failed to submit offer. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = `Submit failed: ${JSON.stringify(error)}`;
      }
      
      alert(errorMessage);
    }
  }, []);

  const handleProcessVerification = useCallback(async (requestId: number, status: 'approved' | 'rejected') => {
    try {
      const result = await verificationService.processVerification(requestId, status);
      
      if (result.success) {
        // Update local state
        setVerificationRequests(prev => prev.filter(r => r.id !== requestId));
        
        if (status === 'approved') {
          alert(`Verification request has been approved and startup is now "Startup Nation Verified".`);
        } else {
          alert(`Verification request has been rejected.`);
        }
      }
    } catch (error) {
      console.error('Error processing verification:', error);
      alert('Failed to process verification. Please try again.');
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
        
        alert(message);
      }
    } catch (error) {
      console.error('Error processing offer:', error);
      alert('Failed to process offer. Please try again.');
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
      
      alert('Offer updated successfully!');
    } catch (error) {
      console.error('Error updating offer:', error);
      
      // Show more specific error message
      let errorMessage = 'Failed to update offer. Please try again.';
      if (error instanceof Error) {
        errorMessage = `Update failed: ${error.message}`;
      } else if (typeof error === 'object' && error !== null) {
        errorMessage = `Update failed: ${JSON.stringify(error)}`;
      }
      
      alert(errorMessage);
    }
  }, []);

  const handleCancelOffer = useCallback(async (offerId: number) => {
    try {
      await investmentService.deleteInvestmentOffer(offerId);
      
      // Update local state
      setInvestmentOffers(prev => prev.filter(o => o.id !== offerId));
      
      alert('Offer cancelled successfully!');
    } catch (error) {
      console.error('Error cancelling offer:', error);
      alert('Failed to cancel offer. Please try again.');
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
        alert(`The validation request for ${request.startupName} has been ${status}.`);
      }
    } catch (error) {
      console.error('Error processing validation request:', error);
      alert('Failed to process validation request. Please try again.');
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
      alert(`${startupName} compliance status has been updated to ${status}.`);
    } catch (error) {
      console.error('❌ Error updating compliance:', error);
      alert(`Failed to update compliance status: ${error.message || 'Unknown error'}. Please try again.`);
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



  if (isLoading) {
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
              </div>
          </div>
      )
  }



  // Check if we need to show complete-registration page (even when authenticated)
  if (currentPage === 'complete-registration') {
    console.log('🎯 Showing CompleteRegistrationPage (Form 2)');
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
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
                }
              } catch (error) {
                console.error('❌ Error refreshing user data:', error);
                // Still navigate even if refresh fails
                setIsAuthenticated(true);
                setCurrentPage('login');
              }
            }}
          />
        </div>
        {/* Footer for complete-registration page */}
        <Footer />
      </div>
    );
  }

  // Check if we need to show reset-password page
  if (currentPage === 'reset-password') {
    console.log('🎯 Showing ResetPasswordPage');
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <ResetPasswordPage 
            onNavigateToLogin={() => setCurrentPage('login')}
          />
        </div>
        {/* Footer for reset-password page */}
        <Footer />
      </div>
    );
  }

  console.log('🔍 App.tsx render - currentPage:', currentPage, 'isAuthenticated:', isAuthenticated);
  
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
                            console.log('🔄 Navigating to complete-registration page');
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

  const MainContent = () => {
    // Wait for user role to be loaded before showing role-based views
    if (isAuthenticated && currentUser && !currentUser.role) {
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
      
      // Find the user's startup by startup_name from users table
      let userStartup = startups.find(startup => startup.name === currentUser.startup_name);
      // Fallback: if no match but exactly one startup is available, pick it
      if (!userStartup && startups.length === 1) {
        console.log('🔁 Fallback in renderer: selecting the only startup available for this user');
        userStartup = startups[0];
      }
      
      console.log('🚨🚨🚨 APP COMPONENT DEBUGGING - STARTUP DATA 🚨🚨🚨');
      console.log('🔍 Found user startup:', userStartup);
      console.log('🔍 User startup founders:', userStartup?.founders);
      console.log('🔍 User startup ESOP reserved shares:', userStartup?.esopReservedShares);
      console.log('🚨🚨🚨 END APP COMPONENT DEBUGGING 🚨🚨🚨');
      
      // If user's startup is found, show the health view
      if (userStartup) {
        console.log('✅ Rendering StartupHealthView for startup:', userStartup.name);
        return (
          <StartupHealthView 
            startup={userStartup}
            userRole={currentUser?.role}
            user={currentUser}
            onBack={() => {}} // No back button needed for startup users
            onActivateFundraising={handleActivateFundraising}
            onInvestorAdded={handleInvestorAdded}
            onUpdateFounders={handleUpdateFounders}
            investmentOffers={investmentOffers}
            onProcessOffer={handleProcessOffer}
          />
        );
      }
      
      // If no startup found, show appropriate message
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

    // Default fallback
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold">TrackMyStartup - Welcome, {currentUser?.email}</h2>
        <p className="text-slate-500 mt-2">Startup user view - select a startup to view details.</p>
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* Show investment advisor logo if user is an Investment Advisor OR has an assigned investment advisor */}
            {(() => {
              const isInvestmentAdvisor = currentUser?.role === 'Investment Advisor' && (currentUser as any)?.logo_url;
              const hasAssignedAdvisor = assignedInvestmentAdvisor && (currentUser?.role === 'Investor' || currentUser?.role === 'Startup');
              const shouldShowAdvisorLogo = Boolean(isInvestmentAdvisor || hasAssignedAdvisor);
              
              console.log('🔍 Header logo display check:', {
                currentUserRole: currentUser?.role,
                currentUserLogo: (currentUser as any)?.logo_url,
                assignedAdvisor: !!assignedInvestmentAdvisor,
                assignedAdvisorLogo: assignedInvestmentAdvisor?.logo_url,
                isInvestmentAdvisor,
                hasAssignedAdvisor,
                shouldShowAdvisorLogo
              });
              return shouldShowAdvisorLogo;
            })() ? (
              <div className="flex items-center gap-3">
                {((currentUser?.role === 'Investment Advisor' && (currentUser as any)?.logo_url) || 
                  (assignedInvestmentAdvisor?.logo_url)) ? (
                  <>
                    <img 
                      src={currentUser?.role === 'Investment Advisor' 
                        ? (currentUser as any).logo_url 
                        : assignedInvestmentAdvisor?.logo_url} 
                      alt="Company Logo" 
                      className="h-8 w-8 rounded object-contain bg-white border border-gray-200 p-1"
                      onError={(e) => {
                        // Fallback to TrackMyStartup logo if image fails to load
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <img src={LogoTMS} alt="TrackMyStartup" className="h-8 w-8 scale-[5] md:scale-[4] lg:scale-[5] xl:scale-[6] origin-left hidden" />
                  </>
                ) : (
                  <div className="h-8 w-8 rounded bg-purple-100 border border-purple-200 flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-xs">IA</span>
                  </div>
                )}
                <div>
                  <h1 className="text-lg font-semibold text-gray-800">
                    {currentUser?.role === 'Investment Advisor' 
                      ? (currentUser as any).name || 'Investment Advisor'
                      : assignedInvestmentAdvisor?.name || 'Investment Advisor'}
                  </h1>
                  <p className="text-xs text-blue-600">Supported by Track My Startup</p>
                </div>
              </div>
            ) : (
              <img src={LogoTMS} alt="TrackMyStartup" className="h-8 w-8 scale-[5] md:scale-[4] lg:scale-[5] xl:scale-[6] origin-left" />
            )}
          </div>
           <div className="flex items-center gap-6">
            {currentUser?.role === 'Investor' && (
                <div className="hidden sm:block text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md font-mono">
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
                <div className="hidden sm:block text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md font-mono">
                    Advisor Code: <span className="font-semibold text-brand-primary">
                        {(currentUser as any)?.investment_advisor_code || 'IA-XXXXXX'}
                    </span>
                </div>
            )}

            {(currentUser?.role === 'Investor' || currentUser?.role === 'Startup') && currentUser?.investment_advisor_code_entered && (
                <div className="hidden sm:block text-sm text-slate-500 bg-purple-100 px-3 py-1.5 rounded-md font-mono">
                    Advisor: <span className="font-semibold text-purple-800">
                        {currentUser.investment_advisor_code_entered}
                    </span>
                </div>
            )}

            <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-primary transition-colors">
                <LogOut className="h-4 w-4" />
                Logout
            </button>
           </div>
        </div>
      </header>
      
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
        <MainContent key={`${viewKey}-${forceRender}`} />
      </main>
      
      {/* Footer removed - only shows on landing page */}
    </div>
  );
};

export default App;
