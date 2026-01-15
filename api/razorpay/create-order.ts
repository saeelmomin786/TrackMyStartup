import { VercelRequest, VercelResponse } from '@vercel/node';

function json(res: VercelResponse, status: number, data: unknown): void {
  res.status(status).json(data);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  try {
    console.log('Create order request received:', req.body);
    const { amount, currency = 'INR', receipt } = req.body as {
      amount: number;
      currency?: string;
      receipt?: string;
    };

    console.log('Parsed values:', { amount, currency, receipt });

    if (!amount || amount <= 0) {
      console.log('Invalid amount:', amount);
      return json(res, 400, { error: 'Invalid amount' });
    }

    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return json(res, 500, { error: 'Razorpay keys not configured' });
    }

    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    // Convert amount to paise (smallest currency unit) for Razorpay
    // Razorpay expects amount in paise for INR (e.g., ₹200 = 20000 paise)
    // Note: Frontend may already send in paise, so check if it's already in paise
    let amountInPaise: number;
    if (amount > 1000) {
      // Likely already in paise (e.g., 20000 for ₹200)
      amountInPaise = Math.round(amount);
    } else {
      // Likely in rupees, convert to paise
      amountInPaise = Math.round(amount * 100);
    }

    // Razorpay minimum amount is 100 paise (₹1)
    if (amountInPaise < 100) {
      return json(res, 400, { error: 'Amount must be at least ₹1 (100 paise)' });
    }

    // Razorpay receipt limit is 40 characters
    const receiptShort = receipt && receipt.length > 40 ? receipt.substring(0, 40) : receipt || `order_${Date.now()}`;

    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        receipt: receiptShort,
        payment_capture: 1,
      }),
    });

    if (!r.ok) {
      const errorText = await r.text();
      console.error('Razorpay API error:', r.status, errorText);
      return res.status(r.status).json({ error: errorText || 'Razorpay API error' });
    }

    const order = await r.json();
    return json(res, 200, order);
  } catch (e) {
    console.error('create-order error:', e);
    return json(res, 500, { error: 'Server error', details: e instanceof Error ? e.message : String(e) });
  }
}
