// Lightweight local API server for Razorpay orders and subscriptions
import express from "express";
import fetch from "node-fetch";
import nodemailer from "nodemailer";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import { createClient } from '@supabase/supabase-js';

// Load environment variables from default .env (for local testing)
dotenv.config();
const loadedEnvPath = ".env";

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[ERROR] Missing Supabase configuration!');
  console.error('Required environment variables:');
  console.error('  - SUPABASE_URL or VITE_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nCurrent env vars:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    urlSource: process.env.SUPABASE_URL ? 'SUPABASE_URL' : (process.env.VITE_SUPABASE_URL ? 'VITE_SUPABASE_URL' : 'none'),
    keySource: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SUPABASE_SERVICE_ROLE_KEY' : (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? 'VITE_SUPABASE_SERVICE_ROLE_KEY' : 'none')
  });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
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

// (Invite email route removed - handled by Vercel /api/send-invite)

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

async function resolveUserSubscriptionRecord({ razorpaySubscriptionId, userId }) {
  try {
    if (razorpaySubscriptionId) {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('id, user_id, is_in_trial, razorpay_subscription_id')
        .eq('razorpay_subscription_id', razorpaySubscriptionId)
        .limit(1);
      if (!error && Array.isArray(data) && data.length > 0) {
        return data[0];
      }
      if (error) {
        console.error('resolveUserSubscriptionRecord: error fetching by Razorpay ID:', error);
      }
    }

    if (userId) {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('id, user_id, is_in_trial, razorpay_subscription_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('current_period_start', { ascending: false })
        .limit(1);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data[0];
      }

      if (error) {
        console.error('resolveUserSubscriptionRecord: error fetching by user ID:', error);
      }
    }
  } catch (error) {
    console.error('resolveUserSubscriptionRecord: unexpected error:', error);
  }

  return null;
}

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

    const userIdFromNotes = subscription?.notes?.user_id || null;
    const resolved = await resolveUserSubscriptionRecord({
      razorpaySubscriptionId: subscription.id,
      userId: userIdFromNotes
    });

    if (!resolved) {
      console.warn('No matching user subscription found for activation event:', subscription.id);
      return;
    }

    const updates = {
      status: 'active',
      razorpay_subscription_id: subscription.id,
      updated_at: new Date().toISOString(),
      is_in_trial: false
    };

    if (subscription?.current_start) {
      updates.current_period_start = new Date(subscription.current_start * 1000).toISOString();
    }

    if (subscription?.current_end) {
      updates.current_period_end = new Date(subscription.current_end * 1000).toISOString();
    }

    const { error } = await supabase
      .from('user_subscriptions')
      .update(updates)
      .eq('id', resolved.id);

    if (error) {
      console.error('Error updating subscription status during activation:', error);
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

    const userIdFromNotes = subDetails?.notes?.user_id || subscription?.notes?.user_id || null;
    const resolved = await resolveUserSubscriptionRecord({
      razorpaySubscriptionId: subscription.id,
      userId: userIdFromNotes
    });

    if (!resolved) {
      console.warn('No matching subscription row found for charged event:', subscription.id);
      return;
    }

    const periodStartIso = subDetails?.current_start
      ? new Date(subDetails.current_start * 1000).toISOString()
      : null;
    const periodEndIso = subDetails?.current_end
      ? new Date(subDetails.current_end * 1000).toISOString()
      : null;

    const updatePayload = {
      updated_at: new Date().toISOString(),
      razorpay_subscription_id: subscription.id,
      status: 'active',
      is_in_trial: false
    };

    if (periodStartIso) updatePayload.current_period_start = periodStartIso;
    if (periodEndIso) updatePayload.current_period_end = periodEndIso;

    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update(updatePayload)
      .eq('id', resolved.id);

    if (updateError) {
      console.error('Error updating subscription period after charge:', updateError);
    }
    
    // Record the payment
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: resolved.user_id || subDetails.notes?.user_id || null,
        subscription_id: resolved.id,
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
    
    const userIdFromNotes = subscription?.notes?.user_id || null;
    const resolved = await resolveUserSubscriptionRecord({
      razorpaySubscriptionId: subscription.id,
      userId: userIdFromNotes
    });

    if (!resolved) {
      console.warn('No matching subscription found to pause for Razorpay ID:', subscription.id);
      return;
    }

    const { error } = await supabase
      .from('user_subscriptions')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', resolved.id);

    if (error) {
      console.error('Error updating subscription status to paused:', error);
    }
  } catch (error) {
    console.error('Error handling subscription pause:', error);
  }
}

