import React, { useState } from 'react';
import { authService, AuthUser } from '../lib/auth';
import Card from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';
import ForgotPasswordModal from './ForgotPasswordModal';
import { Loader2 } from 'lucide-react';
import LogoTMS from './public/logoTMS.svg';

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setIsRedirecting(false);

        // Add timeout to prevent UI from getting stuck
        const timeoutId = setTimeout(() => {
            setIsLoading(false);
            setError('Login timed out. Please try again.');
        }, 10000); // 10 second timeout

        try {
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
                        onLogin(user);
                        return;
                    }
                    
                    // Otherwise, redirect to Form 2
                    onNavigateToCompleteRegistration();
                    return;
                } else {
                    // User is complete, proceed to dashboard
                    console.log('User complete, proceeding to dashboard');
                    onLogin(user);
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
            {onNavigateToLanding && (
                <div className="w-full max-w-md mb-4 flex justify-start">
                    <button
                        onClick={onNavigateToLanding}
                        className="text-sm text-slate-500 hover:text-slate-700 underline"
                        aria-label="Back"
                    >
                        ← Back
                    </button>
                </div>
            )}
            <Card className="w-full max-w-md">
                <div className="text-center mb-8">
                    <img 
                      src={LogoTMS} 
                      alt="TrackMyStartup" 
                      className="mx-auto h-40 w-40 cursor-pointer hover:opacity-80 transition-opacity" 
                      onClick={onNavigateToLanding}
                    />
                    <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Sign in to your account</h2>
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