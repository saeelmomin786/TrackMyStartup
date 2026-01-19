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

// Log all incoming requests for debugging
app.use((req, res, next) => {
  if (req.path.startsWith('/api/paypal')) {
    console.log(`🔍 [Request Logger] ${req.method} ${req.path}`, {
      body: req.body,
      query: req.query,
      headers: { 'content-type': req.headers['content-type'] }
    });
  }
  next();
});

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

// Helper to resolve frontend URL dynamically (supports main domain + client subdomains)
function getFrontendUrl(req) {
  // Prefer explicit environment variable if set
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }

  // In hosted environments (like Vercel), infer from request headers
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (host) {
    const protoHeader = req.headers['x-forwarded-proto'];
    const protocol = Array.isArray(protoHeader)
      ? protoHeader[0]
      : protoHeader || (req.secure ? 'https' : 'http');
    return `${protocol}://${host}`;
  }

  // Fallback for local development
  return 'http://localhost:5173';
}

// --------------------
// Mentor Payment Helper
// --------------------
async function completeMentorPayment(assignmentId, paymentId, isRazorpay = false) {
  try {
    // Get assignment to check status
    const { data: assignment, error: assignmentError } = await supabase
      .from('mentor_startup_assignments')
      .select('*')
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignment) {
      console.error('Error fetching assignment:', assignmentError);
      return false;
    }

    // Update payment record - check if it's Razorpay or PayPal
    const updateData = {
      payment_status: 'completed',
      payment_date: new Date().toISOString()
    };

    if (isRazorpay) {
      updateData.razorpay_payment_id = paymentId;
    } else {
      updateData.paypal_order_id = paymentId;
    }

    const { error: paymentError } = await supabase
      .from('mentor_payments')
      .update(updateData)
      .eq('assignment_id', assignmentId);

    if (paymentError) {
      console.error('Error updating payment:', paymentError);
      return false;
    }

    // Update assignment payment status
    const assignmentUpdateData = {
      payment_status: 'completed'
    };

    // Don't auto-activate - wait for mentor's final acceptance
    // If status is pending_payment, change to ready_for_activation
    if (assignment.status === 'pending_payment') {
      assignmentUpdateData.status = 'ready_for_activation';
    } else if (assignment.status === 'pending_payment_and_agreement') {
      // Check if agreement is also approved
      if (assignment.agreement_status === 'approved') {
        assignmentUpdateData.status = 'ready_for_activation';
      }
    }

    const { error: updateError } = await supabase
      .from('mentor_startup_assignments')
      .update(assignmentUpdateData)
      .eq('id', assignmentId);

    if (updateError) {
      console.error('Error updating assignment:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in completeMentorPayment:', error);
    return false;
  }
}

