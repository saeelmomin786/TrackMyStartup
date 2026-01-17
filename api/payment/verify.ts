import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function json(res: VercelResponse, status: number, data: unknown): void {
  res.status(status).json(data);
}

async function addAdvisorCredits(
  supabase: ReturnType<typeof createClient>,
  advisorUserId: string,
  creditsToAdd: number,
  amountPaid: number,
  currency: string,
  paymentGateway: string,
  paymentTransactionId: string
): Promise<{ success: boolean; error?: string; credits?: any }> {
  try {
    console.log('🔄 Adding credits via RPC for advisor:', advisorUserId);

    // Call RPC function to increment credits
    const { data: incrementedCredits, error: rpcError } = await supabase.rpc('increment_advisor_credits', {
      p_advisor_user_id: advisorUserId,
      p_credits_to_add: creditsToAdd,
      p_amount_paid: amountPaid,
      p_currency: currency
    });

    if (rpcError) {
      console.error('❌ RPC Error adding credits:', {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint
      });

      // Try to record failed purchase for audit
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
              error: rpcError.message,
              code: rpcError.code
            }
          });
      } catch (historyError) {
        console.error('Could not record failed purchase history:', historyError);
      }

      return { 
        success: false,
        error: rpcError.message
      };
    }

    console.log('✅ Credits incremented successfully:', incrementedCredits);

    // Record purchase history (success)
    const { error: historyError } = await supabase
      .from('credit_purchase_history')
      .insert({
        advisor_user_id: advisorUserId,
        credits_purchased: creditsToAdd,
        amount_paid: amountPaid,
        currency: currency,
        payment_gateway: paymentGateway,
        payment_transaction_id: paymentTransactionId,
        status: 'completed',
        metadata: {
          credits_available: incrementedCredits?.credits_available,
          credits_used: incrementedCredits?.credits_used,
          credits_purchased: incrementedCredits?.credits_purchased
        }
      });

    if (historyError) {
      console.error('⚠️ Warning: Could not record purchase history:', historyError);
      // Don't fail - credits were added successfully
    } else {
      console.log('✅ Purchase history recorded');
    }

    return { 
      success: true,
      credits: incrementedCredits
    };
  } catch (error: any) {
    console.error('❌ Error in addAdvisorCredits:', error);
    return { 
      success: false,
      error: error.message 
    };
  }
}

