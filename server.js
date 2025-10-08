// Lightweight local API server for Razorpay orders and subscriptions
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";

// Load backend environment variables with precedence:
// 1) .env.backend.local
// 2) .env.backend
// 3) .env.local
let loadedEnvPath = null;
if (dotenv.config({ path: ".env.backend.local" }).parsed) {
  loadedEnvPath = ".env.backend.local";
} else if (dotenv.config({ path: ".env.backend" }).parsed) {
  loadedEnvPath = ".env.backend";
} else if (dotenv.config({ path: ".env.local" }).parsed) {
  loadedEnvPath = ".env.local";
} else {
  dotenv.config();
  loadedEnvPath = ".env (default)";
}

const app = express();
app.use(cors());
app.use(express.json());

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
// Create Razorpay Order
// --------------------
app.post("/api/razorpay/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return res.status(500).json({ error: "Razorpay keys not configured" });

    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const r = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ amount: Math.round(amount * 100), currency, receipt, payment_capture: 1 }),
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
// Create Razorpay Subscription
// --------------------
const createSubscriptionHandler = async (req, res) => {
  try {
    const { plan_id: bodyPlanId, total_count = 12, customer_notify = 1, user_id, include_trial = false, trial_seconds, trial_days = 7 } = req.body;

    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return res.status(500).json({ error: "Razorpay keys not configured" });

    const plan_id = bodyPlanId || process.env.RAZORPAY_STARTUP_PLAN_ID || process.env.RAZORPAY_STARTUP_PLAN_ID_MONTHLY;
    if (!plan_id) return res.status(400).json({ error: "plan_id not provided and RAZORPAY_STARTUP_PLAN_ID(_MONTHLY) not set" });

    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const r = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify((() => {
        const payload = {
          plan_id,
          total_count,
          customer_notify,
          notes: { user_id, trial_startup: "true" }
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
app.get('/api/billing/subscription-status', async (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) return res.status(400).json({ error: 'user_id is required' });

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Supabase service not configured' });

    const r = await fetch(`${supabaseUrl}/rest/v1/user_subscriptions?user_id=eq.${userId}&select=status,is_in_trial,trial_end,current_period_end`, {
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey
      }
    });
    if (!r.ok) return res.status(r.status).send(await r.text());
    const rows = await r.json();
    const sub = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    return res.json({
      status: sub?.status || null,
      is_in_trial: sub?.is_in_trial || false,
      trial_end: sub?.trial_end || null,
      current_period_end: sub?.current_period_end || null
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
    const { user_id, razorpay_subscription_id, plan_type = 'monthly', startup_count = 1 } = req.body || {};

    if (!user_id) return res.status(400).json({ error: 'user_id is required' });
    if (!razorpay_subscription_id) return res.status(400).json({ error: 'razorpay_subscription_id is required' });

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Supabase service not configured' });

    // 1) Resolve plan for Startup user by plan_type (monthly/yearly)
    const planResp = await fetch(`${supabaseUrl}/rest/v1/subscription_plans?user_type=eq.Startup&billing_interval=eq.${plan_type}&is_active=eq.true&select=id,price,billing_interval`, {
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey
      }
    });
    if (!planResp.ok) return res.status(planResp.status).send(await planResp.text());
    const plans = await planResp.json();
    const plan = Array.isArray(plans) && plans.length > 0 ? plans[0] : null;
    if (!plan) return res.status(400).json({ error: `No active Startup plan found for ${plan_type}` });

    // 2) Upsert into user_subscriptions
    const now = new Date();
    const periodMs = plan.billing_interval === 'yearly' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    const body = [{
      user_id,
      plan_id: plan.id,
      status: 'active',
      startup_count: startup_count,
      amount: plan.price * startup_count,
      billing_interval: plan.billing_interval,
      interval: plan.billing_interval,
      is_in_trial: false,
      trial_start: null,
      trial_end: null,
      razorpay_subscription_id,
      current_period_start: now.toISOString(),
      current_period_end: new Date(now.getTime() + periodMs).toISOString(),
      updated_at: now.toISOString()
    }];

    const upsertResp = await fetch(`${supabaseUrl}/rest/v1/user_subscriptions?on_conflict=user_id,plan_id`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(body)
    });
    if (!upsertResp.ok) return res.status(upsertResp.status).send(await upsertResp.text());
    const inserted = await upsertResp.json();
    return res.json(Array.isArray(inserted) ? inserted[0] : inserted);
  } catch (e) {
    console.error('record-subscription error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// --------------------
// Create Trial Subscription
// --------------------
app.post("/api/razorpay/create-trial-subscription", async (req, res) => {
  try {
    console.log("[create-trial-subscription] body:", req.body);

    const { user_id, plan_type = 'monthly', startup_count = 1 } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return res.status(500).json({ error: "Razorpay keys not configured" });

    // Determine plan based on type
    let plan_id;
    if (plan_type === 'yearly') plan_id = process.env.RAZORPAY_STARTUP_PLAN_ID_YEARLY || process.env.RAZORPAY_STARTUP_PLAN_ID;
    else plan_id = process.env.RAZORPAY_STARTUP_PLAN_ID_MONTHLY || process.env.RAZORPAY_STARTUP_PLAN_ID;

    if (!plan_id) return res.status(400).json({ error: `Plan ID not configured for ${plan_type} plan` });

    const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const r = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({
        plan_id,
        total_count: plan_type === 'yearly' ? 1 : 12,
        customer_notify: 1,
        notes: { user_id, startup_count, trial_startup: "true", plan_type }
      }),
    });

    if (!r.ok) return res.status(r.status).send(await r.text());
    const sub = await r.json();
    res.json(sub);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

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

    // Handle subscription events
    if (event.event === "subscription.activated") {
      console.log("Subscription activated:", event.payload.subscription.id);
      try {
        const sub = event.payload?.subscription;
        const customerId = sub?.customer_id;
        const userId = sub?.notes?.user_id;
        if (customerId && userId && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ razorpay_customer_id: customerId, updated_at: new Date().toISOString() })
          });
        }
      } catch (e) {
        console.warn('Failed to persist razorpay_customer_id on subscription.activated:', e);
      }
    }
    if (event.event === "subscription.charged") await handleTrialEnd(event.payload.subscription);
    if (event.event === "subscription.paused") console.log("Subscription paused:", event.payload.subscription.id);
    if (event.event === "subscription.cancelled") console.log("Subscription cancelled:", event.payload.subscription.id);
    if (event.event === "payment.failed") await handlePaymentFailure(event.payload.payment);

    res.json({ ok: true });
  } catch (e) {
    console.error("Webhook error:", e);
    res.status(400).json({ error: "Invalid payload" });
  }
});

// --------------------
// Helper Functions
// --------------------
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

async function handlePaymentFailure(payment) {
  try {
    const subscriptionId = payment.subscription_id;
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({ status: 'past_due', updated_at: new Date().toISOString() })
    });

    if (!response.ok) console.error("Failed to update subscription status:", await response.text());
    else console.log("Successfully updated subscription status to past_due");
  } catch (error) {
    console.error("Error handling payment failure:", error);
  }
}

// --------------------
// Start Server
// --------------------
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Local API running on http://localhost:${port}`));
