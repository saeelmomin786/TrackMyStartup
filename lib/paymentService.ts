import { supabase } from './supabase';
import { selectPaymentGateway } from './paymentGatewaySelector';

// Razorpay configuration (only public key on client)
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

// PayPal configuration
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;

// Types
export interface PaymentOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface PaymentResponse {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  paypal_order_id?: string;
  paypal_payer_id?: string;
  paypal_subscription_id?: string;
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
    
    // Dispatch custom event for AccountTab to listen and refresh
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('payment-success');
      window.dispatchEvent(event);
      console.log('📢 Dispatched payment-success event for AccountTab refresh');
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
              
              // Wait a moment for Supabase to commit the transaction
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Verify subscription was created before triggering success
              const { data: verifySub } = await supabase
                .from('user_subscriptions')
                .select('id, status, is_in_trial')
                .eq('user_id', userId)
                .eq('status', 'active')
                .eq('is_in_trial', true)
                .limit(1);
              
              if (verifySub && verifySub.length > 0) {
                console.log('✅ Trial subscription verified, triggering success callback');
                this.triggerPaymentSuccess();
              } else {
                console.warn('⚠️ Trial subscription not found yet, triggering success anyway');
                this.triggerPaymentSuccess();
              }
              
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

  // Enable autopay for subscription after mandate authorization
  private async enableAutopayForSubscription(userId: string, razorpaySubscriptionId: string): Promise<void> {
    try {
      // Update subscription with autopay details
      const { data: subscription, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('current_period_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError || !subscription) {
        console.error('Error fetching subscription for autopay enablement:', fetchError);
        return;
      }

      // Enable autopay - mandate will be synced from Razorpay webhook
      const updateData: any = {
        autopay_enabled: true,
        razorpay_subscription_id: razorpaySubscriptionId,
        mandate_status: 'active', // Will be updated by webhook with actual mandate ID
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update(updateData)
        .eq('id', subscription.id);

      if (updateError) {
        console.error('Error enabling autopay:', updateError);
      } else {
        console.log('✅ Autopay enabled for subscription:', subscription.id, {
          razorpaySubscriptionId
        });
      }
    } catch (error) {
      console.error('Error in enableAutopayForSubscription:', error);
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
        throw error; // ← FIX: Throw error so caller knows deactivation failed
      }
      
      console.log('✅ Deactivated existing subscriptions for user:', userId);
    } catch (error) {
      console.error('Unexpected error deactivating existing subscriptions:', error);
      throw error; // ← FIX: Propagate error instead of silently failing
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

  // Process payment - routes to Razorpay or PayPal based on country
  async processPayment(plan: SubscriptionPlan, userId: string, couponCode?: string, currentUser?: any, country?: string): Promise<boolean> {
    // Determine payment gateway based on country
    const gateway = country ? selectPaymentGateway(country) : 'paypal';
    
    console.log('🎯 [PaymentService] Routing payment:', { country, gateway, planName: plan.name });
    
    if (gateway === 'razorpay') {
      console.log('💳 [PaymentService] Routing to Razorpay...');
      return this.processRazorpayPayment(plan, userId, couponCode, currentUser, country);
    } else {
      console.log('💳 [PaymentService] Routing to PayPal...');
      return this.processPayPalPayment(plan, userId, couponCode, currentUser, country);
    }
  }

  // Process payment with Razorpay
  private async processRazorpayPayment(plan: SubscriptionPlan, userId: string, couponCode?: string, currentUser?: any, country?: string): Promise<boolean> {
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

        // Create Razorpay subscription FIRST (this includes mandate setup for autopay)
        console.log('🔄 Creating Razorpay subscription with autopay mandate...');
        const razorpaySubscription = await this.createSubscription(plan, userId);
        
        if (!razorpaySubscription?.id) {
          throw new Error('Failed to create Razorpay subscription for autopay');
        }

        console.log('✅ Razorpay subscription created:', razorpaySubscription.id);

        // Razorpay options for subscription payment (with mandate authorization)
        const options = {
          key: RAZORPAY_KEY_ID,
          subscription_id: razorpaySubscription.id, // Use subscription_id instead of order_id
          name: 'Track My Startup',
          description: `Subscription: ${plan.name} (Autopay Enabled)`,
          prefill: {
            name: currentUser?.name || 'Startup User',
            email: currentUser?.email || 'user@startup.com',
          },
          theme: {
            color: '#1e40af',
          },
          handler: async (response: PaymentResponse) => {
            try {
              console.log('Payment handler triggered (subscription with mandate):', response);
              
              // For subscription payments, response might not have order_id
              // Use subscription_id for signature verification instead
              const paymentResponseForVerification = {
                ...response,
                razorpay_order_id: response.razorpay_order_id || razorpaySubscription.id, // Use subscription_id if order_id missing
                razorpay_subscription_id: razorpaySubscription.id
              };
              
              // Prepare tax information for verification
              const taxInfo = taxPercentage > 0 ? {
                taxPercentage: taxPercentage,
                taxAmount: taxAmount,
                totalAmountWithTax: finalAmount
              } : undefined;
              
              // Verify the first payment with tax information
              await this.verifyPayment(
                paymentResponseForVerification,
                plan,
                userId,
                couponCode,
                taxInfo,
                { finalAmount, interval: plan.interval, planName: plan.name, razorpaySubscriptionId: razorpaySubscription.id, country }
              );
              
              // Update subscription with Razorpay subscription ID and enable autopay
              await this.attachRazorpaySubscriptionId(userId, razorpaySubscription.id);
              
              // Enable autopay in database
              await this.enableAutopayForSubscription(userId, razorpaySubscription.id);
              
              // Wait a moment for Supabase to commit the transaction
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Verify subscription was created before triggering success
              const { data: verifySub } = await supabase
                .from('user_subscriptions')
                .select('id, status, autopay_enabled, razorpay_subscription_id')
                .eq('user_id', userId)
                .eq('status', 'active')
                .limit(1);
              
              if (verifySub && verifySub.length > 0) {
                console.log('✅ Payment verified, subscription confirmed, autopay enabled:', {
                  subscriptionId: verifySub[0].id,
                  autopayEnabled: verifySub[0].autopay_enabled,
                  razorpaySubscriptionId: verifySub[0].razorpay_subscription_id
                });
                this.triggerPaymentSuccess();
              } else {
                console.warn('⚠️ Payment verified but subscription not found yet, triggering success anyway');
                this.triggerPaymentSuccess();
              }
              
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

        // Open Razorpay checkout with subscription (mandate authorization)
        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();

      } catch (error) {
        console.error('Error processing payment:', error);
        reject(error);
      }
    });
  }

  // Load PayPal script dynamically
  private loadPayPalScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if ((window as any).paypal) {
        resolve(true);
        return;
      }

      const isProduction = import.meta.env.VITE_PAYPAL_ENVIRONMENT === 'production';
      const script = document.createElement('script');
      // Include vault=true for subscription support
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=EUR&vault=true${isProduction ? '' : '&buyer-country=US'}`;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  // Create PayPal order (for one-time payments)
  private async createPayPalOrder(amount: number, currency: string = 'EUR'): Promise<string> {
    try {
      const response = await fetch(`/api/paypal/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount.toFixed(2),
          currency: currency,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create PayPal order');
      }

      const data = await response.json();
      return data.orderId;
    } catch (error) {
      console.error('Error creating PayPal order:', error);
      throw error;
    }
  }

