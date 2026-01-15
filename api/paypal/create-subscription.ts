import type { VercelRequest, VercelResponse } from '@vercel/node';

function json(res: VercelResponse, status: number, data: unknown): void {
  res.status(status).json(data);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  console.log('🚀 [PayPal API] ========== CREATE SUBSCRIPTION (Serverless) ==========');
  console.log('📥 [PayPal API] Received create-subscription request (serverless)');
  console.log('📦 [PayPal API] Request body:', JSON.stringify(req.body, null, 2));

  try {
    const {
      user_id,
      final_amount,
      interval = 'monthly',
      plan_name = 'Subscription Plan',
      currency = 'EUR',
    } = req.body as {
      user_id?: string;
      final_amount?: number;
      interval?: string;
      plan_name?: string;
      currency?: string;
    };

    console.log('📋 [PayPal API] Extracted params:', { user_id, final_amount, interval, plan_name, currency });

    if (!final_amount || final_amount <= 0) {
      return json(res, 400, { error: 'Invalid amount' });
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

    // Get PayPal access token
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      console.error('❌ [PayPal API] Failed to get access token:', await tokenResponse.text());
      return json(res, 500, { error: 'Failed to get PayPal access token' });
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string };
    const accessToken = tokenData.access_token;

    // Determine billing cycle
    const billingCycleUnit = interval === 'yearly' ? 'YEAR' : 'MONTH';
    const billingCycleFrequency = 1;

    // Create product (if needed) – for simplicity, we create a generic product
    const productResponse = await fetch(`${baseUrl}/v1/catalogs/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: plan_name,
        description: `Subscription for ${plan_name}`,
        type: 'SERVICE',
        category: 'SOFTWARE',
      }),
    });

    if (!productResponse.ok) {
      console.error('❌ [PayPal API] Failed to create product:', await productResponse.text());
      return json(res, 500, { error: 'Failed to create PayPal product' });
    }

    const productData = (await productResponse.json()) as { id: string };
    const productId = productData.id;

    // Create billing plan
    const planResponse = await fetch(`${baseUrl}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        product_id: productId,
        name: `${plan_name} (${interval})`,
        description: `Recurring ${interval} subscription for ${plan_name}`,
        status: 'ACTIVE',
        billing_cycles: [
          {
            frequency: {
              interval_unit: billingCycleUnit,
              interval_count: billingCycleFrequency,
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // 0 = infinite
            pricing_scheme: {
              fixed_price: {
                value: final_amount.toFixed(2),
                currency_code: currency,
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: 'CANCEL',
          payment_failure_threshold: 3,
        },
      }),
    });

    if (!planResponse.ok) {
      console.error('❌ [PayPal API] Failed to create billing plan:', await planResponse.text());
      return json(res, 500, { error: 'Failed to create PayPal billing plan' });
    }

    const planData = (await planResponse.json()) as { id: string };
    const billingPlanId = planData.id;

    // Create subscription
    const subscriptionResponse = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        plan_id: billingPlanId,
        custom_id: user_id || undefined,
        application_context: {
          brand_name: 'TrackMyStartup',
          user_action: 'SUBSCRIBE_NOW',
        },
      }),
    });

    if (!subscriptionResponse.ok) {
      console.error('❌ [PayPal API] Failed to create subscription:', await subscriptionResponse.text());
      return json(res, 500, { error: 'Failed to create PayPal subscription' });
    }

    const subscriptionData = await subscriptionResponse.json();
    console.log('✅ [PayPal API] Subscription created:', subscriptionData);

    return json(res, 200, {
      subscriptionId: subscriptionData.id,
      status: subscriptionData.status,
    });
  } catch (e) {
    console.error('❌ [PayPal API] create-subscription error (serverless):', e);
    return json(res, 500, {
      error: 'Server error',
      details: e instanceof Error ? e.message : String(e),
    });
  }
}

