# Local Testing & Fix Plan for Subscription Creation Issue

## ✅ Yes, You NEED Local Testing

**Why?** Without local testing, we're just guessing. The endpoint could fail for:
- ❓ Plan creation issue  
- ❓ Razorpay API credentials issue
- ❓ Invalid request format
- ❓ Timeout/network issue
- ❓ Response parsing error
- ❓ And many others...

By testing locally, we'll see the **actual error** and know exactly how to fix it.

---

## 🛠️ Step 1: Add Logging to the Endpoint

### File: `server.js` (lines 488-560)

Add detailed logging to see what's happening:

```javascript
app.post("/api/razorpay/create-subscription", async (req, res) => {
  try {
    const { user_id, final_amount, interval, plan_name } = req.body;
    
    console.log("📨 [SUBSCRIPTION] Request received:", {
      user_id,
      final_amount,
      interval,
      plan_name,
    });

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    console.log("🔑 [SUBSCRIPTION] Razorpay credentials:", {
      keyId: keyId ? `${keyId.substring(0, 10)}...` : "NOT SET",
      keySecret: keySecret ? "SET" : "NOT SET",
    });

    // Get or create plan
    console.log("📋 [SUBSCRIPTION] Creating/getting plan...");
    const plan_id = await getOrCreateRazorpayPlan(
      {
        period: interval === "yearly" ? "yearly" : "monthly",
        interval: interval === "yearly" ? 12 : 1,
        period_count: 1,
        customer_notify: 1,
        notes: { name: plan_name },
        plan_title: plan_name,
        description: plan_name,
        amount: final_amount,
      },
      { keyId, keySecret }
    );

    console.log("✅ [SUBSCRIPTION] Plan ID result:", plan_id);

    if (!plan_id) {
      console.error("❌ [SUBSCRIPTION] Plan creation failed!");
      return res.status(400).json({
        error: `Plan ID not configured for interval: ${interval}`,
      });
    }

    // Create subscription
    console.log("🔄 [SUBSCRIPTION] Creating Razorpay subscription...");
    const url = "https://api.razorpay.com/v1/subscriptions";
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    
    const subscriptionPayload = {
      plan_id,
      customer_notify: 1,
      quantity: 1,
      total_count: 999,
      notes: { user_id },
    };
    
    console.log("📤 [SUBSCRIPTION] Razorpay API payload:", subscriptionPayload);

    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(subscriptionPayload).toString(),
    });

    console.log("📥 [SUBSCRIPTION] Razorpay API response status:", r.status);
    
    const responseText = await r.text();
    console.log("📥 [SUBSCRIPTION] Razorpay API response body:", responseText);

    if (!r.ok) {
      console.error("❌ [SUBSCRIPTION] Razorpay API error!");
      return res.status(r.status).send(responseText);
    }

    const sub = JSON.parse(responseText);
    console.log("✅ [SUBSCRIPTION] Subscription created:", {
      id: sub.id,
      plan_id: sub.plan_id,
      status: sub.status,
    });

    return res.json(sub);
  } catch (error) {
    console.error("❌ [SUBSCRIPTION] Server error:", error);
    return res.status(500).json({ error: error.message });
  }
});
```

---

## 🧪 Step 2: Test the Endpoint Locally

### 2.1: Start Your Local Server

```powershell
# Terminal 1: Start local Express server
node server.js
```

You should see:
```
✅ Razorpay Local Server running on PORT 3001
```

### 2.2: Test with a Real Request

**Terminal 2: Make a test request**

```powershell
# Test subscription creation
$body = @{
    user_id = "test-user-123"
    final_amount = 99900
    interval = "monthly"
    plan_name = "Test Plan Monthly"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3001/api/razorpay/create-subscription" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

### 2.3: Check the Output

**In Terminal 1, you'll see one of these scenarios:**

#### ✅ **SUCCESS** (What you want to see)
```
📨 [SUBSCRIPTION] Request received: {...}
🔑 [SUBSCRIPTION] Razorpay credentials: {keyId: "rzp_live_...", keySecret: "SET"}
📋 [SUBSCRIPTION] Creating/getting plan...
✅ [SUBSCRIPTION] Plan ID result: plan_abc123xyz
🔄 [SUBSCRIPTION] Creating Razorpay subscription...
📤 [SUBSCRIPTION] Razorpay API payload: {...}
📥 [SUBSCRIPTION] Razorpay API response status: 201
📥 [SUBSCRIPTION] Razorpay API response body: {"id":"sub_S2oxuelCkeUOuD","plan_id":"plan_abc123xyz",...}
✅ [SUBSCRIPTION] Subscription created: {id: "sub_S2oxuelCkeUOuD", plan_id: "plan_abc123xyz", status: "active"}
```

#### ❌ **FAILURE #1: Plan Creation Failed**
```
📨 [SUBSCRIPTION] Request received: {...}
🔑 [SUBSCRIPTION] Razorpay credentials: {keyId: "rzp_live_...", keySecret: "SET"}
📋 [SUBSCRIPTION] Creating/getting plan...
✅ [SUBSCRIPTION] Plan ID result: null
❌ [SUBSCRIPTION] Plan creation failed!
```
**Fix:** Debug `getOrCreateRazorpayPlan()` function

#### ❌ **FAILURE #2: Razorpay API Error**
```
📨 [SUBSCRIPTION] Request received: {...}
🔑 [SUBSCRIPTION] Razorpay credentials: {...}
📋 [SUBSCRIPTION] Creating/getting plan...
✅ [SUBSCRIPTION] Plan ID result: plan_abc123xyz
🔄 [SUBSCRIPTION] Creating Razorpay subscription...
📤 [SUBSCRIPTION] Razorpay API payload: {...}
📥 [SUBSCRIPTION] Razorpay API response status: 400
📥 [SUBSCRIPTION] Razorpay API response body: {"error":{"code":"INVALID_REQUEST_ERROR","description":"Invalid amount..."}}
❌ [SUBSCRIPTION] Razorpay API error!
```
**Fix:** Check what error Razorpay returns

#### ❌ **FAILURE #3: Credentials Not Set**
```
📨 [SUBSCRIPTION] Request received: {...}
🔑 [SUBSCRIPTION] Razorpay credentials: {keyId: "NOT SET", keySecret: "NOT SET"}
```
**Fix:** Add `.env` file with credentials

---

## 🔧 Step 3: Frontend Error Handling

### File: `lib/paymentService.ts` (around line 545)

**BEFORE:**
```typescript
const razorpaySubscription = await this.createSubscription(plan, userId);

