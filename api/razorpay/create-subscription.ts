import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return res.status(500).json({ error: 'Razorpay keys not configured' });

    const { user_id, final_amount, interval = 'monthly', plan_name = 'Startup Plan', customer_notify = 1 } = req.body || {};
    if (!user_id || !final_amount) return res.status(400).json({ error: 'user_id and final_amount are required' });

    // Choose plan id based on interval
    let plan_id = interval === 'yearly' ? process.env.RAZORPAY_STARTUP_PLAN_ID_YEARLY : process.env.RAZORPAY_STARTUP_PLAN_ID_MONTHLY;
    if (!plan_id) return res.status(400).json({ error: `Plan ID not configured for ${interval} plan` });

    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const r = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        plan_id,
        total_count: interval === 'yearly' ? 1 : 12,
        customer_notify,
        notes: { user_id, plan_name, interval }
      })
    });

    if (!r.ok) return res.status(r.status).send(await r.text());
    const sub = await r.json();
    return res.status(200).json(sub);
  } catch (e: any) {
    console.error('create-subscription error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
}


