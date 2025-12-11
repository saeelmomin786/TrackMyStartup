import React, { useState, useEffect, useCallback } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import { UserRole } from '../types';
import { Mail, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { authService } from '../lib/auth';

interface BasicRegistrationStepProps {
  onEmailVerified: (userData: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    startupName?: string;
    centerName?: string;
    investmentAdvisorCode?: string;
  }) => void;
  onNavigateToLogin: () => void;
  onNavigateToLanding?: () => void;
}

export const BasicRegistrationStep: React.FC<BasicRegistrationStepProps> = ({
  onEmailVerified,
  onNavigateToLogin,
  onNavigateToLanding
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Investor' as UserRole,
    startupName: '',
    centerName: '',
    investmentAdvisorCode: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  
  // Role selection state
  const [availableRoles, setAvailableRoles] = useState<string[]>(['Investor', 'Startup', 'Startup Facilitation Center', 'Investment Advisor', 'Mentor']);
  
  // New state for email validation
  const [emailValidation, setEmailValidation] = useState<{
    isValidating: boolean;
    exists: boolean;
    error: string | null;
    lastChecked: string | null;
  }>({
    isValidating: false,
    exists: false,
    error: null,
    lastChecked: null
  });



  // Debounced email validation
  const debouncedEmailCheck = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (email: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (email && email.includes('@')) {
            setEmailValidation(prev => ({ ...prev, isValidating: true }));
            try {
              const result = await authService.checkEmailExists(email);
              setEmailValidation({
                isValidating: false,
                exists: result.exists,
                error: result.error || null,
                lastChecked: email
              });
            } catch (error) {
              setEmailValidation({
                isValidating: false,
                exists: false,
                error: 'Unable to check email availability',
                lastChecked: email
              });
            }
          } else {
            setEmailValidation({
              isValidating: false,
              exists: false,
              error: null,
              lastChecked: null
            });
          }
        }, 500); // 500ms delay
      };
    })(),
    []
  );

  // Check email when email field changes
  useEffect(() => {
    if (formData.email) {
      debouncedEmailCheck(formData.email);
    } else {
      setEmailValidation({
        isValidating: false,
        exists: false,
        error: null,
        lastChecked: null
      });
    }
  }, [formData.email, debouncedEmailCheck]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear email validation error when user starts typing again
    if (field === 'email') {
      setEmailValidation(prev => ({ ...prev, error: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Check if email already exists before proceeding
    if (emailValidation.exists) {
      setError('This email is already registered. Please sign in instead.');
      setIsLoading(false);
      return;
    }

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.role === 'Startup' && !formData.startupName.trim()) {
      setError('Startup name is required for Startup role');
      setIsLoading(false);
      return;
    }

    if (formData.role === 'Startup Facilitation Center' && !formData.centerName.trim()) {
      setError('Center name is required for Startup Facilitation Center role');
      setIsLoading(false);
      return;
    }

    // Additional email validation
    if (!formData.email || !formData.email.includes('@')) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      setIsSendingOtp(true);
      const response = await fetch('/api/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          purpose: 'register',
          advisorCode: formData.investmentAdvisorCode || undefined
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }
      setShowOtp(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred while sending OTP');
    } finally {
      setIsSendingOtp(false);
      setIsLoading(false);
    }
  };

  if (showOtp) {
    return (
      <Card className="w-full max-w-md">
        <div className="text-center">
          <Mail className="mx-auto h-12 w-12 text-blue-500" />
          <h2 className="mt-4 text-2xl font-bold text-slate-900">Enter OTP</h2>
          <p className="mt-2 text-sm text-slate-600">
            We sent a 6-digit code to <strong>{formData.email}</strong>. Enter it to create your account.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-4">
            <div className="flex items-center text-red-800 text-sm">
              <AlertCircle className="h-4 w-4 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="space-y-4 mt-6">
          <Input
            label="OTP Code"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            placeholder="Enter the 6-digit code"
          />

          <Button
            type="button"
            className="w-full"
            disabled={isVerifyingOtp}
            onClick={async () => {
              setError(null);
              if (!otpCode) {
                setError('Please enter the OTP code');
                return;
              }
              setIsVerifyingOtp(true);
              try {
                const response = await fetch('/api/verify-otp', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: formData.email,
                    code: otpCode,
                    newPassword: formData.password,
                    purpose: 'register',
                    advisorCode: formData.investmentAdvisorCode || undefined,
                    name: formData.name,
                    role: formData.role,
                    startupName: formData.role === 'Startup' ? formData.startupName : undefined,
                    centerName: formData.role === 'Startup Facilitation Center' ? formData.centerName : undefined,
                    investmentAdvisorCode: formData.investmentAdvisorCode || undefined
                  })
                });
                const data = await response.json();
                if (!response.ok) {
                  throw new Error(data.error || 'Failed to verify OTP');
                }
                // Success: redirect to login
                onNavigateToLogin();
              } catch (err: any) {
                setError(err.message || 'Failed to verify OTP');
              } finally {
                setIsVerifyingOtp(false);
              }
            }}
          >
            {isVerifyingOtp ? 'Verifying...' : 'Verify & Create Account'}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
    <Card className="w-full max-w-2xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Create a new account</h2>
        <p className="mt-2 text-sm text-slate-600">
          Or{' '}
          <button
            onClick={onNavigateToLogin}
            className="text-brand-primary hover:text-brand-primary-dark underline"
          >
            sign in to your existing account
          </button>
        </p>

      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Center Name - Only show if role is Startup Facilitation Center */}
        {formData.role === 'Startup Facilitation Center' && (
          <Input
            label="Facilitation Center Name"
            id="centerName"
            name="centerName"
            type="text"
            required
            placeholder="Enter your facilitation center name"
            value={formData.centerName}
            onChange={(e) => handleInputChange('centerName', e.target.value)}
          />
        )}

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label={formData.role === 'Startup Facilitation Center' ? "Your Name" : "Full Name"}
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
          />
          
          <div>
            <Input
              label="Email address"
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={emailValidation.exists ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300'}
            />
            
            {/* Email validation feedback */}
            {formData.email && (
              <div className="mt-1">
                {emailValidation.isValidating && (
                  <div className="flex items-center text-sm text-slate-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-500 mr-2"></div>
                    Checking email availability...
                  </div>
                )}
                
                {!emailValidation.isValidating && emailValidation.exists && (
                  <div className="flex items-center text-sm text-red-600">
                    <XCircle className="h-4 w-4 mr-1" />
                    This email is already registered. Please sign in instead.
                  </div>
                )}
                
                {!emailValidation.isValidating && !emailValidation.exists && emailValidation.lastChecked === formData.email && (
                  <div className="flex items-center text-sm text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Email is available
                  </div>
                )}
                
                {emailValidation.error && (
                  <div className="flex items-center text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {emailValidation.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Password"
            id="password"
            name="password"
            type="password"
            required
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
          />
          
          <Input
            label="Confirm Password"
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-2">
              Role *
            </label>
            <select
              id="role"
              name="role"
              required
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value as UserRole)}
              className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
            >
              <option value="">Select Role</option>
              {availableRoles.map(role => (
                <option key={role} value={role}>
                  {role === 'CA' ? `${role} (Chartered Accountant)` :
                   role === 'CS' ? `${role} (Company Secretary)` :
                   role}
                </option>
              ))}
            </select>
          </div>
        </div>


        {/* Investment Advisor Code - Only show for Investor and Startup roles */}
        {(formData.role === 'Investor' || formData.role === 'Startup') && (
          <Input
            label="Investment Advisor Code (Optional)"
            id="investmentAdvisorCode"
            name="investmentAdvisorCode"
            type="text"
            placeholder="IA-XXXXXX"
            value={formData.investmentAdvisorCode}
            onChange={(e) => handleInputChange('investmentAdvisorCode', e.target.value)}
            helpText="Enter your Investment Advisor's code if you have one"
          />
        )}

        {/* Startup Name - Only show if role is Startup */}
        {formData.role === 'Startup' && (
          <Input
            label="Startup Name"
            id="startupName"
            name="startupName"
            type="text"
            required
            placeholder="Enter your startup name"
            value={formData.startupName}
            onChange={(e) => handleInputChange('startupName', e.target.value)}
          />
        )}


        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || emailValidation.exists}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>
        </Card>
    </div>
   );
};
