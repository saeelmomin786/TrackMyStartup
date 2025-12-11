import React, { useState, useEffect } from 'react';
import { authService } from '../lib/auth';
import { getQueryParam } from '../lib/urlState';
import Card from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';
import { Lock, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

interface ResetPasswordPageProps {
  onNavigateToLogin: () => void;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onNavigateToLogin }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  // Check if we have the necessary tokens from URL and handle Supabase session
  useEffect(() => {
    const handleResetPasswordSession = async () => {
      console.log('=== RESET PASSWORD SESSION DEBUG ===');
      console.log('Full URL:', window.location.href);
      console.log('Pathname:', window.location.pathname);
      console.log('Search params:', window.location.search);
      console.log('Hash:', window.location.hash);
      
    const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      
      // Check for tokens in URL parameters or hash
      const accessToken = searchParams.get('access_token') || 
                         (hash.includes('access_token=') ? hash.split('access_token=')[1]?.split('&')[0] : null);
      const refreshToken = searchParams.get('refresh_token') || 
                          (hash.includes('refresh_token=') ? hash.split('refresh_token=')[1]?.split('&')[0] : null);
      
      // Check for code parameter (alternative Supabase flow)
      const code = searchParams.get('code') || (hash.includes('code=') ? hash.split('code=')[1]?.split('&')[0] : null);
      
      // Check for PKCE token in URL (newer Supabase flow)
      const pkceToken = searchParams.get('token') || (hash.includes('token=') ? hash.split('token=')[1]?.split('&')[0] : null);
      
      // Also check for type parameter (Supabase sometimes uses this)
      const type = searchParams.get('type') || (hash.includes('type=') ? hash.split('type=')[1]?.split('&')[0] : null);
      
      // Check for invite link errors
      const error = searchParams.get('error') || (hash.includes('error=') ? hash.split('error=')[1]?.split('&')[0] : null);
      const errorCode = searchParams.get('error_code') || (hash.includes('error_code=') ? hash.split('error_code=')[1]?.split('&')[0] : null);
      const errorDescription = searchParams.get('error_description') || (hash.includes('error_description=') ? hash.split('error_description=')[1]?.split('&')[0] : null);
      
      // Handle invite link errors
      if (errorCode === 'otp_expired' || (error === 'access_denied' && type === 'invite')) {
        console.log('⚠️ Invite link expired or invalid:', { error, errorCode, errorDescription });
        setError('This invite link has expired or is invalid. Please contact your Investment Advisor to send a new invite.');
        return; // Don't proceed with password setup
      }
      
      console.log('Token extraction results:', { 
        accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : null,
        refreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : null,
        code: code ? `${code.substring(0, 20)}...` : null,
        pkceToken: pkceToken ? `${pkceToken.substring(0, 20)}...` : null,
        type: type,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasCode: !!code,
        hasPkceToken: !!pkceToken
      });
      
      // Handle code parameter first (most common for password reset)
      if (code && !accessToken && !refreshToken) {
        console.log('Found code parameter, attempting to exchange for session...');
        try {
          const { data, error: exchangeError } = await authService.supabase.auth.exchangeCodeForSession(code);
          if (!exchangeError && data) {
            console.log('Code exchanged for session successfully:', data);
            setIsSessionReady(true);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return; // Exit early, session is ready
          } else {
            console.log('exchangeCodeForSession failed:', exchangeError);
            // Don't set error yet, try other methods
          }
        } catch (err) {
          console.error('Error exchanging code for session:', err);
          // Don't set error yet, try other methods
        }
      }
      
      if (accessToken && refreshToken) {
        try {
          console.log('Setting session with tokens...');
          // Set the session using Supabase
          const { data, error } = await authService.supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.error('Error setting reset password session:', error);
            setError(`Invalid or expired reset link: ${error.message}`);
          } else {
            console.log('Reset password session established successfully:', data);
            setIsSessionReady(true);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (err) {
          console.error('Error handling reset password session:', err);
          setError(`Invalid or expired reset link: ${err.message}`);
        }
      } else if (pkceToken) {
        // Handle PKCE token (newest Supabase flow)
        console.log('Found PKCE token, attempting to verify OTP...');
        try {
          // Try multiple approaches for PKCE token verification
          let verificationSuccess = false;
          
          // Approach 1: Try verifyOtp with token_hash
          try {
            const { data, error } = await authService.supabase.auth.verifyOtp({
              token_hash: pkceToken,
              type: 'recovery'
            });
            
            if (!error && data) {
              console.log('PKCE OTP verified successfully with token_hash:', data);
              setIsSessionReady(true);
              verificationSuccess = true;
              // Clean up URL
              window.history.replaceState({}, document.title, window.location.pathname);
            } else {
              console.log('PKCE token_hash approach failed:', error);
            }
          } catch (err) {
            console.log('PKCE token_hash approach error:', err);
          }
          
          // Approach 2: Try verifyOtp with token (requires email, so skip for now)
          if (!verificationSuccess) {
            console.log('Skipping PKCE token approach (requires email), trying other methods...');
          }
          
          if (!verificationSuccess) {
            console.log('All PKCE verification approaches failed - the reset link is invalid or expired');
            setError('Invalid or expired reset link. Please request a new password reset.');
            return;
          }
          
        } catch (err) {
          console.error('Error handling PKCE token verification:', err);
          setError(`Invalid or expired reset link: ${err.message}`);
        }
      } else if (code) {
        // Handle code-based authentication (newer Supabase flow)
        console.log('Found code parameter, attempting to verify OTP...');
        try {
          // Try multiple approaches for password reset verification
          let verificationSuccess = false;
          
          // Approach 1: Try verifyOtp with token_hash
          try {
            const { data, error } = await authService.supabase.auth.verifyOtp({
              token_hash: code,
              type: 'recovery'
            });
            
            if (!error && data) {
              console.log('OTP verified successfully with token_hash:', data);
              setIsSessionReady(true);
              verificationSuccess = true;
              // Clean up URL
              window.history.replaceState({}, document.title, window.location.pathname);
            } else {
              console.log('token_hash approach failed:', error);
            }
          } catch (err) {
            console.log('token_hash approach error:', err);
          }
          
          // Approach 1.5: Try verifyOtp with just the code as token (requires email, so skip for now)
          if (!verificationSuccess) {
            console.log('Skipping token approach (requires email), trying other methods...');
          }
          
          // Approach 2: Try verifyOtp with email and token (if approach 1 failed)
          if (!verificationSuccess) {
            try {
              // We need to get the email from somewhere - let's try a different approach
              // For now, let's skip this approach and go to the next one
              console.log('Skipping token approach, trying exchangeCodeForSession...');
            } catch (err) {
              console.log('token approach error:', err);
            }
          }
          
          // Approach 3: Try exchangeCodeForSession (if both above failed)
          if (!verificationSuccess) {
            try {
              const { data, error } = await authService.supabase.auth.exchangeCodeForSession(code);
              
              if (!error && data) {
                console.log('Code exchanged for session successfully:', data);
                setIsSessionReady(true);
                verificationSuccess = true;
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
              } else {
                console.log('exchangeCodeForSession failed:', error);
              }
            } catch (err) {
              console.log('exchangeCodeForSession error:', err);
            }
          }
          
          // Approach 4: Try to get user info directly (some setups allow this)
          if (!verificationSuccess) {
            try {
              // Try to get the current user - sometimes the code automatically establishes a session
              const { data: { user }, error } = await authService.supabase.auth.getUser();
              if (user && !error) {
                console.log('User session found after code processing:', user.email);
                setIsSessionReady(true);
                verificationSuccess = true;
              } else {
                console.log('No user session found after code processing:', error);
              }
            } catch (err) {
              console.log('Error getting user after code processing:', err);
            }
          }
          
          // Approach 5: If all else fails, don't proceed - the code is invalid
          if (!verificationSuccess) {
            console.log('All verification approaches failed - the reset link is invalid or expired');
            setError('Invalid or expired reset link. Please request a new password reset.');
            return; // Don't set session ready
          }
          
          if (!verificationSuccess) {
            setError('Invalid or expired reset link. Please request a new password reset.');
          }
          
        } catch (err) {
          console.error('Error handling code verification:', err);
          setError(`Invalid or expired reset link: ${err.message}`);
        }
      } else if (type === 'recovery') {
        // Handle recovery type links (alternative Supabase format)
        console.log('Found recovery type link, attempting to handle...');
        try {
          // Try to get the current session
          const { data: { session }, error } = await authService.supabase.auth.getSession();
          if (session && !error) {
            console.log('Recovery session found:', session.user.email);
            setIsSessionReady(true);
          } else {
            console.log('No recovery session found:', error);
            setError('Invalid or expired reset link. Please request a new password reset.');
          }
        } catch (err) {
          console.error('Error handling recovery session:', err);
          setError('Invalid or expired reset link. Please request a new password reset.');
        }
      } else if (type === 'invite') {
        // Handle invite type links - user needs to set password
        console.log('Found invite type link, attempting to handle...');
        try {
          // For invite links, we need to exchange the code for a session
          if (code) {
            const { data, error: exchangeError } = await authService.supabase.auth.exchangeCodeForSession(code);
            if (!exchangeError && data) {
              console.log('Invite code exchanged for session successfully:', data);
              setIsSessionReady(true);
              // Clean up URL
              window.history.replaceState({}, document.title, window.location.pathname);
            } else {
              console.log('exchangeCodeForSession failed for invite:', exchangeError);
              setError('Invalid or expired invite link. Please contact your Investment Advisor to send a new invite.');
            }
          } else {
            // Check if there's already a session
            const { data: { session }, error: sessionError } = await authService.supabase.auth.getSession();
            if (session && !sessionError) {
              console.log('Invite session found:', session.user.email);
              setIsSessionReady(true);
            } else {
              console.log('No invite session found:', sessionError);
              setError('Invalid or expired invite link. Please contact your Investment Advisor to send a new invite.');
            }
          }
        } catch (err) {
          console.error('Error handling invite session:', err);
          setError('Invalid or expired invite link. Please contact your Investment Advisor to send a new invite.');
        }
      } else {
        // Check if user is already authenticated (might be from a previous session)
        console.log('No tokens found, checking existing session...');
        const { data: { user }, error: userError } = await authService.supabase.auth.getUser();
        if (userError || !user) {
          console.log('No existing session found:', userError);
          
          // Try one more approach - check if we can detect this as a password reset context
          // Sometimes Supabase redirects without tokens but with a specific path
          if (window.location.pathname === '/reset-password') {
            console.log('Reset password path detected, but no tokens. This might be a Supabase configuration issue.');
            setError('Password reset link configuration issue. Please check your Supabase settings and try requesting a new reset link.');
          } else {
      setError('Invalid or expired reset link. Please request a new password reset.');
    }
        } else {
          console.log('Existing session found for user:', user.email);
          setIsSessionReady(true);
        }
      }
    };

    handleResetPasswordSession();
  }, []);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const validateForm = (): boolean => {
    const errors: { password?: string; confirmPassword?: string } = {};
    
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      errors.password = passwordError;
    }
    
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Attempting password reset...');
      
      // First, let's try the standard approach
      const { success, error: resetError } = await authService.resetPassword(newPassword);
      
      if (success) {
        console.log('Password reset successful');
        setIsSuccess(true);
        
        // Check if this is an invite link (has advisorCode)
        const advisorCode = getQueryParam('advisorCode');
        const isInviteFlow = !!advisorCode;
        
        // Sign out the user after password reset (so they can login with new password)
        try {
          await authService.supabase.auth.signOut();
          console.log('User signed out after password reset');
        } catch (signOutError) {
          console.log('Sign out error (non-critical):', signOutError);
        }
        
        // Redirect to login after 2 seconds
        // If this is an invite flow, preserve advisorCode in URL
        setTimeout(() => {
          if (isInviteFlow) {
            // Redirect to login with advisorCode so user can login and then go to Form 2
            window.location.href = `/?page=login&advisorCode=${advisorCode}`;
          } else {
            // Normal password reset - just go to login
            onNavigateToLogin();
          }
        }, 2000);
      } else {
        console.error('Password reset failed:', resetError);
        
        // If standard approach fails, try alternative method
        console.log('Trying alternative password reset method...');
        const { data, error: altError } = await authService.supabase.auth.updateUser({
          password: newPassword
        });
        
        if (altError) {
          console.error('Alternative method also failed:', altError);
          setError(resetError || altError.message || 'Failed to reset password. Please try again.');
        } else {
          console.log('Alternative method succeeded');
          setIsSuccess(true);
          
          // Check if this is an invite link (has advisorCode)
          const advisorCode = getQueryParam('advisorCode');
          const isInviteFlow = !!advisorCode;
          
          // Sign out the user after password reset
          try {
            await authService.supabase.auth.signOut();
            console.log('User signed out after password reset');
          } catch (signOutError) {
            console.log('Sign out error (non-critical):', signOutError);
          }
          
          // Redirect to login after 2 seconds
          // If this is an invite flow, preserve advisorCode in URL
          setTimeout(() => {
            if (isInviteFlow) {
              // Redirect to login with advisorCode so user can login and then go to Form 2
              window.location.href = `/?page=login&advisorCode=${advisorCode}`;
            } else {
              // Normal password reset - just go to login
              onNavigateToLogin();
            }
          }, 2000);
        }
      }
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    // If this is an invite flow, preserve advisorCode in URL
    const advisorCode = getQueryParam('advisorCode');
    if (advisorCode) {
      window.location.href = `/?page=login&advisorCode=${advisorCode}`;
    } else {
      onNavigateToLogin();
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {getQueryParam('advisorCode') ? 'Password Set Successfully!' : 'Password Reset Successful!'}
          </h2>
          
          <p className="text-slate-600 mb-6">
            {getQueryParam('advisorCode') 
              ? 'Your password has been set successfully. You have been signed out for security. Please login to continue with your registration.'
              : 'Your password has been successfully updated. You have been signed out for security.'}
          </p>
          
          <div className="bg-green-50 border border-green-200 rounded-md p-4 text-left mb-6">
            <h4 className="font-medium text-green-900 mb-2">What's next?</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>✓ You'll be redirected to the login page</li>
              <li>✓ Sign in with your email and new password</li>
              {getQueryParam('advisorCode') && (
                <li>✓ After login, you'll complete your registration (Form 2)</li>
              )}
              <li>✓ Your account is now secure</li>
            </ul>
          </div>
          
          <Button onClick={handleGoToLogin} className="w-full">
            Go to Login Page
          </Button>
          
          <p className="text-xs text-slate-500 mt-4">
            Redirecting to login page in 2 seconds...
          </p>
        </Card>
      </div>
    );
  }

  // Show loading state while establishing session
  if (!isSessionReady && !error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Preparing Reset
          </h2>
          
          <p className="text-slate-600">
            Setting up your password reset session...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <Lock className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Reset Your Password</h2>
          <p className="text-slate-600 mt-2">
            Enter your new password below
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Debug Information - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-6">
            <h4 className="font-medium text-yellow-900 mb-2">Debug Info:</h4>
            <div className="text-xs text-yellow-800 space-y-1">
              <p>URL: {window.location.href}</p>
              <p>Session Ready: {isSessionReady ? 'Yes' : 'No'}</p>
              <p>Has Tokens: {window.location.search.includes('access_token') ? 'Yes' : 'No'}</p>
              <p>Has Code: {window.location.search.includes('code=') ? 'Yes' : 'No'}</p>
              <p>Has PKCE Token: {window.location.search.includes('token=') ? 'Yes' : 'No'}</p>
              <p>Type: {new URLSearchParams(window.location.search).get('type') || 'None'}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">
              New Password
            </label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Enter new password"
                className={validationErrors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </button>
            </div>
            {validationErrors.password && (
              <p className="text-red-600 text-xs">{validationErrors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700">
              Confirm New Password
            </label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm new password"
                className={validationErrors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </button>
            </div>
            {validationErrors.confirmPassword && (
              <p className="text-red-600 text-xs">{validationErrors.confirmPassword}</p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="font-medium text-blue-900 mb-2">Password Requirements</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• At least 8 characters long</li>
              <li>• Contains at least one lowercase letter</li>
              <li>• Contains at least one uppercase letter</li>
              <li>• Contains at least one number</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoToLogin}
              className="flex-1"
              disabled={isLoading}
            >
              Back to Login
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || !newPassword.trim() || !confirmPassword.trim() || !isSessionReady}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : !isSessionReady ? (
                'Preparing...'
              ) : (
                'Reset Password'
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
