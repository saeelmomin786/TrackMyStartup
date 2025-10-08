import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, Shield, Zap } from 'lucide-react';
import { TrialService, SubscriptionStatus } from '../lib/trialService';
import { paymentService } from '../lib/paymentService';

interface SubscriptionPageProps {
  userId: string;
  onSubscriptionSuccess: () => void;
  onBack?: () => void;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing_interval: string;
  description: string;
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({
  userId,
  onSubscriptionSuccess,
  onBack
}) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const plansData = await TrialService.getSubscriptionPlans();
      setPlans(plansData);
      
      if (plansData.length > 0) {
        setSelectedPlan(plansData[0]); // Select first plan by default
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      setError('Failed to load subscription plans');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      setError('Please select a subscription plan');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('🔍 Starting subscription for plan:', selectedPlan);
      
      // Create Razorpay subscription
      const subscription = await paymentService.createTrialSubscription(
        userId,
        selectedPlan.billing_interval as 'monthly' | 'yearly',
        1
      );

      console.log('✅ Subscription created:', subscription);
      onSubscriptionSuccess();
    } catch (error) {
      console.error('Error creating subscription:', error);
      setError('Failed to create subscription. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatPriceWithGST = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')} + GST`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Subscription Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your 5-minute free trial has ended. Continue with full access by choosing a subscription plan.
          </p>
        </div>

        {/* Trial Ended Alert */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <div className="flex items-center">
            <Clock className="h-6 w-6 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">Free Trial Ended</h3>
              <p className="text-yellow-700">
                Your 5-minute free trial has expired. Subscribe now to continue accessing your dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-lg shadow-lg border-2 transition-all duration-200 cursor-pointer ${
                selectedPlan?.id === plan.id
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedPlan(plan)}
            >
              {plan.billing_interval === 'yearly' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Best Value - Save 2 Months!
                  </span>
                </div>
              )}
              
              <div className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {formatPriceWithGST(plan.price)}
                  </div>
                  <p className="text-gray-600">
                    per {plan.billing_interval}
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Full dashboard access</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-gray-700">All premium features</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Priority support</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Regular updates</span>
                  </div>
                </div>

                {selectedPlan?.id === plan.id && (
                  <div className="absolute top-4 right-4">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-red-600 mr-3" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back to Login
            </button>
          )}
          
          <button
            onClick={handleSubscribe}
            disabled={!selectedPlan || isProcessing}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5 mr-2" />
                Subscribe Now
              </>
            )}
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            🔒 Secure payment processing powered by Razorpay
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;
