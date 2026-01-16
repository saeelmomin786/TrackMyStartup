import { supabase } from './supabase';

/**
 * Advisor Credit Service
 * Handles credit purchase, assignment, and management for investor advisors
 */

export interface AdvisorCredits {
  id: string;
  advisor_user_id: string;
  credits_available: number;
  credits_used: number;
  credits_purchased: number;
  last_purchase_amount: number | null;
  last_purchase_currency: string | null;
  last_purchase_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditAssignment {
  id: string;
  advisor_user_id: string;
  startup_user_id: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled';
  auto_renewal_enabled: boolean;
  subscription_id: string | null;
  assigned_at: string;
  expired_at: string | null;
}

export interface CreditPurchaseHistory {
  id: string;
  advisor_user_id: string;
  credits_purchased: number;
  amount_paid: number;
  currency: string;
  payment_gateway: 'razorpay' | 'payaid' | null;
  payment_transaction_id: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  purchased_at: string;
  metadata: Record<string, any>;
}

export interface CreditSubscriptionPlan {
  id: string;
  credits_per_month: number;
  plan_name: string;
  country: string;
  price_per_month: number;
  currency: string;
  is_active: boolean;
}

export interface AdvisorCreditSubscription {
  id: string;
  advisor_user_id: string;
  plan_id: string;
  credits_per_month: number;
  price_per_month: number;
  currency: string;
  razorpay_subscription_id: string | null;
  paypal_subscription_id: string | null;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  current_period_start: string;
  current_period_end: string;
  next_billing_date: string | null;
  last_billing_date: string | null;
  billing_cycle_count: number;
  total_paid: number;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
}

export class AdvisorCreditService {
  /**
   * Get or initialize advisor credits
   */
  async getAdvisorCredits(advisorUserId: string): Promise<AdvisorCredits | null> {
    try {
      // Single attempt with timeout wrapper
      const queryPromise = supabase
        .from('advisor_credits')
        .select('*')
        .eq('advisor_user_id', advisorUserId)
        .maybeSingle();

      // Add timeout to prevent hanging (5 seconds)
      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
        setTimeout(() => resolve({ data: null, error: { message: 'Timeout' } }), 5000);
      });

      // Race between query and timeout
      const result = await Promise.race([queryPromise, timeoutPromise]);

      const { data, error } = result;

      if (error) {
        // Timeout error
        if (error.message === 'Timeout') {
          console.warn('getAdvisorCredits timed out after 5 seconds');
          return null;
        }

        // If 409 error, it's likely RLS blocking access - return null (record will be created on first purchase)
        if (error.code === 'PGRST116' || error.status === 409 || error.message?.includes('409')) {
          console.warn('RLS conflict when fetching advisor credits (this is normal if no record exists yet):', error.message);
          return null;
        }
        
        // For other errors, log and return null
        console.error('Error fetching advisor credits:', error);
        return null;
      }

