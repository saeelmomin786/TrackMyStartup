import React, { useEffect, useState } from 'react';
import { CheckCircle, Sparkles, Crown, Zap, ArrowRight, Shield, Loader2 } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { supabase } from '../lib/supabase';
import { subscriptionService } from '../lib/subscriptionService';
import { featureAccessService } from '../lib/featureAccessService';

interface PaymentSuccessProps {
  planTier: 'basic' | 'premium';
  amount: number;
  currency: string;
  onContinue: () => void;
}

export default function PaymentSuccess({ planTier, amount, currency, onContinue }: PaymentSuccessProps) {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    loadSubscriptionAndFeatures();
  }, []);

  const loadSubscriptionAndFeatures = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Wait a bit for subscription to be created
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get subscription
      const sub = await subscriptionService.getUserSubscription(user.id);
      setSubscription(sub);

      // Get available features for the plan
      const availableFeatures = await featureAccessService.getAvailableFeatures(user.id);
      setFeatures(availableFeatures);

      setLoading(false);
    } catch (error) {
      console.error('Error loading subscription:', error);
      setLoading(false);
    }
  };

  const getPlanIcon = () => {
    switch (planTier) {
      case 'basic':
        return <Sparkles className="w-16 h-16 text-blue-600" />;
      case 'premium':
        return <Crown className="w-16 h-16 text-amber-600" />;
      default:
        return <Zap className="w-16 h-16 text-slate-600" />;
    }
  };

  const getPlanName = () => {
    switch (planTier) {
      case 'basic':
        return 'Basic Plan';
      case 'premium':
        return 'Premium Plan';
      default:
        return 'Free Plan';
    }
  };

  const getPlanColor = () => {
    switch (planTier) {
      case 'basic':
        return 'blue';
      case 'premium':
        return 'amber';
      default:
        return 'slate';
    }
  };

  const getPlanColorClass = () => {
    switch (planTier) {
      case 'basic':
        return 'bg-blue-50';
      case 'premium':
        return 'bg-amber-50';
      default:
        return 'bg-slate-50';
    }
  };

  const formatAmount = () => {
    if (currency === 'INR') {
      return `₹${amount.toLocaleString('en-IN')}`;
    }
    return `€${amount.toLocaleString('en-EU')}`;
  };

  const planFeatures = {
    basic: [
      'Dashboard Access',
      'Financial Tracking & Analytics',
      'Compliance Management',
      'Portfolio Fundraising',
      'Grants Draft + CRM',
      'AI Investor Matching',
      'CRM Access',
      '1 GB Storage'
    ],
    premium: [
      'Everything in Basic',
      'Active Fundraising',
      'Priority Support',
      'Advanced Analytics',
      'Custom Reports',
      '10 GB Storage',
      'Dedicated Account Manager'
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-emerald-100 rounded-full mb-6 animate-bounce">
            <CheckCircle className="w-16 h-16 text-emerald-600" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Payment Successful! 🎉
          </h1>
          <p className="text-xl text-slate-600">
            Your subscription has been activated
          </p>
        </div>

        {/* Payment Summary Card */}
        <Card className="mb-6 border-2 border-emerald-200 bg-white">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-lg ${getPlanColorClass()}`}>
                  {getPlanIcon()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{getPlanName()}</h2>
                  <p className="text-slate-600">Activated Successfully</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600 mb-1">Amount Paid</p>
                <p className="text-3xl font-bold text-emerald-600">{formatAmount()}</p>
              </div>
            </div>

            {subscription && (
              <div className="pt-6 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600 mb-1">Subscription Status</p>
                    <p className="font-semibold text-emerald-600 capitalize">{subscription.status || 'Active'}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 mb-1">Billing Cycle</p>
                    <p className="font-semibold text-slate-900">Monthly</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Features Unlocked Card */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-emerald-600" />
              <h3 className="text-xl font-bold text-slate-900">Features Unlocked</h3>
            </div>
            <p className="text-slate-600 mb-4">
              You now have access to all {getPlanName()} features:
            </p>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <ul className="space-y-3">
                {planFeatures[planTier].map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span className="text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Next Steps Card */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">What's Next?</h3>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Explore your dashboard and start using premium features</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Set up your startup profile and financial tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Access CRM tools and investor matching features</span>
              </li>
            </ul>
          </div>
        </Card>

        {/* Continue Button */}
        <div className="text-center">
          <Button
            onClick={onContinue}
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 text-lg"
          >
            Continue to Dashboard
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
