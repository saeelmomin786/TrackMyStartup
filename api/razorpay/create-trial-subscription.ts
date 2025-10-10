import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { user_id, trial_days = 30, interval = 'monthly', plan_name = 'Startup Plan', final_amount } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return res.status(500).json({ error: 'Razorpay keys not configured' });

    // Pick plan id for interval; if you intend dynamic amount plan creation, wire that here
    let plan_id = interval === 'yearly' ? process.env.RAZORPAY_STARTUP_PLAN_ID_YEARLY : process.env.RAZORPAY_STARTUP_PLAN_ID_MONTHLY;
    if (!plan_id) return res.status(400).json({ error: `Plan ID not configured for ${interval} plan` });

    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const trialPeriod = Number(trial_days) * 24 * 60 * 60; // seconds

    const r = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        plan_id,
        total_count: interval === 'yearly' ? 1 : 12,
        customer_notify: 1,
        start_at: Math.floor(Date.now() / 1000) + trialPeriod,
        notes: { user_id, trial_startup: 'true', trial_days: String(trial_days), plan_type: interval, plan_name, final_amount }
      })
    });

    if (!r.ok) return res.status(r.status).send(await r.text());
    const sub = await r.json();
    return res.status(200).json(sub);
  } catch (e: any) {
    console.error('create-trial-subscription error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
}


