import { supabase } from './supabase';

// Razorpay configuration (only public key on client)
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

// Types
export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface PaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
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
  amount: number;
  interval: 'monthly' | 'yearly';
  is_in_trial: boolean;
  trial_start?: string;
  trial_end?: string;
}

class PaymentService {
  // Centralized payment success callback
  private paymentSuccessCallback?: () => void;

  // Set payment success callback
  setPaymentSuccessCallback(callback: () => void) {
    this.paymentSuccessCallback = callback;
  }

  // Trigger payment success callback
  private triggerPaymentSuccess() {
    if (this.paymentSuccessCallback) {
      console.log('🎉 CENTRALIZED PAYMENT SUCCESS: Triggering callback');
      console.log('🎉 This will unlock the dashboard for the user');
      this.paymentSuccessCallback();
    } else {
      console.log('⚠️ No payment success callback set - payment completed but no dashboard unlock');
    }
  }

  // Load Razorpay script dynamically
  private loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  // Create Razorpay order
  async createOrder(plan: SubscriptionPlan, userId: string, finalAmount?: number): Promise<PaymentOrder> {
    try {
      const amount = finalAmount || plan.price;
      const response = await fetch(`/api/razorpay/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to smallest currency unit
          currency: plan.currency,
          receipt: `order_${Date.now()}`, // Shorter receipt to meet Razorpay's 40 char limit
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const order = await response.json();
      return order;
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw error;
    }
  }

  // Create Razorpay subscription for autopay (dynamic plan based on UI total)
  async createSubscription(plan: SubscriptionPlan, userId: string): Promise<PaymentOrder> {
    try {
      // Compute recurring amount (price + tax)
      const taxPercentage = (plan as any).tax_percentage || 0;
      const taxAmount = taxPercentage > 0 ? this.calculateTaxAmount(plan.price, taxPercentage) : 0;
      const finalAmount = plan.price + taxAmount;

      const response = await fetch(`/api/razorpay/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          final_amount: finalAmount,
          interval: plan.interval,
          plan_name: plan.name,
          customer_notify: 1,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }

      const subscription = await response.json();

      if (subscription?.id) {
        this.attachRazorpaySubscriptionId(userId, subscription.id).catch(error => {
          console.error('Error attaching Razorpay subscription ID to user record:', error);
        });
      }

      return subscription;
    } catch (error) {
      console.error('Error creating Razorpay subscription:', error);
      throw error;
    }
  }