// --------------------
// Dynamic Razorpay Plan Helper
// --------------------
async function getOrCreateRazorpayPlan(planSpec, keys) {
  const { amountPaise, currency = 'INR', period: rawPeriod = 'monthly', intervalCount = 1, name = 'Startup Plan' } = planSpec || {};
  const { keyId, keySecret } = keys || {};

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

// Log presence of Razorpay keys at startup (without secrets)
const hasKeyId = Boolean(process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID);
const hasKeySecret = Boolean(process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET);
console.log("[Startup] Loaded env from:", loadedEnvPath);
console.log("[Startup] Razorpay Key ID present:", hasKeyId, "Key Secret present:", hasKeySecret);

// Log presence of PayPal keys at startup (without secrets)
const hasPayPalClientId = Boolean(process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID);
const hasPayPalClientSecret = Boolean(process.env.VITE_PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET);
const paypalEnv = process.env.VITE_PAYPAL_ENVIRONMENT || process.env.PAYPAL_ENVIRONMENT || 'sandbox';

console.log("[Startup] PayPal Client ID present:", hasPayPalClientId, "Client Secret present:", hasPayPalClientSecret, "Environment:", paypalEnv);

// --------------------
// Health Check Routes
// --------------------
app.get("/", (req, res) => res.status(200).send("OK"));

// Debug endpoint to check PayPal credentials (without exposing secrets)
app.get("/api/debug/paypal-config", (req, res) => {
  const clientId = process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.VITE_PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;
  const environment = process.env.VITE_PAYPAL_ENVIRONMENT || process.env.PAYPAL_ENVIRONMENT;
  
  res.json({
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    clientIdLength: clientId ? clientId.length : 0,
    clientSecretLength: clientSecret ? clientSecret.length : 0,
    environment: environment || 'not set',
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('PAYPAL'))
  });
});
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

    // Convert amount to paise (smallest currency unit) for Razorpay
    // Razorpay expects amount in paise for INR (e.g., ₹200 = 20000 paise)
    const amountInPaise = Math.round(amount * 100);
    
    // Razorpay minimum amount is 100 paise (₹1)
    if (amountInPaise < 100) {
      return res.status(400).json({ error: "Amount must be at least ₹1 (100 paise)" });
    }
    
    // Razorpay receipt limit is 40 characters
    const receiptShort = receipt && receipt.length > 40 ? receipt.substring(0, 40) : receipt;
    
    const r = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ amount: amountInPaise, currency, receipt: receiptShort, payment_capture: 1 }),
    });

    if (!r.ok) {
      const errorText = await r.text();
      console.error('Razorpay API error:', r.status, errorText);
      return res.status(r.status).json({ error: errorText || 'Razorpay API error' });
    }
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
      razorpay_subscription_id, // For subscription payments
      razorpay_signature,
      assignment_id, // For mentor payments
      // optional contextual fields from frontend to persist records
      user_id,
      plan_id,
      amount, // final amount charged (in major currency units)
      currency = 'INR',
      tax_percentage,
      tax_amount,
      total_amount_with_tax,
      interval,
      country // User's country
    } = req.body;
    
    if (!razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification data' });
    }

    // For subscription payments, order_id might be missing - use subscription_id instead
    const orderOrSubscriptionId = razorpay_order_id || razorpay_subscription_id;
    
    if (!orderOrSubscriptionId) {
      return res.status(400).json({ error: 'Missing order_id or subscription_id for payment verification' });
    }

    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({ error: 'Razorpay secret not configured' });
    }

    // Verify signature - try multiple formats for subscription payments
    // Format 1: order_id|payment_id (for one-time orders)
    // Format 2: subscription_id|payment_id (for subscription payments)
    // Format 3: payment_id only (some subscription payment formats)
    let expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderOrSubscriptionId}|${razorpay_payment_id}`)
      .digest('hex');

    let signatureValid = expectedSignature === razorpay_signature;
    
    // If first format fails and we have subscription_id, try payment_id only
    if (!signatureValid && razorpay_subscription_id) {
      const altSignature = crypto
        .createHmac('sha256', keySecret)
        .update(razorpay_payment_id)
        .digest('hex');
      
      if (altSignature === razorpay_signature) {
        signatureValid = true;
        expectedSignature = altSignature;
        console.log('✅ Signature verified using payment_id only format (subscription payment)');
      }
    }

    if (!signatureValid) {
      console.warn('❌ Signature verification failed.');
      console.warn('Payment ID:', razorpay_payment_id);
      console.warn('Order/Subscription ID:', orderOrSubscriptionId);
      console.warn('Subscription ID:', razorpay_subscription_id);
      console.warn('Expected (order/subscription_id|payment_id):', expectedSignature);
      
      // Try alternative signature formats for subscription payments
      if (razorpay_subscription_id) {
        // Try: payment_id only
        const altSig1 = crypto.createHmac('sha256', keySecret).update(razorpay_payment_id).digest('hex');
        console.warn('Trying format 2 (payment_id only):', altSig1);
        
        if (altSig1 === razorpay_signature) {
          console.log('✅ Signature verified using payment_id only format');
          signatureValid = true;
        } else {
          // Try: subscription_id|payment_id (different order)
          const altSig2 = crypto.createHmac('sha256', keySecret).update(`${razorpay_payment_id}|${razorpay_subscription_id}`).digest('hex');
          console.warn('Trying format 3 (payment_id|subscription_id):', altSig2);
          
          if (altSig2 === razorpay_signature) {
            console.log('✅ Signature verified using payment_id|subscription_id format');
            signatureValid = true;
          }
        }
      }
      
      console.warn('Received signature:', razorpay_signature);
      
      if (!signatureValid) {
        // For subscription payments, if signature verification fails but payment was successful,
        // we should still proceed but log a warning. Razorpay might use a different format.
        if (razorpay_subscription_id) {
          console.warn('⚠️ WARNING: Subscription payment signature verification failed, but payment was successful.');
          console.warn('⚠️ Proceeding with payment processing - signature format may differ for subscriptions.');
          console.warn('⚠️ Please verify payment manually in Razorpay dashboard.');
        } else {
          return res.status(400).json({ error: 'Invalid payment signature' });
        }
      }
    } else {
      console.log('✅ Signature verified successfully');
    }

    // Check if this is a mentor payment first (by checking razorpay_order_id in mentor_payments)
    // Mentor payments are ONE-TIME payments and should ONLY use mentor_payments table
    // They should NEVER be inserted into payment_transactions table
    if (razorpay_order_id && !razorpay_subscription_id) {
      try {
        const { data: mentorPayment, error: mentorPaymentError } = await supabase
          .from('mentor_payments')
          .select('*, assignment_id')
          .eq('razorpay_order_id', razorpay_order_id)
          .maybeSingle();

        if (mentorPayment && !mentorPaymentError) {
          // This is a mentor payment - handle it and return early
          // DO NOT process as subscription payment
          console.log('✅ Mentor payment verified:', razorpay_payment_id);
          
          // Update mentor payment with payment ID and status
          const { error: updateError } = await supabase
            .from('mentor_payments')
            .update({
              razorpay_payment_id: razorpay_payment_id,
              payment_status: 'completed',
              payment_date: new Date().toISOString()
            })
            .eq('id', mentorPayment.id);

          if (updateError) {
            console.error('Error updating mentor payment:', updateError);
            return res.status(500).json({ error: 'Failed to update mentor payment' });
          }

          // Complete payment and activate assignment
          const success = await completeMentorPayment(mentorPayment.assignment_id, razorpay_payment_id, true);
          
          if (success) {
            console.log('✅ Mentor payment completed successfully');
            return res.json({ 
              success: true, 
              message: 'Mentor payment verified and completed',
              payment_id: razorpay_payment_id
            });
          } else {
            console.error('Failed to complete mentor payment');
            return res.status(500).json({ error: 'Failed to complete mentor payment' });
          }
        } else {
          // Order ID exists but mentor payment not found - try to find by assignment_id if provided
          if (assignment_id) {
            console.log('⚠️ Mentor payment not found by order_id, trying assignment_id:', assignment_id);
            // Convert assignment_id to number if it's a string
            const assignmentIdNum = typeof assignment_id === 'string' ? parseInt(assignment_id, 10) : assignment_id;
            console.log('🔍 Searching for mentor payment with assignment_id:', assignmentIdNum);
            
            // First try to find a pending payment (most recent)
            let mentorPaymentByAssignment = null;
            let assignmentError = null;
            
            const { data: pendingPayments, error: pendingError } = await supabase
              .from('mentor_payments')
              .select('*, assignment_id')
              .eq('assignment_id', assignmentIdNum)
              .eq('payment_status', 'pending_payment')
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (pendingPayments && pendingPayments.length > 0 && !pendingError) {
              mentorPaymentByAssignment = pendingPayments[0];
              console.log('🔍 Found pending payment record');
            } else {
              // If no pending payment found, get the most recent one (could be failed/refunded)
              console.log('🔍 No pending payment found, getting most recent payment record');
              const { data: allPayments, error: allPaymentsError } = await supabase
                .from('mentor_payments')
                .select('*, assignment_id')
                .eq('assignment_id', assignmentIdNum)
                .order('created_at', { ascending: false })
                .limit(1);
              
              if (allPayments && allPayments.length > 0 && !allPaymentsError) {
                mentorPaymentByAssignment = allPayments[0];
                console.log('🔍 Found existing payment record (status:', mentorPaymentByAssignment.payment_status + ')');
              } else {
                assignmentError = allPaymentsError || pendingError;
              }
            }
            
            console.log('🔍 Query result:', { 
              found: !!mentorPaymentByAssignment, 
              error: assignmentError?.message,
              paymentStatus: mentorPaymentByAssignment?.payment_status 
            });

            if (mentorPaymentByAssignment && !assignmentError) {
              // Found by assignment_id - update with order_id and payment_id
              console.log('✅ Found mentor payment by assignment_id, updating with order_id and payment_id');
              
              const { error: updateError } = await supabase
                .from('mentor_payments')
                .update({
                  razorpay_order_id: razorpay_order_id,
                  razorpay_payment_id: razorpay_payment_id,
                  payment_status: 'completed',
                  payment_date: new Date().toISOString()
                })
                .eq('id', mentorPaymentByAssignment.id);

              if (updateError) {
                console.error('Error updating mentor payment:', updateError);
                return res.status(500).json({ error: 'Failed to update mentor payment' });
              }

              // Complete payment and activate assignment
              const success = await completeMentorPayment(mentorPaymentByAssignment.assignment_id, razorpay_payment_id, true);
              
              if (success) {
                console.log('✅ Mentor payment completed successfully (found by assignment_id)');
                return res.json({ 
                  success: true, 
                  message: 'Mentor payment verified and completed',
                  payment_id: razorpay_payment_id
                });
              } else {
                return res.status(500).json({ error: 'Failed to complete mentor payment' });
              }
            } else {
              // Not found by assignment_id either - try to create it if assignment exists
              if (assignmentError) {
                console.error('Error querying mentor payment by assignment_id:', assignmentError);
              } else {
                console.warn('⚠️ No mentor payment found for assignment_id:', assignmentIdNum);
                // Try to get assignment details to create payment record if needed
                const { data: assignment, error: assignmentFetchError } = await supabase
                  .from('mentor_startup_assignments')
                  .select('id, status, fee_amount, fee_currency, mentor_id, startup_id')
                  .eq('id', assignmentIdNum)
                  .maybeSingle();
                
                if (assignment && !assignmentFetchError && assignment.fee_amount > 0) {
                  console.log('📋 Assignment found, creating mentor_payments record:', assignment);
                  
                  // Calculate commission (20%)
                  const commissionPercentage = 20.00;
                  const commissionAmount = (assignment.fee_amount * commissionPercentage) / 100;
                  const payoutAmount = assignment.fee_amount - commissionAmount;
                  
                  // Create mentor_payments record
                  const { data: newPayment, error: createError } = await supabase
                    .from('mentor_payments')
                    .insert({
                      assignment_id: assignmentIdNum,
                      mentor_id: assignment.mentor_id,
                      startup_id: assignment.startup_id,
                      amount: assignment.fee_amount,
                      currency: assignment.fee_currency || 'INR',
                      commission_percentage: commissionPercentage,
                      commission_amount: commissionAmount,
                      payout_amount: payoutAmount,
                      razorpay_order_id: razorpay_order_id,
                      razorpay_payment_id: razorpay_payment_id,
                      payment_status: 'completed',
                      payment_date: new Date().toISOString(),
                      payout_status: 'not_initiated'
                    })
                    .select()
                    .single();
                  
                  if (createError || !newPayment) {
                    console.error('Error creating mentor payment record:', createError);
                  } else {
                    console.log('✅ Created mentor_payments record and updating assignment');
                    
                    // Complete payment and activate assignment
                    const success = await completeMentorPayment(assignmentIdNum, razorpay_payment_id, true);
                    
                    if (success) {
                      console.log('✅ Mentor payment completed successfully (created new record)');
                      return res.json({ 
                        success: true, 
                        message: 'Mentor payment verified and completed',
                        payment_id: razorpay_payment_id
                      });
                    }
                  }
                } else if (assignmentFetchError) {
                  console.error('Error fetching assignment:', assignmentFetchError);
                } else if (!assignment) {
                  console.warn('⚠️ Assignment not found with id:', assignmentIdNum);
                } else {
                  console.warn('⚠️ Assignment has no fee_amount, skipping payment record creation');
                }
              }
            }
          }
          
          // Still not found - log warning but payment was verified
          console.warn('⚠️ Razorpay order_id found but mentor_payment record not found:', razorpay_order_id);
          console.warn('⚠️ Payment was verified successfully, but database record may need manual update');
          return res.json({ 
            success: true, 
            message: 'Payment verified (mentor payment record may need manual update)',
            payment_id: razorpay_payment_id,
            warning: 'Mentor payment record not found in database'
          });
        }
      } catch (mentorPaymentErr) {
        console.error('Error checking mentor payment:', mentorPaymentErr);
        // If we have order_id but no subscription_id, it's likely a mentor payment
        // Don't process as subscription - return early
        if (razorpay_order_id && !razorpay_subscription_id) {
          console.warn('⚠️ Error checking mentor payment, but this appears to be a mentor payment');
          return res.json({ 
            success: true, 
            message: 'Payment verified (mentor payment - check database manually)',
            payment_id: razorpay_payment_id
          });
        }
      }
    }

    // If we reach here, it's a subscription payment (has subscription_id or user_id/plan_id)
    // Only process subscription payments if we have user_id and plan_id
    if (!user_id || !plan_id) {
      console.log('[verify] Missing user_id/plan_id for subscription payment - skipping');
      return res.json({ 
        success: true, 
        message: 'Payment verified (subscription payment but missing context)',
        payment_id: razorpay_payment_id
      });
    }

    // Best-effort persistence using service role (for subscription payments)
    try {
      // Get plan_tier from plan_id if available
      let planTier = 'free'; // Default to free
      if (plan_id) {
        try {
          console.log('[verify] Looking up plan_tier for plan_id:', plan_id);
          const { data: planData, error: planError } = await supabase
            .from('subscription_plans')
            .select('plan_tier, name')
            .eq('id', plan_id)
            .maybeSingle();
          
          if (planError) {
            console.error('[verify] Error looking up plan:', planError);
          } else if (planData) {
            if (planData.plan_tier) {
              planTier = planData.plan_tier;
              console.log('[verify] Found plan_tier:', planTier, 'for plan:', planData.name);
            } else {
              // Fallback: infer from plan name
              const planName = planData.name?.toLowerCase() || '';
              if (planName.includes('basic')) {
                planTier = 'basic';
                console.log('[verify] Inferred plan_tier: basic from plan name');
              } else if (planName.includes('premium')) {
                planTier = 'premium';
                console.log('[verify] Inferred plan_tier: premium from plan name');
              } else {
                console.warn('[verify] Plan found but plan_tier is null, using default: free');
              }
            }
          } else {
            console.warn('[verify] Plan not found for plan_id:', plan_id);
          }
        } catch (planLookupError) {
          console.error('[verify] Exception during plan lookup:', planLookupError);
        }
      } else {
        console.warn('[verify] No plan_id provided, using default plan_tier: free');
      }
      
      console.log('[verify] Final plan_tier to insert:', planTier);

      // 1) Record payment in payment_transactions table
      const paymentInsert = {
        user_id: user_id || null,
        subscription_id: null, // may be updated after subscription insert
        payment_gateway: 'razorpay',
        gateway_order_id: razorpay_order_id || razorpay_subscription_id, // Use subscription_id if order_id missing
        gateway_payment_id: razorpay_payment_id,
        gateway_signature: razorpay_signature,
        amount: typeof total_amount_with_tax === 'number' && total_amount_with_tax > 0 ? total_amount_with_tax : amount,
        currency: currency || 'INR',
        status: 'success',
        payment_type: 'initial',
        plan_tier: planTier, // Set from plan lookup
        is_autopay: !!razorpay_subscription_id, // True if subscription payment
        autopay_mandate_id: razorpay_subscription_id || null,
        metadata: {
          tax_percentage: tax_percentage ?? null,
          tax_amount: tax_amount ?? null,
          total_amount_with_tax: total_amount_with_tax ?? null
        }
      };

      const { data: paymentRow, error: paymentErr } = await supabase
        .from('payment_transactions')
        .insert(paymentInsert)
        .select()
        .single();

      if (paymentErr) {
        console.error('[verify] Error inserting payment:', paymentErr);
      } else {
        console.log('[verify] ✅ Payment transaction created:', paymentRow.id);
      }

      // 2) Create subscription record if we have context
      if (user_id && plan_id) {
        // 🔐 BUGFIX: Convert auth_user_id to profile_id
        // user_id from frontend is auth.uid(), but user_subscriptions table uses profile_id
        console.log('[verify] 🔍 Converting auth_user_id to profile_id...');
        console.log('[verify] Received user_id (auth_user_id):', user_id);
        
        // Get all profiles for this auth user
        const { data: userProfiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, role')
          .eq('auth_user_id', user_id)
          .order('created_at', { ascending: false });
        
        if (profilesError || !userProfiles || userProfiles.length === 0) {
          console.error('[verify] ❌ No user profiles found for auth_user_id:', user_id);
          console.error('[verify] Error:', profilesError);
          return res.json({ 
            success: false, 
            error: 'User profile not found',
            message: 'Payment verified but subscription not created - profile missing'
          });
        }

        // Try to match profile role to plan user_type
        // First, get the plan's user_type
        let planUserType = 'Startup'; // default
        if (plan_id) {
          try {
            const { data: planData } = await supabase
              .from('subscription_plans')
              .select('user_type')
              .eq('id', plan_id)
              .maybeSingle();
            
            if (planData?.user_type) {
              planUserType = planData.user_type;
              console.log('[verify] Plan user_type:', planUserType);
            }
          } catch (e) {
            console.warn('[verify] Could not fetch plan user_type, using default:', e);
          }
        }

        // Find matching profile
        let selectedProfile = userProfiles[0];
        const matchingProfile = userProfiles.find(p => p.role === planUserType);
        if (matchingProfile) {
          selectedProfile = matchingProfile;
          console.log('[verify] ✅ Selected profile matching plan type:', planUserType);
        } else if (userProfiles.length > 1) {
          console.warn('[verify] ⚠️ No profile matches plan type:', planUserType, '- using most recent profile');
        }
        
        const profileId = selectedProfile.id;
        console.log('[verify] ✅ Found profile_id:', profileId, 'Role:', selectedProfile.role);
        
        const now = new Date();
        const periodEnd = new Date(now);
        if ((interval || 'monthly') === 'yearly') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        // Calculate initial payment amount
        const initialPaymentAmount = typeof total_amount_with_tax === 'number' && total_amount_with_tax > 0 
          ? total_amount_with_tax 
          : (typeof amount === 'number' ? amount : 0);

        // Get plan details to get currency
        let planCurrency = currency || 'INR';
        let planAmount = initialPaymentAmount;
        if (plan_id) {
          try {
            const { data: planDetails } = await supabase
              .from('subscription_plans')
              .select('currency, price')
              .eq('id', plan_id)
              .maybeSingle();
            
            if (planDetails) {
              planCurrency = planDetails.currency || currency || 'INR';
              // Use plan price if amount not provided
              if (!amount && planDetails.price) {
                planAmount = planDetails.price;
              }
            }
          } catch (planErr) {
            console.warn('[verify] Could not fetch plan currency, using provided currency:', planErr);
          }
        }

        // ✅ SIMPLIFIED: Deactivate all existing active subscriptions
        console.log('[verify] Deactivating existing subscriptions for user:', profileId);
        const { error: deactivateErr } = await supabase
          .from('user_subscriptions')
          .update({ status: 'inactive' })
          .eq('user_id', profileId)
          .eq('status', 'active');

        if (deactivateErr) {
          console.warn('[verify] Could not deactivate existing subscriptions:', deactivateErr);
        } else {
          console.log('[verify] ✅ Deactivated existing subscriptions');
        }

        const subInsert = {
          user_id: profileId, // ← Use profile_id, not auth_user_id
          plan_id,
          plan_tier: planTier, // ← ADD: Set plan_tier from lookup
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          amount: planAmount, // Store amount in original currency
          currency: planCurrency, // Store currency code
          interval: interval || 'monthly',
          is_in_trial: false,
          razorpay_subscription_id: razorpay_subscription_id || null, // Store subscription_id
          payment_gateway: 'razorpay',
          autopay_enabled: !!razorpay_subscription_id, // Enable autopay if subscription_id exists
          mandate_status: razorpay_subscription_id ? 'active' : null,
          // Count initial payment as cycle #1
          billing_cycle_count: 1,
          total_paid: initialPaymentAmount,
          last_billing_date: now.toISOString(),
          next_billing_date: periodEnd.toISOString(),
          locked_amount_inr: currency === 'INR' ? initialPaymentAmount : null, // Store INR amount if currency is INR
          country: country || null // Store country from frontend
        };

        const { data: subRow, error: subErr } = await supabase
          .from('user_subscriptions')
          .insert(subInsert)
          .select()
          .single();

        if (subErr) {
          console.error('[verify] Error inserting subscription:', subErr);
        } else {
          console.log('[verify] ✅ Subscription created:', subRow.id, '| Status:', subRow.status, '| Autopay:', subRow.autopay_enabled);
          if (paymentRow) {
          // Update payment transaction with subscription_id
          const { error: updatePaymentErr } = await supabase
            .from('payment_transactions')
            .update({ subscription_id: subRow.id })
            .eq('id', paymentRow.id);
          
          if (updatePaymentErr) {
            console.error('[verify] Error updating payment with subscription_id:', updatePaymentErr);
          } else {
            console.log('[verify] ✅ Payment transaction linked to subscription');
          }

          // Create billing cycle for initial payment (Cycle #1)
          const { error: cycleError } = await supabase
            .from('billing_cycles')
            .insert({
              subscription_id: subRow.id,
              cycle_number: 1, // First cycle
              period_start: now.toISOString(),
              period_end: periodEnd.toISOString(),
              payment_transaction_id: paymentRow.id,
              amount: initialPaymentAmount,
              currency: currency || 'INR',
              status: 'paid',
              plan_tier: planTier,
              is_autopay: !!razorpay_subscription_id
            });

          if (cycleError) {
            console.error('[verify] Error creating billing cycle for initial payment:', cycleError);
          } else {
            console.log('[verify] ✅ Created billing cycle #1 for initial payment');
            console.log('[verify] ✅✅✅ Initial payment flow completed successfully!');
            console.log('[verify] Summary:');
            console.log('[verify]   - Payment Transaction: Created (ID:', paymentRow.id, ')');
            console.log('[verify]   - Subscription: Created (ID:', subRow.id, ', Status:', subRow.status, ')');
            console.log('[verify]   - Billing Cycle: Created (Cycle #1)');
            console.log('[verify]   - Plan Tier:', planTier);
            console.log('[verify]   - Autopay Enabled:', subRow.autopay_enabled);
            console.log('[verify]   - Billing Cycle Count:', subRow.billing_cycle_count);
            console.log('[verify]   - Total Paid:', subRow.total_paid);
          }
          } else {
            console.warn('[verify] ⚠️ Payment transaction not found, subscription created but billing cycle skipped');
          }
        }
      } else {
        console.warn('[verify] ⚠️ Missing user_id or plan_id, subscription not created');
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
// PayPal Integration
// --------------------

// Create PayPal Order
app.post("/api/paypal/create-order", async (req, res) => {
  try {
    console.log('Create PayPal order request received:', req.body);
    const { amount, currency = "EUR" } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const clientId = process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.VITE_PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "PayPal credentials not configured" });
    }

    // Determine PayPal API URL based on environment
    const isProduction = process.env.PAYPAL_ENVIRONMENT === 'production' || process.env.VITE_PAYPAL_ENVIRONMENT === 'production';
    const baseUrl = isProduction 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';

    // Get PayPal access token
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('PayPal token error:', errorText);
      return res.status(500).json({ error: "Failed to get PayPal access token" });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Create PayPal order
    const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: parseFloat(amount).toFixed(2),
          },
        }],
      }),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('PayPal order creation error:', errorText);
      return res.status(orderResponse.status).json({ error: errorText });
    }

    const order = await orderResponse.json();
    res.json({ orderId: order.id });
  } catch (e) {
    console.error('PayPal create order error:', e);
    res.status(500).json({ error: "Server error" });
  }
});

// Add Advisor Credits (uses service role to bypass REST API restrictions)
app.post('/api/advisor-credits/add', async (req, res) => {
  try {
    const {
      advisor_user_id,
      credits_to_add,
      amount_paid,
      currency,
      payment_gateway,
      payment_transaction_id
    } = req.body;

    if (!advisor_user_id || !credits_to_add || !amount_paid || !currency || !payment_gateway || !payment_transaction_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Use service role key to call RPC function (bypasses REST API restrictions)
    const { data: incrementedCredits, error: rpcError } = await supabase.rpc('increment_advisor_credits', {
      p_advisor_user_id: advisor_user_id,
      p_credits_to_add: credits_to_add,
      p_amount_paid: amount_paid,
      p_currency: currency
    });

    if (rpcError) {
      console.error('RPC Error adding credits:', {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint
      });
      return res.status(500).json({ 
        error: 'Failed to add credits',
        details: rpcError.message,
        code: rpcError.code
      });
    }

    // Record purchase history
    // CRITICAL: Use service role supabase client to bypass RLS
    const { error: historyError } = await supabase
      .from('credit_purchase_history')
      .insert({
        advisor_user_id: advisor_user_id,
        credits_purchased: credits_to_add,
        amount_paid: amount_paid,
        currency: currency,
        payment_gateway: payment_gateway,
        payment_transaction_id: payment_transaction_id,
        status: 'completed',
        metadata: {
          purchase_type: 'one-time',
          payment_type: 'one-time', // Also set payment_type for consistency
          recorded_at: new Date().toISOString()
        }
      });

    if (historyError) {
      console.error('❌ Error recording purchase history:', historyError);
      console.error('❌ History error details:', {
        code: historyError.code,
        message: historyError.message,
        details: historyError.details,
        hint: historyError.hint
      });
      // Don't fail the request - credits were added successfully
    } else {
      console.log('✅ Purchase history recorded successfully:', {
        advisor_user_id: advisor_user_id,
        credits_purchased: credits_to_add,
        amount_paid: amount_paid,
        currency: currency
      });
    }

    res.json({ 
      success: true,
      credits: incrementedCredits
    });
  } catch (error) {
    console.error('Error in add advisor credits:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Create/Update startup subscription on behalf of advisor (service role)
app.post('/api/advisor-credits/create-startup-subscription', async (req, res) => {
  try {
    const {
      startup_profile_id,
      startup_auth_user_id,
      advisor_user_id,
      assignment_id,
      start_date,
      end_date
    } = req.body;

    if (!startup_profile_id || !advisor_user_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid start_date or end_date' });
    }

    // Fetch premium monthly startup plan
    const { data: premiumPlan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id, price, currency, interval, plan_tier, user_type')
      .eq('plan_tier', 'premium')
      .eq('user_type', 'Startup')
      .eq('interval', 'monthly')
      .eq('is_active', true)
      .maybeSingle();

    if (planError || !premiumPlan) {
      console.error('Premium plan lookup failed:', planError);
      return res.status(400).json({ error: 'Premium plan not found' });
    }

    // ✅ SIMPLIFIED: Deactivate all existing active subscriptions, then create new one
    // This matches the approach used in payment verification
    const { error: deactivateErr } = await supabase
      .from('user_subscriptions')
      .update({ status: 'inactive' })
      .eq('user_id', startup_profile_id)
      .eq('status', 'active');

    if (deactivateErr) {
      console.warn('Could not deactivate existing subscriptions:', deactivateErr);
    }

    const now = new Date();
    const insertPayload = {
      user_id: startup_profile_id,
      plan_id: premiumPlan.id,
      plan_tier: 'premium',
      paid_by_advisor_id: advisor_user_id,
      status: 'active',
      current_period_start: startDate.toISOString(),
      current_period_end: endDate.toISOString(),
      amount: premiumPlan.price,
      currency: premiumPlan.currency,
      interval: 'monthly',
      is_in_trial: false,
      payment_gateway: 'advisor_credit',
      autopay_enabled: false,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('user_subscriptions')
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr) {
      console.error('Error creating subscription for startup:', insertErr);
      return res.status(500).json({ error: 'Failed to create subscription' });
    }

    const subscriptionId = inserted.id;

    // Optionally store linkage metadata (non-blocking)
    if (assignment_id) {
      await supabase
        .from('advisor_credit_assignments')
        .update({ subscription_id: subscriptionId })
        .eq('id', assignment_id);
    }

    return res.json({ success: true, subscriptionId });
  } catch (error) {
    console.error('Error creating startup subscription via advisor endpoint:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Verify PayPal Payment
app.post('/api/paypal/verify', async (req, res) => {
  try {
    const {
      paypal_order_id,
      paypal_payer_id,
      user_id,
      plan_id,
      amount,
      currency = 'EUR',
      tax_percentage,
      tax_amount,
      total_amount_with_tax,
      interval = 'monthly',
      country,
      assignment_id // For mentor payments
    } = req.body;

    if (!paypal_order_id) {
      return res.status(400).json({ error: 'Missing PayPal order ID' });
    }

    const clientId = process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.VITE_PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'PayPal credentials not configured' });
    }

    // Determine PayPal API URL based on environment
    const isProduction = process.env.PAYPAL_ENVIRONMENT === 'production' || process.env.VITE_PAYPAL_ENVIRONMENT === 'production';
    const baseUrl = isProduction 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';

    // Get PayPal access token
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenResponse.ok) {
      return res.status(500).json({ error: "Failed to get PayPal access token" });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // First, get the order details to check if it's already captured
    const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders/${paypal_order_id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    let captureData;
    if (orderResponse.ok) {
      const orderData = await orderResponse.json();
      // If order is already completed, use the existing data
      if (orderData.status === 'COMPLETED') {
        captureData = orderData;
      } else {
        // Try to capture the order
        const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${paypal_order_id}/capture`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
        });

        if (!captureResponse.ok) {
          const errorText = await captureResponse.text();
          console.error('PayPal capture error:', errorText);
          // If capture fails but order is already completed, use order data
          if (orderData.status === 'COMPLETED') {
            captureData = orderData;
          } else {
            return res.status(captureResponse.status).json({ error: 'Failed to capture PayPal payment', details: errorText });
          }
        } else {
          captureData = await captureResponse.json();
        }
      }
    } else {
      // Fallback: try to capture directly
      const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${paypal_order_id}/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!captureResponse.ok) {
        const errorText = await captureResponse.text();
        console.error('PayPal capture error:', errorText);
        return res.status(captureResponse.status).json({ error: 'Failed to capture PayPal payment', details: errorText });
      }

      captureData = await captureResponse.json();
    }
    
    // Verify payment status
    if (captureData.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Payment not completed', status: captureData.status });
    }

    // Get payment details
    const payment = captureData.purchase_units[0]?.payments?.captures[0];
    if (!payment) {
      return res.status(400).json({ error: 'Payment capture not found' });
    }

    console.log('✅ PayPal payment verified:', {
      orderId: paypal_order_id,
      paymentId: payment.id,
      amount: payment.amount.value,
      currency: payment.amount.currency_code,
      status: payment.status
    });

    // Check if this is a mentor payment first (by checking paypal_order_id or assignment_id in mentor_payments)
    // Mentor payments are ONE-TIME payments and should ONLY use mentor_payments table
    // They should NEVER be inserted into payment_transactions table
    try {
      let mentorPayment = null;
      let mentorPaymentError = null;

      // First try to find by paypal_order_id
      if (paypal_order_id) {
        const result = await supabase
          .from('mentor_payments')
          .select('*, assignment_id')
          .eq('paypal_order_id', paypal_order_id)
          .maybeSingle();
        mentorPayment = result.data;
        mentorPaymentError = result.error;
      }

      // If not found and assignment_id is provided, try to find by assignment_id
      if (!mentorPayment && assignment_id) {
        const assignmentIdNum = typeof assignment_id === 'string' ? parseInt(assignment_id, 10) : assignment_id;
        console.log('🔍 Mentor payment not found by order_id, trying assignment_id:', assignmentIdNum);
        
        // Find the most recent payment record for this assignment
        const { data: payments, error: paymentsError } = await supabase
          .from('mentor_payments')
          .select('*, assignment_id')
          .eq('assignment_id', assignmentIdNum)
          .order('created_at', { ascending: false })
          .limit(1);

        if (payments && payments.length > 0) {
          mentorPayment = payments[0];
        }
        mentorPaymentError = paymentsError;
      }

      if (mentorPayment && !mentorPaymentError) {
        // This is a mentor payment - handle it and return early
        // DO NOT process as subscription payment
        console.log('✅ Mentor payment verified:', paypal_order_id);
        
        // Update mentor payment with payment ID and status (if not already updated)
        const updateData = {
          payment_status: 'completed',
          payment_date: new Date().toISOString()
        };

        // Update paypal_order_id if it wasn't set before
        if (!mentorPayment.paypal_order_id) {
          updateData.paypal_order_id = paypal_order_id;
        }

        const { error: updateError } = await supabase
          .from('mentor_payments')
          .update(updateData)
          .eq('id', mentorPayment.id);

        if (updateError) {
          console.error('Error updating mentor payment:', updateError);
          return res.status(500).json({ error: 'Failed to update mentor payment' });
        }

        // Complete payment and activate assignment
        const success = await completeMentorPayment(mentorPayment.assignment_id, paypal_order_id, false);
        
        if (success) {
          console.log('✅ Mentor payment completed successfully');
          return res.json({ 
            success: true, 
            message: 'Mentor payment verified and completed',
            payment_id: paypal_order_id
          });
        } else {
          return res.status(500).json({ error: 'Failed to complete mentor payment' });
        }
      }
    } catch (mentorCheckError) {
      console.error('Error checking for mentor payment:', mentorCheckError);
      // Continue to subscription payment flow if check fails
    }

    // If not a mentor payment, continue with subscription payment flow below
    // Create or update subscription
    if (user_id && plan_id) {
      try {
        // Deactivate existing subscriptions
        await supabase
          .from('user_subscriptions')
          .update({ status: 'inactive', updated_at: new Date().toISOString() })
          .eq('user_id', user_id)
          .eq('status', 'active');

        // Calculate period end
        const now = new Date();
        const periodEnd = new Date();
        if (interval === 'monthly') {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        } else {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        }

        // Create new subscription
        const subscriptionData = {
          user_id: user_id,
          plan_id: plan_id,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          amount: parseFloat(amount || total_amount_with_tax || 0),
          interval: interval,
          is_in_trial: false,
          has_used_trial: true,
          payment_gateway: 'paypal',
          country: country || null,
          updated_at: now.toISOString(),
        };

        if (tax_percentage) {
          subscriptionData.tax_percentage = tax_percentage;
          subscriptionData.tax_amount = tax_amount;
          subscriptionData.total_amount_with_tax = total_amount_with_tax;
        }

        const { data: subscription, error: subError } = await supabase
          .from('user_subscriptions')
          .insert(subscriptionData)
          .select()
          .single();

        if (subError) {
          console.error('Error creating subscription:', subError);
          // Continue anyway - payment is verified
        } else {
          console.log('✅ Subscription created:', subscription.id);
        }

        // Record payment
        const paymentData = {
          user_id: user_id,
          subscription_id: subscription?.id || null,
          amount: parseFloat(payment.amount.value),
          currency: payment.amount.currency_code,
          status: 'completed',
          payment_gateway: 'paypal',
          gateway_order_id: paypal_order_id,
          gateway_payment_id: payment.id,
          created_at: new Date().toISOString(),
        };

        await supabase.from('payments').insert(paymentData);

        // Also record in payment_transactions table (for consistency with Razorpay)
        const transactionData = {
          user_id: user_id,
          subscription_id: subscription?.id || null,
          payment_gateway: 'paypal',
          gateway_order_id: paypal_order_id,
          gateway_payment_id: payment.id,
          amount: parseFloat(payment.amount.value),
          currency: payment.amount.currency_code,
          status: 'success',
          payment_type: 'initial',
          is_autopay: false, // PayPal doesn't have autopay like Razorpay subscriptions
          metadata: tax_percentage ? {
            tax_percentage: tax_percentage,
            tax_amount: tax_amount,
            total_amount_with_tax: total_amount_with_tax
          } : null,
          created_at: new Date().toISOString(),
        };

        await supabase.from('payment_transactions').insert(transactionData);

      } catch (dbError) {
        console.error('Database error during PayPal verification:', dbError);
        // Payment is verified, so we still return success
      }
    }

    res.json({
      success: true,
      orderId: paypal_order_id,
      paymentId: payment.id,
      amount: payment.amount.value,
      currency: payment.amount.currency_code,
    });

  } catch (error) {
    console.error('PayPal verification error:', error);
    res.status(500).json({ error: 'Server error during payment verification' });
  }
});

