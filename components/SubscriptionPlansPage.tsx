import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { subscriptionService } from '../lib/subscriptionService';
import { authService } from '../lib/auth';
import { countryPriceService } from '../lib/countryPriceService';
import { selectPaymentGateway, getUserCountry } from '../lib/paymentGatewaySelector';
import { PLAN_CONFIGS, getPlanConfig, formatStorage } from '../lib/subscriptionPlanConfig';
import Card from './ui/Card';
import Button from './ui/Button';
import { Check, Sparkles, Crown, Zap, ArrowRight, ArrowLeft, Shield, TrendingUp, Users, FileText, Globe, Lock, LogOut } from 'lucide-react';
import { messageService } from '../lib/messageService';
import CountryConfirmationModal from './startup-health/CountryConfirmationModal';
import PaymentPage from './PaymentPage';

interface SubscriptionPlansPageProps {
  userId?: string;
  onPlanSelected?: (planTier: 'free' | 'basic' | 'premium') => void;
  onBack?: () => void;
  onLogout?: () => void;
}

interface PlanDisplay {
  tier: 'free' | 'basic' | 'premium';
  name: string;
  price_eur: number;
  price_inr: number | null; // Will be fetched from country_plan_prices
  storage_mb: number;
  features: string[];
  restrictedFeatures: string[];
  isPopular?: boolean;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}

