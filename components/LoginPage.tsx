import React, { useEffect, useState, useCallback } from 'react';
import { authService, AuthUser } from '../lib/auth';
import Card from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';
import ForgotPasswordModal from './ForgotPasswordModal';
import { Loader2, ArrowLeft } from 'lucide-react';

interface LoginPageProps {
    onLogin: (user: AuthUser) => void;
    onNavigateToRegister: () => void;
    onNavigateToCompleteRegistration: () => void;
    onNavigateToLanding?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onNavigateToRegister, onNavigateToCompleteRegistration, onNavigateToLanding }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

    const resolveAndLogin = useCallback(async (fallbackUser: AuthUser) => {
        try {
            const refreshedUser = await authService.getCurrentUser();
            if (refreshedUser) {
                onLogin(refreshedUser);
                return;
            }
        } catch (error) {
            console.warn('⚠️ Failed to fetch full profile after auth, using fallback user', error);
        }
        onLogin(fallbackUser);
    }, [onLogin]);

    // Removed forced sign-out on mount to avoid racing with sign-in on mobile

    // Auto-restore if a valid session already exists (common on mobile after refresh)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await authService.supabase.auth.getSession();
                if (data?.session) {
                    const { data: userData } = await authService.supabase.auth.getUser();
                    if (!cancelled && userData?.user) {
                        const u = userData.user;
                        resolveAndLogin({
                            id: u.id,
                            email: u.email || '',
                            name: u.user_metadata?.name || 'Unknown',
                            role: u.user_metadata?.role || 'Investor',
                            registration_date: new Date().toISOString().split('T')[0]
                        } as AuthUser);
                    }
                }
            } catch {}
        })();
        return () => { cancelled = true; };
    }, [onLogin]);

    // Also listen for auth events while on the login page and proceed immediately
    useEffect(() => {
        const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                const u = session?.user;
                if (u) {
                    resolveAndLogin({
                        id: u.id,
                        email: u.email || '',
                        name: u.user_metadata?.name || 'Unknown',
                        role: u.user_metadata?.role || 'Investor',
                        registration_date: new Date().toISOString().split('T')[0]
                    } as AuthUser);
                    try { (window as any).forceDataRefresh?.(); } catch {}
                }
            }
        });
        return () => { subscription?.unsubscribe(); };
    }, [onLogin]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setIsRedirecting(false);

        // Add timeout to prevent UI from getting stuck
        const timeoutMs = 30000; // Extended for mobile networks
        const timeoutId = setTimeout(async () => {
            setIsLoading(false);
            setError('Login timed out. Please try again.');
            try {
                // If a session actually exists, proceed instead of forcing manual refresh
                const { data } = await authService.supabase.auth.getSession();
                if (data?.session) {
                    const { data: userData } = await authService.supabase.auth.getUser();
                    if (userData?.user) {
                        const u = userData.user;
                        resolveAndLogin({
                            id: u.id,
                            email: u.email || '',
                            name: u.user_metadata?.name || 'Unknown',
                            role: u.user_metadata?.role || 'Investor',
                            registration_date: new Date().toISOString().split('T')[0]
                        } as AuthUser);
                        try { (window as any).forceDataRefresh?.(); } catch {}
                        return;
                    }
                }
            } catch {}
            // As a last resort, auto-refresh the app after a brief pause
            setTimeout(() => { try { window.location.reload(); } catch {} }, 1500);
        }, timeoutMs);

        try {
            // If a valid session already exists (common on mobile after refresh),
            // skip password sign-in and continue straight to the app.
            const existing = await authService.supabase.auth.getSession();
            if (existing.data?.session) {
                clearTimeout(timeoutId);
                const { data: userData } = await authService.supabase.auth.getUser();
                if (userData?.user) {
                    const u = userData.user;
                    resolveAndLogin({
                        id: u.id,
                        email: u.email || '',
                        name: u.user_metadata?.name || 'Unknown',
                        role: u.user_metadata?.role || 'Investor',
                        registration_date: new Date().toISOString().split('T')[0]
                    } as AuthUser);
                    return;
                }
            }

            const { user, error: loginError } = await authService.signInMinimal({ email, password });
            
            clearTimeout(timeoutId); // Clear timeout if login completes
            
            if (user) {
                console.log('User authenticated:', user.email);
                
                // Check if user needs to complete Form 2 (document upload)
                // Fetch from users table for documents
                const { data: userProfiles, error: userProfileError } = await authService.supabase
                    .from('users')
                    .select('government_id, ca_license, startup_name')
                    .eq('id', user.id);
                
                // Fetch from startups table for company info
                // First try with user_id, then fallback to startup_name matching
                let { data: startupProfiles, error: startupProfileError } = await authService.supabase
                    .from('startups')
                    .select('name, country, user_id')
                    .eq('user_id', user.id);
                
                const userProfile = userProfiles && userProfiles.length > 0 ? userProfiles[0] : null;
                
                // If no startup found by user_id, try matching by startup_name from user profile
                if ((!startupProfiles || startupProfiles.length === 0) && userProfile?.startup_name) {
                    console.log('🔍 No startup found by user_id, trying startup_name match:', userProfile.startup_name);
                    const { data: startupByName, error: startupByNameError } = await authService.supabase
                        .from('startups')
                        .select('name, country, user_id')
                        .eq('name', userProfile.startup_name);
                    
                    if (startupByName && startupByName.length > 0) {
                        startupProfiles = startupByName;
                        startupProfileError = startupByNameError;
                        console.log('✅ Found startup by name match:', startupByName[0]);
                    }
                }
                
                const startupProfile = startupProfiles && startupProfiles.length > 0 ? startupProfiles[0] : null;
                
                console.log('Profile check result:', { 
                    userProfile, 
                    startupProfile,
                    userProfileError,
                    startupProfileError,
                    hasGovId: !!userProfile?.government_id, 
                    hasCaLicense: !!userProfile?.ca_license,
                    hasCompanyName: !!startupProfile?.name,
                    hasCountry: !!startupProfile?.country,
                    govIdValue: userProfile?.government_id,
                    caLicenseValue: userProfile?.ca_license,
                    companyNameValue: startupProfile?.name,
                    countryValue: startupProfile?.country,
                    userStartupName: userProfile?.startup_name,
                    startupUserId: startupProfile?.user_id,
                    currentUserId: user.id
                });
                
                console.log('🔍 Detailed Form 2 verification:', {
                    userProfileExists: !!userProfile,
                    governmentIdExists: !!userProfile?.government_id,
                    startupProfileExists: !!startupProfile,
                    startupNameExists: !!startupProfile?.name,
                    startupCountryExists: !!startupProfile?.country,
                    willRedirectToForm2: !userProfile || !userProfile.government_id || !startupProfile || !startupProfile.name || !startupProfile.country,
                    userProfileData: userProfile,
                    startupProfileData: startupProfile
                });
                
                if (userProfileError || startupProfileError) {
                    console.error('Error fetching profiles:', { userProfileError, startupProfileError });
                    // If error fetching profile, redirect to Form 2
                    onNavigateToCompleteRegistration();
                    return;
                }
                
                if (!userProfile) {
                    // No user profile found - user needs to complete Form 2
                    console.log('No user profile found - redirecting to Form 2');
                    onNavigateToCompleteRegistration();
                    return;
                } else if (!userProfile.government_id) {
                    // User profile exists but government_id missing - user needs to complete Form 2
                    console.log('User profile exists but government_id missing - redirecting to Form 2');
                    console.log('Missing field:', { 
                      govId: userProfile.government_id
                    });
                    onNavigateToCompleteRegistration();
                    return;
                } else if (!startupProfile || !startupProfile.name || !startupProfile.country) {
                    // User documents complete but startup profile missing - check if user has startup_name in profile
                    console.log('User documents complete but startup profile missing - checking for startup_name in user profile');
                    console.log('Missing startup fields:', { 
                      companyName: startupProfile?.name,
                      country: startupProfile?.country,
                      userStartupName: userProfile?.startup_name
                    });
                    
                    // If user has startup_name in their profile, they might have completed Form 2 but startup record is missing
                    // In this case, let them proceed to dashboard and the system will handle the missing startup record
                    if (userProfile?.startup_name) {
                        console.log('✅ User has startup_name in profile, allowing dashboard access');
                        resolveAndLogin(user);
                        return;
                    }
                    
                    // Otherwise, redirect to Form 2
                    onNavigateToCompleteRegistration();
                    return;
                } else {
                    // User is complete, proceed to dashboard
                    console.log('User complete, proceeding to dashboard');
                        resolveAndLogin(user);
                    try { (window as any).forceDataRefresh?.(); } catch {}
                }
            } else if (loginError) {
                setError(loginError);
                
                // If user doesn't exist, suggest registration
                if (loginError.includes('does not exist') || loginError.includes('Please register first')) {
                    setIsRedirecting(true);
                    // Auto-redirect to registration after 3 seconds
                    setTimeout(() => {
                        onNavigateToRegister();
                    }, 3000);
                }
            } else {
                // Edge case: no error and no user returned; try to read current user
                const { data: userData } = await authService.supabase.auth.getUser();
                if (userData?.user) {
                    const u = userData.user;
                    resolveAndLogin({
                        id: u.id,
                        email: u.email || '',
                        name: u.user_metadata?.name || 'Unknown',
                        role: u.user_metadata?.role || 'Investor',
                        registration_date: new Date().toISOString().split('T')[0]
                    } as AuthUser);
                    return;
                }
            }
        } catch (err: any) {
            clearTimeout(timeoutId); // Clear timeout on error
            console.error('Login error:', err);
            setError(err.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-md mb-4 flex justify-start">
                <button
                    onClick={() => {
                        // Always go back to previous page using browser history
                        // This will work for both external websites and internal app navigation
                        window.history.back();
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 hover:text-slate-900 transition-all duration-200 shadow-sm hover:shadow-md"
                    aria-label="Back"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                </button>
            </div>
            <Card className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Sign in to your account</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        Or{' '}
                        <button onClick={onNavigateToRegister} className="font-medium text-brand-primary hover:text-brand-secondary">
                            create a new account
                        </button>
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input 
                        label="Email address"
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <div className="space-y-2">
                        <Input 
                            label="Password"
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <div className="text-right">
                            <button
                                type="button"
                                onClick={() => setIsForgotPasswordOpen(true)}
                                className="text-sm text-brand-primary hover:text-brand-secondary font-medium"
                            >
                                Forgot your password?
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                            <p className="text-red-800 text-sm">{error}</p>
                            {isRedirecting && (
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                    <p className="text-red-600 text-xs">
                                        Redirecting to registration...
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <Button type="submit" className="w-full" disabled={isLoading || isRedirecting}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : isRedirecting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Redirecting...
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </Button>
                    </div>
                </form>
            </Card>

            {/* Forgot Password Modal */}
            <ForgotPasswordModal
                isOpen={isForgotPasswordOpen}
                onClose={() => setIsForgotPasswordOpen(false)}
            />
        </div>
    );
};

export default LoginPage;