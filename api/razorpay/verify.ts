// Node.js crypto not available in Edge runtime; use Node runtime for HMAC
export const config = { runtime: 'nodejs' } as const;

import crypto from 'crypto';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { order_id, payment_id, signature } = req.body || {};
    if (!order_id || !payment_id || !signature) return res.status(400).json({ error: 'Missing fields' });

    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return res.status(500).json({ error: 'Razorpay secret not configured' });

    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${order_id}|${payment_id}`);
    const expected = hmac.digest('hex');
    const verified = expected === signature;
    return res.status(200).json({ verified });
  } catch (e: any) {
    return res.status(500).json({ error: 'Server error', details: e?.message || String(e) });
  }
}