async function completeMentorPayment(
  supabase: ReturnType<typeof createClient>,
  assignmentId: number,
  paymentId: string,
  isRazorpay: boolean
): Promise<boolean> {
  try {
    const { data: assignment } = await supabase
      .from('mentor_startup_assignments')
      .select('*')
      .eq('id', assignmentId)
      .single();

    if (!assignment) return false;

    const updateData: any = {
      payment_status: 'completed',
      payment_date: new Date().toISOString(),
    };

    if (isRazorpay) {
      updateData.razorpay_payment_id = paymentId;
    } else {
      updateData.paypal_order_id = paymentId;
    }

    await supabase.from('mentor_payments').update(updateData).eq('assignment_id', assignmentId);

    const assignmentUpdateData: any = { payment_status: 'completed' };
    if (assignment.status === 'pending_payment') {
      assignmentUpdateData.status = 'ready_for_activation';
    } else if (assignment.status === 'pending_payment_and_agreement' && assignment.agreement_status === 'approved') {
      assignmentUpdateData.status = 'ready_for_activation';
    }

    await supabase.from('mentor_startup_assignments').update(assignmentUpdateData).eq('id', assignmentId);
    return true;
  } catch (error) {
    console.error('Error completing mentor payment:', error);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  try {
    // ADVISOR CREDITS ENDPOINT
    // Handle advisor credit addition (consolidated from /api/advisor/credits/add)
    if (req.body.endpoint === 'advisor-credits-add' || req.body.advisor_user_id) {
      const {
        advisor_user_id,
        credits_to_add,
        amount_paid,
        currency,
        payment_gateway,
        payment_transaction_id
      } = req.body;

      // Validate required fields
      if (!advisor_user_id || !credits_to_add || !amount_paid || !currency || !payment_gateway || !payment_transaction_id) {
        console.error('Missing required fields for advisor credits:', {
          has_advisor_user_id: !!advisor_user_id,
          has_credits_to_add: !!credits_to_add,
          has_amount_paid: !!amount_paid,
          has_currency: !!currency,
          has_payment_gateway: !!payment_gateway,
          has_payment_transaction_id: !!payment_transaction_id
        });
        return json(res, 400, {
          error: 'Missing required fields',
          required: ['advisor_user_id', 'credits_to_add', 'amount_paid', 'currency', 'payment_gateway', 'payment_transaction_id']
        });
      }

      // Initialize Supabase
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        return json(res, 500, { error: 'Server configuration error' });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const result = await addAdvisorCredits(
        supabase,
        advisor_user_id,
        credits_to_add,
        amount_paid,
        currency,
        payment_gateway,
        payment_transaction_id
      );

      if (!result.success) {
        return json(res, 500, { 
          error: 'Failed to add credits',
          details: result.error
        });
      }

      return json(res, 200, {
        success: true,
        credits: result.credits,
        message: `Successfully added ${credits_to_add} credits to advisor account`
      });
    }

    // PAYMENT VERIFICATION ENDPOINTS
    const { provider } = req.body as { provider?: 'razorpay' | 'paypal' };

    // Auto-detect provider from request body
    let detectedProvider: 'razorpay' | 'paypal' = provider || 'razorpay';
    if (!provider) {
      if (req.body.razorpay_payment_id || req.body.razorpay_order_id || req.body.razorpay_signature) {
        detectedProvider = 'razorpay';
      } else if (req.body.paypal_order_id || req.body.paypal_payer_id) {
        detectedProvider = 'paypal';
      }
    }

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return json(res, 500, { error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // RAZORPAY VERIFICATION
    if (detectedProvider === 'razorpay') {
      const {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_subscription_id,
        razorpay_signature,
        assignment_id,
        user_id,
        plan_id,
        amount,
        currency = 'INR',
        tax_percentage,
        tax_amount,
        total_amount_with_tax,
        interval = 'monthly',
        country,
      } = req.body as {
        razorpay_payment_id?: string;
        razorpay_order_id?: string;
        razorpay_subscription_id?: string;
        razorpay_signature?: string;
        assignment_id?: number;
        user_id?: string;
        plan_id?: number;
        amount?: number;
        currency?: string;
        tax_percentage?: number;
        tax_amount?: number;
        total_amount_with_tax?: number;
        interval?: string;
        country?: string;
      };

      if (!razorpay_payment_id || !razorpay_signature) {
        return json(res, 400, { error: 'Missing payment verification data' });
      }

      // For subscription payments, order_id might be missing - use subscription_id instead
      const orderOrSubscriptionId = razorpay_order_id || razorpay_subscription_id;
      if (!orderOrSubscriptionId) {
        return json(res, 400, { error: 'Missing order_id or subscription_id for payment verification' });
      }

      const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) {
        return json(res, 500, { error: 'Razorpay secret not configured' });
      }

      // Verify signature - try multiple formats for subscription payments
      let expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderOrSubscriptionId}|${razorpay_payment_id}`)
        .digest('hex');

      let signatureValid = expectedSignature === razorpay_signature;

      // If first format fails and we have subscription_id, try payment_id only
      if (!signatureValid && razorpay_subscription_id) {
        const altSignature = crypto
          .createHmac('sha256', keySecret)
          .update(razorpay_payment_id)
          .digest('hex');
        if (altSignature === razorpay_signature) {
          signatureValid = true;
        }
      }

      if (!signatureValid) {
        // For subscription payments, log warning but proceed
        if (razorpay_subscription_id) {
          console.warn('⚠️ Subscription payment signature verification failed, but proceeding');
        } else {
          return json(res, 400, { error: 'Invalid payment signature' });
        }
      }

      // Check if this is a mentor payment (only for one-time orders, not subscriptions)
      if (razorpay_order_id && !razorpay_subscription_id) {
        const { data: mentorPayment } = await supabase
          .from('mentor_payments')
          .select('*, assignment_id')
          .eq('razorpay_order_id', razorpay_order_id)
          .maybeSingle();

        if (mentorPayment) {
          const success = await completeMentorPayment(supabase, mentorPayment.assignment_id, razorpay_payment_id, true);
          if (success) {
            return json(res, 200, {
              success: true,
              message: 'Mentor payment verified and completed',
              payment_id: razorpay_payment_id,
            });
          }
          return json(res, 500, { error: 'Failed to complete mentor payment' });
        }
      }

      // Handle subscription payment persistence (if user_id and plan_id provided)
      if (user_id && plan_id && razorpay_subscription_id) {
        try {
          // Get plan_tier from plan_id
          let planTier = 'free';
          const { data: planData } = await supabase
            .from('subscription_plans')
            .select('plan_tier, name, currency, price')
            .eq('id', plan_id)
            .maybeSingle();

          if (planData?.plan_tier) {
            planTier = planData.plan_tier;
          }

          const finalAmount = typeof total_amount_with_tax === 'number' && total_amount_with_tax > 0
            ? total_amount_with_tax
            : (typeof amount === 'number' ? amount : planData?.price || 0);

          // Record payment transaction
          const { data: paymentRow } = await supabase
            .from('payment_transactions')
            .insert({
              user_id,
              payment_gateway: 'razorpay',
              gateway_order_id: razorpay_subscription_id,
              gateway_payment_id: razorpay_payment_id,
              gateway_signature: razorpay_signature,
              amount: finalAmount,
              currency: currency || planData?.currency || 'INR',
              status: 'success',
              payment_type: 'initial',
              plan_tier: planTier,
              is_autopay: true,
              autopay_mandate_id: razorpay_subscription_id,
              metadata: {
                tax_percentage: tax_percentage ?? null,
                tax_amount: tax_amount ?? null,
                total_amount_with_tax: total_amount_with_tax ?? null,
              },
            })
            .select()
            .single();

          // Create subscription
          const now = new Date();
          const periodEnd = new Date(now);
          if (interval === 'yearly') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          }

          const { data: subRow } = await supabase
            .from('user_subscriptions')
            .insert({
              user_id,
              plan_id,
              status: 'active',
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              amount: finalAmount,
              currency: currency || planData?.currency || 'INR',
              interval: interval || 'monthly',
              is_in_trial: false,
              razorpay_subscription_id,
              payment_gateway: 'razorpay',
              autopay_enabled: true,
              mandate_status: 'active',
              billing_cycle_count: 1,
              total_paid: finalAmount,
              last_billing_date: now.toISOString(),
              next_billing_date: periodEnd.toISOString(),
              locked_amount_inr: currency === 'INR' ? finalAmount : null,
              country: country || null,
            })
            .select()
            .single();

          if (subRow && paymentRow) {
            // Link payment to subscription
            await supabase
              .from('payment_transactions')
              .update({ subscription_id: subRow.id })
              .eq('id', paymentRow.id);

            // Create billing cycle
            await supabase.from('billing_cycles').insert({
              subscription_id: subRow.id,
              cycle_number: 1,
              period_start: now.toISOString(),
              period_end: periodEnd.toISOString(),
              payment_transaction_id: paymentRow.id,
              amount: finalAmount,
              currency: currency || 'INR',
              status: 'paid',
              plan_tier: planTier,
              is_autopay: true,
            });
          }
        } catch (persistErr) {
          console.error('Subscription persistence error:', persistErr);
        }
      }

      return json(res, 200, { success: true, message: 'Payment verified' });
    }

    // PAYPAL VERIFICATION
    if (detectedProvider === 'paypal') {
      const {
        paypal_order_id,
        paypal_subscription_id,
        paypal_payer_id,
        assignment_id,
        user_id,
        plan_id,
        amount,
        currency = 'EUR',
        tax_percentage,
        tax_amount,
        total_amount_with_tax,
        interval = 'monthly',
        country,
      } = req.body as {
        paypal_order_id?: string;
        paypal_subscription_id?: string;
        paypal_payer_id?: string;
        assignment_id?: number;
        user_id?: string;
        plan_id?: number;
        amount?: number;
        currency?: string;
        tax_percentage?: number;
        tax_amount?: number;
        total_amount_with_tax?: number;
        interval?: string;
        country?: string;
      };

      const clientId = process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.VITE_PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return json(res, 500, { error: 'PayPal credentials not configured' });
      }

      const isProduction =
        process.env.PAYPAL_ENVIRONMENT === 'production' ||
        process.env.VITE_PAYPAL_ENVIRONMENT === 'production';
      const baseUrl = isProduction ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

      // Get access token
      const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        },
        body: 'grant_type=client_credentials',
      });

      if (!tokenResponse.ok) {
        return json(res, 500, { error: 'Failed to get PayPal access token' });
      }

      const tokenData = (await tokenResponse.json()) as { access_token: string };
      const accessToken = tokenData.access_token;

      // Handle PayPal subscription verification
      if (paypal_subscription_id) {
        if (!paypal_subscription_id) {
          return json(res, 400, { error: 'Missing PayPal subscription ID' });
        }

        const subscriptionResponse = await fetch(`${baseUrl}/v1/billing/subscriptions/${paypal_subscription_id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!subscriptionResponse.ok) {
          return json(res, 400, { error: 'Invalid PayPal subscription' });
        }

        const subscriptionData = (await subscriptionResponse.json()) as { status: string };
        if (subscriptionData.status !== 'ACTIVE' && subscriptionData.status !== 'APPROVAL_PENDING') {
          return json(res, 400, { error: 'Subscription not active', status: subscriptionData.status });
        }

        // Persist subscription if user_id and plan_id provided
        if (user_id && plan_id) {
          try {
            let planTier = 'free';
            const { data: planData } = await supabase
              .from('subscription_plans')
              .select('plan_tier, name, currency, price')
              .eq('id', plan_id)
              .maybeSingle();

            if (planData?.plan_tier) {
              planTier = planData.plan_tier;
            }

            const finalAmount = typeof total_amount_with_tax === 'number' && total_amount_with_tax > 0
              ? total_amount_with_tax
              : (typeof amount === 'number' ? amount : planData?.price || 0);

            // Deactivate existing subscriptions
            await supabase
              .from('user_subscriptions')
              .update({ status: 'inactive', updated_at: new Date().toISOString() })
              .eq('user_id', user_id)
              .eq('status', 'active');

            const now = new Date();
            const periodEnd = new Date(now);
            if (interval === 'yearly') {
              periodEnd.setFullYear(periodEnd.getFullYear() + 1);
            } else {
              periodEnd.setMonth(periodEnd.getMonth() + 1);
            }

            const { data: subRow } = await supabase
              .from('user_subscriptions')
              .insert({
                user_id,
                plan_id,
                status: 'active',
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                amount: finalAmount,
                currency: currency || planData?.currency || 'EUR',
                interval: interval || 'monthly',
                is_in_trial: false,
                paypal_subscription_id,
                payment_gateway: 'paypal',
                autopay_enabled: true,
                mandate_status: 'active',
                billing_cycle_count: 1,
                total_paid: finalAmount,
                last_billing_date: now.toISOString(),
                next_billing_date: periodEnd.toISOString(),
                country: country || null,
              })
              .select()
              .single();

            if (subRow) {
              // Record payment transaction
              await supabase.from('payment_transactions').insert({
                user_id,
                subscription_id: subRow.id,
                payment_gateway: 'paypal',
                gateway_order_id: paypal_subscription_id,
                gateway_payment_id: paypal_subscription_id,
                amount: finalAmount,
                currency: currency || 'EUR',
                status: 'success',
                payment_type: 'initial',
                plan_tier: planTier,
                is_autopay: true,
                autopay_mandate_id: paypal_subscription_id,
                metadata: {
                  tax_percentage: tax_percentage ?? null,
                  tax_amount: tax_amount ?? null,
                  total_amount_with_tax: total_amount_with_tax ?? null,
                },
              });
            }
          } catch (persistErr) {
            console.error('PayPal subscription persistence error:', persistErr);
          }
        }

        return json(res, 200, { success: true, message: 'PayPal subscription verified' });
      }

      // Handle PayPal one-time order verification
      if (!paypal_order_id) {
        return json(res, 400, { error: 'Missing PayPal order ID' });
      }

      // Get order details
      const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders/${paypal_order_id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!orderResponse.ok) {
        return json(res, 400, { error: 'Invalid PayPal order' });
      }

      const orderData = (await orderResponse.json()) as { status: string };
      if (orderData.status !== 'COMPLETED') {
        // Try to capture
        const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${paypal_order_id}/capture`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!captureResponse.ok) {
          return json(res, 400, { error: 'Failed to capture PayPal payment' });
        }
      }

      // Check if this is a mentor payment
      const { data: mentorPayment } = await supabase
        .from('mentor_payments')
        .select('*, assignment_id')
        .eq('paypal_order_id', paypal_order_id)
        .maybeSingle();

      if (mentorPayment) {
        const success = await completeMentorPayment(supabase, mentorPayment.assignment_id, paypal_order_id, false);
        if (success) {
          return json(res, 200, {
            success: true,
            message: 'Mentor payment verified and completed',
            payment_id: paypal_order_id,
          });
        }
        return json(res, 500, { error: 'Failed to complete mentor payment' });
      }

      // Handle one-time payment persistence (if user_id and plan_id provided)
      if (user_id && plan_id) {
        try {
          let planTier = 'free';
          const { data: planData } = await supabase
            .from('subscription_plans')
            .select('plan_tier, name, currency, price')
            .eq('id', plan_id)
            .maybeSingle();

          if (planData?.plan_tier) {
            planTier = planData.plan_tier;
          }

          const finalAmount = typeof total_amount_with_tax === 'number' && total_amount_with_tax > 0
            ? total_amount_with_tax
            : (typeof amount === 'number' ? amount : planData?.price || 0);

          const now = new Date();
          const periodEnd = new Date(now);
          if (interval === 'yearly') {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          }

          const { data: subRow } = await supabase
            .from('user_subscriptions')
            .insert({
              user_id,
              plan_id,
              status: 'active',
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              amount: finalAmount,
              currency: currency || planData?.currency || 'EUR',
              interval: interval || 'monthly',
              is_in_trial: false,
              payment_gateway: 'paypal',
              autopay_enabled: false,
              billing_cycle_count: 1,
              total_paid: finalAmount,
              last_billing_date: now.toISOString(),
              next_billing_date: periodEnd.toISOString(),
              country: country || null,
            })
            .select()
            .single();

          if (subRow) {
            await supabase.from('payment_transactions').insert({
              user_id,
              subscription_id: subRow.id,
              payment_gateway: 'paypal',
              gateway_order_id: paypal_order_id,
              gateway_payment_id: paypal_order_id,
              amount: finalAmount,
              currency: currency || 'EUR',
              status: 'success',
              payment_type: 'initial',
              plan_tier: planTier,
              is_autopay: false,
              metadata: {
                tax_percentage: tax_percentage ?? null,
                tax_amount: tax_amount ?? null,
                total_amount_with_tax: total_amount_with_tax ?? null,
              },
            });
          }
        } catch (persistErr) {
          console.error('PayPal payment persistence error:', persistErr);
        }
      }

      return json(res, 200, { success: true, message: 'Payment verified' });
    }

    return json(res, 400, { error: 'Invalid payment provider' });
  } catch (e) {
    console.error('verify error:', e);
    return json(res, 500, { error: 'Server error', details: e instanceof Error ? e.message : String(e) });
  }
}
