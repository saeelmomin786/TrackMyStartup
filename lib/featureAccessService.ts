import { supabase } from './supabase';

/**
 * Feature Access Service
 * Checks if a user has access to specific features based on their subscription plan
 */

export class FeatureAccessService {
  /**
   * Check if user can access a specific feature
   * @param userId - User ID
   * @param featureName - Feature name to check
   * @returns True if user has access, false otherwise
   */
  async canAccessFeature(userId: string, featureName: string): Promise<boolean> {
    try {
      // Use database function for efficient check
      const { data, error } = await supabase.rpc('can_user_access_feature', {
        p_user_id: userId,
        p_feature_name: featureName
      });

      if (error) {
        // Suppress PGRST202 (function not found) errors - use fallback silently
        if (error.code === 'PGRST202') {
          // Function doesn't exist yet, use fallback
          return await this.canAccessFeatureFallback(userId, featureName);
        }
        // For other errors, log but still use fallback
        console.warn('Error checking feature access (using fallback):', error.message);
        return await this.canAccessFeatureFallback(userId, featureName);
      }

      return data ?? false;
    } catch (error) {
      console.warn('Error in canAccessFeature (using fallback):', error);
      return await this.canAccessFeatureFallback(userId, featureName);
    }
  }

  /**
   * Fallback method to check feature access manually
   * Now checks period end to ensure subscription is still valid
   */
  private async canAccessFeatureFallback(userId: string, featureName: string): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      
      // Convert auth_user_id to profile_ids (same as subscriptionService)
      let profileIds: string[] = [];
      const { data: directProfile, error: directError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .limit(1)
        .maybeSingle();
      
      if (!directError && directProfile) {
        profileIds = [directProfile.id];
      } else {
        const { data: userProfiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('auth_user_id', userId);

        if (!profileError && userProfiles && userProfiles.length > 0) {
          profileIds = userProfiles.map(p => p.id);
        } else {
          // No profiles found, user is on free plan
          const planTier = 'free';
          return await this.checkFeatureForTier(planTier, featureName);
        }
      }
      
      // Get user's active subscription with period check
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('plan_id, status, current_period_end, grace_period_ends_at')
        .in('user_id', profileIds)
        .in('status', ['active', 'past_due'])
        .order('current_period_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError || !subscription || !subscription.plan_id) {
        // No active subscription = free plan
        const planTier = 'free';
        return await this.checkFeatureForTier(planTier, featureName);
      }

      // Check if subscription period has ended
      const periodEnd = new Date(subscription.current_period_end);
      const isPeriodExpired = periodEnd < new Date(now);

      // If period expired and not in grace period, no access
      if (isPeriodExpired) {
        // Check if in grace period (for past_due status)
        if (subscription.status === 'past_due' && subscription.grace_period_ends_at) {
          const graceEnd = new Date(subscription.grace_period_ends_at);
          if (graceEnd < new Date(now)) {
            // Grace period expired, no access
            return false;
          }
          // Still in grace period, continue to check features
        } else {
          // Period expired and no grace period, no access
          return false;
        }
      }

      // Get plan tier from subscription_plans table
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('plan_tier')
        .eq('id', subscription.plan_id)
        .single();

      const planTier = plan?.plan_tier || 'free';
      return await this.checkFeatureForTier(planTier, featureName);
    } catch (error) {
      console.error('Error in fallback feature check:', error);
      return false;
    }
  }

  /**
   * Check if a feature is enabled for a plan tier
   */
  private async checkFeatureForTier(planTier: string, featureName: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('plan_features')
      .select('is_enabled')
      .eq('plan_tier', planTier)
      .eq('feature_name', featureName)
      .single();

    if (error || !data) {
      return false;
    }

    return data.is_enabled ?? false;
  }

  /**
   * Get user's current plan tier
   * @param userId - User ID
   * @returns Plan tier ('free', 'basic', 'premium')
   */
  async getUserPlanTier(userId: string): Promise<'free' | 'basic' | 'premium'> {
    try {
      const { data, error } = await supabase.rpc('get_user_plan_tier', {
        p_user_id: userId
      });

      if (error) {
        // Suppress PGRST202 (function not found) errors - use fallback silently
        if (error.code === 'PGRST202') {
          // Function doesn't exist yet, use fallback
          return await this.getUserPlanTierFallback(userId);
        }
        // For other errors, log but still use fallback
        console.warn('Error getting plan tier (using fallback):', error.message);
        return await this.getUserPlanTierFallback(userId);
      }

      return (data as 'free' | 'basic' | 'premium') || 'free';
    } catch (error) {
      console.warn('Error in getUserPlanTier (using fallback):', error);
      return await this.getUserPlanTierFallback(userId);
    }
  }

