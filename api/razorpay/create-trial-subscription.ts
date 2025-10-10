import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';
import { getKeys, getOrCreateRazorpayPlan } from '../_utils/razorpay';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { user_id, trial_days = 30, interval = 'monthly', final_amount, plan_name = 'Startup Plan' } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });
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

    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const trialPeriodSec = trial_days * 24 * 60 * 60;
    const r = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        plan_id,
        total_count: totalCount,
        customer_notify: 1,
        start_at: Math.floor(Date.now() / 1000) + trialPeriodSec,
        notes: { user_id, trial_startup: 'true', trial_days: String(trial_days), plan_type: interval }
      })
    });
    if (!r.ok) return res.status(r.status).send(await r.text());
    const sub = await r.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.json(sub);
  } catch (e:any) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}