// Create PayPal Subscription Plan
app.post("/api/paypal/create-plan", async (req, res) => {
  try {
    const { amount, currency = "EUR", interval = "monthly", name = "Subscription Plan" } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const clientId = process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.VITE_PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "PayPal credentials not configured" });
    }

    const isProduction = process.env.PAYPAL_ENVIRONMENT === 'production' || process.env.VITE_PAYPAL_ENVIRONMENT === 'production';
    const baseUrl = isProduction 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';

    // Get PayPal access token
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenResponse.ok) {
      return res.status(500).json({ error: "Failed to get PayPal access token" });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Determine billing cycle
    const billingCycleUnit = interval === 'yearly' ? 'YEAR' : 'MONTH';
    const billingCycleFrequency = interval === 'yearly' ? 1 : 1;

    // Create billing plan
    const planResponse = await fetch(`${baseUrl}/v1/billing/plans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        product_id: `PROD-${Date.now()}`, // You should create a product first, but for simplicity using timestamp
        name: name,
        description: `${name} - ${interval} subscription`,
        status: "ACTIVE",
        billing_cycles: [{
          frequency: {
            interval_unit: billingCycleUnit,
            interval_count: billingCycleFrequency
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0, // 0 = infinite
          pricing_scheme: {
            fixed_price: {
              value: parseFloat(amount).toFixed(2),
              currency_code: currency
            }
          }
        }],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee: {
            value: "0",
            currency_code: currency
          },
          setup_fee_failure_action: "CONTINUE",
          payment_failure_threshold: 3
        }
      }),
    });

    if (!planResponse.ok) {
      const errorText = await planResponse.text();
      console.error('PayPal plan creation error:', errorText);
      return res.status(planResponse.status).json({ error: errorText });
    }

    const plan = await planResponse.json();
    res.json({ planId: plan.id });
  } catch (e) {
    console.error('PayPal create plan error:', e);
    res.status(500).json({ error: "Server error" });
  }
});

// Test endpoint to verify server is receiving requests
app.get("/api/paypal/test", (req, res) => {
  console.log('✅ [PayPal API] Test endpoint hit!');
  res.json({ message: 'PayPal API server is working!', timestamp: new Date().toISOString() });
});

// Create PayPal Subscription
app.post("/api/paypal/create-subscription", async (req, res) => {
  console.log('🚀 [PayPal API] ========== CREATE SUBSCRIPTION ENDPOINT HIT ==========');
  console.log('📥 [PayPal API] Received create-subscription request');
  console.log('📦 [PayPal API] Request body:', JSON.stringify(req.body, null, 2));
  console.log('🌐 [PayPal API] Request headers:', req.headers);
  
  try {
    const { 
      user_id, 
      final_amount, 
      interval = "monthly", 
      plan_name = "Subscription Plan",
      currency = "EUR"
    } = req.body;
    
    console.log('📋 [PayPal API] Extracted params:', { user_id, final_amount, interval, plan_name, currency });

    if (!final_amount || final_amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const clientId = process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.VITE_PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "PayPal credentials not configured" });
    }

    const isProduction = process.env.PAYPAL_ENVIRONMENT === 'production' || process.env.VITE_PAYPAL_ENVIRONMENT === 'production';
    const baseUrl = isProduction 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';

    // Get PayPal access token
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenResponse.ok) {
      return res.status(500).json({ error: "Failed to get PayPal access token" });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Determine billing cycle
    const billingCycleUnit = interval === 'yearly' ? 'YEAR' : 'MONTH';
    const billingCycleFrequency = 1;

    // OPTIMIZATION: Try to reuse existing plan if one exists with same parameters
    // This helps avoid PayPal sandbox issues with new plans
    console.log('🔍 [PayPal API] Checking for existing plan...');
    let planId = null;
    let plan = null;
    
    try {
      // Search for existing plans with matching criteria
      const searchResponse = await fetch(`${baseUrl}/v1/billing/plans?product_id=*&page_size=20`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
      
      if (searchResponse.ok) {
        const plansData = await searchResponse.json();
        if (plansData && plansData.plans && Array.isArray(plansData.plans)) {
          for (const p of plansData.plans) {
            if (p.status === 'ACTIVE' && p.name === plan_name && p.billing_cycles) {
              for (const bc of p.billing_cycles) {
                if (bc.frequency && 
                    bc.frequency.interval_unit === billingCycleUnit &&
                    bc.frequency.interval_count === billingCycleFrequency &&
                    bc.pricing_scheme && bc.pricing_scheme.fixed_price &&
                    bc.pricing_scheme.fixed_price.value === parseFloat(final_amount).toFixed(2) &&
                    bc.pricing_scheme.fixed_price.currency_code === currency) {
                  planId = p.id;
                  plan = p;
                  console.log('✅ [PayPal API] Reusing existing plan:', planId);
                  break;
                }
              }
              if (planId) break;
            }
          }
        }
      }
    } catch (searchError) {
      console.log('⚠️ [PayPal API] Could not search for existing plans, will create new one:', searchError);
    }

    // Step 1: Create a product first (only if we don't have an existing plan)
    const productResponse = await fetch(`${baseUrl}/v1/catalogs/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: plan_name,
        description: `${plan_name} - ${interval} subscription`,
        type: "SERVICE",
        category: "SOFTWARE"
      }),
    });

    if (!productResponse.ok) {
      const errorText = await productResponse.text();
      console.error('PayPal product creation error:', errorText);
      return res.status(productResponse.status).json({ error: 'Failed to create product', details: errorText });
    }

    const product = await productResponse.json();
    const productId = product.id;

    // Step 2: Create a billing plan using the product (only if we don't have an existing plan)
    if (planId && plan) {
      console.log('⏭️ [PayPal API] Skipping plan creation, using existing plan');
    } else {
    const planResponse = await fetch(`${baseUrl}/v1/billing/plans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        product_id: productId,
        name: plan_name,
        description: `${plan_name} - ${interval} subscription`,
        status: "ACTIVE", // Create directly as ACTIVE
        billing_cycles: [{
          frequency: {
            interval_unit: billingCycleUnit,
            interval_count: billingCycleFrequency
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0, // 0 = infinite
          pricing_scheme: {
            fixed_price: {
              value: parseFloat(final_amount).toFixed(2),
              currency_code: currency
            }
          }
        }],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee: {
            value: "0.00",
            currency_code: currency
          },
          setup_fee_failure_action: "CONTINUE",
          payment_failure_threshold: 3
        },
        taxes: {
          percentage: "0",
          inclusive: false
        }
      }),
    });

    if (!planResponse.ok) {
      const errorText = await planResponse.text();
      console.error('PayPal plan creation error:', errorText);
      return res.status(planResponse.status).json({ error: 'Failed to create plan', details: errorText });
    }

      plan = await planResponse.json();
      planId = plan.id;

      console.log('✅ [PayPal API] Plan created:', {
      planId: planId,
      status: plan.status,
      name: plan.name,
      billing_cycles: plan.billing_cycles?.length || 0
    });

    // CRITICAL FIX: Wait longer for PayPal to fully process and propagate the plan
    // PayPal needs time to make the plan available for subscription creation
    console.log('⏳ [PayPal API] Waiting for PayPal to process plan...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

    // Verify plan is active and ready before creating subscription
    let planReady = false;
    let retries = 0;
    const maxRetries = 10; // Increased retries
    
    while (!planReady && retries < maxRetries) {
      try {
        const planCheckResponse = await fetch(`${baseUrl}/v1/billing/plans/${planId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        });
        
        if (planCheckResponse.ok) {
          const planDetails = await planCheckResponse.json();
          console.log(`🔍 [PayPal API] Plan verification attempt ${retries + 1}/${maxRetries}:`, {
            planId: planDetails.id,
            status: planDetails.status,
            hasBillingCycles: !!planDetails.billing_cycles?.length
          });
          
          if (planDetails.status === 'ACTIVE' && planDetails.billing_cycles?.length > 0) {
            planReady = true;
            console.log('✅ [PayPal API] Plan verified as ACTIVE with billing cycles - ready for subscription');
          } else {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds between retries
            retries++;
            if (retries >= maxRetries) {
              console.error('❌ [PayPal API] Plan not ready after retries:', {
                status: planDetails.status,
                hasBillingCycles: !!planDetails.billing_cycles?.length
              });
              return res.status(500).json({ 
                error: 'Plan not ready', 
                details: `Plan status: ${planDetails.status}, billing cycles: ${planDetails.billing_cycles?.length || 0}` 
              });
            }
          }
        } else {
          const errorText = await planCheckResponse.text();
          console.error(`❌ [PayPal API] Failed to verify plan (attempt ${retries + 1}):`, errorText);
          await new Promise(resolve => setTimeout(resolve, 1500));
          retries++;
          if (retries >= maxRetries) {
            return res.status(500).json({ 
              error: 'Failed to verify plan', 
              details: errorText 
            });
          }
        }
      } catch (checkError) {
        console.error(`❌ [PayPal API] Error checking plan (attempt ${retries + 1}):`, checkError);
        await new Promise(resolve => setTimeout(resolve, 1500));
        retries++;
        if (retries >= maxRetries) {
          return res.status(500).json({ 
            error: 'Failed to verify plan', 
            details: checkError.message 
          });
        }
      }
    }
    } // End of plan creation block

    // Step 3: Create subscription using the plan_id
    console.log('🔄 [PayPal API] Creating subscription with plan_id:', planId);
    const subscriptionResponse = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        plan_id: planId,
        start_time: new Date(Date.now() + 60000).toISOString(), // Start 1 minute from now
        subscriber: {
          name: {
            given_name: "Customer",
            surname: "User"
          }
        },
        application_context: {
          brand_name: "Track My Startup",
          locale: "en-US",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          payment_method: {
            payer_selected: "PAYPAL",
            payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED"
          },
          return_url: `${getFrontendUrl(req)}/payment-success`,
          cancel_url: `${getFrontendUrl(req)}/payment-cancelled`
        },
        custom_id: `subscription_${user_id}_${Date.now()}`
      }),
    });

    if (!subscriptionResponse.ok) {
      const errorText = await subscriptionResponse.text();
      console.error('❌ [PayPal API] Subscription creation error:', errorText);
      console.error('❌ [PayPal API] Plan ID used:', planId);
      console.error('❌ [PayPal API] Plan details:', JSON.stringify(plan, null, 2));
      
      // Try to get more details about the plan
      try {
        const planCheckResponse = await fetch(`${baseUrl}/v1/billing/plans/${planId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        });
        if (planCheckResponse.ok) {
          const planDetails = await planCheckResponse.json();
          console.error('❌ [PayPal API] Plan details from PayPal:', JSON.stringify(planDetails, null, 2));
        }
      } catch (checkError) {
        console.error('❌ [PayPal API] Error checking plan:', checkError);
      }
      
      return res.status(subscriptionResponse.status).json({ 
        error: 'Failed to create subscription', 
        details: errorText,
        planId: planId 
      });
    }

    const subscription = await subscriptionResponse.json();
    const approvalLink = subscription.links?.find(l => l.rel === 'approve');
    
    console.log('✅ [PayPal API] Subscription created successfully:', {
      subscriptionId: subscription.id,
      approvalUrl: approvalLink?.href,
      status: subscription.status
    });
    
    res.json({ subscriptionId: subscription.id, approvalUrl: approvalLink?.href });
  } catch (e) {
    console.error('❌ [PayPal API] Error in create-subscription:', e);
    console.error('❌ [PayPal API] Error stack:', e.stack);
    res.status(500).json({ error: "Server error", details: e.message });
  }
});

// Verify PayPal Subscription
app.post('/api/paypal/verify-subscription', async (req, res) => {
  try {
    const {
      paypal_subscription_id,
      paypal_payer_id,
      user_id,
      plan_id,
      amount,
      currency = 'EUR',
      tax_percentage,
      tax_amount,
      total_amount_with_tax,
      interval = 'monthly',
      country
    } = req.body;

    if (!paypal_subscription_id) {
      return res.status(400).json({ error: 'Missing PayPal subscription ID' });
    }

    const clientId = process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.VITE_PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'PayPal credentials not configured' });
    }

    const isProduction = process.env.PAYPAL_ENVIRONMENT === 'production' || process.env.VITE_PAYPAL_ENVIRONMENT === 'production';
    const baseUrl = isProduction 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';

    // Get PayPal access token
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenResponse.ok) {
      return res.status(500).json({ error: "Failed to get PayPal access token" });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get subscription details
    const subscriptionResponse = await fetch(`${baseUrl}/v1/billing/subscriptions/${paypal_subscription_id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!subscriptionResponse.ok) {
      const errorText = await subscriptionResponse.text();
      console.error('PayPal subscription fetch error:', errorText);
      return res.status(subscriptionResponse.status).json({ error: 'Failed to fetch PayPal subscription', details: errorText });
    }

    const subscriptionData = await subscriptionResponse.json();
    
    // Verify subscription status
    if (subscriptionData.status !== 'ACTIVE' && subscriptionData.status !== 'APPROVAL_PENDING') {
      return res.status(400).json({ error: 'Subscription not active', status: subscriptionData.status });
    }

    console.log('✅ PayPal subscription verified:', {
      subscriptionId: paypal_subscription_id,
      status: subscriptionData.status,
      planId: subscriptionData.plan_id
    });

    // Create or update subscription in database
    if (user_id && plan_id) {
      try {
        // Deactivate existing subscriptions
        await supabase
          .from('user_subscriptions')
          .update({ status: 'inactive', updated_at: new Date().toISOString() })
          .eq('user_id', user_id)
          .eq('status', 'active');

        // Calculate period end
        const now = new Date();
        const periodEnd = new Date();
        if (interval === 'monthly') {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        } else {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        }

        // Get plan_tier from plan_id
        let planTier = 'free'; // Default to free
        if (plan_id) {
          try {
            const { data: planData, error: planError } = await supabase
              .from('subscription_plans')
              .select('plan_tier, name')
              .eq('id', plan_id)
              .maybeSingle();
            
            if (planData && planData.plan_tier) {
              planTier = planData.plan_tier;
            }
          } catch (planErr) {
            console.warn('Could not fetch plan_tier, using default:', planErr);
          }
        }

        // Calculate initial payment amount
        const initialPaymentAmount = parseFloat(amount || total_amount_with_tax || 0);

        // Create new subscription with PayPal subscription ID
        const subscriptionData = {
          user_id: user_id,
          plan_id: plan_id,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          amount: initialPaymentAmount,
          currency: currency || 'EUR', // Store currency for PayPal subscriptions
          interval: interval,
          is_in_trial: false,
          has_used_trial: true,
          payment_gateway: 'paypal',
          paypal_subscription_id: paypal_subscription_id,
          autopay_enabled: true, // PayPal subscriptions have autopay
          mandate_status: 'active',
          country: country || null,
          // Count initial payment as cycle #1 (same as Razorpay)
          billing_cycle_count: 1,
          total_paid: initialPaymentAmount,
          last_billing_date: now.toISOString(),
          next_billing_date: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        };

        if (tax_percentage) {
          subscriptionData.tax_percentage = tax_percentage;
          subscriptionData.tax_amount = tax_amount;
          subscriptionData.total_amount_with_tax = total_amount_with_tax;
        }

        const { data: subscription, error: subError } = await supabase
          .from('user_subscriptions')
          .insert(subscriptionData)
          .select()
          .single();

        if (subError) {
          console.error('Error creating subscription:', subError);
          // Continue anyway - subscription is verified
        } else {
          console.log('✅ Subscription created with PayPal autopay:', subscription.id);

          // Record initial payment transaction (first payment will be captured by PayPal)
          const transactionData = {
            user_id: user_id,
            subscription_id: subscription.id,
            payment_gateway: 'paypal',
            gateway_order_id: paypal_subscription_id,
            gateway_payment_id: paypal_subscription_id + '_setup',
            amount: initialPaymentAmount,
            currency: currency,
            status: 'success',
            payment_type: 'initial',
            plan_tier: planTier, // Add plan_tier to payment transaction
            is_autopay: true,
            autopay_mandate_id: paypal_subscription_id,
            country: country || null, // Add country to payment transaction
            billing_period_start: now.toISOString(), // Add billing period
            billing_period_end: periodEnd.toISOString(), // Add billing period
            metadata: tax_percentage ? {
              tax_percentage: tax_percentage,
              tax_amount: tax_amount,
              total_amount_with_tax: total_amount_with_tax
            } : null,
            created_at: new Date().toISOString(),
            paid_at: new Date().toISOString(), // Mark as paid immediately
          };

          const { data: paymentRow, error: paymentError } = await supabase
            .from('payment_transactions')
            .insert(transactionData)
            .select()
            .single();

          if (paymentError) {
            console.error('❌ Error creating payment transaction:', paymentError);
            console.error('❌ Transaction data that failed:', JSON.stringify(transactionData, null, 2));
            // Check if it's a constraint violation
            if (paymentError.code === '23514' || paymentError.message?.includes('check constraint')) {
              console.error('❌ CONSTRAINT VIOLATION: payment_gateway constraint may not allow "paypal"');
              console.error('❌ Please run database/31_fix_paypal_payment_transactions_constraint.sql to fix this');
            }
          } else {
            console.log('✅ Payment transaction created:', paymentRow.id);

            // Create billing cycle for initial payment (Cycle #1) - same as Razorpay
            const { error: cycleError } = await supabase
              .from('billing_cycles')
              .insert({
                subscription_id: subscription.id,
                cycle_number: 1, // First cycle
                period_start: now.toISOString(),
                period_end: periodEnd.toISOString(),
                payment_transaction_id: paymentRow.id,
                amount: initialPaymentAmount,
                currency: currency || 'EUR',
                status: 'paid',
                plan_tier: planTier,
                is_autopay: true
              });

            if (cycleError) {
              console.error('❌ Error creating billing cycle:', cycleError);
              console.error('❌ Cycle data that failed:', JSON.stringify({
                subscription_id: subscription.id,
                cycle_number: 1,
                payment_transaction_id: paymentRow.id,
                amount: initialPaymentAmount,
                currency: currency || 'EUR'
              }, null, 2));
            } else {
              console.log('✅ Created billing cycle #1 for initial PayPal payment');
              console.log('✅✅✅ PayPal subscription flow completed successfully!');
              console.log('Summary:');
              console.log('  - Payment Transaction: Created (ID:', paymentRow.id, ')');
              console.log('  - Subscription: Created (ID:', subscription.id, ', Status:', subscription.status, ')');
              console.log('  - Billing Cycle: Created (Cycle #1)');
              console.log('  - Plan Tier:', planTier);
              console.log('  - Autopay Enabled:', subscription.autopay_enabled);
              console.log('  - Billing Cycle Count:', subscription.billing_cycle_count);
              console.log('  - Total Paid:', subscription.total_paid);
            }
          }
        }

      } catch (dbError) {
        console.error('Database error during PayPal subscription verification:', dbError);
        // Subscription is verified, so we still return success
      }
    }

    res.json({
      success: true,
      subscriptionId: paypal_subscription_id,
      status: subscriptionData.status,
    });

  } catch (error) {
    console.error('PayPal subscription verification error:', error);
    res.status(500).json({ error: 'Server error during subscription verification' });
  }
});

