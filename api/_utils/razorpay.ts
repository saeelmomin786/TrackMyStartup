import fetch from 'node-fetch';
import { getSupabaseAdmin } from './supabase';

export function getKeys() {
  const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error('Razorpay keys not configured');
  return { keyId, keySecret };
}

export async function getOrCreateRazorpayPlan(params: { amountPaise: number; currency?: string; period: 'monthly'|'yearly'; intervalCount?: number; name: string; }) {
  const { amountPaise, currency = 'INR', period, intervalCount = 1, name } = params;
  const { keyId, keySecret } = getKeys();
  const supabase = getSupabaseAdmin();

  if (!amountPaise || amountPaise <= 0) throw new Error('Invalid amount for plan');

  try {
    const { data: cached } = await supabase
      .from('razorpay_plans_cache')
      .select('plan_id')
      .eq('amount_paise', amountPaise)
      .eq('currency', currency)
      .eq('period', period)
      .eq('interval_count', intervalCount)
      .limit(1)
      .single();
    if (cached?.plan_id) return cached.plan_id as string;
  } catch {}

  const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const r = await fetch('https://api.razorpay.com/v1/plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body: JSON.stringify({
      period,
      interval: intervalCount,
      item: { name, amount: amountPaise, currency }
    })
  });
  if (!r.ok) throw new Error(await r.text());
  const plan = await r.json();

  try {
    await supabase.from('razorpay_plans_cache').insert({
      plan_id: plan.id,
      amount_paise: amountPaise,
      currency,
      period,
      interval_count: intervalCount,
      name
    });
  } catch {}

  return plan.id as string;
}


