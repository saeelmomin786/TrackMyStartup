import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return res.status(500).json({ error: 'Razorpay secret not configured' });

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body || {};
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing payment verification fields' });
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const isValid = expected === razorpay_signature;

    if (!isValid) return res.status(400).json({ success: false, error: 'Invalid signature' });

    // Additional persistence (e.g., Supabase) can be added here as needed
    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error('verify error:', e);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}


