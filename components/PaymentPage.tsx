import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { paymentService } from '../lib/paymentService';
import { countryPriceService } from '../lib/countryPriceService';
import { selectPaymentGateway, getUserCountry } from '../lib/paymentGatewaySelector';
import { subscriptionService } from '../lib/subscriptionService';
import PaymentSuccess from './PaymentSuccess';
import Card from './ui/Card';
import Button from './ui/Button';
import Select from './ui/Select';
import { 
  CreditCard, 
  MapPin, 
  ArrowLeft, 
  CheckCircle, 
  Loader2,
  Shield,
  AlertCircle
} from 'lucide-react';
// import { useNavigate } from 'react-router-dom'; // Commented out - use window.location if router not available

interface PaymentPageProps {
  planTier: 'basic' | 'premium';
  userId?: string;
  onPaymentSuccess?: () => void;
  onBack?: () => void;
}

// Common countries list
const COUNTRIES = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Singapore',
  'United Arab Emirates',
  'Other'
];

export default function PaymentPage({ planTier, userId, onPaymentSuccess, onBack }: PaymentPageProps) {
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [countryPrice, setCountryPrice] = useState<{
    price_eur: number;
    price_inr: number | null;
    currency: string;
    payment_gateway: 'razorpay' | 'stripe' | 'paypal';
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string>('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paidCurrency, setPaidCurrency] = useState<string>('EUR');

  // const navigate = useNavigate(); // Commented out - use window.location if router not available

  // Get auth_user_id
  useEffect(() => {
    const getAuthUserId = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.id) {
          setAuthUserId(authUser.id);
        } else if (userId) {
          setAuthUserId(userId);
        }
      } catch (error) {
        console.error('Error getting auth user ID:', error);
        if (userId) {
          setAuthUserId(userId);
        }
      }
    };
    getAuthUserId();
  }, [userId]);

  // Load user country and pricing
  useEffect(() => {
    if (authUserId) {
      loadUserData();
    }
  }, [authUserId, planTier]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user's country
      const country = await getUserCountry(authUserId);
      setUserCountry(country);
      
      if (country) {
        setSelectedCountry(country);
        await fetchCountryPrice(country);
      } else {
        // No country found, user needs to select
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user data. Please try again.');
      setLoading(false);
    }
  };

  const fetchCountryPrice = async (country: string) => {
    try {
      setLoading(true);
      
      // Get country-specific price
      const priceData = await countryPriceService.getCountryPrice(country, planTier);
      
      if (priceData) {
        const gateway = selectPaymentGateway(country);
        setCountryPrice({
          price_eur: priceData.base_price_eur || (planTier === 'basic' ? 5 : 20),
          price_inr: priceData.price_inr,
          currency: priceData.currency || 'EUR',
          payment_gateway: gateway
        });
      } else {
        // Fallback to default pricing
        const gateway = selectPaymentGateway(country);
        setCountryPrice({
          price_eur: planTier === 'basic' ? 5 : 20,
          price_inr: null,
          currency: gateway === 'razorpay' ? 'INR' : 'EUR',
          payment_gateway: gateway
        });
      }
    } catch (error) {
      console.error('Error fetching country price:', error);
      setError('Failed to load pricing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = async (country: string) => {
    setSelectedCountry(country);
    await fetchCountryPrice(country);
  };

  const handleProceedToPayment = async () => {
    if (!selectedCountry || !countryPrice) {
      setError('Please select your country');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      // Save country if not already saved
      if (!userCountry && selectedCountry) {
        await saveUserCountry(selectedCountry);
      }

      // Get subscription plan details
      const plan = await getSubscriptionPlan(planTier, selectedCountry, countryPrice);
      
      if (!plan) {
        throw new Error('Failed to get subscription plan');
      }

      // Process payment - paymentService will route to Razorpay or PayPal based on country
      await processPayment(plan);
    } catch (error: any) {
      console.error('Error processing payment:', error);
      setError(error.message || 'Failed to process payment. Please try again.');
      setProcessing(false);
    }
  };

  const saveUserCountry = async (country: string) => {
    try {
      // Try to save to startups table first (most reliable)
      const { error: startupError } = await supabase
        .from('startups')
        .update({ 
          country: country,
          country_of_registration: country 
        })
        .eq('user_id', authUserId)
        .limit(1);

      if (startupError) {
        console.warn('Could not save to startups:', startupError);
        // Try user_subscriptions as fallback
        const { error: subError } = await supabase
          .from('user_subscriptions')
          .update({ country: country })
          .eq('user_id', authUserId)
          .limit(1);

        if (subError) {
          console.warn('Could not save to user_subscriptions:', subError);
        }
      }
    } catch (error) {
      console.error('Error saving country:', error);
      // Non-critical error, continue - payment can still proceed
    }
  };

  const getSubscriptionPlan = async (
    tier: 'basic' | 'premium',
    country: string,
    priceData: typeof countryPrice
  ): Promise<any> => {
    try {
      // Get plan from subscription_plans table
      // Try multiple strategies to find the plan
      let plans = null;
      let error = null;

      // Strategy 1: Try with country and user_type (with plan_tier)
      const { data: plans1, error: error1 } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('plan_tier', tier)
        .eq('is_active', true)
        .eq('user_type', 'Startup')
        .eq('interval', 'monthly')
        .in('country', [country, 'Global'])
        .order('country', { ascending: false }) // Prefer country-specific over Global
        .limit(1)
        .maybeSingle();
      
      console.log('Strategy 1 result (with plan_tier):', { plans1, error1 });

      if (!error1 && plans1) {
        plans = plans1;
      } else {
        // Strategy 2: Try without country filter
        const { data: plans2, error: error2 } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('plan_tier', tier)
          .eq('is_active', true)
          .eq('user_type', 'Startup')
          .eq('interval', 'monthly')
          .limit(1)
          .maybeSingle();

        if (!error2 && plans2) {
          plans = plans2;
        } else {
          // Strategy 3: Try without user_type filter (with plan_tier)
          const { data: plans3, error: error3 } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('plan_tier', tier)
            .eq('is_active', true)
            .eq('interval', 'monthly')
            .limit(1)
            .maybeSingle();
          
          console.log('Strategy 3 result (with plan_tier, no user_type):', { plans3, error3 });

          if (!error3 && plans3) {
            plans = plans3;
          } else {
            // Strategy 4: Just find any plan with the tier (no interval filter)
            const { data: plans4, error: error4 } = await supabase
              .from('subscription_plans')
              .select('*')
              .eq('plan_tier', tier)
              .eq('is_active', true)
              .limit(1)
              .maybeSingle();
            
            console.log('Strategy 4 result (with plan_tier, no interval):', { plans4, error4 });
            
            if (!error4 && plans4) {
              plans = plans4;
            } else {
              // Strategy 5: Try without plan_tier filter (for legacy plans)
              const { data: plans5, error: error5 } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('is_active', true)
                .eq('user_type', 'Startup')
                .eq('interval', 'monthly')
                .in('country', [country, 'Global'])
                .or(`name.ilike.%${tier}%,name.ilike.%Basic%,name.ilike.%Premium%`)
                .limit(1)
                .maybeSingle();
              
              console.log('Strategy 5 result (no plan_tier, by name):', { plans5, error5 });
              
              if (!error5 && plans5) {
                plans = plans5;
              } else {
                // Strategy 6: Find any monthly Startup plan
                const { data: plans6, error: error6 } = await supabase
                  .from('subscription_plans')
                  .select('*')
                  .eq('is_active', true)
                  .eq('user_type', 'Startup')
                  .eq('interval', 'monthly')
                  .limit(1)
                  .maybeSingle();
                
                console.log('Strategy 6 result (any monthly Startup plan):', { plans6, error6 });
                
                if (!error6 && plans6) {
                  plans = plans6;
                } else {
                  error = error6 || error5 || error4 || error3 || error2 || error1;
                }
              }
            }

            if (!error4 && plans4) {
              plans = plans4;
            } else {
              error = error4 || error3 || error2 || error1;
            }
          }
        }
      }

      if (error) {
        console.error('❌ Error fetching plan from database:', error);
        throw new Error(`Failed to fetch subscription plan: ${error.message}`);
      }

      if (!plans) {
        console.error('❌ Plan not found in database for tier:', tier, 'country:', country);
        // Last resort: Try to find any plan without plan_tier filter (for older plans)
        const { data: legacyPlan, error: legacyError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .eq('interval', 'monthly')
          .or(`name.ilike.%${tier}%,name.ilike.%Basic%,name.ilike.%Premium%`)
          .limit(1)
          .maybeSingle();

        if (!legacyError && legacyPlan) {
          plans = legacyPlan;
          console.log('✅ Found legacy plan:', legacyPlan);
        } else {
          throw new Error(`Subscription plan not found for ${tier} tier. Please ensure plans are set up in the database.`);
        }
      }

      // Update plan with country-specific pricing
      return {
        ...plans,
        price: priceData.payment_gateway === 'razorpay' 
          ? (priceData.price_inr || 0) 
          : priceData.price_eur,
        currency: priceData.currency,
        // Ensure plan_tier is set correctly
        plan_tier: plans.plan_tier || tier
      };
    } catch (error) {
      console.error('Error getting subscription plan:', error);
      return null;
    }
  };

  const processPayment = async (plan: any) => {
    try {
      // Set up payment success callback
      paymentService.setPaymentSuccessCallback(() => {
        console.log('✅ Payment success callback triggered');
        setPaidAmount(plan.price);
        setPaidCurrency(plan.currency || (countryPrice?.payment_gateway === 'razorpay' ? 'INR' : 'EUR'));
        setPaymentSuccess(true);
        setProcessing(false);
      });

      const success = await paymentService.processPayment(
        plan,
        authUserId,
        undefined, // coupon code
        { id: authUserId }, // current user
        selectedCountry // pass country - paymentService will route to Razorpay or PayPal
      );

      if (success) {
        // Payment success callback will handle the UI update
        // Don't redirect immediately, show success screen first
        console.log('Payment processed successfully, waiting for verification...');
      } else {
        setError('Payment was cancelled. Please try again.');
        setProcessing(false);
        paymentService.setPaymentSuccessCallback(undefined);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setError(error.message || 'Payment failed. Please try again.');
      setProcessing(false);
      paymentService.setPaymentSuccessCallback(undefined);
    }
  };

  const handleContinueAfterSuccess = () => {
    // Clean up callback
    paymentService.setPaymentSuccessCallback(undefined);
    
    if (onPaymentSuccess) {
      onPaymentSuccess();
    } else {
      // Redirect to dashboard or account page
      window.location.href = '/dashboard';
    }
  };

  const formatPrice = () => {
    if (!countryPrice) return 'Loading...';
    
    if (countryPrice.payment_gateway === 'razorpay' && countryPrice.price_inr) {
      return `₹${countryPrice.price_inr.toLocaleString('en-IN')}`;
    }
    
    return `€${countryPrice.price_eur.toLocaleString('en-EU')}`;
  };

  const getGatewayName = () => {
    if (!countryPrice) return '';
    
    switch (countryPrice.payment_gateway) {
      case 'razorpay':
        return 'Razorpay';
      case 'stripe':
        return 'Stripe';
      case 'paypal':
        return 'PayPal';
      default:
        return 'Payment Gateway';
    }
  };

  // Show success screen if payment completed
  if (paymentSuccess) {
    return (
      <PaymentSuccess
        planTier={planTier}
        amount={paidAmount}
        currency={paidCurrency}
        onContinue={handleContinueAfterSuccess}
      />
    );
  }

  if (loading && !selectedCountry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading payment information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Plans
            </Button>
          )}
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Complete Your Payment
          </h1>
          <p className="text-slate-600">
            {planTier === 'basic' ? 'Basic Plan' : 'Premium Plan'} - Secure payment processing
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Country Selection */}
        <Card className="mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Your Country
              </label>
              <Select
                value={selectedCountry}
                onChange={(e) => handleCountryChange(e.target.value)}
                disabled={processing}
              >
                <option value="">Select your country</option>
                {COUNTRIES.map(country => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </Select>
              {userCountry && (
                <p className="text-xs text-slate-500 mt-1">
                  Using saved country: {userCountry}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Payment Summary */}
        {selectedCountry && countryPrice && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Payment Summary</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-200">
                <span className="text-slate-600">Plan</span>
                <span className="font-medium text-slate-900">
                  {planTier === 'basic' ? 'Basic Plan' : 'Premium Plan'}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-200">
                <span className="text-slate-600">Billing Cycle</span>
                <span className="font-medium text-slate-900">Monthly</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-200">
                <span className="text-slate-600">Amount</span>
                <span className="text-2xl font-bold text-slate-900">{formatPrice()}</span>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-slate-600">Payment Gateway</span>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-600" />
                  <span className="font-medium text-slate-900">{getGatewayName()}</span>
                </div>
              </div>
            </div>

            {countryPrice.payment_gateway === 'razorpay' && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Secure Payment</p>
                    <p className="text-xs text-blue-700 mt-1">
                      You'll be redirected to Razorpay's secure payment page to complete your transaction.
                      Your payment will be processed in INR (₹).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {countryPrice.payment_gateway === 'paypal' && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Secure Payment</p>
                    <p className="text-xs text-blue-700 mt-1">
                      You'll be redirected to PayPal's secure payment page to complete your transaction.
                      Your payment will be processed in EUR (€).
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Payment Button */}
        {selectedCountry && countryPrice && (
          <div className="space-y-4">
            <Button
              onClick={handleProceedToPayment}
              disabled={processing || !selectedCountry || !countryPrice}
              className="w-full"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Proceed to Payment
                </>
              )}
            </Button>

            <div className="text-center">
              <p className="text-xs text-slate-500">
                By proceeding, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
