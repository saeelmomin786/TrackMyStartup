// Lightweight local API server for Razorpay orders and subscriptions
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: "backend .env" });
const loadedEnvPath = "backend .env";

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);
// --------------------
// Dynamic Razorpay Plan Helper
// --------------------
async function getOrCreateRazorpayPlan(planSpec, keys) {
  const { amountPaise, currency = 'INR', period = 'month', intervalCount = 1, name = 'Startup Plan' } = planSpec || {};
  const { keyId, keySecret } = keys || {};

  if (!keyId || !keySecret) throw new Error('Razorpay keys not configured');
  if (!amountPaise || amountPaise <= 0) throw new Error('Invalid amount for plan');

  // Try to find a cached plan
  try {
    const { data: cached, error: cacheErr } = await supabase
      .from('razorpay_plans_cache')
      .select('plan_id')
      .eq('amount_paise', amountPaise)
      .eq('currency', currency)
      .eq('period', period)
      .eq('interval_count', intervalCount)
      .limit(1)
      .single();
    if (!cacheErr && cached?.plan_id) {
      return cached.plan_id;
    }
  } catch {}

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

  // Cache it
  try {
    await supabase
      .from('razorpay_plans_cache')
      .insert({
        plan_id: plan.id,
        amount_paise: amountPaise,
        currency,
        period,
        interval_count: intervalCount,
        name
      });
  } catch {}

  return plan.id;
}

// Log presence of Razorpay keys at startup (without secrets)
const hasKeyId = Boolean(process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID);
const hasKeySecret = Boolean(process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET);
console.log("[Startup] Loaded env from:", loadedEnvPath);
console.log("[Startup] Razorpay Key ID present:", hasKeyId, "Key Secret present:", hasKeySecret);

// --------------------
// Health Check Routes
// --------------------
app.get("/", (req, res) => res.status(200).send("OK"));
app.get("/health", (req, res) => res.status(200).json({ ok: true }));

// --------------------
// Supabase Diagnostics
// --------------------
app.get('/api/diagnostics/supabase', async (req, res) => {
  try {
    const startedAt = new Date().toISOString();

    // 1) Simple query on a known public table (subscription_plans) if exists
    let plansSample = null;
    try {
      const { data: plans, error: plansErr } = await supabase
        .from('subscription_plans')
        .select('id,name,price,interval')
        .limit(1);
      if (plansErr) {
        plansSample = { error: plansErr.message };
      } else {
        plansSample = plans || [];
      }
    } catch (e) {
      plansSample = { error: String(e) };
    }

    // 2) Lightweight write-read test into payments table (nullable fields only)
    // This is best-effort and will be skipped if table or RLS prevents it
    let writeTest = { attempted: true, inserted: false, id: null, error: null };
    try {
      const probe = {
        user_id: null,
        subscription_id: null,
        amount: 0,
        currency: 'INR',
        status: 'probe',
        provider_payment_id: `diag_${Date.now()}`,
        provider: 'razorpay',
      };
      const { data: inserted, error: insErr } = await supabase
        .from('payments')
        .insert(probe)
        .select('id,provider_payment_id,status,created_at')
        .single();
      if (insErr) {
        writeTest.error = insErr.message;
      } else {
        writeTest.inserted = true;
        writeTest.id = inserted?.id || null;
      }
    } catch (e) {
      writeTest.error = String(e);
    }

    return res.json({
      ok: true,
      startedAt,
      supabaseUrlPresent: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      serviceRolePresent: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY),
      plansSample,
      writeTest
    });
  } catch (e) {
    console.error('Supabase diagnostics error:', e);
    return res.status(500).json({ ok: false, error: 'Diagnostics failed' });
  }
});

// --------------------
// Create Razorpay Order
// --------------------
app.post("/api/razorpay/create-order", async (req, res) => {
  try {
    console.log('Create order request received:', req.body);
    const { amount, currency = "INR", receipt } = req.body;
    console.log('Parsed values:', { amount, currency, receipt });
    if (!amount || amount <= 0) {
      console.log('Invalid amount:', amount);
      return res.status(400).json({ error: "Invalid amount" });
    }

    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return res.status(500).json({ error: "Razorpay keys not configured" });

    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const r = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ amount: Math.round(amount), currency, receipt, payment_capture: 1 }),
    });

    if (!r.ok) return res.status(r.status).send(await r.text());
    const order = await r.json();
    res.json(order);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// --------------------
