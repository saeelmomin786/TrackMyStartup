import React, { useEffect, useState, useCallback } from 'react';
import { authService, AuthUser } from '../lib/auth';
import Card from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';
import ForgotPasswordModal from './ForgotPasswordModal';
import { Loader2, Eye, EyeOff } from 'lucide-react';

interface LoginPageProps {
    onLogin: (user: AuthUser) => void;
    onNavigateToRegister: () => void;
    onNavigateToCompleteRegistration: () => void;
    onNavigateToLanding?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onNavigateToRegister, onNavigateToCompleteRegistration, onNavigateToLanding }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

    const resolveAndLogin = useCallback(async (fallbackUser: AuthUser) => {
        try {
            // Force refresh on login to ensure we get fresh data from database
            // Cache is already cleared on logout, but forceRefresh ensures fresh data
            const refreshedUser = await authService.getCurrentUser(true);
            if (refreshedUser) {
                console.log('✅ Fresh user data loaded on login');
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
                // Use getCurrentUser() which handles user_profiles first, then falls back to users table
                // This ensures we use the correct table based on the multi-profile system
                const currentUser = await authService.getCurrentUser();
                const userProfile = currentUser ? {
                    government_id: currentUser.government_id,
                    ca_license: currentUser.ca_license,
                    startup_name: currentUser.startup_name
                } : null;
                
                // Fetch from startups table for company info
                // Use auth_user_id (from auth.users) which matches startups.user_id
                let { data: startupProfiles } = await authService.supabase
                    .from('startups')
                    .select('name, country, user_id')
                    .eq('user_id', user.id);
                
                // If no startup found by user_id, try matching by startup_name from user profile
                if ((!startupProfiles || startupProfiles.length === 0) && userProfile?.startup_name) {
                    console.log('🔍 No startup found by user_id, trying startup_name match:', userProfile.startup_name);
                    const { data: startupByName } = await authService.supabase
                        .from('startups')
                        .select('name, country, user_id')
                        .eq('name', userProfile.startup_name);
                    
                    if (startupByName && startupByName.length > 0) {
                        startupProfiles = startupByName;
                        console.log('✅ Found startup by name match:', startupByName[0]);
                    }
                }
                
                const startupProfile = startupProfiles && startupProfiles.length > 0 ? startupProfiles[0] : null;
                
                console.log('Profile check result:', { 
                    userProfile, 
                    startupProfile,
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
                
                if (!userProfile || !currentUser) {
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
                } else if (currentUser.role === 'Startup' && (!startupProfile || !startupProfile.name || !startupProfile.country)) {
                    // Only check startup profile for users with "Startup" role
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
                    // For non-Startup roles (Investment Advisor, Investor, etc.), they don't need startup profile
                    console.log('User complete, proceeding to dashboard');
                    console.log('User role:', currentUser.role, '- startup profile check skipped for non-Startup roles');
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
        <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 py-8 px-4">
            <div className="w-full max-w-md">
                {/* Professional Card with Enhanced Design */}
                <Card className="w-full shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                    {/* Header Section Inside Card */}
                    <div className="text-center mb-8 pb-6 border-b border-slate-100">
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2">
                            Sign in to your account
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Enter your credentials to access your account
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
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
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Input 
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="text-right pt-1">
                            <button
                                type="button"
                                onClick={() => setIsForgotPasswordOpen(true)}
                                className="text-sm text-brand-primary hover:text-brand-secondary font-medium transition-colors focus:outline-none"
                            >
                                Forgot password?
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50/80 border border-red-200 rounded-lg p-4 backdrop-blur-sm">
                            <p className="text-red-800 text-sm font-medium">{error}</p>
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

                    <div className="pt-1">
                        <Button type="submit" className="w-full h-11 text-base font-semibold shadow-sm hover:shadow-md transition-shadow" disabled={isLoading || isRedirecting}>
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

                    {/* Register Link */}
                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <p className="text-center text-sm text-slate-600">
                            Don't have an account?{' '}
                            <button 
                                onClick={onNavigateToRegister} 
                                className="font-semibold text-brand-primary hover:text-brand-secondary transition-colors focus:outline-none"
                            >
                                Create a new account
                            </button>
                        </p>
                    </div>
                </Card>
            </div>

            {/* Forgot Password Modal */}
            <ForgotPasswordModal
                isOpen={isForgotPasswordOpen}
                onClose={() => setIsForgotPasswordOpen(false)}
            />
        </div>
    );
};

export default LoginPage;