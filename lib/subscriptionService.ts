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
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      // First, get the subscription without join (to avoid 406 errors)
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user subscription:', error);
        return null;
      }

      if (!data) {
        // No subscription found - user is on free plan
        return null;
      }

      // If plan_tier is not in user_subscriptions, try to get it from subscription_plans
      if (!data.plan_tier && data.plan_id) {
        try {
          const plan = await this.getSubscriptionPlan(data.plan_id);
          if (plan) {
            data.plan_tier = plan.plan_tier;
          }
        } catch (planError) {
          console.warn('Could not fetch plan details:', planError);
          // Default to 'free' if we can't get plan tier
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
   * Create or update user subscription
   */
  async upsertSubscription(subscription: Partial<UserSubscription>): Promise<UserSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .upsert(subscription, {
          onConflict: 'user_id,plan_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error upserting subscription:', error);
        return null;
      }

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
