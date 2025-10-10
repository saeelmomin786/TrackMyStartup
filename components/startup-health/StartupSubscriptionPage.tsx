import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { paymentService } from '../../lib/paymentService';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Check, X, CreditCard, Percent, Calendar, DollarSign, Crown, Zap, Star, Shield, Users, TrendingUp, ArrowRight, ArrowLeft, CheckCircle, LogOut } from 'lucide-react';

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
        
        // Payment success will be handled by centralized callback
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
      if (err.message && err.message.includes('cancelled by user')) {
        setError('Trial setup was cancelled. Please try again when ready.');
      } else {
        setError('Trial setup failed. Please try again.');
      }
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
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
        <div className="text-center mb-12 relative">
          {/* Logout Button */}
          <div className="absolute top-0 right-0">
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
          
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Choose Your Subscription Plan
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Unlock the full potential of your startup with our comprehensive platform. 
            Choose the plan that works best for your business needs.
          </p>
      </div>

        {/* Error Message */}
      {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <X className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}
      
        {/* Success Message */}
      {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <Check className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

        {/* Step 1: Plan Selection */}
        {!selectedPlan && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-6 text-center">
              Step 1: Select Your Plan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.map((plan) => {
                const savings = getSavingsAmount(plan);
          
          return (
                  <Card 
                    key={plan.id} 
                    className="relative transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer"
                    onClick={() => handlePlanSelection(plan)}
                  >
                    <div className="p-8">
                {/* Plan Header */}
                <div className="text-center mb-6">
                        <div className="flex items-center justify-center mb-4">
                          {plan.interval === 'yearly' ? (
                            <Crown className="h-8 w-8 text-yellow-500 mr-2" />
                          ) : (
                            <Star className="h-8 w-8 text-blue-500 mr-2" />
                          )}
                          <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
                        </div>
                        
                  <div className="mb-4">
                          <span className="text-4xl font-bold text-slate-900">
                            {formatPrice(plan.price, plan.currency)}
                        </span>
                          <div className="text-slate-600 text-sm mt-2">
                            per {plan.interval === 'monthly' ? 'month' : 'year'}
                            {plan.interval === 'yearly' && (
                              <span className="block text-green-600 font-medium">
                                Save {formatPrice(savings, plan.currency)} per month!
                      </span>
                    )}
                    </div>
                  </div>
                  
                  {plan.interval === 'yearly' && (
                          <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 mb-4">
                            <Crown className="h-4 w-4 mr-2" />
                            Most Popular - 2 Months Free!
                    </div>
                  )}
                </div>

                {/* Plan Description */}
                      <p className="text-slate-600 text-center mb-6">
                  {plan.description}
                </p>

                {/* Features List */}
                      <ul className="space-y-3 mb-8">
                        {getPlanFeatures(plan).map((feature, index) => (
                          <li key={index} className="flex items-start text-sm text-slate-600">
                            <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                  </li>
                        ))}
                      </ul>

                      {/* Selection Button */}
                      <Button
                        onClick={() => handlePlanSelection(plan)}
                        className="w-full"
                        variant="outline"
                        size="lg"
                      >
                        <div className="flex items-center justify-center">
                          <ArrowRight className="h-5 w-5 mr-2" />
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
          <Card className="mb-8">
            <div className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                  Step 2: Choose Your Option
                </h2>
                <p className="text-slate-600">
                  You selected: <span className="font-semibold">{selectedPlan.name}</span> - {formatPrice(selectedPlan.price, selectedPlan.currency)}/month
                </p>
              </div>
              
              <div className="max-w-3xl mx-auto">
                {/* Clear Instructions */}
                <div className="text-center mb-8">
                  <p className="text-lg text-slate-600 mb-4">
                    Choose how you'd like to proceed with your subscription:
                  </p>
                </div>

                {/* Option Cards */}
                <div className="space-y-6">
                  
                  {/* Option 1: Free Trial */}
                  <Card className="border-2 border-green-200 hover:border-green-300 transition-colors">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <div className="bg-green-100 p-3 rounded-full mr-4">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-slate-900">Start Free Trial</h3>
                            <p className="text-slate-600">Try our platform for 30 days at no cost</p>
                          </div>
                        </div>
                        <div className="bg-green-50 px-3 py-1 rounded-full">
                          <span className="text-sm font-medium text-green-700">Recommended</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="space-y-2">
                          <h4 className="font-medium text-slate-900">What you get:</h4>
                          <ul className="space-y-1 text-sm text-slate-600">
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
                          <h4 className="font-medium text-slate-900">After trial:</h4>
                          <ul className="space-y-1 text-sm text-slate-600">
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
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center mb-2">
                          <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="font-medium text-blue-800">Payment Method Required</span>
                        </div>
                        <p className="text-sm text-blue-700">
                          We'll need to set up your payment method, but you won't be charged until your trial ends.
                        </p>
                        <p className="text-xs text-blue-700 mt-2">
                          Note: To begin your subscription, a refundable amount of 
                          <span className="font-semibold"> ₹5</span> may be charged now for verification. 
                          This ₹5 will be automatically refunded by Razorpay. After the trial, your selected plan amount will be charged.
                        </p>
                      </div>
                      
                <Button
                        onClick={() => handleTrialSetup()}
                  disabled={isLoading}
                  className="w-full"
                        size="lg"
                >
                  {isLoading ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Setting up trial...
                    </div>
                  ) : (
                          <div className="flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Start Free Trial
                    </div>
                  )}
                </Button>
              </div>
            </Card>

                  {/* Pay Now option intentionally hidden for now */}
                </div>

                {/* Back Button */}
                <div className="mt-8 text-center">
                  <Button 
                    onClick={() => {
                      setShowTrialAndCoupon(false);
                      setSelectedPlan(null);
                    }}
                    variant="outline"
                    className="text-slate-600"
                  >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Back to Plan Selection
                  </Button>
                </div>
              </div>
        </div>
      </Card>
        )}


        {/* Step 3: Payment Summary */}
        {selectedPlan && showPaymentSummary && (
          <Card className="mb-8">
            <div className="p-8">
                <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                  Step 3: Review & Pay
                </h2>
                <p className="text-slate-600">
                  Review your order and complete payment
                </p>
        </div>
              
              <div className="max-w-2xl mx-auto">
                {/* Order Summary */}
                <div className="bg-slate-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-slate-700 mb-4">Order Summary</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">
                        {selectedPlan.name} ({selectedPlan.interval})
                        </span>
                      <span className="font-medium">
                        {formatPrice(selectedPlan.price, selectedPlan.currency)}
                        </span>
                      </div>
                    
                    {appliedCoupon && (
                      <>
                        <div className="flex justify-between items-center text-green-600">
                          <span>Coupon ({appliedCoupon.code})</span>
                          <span>
                            -{appliedCoupon.discount_type === 'percentage' 
                              ? `${appliedCoupon.discount_value}%`
                              : formatPrice(appliedCoupon.discount_value, selectedPlan.currency)
                            }
                      </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-green-600 font-semibold">
                          <span>You Save</span>
                          <span>{formatPrice(calculateSavings(selectedPlan), selectedPlan.currency)}</span>
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
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Subtotal</span>
                            <span className="font-medium text-slate-900">{formatPrice(baseAmount, selectedPlan.currency)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Tax ({taxPercentage}%)</span>
                            <span className="font-medium text-slate-900">{formatPrice(taxAmount, selectedPlan.currency)}</span>
                          </div>
                          <div className="border-t pt-3">
                            <div className="flex justify-between items-center text-xl font-bold">
                              <span>Total to Pay Now</span>
                              <span className="text-blue-600">{formatPrice(totalWithTax, selectedPlan.currency)}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="border-t pt-3">
                          <div className="flex justify-between items-center text-xl font-bold">
                            <span>Total to Pay Now</span>
                            <span className="text-green-600">FREE!</span>
                          </div>
                        </div>
                      );
                    })()}
                    </div>
      </div>

                {/* Important Note */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <Shield className="h-5 w-5 text-blue-500 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-800 mb-1">Payment Information</h4>
                      <p className="text-sm text-blue-700">
                        You'll pay the discounted amount now. Future payments will be at the regular rate ({formatPrice(selectedPlan.price, selectedPlan.currency)}).
                        You can cancel anytime from your dashboard.
                      </p>
                    </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button 
                    onClick={() => {
                      setShowPaymentSummary(false);
                      setShowCouponSection(true);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Back to Coupon
                  </Button>
                  
                <Button
                    onClick={handlePayment}
                  disabled={isLoading}
                    className="flex-1"
                    size="lg"
                >
                  {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
            </div>
                  ) : (
                      <div className="flex items-center justify-center">
                        {calculatePrice(selectedPlan) <= 0 ? (
                          <>
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Activate Free Subscription
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-5 w-5 mr-2" />
                            Pay Now - {formatPrice(calculatePrice(selectedPlan), selectedPlan.currency)}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <div className="p-6 text-center">
              <Shield className="h-8 w-8 text-blue-500 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-700 mb-2">Secure Payments</h3>
              <p className="text-sm text-slate-600">
                All payments are processed securely through Razorpay with 256-bit SSL encryption.
              </p>
              </div>
            </Card>

      <Card>
        <div className="p-6 text-center">
              <Calendar className="h-8 w-8 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-700 mb-2">Flexible Billing</h3>
              <p className="text-sm text-slate-600">
                Cancel or change your plan anytime. No long-term commitments required.
              </p>
      </div>
          </Card>

      <Card>
        <div className="p-6 text-center">
              <Users className="h-8 w-8 text-purple-500 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-700 mb-2">24/7 Support</h3>
              <p className="text-sm text-slate-600">
                Get help whenever you need it with our dedicated support team.
              </p>
            </div>
          </Card>
        </div>

        {/* FAQ Section */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Frequently Asked Questions</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-slate-700 mb-1">Can I change my plan later?</h4>
                <p className="text-sm text-slate-600">Yes, you can upgrade or downgrade your plan at any time from your dashboard.</p>
            </div>
              <div>
                <h4 className="font-medium text-slate-700 mb-1">What payment methods do you accept?</h4>
                <p className="text-sm text-slate-600">We accept all major credit cards, debit cards, UPI, net banking, and digital wallets.</p>
            </div>
              
          </div>
        </div>
      </Card>
        </div>
    </div>
  );
}

