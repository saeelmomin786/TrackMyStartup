import { supabase } from './supabase';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing_interval: 'monthly' | 'yearly';
  description: string;
  user_type: string;
  country: string;
  is_active: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  current_period_start: string;
  current_period_end: string;
  startup_count: number;
  amount: number;
  billing_interval: string;
  is_in_trial?: boolean;
  trial_start?: string;
  trial_end?: string;
  razorpay_subscription_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  client_secret: string;
}

export interface DiscountCoupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number;
  used_count: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface DueDiligenceRequest {
  id: string;
  user_id: string;
  startup_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'completed' | 'failed';
  payment_intent_id?: string;
  created_at: string;
  completed_at?: string;
}

export interface SubscriptionSummary {
  totalDue: number;
  totalSubscriptions: number;
  activeSubscriptions: UserSubscription[];
  upcomingPayments: Array<{
    plan: SubscriptionPlan;
    amount: number;
    dueDate: string;
  }>;
}

class PaymentService {
  // Get subscription plans for a specific user type and country
  async getSubscriptionPlans(userType: string, country: string): Promise<SubscriptionPlan[]> {
    try {
      // For startup users, only show Indian plans
      if (userType === 'Startup') {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('user_type', userType)
          .eq('country', 'India')
          .eq('is_active', true)
          .order('price', { ascending: true });

        if (error) throw error;
        return data || [];
      }

      // For other user types, use the original logic
      let { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('user_type', userType)
        .eq('country', country)
        .eq('is_active', true)
        .order('price', { ascending: true });

      // If no country-specific plans found, fall back to Global plans
      if (!data || data.length === 0) {
        const { data: globalData, error: globalError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('user_type', userType)
          .eq('country', 'Global')
          .eq('is_active', true)
          .order('price', { ascending: true });
        
        if (globalError) throw globalError;
        data = globalData;
      }

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      throw error;
    }
  }

  async setRazorpaySubscription(userId: string, subscriptionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ 
          razorpay_subscription_id: subscriptionId,
          is_in_trial: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active');
      if (error) throw error;
    } catch (error) {
      console.error('Error linking Razorpay subscription id:', error);
      throw error;
    }
  }

  // Get user's current subscription
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (price, billing_interval)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data && data.subscription_plans) {
        // Calculate amount and add billing_interval from plan
        data.amount = data.subscription_plans.price * data.startup_count;
        data.billing_interval = data.subscription_plans.billing_interval;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      throw error;
    }
  }

  // Create payment intent
  async createPaymentIntent(amount: number, currency: string, userId: string, planId: string): Promise<PaymentIntent> {
    try {
      const response = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          currency: currency.toLowerCase(),
          userId,
          planId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  // Confirm payment and create subscription
  async confirmPayment(paymentIntentId: string, userId: string, planId: string, startupCount: number): Promise<UserSubscription> {
    try {
      // First get the plan to calculate amount
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('price, billing_interval')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      const amount = plan.price * startupCount;
      const billing_interval = plan.billing_interval;

      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_id: planId,
          status: 'active',
          startup_count: startupCount,
          amount: amount,
          billing_interval: billing_interval,
          // legacy column compatibility
          interval: billing_interval,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + (billing_interval === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }

  // Start a 5-minute trial (no immediate charge beyond ₹1 verification handled elsewhere)
  async startTrial(userId: string, planId: string, startupCount: number): Promise<UserSubscription> {
    try {
      const trialStart = new Date();
      const trialEnd = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Fetch plan to set billing_interval and compute notional amount (0 during trial)
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('price, billing_interval')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      const billing_interval = plan.billing_interval;

      const { data, error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          plan_id: planId,
          status: 'active',
          startup_count: startupCount,
          amount: 0,
          billing_interval,
          // legacy column compatibility
          interval: billing_interval,
          is_in_trial: true,
          trial_start: trialStart.toISOString(),
          trial_end: trialEnd.toISOString(),
          current_period_start: trialStart.toISOString(),
          current_period_end: trialEnd.toISOString()
        }, { onConflict: 'user_id,plan_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error starting trial:', error);
      throw error;
    }
  }

  // Create Razorpay trial subscription for startup role
  async createTrialSubscription(userId: string, planType: 'monthly' | 'yearly', startupCount: number = 1): Promise<any> {
    try {
      // HARD-SET single API endpoint for local testing
      const API_BASE = 'http://localhost:3001';
      const url = `${API_BASE}/api/razorpay/create-trial-subscription`;
      console.log('🔍 Trying trial subscription endpoint:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, plan_type: planType, startup_count: startupCount }),
      });

      if (!response.ok) {
        throw new Error('Failed to create trial subscription');
      }

      const subscription = await response.json();
      
      // Store the subscription in our database
      await this.storeTrialSubscription(userId, planType, subscription.id, startupCount);
      
      return subscription;
    } catch (error) {
      console.error('Error creating trial subscription:', error);
      throw error;
    }
  }

  // Store trial subscription in database
  async storeTrialSubscription(userId: string, planType: 'monthly' | 'yearly', razorpaySubscriptionId: string, startupCount: number): Promise<UserSubscription> {
    try {
      const trialStart = new Date();
      const trialEnd = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Find the appropriate plan based on type
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('id, price, billing_interval')
        .eq('user_type', 'Startup')
        .eq('billing_interval', planType === 'yearly' ? 'yearly' : 'monthly')
        .eq('is_active', true)
        .single();

      if (planError) throw planError;

      const { data, error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          plan_id: plan.id,
          status: 'active',
          startup_count: startupCount,
          amount: 0, // No charge during trial
          billing_interval: plan.billing_interval,
          // legacy column compatibility
          interval: plan.billing_interval,
          is_in_trial: true,
          trial_start: trialStart.toISOString(),
          trial_end: trialEnd.toISOString(),
          razorpay_subscription_id: razorpaySubscriptionId,
          current_period_start: trialStart.toISOString(),
          current_period_end: trialEnd.toISOString()
        }, { onConflict: 'user_id,plan_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error storing trial subscription:', error);
      throw error;
    }
  }

  // Check if user is in trial period
  async isUserInTrial(userId: string): Promise<boolean> {
    try {
      // Short-circuit in development to avoid Supabase 406 loops
      try {
        const dev = (typeof import.meta !== 'undefined') && (import.meta as any).env && (import.meta as any).env.DEV;
        if (dev) {
          return false;
        }
      } catch {}

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('is_in_trial, trial_end')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) return false;

      // Check if trial is still active
      if (data.is_in_trial && data.trial_end) {
        const trialEndDate = new Date(data.trial_end);
        const now = new Date();
        return now < trialEndDate;
      }

      return false;
    } catch (error) {
      console.error('Error checking trial status:', error);
      return false;
    }
  }

  // Get trial subscription details
  async getTrialSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      // Short-circuit in development to avoid Supabase 406 loops
      try {
        const dev = (typeof import.meta !== 'undefined') && (import.meta as any).env && (import.meta as any).env.DEV;
        if (dev) {
          return null;
        }
      } catch {}

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (price, billing_interval, name)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .eq('is_in_trial', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching trial subscription:', error);
      return null;
    }
  }

  // End trial and convert to paid subscription
  async endTrial(userId: string): Promise<UserSubscription> {
    try {
      // Get current trial subscription
      const trialSub = await this.getTrialSubscription(userId);
      if (!trialSub) {
        throw new Error('No active trial subscription found');
      }

      // Calculate the actual amount based on plan price and startup count
      const planPrice = (trialSub as any).subscription_plans?.price || 0;
      const amount = planPrice * trialSub.startup_count;

      // Update subscription to end trial
      const { data, error } = await supabase
        .from('user_subscriptions')
        .update({
          is_in_trial: false,
          amount: amount,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + (trialSub.billing_interval === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', trialSub.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error ending trial:', error);
      throw error;
    }
  }

  // Update subscription startup count
  async updateSubscriptionStartupCount(userId: string, newCount: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ 
          startup_count: newCount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;
    } catch (error) {
      console.error('Error updating subscription startup count:', error);
      throw error;
    }
  }

  // Validate discount coupon
  async validateDiscountCoupon(code: string): Promise<DiscountCoupon | null> {
    try {
      const { data, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) return null;

      // Check if coupon is still valid
      const now = new Date();
      const validFrom = new Date(data.valid_from);
      const validUntil = new Date(data.valid_until);

      if (now < validFrom || now > validUntil) {
        return null;
      }

      // Check if max uses exceeded
      if (data.used_count >= data.max_uses) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error validating discount coupon:', error);
      throw error;
    }
  }

  // Apply discount coupon
  async applyDiscountCoupon(code: string, userId: string): Promise<{ coupon: DiscountCoupon; discountAmount: number }> {
    try {
      const coupon = await this.validateDiscountCoupon(code);
      if (!coupon) {
        throw new Error('Invalid or expired coupon');
      }

      // Increment used count
      const { error } = await supabase
        .from('discount_coupons')
        .update({ used_count: coupon.used_count + 1 })
        .eq('id', coupon.id);

      if (error) throw error;

      return {
        coupon,
        discountAmount: coupon.discount_value
      };
    } catch (error) {
      console.error('Error applying discount coupon:', error);
      throw error;
    }
  }

  // Calculate scouting fee for Investment Advisors
  calculateScoutingFee(
    advisoryFee: number,
    investorInNetwork: boolean,
    startupInNetwork: boolean
  ): number {
    // Scenario 1: Both in network - 0% fee
    if (investorInNetwork && startupInNetwork) {
      return 0;
    }
    
    // Scenario 2: Only investor in network - 30% from investor
    if (investorInNetwork && !startupInNetwork) {
      return advisoryFee * 0.3;
    }
    
    // Scenario 3: Only startup in network - 30% from startup
    if (!investorInNetwork && startupInNetwork) {
      return advisoryFee * 0.3;
    }
    
    // Neither in network - full fee (no scouting fee)
    return advisoryFee;
  }

  // Record scouting fee payment
  async recordScoutingFee(
    advisorId: string,
    amount: number,
    investorId: string,
    startupId: string,
    advisoryFee: number
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('scouting_fees')
        .insert({
          advisor_id: advisorId,
          amount: amount,
          investor_id: investorId,
          startup_id: startupId,
          advisory_fee: advisoryFee,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error recording scouting fee:', error);
      throw error;
    }
  }

  // Get subscription summary for user
  async getSubscriptionSummary(userId: string): Promise<SubscriptionSummary> {
    try {
      const { data: subscriptions, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;

      const activeSubscriptions = subscriptions || [];
      let totalDue = 0;
      const upcomingPayments: Array<{
        plan: SubscriptionPlan;
        amount: number;
        dueDate: string;
      }> = [];

      for (const subscription of activeSubscriptions) {
        const plan = subscription.subscription_plans;
        const amount = plan.price * subscription.startup_count;
        totalDue += amount;
        
        upcomingPayments.push({
          plan,
          amount,
          dueDate: subscription.current_period_end
        });
      }

      return {
        totalDue,
        totalSubscriptions: activeSubscriptions.length,
        activeSubscriptions,
        upcomingPayments
      };
    } catch (error) {
      console.error('Error getting subscription summary:', error);
      throw error;
    }
  }

  // Create due diligence request
  async createDueDiligenceRequest(userId: string, startupId: string): Promise<DueDiligenceRequest> {
    try {
      const dueDiligenceAmount = 150; // €150 per startup
      
      const { data, error } = await supabase
        .from('due_diligence_requests')
        .insert({
          user_id: userId,
          startup_id: startupId,
          amount: dueDiligenceAmount,
          currency: 'EUR',
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating due diligence request:', error);
      throw error;
    }
  }

  // Process due diligence payment
  async processDueDiligencePayment(requestId: string, paymentIntentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('due_diligence_requests')
        .update({
          status: 'paid',
          payment_intent_id: paymentIntentId,
          completed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;
    } catch (error) {
      console.error('Error processing due diligence payment:', error);
      throw error;
    }
  }

  // Get due diligence requests for user
  async getUserDueDiligenceRequests(userId: string): Promise<DueDiligenceRequest[]> {
    try {
      const { data, error } = await supabase
        .from('due_diligence_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting due diligence requests:', error);
      throw error;
    }
  }

  // Update subscription plan
  async updateSubscriptionPlan(userId: string, newPlanId: string): Promise<UserSubscription> {
    try {
      // Get the new plan details
      const { data: newPlan, error: planError } = await supabase
        .from('subscription_plans')
        .select('price, billing_interval')
        .eq('id', newPlanId)
        .single();

      if (planError) throw planError;

      // Get current subscription
      const currentSub = await this.getUserSubscription(userId);
      if (!currentSub) {
        throw new Error('No active subscription found');
      }

      // Calculate new amount based on new plan and current startup count
      const newAmount = newPlan.price * currentSub.startup_count;

      // Update subscription
      const { data, error } = await supabase
        .from('user_subscriptions')
        .update({
          plan_id: newPlanId,
          amount: newAmount,
          billing_interval: newPlan.billing_interval,
          interval: newPlan.billing_interval,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSub.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating subscription plan:', error);
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  // Generate invoice for subscription
  async generateInvoice(userId: string): Promise<{ invoiceData: any; downloadUrl: string }> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // Get plan details
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('name, price, currency')
        .eq('id', subscription.plan_id)
        .single();

      if (planError) throw planError;

      // Generate invoice data
      const invoiceData = {
        invoiceId: `INV-${Date.now()}`,
        date: new Date().toISOString(),
        subscriptionId: subscription.id,
        planName: plan.name,
        amount: subscription.amount,
        currency: plan.currency,
        billingPeriod: {
          start: subscription.current_period_start,
          end: subscription.current_period_end
        },
        startupCount: subscription.startup_count
      };

      // In a real implementation, you would generate a PDF here
      // For now, we'll return a mock download URL
      const downloadUrl = `/api/invoice/download/${subscription.id}`;

      return { invoiceData, downloadUrl };
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw error;
    }
  }

  // Get billing information
  async getBillingInfo(userId: string): Promise<any> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // Get plan details
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('name, price, currency, billing_interval')
        .eq('id', subscription.plan_id)
        .single();

      if (planError) throw planError;

      return {
        subscription,
        plan,
        nextBillingDate: subscription.current_period_end,
        amount: subscription.amount,
        currency: plan.currency,
        interval: plan.billing_interval
      };
    } catch (error) {
      console.error('Error getting billing info:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
