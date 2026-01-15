import React, { useEffect, useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { Lock, ArrowRight, Sparkles } from 'lucide-react';
import { getPlanConfig } from '../lib/subscriptionPlanConfig';
import SubscriptionPlansPage from './SubscriptionPlansPage';

interface UpgradePromptProps {
  feature: string; // Feature name from plan_features table
  currentPlan?: 'free' | 'basic' | 'premium';
  userId?: string; // Used to load plans for the correct user
  onUpgradeClick?: () => void; // Optional callback for upgrade button
}

/**
 * UpgradePrompt Component
 * 
 * Displays a message when a user tries to access a locked feature.
 * Shows which plan is required and provides an upgrade button.
 */
const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  feature,
  currentPlan = 'free',
  userId,
  onUpgradeClick,
}) => {
  const [showPlans, setShowPlans] = useState(false);

  // Auto-open the subscription plans modal as soon as a locked feature is hit
  useEffect(() => {
    setShowPlans(true);
  }, []);

  // When user clicks "Upgrade" or "View Plans", show full subscription plans page
  if (showPlans) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-2 sm:p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">
              Choose a Plan to Unlock Premium Features
            </h2>
            <button
              onClick={() => setShowPlans(false)}
              className="text-slate-500 hover:text-slate-700 text-sm"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SubscriptionPlansPage
              userId={userId}
              onBack={() => setShowPlans(false)}
            />
          </div>
        </div>
      </div>
    );
  }

  // Map feature names to user-friendly display names
  const featureNames: Record<string, string> = {
    portfolio_fundraising: 'Portfolio Fundraising',
    grants_draft: 'Grants Draft Applications',
    grants_add_to_crm: 'Add Grants to CRM',
    investor_ai_matching: 'AI Investor Matching',
    investor_add_to_crm: 'Add Investors to CRM',
    crm_access: 'CRM Access',
    fundraising_active: 'Active Fundraising',
  };

  // Determine which plan unlocks this feature
  const getRequiredPlan = (featureName: string): 'basic' | 'premium' => {
    // Features that require Premium plan
    const premiumFeatures = ['fundraising_active', 'portfolio_fundraising'];
    
    if (premiumFeatures.includes(featureName)) {
      return 'premium';
    }
    
    // All other features require Basic plan
    return 'basic';
  };

  const featureName = featureNames[feature] || feature;
  const requiredPlan = getRequiredPlan(feature);
  const requiredPlanConfig = getPlanConfig(requiredPlan);
  const currentPlanConfig = getPlanConfig(currentPlan);

  const handleUpgradeClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      // Open inline subscription plans modal so user can buy a plan
      setShowPlans(true);
    }
  };

  return (
    <Card className="p-6 border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="flex items-start gap-4">
        <div className="bg-amber-100 p-3 rounded-full flex-shrink-0">
          <Lock className="h-6 w-6 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Premium Feature Locked
          </h3>
          <p className="text-amber-700 mb-2">
            <strong className="font-semibold">{featureName}</strong> is available in the{' '}
            <strong className="font-semibold text-amber-800">{requiredPlanConfig.name}</strong> plan.
          </p>
          {currentPlan !== 'premium' && (
            <p className="text-sm text-amber-600 mb-4">
              You're currently on the <strong>{currentPlanConfig.name}</strong>. 
              Upgrade to unlock this feature and more!
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button
              onClick={handleUpgradeClick}
              className="bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-2"
            >
              Upgrade to {requiredPlanConfig.name}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setShowPlans(true)}
              variant="secondary"
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              View Plans
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UpgradePrompt;
