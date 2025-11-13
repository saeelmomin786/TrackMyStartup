import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { paymentService } from '../../lib/paymentService';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Check, X, CreditCard, Percent, Calendar, DollarSign, Crown, Zap, Star, Shield, Users, TrendingUp, ArrowRight, ArrowLeft, CheckCircle, LogOut, Sparkles, Rocket } from 'lucide-react';
import LogoTMS from '../public/logoTMS.svg';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  description: string;
  user_type: string;
  country: string;
  is_active: boolean;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

interface StartupSubscriptionPageProps {
  currentUser: any;
  onPaymentSuccess?: () => void;
  onLogout?: () => void;
}

export default function StartupSubscriptionPage({ currentUser, onPaymentSuccess, onLogout }: StartupSubscriptionPageProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showTrialAndCoupon, setShowTrialAndCoupon] = useState(false);
  const [showPaymentSummary, setShowPaymentSummary] = useState(false);
  const [trialEligibility, setTrialEligibility] = useState<{ canStart: boolean; reason?: string }>({ canStart: true });
  const [isCheckingTrialEligibility, setIsCheckingTrialEligibility] = useState(false);

  useEffect(() => {
    loadPlansAndCoupons();
    
    // Set up centralized payment success callback
    paymentService.setPaymentSuccessCallback(() => {
      console.log('🎉 Centralized payment success triggered');
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    });

    // Cleanup callback on unmount
    return () => {
      paymentService.setPaymentSuccessCallback(undefined);
    };
  }, [onPaymentSuccess]);

  const loadPlansAndCoupons = async () => {
    try {
      setIsLoading(true);
      
      // Load startup subscription plans using payment service
      const planData = await paymentService.getSubscriptionPlans('Startup');
      setPlans(planData);

      // Load active coupons using payment service
      const couponData = await paymentService.getAvailableCoupons();
      setCoupons(couponData);

    } catch (err) {
      console.error('Error loading plans and coupons:', err);
      setError('Failed to load subscription options');
    } finally {
      setIsLoading(false);
    }
  };

  const checkTrialEligibility = async (userId: string) => {
    try {
      setIsCheckingTrialEligibility(true);
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('id, has_used_trial, is_in_trial, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking trial eligibility:', error);
        setTrialEligibility({
          canStart: false,
          reason: 'Unable to confirm trial status. Please continue with payment.'
        });
        return;
      }

      if (!data || data.length === 0) {
        setTrialEligibility({ canStart: true });
        return;
      }

      const latest = data[0] as { has_used_trial?: boolean; is_in_trial?: boolean; status?: string };

      if (latest?.has_used_trial) {
        setTrialEligibility({
          canStart: false,
          reason: 'You have already used your free trial. Please proceed with payment to continue using the dashboard.'
        });
        return;
      }

      if (latest?.status === 'active' && latest?.is_in_trial) {
        setTrialEligibility({
          canStart: false,
          reason: 'Your free trial is already active.'
        });
        return;
      }

      setTrialEligibility({ canStart: true });
    } catch (error) {
      console.error('Unexpected error while checking trial eligibility:', error);
      setTrialEligibility({
        canStart: false,
        reason: 'Unable to confirm trial status. Please continue with payment.'
      });
    } finally {
      setIsCheckingTrialEligibility(false);
    }
  };

  useEffect(() => {
    if (selectedPlan && currentUser?.id) {
      checkTrialEligibility(currentUser.id);
    }
  }, [selectedPlan, currentUser?.id]);

  const validateCoupon = async (code: string) => {
    console.log('Validating coupon:', code);
    
    if (!code.trim()) {
      setError('Please enter a coupon code');
      return;
    }

    try {
      console.log('Calling paymentService.validateCoupon...');
      const coupon = await paymentService.validateCoupon(code);
      console.log('Coupon validation result:', coupon);
      
      if (!coupon) {
        setError('Invalid or expired coupon code');
        return;
      }

      setAppliedCoupon(coupon);
      setError(null);
      setSuccess('Coupon applied successfully!');
      setShowTrialAndCoupon(false);
      setShowPaymentSummary(true);
    } catch (err) {
      console.error('Error validating coupon:', err);
      setError('Failed to validate coupon');
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setError(null);
    setSuccess(null);
    setShowPaymentSummary(false);
  };

  const handleSkipCoupon = () => {
    setShowTrialAndCoupon(false);
    setShowPaymentSummary(true);
  };

  const handlePayNow = async () => {
    if (!selectedPlan) return;

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      console.log('Processing payment for plan:', selectedPlan);
      console.log('Applied coupon:', appliedCoupon);
      console.log('Final price:', calculatePrice(selectedPlan));

      // Process payment with Razorpay - this now waits for actual completion
      const success = await paymentService.processPayment(
        selectedPlan, 
        currentUser?.id, 
        appliedCoupon?.code,
        currentUser
      );

      // Only show success message if payment was actually completed
      if (success) {
        if (calculatePrice(selectedPlan) <= 0) {
          setSuccess('Free subscription activated! Your account is now active.');
        } else {
          setSuccess('Payment processed successfully! Your subscription is now active.');
        }
        
        setShowTrialAndCoupon(false);
        setShowPaymentSummary(false);
        
        // Trigger navigation redundantly to be safe (in addition to centralized callback)
        try {
          onPaymentSuccess && onPaymentSuccess();
        } catch {}

        // Payment success will also be handled by centralized callback
        console.log('✅ Payment completed successfully');
      } else {
        setError('Payment was cancelled or failed. Please try again.');
      }

    } catch (err) {
      console.error('Payment error:', err);
      if (err.message && err.message.includes('cancelled by user')) {
        setError('Payment was cancelled. Please try again when ready.');
      } else {
        setError('Payment failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePrice = (plan: SubscriptionPlan) => {
    if (!appliedCoupon) return plan.price;
    
    if (appliedCoupon.discount_type === 'percentage') {
      return plan.price * (1 - appliedCoupon.discount_value / 100);
    } else {
      return Math.max(0, plan.price - appliedCoupon.discount_value);
    }
  };

  const calculateTaxAmount = (baseAmount: number, taxPercentage: number) => {
    return Math.round((baseAmount * taxPercentage / 100) * 100) / 100;
  };

  const calculateSavings = (plan: SubscriptionPlan) => {
    if (!appliedCoupon) return 0;
    return plan.price - calculatePrice(plan);
  };

  const formatPrice = (price: number, currency: string) => {
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${price.toFixed(2)}`;
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return currency;
    }
  };

  const handlePlanSelection = (plan: SubscriptionPlan) => {
    console.log('Plan selected:', plan);
    setSelectedPlan(plan);
    setShowTrialAndCoupon(true);
    setShowPaymentSummary(false);
    setAppliedCoupon(null);
    setCouponCode('');
    setError(null);
    setSuccess(null);
    setTrialEligibility({ canStart: true });
  };

  const handleTrialSetup = async () => {
    if (!selectedPlan) return;

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      console.log('Setting up trial for plan:', selectedPlan);

      // Create trial subscription with Razorpay - this now waits for actual completion
      const success = await paymentService.createTrialSubscription(
        selectedPlan, 
        currentUser?.id,
        currentUser
      );

      // Only show success message if trial was actually set up
      if (success) {
        setSuccess('Free trial activated! Your 1-month trial has started.');
        setShowTrialAndCoupon(false);
        setShowPaymentSummary(false);
        
        // Trial success will be handled by centralized callback
        console.log('✅ Trial setup completed successfully');
      } else {
        setError('Trial setup failed. Please try again.');
      }

    } catch (err) {
      console.error('Trial setup error:', err);
      if (err && typeof err === 'object' && 'message' in err) {
        const message = (err as Error).message;
        if (message === 'TRIAL_ALREADY_USED') {
          setTrialEligibility({
            canStart: false,
            reason: 'You have already used your free trial. Please continue with payment.'
          });
          setError('Free trial already used. Please continue with payment.');
          return;
        }
        if (message === 'TRIAL_ALREADY_ACTIVE') {
          setTrialEligibility({
            canStart: false,
            reason: 'Your free trial is already active.'
          });
          setError('You already have an active trial.');
          return;
        }
        if (message === 'TRIAL_ELIGIBILITY_CHECK_FAILED') {
          setTrialEligibility({
            canStart: false,
            reason: 'Unable to confirm trial status. Please continue with payment.'
          });
          setError('Unable to confirm trial status. Please continue with payment.');
          return;
        }
        if (message.includes('cancelled by user')) {
          setError('Trial setup was cancelled. Please try again when ready.');
          return;
        }
      }
      if (currentUser?.id) {
        checkTrialEligibility(currentUser.id);
      }
      setError('Trial setup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedPlan) return;

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      console.log('Processing payment for plan:', selectedPlan);
      console.log('Applied coupon:', appliedCoupon);
      console.log('Final price:', calculatePrice(selectedPlan));

      // Process payment with Razorpay
      const success = await paymentService.processPayment(
        selectedPlan, 
        currentUser?.id, 
        appliedCoupon?.code,
        currentUser
      );

      if (success) {
        if (calculatePrice(selectedPlan) <= 0) {
          setSuccess('Free subscription activated! Your account is now active.');
        } else {
      setSuccess('Payment processed successfully! Your subscription is now active.');
        }
      
      if (onPaymentSuccess) {
        onPaymentSuccess();
        }
      } else {
        setError('Payment was cancelled or failed. Please try again.');
      }

    } catch (err) {
      console.error('Payment error:', err);
      setError('Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getPlanFeatures = (plan: SubscriptionPlan) => {
    const baseFeatures = [
      'Full dashboard access',
      'Financial tracking & analytics',
      'Compliance management',
      'Investment opportunities',
      'Priority support',
      'Data export & reports'
    ];

    if (plan.interval === 'yearly') {
      return [
        ...baseFeatures,
        '2 months free',
        'Priority feature requests',
        'Dedicated account manager'
      ];
    }

    return baseFeatures;
  };

  const getSavingsAmount = (plan: SubscriptionPlan) => {
    if (plan.interval === 'yearly') {
      const monthlyPrice = plan.price / 12;
      const savings = (plan.price - monthlyPrice * 10) / 12; // 2 months free
      return savings;
    }
    return 0;
  };

  if (isLoading && plans.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Proper Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              <img 
                src={LogoTMS} 
                alt="TrackMyStartup" 
                className="h-7 w-7 sm:h-8 sm:w-8 scale-[5] sm:scale-[5] origin-left cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={() => window.location.reload()}
              />
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800 border-slate-300 hover:border-slate-400"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="py-6 sm:py-8 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Title Section - Enhanced */}
          <div className="text-center mb-8 sm:mb-12 relative">
            {/* Decorative Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 rounded-3xl -z-10 opacity-40 blur-2xl transform -translate-y-1/2 top-1/2 scale-90"></div>
            
            {/* Icon Decoration - Compact */}
            <div className="flex justify-center items-center mb-3 sm:mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-lg opacity-20 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-2 sm:p-2.5 shadow-md">
                  <Rocket className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
              </div>
            </div>
            
            {/* Main Title */}
            <div className="mb-3 sm:mb-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-2 sm:mb-3 px-4 leading-tight">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Choose Your Subscription Plan
                </span>
              </h1>
            </div>
            
            {/* Subtitle */}
            <div className="max-w-3xl mx-auto px-4">
              <p className="text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed">
                Unlock the full potential of your startup with our comprehensive platform. 
                Choose the plan that works best for your business needs.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 rounded-md p-3 sm:p-4 mx-auto max-w-4xl">
              <div className="flex">
                <X className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm sm:text-base text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Success Message */}
          {success && (
            <div className="mb-4 sm:mb-6 bg-green-50 border border-green-200 rounded-md p-3 sm:p-4 mx-auto max-w-4xl">
              <div className="flex">
                <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm sm:text-base text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Plan Selection */}
          {!selectedPlan && (
            <div className="mb-8 sm:mb-12">
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-4 sm:mb-6 text-center px-4">
                Step 1: Select Your Plan
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 px-2 sm:px-0">
        {plans.map((plan) => {
                const savings = getSavingsAmount(plan);
          
          return (
                  <Card 
                    key={plan.id} 
                    className="relative transition-all duration-200 hover:shadow-lg hover:scale-[1.02] sm:hover:scale-105 cursor-pointer h-full flex flex-col"
                    onClick={() => handlePlanSelection(plan)}
                  >
                    <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col">
                      {/* Plan Header */}
                      <div className="text-center mb-4 sm:mb-6">
                        <div className="flex items-center justify-center mb-3 sm:mb-4 flex-wrap gap-2">
                          {plan.interval === 'yearly' ? (
                            <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
                          ) : (
                            <Star className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                          )}
                          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900">{plan.name}</h3>
                        </div>
                        
                        <div className="mb-3 sm:mb-4">
                          <span className="text-3xl sm:text-4xl font-bold text-slate-900">
                            {formatPrice(plan.price, plan.currency)}
                          </span>
                          <div className="text-slate-600 text-xs sm:text-sm mt-1 sm:mt-2">
                            per {plan.interval === 'monthly' ? 'month' : 'year'}
                            {plan.interval === 'yearly' && (
                              <span className="block text-green-600 font-medium mt-1">
                                Save {formatPrice(savings, plan.currency)} per month!
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {plan.interval === 'yearly' && (
                          <div className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium bg-yellow-100 text-yellow-800 mb-3 sm:mb-4">
                            <Crown className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                            Most Popular - 2 Months Free!
                          </div>
                        )}
                      </div>

                      {/* Plan Description */}
                      <p className="text-slate-600 text-center mb-4 sm:mb-6 text-sm sm:text-base">
                        {plan.description}
                      </p>

                      {/* Features List */}
                      <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 flex-1">
                        {getPlanFeatures(plan).map((feature, index) => (
                          <li key={index} className="flex items-start text-xs sm:text-sm text-slate-600">
                            <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-2 sm:mr-3 flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Selection Button */}
                      <Button
                        onClick={() => handlePlanSelection(plan)}
                        className="w-full mt-auto text-xs sm:text-sm"
                        variant="outline"
                        size="sm"
                      >
                        <div className="flex items-center justify-center">
                          <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          Select This Plan
                        </div>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

          {/* Step 2: Trial Setup & Coupon Application */}
          {selectedPlan && showTrialAndCoupon && (
            <Card className="mb-6 sm:mb-8">
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="text-center mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-2 px-2">
                    Step 2: Choose Your Option
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 px-4">
                    You selected: <span className="font-semibold">{selectedPlan.name}</span> - {formatPrice(selectedPlan.price, selectedPlan.currency)}/{selectedPlan.interval === 'monthly' ? 'month' : 'year'}
                  </p>
                </div>
                
                <div className="max-w-3xl mx-auto">
                  {/* Clear Instructions */}
                  <div className="text-center mb-4 sm:mb-8">
                    <p className="text-base sm:text-lg text-slate-600 mb-2 sm:mb-4 px-4">
                      Choose how you'd like to proceed with your subscription:
                    </p>
                  </div>

                  {/* Option Cards */}
                  <div className="space-y-4 sm:space-y-6">
                    {/* Option 1: Free Trial */}
                    {trialEligibility.canStart ? (
                      <Card className="border-2 border-green-200 hover:border-green-300 transition-colors">
                        <div className="p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                            <div className="flex items-center flex-1">
                              <div className="bg-green-100 p-2 sm:p-3 rounded-full mr-3 sm:mr-4 flex-shrink-0">
                                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                              </div>
                              <div>
                                <h3 className="text-lg sm:text-xl font-semibold text-slate-900">Start Free Trial</h3>
                                <p className="text-sm sm:text-base text-slate-600">Try our platform for 30 days at no cost</p>
                              </div>
                            </div>
                            <div className="bg-green-50 px-2 sm:px-3 py-1 rounded-full self-start sm:self-auto">
                              <span className="text-xs sm:text-sm font-medium text-green-700">Recommended</span>
                            </div>
                          </div>
                        
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                            <div className="space-y-2">
                              <h4 className="font-medium text-slate-900 text-sm sm:text-base">What you get:</h4>
                              <ul className="space-y-1 text-xs sm:text-sm text-slate-600">
                                <li className="flex items-center">
                                  <Check className="h-4 w-4 text-green-500 mr-2" />
                                  Full access to all features
                                </li>
                                <li className="flex items-center">
                                  <Check className="h-4 w-4 text-green-500 mr-2" />
                                  No charges for 30 days
                                </li>
                                <li className="flex items-center">
                                  <Check className="h-4 w-4 text-green-500 mr-2" />
                                  Cancel anytime
                                </li>
                              </ul>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium text-slate-900 text-sm sm:text-base">After trial:</h4>
                              <ul className="space-y-1 text-xs sm:text-sm text-slate-600">
                                <li className="flex items-center">
                                  <Check className="h-4 w-4 text-green-500 mr-2" />
                                  Auto-billing starts
                                </li>
                                <li className="flex items-center">
                                  <Check className="h-4 w-4 text-green-500 mr-2" />
                                  Payment method required
                                </li>
                                <li className="flex items-center">
                                  <Check className="h-4 w-4 text-green-500 mr-2" />
                                  Secure & encrypted
                                </li>
                              </ul>
                            </div>
                          </div>
                          
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4">
                            <div className="flex items-center mb-2">
                              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-2 flex-shrink-0" />
                              <span className="font-medium text-blue-800 text-sm sm:text-base">Payment Method Required</span>
                            </div>
                            <p className="text-xs sm:text-sm text-blue-700 mb-2">
                              We'll need to set up your payment method, but you won't be charged until your trial ends.
                            </p>
                            <p className="text-xs text-blue-700">
                              Note: To begin your subscription, a refundable amount of 
                              <span className="font-semibold"> ₹5</span> may be charged now for verification. 
                              This ₹5 will be automatically refunded by Razorpay. After the trial, your selected plan amount will be charged.
                            </p>
                          </div>
                        
                          <Button
                            onClick={() => handleTrialSetup()}
                            disabled={isLoading || isCheckingTrialEligibility}
                            className="w-full"
                            size="sm"
                          >
                            {(isLoading || isCheckingTrialEligibility) ? (
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                                <span className="text-xs sm:text-sm">Checking trial...</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center">
                                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                                <span className="text-xs sm:text-sm">Start Free Trial</span>
                              </div>
                            )}
                          </Button>
                        </div>
                      </Card>
                    ) : (
                      <Card className="border-2 border-amber-200 bg-amber-50">
                        <div className="p-4 sm:p-6">
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div className="bg-amber-100 p-2 sm:p-3 rounded-full flex-shrink-0">
                              <X className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                            </div>
                            <div>
                              <h3 className="text-lg sm:text-xl font-semibold text-amber-800 mb-2">Free trial unavailable</h3>
                              <p className="text-sm sm:text-base text-amber-700">
                                {trialEligibility.reason || 'Your free trial has already been used. Continue with payment to regain access.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Option 2: Pay Now */}
                    <Card className="border-2 border-blue-200 hover:border-blue-300 transition-colors">
                      <div className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                          <div className="flex items-center flex-1">
                            <div className="bg-blue-100 p-2 sm:p-3 rounded-full mr-3 sm:mr-4 flex-shrink-0">
                              <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-lg sm:text-xl font-semibold text-slate-900">Pay Now</h3>
                              <p className="text-sm sm:text-base text-slate-600">
                                Activate your subscription immediately with autopay protection.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                          <div className="space-y-2">
                            <h4 className="font-medium text-slate-900 text-sm sm:text-base">Benefits:</h4>
                            <ul className="space-y-1 text-xs sm:text-sm text-slate-600">
                              <li className="flex items-center">
                                <Check className="h-4 w-4 text-blue-500 mr-2" />
                                Instant dashboard access
                              </li>
                              <li className="flex items-center">
                                <Check className="h-4 w-4 text-blue-500 mr-2" />
                                Autopay set up for next cycle
                              </li>
                              <li className="flex items-center">
                                <Check className="h-4 w-4 text-blue-500 mr-2" />
                                Use coupon codes to save
                              </li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium text-slate-900 text-sm sm:text-base">What happens next:</h4>
                            <ul className="space-y-1 text-xs sm:text-sm text-slate-600">
                              <li className="flex items-center">
                                <Check className="h-4 w-4 text-blue-500 mr-2" />
                                Pay for the first month today
                              </li>
                              <li className="flex items-center">
                                <Check className="h-4 w-4 text-blue-500 mr-2" />
                                Autopay kicks in next month
                              </li>
                              <li className="flex items-center">
                                <Check className="h-4 w-4 text-blue-500 mr-2" />
                                Cancel anytime from Razorpay
                              </li>
                            </ul>
                          </div>
                        </div>

                        <Button
                          onClick={() => handlePayNow()}
                          disabled={isLoading}
                          className="w-full"
                          size="sm"
                        >
                          {isLoading ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                              <span className="text-xs sm:text-sm">Processing payment...</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                              <span className="text-xs sm:text-sm">Pay Now</span>
                            </div>
                          )}
                        </Button>
                      </div>
                    </Card>
                  </div>

                  {/* Back Button */}
                  <div className="mt-4 sm:mt-8 text-center">
                    <Button 
                      onClick={() => {
                        setShowTrialAndCoupon(false);
                        setSelectedPlan(null);
                      }}
                      variant="outline"
                      size="sm"
                      className="text-slate-600"
                    >
                      <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      <span className="text-xs sm:text-sm">Back to Plan Selection</span>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}


          {/* Step 3: Payment Summary */}
          {selectedPlan && showPaymentSummary && (
            <Card className="mb-6 sm:mb-8">
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="text-center mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-2 px-2">
                    Step 3: Review & Pay
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 px-4">
                    Review your order and complete payment
                  </p>
                </div>
                
                <div className="max-w-2xl mx-auto">
                  {/* Order Summary */}
                  <div className="bg-slate-50 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-3 sm:mb-4">Order Summary</h3>
                    
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="text-sm sm:text-base text-slate-600">
                          {selectedPlan.name} ({selectedPlan.interval})
                        </span>
                        <span className="font-medium text-sm sm:text-base">
                          {formatPrice(selectedPlan.price, selectedPlan.currency)}
                        </span>
                      </div>
                    
                      {appliedCoupon && (
                        <>
                          <div className="flex justify-between items-center text-green-600 flex-wrap gap-2">
                            <span className="text-sm sm:text-base">Coupon ({appliedCoupon.code})</span>
                            <span className="text-sm sm:text-base">
                              -{appliedCoupon.discount_type === 'percentage' 
                                ? `${appliedCoupon.discount_value}%`
                                : formatPrice(appliedCoupon.discount_value, selectedPlan.currency)
                              }
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center text-green-600 font-semibold flex-wrap gap-2">
                            <span className="text-sm sm:text-base">You Save</span>
                            <span className="text-sm sm:text-base">{formatPrice(calculateSavings(selectedPlan), selectedPlan.currency)}</span>
                          </div>
                        </>
                      )}

                      {/* Tax Information */}
                      {(() => {
                        const baseAmount = calculatePrice(selectedPlan);
                        const taxPercentage = selectedPlan.tax_percentage || 0;
                        const taxAmount = calculateTaxAmount(baseAmount, taxPercentage);
                        const totalWithTax = baseAmount + taxAmount;
                        
                        return baseAmount > 0 ? (
                          <>
                            <div className="flex justify-between items-center flex-wrap gap-2">
                              <span className="text-sm sm:text-base text-slate-600">Subtotal</span>
                              <span className="font-medium text-sm sm:text-base text-slate-900">{formatPrice(baseAmount, selectedPlan.currency)}</span>
                            </div>
                            <div className="flex justify-between items-center flex-wrap gap-2">
                              <span className="text-sm sm:text-base text-slate-600">Tax ({taxPercentage}%)</span>
                              <span className="font-medium text-sm sm:text-base text-slate-900">{formatPrice(taxAmount, selectedPlan.currency)}</span>
                            </div>
                            <div className="border-t pt-2 sm:pt-3 mt-2 sm:mt-3">
                              <div className="flex justify-between items-center text-lg sm:text-xl font-bold flex-wrap gap-2">
                                <span className="text-sm sm:text-lg">Total to Pay Now</span>
                                <span className="text-blue-600 text-base sm:text-xl">{formatPrice(totalWithTax, selectedPlan.currency)}</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="border-t pt-2 sm:pt-3 mt-2 sm:mt-3">
                            <div className="flex justify-between items-center text-lg sm:text-xl font-bold flex-wrap gap-2">
                              <span className="text-sm sm:text-lg">Total to Pay Now</span>
                              <span className="text-green-600 text-base sm:text-xl">FREE!</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Important Note */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                    <div className="flex items-start">
                      <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-blue-800 mb-1 text-sm sm:text-base">Payment Information</h4>
                        <p className="text-xs sm:text-sm text-blue-700">
                          You'll pay the discounted amount now. Future payments will be at the regular rate ({formatPrice(selectedPlan.price, selectedPlan.currency)}).
                          You can cancel anytime from your dashboard.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Button 
                      onClick={() => {
                        setShowPaymentSummary(false);
                        setShowCouponSection(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs sm:text-sm"
                    >
                      Back to Coupon
                    </Button>
                    
                    <Button
                      onClick={handlePayment}
                      disabled={isLoading}
                      className="flex-1"
                      size="sm"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                          <span className="text-xs sm:text-sm">Processing...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          {calculatePrice(selectedPlan) <= 0 ? (
                            <>
                              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                              <span className="text-xs sm:text-sm">Activate Free Subscription</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                              <span className="text-xs sm:text-sm">Pay Now - {formatPrice(calculatePrice(selectedPlan), selectedPlan.currency)}</span>
                            </>
                          )}
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Trust Elements */}
          {!selectedPlan && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 px-2 sm:px-0">
              <Card>
                <div className="p-4 sm:p-6 text-center">
                  <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 mx-auto mb-2 sm:mb-3" />
                  <h3 className="font-semibold text-slate-700 mb-2 text-sm sm:text-base">Secure Payments</h3>
                  <p className="text-xs sm:text-sm text-slate-600">
                    All payments are processed securely through Razorpay with 256-bit SSL encryption.
                  </p>
                </div>
              </Card>

              <Card>
                <div className="p-4 sm:p-6 text-center">
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 mx-auto mb-2 sm:mb-3" />
                  <h3 className="font-semibold text-slate-700 mb-2 text-sm sm:text-base">Flexible Billing</h3>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Cancel or change your plan anytime. No long-term commitments required.
                  </p>
                </div>
              </Card>

              <Card>
                <div className="p-4 sm:p-6 text-center">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 mx-auto mb-2 sm:mb-3" />
                  <h3 className="font-semibold text-slate-700 mb-2 text-sm sm:text-base">24/7 Support</h3>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Get help whenever you need it with our dedicated support team.
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* FAQ Section */}
          {!selectedPlan && (
            <Card className="px-2 sm:px-0">
              <div className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-3 sm:mb-4">Frequently Asked Questions</h3>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-700 mb-1 text-sm sm:text-base">Can I change my plan later?</h4>
                    <p className="text-xs sm:text-sm text-slate-600">Yes, you can upgrade or downgrade your plan at any time from your dashboard.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-700 mb-1 text-sm sm:text-base">What payment methods do you accept?</h4>
                    <p className="text-xs sm:text-sm text-slate-600">We accept all major credit cards, debit cards, UPI, net banking, and digital wallets.</p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