// Create Trial Subscription
// --------------------
app.post("/api/razorpay/create-trial-subscription", async (req, res) => {
  try {
    const { 
      plan_id: bodyPlanId, 
      user_id, 
      trial_days = 30, 
      plan_type = 'monthly', 
      total_count,
      // dynamic plan inputs
      final_amount, // major currency units, e.g. 299.00
      interval = 'monthly', // 'monthly' | 'yearly'
      plan_name = 'Startup Plan'
    } = req.body;

    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return res.status(500).json({ error: "Razorpay keys not configured" });

    // Determine period and count
    const period = (interval || plan_type) === 'yearly' ? 'yearly' : 'monthly';
    const subscriptionTotalCount = total_count || ((interval || plan_type) === 'yearly' ? 1 : 12);
    
    // Create Razorpay plan dynamically for the provided final_amount
    let plan_id;
    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    
    try {
      const planResp = await fetch('https://api.razorpay.com/v1/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({
          period,
          interval: 1,
          item: {
            name: `${plan_name} (${interval || plan_type})`,
            amount: Math.round((final_amount || 0) * 100),
            currency: 'INR'
          }
        })
      });

      if (!planResp.ok) {
        const txt = await planResp.text();
        console.error('Razorpay plan creation failed:', txt);
        return res.status(planResp.status).json({ error: txt });
      }
      
      const planJson = await planResp.json();
      plan_id = planJson?.id;
      
      if (!plan_id) {
        console.error('No plan id in Razorpay response');
        return res.status(500).json({ error: 'Failed to create Razorpay plan' });
      }
    } catch (planError) {
      console.error('Error creating Razorpay plan:', planError);
      return res.status(500).json({ error: 'Failed to create Razorpay plan' });
    }

    console.log(`Creating trial subscription for ${interval || plan_type} plan with ID: ${plan_id}, total count: ${subscriptionTotalCount}`);

    // Create subscription with trial period
    const trialPeriod = trial_days * 24 * 60 * 60; // Convert days to seconds

    const r = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({
        plan_id,
        total_count: subscriptionTotalCount,
        customer_notify: 1,
        start_at: Math.floor(Date.now() / 1000) + trialPeriod, // Start subscription after trial period
        notes: { 
          user_id, 
          trial_startup: "true",
          trial_days: trial_days.toString(),
          plan_type: interval || plan_type
        }
      }),
    });

    if (!r.ok) {
      const errorText = await r.text();
      console.error('Razorpay API error:', errorText);
      return res.status(r.status).json({ error: errorText });
    }
    
    const subscription = await r.json();
    res.json(subscription);
  } catch (e) {
    console.error('create-trial-subscription error:', e);
    res.status(500).json({ error: "Server error" });
  }
});

// --------------------
// Create Razorpay Subscription
// --------------------
const createSubscriptionHandler = async (req, res) => {
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
      // dynamic plan inputs
      final_amount,
      interval = 'monthly',
      plan_name = 'Startup Plan'
    } = req.body;

    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return res.status(500).json({ error: "Razorpay keys not configured" });

    // Determine period and count
    const period = (interval || plan_type) === 'yearly' ? 'yearly' : 'monthly';
    const subscriptionTotalCount = total_count || ((interval || plan_type) === 'yearly' ? 1 : 12);

    // Get or create Razorpay plan dynamically for the provided final_amount
    const plan_id = await getOrCreateRazorpayPlan({
      amountPaise: Math.round((final_amount || 0) * 100),
      currency: 'INR',
      period,
      intervalCount: 1,
      name: `${plan_name} (${interval || plan_type})`
    }, { keyId, keySecret });
    
    if (!plan_id) return res.status(400).json({ error: `Plan ID not configured for ${plan_type} plan` });

    console.log(`Creating ${interval || plan_type} subscription with plan ID: ${plan_id}, total count: ${subscriptionTotalCount}`);

    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const r = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify((() => {
        const payload = {
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
        return payload;
      })()),
    });

    if (!r.ok) return res.status(r.status).send(await r.text());
    const sub = await r.json();
    return res.json(sub);
  } catch (e) {
    console.error('create-subscription error:', e);
    return res.status(500).json({ error: "Server error" });
  }
};

