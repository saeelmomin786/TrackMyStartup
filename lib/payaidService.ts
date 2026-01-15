import { supabase } from './supabase';

/**
 * PayAid Payment Service
 * Handles payment processing for international users (non-India)
 * 
 * Note: This service structure is ready for PayAid API integration
 * Update API endpoints and authentication once PayAid credentials are available
 */

const PAYAID_API_KEY = import.meta.env.VITE_PAYAID_API_KEY;
const PAYAID_SECRET = import.meta.env.VITE_PAYAID_SECRET;
const PAYAID_BASE_URL = import.meta.env.VITE_PAYAID_BASE_URL || 'https://api.payaid.com';

// Types
export interface PayAidOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customer_id?: string;
}

export interface PayAidPaymentResponse {
  payment_id: string;
  order_id: string;
  status: 'success' | 'failed' | 'pending';
  signature?: string;
}

export interface PayAidSubscription {
  id: string;
  customer_id: string;
  plan_id: string;
  status: string;
  amount: number;
  currency: string;
}

class PayAidService {
  /**
   * Get authentication headers for PayAid API
   */
  private getAuthHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PAYAID_API_KEY}`,
      'X-API-Secret': PAYAID_SECRET || ''
    };
  }

  /**
   * Create a payment order
   * @param amount - Amount in EUR (in smallest currency unit, e.g., cents)
   * @param currency - Currency code (EUR)
   * @param customerId - Customer ID
   * @param metadata - Additional metadata
   */
  async createOrder(
    amount: number,
    currency: string = 'EUR',
    customerId?: string,
    metadata?: Record<string, any>
  ): Promise<PayAidOrder> {
    try {
      const response = await fetch(`${PAYAID_BASE_URL}/api/v1/orders`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          amount,
          currency,
          customer_id: customerId,
          metadata: metadata || {},
          description: 'Track My Startup Subscription'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PayAid order creation failed: ${errorText}`);
      }

      const order = await response.json();
      return order;
    } catch (error) {
      console.error('Error creating PayAid order:', error);
      throw error;
    }
  }

  /**
   * Create a subscription
   * @param customerId - Customer ID
   * @param planId - Plan ID
   * @param amount - Amount in EUR
   * @param interval - Billing interval (monthly, yearly)
   */
  async createSubscription(
    customerId: string,
    planId: string,
    amount: number,
    interval: 'monthly' | 'yearly' = 'monthly'
  ): Promise<PayAidSubscription> {
    try {
      const response = await fetch(`${PAYAID_BASE_URL}/api/v1/subscriptions`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          customer_id: customerId,
          plan_id: planId,
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'EUR',
          interval,
          auto_renew: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PayAid subscription creation failed: ${errorText}`);
      }

      const subscription = await response.json();
      return subscription;
    } catch (error) {
      console.error('Error creating PayAid subscription:', error);
      throw error;
    }
  }

  /**
   * Verify payment signature
   * @param paymentId - Payment ID
   * @param orderId - Order ID
   * @param signature - Payment signature
   */
  async verifyPayment(
    paymentId: string,
    orderId: string,
    signature?: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${PAYAID_BASE_URL}/api/v1/payments/${paymentId}/verify`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          order_id: orderId,
          signature
        })
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.verified === true;
    } catch (error) {
      console.error('Error verifying PayAid payment:', error);
      return false;
    }
  }

  /**
   * Get payment status
   * @param paymentId - Payment ID
   */
  async getPaymentStatus(paymentId: string): Promise<PayAidPaymentResponse | null> {
    try {
      const response = await fetch(`${PAYAID_BASE_URL}/api/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        return null;
      }

      const payment = await response.json();
      return payment;
    } catch (error) {
      console.error('Error getting PayAid payment status:', error);
      return null;
    }
  }

  /**
   * Create or get customer
   * @param userId - User ID
   * @param email - User email
   * @param name - User name
   */
  async getOrCreateCustomer(
    userId: string,
    email: string,
    name?: string
  ): Promise<string> {
    try {
      // Check if customer already exists in our database
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('gateway_customer_id')
        .eq('user_id', userId)
        .not('gateway_customer_id', 'is', null)
        .limit(1)
        .maybeSingle();

      if (subscription?.gateway_customer_id) {
        return subscription.gateway_customer_id;
      }

      // Create new customer in PayAid
      const response = await fetch(`${PAYAID_BASE_URL}/api/v1/customers`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          email,
          name: name || email,
          metadata: {
            user_id: userId
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PayAid customer creation failed: ${errorText}`);
      }

      const customer = await response.json();
      
      // Store customer ID in database
      await this.storeCustomerId(userId, customer.id);
      
      return customer.id;
    } catch (error) {
      console.error('Error getting/creating PayAid customer:', error);
      throw error;
    }
  }

  /**
   * Store customer ID in database
   */
  private async storeCustomerId(userId: string, customerId: string): Promise<void> {
    try {
      // Update or insert in user_subscriptions
      const { data: existing } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_subscriptions')
          .update({ gateway_customer_id: customerId })
          .eq('id', existing.id);
      }
    } catch (error) {
      console.error('Error storing customer ID:', error);
    }
  }

  /**
   * Cancel subscription
   * @param subscriptionId - PayAid subscription ID
   */
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${PAYAID_BASE_URL}/api/v1/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      return response.ok;
    } catch (error) {
      console.error('Error cancelling PayAid subscription:', error);
      return false;
    }
  }

  /**
   * Verify webhook signature
   * @param payload - Webhook payload
   * @param signature - Webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    // Implement PayAid webhook signature verification
    // This will depend on PayAid's webhook signature algorithm
    // For now, return true (should be implemented based on PayAid docs)
    try {
      // TODO: Implement actual signature verification
      // const expectedSignature = crypto.createHmac('sha256', PAYAID_WEBHOOK_SECRET)
      //   .update(payload)
      //   .digest('hex');
      // return signature === expectedSignature;
      return true;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }
}

// Export singleton instance
export const payaidService = new PayAidService();
