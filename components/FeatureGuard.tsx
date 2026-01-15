import React, { useEffect, useState } from 'react';
import { featureAccessService } from '../lib/featureAccessService';
import UpgradePrompt from './UpgradePrompt';

interface FeatureGuardProps {
  feature: string; // Feature name from plan_features table
  userId: string; // User ID (auth_user_id UUID)
  children: React.ReactNode;
  fallback?: React.ReactNode; // Optional custom fallback UI
  showUpgradePrompt?: boolean; // Whether to show upgrade prompt (default: true)
}

/**
 * FeatureGuard Component
 * 
 * Wraps features that require a subscription plan.
 * Shows upgrade prompt if user doesn't have access.
 * 
 * Feature names (from plan_features table):
 * - portfolio_fundraising
 * - grants_draft
 * - grants_add_to_crm
 * - investor_ai_matching
 * - investor_add_to_crm
 * - crm_access
 * - fundraising_active
 */
const FeatureGuard: React.FC<FeatureGuardProps> = ({
  feature,
  userId,
  children,
  fallback,
  showUpgradePrompt = true,
}) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null); // null = loading
  const [planTier, setPlanTier] = useState<'free' | 'basic' | 'premium'>('free');

  useEffect(() => {
    const checkAccess = async () => {
      if (!userId) {
        setHasAccess(false);
        return;
      }

      try {
        // Get user's plan tier
        const tier = await featureAccessService.getUserPlanTier(userId);
        setPlanTier(tier);

        // Check feature access
        const access = await featureAccessService.canAccessFeature(userId, feature);
        setHasAccess(access);
      } catch (error) {
        console.error('Error checking feature access:', error);
        // On error, default to no access (safer)
        setHasAccess(false);
      }
    };

    checkAccess();
  }, [userId, feature]);

  // Show loading state (optional - you can customize this)
  if (hasAccess === null) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  // User has access - show the feature
  if (hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access - show fallback or upgrade prompt
  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt) {
    return <UpgradePrompt feature={feature} currentPlan={planTier} userId={userId} />;
  }

  // No access and no fallback - return nothing
  return null;
};

export default FeatureGuard;
