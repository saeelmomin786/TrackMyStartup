import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';
import { getKeys, getOrCreateRazorpayPlan } from '../_utils/razorpay';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { user_id, interval = 'monthly', final_amount, plan_name = 'Startup Plan', include_trial = false, trial_days = 7 } = req.body || {};
    const { keyId, keySecret } = getKeys();

    const period = interval === 'yearly' ? 'yearly' : 'monthly';
    const totalCount = interval === 'yearly' ? 1 : 12;
    const plan_id = await getOrCreateRazorpayPlan({
      amountPaise: Math.round((final_amount || 0) * 100),
      currency: 'INR',
      period,
      intervalCount: 1,
      name: `${plan_name} (${interval})`
    });

    const payload:any = {
      plan_id,
      total_count: totalCount,
      customer_notify: 1,
      notes: { user_id, plan_type: interval }
    };
    if (include_trial) {
      payload.trial_period = (trial_days * 24 * 60 * 60);
    }

    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const r = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify(payload)
    });
    if (!r.ok) return res.status(r.status).send(await r.text());
    const sub = await r.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.json(sub);
  } catch (e:any) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}


