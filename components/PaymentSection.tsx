import React, { useState, useEffect } from 'react';
import { paymentService, SubscriptionPlan, UserSubscription, DiscountCoupon } from '../lib/paymentService';
import Button from './ui/Button';
import Card from './ui/Card';
import StartupSubscriptionModal from './StartupSubscriptionModal';
import { CreditCard, CheckCircle, AlertCircle, Percent, Calendar, RefreshCw, Settings, Download, Clock, DollarSign, Users, Building2 } from 'lucide-react';
import { getCurrencyForCountry } from '../lib/utils';
import { formatCurrencyFromEUR } from '../lib/currencyUtils';

interface PaymentSectionProps {
  userId: string;
  userType: 'Investor' | 'Startup' | 'Startup Facilitation Center' | 'Investment Advisor';
  country: string;
  startupCount: number;
}

export default function PaymentSection({ userId, userType, country, startupCount }: PaymentSectionProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<DiscountCoupon | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Get currency based on user's country
  const userCurrency = getCurrencyForCountry(country);
  
  // Format currency function - convert from EUR to user's currency
  const formatCurrency = (eurAmount: number) => {
    return formatCurrencyFromEUR(eurAmount, userCurrency);
  };

  useEffect(() => {
    loadSubscriptionData();
  }, [userId, userType, country]);

  const loadSubscriptionData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [plansData, subscriptionData] = await Promise.all([
        paymentService.getSubscriptionPlans(userType, country),
        paymentService.getUserSubscription(userId)
      ]);
      
      setPlans(plansData || []);
      setCurrentSubscription(subscriptionData);
      
      // If no plans are available, show a helpful message
      if (!plansData || plansData.length === 0) {
        setError(`No subscription plans available for ${userType} in ${country}. Please contact support.`);
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      setError('Failed to load subscription information. Please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    try {
      const result = await paymentService.applyDiscountCoupon(couponCode, userId);
      setAppliedCoupon(result.coupon);
      setError(null);
      setSuccess(`Coupon applied! ${result.coupon.discount_type === 'percentage' ? `${result.coupon.discount_value}%` : formatCurrency(result.coupon.discount_value)} discount`);
    } catch (error) {
      setError('Invalid or expired coupon code');
      setAppliedCoupon(null);
    }
  };

  const calculatePrice = (plan: SubscriptionPlan) => {
    let totalPrice = plan.price * startupCount;
    
    if (appliedCoupon) {
      if (appliedCoupon.discount_type === 'percentage') {
        totalPrice = totalPrice * (1 - appliedCoupon.discount_value / 100);
      } else {
        totalPrice = Math.max(0, totalPrice - appliedCoupon.discount_value);
      }
    }
    
    return totalPrice;
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const totalAmount = calculatePrice(plan);
      const paymentIntent = await paymentService.createPaymentIntent(
        totalAmount,
        plan.currency,
        userId,
        plan.id
      );

      // Here you would integrate with your payment gateway (Stripe, etc.)
      // For now, we'll simulate a successful payment
      const subscription = await paymentService.confirmPayment(
        paymentIntent.id,
        userId,
        plan.id,
        startupCount
      );

      setCurrentSubscription(subscription);
      setSuccess('Subscription activated successfully!');
      setAppliedCoupon(null);
      setCouponCode('');
    } catch (error) {
      console.error('Error processing subscription:', error);
      setError('Failed to process subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !currentSubscription) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Subscription Management</h3>
        </div>

        {/* Current Subscription Status */}
        {currentSubscription ? (
          <div className="space-y-4">
            {/* Active Subscription Header */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Active Subscription</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    {currentSubscription.status}
                  </span>
                </div>
              </div>
              
              {/* Subscription Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-medium text-slate-600">Plan</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{currentSubscription.plan_id}</p>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-medium text-slate-600">Startups</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{currentSubscription.startup_count}</p>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-medium text-slate-600">Amount</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(currentSubscription.amount)}</p>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-medium text-slate-600">Started</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {new Date(currentSubscription.current_period_start).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-medium text-slate-600">Next Billing</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <RefreshCw className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-medium text-slate-600">Interval</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 capitalize">
                    {currentSubscription.interval}
                  </p>
                </div>
              </div>
            </div>

            {/* Subscription Management Actions */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Subscription Management
              </h4>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Update Plan
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Invoice
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Billing Settings
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:border-red-300">
                  Cancel Subscription
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">No Active Subscription</span>
            </div>
            <p className="text-sm text-yellow-700 mb-3">
              Subscribe to access premium features for your {startupCount} startup{startupCount !== 1 ? 's' : ''}.
            </p>
            <Button
              onClick={() => setShowSubscriptionModal(true)}
              className="w-full"
              size="sm"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Subscribe Now
            </Button>
            <div className="bg-white rounded-lg p-3 border border-yellow-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">Current Usage</p>
                  <p className="text-xs text-slate-600">{startupCount} startup{startupCount !== 1 ? 's' : ''} requiring subscription</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">₹{startupCount * 354}/month</p>
                  <p className="text-xs text-slate-600">or ₹{startupCount * 3540}/year</p>
                  <p className="text-xs text-green-600 font-medium">80% OFF First Year</p>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Subscription Plans - Hidden for Startups */}
        {!currentSubscription && userType !== 'Startup' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-900">Choose Your Plan</h4>
              <div className="text-sm text-slate-600">
                {plans.length} plan{plans.length !== 1 ? 's' : ''} available
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                    selectedPlan?.id === plan.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  {/* Plan Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium text-slate-900">{plan.name}</h5>
                        {plan.interval === 'yearly' && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Save 33%
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-slate-900">
                        {formatCurrency(plan.price)}/{plan.interval === 'monthly' ? 'mo' : 'yr'}
                      </div>
                      <div className="text-sm text-slate-500">per startup</div>
                    </div>
                  </div>
                  
                  {/* Plan Features */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Full platform access</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Priority support</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Advanced analytics</span>
                    </div>
                    {plan.interval === 'yearly' && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>2 months free ({formatCurrency(Math.round(plan.price * 0.5))} savings)</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Pricing Calculation */}
                  {startupCount > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Base price for {startupCount} startup{startupCount !== 1 ? 's' : ''}:</span>
                          <span>{formatCurrency(plan.price * startupCount)}</span>
                        </div>
                        {appliedCoupon && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Discount ({appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : formatCurrency(appliedCoupon.discount_value)}):</span>
                            <span>-{formatCurrency((plan.price * startupCount) - calculatePrice(plan))}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-semibold border-t border-slate-200 pt-2">
                          <span>Total:</span>
                          <span>{formatCurrency(calculatePrice(plan))}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Selection Indicator */}
                  {selectedPlan?.id === plan.id && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Selected plan</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discount Coupon - Hidden for Startups */}
        {!currentSubscription && selectedPlan && userType !== 'Startup' && (
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">Discount Coupon</span>
                </div>
                {appliedCoupon && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Applied
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter coupon code (e.g., WELCOME20)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={appliedCoupon !== null}
                />
                <Button
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim() || appliedCoupon !== null}
                  size="sm"
                  variant="outline"
                >
                  {appliedCoupon ? 'Applied' : 'Apply'}
                </Button>
              </div>
              
              {appliedCoupon && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Coupon applied: {appliedCoupon.discount_type === 'percentage' 
                          ? `${appliedCoupon.discount_value}% off` 
                          : `${formatCurrency(appliedCoupon.discount_value)} off`}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Code: {appliedCoupon.code}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponCode('');
                      }}
                      className="text-green-600 hover:text-green-800 text-sm underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
              
              <div className="text-xs text-slate-500">
                <p>• Coupon codes are case-insensitive</p>
                <p>• Some coupons may have usage limits or expiration dates</p>
                <p>• Discounts are applied to the total subscription amount</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Summary and Subscribe Button - Hidden for Startups */}
        {!currentSubscription && selectedPlan && userType !== 'Startup' && (
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Summary
            </h4>
            
            <div className="space-y-3">
              {/* Payment Details */}
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Plan:</span>
                    <span className="font-medium">{selectedPlan.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Billing:</span>
                    <span className="font-medium capitalize">{selectedPlan.interval}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Startups:</span>
                    <span className="font-medium">{startupCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Base amount:</span>
                    <span className="font-medium">{formatCurrency(selectedPlan.price * startupCount)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount ({appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : formatCurrency(appliedCoupon.discount_value)}):</span>
                      <span>-{formatCurrency((selectedPlan.price * startupCount) - calculatePrice(selectedPlan))}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2">
                    <div className="flex justify-between text-base font-semibold">
                      <span>Total:</span>
                      <span>{formatCurrency(calculatePrice(selectedPlan))}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Payment Methods */}
              <div className="text-sm text-slate-600">
                <p className="font-medium mb-2">Accepted payment methods:</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    <span>Credit/Debit Card</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    <span>Bank Transfer</span>
                  </div>
                </div>
              </div>
              
              {/* Subscribe Button */}
              <Button
                onClick={() => handleSubscribe(selectedPlan)}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing Payment...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Subscribe for {formatCurrency(calculatePrice(selectedPlan))}
                  </div>
                )}
              </Button>
              
              {/* Security Notice */}
              <div className="text-xs text-slate-500 text-center">
                <p>🔒 Secure payment processing • Cancel anytime • No setup fees</p>
              </div>
            </div>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {/* Enhanced Pricing Information - Hidden for Startups */}
        {userType !== 'Startup' && (
          <div className="bg-slate-50 rounded-lg p-4">
            <h5 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing Information
            </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h6 className="text-sm font-medium text-slate-800">Subscription Details</h6>
              <div className="text-sm text-slate-600 space-y-1">
                <p>• ₹354/month or ₹3,540/year per startup (80% OFF first year)</p>
                <p>• Billing based on active startup investments</p>
                <p>• Update subscription anytime</p>
                <p>• Cancel anytime with no fees</p>
              </div>
            </div>
            <div className="space-y-2">
              <h6 className="text-sm font-medium text-slate-800">What's Included</h6>
              <div className="text-sm text-slate-600 space-y-1">
                <p>• Full platform access</p>
                <p>• Priority customer support</p>
                <p>• Advanced analytics & reporting</p>
                <p>• Real-time notifications</p>
              </div>
            </div>
          </div>
          
          {/* User Type Specific Information */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-800 mb-1">
                {userType === 'Investor' && 'For Investors:'}
                {userType === 'Startup' && 'For Startups:'}
                {userType === 'Startup Facilitation Center' && 'For Facilitation Centers:'}
                {userType === 'Investment Advisor' && 'For Investment Advisors:'}
              </p>
              <div>
                {userType === 'Investor' && (
                  <p>Pay only for startups you actively invest in. No charges for browsing or due diligence.</p>
                )}
                {userType === 'Startup' && (
                  <p>Pay only when you receive investments. Free to use the platform for fundraising.</p>
                )}
                {userType === 'Startup Facilitation Center' && (
                  <p>Pay only when you take equity in startups. Limited incubation programs are free.</p>
                )}
                {userType === 'Investment Advisor' && (
                  <div className="space-y-2">
                    <p className="font-medium">Smart Fee Structure - Pay Only When You Succeed:</p>
                    <div className="text-sm space-y-1 ml-2">
                      <p>• <span className="font-medium">Both from your network:</span> No scouting fees</p>
                      <p>• <span className="font-medium">Investor from network:</span> 30% from investor</p>
                      <p>• <span className="font-medium">Startup from network:</span> 30% from startup</p>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">Plus standard subscription fees for platform access.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
      
      {/* Startup Subscription Modal */}
      {userType === 'Startup' && (
        <StartupSubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          onSubscriptionSuccess={() => {
            setShowSubscriptionModal(false);
            loadSubscriptionData(); // Refresh subscription data
            setSuccess('Subscription activated successfully!');
          }}
          startupName={`Startup ${userId}`} // You can pass the actual startup name here
        />
      )}
    </Card>
  );
}