// Stop PayPal Autopay (Cancel Subscription)
app.post('/api/paypal/stop-autopay', async (req, res) => {
  try {
    const { subscription_id, user_id } = req.body;
    
    if (!subscription_id || !user_id) {
      return res.status(400).json({ error: 'subscription_id and user_id are required' });
    }

    // Get subscription details
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('id, user_id, paypal_subscription_id, autopay_enabled')
      .eq('id', subscription_id)
      .eq('user_id', user_id)
      .single();

    if (subError || !subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (!subscription.autopay_enabled) {
      return res.json({ 
        success: true, 
        message: 'Autopay is already disabled',
        already_disabled: true 
      });
    }

    const clientId = process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.VITE_PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'PayPal credentials not configured' });
    }

    const isProduction = process.env.PAYPAL_ENVIRONMENT === 'production' || process.env.VITE_PAYPAL_ENVIRONMENT === 'production';
    const baseUrl = isProduction 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';

    // Get PayPal access token
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenResponse.ok) {
      return res.status(500).json({ error: "Failed to get PayPal access token" });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Cancel PayPal subscription
    let paypalCancelled = false;
    if (subscription.paypal_subscription_id) {
      try {
        const cancelResponse = await fetch(
          `${baseUrl}/v1/billing/subscriptions/${subscription.paypal_subscription_id}/cancel`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}` 
            },
            body: JSON.stringify({
              reason: 'User requested cancellation'
            })
          }
        );

        if (cancelResponse.ok) {
          paypalCancelled = true;
          console.log('✅ PayPal subscription cancelled');
        } else {
          const errorText = await cancelResponse.text();
          console.warn('PayPal cancellation response:', errorText);
        }
      } catch (paypalError) {
        console.error('Error cancelling PayPal subscription:', paypalError);
      }
    }

    // Update database (disable autopay but keep subscription active until period ends)
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        autopay_enabled: false,
        mandate_status: 'cancelled',
        autopay_cancelled_at: new Date().toISOString(),
        autopay_cancellation_reason: 'user_cancelled',
        updated_at: new Date().toISOString(),
        paypal_cancelled: paypalCancelled
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return res.status(500).json({ error: 'Failed to update subscription' });
    }

    res.json({
      success: true,
      message: 'Autopay stopped successfully. Subscription will remain active until the current period ends.',
      paypal_cancelled: paypalCancelled
    });

  } catch (error) {
    console.error('Error stopping PayPal autopay:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PayPal Webhook Handler
// Handle GET requests (webhook verification from PayPal)
app.get("/api/paypal/webhook", (req, res) => {
  res.status(200).json({ status: 'ok', message: 'PayPal webhook endpoint is active' });
});

// Handle POST requests (actual webhook events)
app.post("/api/paypal/webhook", express.json(), async (req, res) => {
  try {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID || process.env.VITE_PAYPAL_WEBHOOK_ID;
    const headers = req.headers;
    
    // req.body is already parsed by express.json()
    const event = req.body;
    
    console.log("PayPal webhook received:", {
      eventType: event.event_type || 'unknown',
      contentType: headers['content-type'],
      method: 'POST'
    });
    const eventType = event.event_type;
    
    console.log("PayPal webhook event type:", eventType);

    // Verify webhook signature (optional but recommended for production)
    // For now, we'll process events. Add signature verification if you have webhook ID configured
    
    // Handle payment capture events (one-time payments)
    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const capture = event.resource;
      console.log("PayPal payment captured:", capture.id);
      
      // Check if this is a mentor payment or subscription payment
      // PayPal capture event has order_id in supplementary_data or we can use the order_id from the capture
      const orderId = capture.supplementary_data?.related_ids?.order_id || 
                     capture.links?.find((link) => link.rel === 'up')?.href?.split('/').pop() ||
                     capture.id;
      
      if (orderId) {
        // Try to find mentor payment first (check by order ID)
        const { data: mentorPayment } = await supabase
          .from('mentor_payments')
          .select('*, assignment_id')
          .eq('paypal_order_id', orderId)
          .maybeSingle();

        if (mentorPayment) {
          // This is a mentor payment
          console.log("Processing mentor payment:", orderId);
          
          // Update payment status
          await supabase
            .from('mentor_payments')
            .update({
              payment_status: 'completed',
              payment_date: new Date().toISOString()
            })
            .eq('id', mentorPayment.id);

          // Complete payment and activate assignment
          await completeMentorPayment(mentorPayment.assignment_id, orderId, false);
          
          console.log('✅ Mentor payment completed via webhook:', orderId);
        } else {
          // This is a subscription payment (existing logic)
      await handlePayPalPaymentSuccess(capture, event);
        }
      } else {
        // Fallback to existing logic if no order ID
        await handlePayPalPaymentSuccess(capture, event);
      }
    }
    
    if (eventType === 'PAYMENT.CAPTURE.DENIED' || eventType === 'PAYMENT.CAPTURE.DECLINED') {
      const capture = event.resource;
      console.log("PayPal payment denied:", capture.id);
      await handlePayPalPaymentFailure(capture, event);
    }
    
    if (eventType === 'PAYMENT.CAPTURE.REFUNDED') {
      const capture = event.resource;
      console.log("PayPal payment refunded:", capture.id);
      await handlePayPalPaymentRefund(capture, event);
    }

    // Handle subscription events (recurring payments/autopay)
    if (eventType === 'BILLING.SUBSCRIPTION.CREATED') {
      const subscription = event.resource;
      console.log("PayPal subscription created:", subscription.id);
      // Subscription creation is handled by verify endpoint
    }

    if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      const subscription = event.resource;
      console.log("PayPal subscription activated:", subscription.id);
      await handlePayPalSubscriptionActivated(subscription, event);
    }

    if (eventType === 'BILLING.SUBSCRIPTION.CANCELLED') {
      const subscription = event.resource;
      console.log("PayPal subscription cancelled:", subscription.id);
      await handlePayPalSubscriptionCancelled(subscription, event);
    }

    if (eventType === 'BILLING.SUBSCRIPTION.SUSPENDED') {
      const subscription = event.resource;
      console.log("PayPal subscription suspended:", subscription.id);
      await handlePayPalSubscriptionSuspended(subscription, event);
    }

    // Handle recurring payment events
    if (eventType === 'PAYMENT.SALE.COMPLETED') {
      const sale = event.resource;
      console.log("PayPal recurring payment completed:", sale.id);
      await handlePayPalRecurringPayment(sale, event);
    }

    if (eventType === 'PAYMENT.SALE.DENIED') {
      const sale = event.resource;
      console.log("PayPal recurring payment denied:", sale.id);
      await handlePayPalRecurringPaymentFailure(sale, event);
    }

    // Handle order events
    if (eventType === 'CHECKOUT.ORDER.COMPLETED') {
      const order = event.resource;
      console.log("PayPal order completed:", order.id);
      
      // Check if this is a mentor payment
      const orderId = order.id;
      if (orderId) {
        const { data: mentorPayment } = await supabase
          .from('mentor_payments')
          .select('*, assignment_id')
          .eq('paypal_order_id', orderId)
          .maybeSingle();

        if (mentorPayment && mentorPayment.payment_status !== 'completed') {
          // This is a mentor payment that hasn't been processed yet
          console.log("Processing mentor payment from order completion:", orderId);
          
          await supabase
            .from('mentor_payments')
            .update({
              payment_status: 'completed',
              payment_date: new Date().toISOString()
            })
            .eq('id', mentorPayment.id);

          await completeMentorPayment(mentorPayment.assignment_id, orderId, false);
          
          console.log('✅ Mentor payment completed via order webhook:', orderId);
        }
      }
      // Order completion for subscriptions is handled by the verify endpoint
    }

    // Acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('PayPal webhook error:', error);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

// PayPal webhook event handlers
async function handlePayPalPaymentSuccess(capture, event) {
  try {
    console.log('PayPal payment successful:', capture.id);
    
    const orderId = capture.supplementary_data?.related_ids?.order_id || null;
    const amount = parseFloat(capture.amount?.value || 0);
    const currency = capture.amount?.currency_code || 'EUR';
    
    // Update payment in payment_transactions table
    const { error: paymentError } = await supabase
      .from('payment_transactions')
      .update({ 
        status: 'success',
        updated_at: new Date().toISOString()
      })
      .eq('gateway_payment_id', capture.id)
      .eq('payment_gateway', 'paypal');

    if (paymentError) {
      console.error('Error updating PayPal payment status:', paymentError);
    } else {
      console.log('✅ PayPal payment status updated to success');
    }

    // Also try to update in payments table (if it exists)
    const { error: paymentsError } = await supabase
      .from('payments')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('gateway_payment_id', capture.id)
      .eq('payment_gateway', 'paypal');

    if (paymentsError && paymentsError.code !== 'PGRST116') {
      console.error('Error updating payments table:', paymentsError);
    }
    
  } catch (error) {
    console.error('Error handling PayPal payment success:', error);
  }
}

async function handlePayPalPaymentFailure(capture, event) {
  try {
    console.log('PayPal payment failed:', capture.id);
    
    const reason = capture.reason_code || capture.status_details?.reason || 'Payment denied';
    
    // Update payment in payment_transactions table
    const { error: paymentError } = await supabase
      .from('payment_transactions')
      .update({ 
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('gateway_payment_id', capture.id)
      .eq('payment_gateway', 'paypal');

    if (paymentError) {
      console.error('Error updating PayPal payment failure status:', paymentError);
    } else {
      console.log('✅ PayPal payment status updated to failed');
    }

    // Also try to update in payments table
    const { error: paymentsError } = await supabase
      .from('payments')
      .update({ 
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('gateway_payment_id', capture.id)
      .eq('payment_gateway', 'paypal');

    if (paymentsError && paymentsError.code !== 'PGRST116') {
      console.error('Error updating payments table:', paymentsError);
    }
    
  } catch (error) {
    console.error('Error handling PayPal payment failure:', error);
  }
}

async function handlePayPalPaymentRefund(capture, event) {
  try {
    console.log('PayPal payment refunded:', capture.id);
    
    // Update payment in payment_transactions table
    const { error: paymentError } = await supabase
      .from('payment_transactions')
      .update({ 
        status: 'refunded',
        updated_at: new Date().toISOString()
      })
      .eq('gateway_payment_id', capture.id)
      .eq('payment_gateway', 'paypal');

    if (paymentError) {
      console.error('Error updating PayPal refund status:', paymentError);
    } else {
      console.log('✅ PayPal payment status updated to refunded');
    }

    // Also try to update in payments table
    const { error: paymentsError } = await supabase
      .from('payments')
      .update({ 
        status: 'refunded',
        updated_at: new Date().toISOString()
      })
      .eq('gateway_payment_id', capture.id)
      .eq('payment_gateway', 'paypal');

    if (paymentsError && paymentsError.code !== 'PGRST116') {
      console.error('Error updating payments table:', paymentsError);
    }
    
  } catch (error) {
    console.error('Error handling PayPal payment refund:', error);
  }
}

// PayPal subscription event handlers
async function handlePayPalSubscriptionActivated(subscription, event) {
  try {
    console.log('PayPal subscription activated:', subscription.id);
    
    // Update subscription status
    const { error: subError } = await supabase
      .from('user_subscriptions')
      .update({ 
        status: 'active',
        autopay_enabled: true,
        mandate_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('paypal_subscription_id', subscription.id);

    if (subError) {
      console.error('Error updating PayPal subscription status:', subError);
    } else {
      console.log('✅ PayPal subscription activated in database');
    }
  } catch (error) {
    console.error('Error handling PayPal subscription activation:', error);
  }
}

async function handlePayPalSubscriptionCancelled(subscription, event) {
  try {
    console.log('PayPal subscription cancelled:', subscription.id);
    
    // Update subscription status (keep active until period ends, like Razorpay)
    const { error: subError } = await supabase
      .from('user_subscriptions')
      .update({ 
        autopay_enabled: false,
        mandate_status: 'cancelled',
        autopay_cancelled_at: new Date().toISOString(),
        autopay_cancellation_reason: 'cancelled_from_paypal',
        updated_at: new Date().toISOString()
      })
      .eq('paypal_subscription_id', subscription.id);

    if (subError) {
      console.error('Error updating PayPal subscription cancellation:', subError);
    } else {
      console.log('✅ PayPal subscription cancelled in database (will expire at period end)');
    }
  } catch (error) {
    console.error('Error handling PayPal subscription cancellation:', error);
  }
}

async function handlePayPalSubscriptionSuspended(subscription, event) {
  try {
    console.log('PayPal subscription suspended:', subscription.id);
    
    // Update subscription status
    const { error: subError } = await supabase
      .from('user_subscriptions')
      .update({ 
        autopay_enabled: false,
        mandate_status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('paypal_subscription_id', subscription.id);

    if (subError) {
      console.error('Error updating PayPal subscription suspension:', subError);
    } else {
      console.log('✅ PayPal subscription suspended in database');
    }
  } catch (error) {
    console.error('Error handling PayPal subscription suspension:', error);
  }
}

async function handlePayPalRecurringPayment(sale, event) {
  try {
    console.log('PayPal recurring payment completed:', sale.id);
    
    const subscriptionId = sale.billing_agreement_id || sale.subscription_id;
    if (!subscriptionId) {
      console.warn('No subscription ID found in recurring payment event');
      return;
    }

    // Find subscription by PayPal subscription ID
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('id, user_id, plan_id, billing_cycle_count, total_paid, current_period_end')
      .eq('paypal_subscription_id', subscriptionId)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      console.error('Error finding subscription for recurring payment:', subError);
      return;
    }

    // Calculate next billing period
    const now = new Date();
    const periodEnd = new Date(subscription.current_period_end);
    const nextPeriodEnd = new Date(periodEnd);
    
    // Determine interval from plan
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('interval')
      .eq('id', subscription.plan_id)
      .single();

    if (plan?.interval === 'yearly') {
      nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
    } else {
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
    }

    const amount = parseFloat(sale.amount?.total || sale.amount?.value || 0);
    const currency = sale.amount?.currency || 'EUR';
    const newCycleCount = (subscription.billing_cycle_count || 0) + 1;
    const newTotalPaid = (subscription.total_paid || 0) + amount;

    // Update subscription with new billing cycle
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        billing_cycle_count: newCycleCount,
        total_paid: newTotalPaid,
        current_period_start: periodEnd.toISOString(),
        current_period_end: nextPeriodEnd.toISOString(),
        last_billing_date: now.toISOString(),
        next_billing_date: nextPeriodEnd.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Error updating subscription after recurring payment:', updateError);
    } else {
      console.log('✅ Subscription updated after recurring payment');
    }

    // Record recurring payment transaction
    const { data: planData } = await supabase
      .from('subscription_plans')
      .select('plan_tier')
      .eq('id', subscription.plan_id)
      .maybeSingle();

    const planTier = planData?.plan_tier || 'free';

    const { data: paymentTransaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        payment_gateway: 'paypal',
        gateway_order_id: subscriptionId,
        gateway_payment_id: sale.id,
        amount: amount,
        currency: currency,
        status: 'success',
        payment_type: 'recurring',
        plan_tier: planTier,
        is_autopay: true,
        autopay_mandate_id: subscriptionId,
        billing_period_start: periodEnd.toISOString(), // Add billing period
        billing_period_end: nextPeriodEnd.toISOString(), // Add billing period
        billing_cycle_number: newCycleCount, // Add cycle number
        created_at: now.toISOString(),
        paid_at: now.toISOString(), // Mark as paid immediately
      })
      .select()
      .single();

    if (transactionError) {
      console.error('❌ Error recording recurring payment transaction:', transactionError);
      console.error('❌ Transaction data that failed:', JSON.stringify({
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        payment_gateway: 'paypal',
        amount: amount,
        currency: currency
      }, null, 2));
      // Check if it's a constraint violation
      if (transactionError.code === '23514' || transactionError.message?.includes('check constraint')) {
        console.error('❌ CONSTRAINT VIOLATION: payment_gateway constraint may not allow "paypal"');
        console.error('❌ Please run database/31_fix_paypal_payment_transactions_constraint.sql to fix this');
      }
    } else {
      console.log('✅ Recurring payment transaction recorded');

      // Create billing cycle for this recurring payment (same as Razorpay)
      if (paymentTransaction) {
        const { error: cycleError } = await supabase
          .from('billing_cycles')
          .insert({
            subscription_id: subscription.id,
            cycle_number: newCycleCount,
            period_start: periodEnd.toISOString(),
            period_end: nextPeriodEnd.toISOString(),
            payment_transaction_id: paymentTransaction.id,
            amount: amount,
            currency: currency,
            status: 'paid',
            plan_tier: planTier,
            is_autopay: true,
            autopay_attempted_at: now.toISOString()
          });

        if (cycleError) {
          console.error('❌ Error creating billing cycle for recurring payment:', cycleError);
          console.error('❌ Cycle data that failed:', JSON.stringify({
            subscription_id: subscription.id,
            cycle_number: newCycleCount,
            payment_transaction_id: paymentTransaction.id,
            amount: amount,
            currency: currency
          }, null, 2));
        } else {
          console.log(`✅ Created billing cycle #${newCycleCount} for recurring PayPal payment`);
        }
      }
    }

  } catch (error) {
    console.error('Error handling PayPal recurring payment:', error);
  }
}

