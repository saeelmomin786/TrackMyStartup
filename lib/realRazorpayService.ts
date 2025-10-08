import { supabase } from './supabase';

// Real Razorpay Integration Service
export class RealRazorpayService {
  private keyId: string;
  private keySecret: string;
  private environment: 'test' | 'live';
  private isDevelopment: boolean;

  constructor() {
    // Get Razorpay configuration from environment or config
    this.keyId = (import.meta.env.VITE_RAZORPAY_KEY_ID as string) || 'rzp_live_RMzc3DoDdGLh9u';
    this.keySecret = (import.meta.env.VITE_RAZORPAY_KEY_SECRET as string) || 'IsYa9bHZOFX4f2vp44LNlDzJ';
    this.environment = (import.meta.env.VITE_RAZORPAY_ENVIRONMENT as 'test' | 'live') || 'live';
    
    // Environment variables loaded
    
    // Always use real Razorpay (no mock mode)
    this.isDevelopment = false;
    
    // Razorpay configured
  }

  // Create Razorpay order on server
  async createOrder(
    applicationId: string,
    amount: number,
    currency: string = 'INR',
    receipt?: string
  ): Promise<{ orderId: string; amount: number; currency: string }> {
    try {
      // Always use real Razorpay

      // Validate amount
      if (!amount || amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Create a REAL Razorpay order via backend API to avoid CORS and protect secret
      // Ensure receipt <= 40 chars per Razorpay validation
      const providedReceipt = receipt || `app_${applicationId.slice(0,8)}_${Date.now()}`;
      const safeReceipt = providedReceipt.length > 40 ? providedReceipt.slice(0, 40) : providedReceipt;

      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency,
          receipt: safeReceipt
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Razorpay order create failed: ${response.status} ${errText}`);
      }

      const order = await response.json();
      return { orderId: order.id, amount, currency };
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw error;
    }
  }

  // Initialize Razorpay payment
  async initializePayment(
    orderId: string,
    amount: number,
    currency: string,
    companyName: string,
    description: string,
    customerName: string,
    customerEmail: string,
    customerPhone: string,
    onSuccess: (response: any) => void,
    onError: (error: any) => void
  ): Promise<void> {
    // Always use real Razorpay

    return new Promise((resolve, reject) => {
      // Load Razorpay script if not already loaded
      if (!(window as any).Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          this.openRazorpayCheckout(
            orderId, amount, currency, companyName, description,
            customerName, customerEmail, customerPhone,
            onSuccess, onError, resolve, reject
          );
        };
        script.onerror = () => reject(new Error('Failed to load Razorpay script'));
        document.head.appendChild(script);
      } else {
        this.openRazorpayCheckout(
          orderId, amount, currency, companyName, description,
          customerName, customerEmail, customerPhone,
          onSuccess, onError, resolve, reject
        );
      }
    });
  }

  private openRazorpayCheckout(
    orderId: string,
    amount: number,
    currency: string,
    companyName: string,
    description: string,
    customerName: string,
    customerEmail: string,
    customerPhone: string,
    onSuccess: (response: any) => void,
    onError: (error: any) => void,
    resolve: (value: void) => void,
    reject: (reason?: any) => void
  ) {
    const options = {
      key: this.keyId,
      amount: amount * 100, // Razorpay expects amount in paise
      currency: currency,
      name: companyName,
      description: description,
      order_id: orderId,
      handler: async (response: any) => {
        try {
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature
            })
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.verified) {
            console.log('Payment successful:', response);
            onSuccess(response);
          } else {
            onError(new Error('Payment verification failed'));
          }
        } catch (e) {
          onError(e);
        } finally {
          resolve();
        }
      },
      prefill: {
        name: customerName,
        email: customerEmail,
        contact: customerPhone
      },
      theme: {
        color: '#3399cc'
      },
      modal: {
        ondismiss: () => {
          const error = new Error('Payment cancelled by user');
          onError(error);
          reject(error);
        }
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  }

  // Verify payment signature
  async verifyPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<boolean> {
    try {
      // Always use real Razorpay verification

      const { data, error } = await supabase
        .rpc('verify_razorpay_payment', {
          p_order_id: razorpayOrderId,
          p_payment_id: razorpayPaymentId,
          p_signature: razorpaySignature
        });

      if (error) throw error;
      
      return data?.verified || false;
    } catch (error) {
      console.error('Error verifying payment:', error);
      return false;
    }
  }

  // Update payment status
  async updatePaymentStatus(
    applicationId: string,
    paymentId: string,
    status: 'paid' | 'failed' | 'refunded',
    razorpayPaymentId?: string
  ): Promise<void> {
    try {
      // Always use real Razorpay

      const { error } = await supabase
        .from('opportunity_applications')
        .update({
          payment_status: status,
          payment_id: razorpayPaymentId || paymentId,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const realRazorpayService = new RealRazorpayService();
