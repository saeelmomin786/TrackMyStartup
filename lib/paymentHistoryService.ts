import { supabase } from './supabase';

/**
 * Payment History Service
 * Handles payment transactions and billing cycles
 */

export interface PaymentTransaction {
  id: string;
  user_id: string;
  subscription_id: string | null;
  payment_gateway: 'razorpay' | 'payaid' | 'paypal';
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  amount: number; // Always in INR
  currency: string; // Always 'INR'
  base_amount_eur: number | null;
  locked_amount_inr: number | null;
  status: 'pending' | 'success' | 'failed' | 'refunded' | 'cancelled';
  payment_type: 'initial' | 'recurring' | 'upgrade' | 'downgrade' | 'manual';
  payment_method: string | null;
  billing_cycle_number: number | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  plan_tier: 'free' | 'basic' | 'premium';
  plan_tier_before: string | null;
  plan_tier_after: string | null;
  is_autopay: boolean;
  autopay_mandate_id: string | null;
  failure_reason: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
}

export interface BillingCycle {
  id: string;
  subscription_id: string;
  cycle_number: number;
  period_start: string;
  period_end: string;
  payment_transaction_id: string | null;
  amount: number; // Always in INR
  currency: string; // Always 'INR'
  status: 'pending' | 'paid' | 'failed' | 'skipped';
  plan_tier: 'free' | 'basic' | 'premium';
  locked_amount_inr: number | null;
  is_autopay: boolean;
  autopay_attempted_at: string | null;
  created_at: string;
  updated_at: string;
}

export class PaymentHistoryService {
  /**
   * Get payment history for a user
   */
  async getPaymentHistory(
    userId: string,
    limit: number = 50
  ): Promise<PaymentTransaction[]> {
    try {
      console.log('🔍 PaymentHistoryService.getPaymentHistory - userId:', userId);
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching payment history:', error);
        return [];
      }

      console.log('✅ PaymentHistoryService.getPaymentHistory - Found', data?.length || 0, 'transactions');
      if (data && data.length > 0) {
        console.log('📋 Payment transactions:', data.map(t => ({
          id: t.id,
          payment_gateway: t.payment_gateway,
          amount: t.amount,
          currency: t.currency,
          status: t.status,
          payment_type: t.payment_type
        })));
      }

      return (data || []) as PaymentTransaction[];
    } catch (error) {
      console.error('❌ Error in getPaymentHistory:', error);
      return [];
    }
  }

  /**
   * Get billing cycles for a subscription
   */
  async getBillingCycles(
    subscriptionId: string
  ): Promise<BillingCycle[]> {
    try {
      const { data, error } = await supabase
        .from('billing_cycles')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .order('cycle_number', { ascending: false });

      if (error) {
        console.error('Error fetching billing cycles:', error);
        return [];
      }

      return (data || []) as BillingCycle[];
    } catch (error) {
      console.error('Error in getBillingCycles:', error);
      return [];
    }
  }

  /**
   * Get all billing cycles for a user (across all subscriptions - active and inactive)
   * This ensures history is preserved when upgrading/downgrading
   */
  async getAllBillingCyclesForUser(
    userId: string
  ): Promise<BillingCycle[]> {
    try {
      console.log('🔍 PaymentHistoryService.getAllBillingCyclesForUser - userId:', userId);
      // Get all subscriptions for the user (active and inactive)
      const { data: subscriptions, error: subError } = await supabase
        .from('user_subscriptions')
        .select('id, payment_gateway, status')
        .eq('user_id', userId);

      if (subError) {
        console.error('❌ Error fetching user subscriptions:', subError);
        return [];
      }

      console.log('📋 Found', subscriptions?.length || 0, 'subscriptions for user');
      if (subscriptions && subscriptions.length > 0) {
        console.log('📋 Subscriptions:', subscriptions.map(s => ({
          id: s.id,
          payment_gateway: s.payment_gateway,
          status: s.status
        })));
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log('⚠️ No subscriptions found for user');
        return [];
      }

      const subscriptionIds = subscriptions.map(sub => sub.id);

      // Get all billing cycles for all user subscriptions
      const { data, error } = await supabase
        .from('billing_cycles')
        .select('*')
        .in('subscription_id', subscriptionIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching all billing cycles:', error);
        return [];
      }

      console.log('✅ PaymentHistoryService.getAllBillingCyclesForUser - Found', data?.length || 0, 'billing cycles');
      if (data && data.length > 0) {
        console.log('📋 Billing cycles:', data.map(c => ({
          id: c.id,
          cycle_number: c.cycle_number,
          amount: c.amount,
          currency: c.currency,
          status: c.status
        })));
      }

      return (data || []) as BillingCycle[];
    } catch (error) {
      console.error('❌ Error in getAllBillingCyclesForUser:', error);
      return [];
    }
  }

  /**
   * Get a specific payment transaction
   */
  async getPaymentTransaction(transactionId: string): Promise<PaymentTransaction | null> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error) {
        console.error('Error fetching payment transaction:', error);
        return null;
      }

      return data as PaymentTransaction;
    } catch (error) {
      console.error('Error in getPaymentTransaction:', error);
      return null;
    }
  }

  /**
   * Create a payment transaction record
   */
  async createPaymentTransaction(
    transaction: Partial<PaymentTransaction>
  ): Promise<PaymentTransaction | null> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .insert(transaction)
        .select()
        .single();

      if (error) {
        console.error('Error creating payment transaction:', error);
        return null;
      }

      return data as PaymentTransaction;
    } catch (error) {
      console.error('Error in createPaymentTransaction:', error);
      return null;
    }
  }

  /**
   * Update payment transaction status
   */
  async updatePaymentStatus(
    transactionId: string,
    status: 'pending' | 'success' | 'failed' | 'refunded' | 'cancelled',
    gatewayPaymentId?: string,
    paidAt?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (gatewayPaymentId) {
        updateData.gateway_payment_id = gatewayPaymentId;
      }

      if (paidAt) {
        updateData.paid_at = paidAt;
      } else if (status === 'success') {
        updateData.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('payment_transactions')
        .update(updateData)
        .eq('id', transactionId);

      if (error) {
        console.error('Error updating payment status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updatePaymentStatus:', error);
      return false;
    }
  }

  /**
   * Create a billing cycle
   */
  async createBillingCycle(
    cycle: Partial<BillingCycle>
  ): Promise<BillingCycle | null> {
    try {
      const { data, error } = await supabase
        .from('billing_cycles')
        .insert(cycle)
        .select()
        .single();

      if (error) {
        console.error('Error creating billing cycle:', error);
        return null;
      }

      return data as BillingCycle;
    } catch (error) {
      console.error('Error in createBillingCycle:', error);
      return null;
    }
  }

  /**
   * Update billing cycle status
   */
  async updateBillingCycleStatus(
    cycleId: string,
    status: 'pending' | 'paid' | 'failed' | 'skipped',
    paymentTransactionId?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (paymentTransactionId) {
        updateData.payment_transaction_id = paymentTransactionId;
      }

      const { error } = await supabase
        .from('billing_cycles')
        .update(updateData)
        .eq('id', cycleId);

      if (error) {
        console.error('Error updating billing cycle status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateBillingCycleStatus:', error);
      return false;
    }
  }
}

// Export singleton instance
export const paymentHistoryService = new PaymentHistoryService();