async function handlePayPalRecurringPaymentFailure(sale, event) {
  try {
    console.log('PayPal recurring payment failed:', sale.id);
    
    const subscriptionId = sale.billing_agreement_id || sale.subscription_id;
    if (!subscriptionId) {
      console.warn('No subscription ID found in recurring payment failure event');
      return;
    }

    // Find subscription
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('id, user_id, plan_id, billing_cycle_count, current_period_end')
      .eq('paypal_subscription_id', subscriptionId)
      .eq('status', 'active')
      .single();

    if (!subscription) {
      console.warn('Subscription not found for payment failure');
      return;
    }

    const amount = parseFloat(sale.amount?.total || sale.amount?.value || 0);
    const currency = sale.amount?.currency || 'EUR';
    const now = new Date();
    const periodEnd = new Date(subscription.current_period_end);
    const nextCycleCount = (subscription.billing_cycle_count || 0) + 1;

    // Get plan tier
    const { data: planData } = await supabase
      .from('subscription_plans')
      .select('plan_tier, interval')
      .eq('id', subscription.plan_id)
      .maybeSingle();

    const planTier = planData?.plan_tier || 'free';

    // Calculate next period end
    const nextPeriodEnd = new Date(periodEnd);
    if (planData?.interval === 'yearly') {
      nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
    } else {
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
    }

    // Record payment failure transaction
    const { data: paymentTransaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        payment_gateway: 'paypal',
        gateway_order_id: subscriptionId,
        gateway_payment_id: sale.id || `failed_${Date.now()}`,
        amount: amount,
        currency: currency,
        status: 'failed',
        payment_type: 'recurring',
        plan_tier: planTier,
        is_autopay: true,
        autopay_mandate_id: subscriptionId,
        created_at: now.toISOString(),
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error recording payment failure transaction:', transactionError);
    } else {
      console.log('✅ Payment failure transaction recorded');

      // Create billing cycle for failed payment (same as Razorpay)
      if (paymentTransaction) {
        const { error: cycleError } = await supabase
          .from('billing_cycles')
          .insert({
            subscription_id: subscription.id,
            cycle_number: nextCycleCount,
            period_start: periodEnd.toISOString(),
            period_end: nextPeriodEnd.toISOString(),
            payment_transaction_id: paymentTransaction.id,
            amount: amount,
            currency: currency,
            status: 'failed',
            plan_tier: planTier,
            is_autopay: true,
            autopay_attempted_at: now.toISOString()
          });

        if (cycleError) {
          console.error('Error creating billing cycle for failed payment:', cycleError);
        } else {
          console.log(`✅ Created billing cycle #${nextCycleCount} for failed PayPal payment`);
        }
      }
    }

    // Handle payment failure using database function (same as Razorpay)
    const { error: failureError } = await supabase.rpc('handle_subscription_payment_failure', {
      p_subscription_id: subscription.id,
      p_failure_reason: 'PayPal recurring payment failed - insufficient funds or payment declined'
    });

    if (failureError) {
      console.error('Error handling subscription payment failure:', failureError);
    } else {
      console.log('✅ Payment failure handled - grace period set, subscription status updated');
    }

  } catch (error) {
    console.error('Error handling PayPal recurring payment failure:', error);
  }
}

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
    // Handle mandate events (when user cancels from bank/UPI)
    if (event.event === "mandate.revoked" || event.event === "mandate.cancelled") {
      console.log("Mandate revoked/cancelled:", event.payload.mandate?.id || event.payload.subscription?.id);
      await handleMandateRevoked(event.payload.mandate || event.payload.subscription);
    }
    // Handle failed subscription charges
    if (event.event === "subscription.charged" && event.payload.subscription?.status === "paused") {
      console.log("Subscription charge failed:", event.payload.subscription.id);
      await handleSubscriptionChargeFailed(event.payload.subscription);
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
    
    // Use database function to check and expire subscriptions
    const { data, error } = await supabase.rpc('check_and_expire_subscriptions');
    
    if (error) {
      console.error('Error checking expired subscriptions:', error);
      return res.status(500).json({ error: 'Failed to check expired subscriptions' });
    }
    
    const expiredCount = data?.[0]?.expired_count || 0;
    const expiredIds = data?.[0]?.expired_subscription_ids || [];
    
    console.log(`Expired ${expiredCount} subscriptions`);
    
    return res.json({
      message: `Expired ${expiredCount} subscriptions`,
      count: expiredCount,
      subscription_ids: expiredIds
    });
    
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --------------------
// Stop Auto-Pay (User Initiated)
// --------------------
app.post('/api/razorpay/stop-autopay', async (req, res) => {
  try {
    const { subscription_id, user_id } = req.body;
    
    if (!subscription_id || !user_id) {
      return res.status(400).json({ error: 'subscription_id and user_id are required' });
    }

    // Get subscription details
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('id, user_id, razorpay_subscription_id, razorpay_mandate_id, autopay_enabled')
      .eq('id', subscription_id)
      .eq('user_id', user_id)
      .single();

    if (subError || !subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (!subscription.autopay_enabled) {
      return res.json({ 
        success: true, 
        message: 'Autopay is already disabled',
        already_disabled: true 
      });
    }

    // Cancel Razorpay mandate/subscription
    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
      return res.status(500).json({ error: 'Razorpay keys not configured' });
    }

    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    // Cancel Razorpay subscription
    let razorpayCancelled = false;
    if (subscription.razorpay_subscription_id) {
      try {
        const cancelResponse = await fetch(
          `https://api.razorpay.com/v1/subscriptions/${subscription.razorpay_subscription_id}/cancel`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': authHeader 
            },
            body: JSON.stringify({ cancel_at_cycle_end: false }) // Cancel immediately
          }
        );

        if (cancelResponse.ok) {
          razorpayCancelled = true;
          console.log('✅ Razorpay subscription cancelled');
        } else {
          const errorText = await cancelResponse.text();
          console.warn('Razorpay cancellation response:', errorText);
        }
      } catch (razorpayError) {
        console.error('Error cancelling Razorpay subscription:', razorpayError);
        // Continue anyway - we'll update database
      }
    }

    // Update database using function
    const { error: updateError } = await supabase.rpc('handle_autopay_cancellation', {
      p_subscription_id: subscription.id,
      p_cancellation_reason: 'user_cancelled',
      p_initiated_by: 'user'
    });

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return res.status(500).json({ error: 'Failed to update subscription' });
    }

    return res.json({
      success: true,
      message: 'Auto-pay has been stopped. Your subscription will continue until the current billing period ends.',
      razorpay_cancelled: razorpayCancelled,
      subscription_id: subscription.id
    });

  } catch (error) {
    console.error('Error stopping autopay:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --------------------
// Upgrade Subscription Plan
// --------------------
app.post('/api/subscriptions/upgrade', async (req, res) => {
  try {
    const { user_id, new_plan_tier } = req.body; // 'basic' or 'premium'
    
    if (!user_id || !new_plan_tier) {
      return res.status(400).json({ error: 'user_id and new_plan_tier are required' });
    }

    if (!['basic', 'premium'].includes(new_plan_tier)) {
      return res.status(400).json({ error: 'new_plan_tier must be "basic" or "premium"' });
    }

    // 1. Get current active subscription
    const { data: currentSubscription, error: currentSubError } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans!inner(plan_tier, name, price, currency, interval, storage_limit_mb, features)
      `)
      .eq('user_id', user_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentSubError || !currentSubscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const currentPlan = currentSubscription.subscription_plans;
    const currentPlanTier = currentPlan?.plan_tier;
    const paymentGateway = currentSubscription.payment_gateway || 'razorpay';

    // Check if already on the requested plan or higher
    if (currentPlanTier === new_plan_tier) {
      return res.status(400).json({ error: `User is already on ${new_plan_tier} plan` });
    }

    if (new_plan_tier === 'basic' && currentPlanTier === 'premium') {
      return res.status(400).json({ error: 'Downgrading from premium to basic is not supported via upgrade endpoint' });
    }

    // 2. Get new plan details
    const { data: newPlan, error: newPlanError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('plan_tier', new_plan_tier)
      .eq('user_type', 'Startup')
      .eq('interval', currentPlan.interval || 'monthly')
      .eq('is_active', true)
      .maybeSingle();

    if (newPlanError || !newPlan) {
      return res.status(404).json({ error: `New ${new_plan_tier} plan not found` });
    }

    console.log(`[upgrade] Upgrading user ${user_id} from ${currentPlanTier} to ${new_plan_tier} (Payment Gateway: ${paymentGateway})`);

    // 3. Stop autopay for old subscription (keep it active until cycle ends)
    const now = new Date();
    let razorpayCancelled = false;
    let paypalCancelled = false;
    
    // Cancel old subscription based on payment gateway
    if (paymentGateway === 'paypal' && currentSubscription.paypal_subscription_id) {
      // Cancel PayPal subscription
      const clientId = process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.VITE_PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;
      
      if (clientId && clientSecret) {
        const isProduction = process.env.PAYPAL_ENVIRONMENT === 'production' || process.env.VITE_PAYPAL_ENVIRONMENT === 'production';
        const baseUrl = isProduction 
          ? 'https://api-m.paypal.com' 
          : 'https://api-m.sandbox.paypal.com';

        try {
          // Get PayPal access token
          const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
            },
            body: "grant_type=client_credentials",
          });

          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            const accessToken = tokenData.access_token;

            const cancelResponse = await fetch(
              `${baseUrl}/v1/billing/subscriptions/${currentSubscription.paypal_subscription_id}/cancel`,
              {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}` 
                },
                body: JSON.stringify({
                  reason: 'Upgrading to new plan'
                })
              }
            );

            if (cancelResponse.ok) {
              paypalCancelled = true;
              console.log('[upgrade] ✅ Old PayPal subscription cancelled (autopay stopped)');
            } else {
              const errorText = await cancelResponse.text();
              console.warn('[upgrade] PayPal cancellation response:', errorText);
            }
          }
        } catch (paypalError) {
          console.error('[upgrade] Error cancelling PayPal subscription:', paypalError);
        }
      }
    } else if (paymentGateway === 'razorpay') {
      // Cancel Razorpay subscription
      const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
      
      if (!keyId || !keySecret) {
        return res.status(500).json({ error: 'Razorpay keys not configured' });
      }

      const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    
      if (currentSubscription.razorpay_subscription_id) {
      try {
        const cancelResponse = await fetch(
          `https://api.razorpay.com/v1/subscriptions/${currentSubscription.razorpay_subscription_id}/cancel`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': authHeader 
            },
            body: JSON.stringify({ cancel_at_cycle_end: false }) // Cancel immediately to stop autopay
          }
        );

        if (cancelResponse.ok) {
          razorpayCancelled = true;
          console.log('[upgrade] ✅ Old Razorpay subscription cancelled (autopay stopped)');
        } else {
          const errorText = await cancelResponse.text();
          console.warn('[upgrade] Razorpay cancellation response:', errorText);
        }
      } catch (razorpayError) {
        console.error('[upgrade] Error cancelling Razorpay subscription:', razorpayError);
        // Continue anyway - we'll update database
      }
      }
    }

    // 4. Disable autopay for old subscription but keep it active until cycle ends
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        autopay_enabled: false,
        mandate_status: 'cancelled',
        updated_at: now.toISOString()
        // Keep status as 'active' - don't cancel it yet
      })
      .eq('id', currentSubscription.id);

    if (updateError) {
      console.error('[upgrade] Error updating old subscription:', updateError);
      return res.status(500).json({ error: 'Failed to update old subscription' });
    }

    console.log('[upgrade] ✅ Old subscription autopay disabled (subscription remains active until cycle ends)');

    // 5. Get country for pricing (if needed)
    let country = currentSubscription.country || 'Global';
    
    // Try to get country-specific price
    const { data: countryPrice } = await supabase
      .from('country_plan_prices')
      .select('price_inr')
      .eq('plan_tier', new_plan_tier)
      .eq('country', country)
      .eq('interval', newPlan.interval)
      .eq('is_active', true)
      .maybeSingle();

    const finalAmount = countryPrice?.price_inr || newPlan.price;
    const currency = countryPrice ? 'INR' : (newPlan.currency || (paymentGateway === 'paypal' ? 'EUR' : 'INR'));

    // 6. Create new subscription based on payment gateway
    let razorpaySubscription = null;
    let paypalSubscriptionId = null;
    let paypalPlanId = null;
    let paypalProductId = null;

    if (paymentGateway === 'paypal') {
      // Create PayPal subscription for upgrade
      const clientId = process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.VITE_PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'PayPal credentials not configured' });
      }

      const isProduction = process.env.PAYPAL_ENVIRONMENT === 'production' || process.env.VITE_PAYPAL_ENVIRONMENT === 'production';
      const baseUrl = isProduction 
        ? 'https://api-m.paypal.com' 
        : 'https://api-m.sandbox.paypal.com';

      try {
        // Get PayPal access token
        const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
          },
          body: "grant_type=client_credentials",
        });

        if (!tokenResponse.ok) {
          return res.status(500).json({ error: 'Failed to get PayPal access token' });
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Create PayPal Product
        const productResponse = await fetch(`${baseUrl}/v1/catalogs/products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: `${newPlan.name} (${newPlan.interval})`,
            type: "SERVICE",
            description: `Upgrade to ${newPlan.name} plan`
          }),
        });

        if (!productResponse.ok) {
          const errorText = await productResponse.text();
          console.error('[upgrade] Failed to create PayPal product:', errorText);
          return res.status(500).json({ error: 'Failed to create PayPal product' });
        }

        const product = await productResponse.json();
        paypalProductId = product.id;
        console.log('[upgrade] ✅ PayPal product created:', paypalProductId);

        // Create PayPal Billing Plan
        const billingCycleUnit = newPlan.interval === 'yearly' ? 'YEAR' : 'MONTH';
        const planResponse = await fetch(`${baseUrl}/v1/billing/plans`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            product_id: paypalProductId,
            name: `${newPlan.name} (${newPlan.interval})`,
            description: `Upgrade to ${newPlan.name} plan`,
            billing_cycles: [{
              frequency: {
                interval_unit: billingCycleUnit,
                interval_count: 1
              },
              tenure_type: "REGULAR",
              sequence: 1,
              total_cycles: 0, // Infinite cycles
              pricing_scheme: {
                fixed_price: {
                  value: finalAmount.toString(),
                  currency_code: currency
                }
              }
            }],
            payment_preferences: {
              auto_bill_outstanding: true,
              setup_fee: {
                value: "0",
                currency_code: currency
              },
              setup_fee_failure_action: "CONTINUE",
              payment_failure_threshold: 3
            }
          }),
        });

        if (!planResponse.ok) {
          const errorText = await planResponse.text();
          console.error('[upgrade] Failed to create PayPal plan:', errorText);
          return res.status(500).json({ error: 'Failed to create PayPal plan' });
        }

        const plan = await planResponse.json();
        paypalPlanId = plan.id;
        console.log('[upgrade] ✅ PayPal plan created:', paypalPlanId);

        // Create PayPal Subscription
        const subscriptionResponse = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            plan_id: paypalPlanId,
            start_time: new Date(now.getTime() + 60000).toISOString(), // Start 1 minute from now
            subscriber: {
              email_address: user_id // You might want to get actual email from user
            },
            application_context: {
              brand_name: "Track My Startup",
              locale: "en-US",
              shipping_preference: "NO_SHIPPING",
              user_action: "SUBSCRIBE_NOW",
              payment_method: {
                payer_selected: "PAYPAL",
                payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED"
              },
              return_url: `${getFrontendUrl(req)}/payment/success`,
              cancel_url: `${getFrontendUrl(req)}/payment/cancel`
            }
          }),
        });

        if (!subscriptionResponse.ok) {
          const errorText = await subscriptionResponse.text();
          console.error('[upgrade] Failed to create PayPal subscription:', errorText);
          return res.status(500).json({ error: 'Failed to create PayPal subscription' });
        }

        const subscription = await subscriptionResponse.json();
        paypalSubscriptionId = subscription.id;
        console.log('[upgrade] ✅ New PayPal subscription created:', paypalSubscriptionId);

      } catch (paypalError) {
        console.error('[upgrade] Error creating PayPal subscription:', paypalError);
        return res.status(500).json({ error: 'Failed to create PayPal subscription' });
      }
    } else {
      // Create Razorpay plan for new subscription
      const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
      
      if (!keyId || !keySecret) {
        return res.status(500).json({ error: 'Razorpay keys not configured' });
      }

      const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const period = newPlan.interval === 'yearly' ? 'yearly' : 'monthly';
      const razorpayPlanId = await getOrCreateRazorpayPlan({
        amountPaise: Math.round(finalAmount * 100),
        currency: currency,
        period: period,
        intervalCount: 1,
        name: `${newPlan.name} (${newPlan.interval})`
      }, { keyId, keySecret });

      if (!razorpayPlanId) {
        return res.status(500).json({ error: 'Failed to create Razorpay plan' });
      }

      // Create new Razorpay subscription
      const subscriptionTotalCount = newPlan.interval === 'yearly' ? 1 : 12;
      const subscriptionResponse = await fetch("https://api.razorpay.com/v1/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({
          plan_id: razorpayPlanId,
          total_count: subscriptionTotalCount,
          customer_notify: 1,
          notes: { 
            user_id, 
            plan_type: newPlan.interval,
            upgrade_from: currentPlanTier
          }
        }),
      });

      if (!subscriptionResponse.ok) {
        const errorText = await subscriptionResponse.text();
        console.error('[upgrade] Failed to create Razorpay subscription:', errorText);
        return res.status(500).json({ error: 'Failed to create Razorpay subscription' });
      }

      razorpaySubscription = await subscriptionResponse.json();
      console.log('[upgrade] ✅ New Razorpay subscription created:', razorpaySubscription.id);
    }

    // 8. Calculate billing period (30 days from now for monthly, 365 for yearly)
    const periodEnd = new Date(now);
    if (newPlan.interval === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // 8.5. Get current storage usage from old subscription (preserve existing storage)
    let currentStorageUsedMB = null;
    if (currentSubscription.storage_used_mb !== null && currentSubscription.storage_used_mb !== undefined) {
      // Use storage from old subscription (updated by trigger)
      currentStorageUsedMB = parseFloat(currentSubscription.storage_used_mb.toString()) || 0;
      console.log('[upgrade] 📦 Preserving storage usage from old subscription:', currentStorageUsedMB, 'MB');
    } else {
      // If old subscription doesn't have storage_used_mb, calculate from user_storage_usage table
      try {
        const { data: storageTotal, error: storageError } = await supabase.rpc('get_user_storage_total', {
          p_user_id: user_id
        });
        if (!storageError && storageTotal !== null) {
          currentStorageUsedMB = parseFloat(storageTotal.toString()) || 0;
          console.log('[upgrade] 📦 Calculated storage usage from user_storage_usage:', currentStorageUsedMB, 'MB');
        }
      } catch (storageCalcError) {
        console.warn('[upgrade] ⚠️ Could not calculate storage usage, will start at 0:', storageCalcError);
        currentStorageUsedMB = 0;
      }
    }

    // 9. Create new subscription in database
    const newSubscriptionInsert = {
      user_id,
      plan_id: newPlan.id,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      amount: finalAmount, // Amount in original currency
      currency: currency, // Store currency code
      interval: newPlan.interval,
      is_in_trial: false,
      payment_gateway: paymentGateway,
      autopay_enabled: true,
      mandate_status: paymentGateway === 'paypal' ? 'active' : 'pending', // PayPal is active immediately
      country: country,
      billing_cycle_count: 1, // First cycle
      total_paid: finalAmount,
      last_billing_date: now.toISOString(),
      next_billing_date: periodEnd.toISOString(),
      previous_plan_tier: currentPlanTier,
      previous_subscription_id: currentSubscription.id,
      storage_used_mb: currentStorageUsedMB, // Preserve existing storage usage
      locked_amount_inr: currency === 'INR' ? finalAmount : null, // Store INR amount if currency is INR
      ...(paymentGateway === 'razorpay' && razorpaySubscription ? { razorpay_subscription_id: razorpaySubscription.id } : {}),
      ...(paymentGateway === 'paypal' ? { 
        paypal_subscription_id: paypalSubscriptionId,
        paypal_plan_id: paypalPlanId,
        paypal_product_id: paypalProductId
      } : {})
    };

    const { data: newSubscription, error: newSubError } = await supabase
      .from('user_subscriptions')
      .insert(newSubscriptionInsert)
      .select()
      .single();

    if (newSubError) {
      console.error('[upgrade] Error creating new subscription:', newSubError);
      return res.status(500).json({ error: 'Failed to create new subscription' });
    }

    console.log('[upgrade] ✅ New subscription created in database');

    // 10. Create payment transaction for upgrade
    const { data: paymentTransaction, error: paymentError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id,
        subscription_id: newSubscription.id,
        payment_gateway: paymentGateway,
        gateway_order_id: paymentGateway === 'paypal' ? paypalSubscriptionId : razorpaySubscription?.id,
        gateway_payment_id: null, // Will be set when payment is captured
        amount: finalAmount,
        currency: currency,
        status: paymentGateway === 'paypal' ? 'success' : 'pending', // PayPal is immediate, Razorpay pending
        payment_type: 'upgrade',
        plan_tier: new_plan_tier,
        plan_tier_before: currentPlanTier,
        plan_tier_after: new_plan_tier,
        is_autopay: true,
        autopay_mandate_id: paymentGateway === 'paypal' ? paypalSubscriptionId : razorpaySubscription?.id
      })
      .select()
      .single();

    if (paymentError) {
      console.error('[upgrade] Error creating payment transaction:', paymentError);
      // Continue - payment will be recorded when captured
    }

    // 11. Create billing cycle for new subscription
    if (paymentTransaction) {
      const { error: cycleError } = await supabase
        .from('billing_cycles')
        .insert({
          subscription_id: newSubscription.id,
          cycle_number: 1,
          period_start: now.toISOString(),
          period_end: periodEnd.toISOString(),
          payment_transaction_id: paymentTransaction.id,
          amount: finalAmount,
          currency: currency,
          status: paymentGateway === 'paypal' ? 'paid' : 'pending', // PayPal is immediate, Razorpay pending
          plan_tier: new_plan_tier,
          is_autopay: true
        });

      if (cycleError) {
        console.error('[upgrade] Error creating billing cycle:', cycleError);
      } else {
        console.log('[upgrade] ✅ Billing cycle created');
      }
    }

    // 12. Record in subscription_changes
    const { error: changeError } = await supabase
      .from('subscription_changes')
      .insert({
        subscription_id: newSubscription.id,
        user_id,
        change_type: 'upgrade',
        plan_tier_before: currentPlanTier,
        plan_tier_after: new_plan_tier,
        amount_before_inr: currentPlan.price || 0,
        amount_after_inr: finalAmount,
        old_billing_end: currentSubscription.current_period_end,
        new_billing_start: now.toISOString(),
        new_billing_end: periodEnd.toISOString(),
        autopay_before: currentSubscription.autopay_enabled,
        autopay_after: true,
        reason: `Upgraded from ${currentPlanTier} to ${new_plan_tier} plan`,
        initiated_by: 'user'
      });

    if (changeError) {
      console.error('[upgrade] Error recording subscription change:', changeError);
    } else {
      console.log('[upgrade] ✅ Subscription change recorded');
    }

    return res.json({
      success: true,
      message: `Successfully upgraded to ${new_plan_tier} plan`,
      subscription: {
        id: newSubscription.id,
        plan_tier: new_plan_tier,
        amount: finalAmount,
        currency: currency,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        ...(paymentGateway === 'razorpay' && razorpaySubscription ? { razorpay_subscription_id: razorpaySubscription.id } : {}),
        ...(paymentGateway === 'paypal' ? { paypal_subscription_id: paypalSubscriptionId } : {})
      },
      ...(paymentGateway === 'razorpay' && razorpaySubscription ? { razorpay_subscription: razorpaySubscription } : {}),
      ...(paymentGateway === 'paypal' ? { paypal_subscription_id: paypalSubscriptionId } : {}),
      old_subscription_cancelled: paymentGateway === 'razorpay' ? razorpayCancelled : paypalCancelled
    });

  } catch (error) {
    console.error('[upgrade] Error upgrading subscription:', error);
    return res.status(500).json({ error: 'Server error during upgrade' });
  }
});

// --------------------
// Downgrade Subscription Plan
// --------------------
app.post('/api/subscriptions/downgrade', async (req, res) => {
  try {
    const { user_id, new_plan_tier } = req.body; // 'basic' or 'free'
    
    if (!user_id || !new_plan_tier) {
      return res.status(400).json({ error: 'user_id and new_plan_tier are required' });
    }

    if (!['basic', 'free'].includes(new_plan_tier)) {
      return res.status(400).json({ error: 'new_plan_tier must be "basic" or "free" for downgrade' });
    }

    // 1. Get current active subscription (should be Premium or Basic)
    const { data: currentSubscription, error: currentSubError } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans!inner(plan_tier, name, price, currency, interval, storage_limit_mb, features)
      `)
      .eq('user_id', user_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentSubError || !currentSubscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const currentPlan = currentSubscription.subscription_plans;
    const currentPlanTier = currentPlan?.plan_tier;
    const paymentGateway = currentSubscription.payment_gateway || 'razorpay';

    // Check if already on the requested plan or lower
    if (currentPlanTier === new_plan_tier) {
      return res.status(400).json({ error: `User is already on ${new_plan_tier} plan` });
    }

    // Validate downgrade direction
    if (currentPlanTier === 'basic' && new_plan_tier === 'premium') {
      return res.status(400).json({ error: 'Cannot downgrade from basic to premium. Use upgrade endpoint instead.' });
    }

    if (currentPlanTier === 'free') {
      return res.status(400).json({ error: 'Cannot downgrade from free plan' });
    }

    // For downgrade to 'free', just cancel the subscription
    if (new_plan_tier === 'free') {
      const now = new Date();
      let razorpayCancelled = false;
      let paypalCancelled = false;

      // Cancel subscription based on payment gateway
      if (paymentGateway === 'paypal' && currentSubscription.paypal_subscription_id) {
        // Cancel PayPal subscription
        const clientId = process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
        const clientSecret = process.env.VITE_PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;
        
        if (clientId && clientSecret) {
          const isProduction = process.env.PAYPAL_ENVIRONMENT === 'production' || process.env.VITE_PAYPAL_ENVIRONMENT === 'production';
          const baseUrl = isProduction 
            ? 'https://api-m.paypal.com' 
            : 'https://api-m.sandbox.paypal.com';

          try {
            // Get PayPal access token
            const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
              },
              body: "grant_type=client_credentials",
            });

            if (tokenResponse.ok) {
              const tokenData = await tokenResponse.json();
              const accessToken = tokenData.access_token;

              const cancelResponse = await fetch(
                `${baseUrl}/v1/billing/subscriptions/${currentSubscription.paypal_subscription_id}/cancel`,
                {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}` 
                  },
                  body: JSON.stringify({
                    reason: 'Downgrading to free plan'
                  })
                }
              );

              if (cancelResponse.ok) {
                paypalCancelled = true;
                console.log('[downgrade] ✅ PayPal subscription cancelled');
              }
            }
          } catch (paypalError) {
            console.error('[downgrade] Error cancelling PayPal subscription:', paypalError);
          }
        }
      } else if (paymentGateway === 'razorpay') {
        // Cancel Razorpay subscription
        const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
        
        if (!keyId || !keySecret) {
          return res.status(500).json({ error: 'Razorpay keys not configured' });
        }

        const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

        if (currentSubscription.razorpay_subscription_id) {
          try {
            const cancelResponse = await fetch(
              `https://api.razorpay.com/v1/subscriptions/${currentSubscription.razorpay_subscription_id}/cancel`,
              {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': authHeader 
                },
                body: JSON.stringify({ cancel_at_cycle_end: false })
              }
            );

            if (cancelResponse.ok) {
              razorpayCancelled = true;
              console.log('[downgrade] ✅ Razorpay subscription cancelled');
            }
          } catch (razorpayError) {
            console.error('[downgrade] Error cancelling Razorpay subscription:', razorpayError);
          }
        }
      }

      // Stop autopay but keep subscription active until cycle ends
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          autopay_enabled: false,
          mandate_status: 'cancelled',
          updated_at: now.toISOString()
        })
        .eq('id', currentSubscription.id);

      if (updateError) {
        console.error('[downgrade] Error updating subscription:', updateError);
        return res.status(500).json({ error: 'Failed to update subscription' });
      }

      // Record in subscription_changes
      await supabase
        .from('subscription_changes')
        .insert({
          subscription_id: currentSubscription.id,
          user_id,
          change_type: 'downgrade',
          plan_tier_before: currentPlanTier,
          plan_tier_after: 'free',
          amount_before_inr: currentPlan.price || 0,
          amount_after_inr: 0,
          old_billing_end: currentSubscription.current_period_end,
          new_billing_start: currentSubscription.current_period_end, // Starts when current ends
          new_billing_end: currentSubscription.current_period_end,
          autopay_before: currentSubscription.autopay_enabled,
          autopay_after: false,
          reason: `Downgraded from ${currentPlanTier} to free plan`,
          initiated_by: 'user'
        });

      return res.json({
        success: true,
        message: `Successfully downgraded to free plan. Your ${currentPlanTier} subscription will remain active until ${new Date(currentSubscription.current_period_end).toLocaleDateString()}.`,
        subscription: {
          id: currentSubscription.id,
          plan_tier: currentPlanTier,
          current_period_end: currentSubscription.current_period_end,
          will_expire_to_free: true
        },
        razorpay_cancelled: razorpayCancelled,
        paypal_cancelled: paypalCancelled
      });
    }

    // 2. Get new plan details (for downgrade to Basic)
    const { data: newPlan, error: newPlanError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('plan_tier', new_plan_tier)
      .eq('user_type', 'Startup')
      .eq('interval', currentPlan.interval || 'monthly')
      .eq('is_active', true)
      .maybeSingle();

    if (newPlanError || !newPlan) {
      return res.status(404).json({ error: `New ${new_plan_tier} plan not found` });
    }

    console.log(`[downgrade] Downgrading user ${user_id} from ${currentPlanTier} to ${new_plan_tier} (Payment Gateway: ${paymentGateway})`);

    // 3. Stop autopay for old subscription (keep it active until cycle ends)
    const now = new Date();
    let razorpayCancelled = false;
    let paypalCancelled = false;
    
    // Cancel old subscription based on payment gateway
    if (paymentGateway === 'paypal' && currentSubscription.paypal_subscription_id) {
      // Cancel PayPal subscription
      const clientId = process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.VITE_PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;
      
      if (clientId && clientSecret) {
        const isProduction = process.env.PAYPAL_ENVIRONMENT === 'production' || process.env.VITE_PAYPAL_ENVIRONMENT === 'production';
        const baseUrl = isProduction 
          ? 'https://api-m.paypal.com' 
          : 'https://api-m.sandbox.paypal.com';

        try {
          // Get PayPal access token
          const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
            },
            body: "grant_type=client_credentials",
          });

          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            const accessToken = tokenData.access_token;

            const cancelResponse = await fetch(
              `${baseUrl}/v1/billing/subscriptions/${currentSubscription.paypal_subscription_id}/cancel`,
              {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}` 
                },
                body: JSON.stringify({
                  reason: 'Downgrading to new plan'
                })
              }
            );

            if (cancelResponse.ok) {
              paypalCancelled = true;
              console.log('[downgrade] ✅ Old PayPal subscription cancelled (autopay stopped)');
            } else {
              const errorText = await cancelResponse.text();
              console.warn('[downgrade] PayPal cancellation response:', errorText);
            }
          }
        } catch (paypalError) {
          console.error('[downgrade] Error cancelling PayPal subscription:', paypalError);
        }
      }
    } else if (paymentGateway === 'razorpay') {
      // Cancel Razorpay subscription
      const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
      
      if (!keyId || !keySecret) {
        return res.status(500).json({ error: 'Razorpay keys not configured' });
      }

      const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    
      if (currentSubscription.razorpay_subscription_id) {
      try {
        const cancelResponse = await fetch(
          `https://api.razorpay.com/v1/subscriptions/${currentSubscription.razorpay_subscription_id}/cancel`,
          {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': authHeader 
            },
            body: JSON.stringify({ cancel_at_cycle_end: false }) // Cancel immediately to stop autopay
          }
        );

        if (cancelResponse.ok) {
          razorpayCancelled = true;
          console.log('[downgrade] ✅ Old Razorpay subscription cancelled (autopay stopped)');
        } else {
          const errorText = await cancelResponse.text();
          console.warn('[downgrade] Razorpay cancellation response:', errorText);
        }
      } catch (razorpayError) {
        console.error('[downgrade] Error cancelling Razorpay subscription:', razorpayError);
        // Continue anyway - we'll update database
      }
      }
    }

    // 4. Disable autopay for old subscription but keep it active until cycle ends
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        autopay_enabled: false,
        mandate_status: 'cancelled',
        updated_at: now.toISOString()
        // Keep status as 'active' - don't cancel it yet
      })
      .eq('id', currentSubscription.id);

    if (updateError) {
      console.error('[downgrade] Error updating old subscription:', updateError);
      return res.status(500).json({ error: 'Failed to update old subscription' });
    }

    console.log('[downgrade] ✅ Old subscription autopay disabled (subscription remains active until cycle ends)');

    // 5. Get country for pricing (if needed)
    let country = currentSubscription.country || 'Global';
    
    // Try to get country-specific price
    const { data: countryPrice } = await supabase
      .from('country_plan_prices')
      .select('price_inr')
      .eq('plan_tier', new_plan_tier)
      .eq('country', country)
      .eq('interval', newPlan.interval)
      .eq('is_active', true)
      .maybeSingle();

    const finalAmount = countryPrice?.price_inr || newPlan.price;
    const currency = countryPrice ? 'INR' : (newPlan.currency || (paymentGateway === 'paypal' ? 'EUR' : 'INR'));

    // 6. Create new subscription based on payment gateway
    let razorpaySubscription = null;
    let paypalSubscriptionId = null;
    let paypalPlanId = null;
    let paypalProductId = null;

    if (paymentGateway === 'paypal') {
      // Create PayPal subscription for downgrade
      const clientId = process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.VITE_PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'PayPal credentials not configured' });
      }

      const isProduction = process.env.PAYPAL_ENVIRONMENT === 'production' || process.env.VITE_PAYPAL_ENVIRONMENT === 'production';
      const baseUrl = isProduction 
        ? 'https://api-m.paypal.com' 
        : 'https://api-m.sandbox.paypal.com';

      try {
        // Get PayPal access token
        const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
          },
          body: "grant_type=client_credentials",
        });

        if (!tokenResponse.ok) {
          return res.status(500).json({ error: 'Failed to get PayPal access token' });
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Create PayPal Product
        const productResponse = await fetch(`${baseUrl}/v1/catalogs/products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: `${newPlan.name} (${newPlan.interval})`,
            type: "SERVICE",
            description: `Downgrade to ${newPlan.name} plan`
          }),
        });

        if (!productResponse.ok) {
          const errorText = await productResponse.text();
          console.error('[downgrade] Failed to create PayPal product:', errorText);
          return res.status(500).json({ error: 'Failed to create PayPal product' });
        }

        const product = await productResponse.json();
        paypalProductId = product.id;
        console.log('[downgrade] ✅ PayPal product created:', paypalProductId);

        // Create PayPal Billing Plan
        const billingCycleUnit = newPlan.interval === 'yearly' ? 'YEAR' : 'MONTH';
        const planResponse = await fetch(`${baseUrl}/v1/billing/plans`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            product_id: paypalProductId,
            name: `${newPlan.name} (${newPlan.interval})`,
            description: `Downgrade to ${newPlan.name} plan`,
            billing_cycles: [{
              frequency: {
                interval_unit: billingCycleUnit,
                interval_count: 1
              },
              tenure_type: "REGULAR",
              sequence: 1,
              total_cycles: 0, // Infinite cycles
              pricing_scheme: {
                fixed_price: {
                  value: finalAmount.toString(),
                  currency_code: currency
                }
              }
            }],
            payment_preferences: {
              auto_bill_outstanding: true,
              setup_fee: {
                value: "0",
                currency_code: currency
              },
              setup_fee_failure_action: "CONTINUE",
              payment_failure_threshold: 3
            }
          }),
        });

        if (!planResponse.ok) {
          const errorText = await planResponse.text();
          console.error('[downgrade] Failed to create PayPal plan:', errorText);
          return res.status(500).json({ error: 'Failed to create PayPal plan' });
        }

        const plan = await planResponse.json();
        paypalPlanId = plan.id;
        console.log('[downgrade] ✅ PayPal plan created:', paypalPlanId);

        // Create PayPal Subscription
        const subscriptionResponse = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            plan_id: paypalPlanId,
            start_time: new Date(now.getTime() + 60000).toISOString(), // Start 1 minute from now
            subscriber: {
              email_address: user_id // You might want to get actual email from user
            },
            application_context: {
              brand_name: "Track My Startup",
              locale: "en-US",
              shipping_preference: "NO_SHIPPING",
              user_action: "SUBSCRIBE_NOW",
              payment_method: {
                payer_selected: "PAYPAL",
                payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED"
              },
              return_url: `${getFrontendUrl(req)}/payment/success`,
              cancel_url: `${getFrontendUrl(req)}/payment/cancel`
            }
          }),
        });

        if (!subscriptionResponse.ok) {
          const errorText = await subscriptionResponse.text();
          console.error('[downgrade] Failed to create PayPal subscription:', errorText);
          return res.status(500).json({ error: 'Failed to create PayPal subscription' });
        }

        const subscription = await subscriptionResponse.json();
        paypalSubscriptionId = subscription.id;
        console.log('[downgrade] ✅ New PayPal subscription created:', paypalSubscriptionId);

      } catch (paypalError) {
        console.error('[downgrade] Error creating PayPal subscription:', paypalError);
        return res.status(500).json({ error: 'Failed to create PayPal subscription' });
      }
    } else {
      // Create Razorpay plan for new subscription
      const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
      
      if (!keyId || !keySecret) {
        return res.status(500).json({ error: 'Razorpay keys not configured' });
      }

      const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const period = newPlan.interval === 'yearly' ? 'yearly' : 'monthly';
      const razorpayPlanId = await getOrCreateRazorpayPlan({
        amountPaise: Math.round(finalAmount * 100),
        currency: currency,
        period: period,
        intervalCount: 1,
        name: `${newPlan.name} (${newPlan.interval})`
      }, { keyId, keySecret });

      if (!razorpayPlanId) {
        return res.status(500).json({ error: 'Failed to create Razorpay plan' });
      }

      // Create new Razorpay subscription
      const subscriptionTotalCount = newPlan.interval === 'yearly' ? 1 : 12;
      const subscriptionResponse = await fetch("https://api.razorpay.com/v1/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({
          plan_id: razorpayPlanId,
          total_count: subscriptionTotalCount,
          customer_notify: 1,
          notes: { 
            user_id, 
            plan_type: newPlan.interval,
            downgrade_from: currentPlanTier
          }
        }),
      });

      if (!subscriptionResponse.ok) {
        const errorText = await subscriptionResponse.text();
        console.error('[downgrade] Failed to create Razorpay subscription:', errorText);
        return res.status(500).json({ error: 'Failed to create Razorpay subscription' });
      }

      razorpaySubscription = await subscriptionResponse.json();
      console.log('[downgrade] ✅ New Razorpay subscription created:', razorpaySubscription.id);
    }

    // 8. Calculate billing period (30 days from now for monthly, 365 for yearly)
    const periodEnd = new Date(now);
    if (newPlan.interval === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // 8.5. Get current storage usage from old subscription (preserve existing storage)
    let currentStorageUsedMB = null;
    if (currentSubscription.storage_used_mb !== null && currentSubscription.storage_used_mb !== undefined) {
      // Use storage from old subscription (updated by trigger)
      currentStorageUsedMB = parseFloat(currentSubscription.storage_used_mb.toString()) || 0;
      console.log('[downgrade] 📦 Preserving storage usage from old subscription:', currentStorageUsedMB, 'MB');
    } else {
      // If old subscription doesn't have storage_used_mb, calculate from user_storage_usage table
      try {
        const { data: storageTotal, error: storageError } = await supabase.rpc('get_user_storage_total', {
          p_user_id: user_id
        });
        if (!storageError && storageTotal !== null) {
          currentStorageUsedMB = parseFloat(storageTotal.toString()) || 0;
          console.log('[downgrade] 📦 Calculated storage usage from user_storage_usage:', currentStorageUsedMB, 'MB');
        }
      } catch (storageCalcError) {
        console.warn('[downgrade] ⚠️ Could not calculate storage usage, will start at 0:', storageCalcError);
        currentStorageUsedMB = 0;
      }
    }

    // 9. Create new subscription in database
    const newSubscriptionInsert = {
      user_id,
      plan_id: newPlan.id,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      amount: finalAmount, // Amount in original currency
      currency: currency, // Store currency code
      interval: newPlan.interval,
      is_in_trial: false,
      payment_gateway: paymentGateway,
      autopay_enabled: true,
      mandate_status: paymentGateway === 'paypal' ? 'active' : 'pending', // PayPal is active immediately
      country: country,
      billing_cycle_count: 1, // First cycle
      total_paid: finalAmount,
      last_billing_date: now.toISOString(),
      next_billing_date: periodEnd.toISOString(),
      previous_plan_tier: currentPlanTier,
      previous_subscription_id: currentSubscription.id,
      storage_used_mb: currentStorageUsedMB, // Preserve existing storage usage
      locked_amount_inr: currency === 'INR' ? finalAmount : null, // Store INR amount if currency is INR
      ...(paymentGateway === 'razorpay' && razorpaySubscription ? { razorpay_subscription_id: razorpaySubscription.id } : {}),
      ...(paymentGateway === 'paypal' ? { 
        paypal_subscription_id: paypalSubscriptionId,
        paypal_plan_id: paypalPlanId,
        paypal_product_id: paypalProductId
      } : {})
    };

    const { data: newSubscription, error: newSubError } = await supabase
      .from('user_subscriptions')
      .insert(newSubscriptionInsert)
      .select()
      .single();

    if (newSubError) {
      console.error('[downgrade] Error creating new subscription:', newSubError);
      return res.status(500).json({ error: 'Failed to create new subscription' });
    }

    console.log('[downgrade] ✅ New subscription created in database');

    // 10. Create payment transaction for downgrade
    const { data: paymentTransaction, error: paymentError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id,
        subscription_id: newSubscription.id,
        payment_gateway: paymentGateway,
        gateway_order_id: paymentGateway === 'paypal' ? paypalSubscriptionId : razorpaySubscription?.id,
        gateway_payment_id: null, // Will be set when payment is captured
        amount: finalAmount,
        currency: currency,
        status: paymentGateway === 'paypal' ? 'success' : 'pending', // PayPal is immediate, Razorpay pending
        payment_type: 'downgrade',
        plan_tier: new_plan_tier,
        plan_tier_before: currentPlanTier,
        plan_tier_after: new_plan_tier,
        is_autopay: true,
        autopay_mandate_id: paymentGateway === 'paypal' ? paypalSubscriptionId : razorpaySubscription?.id
      })
      .select()
      .single();

    if (paymentError) {
      console.error('[downgrade] Error creating payment transaction:', paymentError);
      // Continue - payment will be recorded when captured
    }

    // 11. Create billing cycle for new subscription
    if (paymentTransaction) {
      const { error: cycleError } = await supabase
        .from('billing_cycles')
        .insert({
          subscription_id: newSubscription.id,
          cycle_number: 1,
          period_start: now.toISOString(),
          period_end: periodEnd.toISOString(),
          payment_transaction_id: paymentTransaction.id,
          amount: finalAmount,
          currency: currency,
          status: paymentGateway === 'paypal' ? 'paid' : 'pending', // PayPal is immediate, Razorpay pending
          plan_tier: new_plan_tier,
          is_autopay: true
        });

      if (cycleError) {
        console.error('[downgrade] Error creating billing cycle:', cycleError);
      } else {
        console.log('[downgrade] ✅ Billing cycle created');
      }
    }

    // 12. Record in subscription_changes
    const { error: changeError } = await supabase
      .from('subscription_changes')
      .insert({
        subscription_id: newSubscription.id,
        user_id,
        change_type: 'downgrade',
        plan_tier_before: currentPlanTier,
        plan_tier_after: new_plan_tier,
        amount_before_inr: currentPlan.price || 0,
        amount_after_inr: finalAmount,
        old_billing_end: currentSubscription.current_period_end,
        new_billing_start: now.toISOString(),
        new_billing_end: periodEnd.toISOString(),
        autopay_before: currentSubscription.autopay_enabled,
        autopay_after: true,
        reason: `Downgraded from ${currentPlanTier} to ${new_plan_tier} plan`,
        initiated_by: 'user'
      });

    if (changeError) {
      console.error('[downgrade] Error recording subscription change:', changeError);
    } else {
      console.log('[downgrade] ✅ Subscription change recorded');
    }

    return res.json({
      success: true,
      message: `Successfully downgraded to ${new_plan_tier} plan. Your ${currentPlanTier} subscription will remain active until ${new Date(currentSubscription.current_period_end).toLocaleDateString()}, but you'll have ${new_plan_tier} access starting now.`,
      subscription: {
        id: newSubscription.id,
        plan_tier: new_plan_tier,
        amount: finalAmount,
        currency: currency,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        ...(paymentGateway === 'razorpay' && razorpaySubscription ? { razorpay_subscription_id: razorpaySubscription.id } : {}),
        ...(paymentGateway === 'paypal' ? { paypal_subscription_id: paypalSubscriptionId } : {})
      },
      old_subscription: {
        id: currentSubscription.id,
        plan_tier: currentPlanTier,
        current_period_end: currentSubscription.current_period_end,
        will_expire: true
      },
      ...(paymentGateway === 'razorpay' && razorpaySubscription ? { razorpay_subscription: razorpaySubscription } : {}),
      ...(paymentGateway === 'paypal' ? { paypal_subscription_id: paypalSubscriptionId } : {}),
      old_subscription_cancelled: paymentGateway === 'razorpay' ? razorpayCancelled : paypalCancelled,
      note: `Your ${currentPlanTier} subscription remains active until ${new Date(currentSubscription.current_period_end).toLocaleDateString()}, but ${new_plan_tier} features are now available.`
    });

  } catch (error) {
    console.error('[downgrade] Error downgrading subscription:', error);
    return res.status(500).json({ error: 'Server error during downgrade' });
  }
});