  // Create trial subscription with payment method setup (dynamic plan based on UI total)
  async createTrialSubscription(plan: SubscriptionPlan, userId: string, currentUser?: any): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        // Load Razorpay script
        const scriptLoaded = await this.loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error('Failed to load Razorpay script');
        }
        // Compute recurring amount (price + tax) for post-trial charges
        const taxPercentage = (plan as any).tax_percentage || 0;
        const taxAmount = taxPercentage > 0 ? this.calculateTaxAmount(plan.price, taxPercentage) : 0;
        const finalAmount = plan.price + taxAmount;

        // Ensure user is eligible for trial
        await this.ensureTrialEligibility(userId);

        // Create trial subscription with Razorpay
        const response = await fetch(`/api/razorpay/create-trial-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            trial_days: 30, // 30-day trial
            interval: plan.interval,
            plan_name: plan.name,
            final_amount: finalAmount,
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Failed to create trial subscription: ${text}`);
        }

        const subscription = await response.json();
        const nowIso = new Date().toISOString();
        const trialEndIso = subscription?.start_at
          ? new Date(subscription.start_at * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const trialMetadata = {
          razorpaySubscriptionId: subscription?.id,
          trialStart: nowIso,
          trialEnd: trialEndIso,
        };

        // Open Razorpay checkout for trial setup (no immediate charge)
        const options = {
          key: RAZORPAY_KEY_ID,
          subscription_id: subscription.id,
          name: 'Track My Startup',
          description: `Free Trial: ${plan.name}`,
          prefill: {
            name: currentUser?.name || 'Startup User',
            email: currentUser?.email || 'user@startup.com',
          },
          theme: {
            color: '#1e40af',
          },
          handler: async (response: PaymentResponse) => {
            try {
              console.log('Trial setup payment response:', response);
              // Verify trial setup
              await this.verifyTrialSetup(response, plan, userId, trialMetadata);
              console.log('Trial setup completed successfully');
              
              // Trigger centralized payment success callback
              this.triggerPaymentSuccess();
              
              resolve(true);
            } catch (error) {
              console.error('Trial setup verification failed:', error);
              reject(error);
            }
          },
          modal: {
            ondismiss: () => {
              console.log('❌ Trial setup modal dismissed by user - trial cancelled');
              reject(new Error('Trial setup cancelled by user'));
            },
          },
        };

        // Open Razorpay checkout
        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();

      } catch (error) {
        console.error('Error creating trial subscription:', error);
        reject(error);
      }
    });
  }

  // Get tax configuration for user type and country
  async getTaxConfiguration(userType: string, country: string = 'Global'): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('tax_configurations')
        .select('tax_percentage, name')
        .eq('applies_to_user_type', userType)
        .eq('country', country)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching tax configuration:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting tax configuration:', error);
      return null;
    }
  }

  // Calculate tax amount
  calculateTaxAmount(baseAmount: number, taxPercentage: number): number {
    return Math.round((baseAmount * taxPercentage / 100) * 100) / 100; // Round to 2 decimal places
  }

  private async attachRazorpaySubscriptionId(userId: string, razorpaySubscriptionId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('id, razorpay_subscription_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('current_period_start', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Supabase error fetching subscription for Razorpay attachment:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.warn('No active subscription found to attach Razorpay subscription ID for user:', userId);
        return;
      }

      const latest = data[0] as { id: string; razorpay_subscription_id: string | null };
      if (latest.razorpay_subscription_id) {
        console.log('Skipping Razorpay subscription attachment; already present for subscription:', latest.id);
        return;
      }

      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          razorpay_subscription_id: razorpaySubscriptionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', latest.id);

      if (updateError) {
        console.error('Error updating subscription with Razorpay subscription ID:', updateError);
      } else {
        console.log('✅ Razorpay subscription ID attached to subscription:', latest.id);
      }
    } catch (error) {
      console.error('Unexpected error attaching Razorpay subscription ID:', error);
    }
  }

  private async deactivateExistingSubscriptions(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'inactive',
          is_in_trial: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        console.error('Error deactivating existing subscriptions:', error);
      }
    } catch (error) {
      console.error('Unexpected error deactivating existing subscriptions:', error);
    }
  }

  private async ensureTrialEligibility(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('id, has_used_trial, is_in_trial, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      let rows = data;
      let fetchError = error;

      if (fetchError && typeof fetchError.message === 'string' && fetchError.message.toLowerCase().includes('has_used_trial')) {
        const fallback = await supabase
          .from('user_subscriptions')
          .select('id, is_in_trial, status')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);
        rows = fallback.data;
        fetchError = fallback.error;
      }

      if (fetchError) {
        console.error('Error checking trial eligibility:', fetchError);
        return;
      }

      if (!rows || rows.length === 0) {
        return;
      }

      const latest = rows[0] as { has_used_trial?: boolean; is_in_trial?: boolean; status?: string };
      if (latest?.has_used_trial) {
        throw new Error('TRIAL_ALREADY_USED');
      }

      if (latest?.status === 'active' && latest?.is_in_trial) {
        throw new Error('TRIAL_ALREADY_ACTIVE');
      }

      // Fallback: any historical subscription row counts as trial already consumed
      throw new Error('TRIAL_ALREADY_USED');
    } catch (error) {
      if (error instanceof Error && (error.message === 'TRIAL_ALREADY_USED' || error.message === 'TRIAL_ALREADY_ACTIVE')) {
        throw error;
      }
      console.error('Unexpected error validating trial eligibility:', error);
    }
  }

  // Process payment with Razorpay
  async processPayment(plan: SubscriptionPlan, userId: string, couponCode?: string, currentUser?: any): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        // Load Razorpay script
        const scriptLoaded = await this.loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error('Failed to load Razorpay script');
        }

        // Calculate base price with coupon
        let baseAmount = plan.price;
        if (couponCode) {
          const coupon = await this.validateCoupon(couponCode);
          if (coupon) {
            if (coupon.discount_type === 'percentage') {
              baseAmount = plan.price * (1 - coupon.discount_value / 100);
            } else {
              baseAmount = Math.max(0, plan.price - coupon.discount_value);
            }
          }
        }

        // Get tax percentage from plan
        const taxPercentage = plan.tax_percentage || 0;
        let taxAmount = 0;
        let finalAmount = baseAmount;

        if (taxPercentage > 0) {
          taxAmount = this.calculateTaxAmount(baseAmount, taxPercentage);
          finalAmount = baseAmount + taxAmount;
          
          console.log(`Tax calculation: Base: ${baseAmount}, Tax: ${taxPercentage}%, Tax Amount: ${taxAmount}, Total: ${finalAmount}`);
        } else {
          console.log('No tax configured for this plan, using base amount only');
        }

        // Handle free payments (100% discount)
        if (finalAmount <= 0) {
          console.log('Free payment detected, creating subscription directly...');
          const taxInfo = taxPercentage > 0 ? {
            taxPercentage: taxPercentage,
            taxAmount: taxAmount,
            totalAmountWithTax: finalAmount
          } : undefined;
          
          await this.createUserSubscription(plan, userId, couponCode, taxInfo);
          
          // Trigger centralized payment success callback for free payments
          this.triggerPaymentSuccess();
          
          resolve(true);
          return;
        }

        // Create one-time order for the discounted amount
        const order = await this.createOrder(plan, userId, finalAmount);

        // Razorpay options for one-time payment
        const options = {
          key: RAZORPAY_KEY_ID,
          amount: Math.round(finalAmount * 100), // Convert to paise
          currency: plan.currency,
          order_id: order.id,
          name: 'Track My Startup',
          description: `Subscription: ${plan.name}`,
          prefill: {
            name: currentUser?.name || 'Startup User',
            email: currentUser?.email || 'user@startup.com',
          },
          theme: {
            color: '#1e40af',
          },
          handler: async (response: PaymentResponse) => {
            try {
              console.log('Payment handler triggered:', response);
              
              // Prepare tax information for verification
              const taxInfo = taxPercentage > 0 ? {
                taxPercentage: taxPercentage,
                taxAmount: taxAmount,
                totalAmountWithTax: finalAmount
              } : undefined;
              
              // Verify the first payment with tax information
              await this.verifyPayment(
                response,
                plan,
                userId,
                couponCode,
                taxInfo,
                { finalAmount, interval: plan.interval, planName: plan.name }
              );
              
              // IMMEDIATE success callback - no delays
              console.log('✅ Payment verified, triggering immediate success callback');
              this.triggerPaymentSuccess();
              
              // Background subscription creation (non-blocking) always for Pay Now
              console.log('🔄 Creating subscription for future autopay in background...');
              this.createSubscription(plan, userId).catch(error => {
                console.error('⚠️ Background subscription creation failed (non-critical):', error);
              });
              
              resolve(true);
            } catch (error) {
              console.error('Payment verification failed:', error);
              reject(error);
            }
          },
          modal: {
            ondismiss: () => {
              console.log('❌ Payment modal dismissed by user - payment cancelled');
              reject(new Error('Payment cancelled by user'));
            },
          },
        };

        // Open Razorpay checkout
        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();

      } catch (error) {
        console.error('Error processing payment:', error);
        reject(error);
      }
    });
  }

  // Verify payment
  async verifyPayment(
    paymentResponse: PaymentResponse,
    plan: SubscriptionPlan,
    userId: string,
    couponCode?: string,
    taxInfo?: { taxPercentage: number; taxAmount: number; totalAmountWithTax: number },
    context?: { finalAmount: number; interval: 'monthly' | 'yearly'; planName: string }
  ): Promise<boolean> {
    try {
      console.log('🔍 Verifying payment with Razorpay...');
      console.log('Payment response:', paymentResponse);
      console.log('Plan:', plan);
      console.log('User ID:', userId);
      
      const response = await fetch(`/api/razorpay/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          // persistence context
          user_id: userId,
          plan_id: plan.id,
          amount: context?.finalAmount ?? taxInfo?.totalAmountWithTax ?? plan.price,
          currency: plan.currency,
          tax_percentage: taxInfo?.taxPercentage,
          tax_amount: taxInfo?.taxAmount,
          total_amount_with_tax: taxInfo?.totalAmountWithTax ?? context?.finalAmount,
          interval: context?.interval ?? plan.interval,
        }),
      });

      console.log('Verification response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Payment verification failed:', errorText);
        throw new Error(`Payment verification failed: ${errorText}`);
      }

      const verificationResult = await response.json();
      console.log('Verification result:', verificationResult);
      
      if (verificationResult.success) {
        console.log('✅ Payment verified successfully, creating subscription...');
        // Create user subscription with tax information
        await this.createUserSubscription(plan, userId, couponCode, taxInfo);
        console.log('✅ User subscription created successfully');
        return true;
      } else {
        console.error('❌ Payment verification failed:', verificationResult);
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      console.error('❌ Error verifying payment:', error);
      throw error;
    }
  }

  // Verify trial setup
  async verifyTrialSetup(
    paymentResponse: PaymentResponse,
    plan: SubscriptionPlan,
    userId: string,
    metadata?: {
      razorpaySubscriptionId?: string;
      trialStart?: string;
      trialEnd?: string;
    }
  ): Promise<boolean> {
    try {
      console.log('🔍 Setting up trial subscription...');
      console.log('Trial setup payment response:', paymentResponse);
      console.log('Plan:', plan);
      console.log('User ID:', userId);
      console.log('Metadata:', metadata);
      
      // For trial setup, we don't need payment verification
      // Just create the trial subscription directly
      await this.createTrialUserSubscription(plan, userId, metadata);
      
      console.log('✅ Trial subscription created successfully');
      return true;
    } catch (error) {
      console.error('❌ Error creating trial subscription:', error);
      throw error;
    }
  }

  // Create user subscription
  async createUserSubscription(
    plan: SubscriptionPlan,
    userId: string,
    couponCode?: string,
    taxInfo?: { taxPercentage: number; taxAmount: number; totalAmountWithTax: number }
  ): Promise<UserSubscription> {
    try {
      const { data: existing, error: existingError } = await supabase
        .from('user_subscriptions')
        .select('id, has_used_trial')
        .eq('user_id', userId)
        .eq('plan_id', plan.id)
        .maybeSingle();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Error checking existing subscription before upsert:', existingError);
      }

      await this.deactivateExistingSubscriptions(userId);

      const now = new Date();
      const periodEnd = new Date();
      
      if (plan.interval === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      const subscriptionData: any = {
        user_id: userId,
        plan_id: plan.id,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        amount: plan.price,
        interval: plan.interval,
        is_in_trial: false,
        updated_at: now.toISOString(),
      };

      if (existing?.id) {
        subscriptionData.id = existing.id;
        subscriptionData.has_used_trial = existing.has_used_trial ?? true;
      }

      // Add tax information if provided
      if (taxInfo) {
        subscriptionData.tax_percentage = taxInfo.taxPercentage;
        subscriptionData.tax_amount = taxInfo.taxAmount;
        subscriptionData.total_amount_with_tax = taxInfo.totalAmountWithTax;
      }

      console.log('Creating user subscription with data:', subscriptionData);
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .upsert(subscriptionData, { onConflict: 'user_id,plan_id' })
        .select()
        .single();

      if (error) {
        console.error('Error creating user subscription:', error);
        console.error('Subscription data:', subscriptionData);
        throw error;
      }

      console.log('User subscription created successfully:', data);

      // Record coupon usage if applicable
      if (couponCode) {
        await this.recordCouponUsage(couponCode, userId, data.id);
      }

      return data;
    } catch (error) {
      console.error('Error creating user subscription:', error);
      throw error;
    }
  }

  // Create trial user subscription
  async createTrialUserSubscription(
    plan: SubscriptionPlan,
    userId: string,
    metadata?: {
      razorpaySubscriptionId?: string;
      trialStart?: string;
      trialEnd?: string;
    }
  ): Promise<UserSubscription> {
    try {
      console.log('🔍 Creating trial user subscription...');
      console.log('Plan:', plan);
      console.log('User ID:', userId);
      console.log('Metadata:', metadata);

      await this.deactivateExistingSubscriptions(userId);
      
      const now = metadata?.trialStart ? new Date(metadata.trialStart) : new Date();
      const trialEnd = (() => {
        if (metadata?.trialEnd) {
          return new Date(metadata.trialEnd);
        }
        const fallback = new Date(now);
        fallback.setDate(fallback.getDate() + 30); // 30-day trial
        return fallback;
      })();

      const trialStartIso = now.toISOString();
      const trialEndIso = trialEnd.toISOString();

      const subscriptionData = {
        user_id: userId,
        plan_id: plan.id,
        status: 'active',
        current_period_start: trialStartIso,
        current_period_end: trialEndIso,
        amount: 0, // Free trial
        interval: plan.interval,
        is_in_trial: true,
        trial_start: trialStartIso,
        trial_end: trialEndIso,
        razorpay_subscription_id: metadata?.razorpaySubscriptionId || null,
      };

      console.log('Trial subscription data:', subscriptionData);

      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating trial subscription:', error);
        console.error('Subscription data:', subscriptionData);
        throw error;
      }

      try {
        await supabase
          .from('user_subscriptions')
          .update({ has_used_trial: true })
          .eq('id', data.id);
      } catch (updateError) {
        console.error('⚠️ Failed to mark trial as used:', updateError);
      }

      console.log('✅ Trial subscription created successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Error creating trial user subscription:', error);
      throw error;
    }
  }

  // Validate coupon
  async validateCoupon(code: string): Promise<any> {
    try {
      console.log('PaymentService: Validating coupon:', code);
      
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      console.log('PaymentService: Database response:', { data, error });

      if (error || !data) {
        console.log('PaymentService: Coupon not found or error:', error);
        return null;
      }

      // Check if coupon is still valid
      const now = new Date();
      if (data.valid_from && new Date(data.valid_from) > now) {
        console.log('PaymentService: Coupon not yet valid');
        return null;
      }
      if (data.valid_until && new Date(data.valid_until) < now) {
        console.log('PaymentService: Coupon expired');
        return null;
      }
      if (data.used_count >= data.max_uses) {
        console.log('PaymentService: Coupon usage limit reached');
        return null;
      }

      console.log('PaymentService: Coupon is valid!');
      return data;
    } catch (error) {
      console.error('PaymentService: Error validating coupon:', error);
      return null;
    }
  }

  // Record coupon usage
  async recordCouponUsage(couponCode: string, userId: string, subscriptionId: string): Promise<void> {
    try {
      // Get coupon details
      const { data: coupon } = await supabase
        .from('coupons')
        .select('id')
        .eq('code', couponCode)
        .single();

      if (coupon) {
        // Record redemption
        await supabase
          .from('coupon_redemptions')
          .insert({
            coupon_id: coupon.id,
            user_id: userId,
            subscription_id: subscriptionId,
            redeemed_at: new Date().toISOString(),
          });

        // Update usage count
        await supabase
          .from('coupons')
          .update({ used_count: supabase.raw('used_count + 1') })
          .eq('id', coupon.id);
      }
    } catch (error) {
      console.error('Error recording coupon usage:', error);
    }
  }

  // Get user subscription status
  async getUserSubscriptionStatus(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (
            name,
            price,
            currency,
            interval,
            description
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting subscription status:', error);
      return null;
    }
  }

  // Cancel subscription
  async cancelSubscription(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return false;
    }
  }

  // Get subscription plans
  async getSubscriptionPlans(userType: string = 'Startup'): Promise<SubscriptionPlan[]> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('user_type', userType)
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting subscription plans:', error);
      return [];
    }
  }

  // Get available coupons
  async getAvailableCoupons(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .eq('applies_to_user_type', 'Startup')
        .gte('valid_until', new Date().toISOString())
        .or('valid_until.is.null');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting coupons:', error);
      return [];
    }
  }

  // Create a due diligence request without payment
  async createDueDiligenceRequest(userId: string, startupId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('due_diligence_requests')
        .insert({
          user_id: userId,
          startup_id: String(startupId),
          status: 'pending'
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

  // Return true if investor already has an approved/completed due diligence for the startup
  async hasApprovedDueDiligence(userId: string, startupId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('due_diligence_requests')
      .select('id, status')
      .eq('user_id', userId)
      .eq('startup_id', String(startupId))
      .in('status', ['completed'])
      .limit(1);
    if (error) {
      console.error('Error checking approved due diligence:', error);
      return false;
    }
    return Array.isArray(data) && data.length > 0;
  }

  // Create pending request only if one doesn't already exist
  async createPendingDueDiligenceIfNeeded(userId: string, startupId: string): Promise<any> {
    const { data: existing, error: checkError } = await supabase
      .from('due_diligence_requests')
      .select('id, status')
      .eq('user_id', userId)
      .eq('startup_id', String(startupId))
      .in('status', ['pending'])
      .limit(1);
    if (!checkError && Array.isArray(existing) && existing.length > 0) {
      return existing[0];
    }
    return this.createDueDiligenceRequest(userId, String(startupId));
  }

  // Approve due diligence (for startup use) – marks as completed
  async approveDueDiligence(requestId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('approve_due_diligence_for_startup', {
      p_request_id: requestId
    });
    if (error) {
      console.error('Error approving due diligence:', error);
      return false;
    }
    return !!data;
  }

  async rejectDueDiligence(requestId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('reject_due_diligence_for_startup', {
      p_request_id: requestId
    });
    if (error) {
      console.error('Error rejecting due diligence:', error);
      return false;
    }
    return !!data;
  }
}

export const paymentService = new PaymentService();
