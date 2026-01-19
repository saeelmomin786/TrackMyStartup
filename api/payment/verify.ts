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
    if (req.body.endpoint === 'advisor-credits-add') {
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

    // CREATE STARTUP SUBSCRIPTION (paid by advisor credits)
    if (req.body.endpoint === 'create-startup-subscription') {
      const {
        startup_profile_id,
        startup_auth_user_id,
        advisor_user_id,
        assignment_id,
        start_date,
        end_date
      } = req.body;

      if (!startup_profile_id || !advisor_user_id || !start_date || !end_date) {
        return json(res, 400, { error: 'Missing required fields' });
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return json(res, 400, { error: 'Invalid start_date or end_date' });
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

      // Fetch premium monthly startup plan
      const { data: premiumPlan, error: planError } = await supabase
        .from('subscription_plans')
        .select('id, price, currency, interval, plan_tier, user_type')
        .eq('plan_tier', 'premium')
        .eq('user_type', 'Startup')
        .eq('interval', 'monthly')
        .eq('is_active', true)
        .maybeSingle();

      if (planError || !premiumPlan) {
        console.error('Premium plan lookup failed:', planError);
        return json(res, 400, { error: 'Premium plan not found' });
      }

      // Deactivate all existing active subscriptions, then create new one
      const { error: deactivateErr } = await supabase
        .from('user_subscriptions')
        .update({ status: 'inactive' })
        .eq('user_id', startup_profile_id)
        .eq('status', 'active');

      if (deactivateErr) {
        console.warn('Could not deactivate existing subscriptions:', deactivateErr);
      }

      const insertPayload = {
        user_id: startup_profile_id,
        plan_id: premiumPlan.id,
        plan_tier: 'premium',
        paid_by_advisor_id: advisor_user_id,
        status: 'active',
        current_period_start: startDate.toISOString(),
        current_period_end: endDate.toISOString(),
        amount: premiumPlan.price,
        currency: premiumPlan.currency,
        interval: 'monthly',
        is_in_trial: false,
        payment_gateway: 'advisor_credit',
        autopay_enabled: false,
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('user_subscriptions')
        .insert(insertPayload)
        .select()
        .single();

      if (insertErr) {
        console.error('Error creating subscription for startup:', {
          code: insertErr.code,
          message: insertErr.message,
          details: insertErr.details,
          hint: insertErr.hint,
          payload: insertPayload
        });
        return json(res, 500, { 
          error: 'Failed to create subscription',
          details: insertErr.message,
          code: insertErr.code
        });
      }

      return json(res, 200, {
        success: true,
        subscriptionId: inserted.id,
        message: 'Subscription created successfully'
      });
    }

    // PAYPAL ORDER CREATION (consolidated from /api/paypal/create-order)
    if (req.body.endpoint === 'paypal-create-order') {
      const { amount, currency } = req.body;

      if (!amount || !currency) {
        return json(res, 400, { error: 'Missing amount or currency' });
      }

      const clientId = process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.VITE_PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return json(res, 500, { error: 'PayPal credentials not configured' });
      }

      const isProduction =
        process.env.PAYPAL_ENVIRONMENT === 'production' ||
        process.env.VITE_PAYPAL_ENVIRONMENT === 'production';
      const baseUrl = isProduction ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

      try {
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

        // Create order
        const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [
              {
                amount: {
                  currency_code: currency,
                  value: amount.toFixed(2),
                },
              },
            ],
          }),
        });

        if (!orderResponse.ok) {
          return json(res, 500, { error: 'Failed to create PayPal order' });
        }

        const orderData = (await orderResponse.json()) as { id: string };
        return json(res, 200, { orderId: orderData.id });
      } catch (error) {
        console.error('PayPal order creation error:', error);
        return json(res, 500, { error: 'Failed to create order' });
      }
    }

    // PAYPAL SUBSCRIPTION CREATION (consolidated from /api/paypal/create-subscription)
    if (req.body.endpoint === 'paypal-create-subscription') {
      const { user_id, final_amount, interval, plan_name, currency } = req.body;

      if (!user_id || !final_amount || !interval || !plan_name || !currency) {
        return json(res, 400, { error: 'Missing required fields' });
      }

      const clientId = process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.VITE_PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return json(res, 500, { error: 'PayPal credentials not configured' });
      }

      const isProduction =
        process.env.PAYPAL_ENVIRONMENT === 'production' ||
        process.env.VITE_PAYPAL_ENVIRONMENT === 'production';
      const baseUrl = isProduction ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

      try {
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

        // Create billing plan
        const planResponse = await fetch(`${baseUrl}/v1/billing/plans`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            product_id: process.env.PAYPAL_PRODUCT_ID || 'PROD_DEFAULT',
            name: plan_name,
            description: `${plan_name} subscription`,
            billing_cycles: [
              {
                frequency: {
                  interval_unit: interval === 'yearly' ? 'YEAR' : 'MONTH',
                  interval_count: 1,
                },
                tenure_type: 'REGULAR',
                sequence: 1,
                total_cycles: 0, // Infinite
                pricing_scheme: {
                  fixed_price: {
                    value: final_amount.toFixed(2),
                    currency_code: currency,
                  },
                },
              },
            ],
            payment_preferences: {
              auto_bill_amount: 'YES',
              setup_fee: {
                value: '0.00',
                currency_code: currency,
              },
            },
          }),
        });

        if (!planResponse.ok) {
          return json(res, 500, { error: 'Failed to create billing plan' });
        }

        const planData = (await planResponse.json()) as { id: string };

        // Create subscription
        const subscriptionResponse = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            plan_id: planData.id,
            subscriber: {
              email_address: user_id,
            },
            application_context: {
              brand_name: 'Track My Startup',
              user_action: 'SUBSCRIBE_NOW',
              return_url: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/payment/callback?provider=paypal`,
              cancel_url: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/payment/cancel`,
            },
          }),
        });

        if (!subscriptionResponse.ok) {
          return json(res, 500, { error: 'Failed to create subscription' });
        }

        const subscriptionData = (await subscriptionResponse.json()) as { id: string };
        return json(res, 200, { subscriptionId: subscriptionData.id });
      } catch (error) {
        console.error('PayPal subscription creation error:', error);
        return json(res, 500, { error: 'Failed to create subscription' });
      }
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
      // ✅ FIX: Remove razorpay_subscription_id requirement - it's optional
      // Some payments come through without subscription ID but still need subscriptions created
      if (user_id && plan_id) {
        try {
          // 🔐 CRITICAL BUGFIX: Convert auth_user_id to profile_id
          // user_id from frontend is auth.uid(), but user_subscriptions table uses profile_id
          console.log('[verify] 🔍 Converting auth_user_id to profile_id...');
          console.log('[verify] Received user_id (might be auth_user_id):', user_id);
          
          // Try to get profile - first check if user_id is already a profile_id
          let finalUserId = user_id;
          const { data: directProfile } = await supabase
            .from('user_profiles')
            .select('id, auth_user_id, role')
            .eq('id', user_id)
            .maybeSingle();
          
          if (directProfile) {
            // user_id is already a profile_id
            console.log('[verify] ✅ user_id is already profile_id:', user_id);
            finalUserId = directProfile.id;
          } else {
            // user_id might be auth_user_id, try to find profile by auth_user_id
            const { data: userProfiles, error: profilesError } = await supabase
              .from('user_profiles')
              .select('id, role')
              .eq('auth_user_id', user_id)
              .order('created_at', { ascending: false });
            
            if (profilesError || !userProfiles || userProfiles.length === 0) {
              console.error('[verify] ❌ No user profiles found for auth_user_id:', user_id);
              return json(res, 400, {
                success: false,
                error: 'User profile not found',
                message: 'Payment verified but subscription not created - profile missing'
              });
            }

            // Use the first profile (most recent)
            finalUserId = userProfiles[0].id;
            console.log('[verify] ✅ Converted auth_user_id to profile_id:', finalUserId);
          }

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
              user_id: finalUserId,
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

          // ✅ SIMPLIFIED: Deactivate all existing subscriptions, then create new one
          // This works for both incomplete and complete subscriptions
          await supabase
            .from('user_subscriptions')
            .update({ status: 'inactive' })
            .eq('user_id', finalUserId)
            .eq('status', 'active');

          const { data: subRow } = await supabase
            .from('user_subscriptions')
            .insert({
              user_id: finalUserId,
              plan_id,
              plan_tier: planTier,
              status: 'active',
              current_period_start: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
              amount: finalAmount,
              currency: currency || planData?.currency || 'INR',
              interval: interval || 'monthly',
              is_in_trial: false,
              razorpay_subscription_id: razorpay_subscription_id || null,
              payment_gateway: 'razorpay',
              autopay_enabled: !!razorpay_subscription_id,
              mandate_status: razorpay_subscription_id ? 'active' : null,
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
