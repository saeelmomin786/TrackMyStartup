import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { user_id, trial_days = 30, interval = 'monthly', plan_name = 'Startup Plan', final_amount } = req.body || {};
    console.log('[create-trial-subscription] body:', req.body);
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return res.status(500).json({ error: 'Razorpay keys not configured' });

    // Try static plan id first; if missing, dynamically create based on final_amount
    let plan_id = interval === 'yearly' ? process.env.RAZORPAY_STARTUP_PLAN_ID_YEARLY : process.env.RAZORPAY_STARTUP_PLAN_ID_MONTHLY;
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    if (!plan_id) {
      if (typeof final_amount !== 'number' || isNaN(final_amount) || final_amount <= 0) {
        console.error('[create-trial-subscription] Missing plan ID and invalid final_amount for dynamic plan creation');
        return res.status(400).json({ error: `Plan ID not configured for ${interval} plan and final_amount is missing/invalid for dynamic plan creation.` });
      }

      const period = interval === 'yearly' ? 'yearly' : 'monthly';
      const amountPaise = Math.round(final_amount * 100);
      console.log('[create-trial-subscription] Creating dynamic plan', { period, amountPaise, plan_name });

      const planResp = await fetch('https://api.razorpay.com/v1/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({
          period,
          interval: 1,
          item: {
            name: `${plan_name} (${interval})`,
            amount: amountPaise,
            currency: 'INR'
          }
        })
      });

      if (!planResp.ok) {
        const txt = await planResp.text();
        console.error('[create-trial-subscription] Dynamic plan creation failed:', txt);
        return res.status(planResp.status).send(txt);
      }
      const planJson = await planResp.json();
      plan_id = planJson?.id;
      if (!plan_id) {
        console.error('[create-trial-subscription] No plan id in Razorpay response');
        return res.status(500).json({ error: 'Failed to create dynamic plan' });
      }
    }

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