      // Return data if found, null if not found (maybeSingle returns null when no record)
      return data as AdvisorCredits | null;
    } catch (error) {
      console.error('Exception in getAdvisorCredits:', error);
      return null;
    }
  }

  /**
   * Initialize advisor credits record (deprecated - use getAdvisorCredits instead)
   * Kept for backward compatibility
   */
  async initializeAdvisorCredits(advisorUserId: string): Promise<AdvisorCredits | null> {
    // Just call getAdvisorCredits which handles initialization
    return await this.getAdvisorCredits(advisorUserId);
  }

  /**
   * Get credit pricing for a country
   */
  async getCreditPricing(country: string): Promise<{ price: number; currency: string } | null> {
    try {
      // Normalize country name
      const normalizedCountry = country === 'India' ? 'India' : 'Global';
      
      const { data, error } = await supabase
        .from('credit_pricing_config')
        .select('price_per_credit, currency')
        .eq('country', normalizedCountry)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching credit pricing:', error);
        return null;
      }

      if (!data) {
        // Fallback to default pricing
        return {
          price: normalizedCountry === 'India' ? 0 : 0, // Admin should set these
          currency: normalizedCountry === 'India' ? 'INR' : 'EUR'
        };
      }

      return {
        price: Number(data.price_per_credit),
        currency: data.currency
      };
    } catch (error) {
      console.error('Error in getCreditPricing:', error);
      return null;
    }
  }

  /**
   * Add credits after purchase
   * Uses backend API endpoint with service role to bypass REST API restrictions
   */
  async addCredits(
    advisorUserId: string,
    creditsToAdd: number,
    amountPaid: number,
    currency: string,
    paymentGateway: 'razorpay' | 'payaid',
    paymentTransactionId: string
  ): Promise<boolean> {
    try {
      // Use backend API endpoint - it uses service role key to bypass REST API restrictions
      const response = await fetch('/api/advisor-credits/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          advisor_user_id: advisorUserId,
          credits_to_add: creditsToAdd,
          amount_paid: amountPaid,
          currency: currency,
          payment_gateway: paymentGateway,
          payment_transaction_id: paymentTransactionId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to add credits via API:', errorData);
        
        // Try to record purchase history for audit
        try {
          await supabase
            .from('credit_purchase_history')
            .insert({
              advisor_user_id: advisorUserId,
              credits_purchased: creditsToAdd,
              amount_paid: amountPaid,
              currency: currency,
              payment_gateway: paymentGateway,
              payment_transaction_id: paymentTransactionId,
              status: 'failed',
              metadata: { 
                error: errorData.error || errorData.details || 'API call failed',
                error_code: errorData.code || response.status.toString()
              } as any
            });
        } catch (historyError) {
          console.error('Could not record purchase history:', historyError);
        }
        
        return false;
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('Credits added successfully:', result.credits);
        return true;
      } else {
        console.error('API returned success=false:', result);
        return false;
      }
    } catch (error: any) {
      console.error('Error in addCredits:', error);
      
      // Try to record purchase history for audit
      try {
        await supabase
          .from('credit_purchase_history')
          .insert({
            advisor_user_id: advisorUserId,
            credits_purchased: creditsToAdd,
            amount_paid: amountPaid,
            currency: currency,
            payment_gateway: paymentGateway,
            payment_transaction_id: paymentTransactionId,
            status: 'failed'
          });
      } catch (historyError) {
        console.error('Could not record purchase history:', historyError);
      }
      return false;
    }
  }

  /**
   * Get credit purchase history
   */
  async getPurchaseHistory(advisorUserId: string): Promise<CreditPurchaseHistory[]> {
    try {
      console.log('🔍 getPurchaseHistory called with advisorUserId:', advisorUserId);
      
      const { data, error } = await supabase
        .from('credit_purchase_history')
        .select('*')
        .eq('advisor_user_id', advisorUserId)
        .order('purchased_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching purchase history:', error);
        console.error('❌ Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return [];
      }

      console.log('✅ Purchase history fetched:', data?.length || 0, 'records');
      if (data && data.length > 0) {
        console.log('📋 Purchase history sample:', data[0]);
      }
      
      return (data || []) as CreditPurchaseHistory[];
    } catch (error) {
      console.error('❌ Exception in getPurchaseHistory:', error);
      return [];
    }
  }

  /**
   * Assign credit to startup
   */
  async assignCredit(
    advisorUserId: string,
    startupUserId: string,
    enableAutoRenewal: boolean = true
  ): Promise<{ success: boolean; assignmentId?: string; error?: string; wasJustUpdatingAutoRenewal?: boolean }> {
    try {
      // Check if there's already an active assignment FIRST
      // If there is, we don't need credits - just update auto-renewal
      const existingAssignment = await this.getActiveAssignment(advisorUserId, startupUserId);
      if (existingAssignment) {
        // If there's an active assignment, just enable auto-renewal (no credit needed)
        const { error: updateError } = await supabase
          .from('advisor_credit_assignments')
          .update({ auto_renewal_enabled: enableAutoRenewal })
          .eq('id', existingAssignment.id);

        if (updateError) {
          console.error('Error updating auto-renewal:', updateError);
          return {
            success: false,
            error: 'Failed to update auto-renewal setting.'
          };
        }

        return {
          success: true,
          assignmentId: existingAssignment.id,
          wasJustUpdatingAutoRenewal: true
        };
      }

      // No active assignment - need to create new one or reactivate expired one
      // BUT FIRST: Check if startup already has active premium (from any source)
      // If yes, don't deduct credit
      const now = new Date();
      const nowISO = now.toISOString();
      
      // Check for active premium subscription (regardless of who paid)
      const { data: existingPremiumSubs } = await supabase
        .from('user_subscriptions')
        .select('id, status, current_period_end, plan_tier')
        .eq('user_id', startupUserId)
        .eq('status', 'active')
        .eq('plan_tier', 'premium')
        .gte('current_period_end', nowISO); // Not expired
      
      const hasActivePremium = existingPremiumSubs && existingPremiumSubs.length > 0;
      
      if (hasActivePremium) {
        console.log('⚠️ Startup already has active premium subscription. Skipping credit deduction.', {
          subscriptionsFound: existingPremiumSubs.length
        });
        return {
          success: false,
          error: 'Startup already has active premium subscription. No credit deducted.'
        };
      }
      
      // Check if advisor has available credits
      const credits = await this.getAdvisorCredits(advisorUserId);
      if (!credits || credits.credits_available < 1) {
        return {
          success: false,
          error: 'No credits available. Please purchase credits first.'
        };
      }

      // Check if there's an expired assignment - reuse it instead of creating new
      // (The unique constraint prevents multiple assignments per advisor-startup pair)
      const { data: expiredAssignment } = await supabase
        .from('advisor_credit_assignments')
        .select('*')
        .eq('advisor_user_id', advisorUserId)
        .eq('startup_user_id', startupUserId)
        .in('status', ['expired', 'cancelled'])
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Calculate dates (1 month from now)
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      let assignment;
      let assignmentError;

      if (expiredAssignment) {
        // Reuse expired assignment - update it to active
        const { data: updatedAssignment, error: updateError } = await supabase
          .from('advisor_credit_assignments')
          .update({
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            status: 'active',
            auto_renewal_enabled: enableAutoRenewal,
            expired_at: null
          })
          .eq('id', expiredAssignment.id)
          .select()
          .single();
        
        assignment = updatedAssignment;
        assignmentError = updateError;
      } else {
        // Create new credit assignment
        const { data: newAssignment, error: insertError } = await supabase
          .from('advisor_credit_assignments')
          .insert({
            advisor_user_id: advisorUserId,
            startup_user_id: startupUserId,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            status: 'active',
            auto_renewal_enabled: enableAutoRenewal
          })
          .select()
          .single();
        
        assignment = newAssignment;
        assignmentError = insertError;
      }

      if (assignmentError) {
        console.error('Error creating credit assignment:', assignmentError);
        console.error('Error details:', {
          code: assignmentError.code,
          message: assignmentError.message,
          details: assignmentError.details,
          hint: assignmentError.hint
        });
        
        // Check for specific error types
        if (assignmentError.code === '23505') {
          return {
            success: false,
            error: 'An active assignment already exists for this startup. Please wait for it to expire or disable auto-renewal first.'
          };
        }
        
        return {
          success: false,
          error: `Failed to create credit assignment: ${assignmentError.message || 'Unknown error'}`
        };
      }

      // Deduct credit from advisor
      const { error: deductError } = await supabase
        .from('advisor_credits')
        .update({
          credits_available: credits.credits_available - 1,
          credits_used: credits.credits_used + 1
        })
        .eq('advisor_user_id', advisorUserId);

      if (deductError) {
        console.error('Error deducting credit:', deductError);
        // Rollback assignment
        await supabase
          .from('advisor_credit_assignments')
          .delete()
          .eq('id', assignment.id);
        
        return {
          success: false,
          error: 'Failed to deduct credit.'
        };
      }

      // Create/update subscription for startup
      const subscriptionResult = await this.createStartupSubscription(
        startupUserId,
        advisorUserId,
        startDate,
        endDate,
        assignment.id
      );

      if (!subscriptionResult.success) {
        // Rollback assignment and credit deduction
        await supabase
          .from('advisor_credit_assignments')
          .delete()
          .eq('id', assignment.id);
        
        await supabase
          .from('advisor_credits')
          .update({
            credits_available: credits.credits_available,
            credits_used: credits.credits_used - 1
          })
          .eq('advisor_user_id', advisorUserId);

        return {
          success: false,
          error: subscriptionResult.error || 'Failed to create subscription.'
        };
      }

      // Update assignment with subscription ID
      if (subscriptionResult.subscriptionId) {
        await supabase
          .from('advisor_credit_assignments')
          .update({ subscription_id: subscriptionResult.subscriptionId })
          .eq('id', assignment.id);
      }

      return {
        success: true,
        assignmentId: assignment.id
      };
    } catch (error) {
      console.error('Error in assignCredit:', error);
      return {
        success: false,
        error: 'An unexpected error occurred.'
      };
    }
  }

  /**
   * Create or update startup subscription
   */
  private async createStartupSubscription(
    startupUserId: string,
    advisorUserId: string,
    startDate: Date,
    endDate: Date,
    assignmentId: string
  ): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    try {
      // Get Premium plan
      const { data: premiumPlan, error: planError } = await supabase
        .from('subscription_plans')
        .select('id, price, currency, plan_tier')
        .eq('plan_tier', 'premium')
        .eq('user_type', 'Startup')
        .eq('interval', 'monthly')
        .eq('is_active', true)
        .maybeSingle();

      if (planError || !premiumPlan) {
        return {
          success: false,
          error: 'Premium plan not found.'
        };
      }

      // Check if startup already has a subscription
      const { data: existingSubscription } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', startupUserId)
        .eq('status', 'active')
        .maybeSingle();

      let subscriptionId: string;

      if (existingSubscription) {
        // Update existing subscription
        const { data: updated, error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            plan_id: premiumPlan.id,
            plan_tier: 'premium',
            paid_by_advisor_id: advisorUserId,
            status: 'active',
            current_period_start: startDate.toISOString(),
            current_period_end: endDate.toISOString(),
            amount: premiumPlan.price,
            currency: premiumPlan.currency,
            interval: 'monthly',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSubscription.id)
          .select()
          .single();

        if (updateError) {
          return {
            success: false,
            error: 'Failed to update subscription.'
          };
        }

        subscriptionId = updated.id;
      } else {
        // Create new subscription
        const { data: newSubscription, error: insertError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: startupUserId,
            plan_id: premiumPlan.id,
            plan_tier: 'premium',
            paid_by_advisor_id: advisorUserId,
            status: 'active',
            current_period_start: startDate.toISOString(),
            current_period_end: endDate.toISOString(),
            amount: premiumPlan.price,
            currency: premiumPlan.currency,
            interval: 'monthly'
          })
          .select()
          .single();

        if (insertError) {
          return {
            success: false,
            error: 'Failed to create subscription.'
          };
        }

        subscriptionId = newSubscription.id;
      }

      return {
        success: true,
        subscriptionId
      };
    } catch (error) {
      console.error('Error in createStartupSubscription:', error);
      return {
        success: false,
        error: 'An unexpected error occurred.'
      };
    }
  }

  /**
   * Get active credit assignment for a startup
   */
  async getActiveAssignment(
    advisorUserId: string,
    startupUserId: string
  ): Promise<CreditAssignment | null> {
    try {
      const { data, error } = await supabase
        .from('advisor_credit_assignments')
        .select('*')
        .eq('advisor_user_id', advisorUserId)
        .eq('startup_user_id', startupUserId)
        .eq('status', 'active')
        .gt('end_date', new Date().toISOString())
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching active assignment:', error);
        return null;
      }

      return data as CreditAssignment | null;
    } catch (error) {
      console.error('Error in getActiveAssignment:', error);
      return null;
    }
  }

  /**
   * Get all active assignments for an advisor
   */
  async getAdvisorAssignments(advisorUserId: string): Promise<CreditAssignment[]> {
    try {
      const { data, error } = await supabase
        .from('advisor_credit_assignments')
        .select('*')
        .eq('advisor_user_id', advisorUserId)
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('Error fetching advisor assignments:', error);
        return [];
      }

      return (data || []) as CreditAssignment[];
    } catch (error) {
      console.error('Error in getAdvisorAssignments:', error);
      return [];
    }
  }

  /**
   * Toggle auto-renewal for an assignment
   */
  async toggleAutoRenewal(
    advisorUserId: string,
    startupUserId: string,
    enable: boolean
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('advisor_credit_assignments')
        .update({ auto_renewal_enabled: enable })
        .eq('advisor_user_id', advisorUserId)
        .eq('startup_user_id', startupUserId)
        .eq('status', 'active');

      if (error) {
        console.error('Error toggling auto-renewal:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in toggleAutoRenewal:', error);
      return false;
    }
  }

  /**
   * Disable auto-renewal (toggle OFF)
   * Plan continues until natural expiry date, but won't auto-renew
   */
  async cancelAssignment(
    advisorUserId: string,
    startupUserId: string
  ): Promise<boolean> {
    try {
      // Find the active assignment (even if expired, we want to disable auto-renewal)
      const { data: assignment, error: fetchError } = await supabase
        .from('advisor_credit_assignments')
        .select('*')
        .eq('advisor_user_id', advisorUserId)
        .eq('startup_user_id', startupUserId)
        .eq('status', 'active')
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (fetchError) {
        console.error('Error fetching assignment:', fetchError);
        return false;
      }

      if (!assignment) {
        // No active assignment - just return success
        return true;
      }

      // Only disable auto-renewal, don't expire the assignment
      // Plan will continue until end_date, but won't auto-renew
      const { error: updateError } = await supabase
        .from('advisor_credit_assignments')
        .update({
          auto_renewal_enabled: false
        })
        .eq('id', assignment.id);

      if (updateError) {
        console.error('Error disabling auto-renewal:', updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in cancelAssignment:', error);
      return false;
    }
  }

  /**
   * Process auto-renewal for expiring assignments
   * This should be called by a daily cron job
   */
  async processAutoRenewals(): Promise<{ renewed: number; failed: number }> {
    let renewed = 0;
    let failed = 0;

    try {
      // Find all assignments that are expiring and have auto-renewal enabled
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: expiringAssignments, error } = await supabase
        .from('advisor_credit_assignments')
        .select('*')
        .eq('status', 'active')
        .eq('auto_renewal_enabled', true)
        .lte('end_date', tomorrow.toISOString());

      if (error) {
        console.error('Error fetching expiring assignments:', error);
        return { renewed: 0, failed: 0 };
      }

      if (!expiringAssignments || expiringAssignments.length === 0) {
        return { renewed: 0, failed: 0 };
      }

      for (const assignment of expiringAssignments) {
        // Check if advisor has credits
        const credits = await this.getAdvisorCredits(assignment.advisor_user_id);
        if (!credits || credits.credits_available < 1) {
          // Mark as expired and notify advisor
          await supabase
            .from('advisor_credit_assignments')
            .update({
              status: 'expired',
              expired_at: new Date().toISOString(),
              auto_renewal_enabled: false
            })
            .eq('id', assignment.id);

          // Cancel subscription
          if (assignment.subscription_id) {
            await supabase
              .from('user_subscriptions')
              .update({ status: 'inactive' })
              .eq('id', assignment.subscription_id);
          }

          failed++;
          continue;
        }

        // Renew assignment
        const newStartDate = new Date(assignment.end_date);
        const newEndDate = new Date(newStartDate);
        newEndDate.setMonth(newEndDate.getMonth() + 1);

        // Mark old assignment as expired
        await supabase
          .from('advisor_credit_assignments')
          .update({
            status: 'expired',
            expired_at: new Date().toISOString()
          })
          .eq('id', assignment.id);

        // Create new assignment
        const result = await this.assignCredit(
          assignment.advisor_user_id,
          assignment.startup_user_id,
          true // Keep auto-renewal enabled
        );

        if (result.success) {
          renewed++;
        } else {
          failed++;
        }
      }

      return { renewed, failed };
    } catch (error) {
      console.error('Error in processAutoRenewals:', error);
      return { renewed, failed };
    }
  }

  /**
   * Expire old assignments (cleanup job)
   */
  async expireOldAssignments(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('advisor_credit_assignments')
        .update({
          status: 'expired',
          expired_at: new Date().toISOString()
        })
        .eq('status', 'active')
        .lt('end_date', new Date().toISOString())
        .select();

      if (error) {
        console.error('Error expiring old assignments:', error);
        return 0;
      }

      // Also update subscriptions
      if (data && data.length > 0) {
        for (const assignment of data) {
          if (assignment.subscription_id) {
            await supabase
              .from('user_subscriptions')
              .update({ status: 'inactive' })
              .eq('id', assignment.subscription_id);
          }
        }
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error in expireOldAssignments:', error);
      return 0;
    }
  }

  /**
   * Get subscription plans for a country
   */
  async getSubscriptionPlans(country: string): Promise<CreditSubscriptionPlan[]> {
    try {
      const normalizedCountry = country === 'India' ? 'India' : 'Global';
      
      const { data, error } = await supabase
        .from('credit_subscription_plans')
        .select('*')
        .eq('country', normalizedCountry)
        .eq('is_active', true)
        .order('credits_per_month', { ascending: true });

      if (error) {
        console.error('Error fetching subscription plans:', error);
        return [];
      }

      return (data || []) as CreditSubscriptionPlan[];
    } catch (error) {
      console.error('Error in getSubscriptionPlans:', error);
      return [];
    }
  }

  /**
   * Get active subscriptions for an advisor (can have multiple)
   */
  async getActiveSubscriptions(advisorUserId: string): Promise<AdvisorCreditSubscription[]> {
    try {
      const { data, error } = await supabase
        .from('advisor_credit_subscriptions')
        .select('*')
        .eq('advisor_user_id', advisorUserId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching active subscriptions:', error);
        return [];
      }

      return (data || []) as AdvisorCreditSubscription[];
    } catch (error) {
      console.error('Error in getActiveSubscriptions:', error);
      return [];
    }
  }

  /**
   * Get active subscription for an advisor (single - for backward compatibility)
   * @deprecated Use getActiveSubscriptions instead
   */
  async getActiveSubscription(advisorUserId: string): Promise<AdvisorCreditSubscription | null> {
    const subscriptions = await this.getActiveSubscriptions(advisorUserId);
    return subscriptions.length > 0 ? subscriptions[0] : null;
  }

  /**
   * Create a credit subscription (after payment gateway subscription is created)
   */
  async createSubscription(
    advisorUserId: string,
    planId: string,
    razorpaySubscriptionId?: string,
    paypalSubscriptionId?: string
  ): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    try {
      // Get plan details
      const { data: plan, error: planError } = await supabase
        .from('credit_subscription_plans')
        .select('*')
        .eq('id', planId)
        .eq('is_active', true)
        .single();

      if (planError || !plan) {
        return {
          success: false,
          error: 'Subscription plan not found.'
        };
      }

      // Allow multiple subscriptions - no need to check or cancel existing ones

      // Calculate billing period (monthly)
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Create subscription record with retry logic for 409 errors
      let subscription;
      let subscriptionError;
      
      // Try insert first
      const { data: insertData, error: insertError } = await supabase
        .from('advisor_credit_subscriptions')
        .insert({
          advisor_user_id: advisorUserId,
          plan_id: planId,
          credits_per_month: plan.credits_per_month,
          price_per_month: plan.price_per_month,
          currency: plan.currency,
          razorpay_subscription_id: razorpaySubscriptionId || null,
          paypal_subscription_id: paypalSubscriptionId || null,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          next_billing_date: periodEnd.toISOString(),
          billing_cycle_count: 0,
          total_paid: 0
        })
        .select()
        .single();

      if (insertError) {
        // If 409 error, might be RLS issue - try to fetch existing subscription
        if (insertError.status === 409 || insertError.code === '23505' || insertError.message?.includes('409')) {
          // Wait a bit and try to fetch
          await new Promise(resolve => setTimeout(resolve, 200));
          const { data: fetchedSubscription } = await supabase
            .from('advisor_credit_subscriptions')
            .select('*')
            .eq('advisor_user_id', advisorUserId)
            .eq('status', 'active')
            .maybeSingle();
          
          if (fetchedSubscription) {
            // Subscription already exists - return it
            return {
              success: true,
              subscriptionId: fetchedSubscription.id
            };
          }
          
          // If still can't find it, use RPC function to create subscription
          // This bypasses RLS issues by using SECURITY DEFINER
          const { data: rpcSubscription, error: rpcError } = await supabase.rpc('create_subscription', {
            p_advisor_user_id: advisorUserId,
            p_plan_id: planId,
            p_credits_per_month: plan.credits_per_month,
            p_price_per_month: plan.price_per_month,
            p_currency: plan.currency,
            p_razorpay_subscription_id: razorpaySubscriptionId || null,
            p_paypal_subscription_id: paypalSubscriptionId || null
          });
          
          if (rpcError) {
            subscriptionError = rpcError;
          } else {
            subscription = rpcSubscription;
          }
        } else {
          subscriptionError = insertError;
        }
      } else {
        subscription = insertData;
      }

      if (subscriptionError) {
        console.error('Error creating subscription:', subscriptionError);
        return {
          success: false,
          error: subscriptionError.message || 'Failed to create subscription. Please try again or contact support.'
        };
      }

      return {
        success: true,
        subscriptionId: subscription.id
      };
    } catch (error) {
      console.error('Error in createSubscription:', error);
      return {
        success: false,
        error: 'An unexpected error occurred.'
      };
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(advisorUserId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('advisor_credit_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('advisor_user_id', advisorUserId)
        .eq('status', 'active');

      if (error) {
        console.error('Error cancelling subscription:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in cancelSubscription:', error);
      return false;
    }
  }

  /**
   * Cancel a specific subscription by subscription ID
   */
  async cancelSubscriptionById(subscriptionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('advisor_credit_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)
        .eq('status', 'active');

      if (error) {
        console.error('Error cancelling subscription:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in cancelSubscriptionById:', error);
      return false;
    }
  }

  /**
   * Process subscription payment (called by webhook)
   * Adds credits to advisor account when payment succeeds
   */
  async processSubscriptionPayment(
    subscriptionId: string,
    paymentGateway: 'razorpay' | 'payaid',
    gatewaySubscriptionId: string,
    amount: number,
    currency: string,
    transactionId: string
  ): Promise<boolean> {
    try {
      // Find subscription by gateway subscription ID
      const subscriptionField = paymentGateway === 'razorpay' 
        ? 'razorpay_subscription_id' 
        : 'paypal_subscription_id';

      const { data: subscription, error: subError } = await supabase
        .from('advisor_credit_subscriptions')
        .select('*')
        .eq(subscriptionField, gatewaySubscriptionId)
        .eq('status', 'active')
        .single();

      if (subError || !subscription) {
        console.error('Subscription not found for payment:', subError);
        return false;
      }

      // Calculate next billing period
      const now = new Date();
      const currentPeriodEnd = new Date(subscription.current_period_end);
      const nextPeriodEnd = new Date(currentPeriodEnd);
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

      // Update subscription with new billing cycle
      const { error: updateError } = await supabase
        .from('advisor_credit_subscriptions')
        .update({
          current_period_start: currentPeriodEnd.toISOString(),
          current_period_end: nextPeriodEnd.toISOString(),
          next_billing_date: nextPeriodEnd.toISOString(),
          last_billing_date: now.toISOString(),
          billing_cycle_count: (subscription.billing_cycle_count || 0) + 1,
          total_paid: (subscription.total_paid || 0) + amount,
          updated_at: now.toISOString()
        })
        .eq('id', subscription.id);

      if (updateError) {
        console.error('Error updating subscription after payment:', updateError);
        return false;
      }

      // Add credits to advisor account
      const creditsAdded = await this.addCredits(
        subscription.advisor_user_id,
        subscription.credits_per_month,
        amount,
        currency,
        paymentGateway,
        transactionId
      );

      if (!creditsAdded) {
        console.error('Failed to add credits after subscription payment');
        return false;
      }

      // Record in purchase history as subscription payment
      const { error: historyError } = await supabase
        .from('credit_purchase_history')
        .insert({
          advisor_user_id: subscription.advisor_user_id,
          credits_purchased: subscription.credits_per_month,
          amount_paid: amount,
          currency: currency,
          payment_gateway: paymentGateway,
          payment_transaction_id: transactionId,
          status: 'completed',
          metadata: {
            subscription_id: subscription.id,
            billing_cycle: subscription.billing_cycle_count + 1,
            payment_type: 'subscription',
            purchase_type: 'subscription' // Also set purchase_type for consistency
          }
        });

      if (historyError) {
        console.error('❌ Error recording subscription purchase history:', historyError);
        console.error('❌ History error details:', {
          code: historyError.code,
          message: historyError.message,
          details: historyError.details,
          hint: historyError.hint
        });
      } else {
        console.log('✅ Subscription purchase history recorded successfully');
      }

      return true;
    } catch (error) {
      console.error('Error in processSubscriptionPayment:', error);
      return false;
    }
  }

  /**
   * Handle subscription payment failure
   */
  async handleSubscriptionPaymentFailure(
    paymentGateway: 'razorpay' | 'payaid',
    gatewaySubscriptionId: string
  ): Promise<boolean> {
    try {
      const subscriptionField = paymentGateway === 'razorpay' 
        ? 'razorpay_subscription_id' 
        : 'paypal_subscription_id';

      // Optionally pause subscription on payment failure
      // For now, we'll just log it - you can add logic to pause after N failures
      const { data: subscription } = await supabase
        .from('advisor_credit_subscriptions')
        .select('*')
        .eq(subscriptionField, gatewaySubscriptionId)
        .eq('status', 'active')
        .maybeSingle();

      if (subscription) {
        // Record failed payment attempt
        await supabase
          .from('credit_purchase_history')
          .insert({
            advisor_user_id: subscription.advisor_user_id,
            credits_purchased: 0,
            amount_paid: subscription.price_per_month,
            currency: subscription.currency,
            payment_gateway: paymentGateway,
            payment_transaction_id: null,
            status: 'failed',
            metadata: {
              subscription_id: subscription.id,
              failure_reason: 'Payment failed'
            }
          });
      }

      return true;
    } catch (error) {
      console.error('Error in handleSubscriptionPaymentFailure:', error);
      return false;
    }
  }
}

export const advisorCreditService = new AdvisorCreditService();
