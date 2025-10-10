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
                const { data: profiles, error: profileError } = await authService.supabase
                    .from('users')
                    .select('government_id, ca_license, company, country')
                    .eq('id', user.id);
                
                const profile = profiles && profiles.length > 0 ? profiles[0] : null;
                
                console.log('Profile check result:', { 
                    profile, 
                    profileError,
                    hasGovId: !!profile?.government_id, 
                    hasCaLicense: !!profile?.ca_license,
                    govIdValue: profile?.government_id,
                    caLicenseValue: profile?.ca_license
                });
                
                if (profileError) {
                    console.error('Error fetching profile:', profileError);
                    // If error fetching profile, redirect to Form 2
                    onNavigateToCompleteRegistration();
                    return;
                }
                
                if (!profile) {
                    // No profile found - user needs to complete Form 2
                    console.log('No profile found - redirecting to Form 2');
                    onNavigateToCompleteRegistration();
                    return;
                } else if (!profile.government_id || !profile.ca_license || !profile.company || !profile.country) {
                    // Profile exists but documents missing - user needs to complete Form 2
                    console.log('Profile exists but documents missing - redirecting to Form 2');
                    console.log('Missing fields:', { 
                      govId: profile.government_id, 
                      caLicense: profile.ca_license,
                      company: profile.company,
                      country: profile.country
                    });
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