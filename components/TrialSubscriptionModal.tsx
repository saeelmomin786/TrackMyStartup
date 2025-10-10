import React, { useState, useEffect } from 'react';
// Payment service removed
type SubscriptionPlan = { id: string; name: string; description: string; billing_interval: 'monthly'|'yearly'; price: number };

interface TrialSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionSuccess: () => void;
  userId: string;
  startupName: string;
}

const TrialSubscriptionModal: React.FC<TrialSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSubscriptionSuccess,
  userId,
  startupName
}) => {
  console.log('🔍 TrialSubscriptionModal rendered - isOpen:', isOpen, 'userId:', userId, 'startupName:', startupName);
  
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPlans();
    }
  }, [isOpen]);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      setPlans([]);
      
      if (plansData && plansData.length > 0) {
        setSelectedPlan(plansData[0]); // Select first plan by default
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      setError('Failed to load subscription plans. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTrial = async () => {
    if (!selectedPlan) {
      setError('Please select a subscription plan');
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Payment flow removed; directly mark trial success
    handleTrialSuccess();
  };

  const handleTrialSuccess = () => {
    setIsProcessing(false);
    onSubscriptionSuccess();
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatPriceWithGST = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')} + GST`;
  };

  if (!isOpen) {
    console.log('🔍 TrialSubscriptionModal: Modal is closed, returning null');
    return null;
  }
  
  console.log('🔍 TrialSubscriptionModal: Modal is open, rendering modal');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Start Your 7-Day Free Trial
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Get full access to Track My Startup features for <strong>{startupName}</strong> with our 7-day free trial. 
              No charges during the trial period.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-blue-800 font-medium">
                  Trial includes all premium features
                </span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose your subscription plan:
                </label>
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedPlan?.id === plan.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{plan.name}</h3>
                          <p className="text-sm text-gray-600">{plan.description}</p>
                          {plan.billing_interval === 'yearly' && (
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Save 2 months free!
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {formatPriceWithGST(plan.price)}
                          </div>
                          <div className="text-sm text-gray-500">
                            per {plan.billing_interval}
                          </div>
                          {plan.billing_interval === 'yearly' && (
                            <div className="text-xs text-green-600 font-medium">
                              Best value
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm text-yellow-800 font-medium">
                      After 7 days, you'll be automatically charged
                    </p>
                    <p className="text-sm text-yellow-700">
                      You can cancel anytime during the trial period.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartTrial}
                  disabled={!selectedPlan || isProcessing}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Starting Trial...
                    </div>
                  ) : (
                    'Start 7-Day Free Trial'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrialSubscriptionModal;