  // Create PayPal subscription (for recurring payments with autopay)
  private async createPayPalSubscription(plan: SubscriptionPlan, userId: string, finalAmount: number): Promise<string> {
    try {
      console.log('📞 [PayPal] Calling /api/paypal/create-subscription with:', {
        user_id: userId,
        final_amount: finalAmount,
        interval: plan.interval,
        plan_name: plan.name,
        currency: plan.currency || 'EUR',
      });
      
      const response = await fetch(`/api/paypal/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          final_amount: finalAmount,
          interval: plan.interval,
          plan_name: plan.name,
          currency: plan.currency || 'EUR',
        }),
      });

      console.log('📥 [PayPal] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [PayPal] API error response:', errorText);
        throw new Error(`Failed to create PayPal subscription: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ [PayPal] Subscription created, received:', data);
      return data.subscriptionId;
    } catch (error) {
      console.error('❌ [PayPal] Error creating PayPal subscription:', error);
      throw error;
    }
  }

  // Process payment with PayPal
  private async processPayPalPayment(plan: SubscriptionPlan, userId: string, couponCode?: string, currentUser?: any, country?: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('🚀 [PayPal] Starting PayPal payment process...', { plan, userId, country });
        
        // Load PayPal script
        console.log('📜 [PayPal] Loading PayPal SDK script...');
        const scriptLoaded = await this.loadPayPalScript();
        if (!scriptLoaded) {
          console.error('❌ [PayPal] Failed to load PayPal script');
          throw new Error('Failed to load PayPal script');
        }
        console.log('✅ [PayPal] PayPal SDK loaded successfully');

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

        // Create PayPal subscription FIRST (for autopay/recurring payments)
        console.log('🔄 [PayPal] Creating PayPal subscription with autopay...', { finalAmount, plan: plan.name });
        const subscriptionId = await this.createPayPalSubscription(plan, userId, finalAmount);
        
        if (!subscriptionId) {
          console.error('❌ [PayPal] Failed to create PayPal subscription - no subscriptionId returned');
          throw new Error('Failed to create PayPal subscription for autopay');
        }

        console.log('✅ [PayPal] PayPal subscription created:', subscriptionId);

        // Initialize PayPal buttons
        const paypal = (window as any).paypal;
        if (!paypal) {
          throw new Error('PayPal SDK not loaded');
        }

        // Create PayPal button container with overlay (declare outside try for scope)
        let overlay: HTMLElement | null = null;
        
        // Create overlay
        overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';

        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'paypal-button-container';
        buttonContainer.style.backgroundColor = 'white';
        buttonContainer.style.padding = '30px';
        buttonContainer.style.borderRadius = '8px';
        buttonContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        buttonContainer.style.minWidth = '300px';
        buttonContainer.style.position = 'relative';

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '24px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.color = '#666';
        closeButton.onclick = () => {
          if (overlay && document.body.contains(overlay)) {
            document.body.removeChild(overlay);
          }
          reject(new Error('Payment cancelled by user'));
        };
        buttonContainer.appendChild(closeButton);

        overlay.appendChild(buttonContainer);
        document.body.appendChild(overlay);

        // Render PayPal subscription button
        paypal.Buttons({
          createSubscription: async () => {
            return subscriptionId;
          },
          onApprove: async (data: any) => {
            try {
              console.log('PayPal payment approved:', data);
              
              // Prepare payment response for verification (subscription approval)
              const paymentResponse: PaymentResponse = {
                paypal_order_id: data.subscriptionID || data.orderID,
                paypal_payer_id: data.payerID,
                paypal_subscription_id: subscriptionId,
              };

              // Prepare tax information for verification
              const taxInfo = taxPercentage > 0 ? {
                taxPercentage: taxPercentage,
                taxAmount: taxAmount,
                totalAmountWithTax: finalAmount
              } : undefined;
              
              // Verify the subscription setup (first payment will be captured automatically)
              await this.verifyPayPalSubscription(
                paymentResponse,
                plan,
                userId,
                couponCode,
                taxInfo,
                { finalAmount, interval: plan.interval, planName: plan.name, country, paypalSubscriptionId: subscriptionId }
              );
              
              // Wait a moment for Supabase to commit the transaction
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Verify subscription was created before triggering success
              const { data: verifySub } = await supabase
                .from('user_subscriptions')
                .select('id, status')
                .eq('user_id', userId)
                .eq('status', 'active')
                .limit(1);
              
              if (verifySub && verifySub.length > 0) {
                console.log('✅ Payment verified, subscription confirmed:', {
                  subscriptionId: verifySub[0].id
                });
                this.triggerPaymentSuccess();
              } else {
                console.warn('⚠️ Payment verified but subscription not found yet, triggering success anyway');
                this.triggerPaymentSuccess();
              }
              
              // Remove overlay
              if (overlay && document.body.contains(overlay)) {
                document.body.removeChild(overlay);
              }
              
              resolve(true);
            } catch (error) {
              console.error('PayPal payment verification failed:', error);
              if (overlay && document.body.contains(overlay)) {
                document.body.removeChild(overlay);
              }
              reject(error);
            }
          },
          onCancel: () => {
            console.log('❌ PayPal payment cancelled by user');
            if (overlay && document.body.contains(overlay)) {
              document.body.removeChild(overlay);
            }
            reject(new Error('Payment cancelled by user'));
          },
          onError: (err: any) => {
            console.error('❌ PayPal payment error:', err);
            if (overlay && document.body.contains(overlay)) {
              document.body.removeChild(overlay);
            }
            reject(new Error('PayPal payment error'));
          }
        }).render('#paypal-button-container');

      } catch (error) {
        console.error('Error processing PayPal payment:', error);
        reject(error);
      }
    });
  }

  // Verify PayPal payment
  private async verifyPayPalPayment(
    paymentResponse: PaymentResponse,
    plan: SubscriptionPlan,
    userId: string,
    couponCode?: string,
    taxInfo?: { taxPercentage: number; taxAmount: number; totalAmountWithTax: number },
    context?: { finalAmount: number; interval: 'monthly' | 'yearly'; planName: string; country?: string }
  ): Promise<boolean> {
    try {
      console.log('🔍 Verifying PayPal payment...');
      console.log('Payment response:', JSON.stringify(paymentResponse, null, 2));
      console.log('Plan:', plan);
      console.log('User ID:', userId);
      console.log('Context:', context);
      
      if (!paymentResponse.paypal_order_id) {
        throw new Error('Missing PayPal order ID for payment verification');
      }
      
      const response = await fetch(`/api/razorpay/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'paypal',
          paypal_order_id: paymentResponse.paypal_order_id,
          paypal_payer_id: paymentResponse.paypal_payer_id,
          // persistence context
          user_id: userId,
          plan_id: plan.id,
          amount: context?.finalAmount ?? taxInfo?.totalAmountWithTax ?? plan.price,
          currency: plan.currency || 'EUR',
          tax_percentage: taxInfo?.taxPercentage,
          tax_amount: taxInfo?.taxAmount,
          total_amount_with_tax: taxInfo?.totalAmountWithTax ?? context?.finalAmount,
          interval: context?.interval ?? plan.interval,
          country: context?.country || null,
        }),
      });

      console.log('Verification response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('PayPal payment verification failed:', errorText);
        throw new Error(`Payment verification failed: ${errorText}`);
      }

      const verificationResult = await response.json();
      console.log('Verification result:', verificationResult);
      
      if (verificationResult.success) {
        console.log('✅ PayPal payment verified successfully, creating subscription...');
        // Create user subscription with tax information
        await this.createUserSubscription(plan, userId, couponCode, taxInfo);
        console.log('✅ User subscription created successfully');
        return true;
      } else {
        console.error('❌ PayPal payment verification failed:', verificationResult);
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      console.error('❌ Error verifying PayPal payment:', error);
      throw error;
    }
  }

  // Verify PayPal subscription setup
  private async verifyPayPalSubscription(
    paymentResponse: PaymentResponse,
    plan: SubscriptionPlan,
    userId: string,
    couponCode?: string,
    taxInfo?: { taxPercentage: number; taxAmount: number; totalAmountWithTax: number },
    context?: { finalAmount: number; interval: 'monthly' | 'yearly'; planName: string; country?: string; paypalSubscriptionId?: string }
  ): Promise<boolean> {
    try {
      console.log('🔍 Verifying PayPal subscription setup...');
      console.log('Payment response:', JSON.stringify(paymentResponse, null, 2));
      console.log('Plan:', plan);
      console.log('User ID:', userId);
      console.log('Context:', context);
      
      if (!paymentResponse.paypal_subscription_id && !context?.paypalSubscriptionId) {
        throw new Error('Missing PayPal subscription ID for verification');
      }
      
      const subscriptionId = paymentResponse.paypal_subscription_id || context?.paypalSubscriptionId;
      
      const response = await fetch(`/api/paypal/verify-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'paypal',
          paypal_subscription_id: subscriptionId,
          paypal_payer_id: paymentResponse.paypal_payer_id,
          // persistence context
          user_id: userId,
          plan_id: plan.id,
          amount: context?.finalAmount ?? taxInfo?.totalAmountWithTax ?? plan.price,
          currency: plan.currency || 'EUR',
          tax_percentage: taxInfo?.taxPercentage,
          tax_amount: taxInfo?.taxAmount,
          total_amount_with_tax: taxInfo?.totalAmountWithTax ?? context?.finalAmount,
          interval: context?.interval ?? plan.interval,
          country: context?.country || null,
        }),
      });

      console.log('Verification response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('PayPal subscription verification failed:', errorText);
        throw new Error(`Subscription verification failed: ${errorText}`);
      }

      const verificationResult = await response.json();
      console.log('Verification result:', verificationResult);
      
      if (verificationResult.success) {
        console.log('✅ PayPal subscription verified successfully, creating subscription...');
        // Create user subscription with tax information and PayPal subscription ID
        await this.createUserSubscription(plan, userId, couponCode, taxInfo);
        
        // Attach PayPal subscription ID
        await this.attachPayPalSubscriptionId(userId, subscriptionId!);
        
        console.log('✅ User subscription created successfully with autopay');
        return true;
      } else {
        console.error('❌ PayPal subscription verification failed:', verificationResult);
        throw new Error('Subscription verification failed');
      }
    } catch (error) {
      console.error('❌ Error verifying PayPal subscription:', error);
      throw error;
    }
  }

  // Attach PayPal subscription ID to user subscription
  private async attachPayPalSubscriptionId(userId: string, paypalSubscriptionId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('id, paypal_subscription_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('current_period_start', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Supabase error fetching subscription for PayPal attachment:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.warn('No active subscription found to attach PayPal subscription ID for user:', userId);
        return;
      }

      const latest = data[0] as { id: string; paypal_subscription_id: string | null };
      if (latest.paypal_subscription_id) {
        console.log('Skipping PayPal subscription attachment; already present for subscription:', latest.id);
        return;
      }

      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          paypal_subscription_id: paypalSubscriptionId,
          autopay_enabled: true, // Enable autopay for PayPal subscriptions
          updated_at: new Date().toISOString(),
        })
        .eq('id', latest.id);

      if (updateError) {
        console.error('Error updating subscription with PayPal subscription ID:', updateError);
      } else {
        console.log('✅ PayPal subscription ID attached to subscription:', latest.id);
      }
    } catch (error) {
      console.error('Unexpected error attaching PayPal subscription ID:', error);
    }
  }

  // Verify payment - routes to Razorpay or PayPal based on response type
  async verifyPayment(
    paymentResponse: PaymentResponse & { razorpay_subscription_id?: string; paypal_subscription_id?: string },
    plan: SubscriptionPlan,
    userId: string,
    couponCode?: string,
    taxInfo?: { taxPercentage: number; taxAmount: number; totalAmountWithTax: number },
    context?: { finalAmount: number; interval: 'monthly' | 'yearly'; planName: string; razorpaySubscriptionId?: string; paypalSubscriptionId?: string; country?: string }
  ): Promise<boolean> {
    // Route to appropriate verification based on payment response
    if (paymentResponse.paypal_subscription_id || context?.paypalSubscriptionId) {
      return this.verifyPayPalSubscription(paymentResponse, plan, userId, couponCode, taxInfo, context);
    } else if (paymentResponse.paypal_order_id) {
      return this.verifyPayPalPayment(paymentResponse, plan, userId, couponCode, taxInfo, context);
    } else {
      return this.verifyRazorpayPayment(paymentResponse, plan, userId, couponCode, taxInfo, context);
    }
  }

  // Verify Razorpay payment
  private async verifyRazorpayPayment(
    paymentResponse: PaymentResponse & { razorpay_subscription_id?: string },
    plan: SubscriptionPlan,
    userId: string,
    couponCode?: string,
    taxInfo?: { taxPercentage: number; taxAmount: number; totalAmountWithTax: number },
    context?: { finalAmount: number; interval: 'monthly' | 'yearly'; planName: string; razorpaySubscriptionId?: string; country?: string }
  ): Promise<boolean> {
    try {
      console.log('🔍 Verifying payment with Razorpay...');
      console.log('Payment response:', JSON.stringify(paymentResponse, null, 2));
      console.log('Plan:', plan);
      console.log('User ID:', userId);
      console.log('Context:', context);
      
      // For subscription payments, use subscription_id if order_id is missing
      const orderId = paymentResponse.razorpay_order_id || paymentResponse.razorpay_subscription_id || context?.razorpaySubscriptionId;
      const subscriptionId = paymentResponse.razorpay_subscription_id || context?.razorpaySubscriptionId;
      
      if (!orderId && !subscriptionId) {
        throw new Error('Missing order_id or subscription_id for payment verification');
      }
      
      console.log('📝 Verification data:', {
        payment_id: paymentResponse.razorpay_payment_id,
        order_id: orderId,
        subscription_id: subscriptionId,
        has_signature: !!paymentResponse.razorpay_signature
      });
      
      const response = await fetch(`/api/razorpay/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'razorpay',
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_order_id: orderId || subscriptionId, // Use subscription_id for subscription payments
          razorpay_signature: paymentResponse.razorpay_signature,
          razorpay_subscription_id: subscriptionId, // Pass subscription_id
          // persistence context
          user_id: userId,
          plan_id: plan.id,
          amount: context?.finalAmount ?? taxInfo?.totalAmountWithTax ?? plan.price,
          currency: plan.currency,
          tax_percentage: taxInfo?.taxPercentage,
          tax_amount: taxInfo?.taxAmount,
          total_amount_with_tax: taxInfo?.totalAmountWithTax ?? context?.finalAmount,
          interval: context?.interval ?? plan.interval,
          country: context?.country || null, // Pass country to backend
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
      // 🔐 FIX: Get the profile ID (not auth ID) for RLS policy validation
      // userId parameter is auth.uid(), but RLS policy expects user_profiles.id
      // ⚠️ IMPORTANT: User can have multiple profiles (e.g., Startup + Mentor roles)
      // So we need to handle multiple rows, not use .maybeSingle()
      console.log('🔍 createUserSubscription: Received auth userId:', userId);
      
      const { data: userProfiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, role')
        .eq('auth_user_id', userId)
        .order('created_at', { ascending: false });

      if (profileError || !userProfiles || userProfiles.length === 0) {
        throw new Error(`No user profile found for auth_user_id: ${userId}. Error: ${profileError?.message}`);
      }

      // If multiple profiles exist, select based on the plan's user_type
      let selectedProfile = userProfiles[0];
      if (userProfiles.length > 1) {
        console.log('⚠️ Multiple profiles found for auth_user_id:', userId, 'count:', userProfiles.length);
        console.log('🔍 Plan user_type:', plan.user_type, 'Looking for matching profile role');
        
        // Try to match the profile role to the plan's user_type
        const matchingProfile = userProfiles.find((p: any) => p.role === plan.user_type);
        if (matchingProfile) {
          selectedProfile = matchingProfile;
          console.log('✅ Selected profile matching plan type:', plan.user_type);
        } else {
          // Fallback: prefer 'Startup' role if no exact match
          const startupProfile = userProfiles.find((p: any) => p.role === 'Startup');
          if (startupProfile) {
            selectedProfile = startupProfile;
            console.log('⚠️ No matching profile for plan type, using Startup profile as fallback');
          } else {
            console.log('⚠️ No matching profile and no Startup profile, using most recent profile');
          }
        }
      }

      const profileId = selectedProfile.id;
      console.log('✅ Got profile ID:', profileId, 'for auth ID:', userId, 'Role:', selectedProfile.role, 'Plan type:', plan.user_type);

      // Validate plan.id is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!plan.id || !uuidRegex.test(plan.id)) {
        throw new Error(`Invalid plan ID: ${plan.id}. Plan ID must be a valid UUID from the database.`);
      }

      const { data: existing, error: existingError } = await supabase
        .from('user_subscriptions')
        .select('id, has_used_trial')
        .eq('user_id', profileId)
        .eq('plan_id', plan.id)
        .maybeSingle();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Error checking existing subscription before upsert:', existingError);
      }

      await this.deactivateExistingSubscriptions(profileId);

      const now = new Date();
      const periodEnd = new Date();
      
      if (plan.interval === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      const subscriptionData: any = {
        user_id: profileId,
        plan_id: plan.id,
        plan_tier: plan.plan_tier, // ← BUGFIX: Set plan_tier from plan object
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        amount: plan.price,
        interval: plan.interval,
        is_in_trial: false,
        updated_at: now.toISOString(),
      };

      if (existing?.id) {
        // Keep existing has_used_trial flag when updating
        subscriptionData.has_used_trial = existing.has_used_trial ?? true;
      } else {
        // New subscription - mark trial as used
        subscriptionData.has_used_trial = true;
      }

      // Add tax information if provided
      if (taxInfo) {
        subscriptionData.tax_percentage = taxInfo.taxPercentage;
        subscriptionData.tax_amount = taxInfo.taxAmount;
        subscriptionData.total_amount_with_tax = taxInfo.totalAmountWithTax;
      }

      console.log('Creating user subscription with data:', subscriptionData);
      
      let data, error;
      
      if (existing?.id) {
        // Update existing subscription
        const { data: updated, error: updateError } = await supabase
          .from('user_subscriptions')
          .update(subscriptionData)
          .eq('id', existing.id)
          .select()
          .single();
        data = updated;
        error = updateError;
      } else {
        // Insert new subscription
        const { data: inserted, error: insertError } = await supabase
          .from('user_subscriptions')
          .insert(subscriptionData)
          .select()
          .single();
        data = inserted;
        error = insertError;
      }

      if (error) {
        console.error('Error creating user subscription:', error);
        console.error('Subscription data:', subscriptionData);
        throw error;
      }

      console.log('✅ User subscription created/updated successfully:', data);

      // Record coupon usage if applicable
      if (couponCode) {
        await this.recordCouponUsage(couponCode, profileId, data.id);
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
      console.log('User ID (auth):', userId);
      console.log('Metadata:', metadata);

      // Convert auth ID to profile ID (same as in createUserSubscription)
      const { data: userProfiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, role')
        .eq('auth_user_id', userId)
        .order('created_at', { ascending: false });

      if (profileError || !userProfiles || userProfiles.length === 0) {
        throw new Error(`No user profile found for auth_user_id: ${userId}. Error: ${profileError?.message}`);
      }

      let selectedProfile = userProfiles[0];
      if (userProfiles.length > 1) {
        console.log('⚠️ Multiple profiles found for trial subscription, count:', userProfiles.length);
        console.log('🔍 Plan user_type:', plan.user_type, 'Looking for matching profile role');
        
        // Try to match the profile role to the plan's user_type
        const matchingProfile = userProfiles.find((p: any) => p.role === plan.user_type);
        if (matchingProfile) {
          selectedProfile = matchingProfile;
          console.log('✅ Selected profile matching plan type for trial:', plan.user_type);
        } else {
          // Fallback: prefer 'Startup' role if no exact match
          const startupProfile = userProfiles.find((p: any) => p.role === 'Startup');
          if (startupProfile) {
            selectedProfile = startupProfile;
            console.log('⚠️ No matching profile for plan type, using Startup profile as fallback');
          }
        }
      }

      const profileId = selectedProfile.id;
      console.log('✅ Got profile ID for trial:', profileId, 'Role:', selectedProfile.role, 'Plan type:', plan.user_type);

      await this.deactivateExistingSubscriptions(profileId);
      
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
        user_id: profileId,
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
      // CRITICAL FIX: Use auth.uid() instead of profile ID for RLS policies
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const authUserId = authUser?.id || userId;
      
      const { data, error } = await supabase
        .from('due_diligence_requests')
        .insert({
          user_id: authUserId, // Use auth.uid() instead of profile ID
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
    // CRITICAL FIX: Use auth.uid() instead of profile ID for RLS policies
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const authUserId = authUser?.id || userId;
    
    const { data, error } = await supabase
      .from('due_diligence_requests')
      .select('id, status')
      .eq('user_id', authUserId) // Use auth.uid() instead of profile ID
      .eq('startup_id', String(startupId))
      .in('status', ['completed'])
      .limit(1);
    if (error) {
      console.error('Error checking approved due diligence:', error);
      return false;
    }
    return Array.isArray(data) && data.length > 0;
  }

  // Create pending request only if one doesn't already exist (allows new request if previous was revoked/failed)
  async createPendingDueDiligenceIfNeeded(userId: string, startupId: string): Promise<any> {
    // CRITICAL FIX: Use auth.uid() instead of profile ID for RLS policies
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const authUserId = authUser?.id || userId;
    
    // Only check for existing PENDING requests (allows new request if revoked, failed, or completed)
    const { data: existing, error: checkError } = await supabase
      .from('due_diligence_requests')
      .select('id, status')
      .eq('user_id', authUserId) // Use auth.uid() instead of profile ID
      .eq('startup_id', String(startupId))
      .in('status', ['pending', 'completed', 'paid']) // Don't allow duplicate active requests
      .limit(1);
    
    if (!checkError && Array.isArray(existing) && existing.length > 0) {
      return existing[0];
    }
    // If previous request was revoked/failed, create a new one
    return this.createDueDiligenceRequest(userId, String(startupId)); // This will also use auth.uid() internally
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

  // Revoke due diligence access (for startup use) - marks as revoked
  async revokeDueDiligenceAccess(requestId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('revoke_due_diligence_access_for_startup', {
      p_request_id: requestId
    });
    if (error) {
      console.error('Error revoking due diligence access:', error);
      return false;
    }
    return !!data;
  }
}

export const paymentService = new PaymentService();