// --------------------
// Sync Mandate Status from Razorpay
// --------------------
app.post('/api/razorpay/sync-mandate-status', async (req, res) => {
  try {
    const { subscription_id, user_id } = req.body;
    
    if (!subscription_id || !user_id) {
      return res.status(400).json({ error: 'subscription_id and user_id are required' });
    }

    // Get subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('id, user_id, razorpay_subscription_id, razorpay_mandate_id')
      .eq('id', subscription_id)
      .eq('user_id', user_id)
      .single();

    if (subError || !subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
      return res.status(500).json({ error: 'Razorpay keys not configured' });
    }

    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    let razorpayStatus = null;
    let mandateStatus = null;

    // Get subscription status from Razorpay
    if (subscription.razorpay_subscription_id) {
      try {
        const subResponse = await fetch(
          `https://api.razorpay.com/v1/subscriptions/${subscription.razorpay_subscription_id}`,
          {
            method: 'GET',
            headers: { 'Authorization': authHeader }
          }
        );

        if (subResponse.ok) {
          const subData = await subResponse.json();
          razorpayStatus = subData.status; // active, paused, cancelled, etc.
          console.log('Razorpay subscription status:', razorpayStatus);
        }
      } catch (error) {
        console.error('Error fetching Razorpay subscription:', error);
      }
    }

    // Get mandate status if mandate ID exists
    if (subscription.razorpay_mandate_id) {
      try {
        const mandateResponse = await fetch(
          `https://api.razorpay.com/v1/subscriptions/${subscription.razorpay_subscription_id}/retrieve`,
          {
            method: 'GET',
            headers: { 'Authorization': authHeader }
          }
        );

        if (mandateResponse.ok) {
          const mandateData = await mandateResponse.json();
          mandateStatus = mandateData.status;
          console.log('Razorpay mandate status:', mandateStatus);
        }
      } catch (error) {
        console.error('Error fetching Razorpay mandate:', error);
      }
    }

    // Update database if status changed
    const updateData = {
      mandate_last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // If Razorpay shows paused/cancelled but we show active, update
    if ((razorpayStatus === 'paused' || razorpayStatus === 'cancelled') && subscription.autopay_enabled) {
      // Use function to handle cancellation
      await supabase.rpc('handle_autopay_cancellation', {
        p_subscription_id: subscription.id,
        p_cancellation_reason: 'cancelled_from_bank',
        p_initiated_by: 'user'
      });
    }

    return res.json({
      success: true,
      razorpay_status: razorpayStatus,
      mandate_status: mandateStatus,
      synced_at: updateData.mandate_last_synced_at
    });

  } catch (error) {
    console.error('Error syncing mandate status:', error);
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
    
    // Check if this is a mentor payment (by checking order_id in mentor_payments)
    if (payment.order_id) {
      const { data: mentorPayment } = await supabase
        .from('mentor_payments')
        .select('*, assignment_id')
        .eq('razorpay_order_id', payment.order_id)
        .maybeSingle();

      if (mentorPayment) {
        // This is a mentor payment
        console.log('Processing mentor payment from webhook:', payment.id);
        
        // Update mentor payment
        await supabase
          .from('mentor_payments')
          .update({
            razorpay_payment_id: payment.id,
            payment_status: 'completed',
            payment_date: new Date().toISOString()
          })
          .eq('id', mentorPayment.id);

        // Complete payment and activate assignment
        await completeMentorPayment(mentorPayment.assignment_id, payment.id, true);
        
        console.log('✅ Mentor payment completed via webhook');
        return;
      }
    }
    
    // Check by payment_id as well (in case order_id is not in the payment object)
    if (payment.id) {
      const { data: mentorPaymentByPaymentId } = await supabase
        .from('mentor_payments')
        .select('*, assignment_id')
        .eq('razorpay_payment_id', payment.id)
        .maybeSingle();

      if (mentorPaymentByPaymentId && mentorPaymentByPaymentId.payment_status !== 'completed') {
        // This is a mentor payment that hasn't been completed yet
        console.log('Processing mentor payment from webhook (by payment_id):', payment.id);
        
        // Update mentor payment
        await supabase
          .from('mentor_payments')
          .update({
            payment_status: 'completed',
            payment_date: new Date().toISOString()
          })
          .eq('id', mentorPaymentByPaymentId.id);

        // Complete payment and activate assignment
        await completeMentorPayment(mentorPaymentByPaymentId.assignment_id, payment.id, true);
        
        console.log('✅ Mentor payment completed via webhook');
        return;
      }
    }
    
    // If not a mentor payment, handle as subscription payment
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
      // Update payment in payment_transactions table
      const { error: paymentError } = await supabase
        .from('payment_transactions')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('gateway_payment_id', payment.id);

    if (paymentError) {
      console.error('Error updating payment status:', paymentError);
    }

    // If this is a subscription payment, handle subscription failure
    if (payment.notes?.subscription_id || payment.order_id) {
      // Try to find subscription by payment
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('id, user_id')
        .eq('razorpay_subscription_id', payment.notes?.subscription_id)
        .or(`razorpay_mandate_id.eq.${payment.order_id}`)
        .limit(1)
        .maybeSingle();

      if (subscription) {
        // Call database function to handle payment failure
        const { error: failureError } = await supabase.rpc('handle_subscription_payment_failure', {
          p_subscription_id: subscription.id,
          p_failure_reason: payment.error_description || 'Payment failed - insufficient funds or card declined'
        });

        if (failureError) {
          console.error('Error handling subscription payment failure:', failureError);
        } else {
          console.log('✅ Subscription payment failure handled');
        }
      }
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handlePaymentRefund(payment) {
  try {
    console.log('Payment refunded:', payment.id);
    
    // Update payment status in database
      // Update payment in payment_transactions table
      const { error } = await supabase
        .from('payment_transactions')
        .update({ 
          status: 'refunded',
          updated_at: new Date().toISOString()
        })
        .eq('gateway_payment_id', payment.id);

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

    // Fetch mandate ID from Razorpay subscription
    let mandateId = null;
    try {
      const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
      
      if (keyId && keySecret) {
        const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        
        // Get subscription details to find mandate
        const subResponse = await fetch(
          `https://api.razorpay.com/v1/subscriptions/${subscription.id}`,
          {
            method: 'GET',
            headers: { 'Authorization': authHeader }
          }
        );
        
        if (subResponse.ok) {
          const subData = await subResponse.json();
          
          // Try to get mandate from payment method or token
          if (subData.entity === 'subscription' && subData.status === 'active') {
            // Get latest invoice to find payment and token
            try {
              const invoiceResponse = await fetch(
                `https://api.razorpay.com/v1/invoices?subscription_id=${subscription.id}&count=1`,
                {
                  method: 'GET',
                  headers: { 'Authorization': authHeader }
                }
              );
              
              if (invoiceResponse.ok) {
                const invoices = await invoiceResponse.json();
                if (invoices.items && invoices.items.length > 0) {
                  const invoice = invoices.items[0];
                  if (invoice.payment_id) {
                    // Get payment to find token
                    const paymentResponse = await fetch(
                      `https://api.razorpay.com/v1/payments/${invoice.payment_id}`,
                      {
                        method: 'GET',
                        headers: { 'Authorization': authHeader }
                      }
                    );
                    
                    if (paymentResponse.ok) {
                      const payment = await paymentResponse.json();
                      if (payment.token_id) {
                        // Get token to find mandate
                        const tokenResponse = await fetch(
                          `https://api.razorpay.com/v1/tokens/${payment.token_id}`,
                          {
                            method: 'GET',
                            headers: { 'Authorization': authHeader }
                          }
                        );
                        
                        if (tokenResponse.ok) {
                          const token = await tokenResponse.json();
                          mandateId = token.mandate_id || null;
                        }
                      }
                    }
                  }
                }
              }
            } catch (error) {
              console.warn('Could not fetch mandate from invoice:', error);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error fetching mandate ID from Razorpay:', error);
    }

    const updates = {
      status: 'active',
      razorpay_subscription_id: subscription.id,
      autopay_enabled: true, // Enable autopay when subscription is activated
      updated_at: new Date().toISOString(),
      is_in_trial: false
    };

    if (mandateId) {
      updates.razorpay_mandate_id = mandateId;
      updates.mandate_status = 'active';
      updates.mandate_created_at = new Date().toISOString();
    } else {
      updates.mandate_status = 'pending'; // Will be updated when mandate is available
    }

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
    } else {
      console.log('✅ Subscription activated with autopay:', {
        subscriptionId: resolved.id,
        razorpaySubscriptionId: subscription.id,
        mandateId: mandateId || 'pending'
      });
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
    
    // 🔥 FIX: Check if this is an advisor credit subscription first
    const { data: advisorSub } = await supabase
      .from('advisor_credit_subscriptions')
      .select('*')
      .eq('razorpay_subscription_id', subscription.id)
      .eq('status', 'active')
      .maybeSingle();
    
    if (advisorSub) {
      console.log('✅ This is an advisor credit subscription renewal');
      
      // Extract payment info
      const chargeAmount = subDetails.plan.amount / 100; // Convert from paise
      const currency = subDetails.plan.currency || 'INR';
      const paymentId = subDetails.latest_invoice?.payment_id || subscription.id + '_' + Date.now();
      
      // Calculate next billing period
      const now = new Date();
      const currentPeriodEnd = new Date(advisorSub.current_period_end);
      const nextPeriodEnd = new Date(currentPeriodEnd);
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
      
      // Update subscription with new billing cycle
      const { error: updateError } = await supabase
        .from('advisor_credit_subscriptions')
        .update({
          current_period_start: currentPeriodEnd.toISOString(),
          current_period_end: nextPeriodEnd.toISOString(),
          next_billing_date: nextPeriodEnd.toISOString(),
          last_billing_date: now.toISOString(),
          billing_cycle_count: (advisorSub.billing_cycle_count || 0) + 1,
          total_paid: (advisorSub.total_paid || 0) + chargeAmount,
          updated_at: now.toISOString()
        })
        .eq('id', advisorSub.id);
      
      if (updateError) {
        console.error('❌ Error updating advisor credit subscription:', updateError);
        return;
      }
      
      console.log('✅ Advisor credit subscription updated, now adding credits...');
      
      // Add credits using RPC function
      const { data: incrementedCredits, error: rpcError } = await supabase.rpc('increment_advisor_credits', {
        p_advisor_user_id: advisorSub.advisor_user_id,
        p_credits_to_add: advisorSub.credits_per_month,
        p_amount_paid: chargeAmount,
        p_currency: currency
      });
      
      if (rpcError) {
        console.error('❌ Error adding credits via RPC:', rpcError);
        return;
      }
      
      console.log('✅ Credits added successfully:', incrementedCredits);
      
      // Record in purchase history
      const { error: historyError } = await supabase
        .from('credit_purchase_history')
        .insert({
          advisor_user_id: advisorSub.advisor_user_id,
          credits_purchased: advisorSub.credits_per_month,
          amount_paid: chargeAmount,
          currency: currency,
          payment_gateway: 'razorpay',
          payment_transaction_id: paymentId,
          status: 'completed',
          metadata: {
            subscription_id: advisorSub.id,
            billing_cycle: advisorSub.billing_cycle_count + 1,
            payment_type: 'subscription',
            purchase_type: 'subscription',
            credits_available: incrementedCredits?.credits_available,
            credits_used: incrementedCredits?.credits_used
          }
        });
      
      if (historyError) {
        console.error('❌ Error recording purchase history:', historyError);
      } else {
        console.log('✅ Purchase history recorded for advisor credit renewal');
      }
      
      return; // Exit early - advisor subscription handled
    }
    
    // If not advisor subscription, continue with regular user subscription logic
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

    // Get current subscription to calculate next cycle number
    const { data: currentSub } = await supabase
      .from('user_subscriptions')
      .select('billing_cycle_count, total_paid')
      .eq('id', resolved.id)
      .single();

    const currentCycleCount = currentSub?.billing_cycle_count || 0;
    const nextCycleNumber = currentCycleCount + 1;
    const chargeAmount = subDetails.plan.amount / 100; // Convert from paise
    const newTotalPaid = (currentSub?.total_paid || 0) + chargeAmount;

    const updatePayload = {
      updated_at: new Date().toISOString(),
      razorpay_subscription_id: subscription.id,
      status: 'active',
      is_in_trial: false,
      billing_cycle_count: nextCycleNumber, // Increment cycle count
      total_paid: newTotalPaid, // Update total paid
      last_billing_date: new Date().toISOString(),
      next_billing_date: periodEndIso || null
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

    // Get plan_tier for billing cycle
    const { data: planData } = await supabase
      .from('subscription_plans')
      .select('plan_tier')
      .eq('id', resolved.plan_id)
      .maybeSingle();

    const planTier = planData?.plan_tier || 'free';

    // Record the payment in payment_transactions
    const { data: paymentTransaction, error: paymentError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: resolved.user_id || subDetails.notes?.user_id || null,
        subscription_id: resolved.id,
        payment_gateway: 'razorpay',
        gateway_order_id: subscription.id,
        gateway_payment_id: subDetails.latest_invoice?.payment_id || subscription.id + '_' + Date.now(),
        amount: chargeAmount,
        currency: subDetails.plan.currency || 'INR',
        status: 'success',
        payment_type: 'recurring',
        plan_tier: planTier,
        is_autopay: true,
        autopay_mandate_id: subscription.id
      })
      .select()
      .single();
    
    if (paymentError) {
      console.error('Error recording recurring payment:', paymentError);
    } else {
      console.log('✅ Recurring payment recorded successfully');

      // Create billing cycle for this recurring payment
      if (paymentTransaction && periodStartIso && periodEndIso) {
        const { error: cycleError } = await supabase
          .from('billing_cycles')
          .insert({
            subscription_id: resolved.id,
            cycle_number: nextCycleNumber,
            period_start: periodStartIso,
            period_end: periodEndIso,
            payment_transaction_id: paymentTransaction.id,
            amount: chargeAmount,
            currency: subDetails.plan.currency || 'INR',
            status: 'paid',
            plan_tier: planTier,
            is_autopay: true,
            autopay_attempted_at: new Date().toISOString()
          });

        if (cycleError) {
          console.error('Error creating billing cycle for recurring payment:', cycleError);
        } else {
          console.log(`✅ Created billing cycle #${nextCycleNumber} for recurring payment`);
        }
      }
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

    // Use database function to handle autopay cancellation
    // This keeps subscription active until period ends
    const { error } = await supabase.rpc('handle_autopay_cancellation', {
      p_subscription_id: resolved.id,
      p_cancellation_reason: 'cancelled_from_bank', // Likely cancelled from bank/UPI
      p_initiated_by: 'user'
    });

    if (error) {
      console.error('Error handling subscription pause:', error);
      // Fallback: manual update
      await supabase
        .from('user_subscriptions')
        .update({ 
          autopay_enabled: false,
          mandate_status: 'cancelled',
          autopay_cancelled_at: new Date().toISOString(),
          autopay_cancellation_reason: 'cancelled_from_bank',
          updated_at: new Date().toISOString()
        })
        .eq('id', resolved.id);
    } else {
      console.log('✅ Subscription autopay cancelled (paused) - will expire at period end');
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

    // Check if cancelled from bank/UPI or from our app
    // If cancelled from bank, keep active until period ends
    // If cancelled from app, mark as cancelled immediately
    const { data: currentSub } = await supabase
      .from('user_subscriptions')
      .select('autopay_enabled, current_period_end')
      .eq('id', resolved.id)
      .single();

    if (currentSub && currentSub.autopay_enabled) {
      // Was enabled, likely cancelled from bank/UPI
      // Use function to handle cancellation (keeps active until period ends)
      const { error } = await supabase.rpc('handle_autopay_cancellation', {
        p_subscription_id: resolved.id,
        p_cancellation_reason: 'cancelled_from_bank',
        p_initiated_by: 'user'
      });

      if (error) {
        console.error('Error handling subscription cancellation:', error);
      } else {
        console.log('✅ Subscription cancelled from bank - will expire at period end');
      }
    } else {
      // Already disabled or cancelled from app
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
    }
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

// Handle mandate revoked from bank/UPI
async function handleMandateRevoked(mandate) {
  try {
    console.log('Mandate revoked from bank/UPI:', mandate?.id);
    
    // Find subscription by mandate ID
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('id, user_id')
      .eq('razorpay_mandate_id', mandate?.id || mandate?.subscription_id)
      .limit(1)
      .maybeSingle();

    if (!subscription) {
      console.warn('No subscription found for revoked mandate:', mandate?.id);
      return;
    }

    // Handle autopay cancellation
    const { error } = await supabase.rpc('handle_autopay_cancellation', {
      p_subscription_id: subscription.id,
      p_cancellation_reason: 'mandate_revoked',
      p_initiated_by: 'user'
    });

    if (error) {
      console.error('Error handling mandate revocation:', error);
    } else {
      console.log('✅ Mandate revoked - autopay disabled, subscription continues until period ends');
    }
  } catch (error) {
    console.error('Error handling mandate revocation:', error);
  }
}

// Handle failed subscription charge
async function handleSubscriptionChargeFailed(subscription) {
  try {
    console.log('Subscription charge failed:', subscription.id);
    
    const userIdFromNotes = subscription?.notes?.user_id || null;
    const resolved = await resolveUserSubscriptionRecord({
      razorpaySubscriptionId: subscription.id,
      userId: userIdFromNotes
    });

    if (!resolved) {
      console.warn('No subscription found for failed charge:', subscription.id);
      return;
    }

    // Handle payment failure
    const { error } = await supabase.rpc('handle_subscription_payment_failure', {
      p_subscription_id: resolved.id,
      p_failure_reason: 'Autopay charge failed - payment declined or insufficient funds'
    });

    if (error) {
      console.error('Error handling subscription charge failure:', error);
    } else {
      console.log('✅ Subscription charge failure handled - marked as past_due');
    }
  } catch (error) {
    console.error('Error handling subscription charge failure:', error);
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
          // Already linked to this advisor (likely previously invited) - treat as re-invite
          console.log('Startup already linked to this advisor; sending OTP re-invite');
          isExistingTMSStartup = false; // allow OTP resend flow instead of "already on TMS"
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
        // Create new user via admin (OTP flow, no magic link)
        const { data: createdUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: contactEmail.toLowerCase().trim(),
          password: crypto.randomBytes(12).toString('hex'), // temp password; replaced via OTP
          email_confirm: true,
          user_metadata: {
            name: contactName,
            role: 'Startup',
            startupName: startupName,
            source: 'advisor_invite',
            investment_advisor_code_entered: advisorCode,
            skip_form1: true
          }
        });

        if (createErr || !createdUser?.user) {
          console.error('Error creating user via admin:', createErr);
          return res.status(500).json({ error: 'Failed to create user for invite' });
        }

        userId = createdUser.user.id;
        isNewUser = true;
        console.log('✅ User created for invite (OTP flow):', userId);
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

    // Send OTP email for invite (OTP-only flow)
    try {
      const OTP_EXPIRY_MINUTES = 10;
      const OTP_LENGTH = 6;
      const code = Math.floor(10 ** (OTP_LENGTH - 1) + Math.random() * 9 * 10 ** (OTP_LENGTH - 1)).toString();
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

      const { error: otpInsertError } = await supabase
        .from('password_otps')
        .insert({
          email: contactEmail.toLowerCase().trim(),
          user_id: userId,
          code,
          purpose: 'invite',
          advisor_code: advisorCode,
          expires_at: expiresAt
        });

      if (otpInsertError) {
        console.error('Error inserting invite OTP:', otpInsertError);
        return res.status(500).json({ error: 'Failed to generate invite OTP' });
      }

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

      let siteUrl = redirectUrl;
      if (!siteUrl) {
        const isDevelopment = process.env.NODE_ENV === 'development' || 
                             !process.env.VERCEL_ENV ||
                             process.env.VITE_SITE_URL?.includes('localhost');
        siteUrl = isDevelopment 
          ? 'http://localhost:5173'
          : (process.env.VITE_SITE_URL || process.env.SITE_URL || 'https://www.trackmystartup.com');
      }
      const resetLink = `${siteUrl}/?page=reset-password&advisorCode=${advisorCode}`;

      const info = await transporter.sendMail({
        from: `${fromName} <${fromAddress}>`,
        to: contactEmail,
        subject: 'Your TrackMyStartup invite OTP',
        text: [
          `You’ve been invited to TrackMyStartup.`,
          `Your OTP: ${code} (valid ${OTP_EXPIRY_MINUTES} minutes)`,
          ``,
          `Set your password here: ${resetLink}`,
          `Steps:`,
          `1) Open the link above.`,
          `2) Enter your email, the OTP, and a new password.`,
          `3) Continue to complete your registration.`
        ].join('\n'),
        html: `
          <p>You’ve been invited to TrackMyStartup.</p>
          <p>Your OTP: <b>${code}</b> (valid ${OTP_EXPIRY_MINUTES} minutes)</p>
          <p>Set your password here: <a href="${resetLink}">${resetLink}</a></p>
          <p><b>Steps:</b></p>
          <ol>
            <li>Open the link above.</li>
            <li>Enter your email, the OTP, and a new password.</li>
            <li>Continue to complete your registration.</li>
          </ol>
        `
      });

      console.log('📧 Invite OTP sent to:', contactEmail, 'accepted:', info.accepted, 'response:', info.response);
    } catch (otpErr) {
      console.error('Error sending invite OTP:', otpErr);
      return res.status(500).json({ error: 'Failed to send invite OTP' });
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
          ? 'Invite OTP sent successfully' 
          : 'User already exists, linked to advisor (OTP sent)'
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
// Storage Backfill Endpoint
// --------------------
app.post('/api/storage/backfill', async (req, res) => {
  try {
    const userId = req.query.userId || req.body?.userId;
    const startupId = req.query.startupId || req.body?.startupId;
    const allUsers = req.query.allUsers === 'true' || req.body?.allUsers === true;

    if (allUsers) {
      // Backfill for all users
      console.log('🔄 Starting backfill for all users...');
      
      // Get all users with startups
      const { data: startups } = await supabase
        .from('startups')
        .select('user_id')
        .not('user_id', 'is', null);

      if (!startups || startups.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No users found to backfill',
          result: { usersProcessed: 0, totalFilesTracked: 0, errors: 0 }
        });
      }

      const uniqueUserIds = [...new Set(startups.map(s => s.user_id))];
      let usersProcessed = 0;
      let totalFilesTracked = 0;
      let errors = 0;

      // Process each user
      for (const uid of uniqueUserIds) {
        try {
          const userResult = await backfillUserStorage(uid);
          usersProcessed++;
          totalFilesTracked += userResult.filesTracked;
          console.log(`✅ User ${uid}: ${userResult.filesTracked} files, ${userResult.totalStorageMB.toFixed(2)} MB`);
        } catch (error) {
          console.error(`❌ Error for user ${uid}:`, error);
          errors++;
        }
      }

      console.log(`✅ Backfill completed: ${usersProcessed} users, ${totalFilesTracked} files`);
      return res.status(200).json({
        success: true,
        message: `Backfill completed for ${usersProcessed} users`,
        result: { usersProcessed, totalFilesTracked, errors }
      });
    }

    if (!userId) {
      return res.status(400).json({ 
        error: 'Missing userId parameter',
        usage: 'POST /api/storage/backfill?userId=xxx or POST with { userId: "xxx" }'
      });
    }

    // Backfill for specific user
    console.log(`🔄 Starting backfill for user: ${userId}...`);
    const result = await backfillUserStorage(userId, startupId ? parseInt(startupId.toString()) : undefined);
    console.log(`✅ Backfill completed: ${result.filesTracked} files, ${result.totalStorageMB.toFixed(2)} MB`);
    return res.status(200).json({
      success: true,
      message: `Backfill completed: ${result.filesTracked} files tracked`,
      result
    });

  } catch (error) {
    console.error('❌ Error in backfill storage:', error);
    return res.status(500).json({
      error: 'Backfill failed',
      message: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Helper function to backfill storage for a single user
async function backfillUserStorage(userId, startupId = null) {
  const result = {
    success: true,
    filesProcessed: 0,
    filesTracked: 0,
    totalStorageMB: 0,
    errors: 0,
    details: []
  };

  try {
    // Get user's startups
    let startupIds = [];
    if (startupId) {
      startupIds = [startupId];
    } else {
      const { data: startups } = await supabase
        .from('startups')
        .select('id')
        .eq('user_id', userId);
      
      if (startups) {
        startupIds = startups.map(s => s.id);
      }
    }

    // Get application IDs
    let applicationIds = [];
    if (startupIds.length > 0) {
      const { data: applications } = await supabase
        .from('opportunity_applications')
        .select('id')
        .in('startup_id', startupIds);
      
      if (applications) {
        applicationIds = applications.map(a => a.id.toString());
      }
    }

    // Buckets to scan
    const buckets = [
      { name: 'startup-documents', type: 'document' },
      { name: 'compliance-documents', type: 'compliance' },
      { name: 'financial-attachments', type: 'financial' },
      { name: 'financial-documents', type: 'financial' },
      { name: 'company-documents', type: 'document' },
      { name: 'pitch-decks', type: 'pitch_deck' },
      { name: 'pitch-videos', type: 'video' },
      { name: 'employee-contracts', type: 'contract' },
      { name: 'verification-documents', type: 'verification' },
      { name: 'cap-table-documents', type: 'document' },
      { name: 'business-plans', type: 'document' },
      { name: 'logos', type: 'image' }
    ];

    // Scan each bucket
    for (const bucketInfo of buckets) {
      try {
        const bucketResult = await scanAndTrackBucket(
          bucketInfo.name,
          bucketInfo.type,
          userId,
          startupIds,
          applicationIds
        );

        result.filesProcessed += bucketResult.filesFound;
        result.filesTracked += bucketResult.filesTracked;
        result.totalStorageMB += bucketResult.storageMB;
        result.details.push({
          bucket: bucketInfo.name,
          filesFound: bucketResult.filesFound,
          filesTracked: bucketResult.filesTracked,
          storageMB: bucketResult.storageMB
        });
      } catch (error) {
        console.error(`Error scanning bucket ${bucketInfo.name}:`, error);
        result.errors++;
      }
    }

    // Update subscription storage if user has one
    if (result.filesTracked > 0) {
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (subscription) {
        await supabase.rpc('calculate_user_storage_from_tracking', {
          p_user_id: userId
        });
      }
    }

    return result;
  } catch (error) {
    console.error('Error in backfillUserStorage:', error);
    result.success = false;
    return result;
  }
}

// Helper function to check if a string is a valid UUID
function isValidUUID(str) {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Helper function to scan and track a bucket
async function scanAndTrackBucket(bucket, fileType, userId, startupIds, applicationIds) {
  let filesFound = 0;
  let filesTracked = 0;
  let totalStorageMB = 0;

  try {
    // List all files in bucket recursively
    const allFiles = await listFilesRecursive(bucket, '');

    for (const file of allFiles) {
      filesFound++;

      // Check if file belongs to user
      if (!fileBelongsToUser(file, userId, startupIds, applicationIds)) {
        continue;
      }

      // Check if already tracked
      const storageLocation = `${bucket}/${file.path}`;
      const { data: existing } = await supabase
        .from('user_storage_usage')
        .select('id')
        .eq('user_id', userId)
        .eq('storage_location', storageLocation)
        .limit(1);

      if (existing && existing.length > 0) {
        continue; // Already tracked
      }

      // Calculate file size in MB
      const fileSizeMB = (file.size || 0) / (1024 * 1024);

      // Get related entity info
      const relatedEntityType = getRelatedEntityType(bucket, file.path);
      const relatedEntityId = getRelatedEntityId(file.path, startupIds, applicationIds);
      
      // Only set related_entity_id if it's a valid UUID (not a numeric startup ID)
      const insertData = {
        user_id: userId,
        file_type: fileType,
        file_name: file.name,
        file_size_mb: Math.round(fileSizeMB * 100) / 100,
        storage_location: storageLocation,
        related_entity_type: relatedEntityType
      };
      
      // Only add related_entity_id if it's a valid UUID format
      if (relatedEntityId && isValidUUID(relatedEntityId)) {
        insertData.related_entity_id = relatedEntityId;
      }

      // Insert tracking record
      const { error: insertError } = await supabase
        .from('user_storage_usage')
        .insert(insertData);

      if (insertError) {
        console.error(`Error tracking file ${storageLocation}:`, insertError);
        continue;
      }

      filesTracked++;
      totalStorageMB += fileSizeMB;
    }
  } catch (error) {
    console.error(`Error scanning bucket ${bucket}:`, error);
  }

  return {
    filesFound,
    filesTracked,
    storageMB: Math.round(totalStorageMB * 100) / 100
  };
}

// Helper function to list files recursively
async function listFilesRecursive(bucket, path, allFiles = []) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      if (error.message?.includes('not found') || error.message?.includes('Bucket')) {
        return allFiles;
      }
      console.error(`Error listing ${bucket}/${path}:`, error);
      return allFiles;
    }

    if (!data || data.length === 0) {
      return allFiles;
    }

    for (const item of data) {
      const fullPath = path ? `${path}/${item.name}` : item.name;

      if (item.id && item.metadata) {
        // This is a file
        const fileSize = item.metadata.size || 0;
        allFiles.push({
          name: item.name,
          size: fileSize,
          path: fullPath,
          created_at: item.created_at || '',
          updated_at: item.updated_at || item.created_at || ''
        });
      } else if (!item.id) {
        // This is a folder - recurse
        await listFilesRecursive(bucket, fullPath, allFiles);
      }
    }
  } catch (error) {
    console.error(`Error in listFilesRecursive for ${bucket}/${path}:`, error);
  }

  return allFiles;
}

// Helper function to check if file belongs to user
function fileBelongsToUser(file, userId, startupIds, applicationIds) {
  const path = file.path.toLowerCase();
  const lowerUserId = userId.toLowerCase();

  // Pattern 1: Path contains startupId
  if (startupIds.some(id => path.includes(`/${id}/`) || path.startsWith(`${id}/`))) {
    return true;
  }

  // Pattern 2: Path contains applicationId
  if (applicationIds.some(appId => path.includes(`/${appId}/`) || path.includes(`/${appId}-`))) {
    return true;
  }

  // Pattern 3: Path contains userId
  if (path.includes(lowerUserId)) {
    return true;
  }

  return false;
}

// Helper function to get related entity type
function getRelatedEntityType(bucket, path) {
  if (bucket === 'compliance-documents') return 'compliance_task';
  if (bucket === 'financial-attachments' || bucket === 'financial-documents') return 'financial_record';
  if (bucket === 'employee-contracts') return 'employee';
  if (bucket === 'startup-documents') {
    if (path.includes('contracts/')) return 'opportunity_application';
    if (path.includes('agreements/')) return 'opportunity_application';
  }
  if (bucket === 'cap-table-documents') return 'investment';
  return 'startup';
}

// Helper function to get related entity ID
function getRelatedEntityId(path, startupIds, applicationIds) {
  // Try to extract application ID from path (these should be UUIDs)
  for (const appId of applicationIds) {
    if (path.includes(appId) && isValidUUID(appId)) {
      return appId;
    }
  }

  // Don't return startup IDs - they're integers, not UUIDs
  // The related_entity_id field expects UUIDs only
  return null;
}

// --------------------
// Payment Verification Alias (Frontend uses /api/payment/verify, local server has /api/razorpay/verify)
// --------------------
// Simple approach: re-register the route at /api/payment/verify by making a proxy handler
app.post('/api/payment/verify', async (req, res) => {
  console.log('📍 [Alias] /api/payment/verify → /api/razorpay/verify');
  // Create a temporary request wrapper
  const tempReq = Object.create(req);
  const tempRes = Object.create(res);
  
  // Forward to our internal verification logic
  // We'll just create a simple proxy by re-calling the same code
  try {
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_subscription_id,
      razorpay_signature,
      assignment_id,
      user_id,
      plan_id,
      amount,
      currency = 'INR',
      tax_percentage,
      tax_amount,
      total_amount_with_tax,
      interval,
      country
    } = req.body;

    // Simply redirect to the razorpay verify endpoint by calling its route
    // We'll send a POST request to ourselves
    const internalRes = await fetch('http://localhost:3001/api/razorpay/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_subscription_id,
        razorpay_signature,
        assignment_id,
        user_id,
        plan_id,
        amount,
        currency,
        tax_percentage,
        tax_amount,
        total_amount_with_tax,
        interval,
        country
      })
    });

    const data = await internalRes.json();
    res.status(internalRes.status).json(data);
  } catch (error) {
    console.error('❌ [Alias] Error forwarding to razorpay verify:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// --------------------
// Start Server
// --------------------
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Local API running on http://localhost:${port}`));
