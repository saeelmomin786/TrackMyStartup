import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function json(res: VercelResponse, status: number, data: unknown): void {
  res.status(status).json(data);
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
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  const { amountPaise, currency = 'INR', period: rawPeriod = 'monthly', intervalCount = 1, name = 'Startup Plan' } = planSpec;
  const { keyId, keySecret } = keys;

  if (!keyId || !keySecret) throw new Error('Razorpay keys not configured');
  if (!amountPaise || amountPaise <= 0) throw new Error('Invalid amount for plan');

  // Normalize period: 'month' -> 'monthly', 'year' -> 'yearly'
  const period = rawPeriod === 'month' ? 'monthly' : rawPeriod === 'year' ? 'yearly' : rawPeriod;

  // Try to find a cached plan first
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
      console.log(`✅ Found cached Razorpay plan: ${cached.plan_id} for ${amountPaise} ${currency} ${period}`);
      return cached.plan_id;
    }
  } catch (error) {
    // Cache lookup failed, continue to create plan
    console.warn('Cache lookup failed:', error);
  }

  const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  // Create plan in Razorpay
  const r = await fetch('https://api.razorpay.com/v1/plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader },
    body: JSON.stringify({
      period, // expects 'monthly'|'yearly'|'weekly'|'daily'
      interval: intervalCount,
      item: {
        name,
        amount: amountPaise,
        currency
      }
    })
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Failed to create Razorpay plan: ${text}`);
  }

  const plan = await r.json();
  console.log(`✅ Created new Razorpay plan: ${plan.id} for ${amountPaise} ${currency} ${period}`);

  // Cache it with ON CONFLICT handling (unique constraint prevents duplicates)
  try {
    const { error: insertError } = await supabase
      .from('razorpay_plans_cache')
      .insert({
        plan_id: plan.id,
        amount_paise: amountPaise,
        currency,
        period,
        interval_count: intervalCount,
        name
      })
      .select();
    
    if (insertError) {
      // If duplicate (unique constraint violation), try to fetch existing plan
      if (insertError.code === '23505') { // Unique violation
        console.log('⚠️ Plan already cached, fetching existing plan...');
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
      } else {
        console.warn('Cache insert failed:', insertError);
      }
    }
  } catch (error) {
    // Cache insert failed, but plan was created successfully
    console.warn('Cache insert failed:', error);
  }

  return plan.id;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
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
      plan_name = 'Startup Plan'
    } = req.body;

    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
      return json(res, 500, { error: "Razorpay keys not configured" });
    }

    // Initialize Supabase client for plan caching
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    
    let supabase: ReturnType<typeof createClient> | null = null;
    if (supabaseUrl && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    }

    // Determine period and count
    const period = (interval || plan_type) === 'yearly' ? 'yearly' : 'monthly';
    const subscriptionTotalCount = total_count || ((interval || plan_type) === 'yearly' ? 1 : 12);

    // Get or create Razorpay plan dynamically for the provided final_amount
    let plan_id: string | null = null;
    
    if (final_amount && supabase) {
      plan_id = await getOrCreateRazorpayPlan(
        {
          amountPaise: Math.round(final_amount * 100),
          currency: 'INR',
          period,
          intervalCount: 1,
          name: `${plan_name} (${interval || plan_type})`
        },
        { keyId, keySecret },
        supabase
      );
    } else if (bodyPlanId) {
      plan_id = bodyPlanId;
    }

    if (!plan_id) {
      return json(res, 400, { error: `Plan ID not configured for ${plan_type} plan` });
    }

    console.log(`Creating ${interval || plan_type} subscription with plan ID: ${plan_id}, total count: ${subscriptionTotalCount}`);

    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const payload: any = {
      plan_id,
      total_count: subscriptionTotalCount,
      customer_notify,
      notes: { user_id, trial_startup: "true", plan_type }
    };

    // Only include trial_period when explicitly allowed
    if (include_trial === true) {
      const trialPeriod = typeof trial_seconds === "number"
        ? Math.max(0, Math.floor(trial_seconds))
        : (process.env.NODE_ENV === "production" ? (trial_days * 24 * 60 * 60) : 120);
      payload.trial_period = trialPeriod;
    }

    const r = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const errorText = await r.text();
      return res.status(r.status).send(errorText);
    }

    const subscription = await r.json();
    return json(res, 200, subscription);
  } catch (e) {
    console.error('create-subscription error:', e);
    return json(res, 500, { error: "Server error", details: e instanceof Error ? e.message : String(e) });
  }
}
