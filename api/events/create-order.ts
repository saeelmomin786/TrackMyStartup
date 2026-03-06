import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

type CreateOrderBody = {
  registrationId?: string;
};

function json(res: VercelResponse, status: number, data: unknown): void {
  res.status(status).json(data);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

  if (!supabaseUrl || !serviceRoleKey) {
    return json(res, 500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  if (!keyId || !keySecret) {
    return json(res, 500, { error: 'Razorpay keys not configured' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = (req.body || {}) as CreateOrderBody;
    const registrationId = body.registrationId?.trim();

    if (!registrationId) {
      return json(res, 400, { error: 'registrationId is required' });
    }

    const { data: registration, error: regError } = await supabase
      .from('event_registrations')
      .select('id, event_id, payment_status, amount_due, currency')
      .eq('id', registrationId)
      .single();

    if (regError || !registration) {
      return json(res, 404, { error: 'Registration not found', details: regError?.message });
    }

    if (registration.payment_status === 'paid') {
      return json(res, 409, { error: 'Payment already completed for this registration' });
    }

    const amount = Number(registration.amount_due || 0);
    if (amount <= 0) {
      return json(res, 400, { error: 'This registration does not require payment' });
    }

    const amountInMinor = Math.round(amount * 100);
    if (amountInMinor < 100) {
      return json(res, 400, { error: 'Amount must be at least 1 unit of currency' });
    }

    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
    const receiptRaw = `evtreg_${registration.id.replace(/-/g, '').slice(0, 24)}`;
    const receipt = receiptRaw.length > 40 ? receiptRaw.slice(0, 40) : receiptRaw;

    const rpResp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: amountInMinor,
        currency: registration.currency || 'INR',
        receipt,
        payment_capture: 1,
      }),
    });

    if (!rpResp.ok) {
      const text = await rpResp.text();
      return json(res, rpResp.status, { error: 'Failed to create Razorpay order', details: text });
    }

    const order = await rpResp.json();

    const { error: paymentRowError } = await supabase.from('event_payments').insert({
      registration_id: registration.id,
      event_id: registration.event_id,
      payment_gateway: 'razorpay',
      order_id: order.id,
      status: 'created',
      amount,
      currency: registration.currency || 'INR',
      gateway_response: order,
      idempotency_key: `order:${order.id}`,
    });

    if (paymentRowError && paymentRowError.code !== '23505') {
      return json(res, 500, { error: 'Order created but failed to store payment row', details: paymentRowError.message });
    }

    return json(res, 200, {
      success: true,
      order,
      keyId,
      registrationId: registration.id,
      amount,
      currency: registration.currency || 'INR',
    });
  } catch (error) {
    return json(res, 500, {
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
