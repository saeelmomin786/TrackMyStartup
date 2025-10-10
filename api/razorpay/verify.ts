import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { getSupabaseAdmin } from '../_utils/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, user_id, plan_id, amount, currency = 'INR', tax_percentage, tax_amount, total_amount_with_tax, interval } = req.body || {};
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) return res.status(400).json({ error: 'Missing payment verification data' });
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return res.status(500).json({ error: 'Razorpay secret not configured' });

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (expectedSignature !== razorpay_signature) return res.status(400).json({ error: 'Invalid payment signature' });

    const supabase = getSupabaseAdmin();
    // Insert payment
    let paymentRow:any = null;
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          user_id: user_id || null,
          subscription_id: null,
          amount: total_amount_with_tax ?? amount,
          currency,
          status: 'paid',
          provider_payment_id: razorpay_payment_id,
          provider_order_id: razorpay_order_id,
          provider: 'razorpay',
          tax_percentage: tax_percentage ?? null,
          tax_amount: tax_amount ?? null,
          total_amount_with_tax: total_amount_with_tax ?? null
        })
        .select()
        .single();
      if (!error) paymentRow = data;
    } catch {}

    // Insert subscription
    if (user_id && plan_id) {
      try {
        const now = new Date();
        const end = new Date(now);
        if ((interval || 'monthly') === 'yearly') end.setFullYear(end.getFullYear() + 1); else end.setMonth(end.getMonth() + 1);
        const { data: subRow } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id,
            plan_id,
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: end.toISOString(),
            amount: amount,
            interval: interval || 'monthly',
            is_in_trial: false,
            tax_percentage: tax_percentage ?? null,
            tax_amount: tax_amount ?? null,
            total_amount_with_tax: total_amount_with_tax ?? null,
            razorpay_order_id
          })
          .select()
          .single();
        if (paymentRow?.id && subRow?.id) {
          await supabase.from('payments').update({ subscription_id: subRow.id }).eq('id', paymentRow.id);
        }
      } catch {}
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.json({ success: true, message: 'Payment verified and persisted' });
  } catch (e:any) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}