async function handleSubscriptionCancelled(subscription) {
  try {
    console.log('Subscription cancelled:', subscription.id);
    
    const userIdFromNotes = subscription?.notes?.user_id || null;
    const resolved = await resolveUserSubscriptionRecord({
      razorpaySubscriptionId: subscription.id,
      userId: userIdFromNotes
    });

    if (!resolved) {
      console.warn('No matching subscription found to cancel for Razorpay ID:', subscription.id);
      return;
    }

    const { error } = await supabase
      .from('user_subscriptions')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', resolved.id);

    if (error) {
      console.error('Error updating subscription status to cancelled:', error);
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
// Invite Startup by Advisor
// --------------------
app.post('/api/invite-startup-advisor', async (req, res) => {
  try {
    const {
      startupId,
      advisorId,
      advisorCode,
      startupName,
      contactEmail,
      contactName,
      redirectUrl
    } = req.body;

    if (!startupId || !advisorId || !advisorCode || !startupName || !contactEmail || !contactName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get Supabase service role key from environment
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
      });
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // First check if startup already exists on TMS
    // IMPORTANT: A user is only "on TMS" if they have BOTH a users record AND a startups record
    // Just having a users record means they were invited but haven't completed registration yet
    const { data: existingStartupByEmail } = await supabaseAdmin
      .from('users')
      .select('id, role, startup_name, investment_advisor_code_entered')
      .eq('email', contactEmail.toLowerCase().trim())
      .eq('role', 'Startup')
      .maybeSingle();

    let existingStartupId = null;
    let userId;
    let isNewUser = false;
    let isExistingTMSStartup = false;

    if (existingStartupByEmail) {
      userId = existingStartupByEmail.id;
      
      // Check if they have a startups record (this means they've completed registration)
      const { data: startupRecord } = await supabaseAdmin
        .from('startups')
        .select('id, investment_advisor_code')
        .eq('user_id', userId)
        .maybeSingle();

      if (startupRecord) {
        // User has completed registration - they're actually on TMS
        existingStartupId = startupRecord.id;
        isExistingTMSStartup = true;
        console.log('Startup already exists on TMS (has completed registration), permission required:', userId);

        // Check if advisor code is already set (already linked)
        if (existingStartupByEmail.investment_advisor_code_entered === advisorCode) {
          // Already linked to this advisor - can proceed
          console.log('Startup already linked to this advisor');
          
          // Update advisor_added_startups to mark as linked
          await supabaseAdmin
            .from('advisor_added_startups')
            .update({
              is_on_tms: true,
              tms_startup_id: startupRecord.id,
              invite_status: 'accepted'
            })
            .eq('id', startupId);

          return res.status(200).json({
            success: true,
            userId,
            isExistingTMSStartup: true,
            tmsStartupId: startupRecord.id,
            requiresPermission: false,
            message: 'Startup is already on TMS and linked to your account'
          });
        } else if (existingStartupByEmail.investment_advisor_code_entered && existingStartupByEmail.investment_advisor_code_entered !== advisorCode) {
          // Startup is already linked to a different advisor
          const { data: existingAdvisorData } = await supabaseAdmin
            .from('users')
            .select('name, email, investment_advisor_code')
            .eq('investment_advisor_code', existingStartupByEmail.investment_advisor_code_entered)
            .eq('role', 'Investment Advisor')
            .maybeSingle();

          // Update advisor_added_startups record to show conflict
          await supabaseAdmin
            .from('advisor_added_startups')
            .update({
              is_on_tms: false,
              tms_startup_id: startupRecord.id,
              invite_status: 'not_sent'
              // Note: invited_user_id and invited_email columns don't exist in the table
            })
            .eq('id', startupId);

          return res.status(200).json({
            success: false,
            requiresPermission: false,
            alreadyHasAdvisor: true,
            existingAdvisorName: existingAdvisorData?.name || 'Another Investment Advisor',
            existingAdvisorCode: existingStartupByEmail.investment_advisor_code_entered,
            userId,
            isExistingTMSStartup: true,
            tmsStartupId: startupRecord.id,
            message: `This startup is already linked with another Investment Advisor (${existingAdvisorData?.name || 'Unknown'}). Please contact the startup directly to change their Investment Advisor code.`
          });
        } else {
          // Need permission - create link request
          const { data: advisorData } = await supabaseAdmin
            .from('users')
            .select('investment_advisor_code, name, email')
            .eq('id', advisorId)
            .maybeSingle();

          const requestMessage = `Investment Advisor "${advisorData?.name || 'Unknown'}" wants to link your startup "${startupName}" to their account.`;

          try {
            await supabaseAdmin
              .from('advisor_startup_link_requests')
              .insert({
                advisor_id: advisorId,
                advisor_code: advisorCode,
                advisor_name: advisorData?.name,
                advisor_email: advisorData?.email,
                startup_id: startupRecord.id,
                startup_name: startupName,
                startup_user_id: userId,
                startup_email: contactEmail,
                advisor_added_startup_id: startupId,
                status: 'pending',
                message: requestMessage
              });

            console.log('Permission request created');
          } catch (requestError) {
            console.error('Error creating permission request:', requestError);
          }

          // Update advisor_added_startups record
          await supabaseAdmin
            .from('advisor_added_startups')
            .update({
              is_on_tms: false,
              tms_startup_id: startupRecord.id,
              invite_status: 'not_sent'
              // Note: invited_user_id and invited_email columns don't exist in the table
            })
            .eq('id', startupId);

          return res.status(200).json({
            success: true,
            requiresPermission: true,
            userId,
            isExistingTMSStartup: true,
            tmsStartupId: startupRecord.id,
            message: 'Startup already exists on TMS. A permission request has been sent to the startup.'
          });
        }
      } else {
        // User exists in users table but NO startups record
        // This means they were invited but haven't completed registration yet
        // We should allow the invite to proceed (update existing user or send new invite)
        console.log('User exists but has not completed registration yet. Proceeding with invite...');
        isNewUser = false; // Not a new user, but not fully registered either
        isExistingTMSStartup = false; // Not on TMS yet
      }
    } else {
      // Check if user exists in auth (but not in users table)
      let existingUser = null;
      try {
        // Use listUsers and filter by email, or try getUserByEmail if available
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (!listError && usersData?.users) {
          existingUser = usersData.users.find(u => u.email?.toLowerCase() === contactEmail.toLowerCase());
        }
      } catch (authError) {
        console.log('No existing user in auth (this is OK for new users):', authError.message);
        existingUser = null;
      }

      if (existingUser) {
        userId = existingUser.id;
        console.log('User exists in auth:', userId);
      } else {
        // Create new user via admin invite
        // Use redirectUrl from client (which includes window.location.origin) for correct domain
        // Fallback to localhost for local development
        let siteUrl = redirectUrl;
        
        if (!siteUrl) {
          // Check if we're in development
          const isDevelopment = process.env.NODE_ENV === 'development' || 
                               !process.env.VERCEL_ENV ||
                               process.env.VITE_SITE_URL?.includes('localhost');
          siteUrl = isDevelopment 
            ? 'http://localhost:5173'
            : (process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://www.trackmystartup.com');
        }
        
        // Format redirect URL - First go to password setup, then login, then Form 2
        // Use hash-based routing for SPA compatibility
        const inviteRedirectUrl = `${siteUrl}/?page=reset-password&advisorCode=${advisorCode}`;

        console.log('Inviting new user with redirect URL:', inviteRedirectUrl);
        console.log('⚠️ IMPORTANT: Make sure this URL is added to Supabase Dashboard > Authentication > URL Configuration > Redirect URLs');
        console.log('Redirect URL details:', {
          redirectUrlFromClient: redirectUrl,
          finalSiteUrl: siteUrl,
          NODE_ENV: process.env.NODE_ENV,
          VERCEL_ENV: process.env.VERCEL_ENV
        });
        console.log('Email to send invite to:', contactEmail);

        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          contactEmail,
          {
            data: {
              name: contactName,
              role: 'Startup',
              startupName: startupName,
              source: 'advisor_invite',
              investment_advisor_code_entered: advisorCode,
              skip_form1: true
            },
            redirectTo: inviteRedirectUrl
          }
        );

        if (inviteError) {
          console.error('Error inviting user:', {
            error: inviteError,
            message: inviteError.message,
            details: inviteError.details,
            hint: inviteError.hint,
            code: inviteError.code
          });
          return res.status(500).json({ 
            error: inviteError.message || 'Failed to send invite',
            details: inviteError.details || 'No additional details',
            hint: inviteError.hint
          });
        }

        if (!inviteData?.user) {
          console.error('No user returned from invite:', inviteData);
          return res.status(500).json({ 
            error: 'Failed to create user via invite',
            details: 'No user data returned from Supabase'
          });
        }

        userId = inviteData.user.id;
        isNewUser = true;
        console.log('✅ User invited successfully:', userId);
        console.log('📧 Email should have been sent to:', contactEmail);
        console.log('📧 Check Supabase Dashboard > Authentication > Users to verify email was sent');
        console.log('📧 Note: Email might take a few minutes to arrive, check spam folder');
        
        // Try to get the invite link if available (for debugging)
        try {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
          if (userData?.user) {
            console.log('📋 User details:', {
              email: userData.user.email,
              email_confirmed_at: userData.user.email_confirmed_at,
              invited_at: userData.user.invited_at,
              confirmation_sent_at: userData.user.confirmation_sent_at
            });
          }
        } catch (debugError) {
          console.log('Could not fetch user details for debugging:', debugError.message);
        }
      }
    }

    // Create or update user record in users table
    // Note: Don't set created_at/updated_at - they're auto-generated by the database
    // Note: is_verified column may not exist in all schemas, so we'll omit it
    const userData = {
      id: userId,
      email: contactEmail.toLowerCase().trim(),
      name: contactName,
      role: 'Startup',
      startup_name: startupName,
      investment_advisor_code_entered: advisorCode
    };

    console.log('Creating/updating user record:', { userId, email: userData.email, isNewUser });

    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .upsert(userData, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user record:', {
        error: userError,
        message: userError.message,
        details: userError.details,
        hint: userError.hint,
        code: userError.code,
        userData: { ...userData, id: userId }
      });
      return res.status(500).json({ 
        error: 'Failed to create user record',
        details: userError.message || userError.details || 'Unknown error',
        hint: userError.hint
      });
    }

    console.log('User record created/updated successfully:', userRecord?.id);

    // Create startup record if user is new (and doesn't already exist)
    if (isNewUser && !existingStartupId) {
      // Set default values for required fields (will be updated when user completes Form 2)
      const { data: startupRecord, error: startupError } = await supabaseAdmin
        .from('startups')
        .insert({
          name: startupName,
          user_id: userId,
          investment_advisor_code: advisorCode,
          investment_type: 'Pre-Seed', // Default, will be updated in Form 2
          investment_value: 0, // Default, will be updated in Form 2
          equity_allocation: 0, // Default, will be updated in Form 2
          current_valuation: 0, // Default, will be updated in Form 2
          sector: 'Technology', // Default, will be updated in Form 2
          registration_date: new Date().toISOString().split('T')[0], // Today's date
          compliance_status: 'Pending' // Default status
          // Note: Don't set created_at, updated_at - they're auto-generated
        })
        .select()
        .single();

      if (startupError) {
        console.error('Error creating startup record:', startupError);
      } else {
        console.log('Startup record created:', startupRecord?.id);
        existingStartupId = startupRecord.id;
      }
    }

    // Update advisor_added_startups record
    const updateData = {
      invite_sent_at: new Date().toISOString()
      // Note: invited_user_id and invited_email columns don't exist in the table
    };

    if (isExistingTMSStartup) {
      updateData.is_on_tms = true;
      updateData.tms_startup_id = existingStartupId;
      updateData.invite_status = 'accepted';
    } else {
      updateData.invite_status = 'sent';
    }

    const { error: updateError } = await supabaseAdmin
      .from('advisor_added_startups')
      .update(updateData)
      .eq('id', startupId);

    if (updateError) {
      console.error('Error updating advisor_added_startups:', updateError);
      return res.status(500).json({ error: 'Failed to update invite status' });
    }

    return res.status(200).json({
      success: true,
      userId,
      isNewUser,
      isExistingTMSStartup,
      requiresPermission: false,
      tmsStartupId: existingStartupId,
      message: isExistingTMSStartup 
        ? 'Startup already exists on TMS and has been linked to your account' 
        : isNewUser 
          ? 'Invite sent successfully' 
          : 'User already exists, linked to advisor'
    });
  } catch (error) {
    console.error('Error in invite-startup-advisor:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error.details || error.hint || 'No additional details available'
    });
  }
});

