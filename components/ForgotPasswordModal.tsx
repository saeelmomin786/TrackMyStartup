import React, { useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import { Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { authService } from '../lib/auth';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'request' | 'otp'>('request');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailValidationError, setEmailValidationError] = useState<string | null>(null);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) return 'Password must be at least 8 characters long';
    if (!/(?=.*[a-z])/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/(?=.*[A-Z])/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/(?=.*\d)/.test(password)) return 'Password must contain at least one number';
    return null;
  };

  const handleEmailChange = async (emailValue: string) => {
    setEmail(emailValue);
    setEmailValidationError(null);
    setError(null); // Clear general error when email changes

    // Only validate if email is not empty and looks like a valid email
    if (emailValue && emailValue.includes('@')) {
      setIsCheckingEmail(true);
      try {
        const { exists } = await authService.checkEmailExists(emailValue.trim());
        if (!exists) {
          setEmailValidationError('User not registered yet');
        }
      } catch (error) {
        console.error('Error checking email:', error);
        // Don't show error if check fails, just log it
      } finally {
        setIsCheckingEmail(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Check if email is registered before sending OTP
    if (emailValidationError) {
      setError(emailValidationError);
      setIsLoading(false);
      return;
    }

    // Re-check email if not already checked
    if (!isCheckingEmail && email && email.includes('@')) {
      setIsCheckingEmail(true);
      try {
        const { exists } = await authService.checkEmailExists(email.trim());
        if (!exists) {
          setEmailValidationError('User not registered yet');
          setError('User not registered yet');
          setIsLoading(false);
          setIsCheckingEmail(false);
          return;
        }
      } catch (error) {
        console.error('Error checking email:', error);
      } finally {
        setIsCheckingEmail(false);
      }
    }

    try {
      const response = await fetch('/api/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'forgot' })
      });
      const data = await response.json();
      if (!response.ok) {
        // Handle 404 specifically for user not found
        if (response.status === 404) {
          setError('User not registered yet');
          setEmailValidationError('User not registered yet');
        } else {
          throw new Error(data.error || 'Failed to send OTP');
        }
        return;
      }
      setStep('otp');
      setEmailValidationError(null); // Clear validation error on success
    } catch (err: any) {
      console.error('Password reset OTP error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    setError(null);
    if (!otpCode) {
      setError('Please enter the OTP code.');
      return;
    }
    const pwdErr = validatePassword(newPassword);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: otpCode,
          newPassword,
          purpose: 'forgot'
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify OTP');
      }
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      setError(err.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setIsSuccess(false);
    setStep('request');
    setEmailValidationError(null);
    setIsCheckingEmail(false);
    onClose();
  };

  const handleTryAgain = () => {
    setEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setIsSuccess(false);
    setStep('request');
    setEmailValidationError(null);
    setIsCheckingEmail(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Forgot Password">
      {!isSuccess ? (
        step === 'request' ? (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Reset your password
              </h3>
              <p className="text-sm text-slate-600">
                Enter your email and we’ll send you an OTP to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  label="Email address"
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={() => {
                    if (email) {
                      handleEmailChange(email);
                    }
                  }}
                  required
                  placeholder="Enter your email address"
                  className={emailValidationError ? 'border-red-500' : ''}
                />
                {isCheckingEmail && (
                  <p className="text-xs text-slate-500">Checking email...</p>
                )}
                {emailValidationError && (
                  <p className="text-xs text-red-600">{emailValidationError}</p>
                )}
              </div>

              {error && !emailValidationError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading || !email.trim() || isCheckingEmail || !!emailValidationError}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send OTP'
                  )}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Enter OTP & New Password
              </h3>
              <p className="text-sm text-slate-600">
                Check your email for the 6-digit OTP.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="OTP Code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Enter the 6-digit code"
              />
              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={isVerifying}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={isVerifying || !otpCode.trim() || !newPassword.trim() || !confirmPassword.trim()}
                  onClick={handleVerify}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Reset'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="text-center space-y-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Password reset successful
            </h3>
            <p className="text-sm text-slate-600">
              You can now sign in with your new password.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-left">
            <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Sign in with your email and new password</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleTryAgain}
              variant="outline"
              className="flex-1"
            >
              Send to Different Email
            </Button>
            <Button
              onClick={handleClose}
              className="flex-1"
            >
              Got it, thanks!
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ForgotPasswordModal;