  /**
   * Fallback method to get user's plan tier manually
   * Now checks period end to ensure subscription is still valid
   */
  private async getUserPlanTierFallback(userId: string): Promise<'free' | 'basic' | 'premium'> {
    try {
      const now = new Date().toISOString();
      
      // Convert auth_user_id to profile_ids (same as subscriptionService)
      let profileIds: string[] = [];
      const { data: directProfile, error: directError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .limit(1)
        .maybeSingle();
      
      if (!directError && directProfile) {
        profileIds = [directProfile.id];
      } else {
        const { data: userProfiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('auth_user_id', userId);

        if (!profileError && userProfiles && userProfiles.length > 0) {
          profileIds = userProfiles.map(p => p.id);
        } else {
          // No profiles found, user is on free plan
          return 'free';
        }
      }
      
      // Get user's active subscription with period check
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('plan_id, status, current_period_end, grace_period_ends_at')
        .in('user_id', profileIds)
        .in('status', ['active', 'past_due'])
        .order('current_period_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError || !subscription || !subscription.plan_id) {
        // No active subscription = free plan
        return 'free';
      }

      // Check if subscription period has ended
      const periodEnd = new Date(subscription.current_period_end);
      const isPeriodExpired = periodEnd < new Date(now);

      // If period expired and not in grace period, return free
      if (isPeriodExpired) {
        // Check if in grace period (for past_due status)
        if (subscription.status === 'past_due' && subscription.grace_period_ends_at) {
          const graceEnd = new Date(subscription.grace_period_ends_at);
          if (graceEnd < new Date(now)) {
            // Grace period expired, return free
            return 'free';
          }
          // Still in grace period, continue to get plan tier
        } else {
          // Period expired and no grace period, return free
          return 'free';
        }
      }

      // Get plan tier from subscription_plans table
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('plan_tier')
        .eq('id', subscription.plan_id)
        .single();

      if (planError || !plan) {
        return 'free';
      }

      return (plan.plan_tier as 'free' | 'basic' | 'premium') || 'free';
    } catch (error) {
      console.error('Error in getUserPlanTierFallback:', error);
      return 'free';
    }
  }

  /**
   * Get user's subscription details
   * @param userId - User ID (can be auth_user_id or profile_id)
   * @returns Subscription details or null
   */
  async getUserSubscription(userId: string): Promise<any | null> {
    try {
      const now = new Date().toISOString();
      
      // Convert auth_user_id to profile_ids (same as subscriptionService)
      let profileIds: string[] = [];
      const { data: directProfile, error: directError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .limit(1)
        .maybeSingle();
      
      if (!directError && directProfile) {
        profileIds = [directProfile.id];
      } else {
        const { data: userProfiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('auth_user_id', userId);

        if (!profileError && userProfiles && userProfiles.length > 0) {
          profileIds = userProfiles.map(p => p.id);
        } else {
          // No profiles found
          return null;
        }
      }
      
      // Get subscription with period end check
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (
            id,
            name,
            price,
            currency,
            interval,
            plan_tier,
            storage_limit_mb,
            features
          )
        `)
        .in('user_id', profileIds)
        .in('status', ['active', 'past_due'])
        .gt('current_period_end', now) // Period not expired
        .order('current_period_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          // No subscription found = free plan
          return null;
        }
        console.error('Error getting subscription:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserSubscription:', error);
      return null;
    }
  }

  /**
   * Check multiple features at once
   * @param userId - User ID
   * @param featureNames - Array of feature names
   * @returns Object with feature names as keys and access boolean as values
   */
  async checkMultipleFeatures(
    userId: string,
    featureNames: string[]
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    // Check all features in parallel
    const promises = featureNames.map(async (featureName) => {
      const hasAccess = await this.canAccessFeature(userId, featureName);
      return { featureName, hasAccess };
    });

    const resolved = await Promise.all(promises);
    
    resolved.forEach(({ featureName, hasAccess }) => {
      results[featureName] = hasAccess;
    });

    return results;
  }

  /**
   * Get all available features for user's plan
   * @param userId - User ID
   * @returns Array of enabled feature names
   */
  async getAvailableFeatures(userId: string): Promise<string[]> {
    try {
      const planTier = await this.getUserPlanTier(userId);
      
      const { data, error } = await supabase
        .from('plan_features')
        .select('feature_name')
        .eq('plan_tier', planTier)
        .eq('is_enabled', true);

      if (error) {
        console.error('Error getting available features:', error);
        return [];
      }

      return data?.map(f => f.feature_name) || [];
    } catch (error) {
      console.error('Error in getAvailableFeatures:', error);
      return [];
    }
  }
}

// Export singleton instance
export const featureAccessService = new FeatureAccessService();