// --------------------
// OTP: request
// --------------------
app.post('/api/request-otp', async (req, res) => {
  try {
    const { email, purpose, advisorCode } = req.body;
    if (!email || !purpose) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const OTP_EXPIRY_MINUTES = 10;
    const OTP_LENGTH = 6;
    const code = Math.floor(10 ** (OTP_LENGTH - 1) + Math.random() * 9 * 10 ** (OTP_LENGTH - 1)).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

    // Lookup user (only required for forgot)
    const { data: userRow } = await supabase
      .from('users')
      .select('id, role')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (!userRow && purpose === 'forgot') {
      return res.status(404).json({ error: 'User not found' });
    }

    const { error: insertError } = await supabase.from('password_otps').insert({
      email: email.toLowerCase().trim(),
      user_id: userRow?.id || null,
      code,
      purpose,
      advisor_code: advisorCode || null,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('Error inserting OTP:', insertError);
      return res.status(500).json({ error: 'Failed to generate OTP' });
    }

    // Send email via SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
    const fromName = process.env.SMTP_FROM_NAME || 'TrackMyStartup';

    await transporter.sendMail({
      from: `${fromName} <${fromAddress}>`,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      html: `<p>Your OTP code is <b>${code}</b>. It expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('request-otp error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --------------------
// OTP: verify and set password
// --------------------
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, code, newPassword, purpose, advisorCode } = req.body;
    if (!email || !code || !newPassword || !purpose) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const MAX_ATTEMPTS = 5;

    const { data: otpRow, error: otpError } = await supabase
      .from('password_otps')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('code', code)
      .eq('purpose', purpose)
      .is('used_at', null)
      .lte('attempts', MAX_ATTEMPTS)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (otpError || !otpRow) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (advisorCode && otpRow.advisor_code && otpRow.advisor_code !== advisorCode) {
      return res.status(400).json({ error: 'Invalid OTP for this advisor' });
    }

    await supabase
      .from('password_otps')
      .update({ attempts: (otpRow.attempts || 0) + 1 })
      .eq('id', otpRow.id);

    let userId = otpRow.user_id;
    if (!userId) {
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();
      if (userError || !userRow) {
        return res.status(404).json({ error: 'User not found' });
      }
      userId = userRow.id;
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (updateError) {
      console.error('Error updating password:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    await supabase
      .from('password_otps')
      .update({ used_at: new Date().toISOString() })
      .eq('id', otpRow.id);

    return res.json({ success: true });
  } catch (error) {
    console.error('verify-otp error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --------------------
// Start Server
// --------------------
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Local API running on http://localhost:${port}`));
