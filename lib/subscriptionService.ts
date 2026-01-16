import { supabase } from './supabase';

/**
 * Subscription Service
 * Handles all subscription-related database operations
 */

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id?: string;
  plan_tier: 'free' | 'basic' | 'premium';
  status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  interval: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  amount: number | null; // Amount in original currency
  currency: string | null; // Currency code (INR, USD, EUR, etc.)
  locked_amount_inr: number | null; // Amount in INR (for backward compatibility)
  country: string | null;
  payment_gateway: 'razorpay' | 'payaid' | null;
  autopay_enabled: boolean;
  razorpay_mandate_id: string | null;
  payaid_subscription_id: string | null;
  mandate_status: 'pending' | 'active' | 'paused' | 'cancelled' | null;
  mandate_created_at: string | null;
  next_billing_date: string | null;
  last_billing_date: string | null;
  billing_cycle_count: number;
  total_paid: number;
  previous_plan_tier: string | null;
  storage_used_mb: number | null;
  paid_by_advisor_id: string | null; // Advisor who paid for this subscription
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  plan_tier: 'free' | 'basic' | 'premium';
  storage_limit_mb: number;
  features: Record<string, any>;
}

export class SubscriptionService {
  /**
   * Get user's current active subscription
   * @param userId - Can be auth_user_id or profile_id (will handle both)
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      // ⚠️ CRITICAL: Handle both auth_user_id and profile_id inputs
      // Subscriptions are stored with user_id = profile_id (not auth_user_id)
      console.log('🔍 getUserSubscription: Received userId:', userId);
      
      // Step 1: Check if this userId is already a profile_id
      let profileIds: string[] = [];
      const { data: directProfile, error: directError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .limit(1)
        .maybeSingle();
      
      if (!directError && directProfile) {
        // userId is already a profile_id - use it directly
        profileIds = [directProfile.id];
        console.log('✅ userId is profile_id:', directProfile.id);
      } else {
        // Step 2: userId might be auth_user_id - get ALL profiles
        const { data: userProfiles, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('auth_user_id', userId)
          .order('created_at', { ascending: false });

        if (!profileError && userProfiles && userProfiles.length > 0) {
          profileIds = userProfiles.map(p => p.id);
          console.log('✅ Found', profileIds.length, 'profiles for auth_user_id, checking all for subscription');
        } else {
          console.warn('⚠️ Could not find any profiles for userId:', userId);
          return null;
        }
      }

      // Step 3: Check ALL profiles for an active subscription
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .in('user_id', profileIds)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user subscription:', error);
        return null;
      }

      if (!data) {
        // No subscription found on any profile - user is on free plan
        console.log('❌ No active subscription found for any profile');
        return null;
      }

      // Ensure plan_tier is set. If missing, try to resolve from plan_id, else default to 'free'.
      if (!data.plan_tier) {
        if (data.plan_id) {
          try {
            const plan = await this.getSubscriptionPlan(data.plan_id);
            if (plan) {
              data.plan_tier = plan.plan_tier;
            } else {
              data.plan_tier = 'free';
            }
          } catch (planError) {
            console.warn('Could not fetch plan details:', planError);
            data.plan_tier = 'free';
          }
        } else {
          data.plan_tier = 'free';
        }
      }

      return data as UserSubscription;
    } catch (error) {
      console.error('Error in getUserSubscription:', error);
      return null;
    }
  }

  /**
   * Get subscription plan details
   */
  async getSubscriptionPlan(planId: string): Promise<SubscriptionPlan | null> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) {
        console.error('Error fetching subscription plan:', error);
        return null;
      }

      return data as SubscriptionPlan;
    } catch (error) {
      console.error('Error in getSubscriptionPlan:', error);
      return null;
    }
  }

  /**
   * Get plan tier from plan ID
   */
  async getPlanTier(planId: string | null): Promise<'free' | 'basic' | 'premium'> {
    if (!planId) return 'free';

    try {
      const plan = await this.getSubscriptionPlan(planId);
      return plan?.plan_tier || 'free';
    } catch (error) {
      console.error('Error getting plan tier:', error);
      return 'free';
    }
  }

  /**
   * Create or update user subscription (with audit trail)
   * 
   * Flow (Option B - Audit Trail):
   * 1. Mark any existing ACTIVE subscription for this user as INACTIVE
   * 2. Insert new subscription with status='active'
   * 
   * This allows:
   * - One ACTIVE subscription per user (enforced by partial unique index)
   * - Full audit trail of past subscriptions (marked as inactive)
   * - Proper upgrade flow: Basic → Premium (old marked inactive, new inserted)
   */
  async upsertSubscription(subscription: Partial<UserSubscription>): Promise<UserSubscription | null> {
    try {
      const userId = subscription.user_id;
      if (!userId) {
        console.error('upsertSubscription: user_id is required');
        return null;
      }

      // STEP 1: Mark any existing ACTIVE subscription as INACTIVE (audit trail)
      console.log(`📝 Marking existing active subscriptions as inactive for user: ${userId}`);
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (updateError) {
        console.warn('Warning: Could not mark old subscription as inactive:', updateError);
        // Don't fail - continue anyway, might just be no existing subscription
      }

      // STEP 2: Insert new subscription with status='active'
      console.log(`✨ Inserting new subscription for user: ${userId} with plan: ${subscription.plan_tier}`);
      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          ...subscription,
          status: subscription.status || 'active',
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting new subscription:', error);
        return null;
      }

      console.log(`✅ Subscription created successfully:`, data);
      return data as UserSubscription;
    } catch (error) {
      console.error('Error in upsertSubscription:', error);
      return null;
    }
  }

  /**
   * Update subscription status
   */
  async updateSubscriptionStatus(
    subscriptionId: string,
    status: 'active' | 'inactive' | 'cancelled' | 'past_due'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (error) {
        console.error('Error updating subscription status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateSubscriptionStatus:', error);
      return false;
    }
  }

  /**
   * Update autopay settings
   */
  async updateAutopay(
    subscriptionId: string,
    autopayEnabled: boolean,
    mandateId?: string,
    mandateStatus?: 'pending' | 'active' | 'paused' | 'cancelled'
  ): Promise<boolean> {
    try {
      const updateData: any = {
        autopay_enabled: autopayEnabled,
        updated_at: new Date().toISOString()
      };

      if (mandateId !== undefined) {
        updateData.razorpay_mandate_id = mandateId;
      }

      if (mandateStatus !== undefined) {
        updateData.mandate_status = mandateStatus;
        updateData.mandate_created_at = mandateStatus === 'active' ? new Date().toISOString() : null;
      }

      const { error } = await supabase
        .from('user_subscriptions')
        .update(updateData)
        .eq('id', subscriptionId);

      if (error) {
        console.error('Error updating autopay:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateAutopay:', error);
      return false;
    }
  }

  /**
   * Check if user has an active advisor-paid subscription
   */
  async hasAdvisorPaidSubscription(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        return false;
      }

      // Check if subscription is advisor-paid and still active
      return (
        subscription.paid_by_advisor_id !== null &&
        subscription.status === 'active' &&
        new Date(subscription.current_period_end) > new Date()
      );
    } catch (error) {
      console.error('Error in hasAdvisorPaidSubscription:', error);
      return false;
    }
  }

  /**
   * Get advisor ID who paid for user's subscription
   */
  async getAdvisorIdForSubscription(userId: string): Promise<string | null> {
    try {
      const subscription = await this.getUserSubscription(userId);
      return subscription?.paid_by_advisor_id || null;
    } catch (error) {
      console.error('Error in getAdvisorIdForSubscription:', error);
      return null;
    }
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();
