import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return res.status(500).json({ error: 'Razorpay keys not configured' });
    }

    const { amount, currency = 'INR', receipt } = req.body || {};
    if (!amount || !receipt) {
      return res.status(400).json({ error: 'amount and receipt are required' });
    }

    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({ amount, currency, receipt }),
    });

    if (!r.ok) {
      return res.status(r.status).send(await r.text());
    }

    const order = await r.json();
    return res.status(200).json(order);
  } catch (e: any) {
    console.error('create-order error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
}


