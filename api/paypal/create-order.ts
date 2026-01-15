import type { VercelRequest, VercelResponse } from '@vercel/node';

function json(res: VercelResponse, status: number, data: unknown): void {
  res.status(status).json(data);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  try {
    console.log('🚀 [PayPal API] Create order request received:', req.body);
    const { amount, currency = 'EUR' } = req.body as {
      amount: number | string;
      currency?: string;
    };

    if (!amount || (typeof amount === 'number' && amount <= 0)) {
      return json(res, 400, { error: 'Invalid amount' });
    }

    const clientId = process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.VITE_PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return json(res, 500, { error: 'PayPal credentials not configured' });
    }

    // Determine PayPal API URL based on environment
    const isProduction =
      process.env.PAYPAL_ENVIRONMENT === 'production' ||
      process.env.VITE_PAYPAL_ENVIRONMENT === 'production';
    const baseUrl = isProduction ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

    console.log('📋 [PayPal API] Using base URL:', baseUrl, 'Production:', isProduction);

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
      const errorText = await tokenResponse.text();
      console.error('❌ [PayPal API] Token error:', errorText);
      return json(res, 500, { error: 'Failed to get PayPal access token' });
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string };
    const accessToken = tokenData.access_token;

    // Convert amount to string with 2 decimal places
    const amountValue = typeof amount === 'string' ? parseFloat(amount) : amount;
    const amountString = amountValue.toFixed(2);

    // Create PayPal order
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
              value: amountString,
            },
          },
        ],
      }),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('❌ [PayPal API] Order creation error:', errorText);
      return res.status(orderResponse.status).json({ error: errorText });
    }

    const order = (await orderResponse.json()) as { id: string };
    console.log('✅ [PayPal API] Order created:', order.id);
    return json(res, 200, { orderId: order.id });
  } catch (e) {
    console.error('❌ [PayPal API] Create order error:', e);
    return json(res, 500, {
      error: 'Server error',
      details: e instanceof Error ? e.message : String(e),
    });
  }
}