export default function SubscriptionPlansPage({ userId, onPlanSelected, onBack, onLogout }: SubscriptionPlansPageProps) {
  const [plans, setPlans] = useState<PlanDisplay[]>([]);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'basic' | 'premium' | null>(null);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'basic' | 'premium' | null>(null);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<'basic' | 'premium' | null>(null);
  const [showPaymentPage, setShowPaymentPage] = useState(false);

  // Get profile id (preferred) or fallback to auth user id
  useEffect(() => {
    const resolveUserId = async () => {
      try {
        // Try to get the mapped profile (this returns profile id as `id`)
        const profile = await authService.getCurrentUser(true);
        if (profile?.id) {
          setAuthUserId(profile.id);
          return;
        }

        // Fallback: try Supabase auth user id (auth_user_id)
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.id) {
          setAuthUserId(authUser.id);
          return;
        }

        // Final fallback: use passed-in userId prop (might already be a profile id)
        if (userId) {
          setAuthUserId(userId);
        }
      } catch (error) {
        console.error('Error resolving user/profile id for subscription page:', error);
        if (userId) setAuthUserId(userId);
      }
    };

    resolveUserId();
  }, [userId]);

  // Load user's current plan and country
  useEffect(() => {
    if (authUserId) {
      loadUserData();
    }
  }, [authUserId]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);

      // Get current subscription
      const subscription = await subscriptionService.getUserSubscription(authUserId);
      if (subscription?.plan_tier) {
        setCurrentPlan(subscription.plan_tier);
      }

      // Get user's country
      const country = await getUserCountry(authUserId);
      setUserCountry(country);

      // Load plans with country-specific pricing
      await loadPlans(country);
    } catch (error) {
      console.error('Error loading user data:', error);
      await loadPlans(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlans = async (country: string | null) => {
    const planTiers: Array<'free' | 'basic' | 'premium'> = ['free', 'basic', 'premium'];
    const plansData: PlanDisplay[] = [];

    for (const tier of planTiers) {
      const config = getPlanConfig(tier);
      
      // Get country-specific price if available
      let priceInr: number | null = null;
      if (country && tier !== 'free') {
        const countryPrice = await countryPriceService.getCountryPrice(country, tier);
        if (countryPrice) {
          priceInr = countryPrice.price_inr;
        }
      }

      plansData.push({
        tier,
        name: config.name,
        price_eur: config.price_eur,
        price_inr: priceInr,
        storage_mb: config.storage_mb,
        features: config.features,
        restrictedFeatures: config.restrictedFeatures,
        isPopular: tier === 'premium',
        icon: tier === 'free' ? <Zap className="w-6 h-6" /> : tier === 'basic' ? <Sparkles className="w-6 h-6" /> : <Crown className="w-6 h-6" />,
        color: tier === 'free' ? 'slate' : tier === 'basic' ? 'blue' : 'amber',
        gradient: tier === 'free' 
          ? 'from-slate-50 to-slate-100' 
          : tier === 'basic' 
          ? 'from-blue-50 to-blue-100' 
          : 'from-amber-50 to-orange-100'
      });
    }

    setPlans(plansData);
  };

  const handlePlanSelect = async (planTier: 'free' | 'basic' | 'premium') => {
    console.log('Plan selected:', planTier);
    console.log('authUserId:', authUserId);
    console.log('userId prop:', userId);
    
    if (planTier === 'free') {
      // Free plan - save to database
      try {
        const finalUserId = authUserId || userId;
        if (!finalUserId) {
          console.error('No user ID available for free plan');
          alert('Please log in to continue');
          return;
        }

        console.log('💾 Saving free plan to database for user:', finalUserId);
        
        // Save free plan subscription
        await subscriptionService.upsertSubscription({
          user_id: finalUserId,
          plan_tier: 'free',
          status: 'active',
          interval: 'yearly',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 365*24*60*60*1000).toISOString(), // 1 year
          amount: 0,
          currency: 'EUR'
        });
        
        console.log('✅ Free plan saved successfully');
      } catch (error) {
        console.error('❌ Error saving free plan:', error);
        alert('Error saving plan. Please try again.');
        return;
      }
      
      if (onPlanSelected) {
        onPlanSelected('free');
      }
      return;
    }

    // Ensure we have a user ID
    let finalUserId = authUserId || userId;
    
    // If still no user ID, try to get it from auth
    if (!finalUserId) {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.id) {
          finalUserId = authUser.id;
        }
      } catch (error) {
        console.error('Error getting user ID:', error);
      }
    }

    if (!finalUserId) {
      console.error('No user ID available for payment');
      alert('Please log in to continue with payment');
      return;
    }

    // For paid plans, show payment page inline
    setSelectedPlan(planTier);
    setShowPaymentPage(true);
  };

  const handleCountryConfirmed = (country: string) => {
    setUserCountry(country);
    setShowCountryModal(false);
    
    if (pendingPlan) {
      setSelectedPlan(pendingPlan);
      if (onPlanSelected) {
        onPlanSelected(pendingPlan);
      }
      setPendingPlan(null);
    }
  };

  const formatPrice = (plan: PlanDisplay) => {
    if (plan.tier === 'free') {
      return 'Free';
    }

    // Show EUR price (base price)
    if (plan.price_inr) {
      // If country-specific price exists, show both
      return `€${plan.price_eur}/month`;
    }
    
    return `€${plan.price_eur}/month`;
  };

  const getPaymentGateway = () => {
    if (!userCountry) return null;
    return selectPaymentGateway(userCountry);
  };

  // Show payment page if plan selected
  if (showPaymentPage && selectedPlan && (selectedPlan === 'basic' || selectedPlan === 'premium')) {
    return (
      <div>
        {onBack && (
          <Button
            variant="secondary"
            onClick={() => {
              setShowPaymentPage(false);
              setSelectedPlan(null);
              if (onBack) onBack();
            }}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Plans
          </Button>
        )}
        <PaymentPage
          planTier={selectedPlan}
          userId={authUserId || userId}
          onPaymentSuccess={() => {
            if (onPlanSelected) {
              onPlanSelected(selectedPlan);
            }
            setShowPaymentPage(false);
            setSelectedPlan(null);
          }}
          onBack={() => {
            setShowPaymentPage(false);
            setSelectedPlan(null);
          }}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with logout button */}
        <div className="mb-12">
          {onLogout && (
            <div className="flex justify-end mb-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="flex w-full items-center justify-center gap-2 text-slate-600 hover:text-slate-800 sm:w-auto"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          )}
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Select the perfect plan for your startup. All plans include core features with varying storage and premium capabilities.
            </p>
            <div className="mt-4 inline-block bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Required:</span> You must select a plan to continue
              </p>
            </div>
          </div>
        </div>

        {/* Current Plan Badge */}
        {currentPlan && currentPlan !== 'free' && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-2">
              <Check className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-800">
                Current Plan: {getPlanConfig(currentPlan).name}
              </span>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-12">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.tier;
            const isSelected = selectedPlan === plan.tier;

            return (
              <Card
                key={plan.tier}
                className={`relative overflow-hidden transition-all duration-300 ${
                  plan.isPopular
                    ? 'border-2 border-blue-500 shadow-xl scale-105'
                    : 'border border-slate-200 hover:shadow-lg'
                } ${
                  isCurrentPlan ? 'ring-2 ring-emerald-500' : ''
                } ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {/* Popular Badge */}
                {plan.isPopular && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 text-xs font-semibold rounded-bl-lg">
                    Most Popular
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute top-0 left-0 bg-emerald-500 text-white px-4 py-1 text-xs font-semibold rounded-br-lg">
                    Current Plan
                  </div>
                )}

                {/* Plan Header */}
                <div className={`bg-gradient-to-br ${plan.gradient} p-6 -m-6 mb-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg bg-white/50 ${plan.color === 'blue' ? 'text-blue-600' : plan.color === 'amber' ? 'text-amber-600' : 'text-slate-600'}`}>
                      {plan.icon}
                    </div>
                    {plan.tier === 'premium' && (
                      <Crown className="w-6 h-6 text-amber-500" />
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-slate-900">{formatPrice(plan)}</span>
                  </div>
                </div>

                {/* Storage */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-slate-600" />
                    <span className="text-sm font-semibold text-slate-700">Storage</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{formatStorage(plan.storage_mb)}</p>
                </div>

                {/* Features */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Included Features:</h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => {
                      const isLastFeature = index === plan.features.length - 1;
                      const isPremiumBoldFeature = plan.tier === 'premium' && isLastFeature && feature.includes('Part of Investments');
                      return (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className={`text-sm text-slate-700 ${isPremiumBoldFeature ? 'font-bold' : ''}`}>
                            {feature}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Restricted Features (for free plan) */}
                {plan.restrictedFeatures.length > 0 && (
                  <div className="mb-6 pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-500 mb-3">Not Included:</h4>
                    <ul className="space-y-2">
                      {plan.restrictedFeatures.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Lock className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-slate-500 line-through">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Button */}
                <div className="mt-6">
                  {isCurrentPlan ? (
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePlanSelect(plan.tier);
                      }}
                      variant="secondary"
                      className="w-full"
                      type="button"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Continue with Current Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePlanSelect(plan.tier);
                      }}
                      type="button"
                      className={`w-full ${
                        plan.isPopular
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : plan.tier === 'premium'
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : ''
                      }`}
                      variant={plan.tier === 'free' ? 'secondary' : 'primary'}
                    >
                      {plan.tier === 'free' ? (
                        'Continue with Free'
                      ) : (
                        <>
                          Select Plan
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Features Comparison */}
        <Card className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Feature Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Feature</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-700">Basic</th>
                  <th className="text-center py-3 px-4 font-semibold text-blue-600">Standard</th>
                  <th className="text-center py-3 px-4 font-semibold text-amber-600">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4 text-slate-700">Storage</td>
                  <td className="py-3 px-4 text-center">100 MB</td>
                  <td className="py-3 px-4 text-center">1 GB</td>
                  <td className="py-3 px-4 text-center">10 GB</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700">Financial Tracking</td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700">Compliance Management</td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700">ESOP and employee Management</td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700">Equity Allocation/Cap table Management</td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700">Auto-Generated Grant & Investment Utilization Report</td>
                  <td className="py-3 px-4 text-center"><Lock className="w-5 h-5 text-slate-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700">Portfolio Fundraising</td>
                  <td className="py-3 px-4 text-center"><Lock className="w-5 h-5 text-slate-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700">Grants Draft Assistant</td>
                  <td className="py-3 px-4 text-center"><Lock className="w-5 h-5 text-slate-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700">Grant CRM</td>
                  <td className="py-3 px-4 text-center"><Lock className="w-5 h-5 text-slate-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700">AI Investor Matching</td>
                  <td className="py-3 px-4 text-center"><Lock className="w-5 h-5 text-slate-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Lock className="w-5 h-5 text-slate-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700">Investor CRM</td>
                  <td className="py-3 px-4 text-center"><Lock className="w-5 h-5 text-slate-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Lock className="w-5 h-5 text-slate-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700">Fundraising Portfolio</td>
                  <td className="py-3 px-4 text-center"><Lock className="w-5 h-5 text-slate-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Lock className="w-5 h-5 text-slate-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700">Portfolio promotion to investors</td>
                  <td className="py-3 px-4 text-center"><Lock className="w-5 h-5 text-slate-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Lock className="w-5 h-5 text-slate-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700">Portfolio promotion through angel network</td>
                  <td className="py-3 px-4 text-center"><Lock className="w-5 h-5 text-slate-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Lock className="w-5 h-5 text-slate-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-700">Part of Investments by Track My Startup Program</td>
                  <td className="py-3 px-4 text-center"><Lock className="w-5 h-5 text-slate-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Lock className="w-5 h-5 text-slate-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-5 h-5 text-emerald-600 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Security Notice */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-slate-600">
            <Shield className="w-5 h-5" />
            <span className="text-sm">Secure payment processing. Your bank handles currency conversion.</span>
          </div>
        </div>

        {/* Back Button */}
        {onBack && (
          <div className="text-center mt-8">
            <Button variant="secondary" onClick={onBack}>
              Back
            </Button>
          </div>
        )}
      </div>

      {/* Country Confirmation Modal */}
      {showCountryModal && (
        <CountryConfirmationModal
          isOpen={showCountryModal}
          onClose={() => {
            setShowCountryModal(false);
            setPendingPlan(null);
          }}
          onConfirm={handleCountryConfirmed}
        />
      )}
    </div>
  );
}