app.post("/api/razorpay/create-subscription", createSubscriptionHandler);
// Aliases for local testing to avoid client/route mismatch
app.post('/razorpay/create-subscription', createSubscriptionHandler);
app.post('/create-subscription', createSubscriptionHandler);

// --------------------
// Subscription status for current user
// --------------------
// Billing system removed - always return success
app.get('/api/billing/subscription-status', async (req, res) => {
  try {
    console.log('🔍 Billing system removed - returning success for user:', req.query.user_id);
    return res.json({
      status: 'active',
      is_in_trial: false,
      trial_end: null,
      current_period_end: null
    });
  } catch (e) {
    console.error('subscription-status error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});
// --------------------
// Cleanup customer: cancel active subscriptions and delete saved tokens
// --------------------
app.post("/api/razorpay/cleanup-customer", async (req, res) => {
  try {
    const { customer_id } = req.body || {};
    if (!customer_id) return res.status(400).json({ error: "customer_id is required" });

    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return res.status(500).json({ error: "Razorpay keys not configured" });

    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    // Best-effort: list active subscriptions for this customer and cancel them immediately
    let cancelled = [];
    try {
      const listSubs = await fetch(`https://api.razorpay.com/v1/subscriptions?customer_id=${customer_id}&status=active`, {
        headers: { Authorization: authHeader }
      });
      if (listSubs.ok) {
        const data = await listSubs.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        for (const sub of items) {
          try {
            const r = await fetch(`https://api.razorpay.com/v1/subscriptions/${sub.id}/cancel`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: authHeader },
              body: JSON.stringify({ cancel_at_cycle_end: 0 })
            });
            if (r.ok) cancelled.push(sub.id);
          } catch {}
        }
      }
    } catch {}

    // Delete all saved tokens for the customer
    let deletedTokens = [];
    try {
      const listTokens = await fetch(`https://api.razorpay.com/v1/customers/${customer_id}/tokens`, {
        headers: { Authorization: authHeader }
      });
      if (listTokens.ok) {
        const data = await listTokens.json();
        const tokens = Array.isArray(data?.items) ? data.items : [];
        for (const token of tokens) {
          try {
            const r = await fetch(`https://api.razorpay.com/v1/customers/${customer_id}/tokens/${token.id}`, {
              method: 'DELETE',
              headers: { Authorization: authHeader }
            });
            if (r.ok) deletedTokens.push(token.id);
          } catch {}
        }
      }
    } catch {}

    return res.json({ ok: true, cancelled_subscriptions: cancelled, deleted_tokens: deletedTokens });
  } catch (e) {
    console.error('cleanup-customer error:', e);
    return res.status(500).json({ error: "Server error" });
  }
});

// --------------------
// Record subscription in Supabase
// --------------------
app.post('/api/billing/record-subscription', async (req, res) => {
  try {
    const { user_id, plan_id, amount, currency, payment_id } = req.body;
    
    if (!user_id || !plan_id) {
      return res.status(400).json({ error: 'user_id and plan_id are required' });
    }

    // Create user subscription record
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id,
        plan_id,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        amount,
        interval: 'monthly',
        is_in_trial: false
      })
      .select()
      .single();

    if (subError) {
      console.error('Error creating subscription:', subError);
      return res.status(500).json({ error: 'Failed to create subscription' });
    }

    // Record payment
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id,
        subscription_id: subscription.id,
        amount,
        currency,
        status: 'paid',
        provider_payment_id: payment_id,
        provider: 'razorpay'
      });

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
    }

    return res.json({
      user_id,
      subscription_id: subscription.id,
      status: 'active',
      message: 'Subscription created successfully'
    });
  } catch (e) {
    console.error('record-subscription error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// --------------------
// Razorpay Payment Verification
// --------------------
app.post('/api/razorpay/verify', async (req, res) => {
  try {
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      // optional contextual fields from frontend to persist records
      user_id,
      plan_id,
      amount, // final amount charged (in major currency units)
      currency = 'INR',
      tax_percentage,
      tax_amount,
      total_amount_with_tax,
      interval
    } = req.body;
    
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification data' });
    }

    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({ error: 'Razorpay secret not configured' });
    }

    // Verify signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Best-effort persistence using service role
    try {
      // 1) Record payment
      const paymentInsert = {
        user_id: user_id || null,
        subscription_id: null, // may be updated after subscription insert
        amount: typeof total_amount_with_tax === 'number' && total_amount_with_tax > 0 ? total_amount_with_tax : amount,
        currency,
        status: 'paid',
        provider_payment_id: razorpay_payment_id,
        provider_order_id: razorpay_order_id,
        provider: 'razorpay',
        tax_percentage: tax_percentage ?? null,
        tax_amount: tax_amount ?? null,
        total_amount_with_tax: total_amount_with_tax ?? null
      };

      const { data: paymentRow, error: paymentErr } = await supabase
        .from('payments')
        .insert(paymentInsert)
        .select()
        .single();

      if (paymentErr) {
        console.error('[verify] Error inserting payment:', paymentErr);
      }

      // 2) Create subscription record if we have context
      if (user_id && plan_id) {
        const now = new Date();
        const periodEnd = new Date(now);
        if ((interval || 'monthly') === 'yearly') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        const subInsert = {
          user_id,
          plan_id,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          amount: typeof amount === 'number' ? amount : null,
          interval: interval || 'monthly',
          is_in_trial: false,
          tax_percentage: tax_percentage ?? null,
          tax_amount: tax_amount ?? null,
          total_amount_with_tax: total_amount_with_tax ?? null,
          razorpay_order_id: razorpay_order_id
        };

        const { data: subRow, error: subErr } = await supabase
          .from('user_subscriptions')
          .insert(subInsert)
          .select()
          .single();

        if (subErr) {
          console.error('[verify] Error inserting subscription:', subErr);
        } else if (paymentRow) {
          // backfill subscription_id into payments
          await supabase
            .from('payments')
            .update({ subscription_id: subRow.id })
            .eq('id', paymentRow.id);
        }
      }
    } catch (persistErr) {
      console.error('[verify] Persistence error:', persistErr);
    }

    return res.json({ success: true, message: 'Payment verified and persisted' });
  } catch (e) {
    console.error('Payment verification error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// --------------------
// Create Trial Subscription (REMOVED DUPLICATE)
// --------------------

// Extra aliases to avoid client/route mismatch during local testing
app.post('/razorpay/create-trial-subscription', (req, res, next) => createSubscriptionHandler(req, res, next));
app.post('/create-trial-subscription', (req, res, next) => createSubscriptionHandler(req, res, next));

// --------------------
// Razorpay Webhooks
// --------------------
app.post("/api/razorpay/webhook", express.raw({ type: "*/*" }), async (req, res) => {
  try {
    const payload = req.body.toString();
    const signature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(500).json({ error: "Webhook secret not configured" });

    const expected = crypto.createHmac("sha256", webhookSecret).update(payload).digest("hex");
    if (expected !== signature) return res.status(401).json({ error: "Invalid signature" });

    const event = JSON.parse(payload);
    console.log("Razorpay webhook event:", event?.event);

    // Handle payment events
    if (event.event === "payment.captured") {
      console.log("Payment captured:", event.payload.payment.id);
      await handlePaymentSuccess(event.payload.payment);
    }
    if (event.event === "payment.failed") {
      console.log("Payment failed:", event.payload.payment.id);
      await handlePaymentFailure(event.payload.payment);
    }
    if (event.event === "payment.refunded") {
      console.log("Payment refunded:", event.payload.payment.id);
      await handlePaymentRefund(event.payload.payment);
    }

    // Handle subscription events
    if (event.event === "subscription.activated") {
      console.log("Subscription activated:", event.payload.subscription.id);
      await handleSubscriptionActivated(event.payload.subscription);
    }
    if (event.event === "subscription.charged") {
      console.log("Subscription charged:", event.payload.subscription.id);
      await handleSubscriptionCharged(event.payload.subscription);
    }
    if (event.event === "subscription.paused") {
      console.log("Subscription paused:", event.payload.subscription.id);
      await handleSubscriptionPaused(event.payload.subscription);
    }
    if (event.event === "subscription.cancelled") {
      console.log("Subscription cancelled:", event.payload.subscription.id);
      await handleSubscriptionCancelled(event.payload.subscription);
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("Webhook error:", e);
    res.status(400).json({ error: "Invalid payload" });
  }
});

// --------------------
// Subscription Status Monitoring
// --------------------
app.get('/api/subscription/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user's subscription details
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans (
          name,
          price,
          interval
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();
    
    if (subError && subError.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Failed to fetch subscription' });
    }
    
    if (!subscription) {
      return res.json({
        hasActiveSubscription: false,
        status: 'no_subscription',
        message: 'No active subscription found'
      });
    }
    
    // Check if subscription is expired
    const now = new Date();
    const periodEnd = new Date(subscription.current_period_end);
    const isExpired = periodEnd < now;
    
    if (isExpired) {
      // Update subscription status to expired
      await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);
      
      return res.json({
        hasActiveSubscription: false,
        status: 'expired',
        message: 'Subscription has expired',
        expiredAt: subscription.current_period_end
      });
    }
    
    // Check if subscription is in trial
    const isInTrial = subscription.is_in_trial;
    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null;
    const isTrialExpired = trialEnd && trialEnd < now;
    
    if (isInTrial && isTrialExpired) {
      // Update trial status
      await supabase
        .from('user_subscriptions')
        .update({ 
          is_in_trial: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);
    }
    
    return res.json({
      hasActiveSubscription: true,
      status: 'active',
      subscription: {
        id: subscription.id,
        planName: subscription.subscription_plans?.name,
        amount: subscription.amount,
        interval: subscription.interval,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        isInTrial: subscription.is_in_trial,
        trialEnd: subscription.trial_end,
        razorpaySubscriptionId: subscription.razorpay_subscription_id
      }
    });
    
  } catch (error) {
    console.error('Error checking subscription status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --------------------
// Check Expired Subscriptions (Cron Job)
// --------------------
app.post('/api/subscription/check-expired', async (req, res) => {
  try {
    console.log('Checking for expired subscriptions...');
    
    // Find all active subscriptions that have expired
    const { data: expiredSubscriptions, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('status', 'active')
      .lt('current_period_end', new Date().toISOString());
    
    if (error) {
      console.error('Error fetching expired subscriptions:', error);
      return res.status(500).json({ error: 'Failed to fetch expired subscriptions' });
    }
    
    if (expiredSubscriptions.length === 0) {
      return res.json({
        message: 'No expired subscriptions found',
        count: 0
      });
    }
    
    // Update all expired subscriptions
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .in('id', expiredSubscriptions.map(sub => sub.id));
    
    if (updateError) {
      console.error('Error updating expired subscriptions:', updateError);
      return res.status(500).json({ error: 'Failed to update expired subscriptions' });
    }
    
    console.log(`Updated ${expiredSubscriptions.length} expired subscriptions`);
    
    return res.json({
      message: `Updated ${expiredSubscriptions.length} expired subscriptions`,
      count: expiredSubscriptions.length,
      subscriptions: expiredSubscriptions.map(sub => ({
        id: sub.id,
        userId: sub.user_id,
        expiredAt: sub.current_period_end
      }))
    });
    
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --------------------
// Helper Functions
// --------------------

// Payment event handlers
async function handlePaymentSuccess(payment) {
  try {
    console.log('Payment successful:', payment.id);
    
    // Update payment status in database
    const { error } = await supabase
      .from('payments')
      .update({ 
        status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('provider_payment_id', payment.id);

    if (error) {
      console.error('Error updating payment status:', error);
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentFailure(payment) {
  try {
    console.log('Payment failed:', payment.id);
    
    // Update payment status in database
    const { error } = await supabase
      .from('payments')
      .update({ 
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('provider_payment_id', payment.id);

    if (error) {
      console.error('Error updating payment status:', error);
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handlePaymentRefund(payment) {
  try {
    console.log('Payment refunded:', payment.id);
    
    // Update payment status in database
    const { error } = await supabase
      .from('payments')
      .update({ 
        status: 'refunded',
        updated_at: new Date().toISOString()
      })
      .eq('provider_payment_id', payment.id);

    if (error) {
      console.error('Error updating payment status:', error);
    }
  } catch (error) {
    console.error('Error handling payment refund:', error);
  }
}

// Subscription event handlers
async function handleSubscriptionActivated(subscription) {
  try {
    console.log('Subscription activated:', subscription.id);
    
    // Update subscription status
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ 
        status: 'active',
        razorpay_subscription_id: subscription.id,
        updated_at: new Date().toISOString()
      })
      .eq('razorpay_subscription_id', subscription.id);

    if (error) {
      console.error('Error updating subscription status:', error);
    }
  } catch (error) {
    console.error('Error handling subscription activation:', error);
  }
}

async function handleSubscriptionCharged(subscription) {
  try {
    console.log('Subscription charged:', subscription.id);
    
    // Get subscription details from Razorpay
    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
      console.error('Razorpay keys not configured for subscription charge');
      return;
    }
    
    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    
    // Get subscription details
    const response = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscription.id}`, {
      method: "GET",
      headers: { "Authorization": authHeader }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch subscription details:', await response.text());
      return;
    }
    
    const subDetails = await response.json();
    console.log('Subscription details:', subDetails);
    
    // Update subscription period in database
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({ 
        current_period_start: new Date(subDetails.current_start * 1000).toISOString(),
        current_period_end: new Date(subDetails.current_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('razorpay_subscription_id', subscription.id);
    
    if (updateError) {
      console.error('Error updating subscription period:', updateError);
    }
    
    // Record the payment
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: subDetails.notes?.user_id,
        subscription_id: subscription.id,
        amount: subDetails.plan.amount / 100, // Convert from paise
        currency: subDetails.plan.currency,
        status: 'paid',
        provider_payment_id: subscription.id + '_' + Date.now(),
        provider: 'razorpay'
      });
    
    if (paymentError) {
      console.error('Error recording recurring payment:', paymentError);
    } else {
      console.log('Recurring payment recorded successfully');
    }
    
  } catch (error) {
    console.error('Error handling subscription charge:', error);
  }
}

async function handleSubscriptionPaused(subscription) {
  try {
    console.log('Subscription paused:', subscription.id);
    
    // Update subscription status
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('razorpay_subscription_id', subscription.id);

    if (error) {
      console.error('Error updating subscription status:', error);
    }
  } catch (error) {
    console.error('Error handling subscription pause:', error);
  }
}

async function handleSubscriptionCancelled(subscription) {
  try {
    console.log('Subscription cancelled:', subscription.id);
    
    // Update subscription status
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('razorpay_subscription_id', subscription.id);

    if (error) {
      console.error('Error updating subscription status:', error);
    } else {
      console.log('✅ Subscription cancelled successfully');
    }
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

async function handleTrialEnd(subscription) {
  try {
    const subscriptionId = subscription.id;
    const userId = subscription.notes?.user_id;
    if (!userId) return console.error("No user_id found in subscription notes");

    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ is_in_trial: false, razorpay_subscription_id: subscriptionId, updated_at: new Date().toISOString() })
    });

    if (!response.ok) console.error("Failed to update subscription:", await response.text());
    else console.log("Successfully updated subscription for user:", userId);
  } catch (error) {
    console.error("Error handling trial end:", error);
  }
}

// --------------------
// Start Server
// --------------------
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Local API running on http://localhost:${port}`));
