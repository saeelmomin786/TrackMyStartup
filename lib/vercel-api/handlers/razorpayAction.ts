import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function json(res: VercelResponse, status: number, data: unknown): void {
  res.status(status).json(data);
}

function getAction(req: VercelRequest): string {
  const raw = req.query.action;
  return Array.isArray(raw) ? raw[0] : (raw || '');
}

function getRazorpayKeys() {
  const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

async function getOrCreateRazorpayPlan(
  planSpec: {
    amountPaise: number;
    currency?: string;
    period?: string;
    intervalCount?: number;
    name?: string;
  },
  keys: { keyId: string; keySecret: string },
  supabase: any
): Promise<string | null> {
  const { amountPaise, currency = 'INR', period: rawPeriod = 'monthly', intervalCount = 1, name = 'Startup Plan' } = planSpec;
  const { keyId, keySecret } = keys;

  if (!amountPaise || amountPaise <= 0) throw new Error('Invalid amount for plan');

  const period = rawPeriod === 'month' ? 'monthly' : rawPeriod === 'year' ? 'yearly' : rawPeriod;

  try {
    const { data: cached, error: cacheErr } = await supabase
      .from('razorpay_plans_cache')
      .select('plan_id')
      .eq('amount_paise', amountPaise)
      .eq('currency', currency)
      .eq('period', period)
      .eq('interval_count', intervalCount)
      .limit(1)
      .maybeSingle();

    if (!cacheErr && cached?.plan_id) {
      return cached.plan_id;
    }
  } catch {
    // continue to create plan
  }

  const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  const r = await fetch('https://api.razorpay.com/v1/plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body: JSON.stringify({
      period,
      interval: intervalCount,
      item: {
        name,
        amount: amountPaise,
        currency,
      },
    }),
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Failed to create Razorpay plan: ${text}`);
  }

  const plan = await r.json();

  try {
    const { error: insertError } = await supabase
      .from('razorpay_plans_cache')
      .insert({
        plan_id: plan.id,
        amount_paise: amountPaise,
        currency,
        period,
        interval_count: intervalCount,
        name,
      })
      .select();

    if (insertError && insertError.code === '23505') {
      const { data: existing } = await supabase
        .from('razorpay_plans_cache')
        .select('plan_id')
        .eq('amount_paise', amountPaise)
        .eq('currency', currency)
        .eq('period', period)
        .eq('interval_count', intervalCount)
        .limit(1)
        .maybeSingle();

      if (existing?.plan_id) {
        return existing.plan_id;
      }
    }
  } catch {
    // ignore cache write errors
  }

  return plan.id;
}

async function handleCreateOrder(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  try {
    const { amount, currency = 'INR', receipt } = req.body as {
      amount: number;
      currency?: string;
      receipt?: string;
    };

    if (!amount || amount <= 0) {
      return json(res, 400, { error: 'Invalid amount' });
    }

    const keys = getRazorpayKeys();
    if (!keys) {
      return json(res, 500, { error: 'Razorpay keys not configured' });
    }

    const authHeader = 'Basic ' + Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString('base64');
    const amountInPaise = Math.round(amount * 100);

    if (amountInPaise < 100) {
      return json(res, 400, { error: 'Amount must be at least ₹1 (100 paise)' });
    }

    const receiptShort = receipt && receipt.length > 40 ? receipt.substring(0, 40) : receipt || `order_${Date.now()}`;

    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        receipt: receiptShort,
        payment_capture: 1,
      }),
    });

    if (!r.ok) {
      const errorText = await r.text();
      return json(res, r.status, { error: errorText || 'Razorpay API error' });
    }

    const order = await r.json();
    return json(res, 200, order);
  } catch (e) {
    return json(res, 500, { error: 'Server error', details: e instanceof Error ? e.message : String(e) });
  }
}

async function handleCreateSubscription(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  try {
    const {
      plan_id: bodyPlanId,
      total_count,
      customer_notify = 1,
      user_id,
      include_trial = false,
      trial_seconds,
      trial_days = 7,
      plan_type = 'monthly',
      final_amount,
      interval = 'monthly',
      plan_name = 'Startup Plan',
    } = req.body;

    const keys = getRazorpayKeys();
    if (!keys) {
      return json(res, 500, { error: 'Razorpay keys not configured' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    let supabase: any = null;
    if (supabaseUrl && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }

    const period = (interval || plan_type) === 'yearly' ? 'yearly' : 'monthly';
    const subscriptionTotalCount = total_count || ((interval || plan_type) === 'yearly' ? 1 : 12);

    let plan_id: string | null = null;

    if (final_amount && supabase) {
      plan_id = await getOrCreateRazorpayPlan(
        {
          amountPaise: Math.round(final_amount * 100),
          currency: 'INR',
          period,
          intervalCount: 1,
          name: `${plan_name} (${interval || plan_type})`,
        },
        keys,
        supabase
      );
    } else if (bodyPlanId) {
      plan_id = bodyPlanId;
    }

    if (!plan_id) {
      return json(res, 400, { error: `Plan ID not configured for ${plan_type} plan` });
    }

    const authHeader = 'Basic ' + Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString('base64');

    const payload: any = {
      plan_id,
      total_count: subscriptionTotalCount,
      customer_notify,
      notes: { user_id, trial_startup: 'true', plan_type },
    };

    if (include_trial === true) {
      const trialPeriod = typeof trial_seconds === 'number'
        ? Math.max(0, Math.floor(trial_seconds))
        : (process.env.NODE_ENV === 'production' ? (trial_days * 24 * 60 * 60) : 120);
      payload.trial_period = trialPeriod;
    }

    const r = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const errorText = await r.text();
      return json(res, r.status, { error: errorText || 'Razorpay API error' });
    }

    const subscription = await r.json();
    return json(res, 200, subscription);
  } catch (e) {
    return json(res, 500, { error: 'Server error', details: e instanceof Error ? e.message : String(e) });
  }
}

async function handleStopAutopay(req: VercelRequest, res: VercelResponse): Promise<void | VercelResponse> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscription_id, user_id } = req.body as {
      subscription_id?: string;
      user_id?: string;
    };

    if (!subscription_id || !user_id) {
      return res.status(400).json({ error: 'subscription_id and user_id are required' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let finalUserId = user_id;
    const { data: directProfile } = await supabase
      .from('user_profiles')
      .select('id, auth_user_id')
      .eq('id', user_id)
      .maybeSingle();

    if (directProfile) {
      finalUserId = directProfile.id;
    } else {
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', user_id)
        .maybeSingle();

      if (userProfiles) {
        finalUserId = userProfiles.id;
      }
    }

    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('id, user_id, razorpay_subscription_id, razorpay_mandate_id, autopay_enabled')
      .eq('id', subscription_id)
      .eq('user_id', finalUserId)
      .single();

    if (subError || !subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (!subscription.autopay_enabled) {
      return res.json({
        success: true,
        message: 'Autopay is already disabled',
        already_disabled: true,
      });
    }

    const keys = getRazorpayKeys();
    if (!keys) {
      return res.status(500).json({ error: 'Razorpay keys not configured' });
    }

    const authHeader = 'Basic ' + Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString('base64');

    let razorpayCancelled = false;
    if (subscription.razorpay_subscription_id) {
      try {
        const cancelResponse = await fetch(
          `https://api.razorpay.com/v1/subscriptions/${subscription.razorpay_subscription_id}/cancel`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: authHeader,
            },
            body: JSON.stringify({ cancel_at_cycle_end: false }),
          }
        );

        if (cancelResponse.ok) {
          razorpayCancelled = true;
        }
      } catch {
        // continue and update DB flow
      }
    }

    const { error: updateError } = await supabase.rpc('handle_autopay_cancellation', {
      p_subscription_id: subscription.id,
      p_cancellation_reason: 'user_cancelled',
      p_initiated_by: 'user',
    });

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update subscription' });
    }

    return res.json({
      success: true,
      message: 'Auto-pay has been stopped. Your subscription will continue until the current billing period ends.',
      razorpay_cancelled: razorpayCancelled,
      subscription_id: subscription.id,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to stop autopay',
      message: error.message,
    });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void | VercelResponse> {
  const action = getAction(req);

  if (action === 'create-order') {
    return handleCreateOrder(req, res);
  }
  if (action === 'create-subscription') {
    return handleCreateSubscription(req, res);
  }
  if (action === 'stop-autopay') {
    return handleStopAutopay(req, res);
  }

  return json(res, 404, { error: 'Unknown razorpay API route' });
}