const options = {
  subscription_id: razorpaySubscription.id,  // Could be undefined!
  ...
};

razorpay.open();
```

**AFTER:**
```typescript
let razorpaySubscription;
try {
  console.log("🔄 Creating subscription...");
  razorpaySubscription = await this.createSubscription(plan, userId);
  
  console.log("✅ Subscription created:", razorpaySubscription);
  
  if (!razorpaySubscription?.id) {
    console.error("❌ Subscription ID is missing:", razorpaySubscription);
    throw new Error("Failed to create subscription. Please try again.");
  }
} catch (error) {
  console.error("❌ Subscription creation error:", error);
  toast.error("Subscription creation failed. Please try again.");
  throw error;  // Stop the payment flow
}

const options = {
  subscription_id: razorpaySubscription.id,  // Now guaranteed to exist
  ...
};

razorpay.open();
```

---

## 📊 Common Issues & Fixes

### Issue 1: "Plan ID not configured"
```
Error: Plan ID not configured for interval: monthly
```

**What it means:** `getOrCreateRazorpayPlan()` is returning null

**How to fix:**
1. Check if `getOrCreateRazorpayPlan()` exists
2. Check if it's making API calls correctly
3. Add logging inside `getOrCreateRazorpayPlan()` to see what's happening

---

### Issue 2: "Invalid amount"
```
Error: Invalid amount for the given currency
```

**What it means:** The amount format is wrong

**How to fix:**
- Check if `final_amount` is in paise (cents)
- Razorpay amounts must be in smallest currency unit (paise for INR)
- Example: ₹999 should be sent as 99900 (paise)

---

### Issue 3: "Invalid plan"
```
Error: Invalid plan_id specified
```

**What it means:** Plan creation succeeded but has an issue

**How to fix:**
1. Check plan status: `GET /v1/plans/{plan_id}`
2. Verify plan was actually created in Razorpay dashboard
3. Check if plan has correct period/interval

---

### Issue 4: Network Timeout
```
Error: fetch timeout
```

**What it means:** Request to Razorpay API timed out

**How to fix:**
1. Check internet connection
2. Check if local server can reach Razorpay API:
   ```powershell
   curl "https://api.razorpay.com/v1/subscriptions"
   ```
3. Add timeout handling to fetch request

---

## 🚀 Quick Test Command

Save this as `test-subscription.js`:

```javascript
const fetch = require('node-fetch');

async function testSubscription() {
  try {
    console.log("🧪 Testing subscription creation...\n");
    
    const response = await fetch("http://localhost:3001/api/razorpay/create-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: "test-123",
        final_amount: 99900,
        interval: "monthly",
        plan_name: "Test Plan"
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log("✅ SUCCESS!");
      console.log("Subscription ID:", data.id);
      console.log("Plan ID:", data.plan_id);
      console.log("Status:", data.status);
    } else {
      console.log("❌ ERROR!");
      console.log("Status:", response.status);
      console.log("Error:", data);
    }
  } catch (error) {
    console.error("❌ Connection error:", error.message);
  }
}

testSubscription();
```

**Run it:**
```powershell
node test-subscription.js
```

---

## 📋 Complete Testing Checklist

- [ ] **Start server:** `node server.js`
- [ ] **Add logging** to `/api/razorpay/create-subscription`
- [ ] **Test endpoint** with POST request
- [ ] **Check Terminal 1** for detailed logs
- [ ] **Identify actual error** from logs
- [ ] **Fix based on error type** (see Common Issues above)
- [ ] **Test again** to verify fix
- [ ] **Add error handling** to frontend
- [ ] **Deploy to production**
- [ ] **Test with real payment** from frontend

---

## 🎯 Next Steps

1. **Add the logging code** above to `server.js`
2. **Start server:** `node server.js`
3. **Run test request** (PowerShell command above)
4. **Share the logs** from Terminal 1
5. **I'll tell you exactly how to fix** based on actual error

Once we see the actual error, we can fix it properly!

Would you like me to help you add this logging to the code right now?
