import React, { useState, useEffect } from 'react';
import { X, CheckCircle, RefreshCw } from 'lucide-react';
import { paymentService, SubscriptionPlan } from '../lib/paymentService';
import Button from './ui/Button';

interface PlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanSelected: (planId: string) => void;
  currentPlanId?: string;
  userType: string;
  country: string;
}

export default function PlanSelectionModal({
  isOpen,
  onClose,
  onPlanSelected,
  currentPlanId,
  userType,
  country
}: PlanSelectionModalProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPlans();
    }
  }, [isOpen, userType, country]);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const plansData = await paymentService.getSubscriptionPlans(userType, country);
      setPlans(plansData);
    } catch (error) {
      console.error('Error loading plans:', error);
      setError('Failed to load subscription plans');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
  };

  const handleConfirm = async () => {
    if (!selectedPlan) return;

    try {
      setIsLoading(true);
      setError(null);
      await onPlanSelected(selectedPlan.id);
      onClose();
    } catch (error) {
      console.error('Error updating plan:', error);
      setError('Failed to update subscription plan');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (amount: number) => {
    return `€${amount.toLocaleString('en-EU')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Update Subscription Plan</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {isLoading && !plans.length ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-600">
                Choose a new subscription plan. Your billing will be updated accordingly.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                      selectedPlan?.id === plan.id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : plan.id === currentPlanId
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                    onClick={() => handlePlanSelect(plan)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-slate-900">{plan.name}</h3>
                          {plan.id === currentPlanId && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              Current
                            </span>
                          )}
                          {plan.billing_interval === 'yearly' && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              Save 33%
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{plan.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-slate-900">
                          {formatPrice(plan.price)}/{plan.billing_interval === 'monthly' ? 'mo' : 'yr'}
                        </div>
                        <div className="text-sm text-slate-500">per startup</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
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
                    </div>
                    
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
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedPlan || isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Update Plan
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}


