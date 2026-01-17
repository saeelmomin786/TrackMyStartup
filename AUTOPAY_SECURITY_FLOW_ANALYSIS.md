# Autopay Flow & Security - Complete Analysis

## 🎯 ONE-LINE ANSWER

**Payment system is properly connected via webhooks with signature verification: Initial payment creates subscription → Razorpay sends webhook for next autopay → Backend verifies signature + updates billing cycles + payment transactions with proper cascade delete for data integrity.**

---

## 📊 Complete Autopay Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ INITIAL PAYMENT (What We Already Fixed)                         │
├─────────────────────────────────────────────────────────────────┤
│ 1. Frontend: User authorizes mandate in Razorpay checkout      │
│ 2. Razorpay returns: payment_id, subscription_id, signature    │
│ 3. Frontend calls: /api/razorpay/verify with proof              │
│ 4. Backend verifies signature ✅                                 │
│ 5. CREATE in 3 tables:                                          │
│    └─ payment_transactions (payment_id, signature)             │
│    └─ user_subscriptions (razorpay_subscription_id, autopay_enabled=true) │
│    └─ billing_cycles #1 (cycle_number=1, status='paid')        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ AUTOPAY TRIGGER (Next Month - Automated by Razorpay)           │
├─────────────────────────────────────────────────────────────────┤
│ Razorpay automatically charges next billing date               │
│ Two outcomes:                                                   │
│                                                                  │
│ ✅ SCENARIO A: Payment Success                                  │
│    Razorpay sends webhook: subscription.charged                │
│    └─ event.event = "subscription.charged"                     │
│    └─ event.payload.subscription.id = razorpay_subscription_id │
│    └─ Headers: x-razorpay-signature (verified)                │
│                                                                  │
│ ❌ SCENARIO B: Payment Failed                                   │
│    Razorpay sends webhook: subscription.charged                │
│    └─ event.payload.subscription.status = "paused"             │
│    └─ Headers: x-razorpay-signature (verified)                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ WEBHOOK ENDPOINT: /api/razorpay/webhook                        │
├─────────────────────────────────────────────────────────────────┤
│ 1. Receive POST from Razorpay                                  │
│ 2. Extract: payload, x-razorpay-signature header              │
│ 3. Verify Signature:                                           │
│    expected = HMAC-SHA256(payload, RAZORPAY_WEBHOOK_SECRET)   │
│    if (expected !== signature) return 401 UNAUTHORIZED ❌      │
│ 4. Parse JSON payload                                          │
│ 5. Switch on event.event type                                  │
│    ├─ "subscription.charged" (success)                        │
│    ├─ "subscription.paused" (failed)                          │
│    ├─ "subscription.cancelled"                                │
│    ├─ "mandate.revoked"                                       │
│    └─ etc.                                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ SCENARIO A: AUTOPAY SUCCESS (subscription.charged)

### Function: `handleSubscriptionCharged(subscription)`

**Step 1: Fetch Details from Razorpay**
```javascript
GET https://api.razorpay.com/v1/subscriptions/{subscription_id}
Auth: Basic {base64(key_id:key_secret)}
Response: {
  id: "sub_S4z1KDhpElowfd",
  current_start: 1705502400,      // Unix timestamp
  current_end: 1708094400,         // Unix timestamp (next month end)
  plan: {
    amount: 99900,                 // In paise (999.00 INR)
    currency: "INR"
  },
  latest_invoice: {
    payment_id: "pay_XYZ123"
  }
}
```

**Step 2: Find User's Subscription Record**
```javascript
// Query user_subscriptions by razorpay_subscription_id
SELECT * FROM user_subscriptions 
WHERE razorpay_subscription_id = 'sub_S4z1KDhpElowfd'
```

**Step 3: Calculate New Billing Cycle**
```javascript
currentCycleCount = 1                    // From user_subscriptions
nextCycleNumber = currentCycleCount + 1  // = 2
chargeAmount = 99900 / 100               // = 999.00 INR
newTotalPaid = 999.00 + 999.00           // = 1998.00 INR
periodEndIso = new Date(1708094400 * 1000).toISOString()
```

**Step 4: Update user_subscriptions Table**
```javascript
UPDATE user_subscriptions SET
  billing_cycle_count = 2,              // Incremented
  total_paid = 1998.00,                  // Updated
  last_billing_date = NOW(),
  next_billing_date = '2026-02-17...',  // 3 months from now
  status = 'active'                     // Stays active
WHERE id = subscription_id
```

**Step 5: Insert into payment_transactions**
```javascript
INSERT INTO payment_transactions (
  user_id,                              // From subscription notes
  subscription_id,                       // Link to subscription
  payment_gateway: 'razorpay',
  gateway_order_id: 'sub_S4z1KDhpElowfd',
  gateway_payment_id: 'pay_XYZ123',
  amount: 999.00,
  currency: 'INR',
  status: 'success',
  payment_type: 'recurring'              // Key: Mark as recurring!
)
```

**Step 6: Create New Billing Cycle Record**
```javascript
INSERT INTO billing_cycles (
  subscription_id,
  cycle_number: 2,                       // Cycle #2
  period_start: '2026-01-17...',
  period_end: '2026-02-17...',
  payment_transaction_id: <id from step 5>,
  amount: 999.00,
  currency: 'INR',
  status: 'paid',                        // Already paid by Razorpay
  plan_tier: 'premium',
  is_autopay: true
)
```

### Result After Autopay Success:
```
user_subscriptions:
  ✅ billing_cycle_count = 2
  ✅ total_paid = 1998.00
  ✅ next_billing_date = 1 month away
  ✅ status = 'active' (continues)

payment_transactions:
  ✅ NEW record created (payment_type = 'recurring')
  
billing_cycles:
  ✅ NEW cycle #2 created (status = 'paid')
```

---

## ❌ SCENARIO B: AUTOPAY FAILED

### Webhook Received
```javascript
event.event = "subscription.charged"
event.payload.subscription.status = "paused"  // KEY: Paused state = failure
```

### Function: `handleSubscriptionChargeFailed(subscription)`

```javascript
// When subscription is paused, it means charge failed
// Find the subscription and update status

UPDATE user_subscriptions SET
  status = 'paused',                    // Changed from 'active'
  mandate_status = 'needs_renewal',
  updated_at = NOW()
WHERE razorpay_subscription_id = subscription_id
```

### Result After Autopay Failure:
```
user_subscriptions:
  ⚠️ status = 'paused' (NOT active)
  ⚠️ mandate_status = 'needs_renewal'
  ⚠️ billing_cycle_count = NOT incremented
  ⚠️ total_paid = NOT updated

Dashboard shows:
  ❌ "Subscription Paused"
  ❌ "Please renew your payment method"
  ❌ Restrict premium features

Action needed:
  👤 User must re-authorize mandate in Razorpay checkout
```

---

## 🔒 SECURITY VERIFICATION

### 1️⃣ Webhook Signature Verification (Line 3270-3273)
```javascript
// CRITICAL: Verify every webhook is actually from Razorpay
const payload = req.body.toString();
const signature = req.headers["x-razorpay-signature"];
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

// Create expected signature
const expected = crypto
  .createHmac("sha256", webhookSecret)
  .update(payload)
  .digest("hex");

// Compare
if (expected !== signature) {
  return res.status(401).json({ error: "Invalid signature" });  // REJECT
}
```

**What this prevents:**
- ❌ Fake webhooks from attackers
- ❌ Modified webhook payloads
- ❌ Unauthorized billing updates
- ✅ Only Razorpay with secret key can trigger updates

### 2️⃣ Razorpay API Authentication (Line 5286-5295)
```javascript
// When fetching subscription details, verify using API credentials
const authHeader = "Basic " + Buffer.from(
  `${keyId}:${keySecret}`
).toString("base64");

const response = await fetch(
  `https://api.razorpay.com/v1/subscriptions/${subscription.id}`,
  { headers: { "Authorization": authHeader } }
);
```

**What this provides:**
- ✅ Verifies subscription ID exists at Razorpay
- ✅ Fetches true billing amount and dates
- ✅ Prevents database manipulation
- ✅ Uses encrypted credentials

### 3️⃣ Subscription Resolution (Link subscription ID to user)
```javascript
// Never trust subscription ID from webhook alone
// Always verify it belongs to actual user
const resolved = await resolveUserSubscriptionRecord({
  razorpaySubscriptionId: subscription.id,
  userId: userIdFromNotes
});

if (!resolved) {
  console.warn('No matching subscription found');
  return; // REJECT - refuse to process
}
```

---

## 🔗 TABLE CONNECTIONS & CASCADE DELETE

### Foreign Key Structure:
```sql
-- billing_cycles → user_subscriptions
subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) 
  ON DELETE CASCADE

-- payment_transactions → user_subscriptions  
subscription_id UUID REFERENCES user_subscriptions(id) 
  ON DELETE SET NULL

-- billing_cycles → payment_transactions
payment_transaction_id UUID REFERENCES payment_transactions(id)
```

### What Happens on Delete:

**If user cancels subscription:**
```javascript
DELETE FROM user_subscriptions WHERE id = 'sub-789'
```

**Cascade behavior:**
1. ✅ All `billing_cycles` with subscription_id='sub-789' → AUTO DELETED
2. ✅ All `payment_transactions` subscription_id → SET NULL (preserved)
3. ✅ Payment audit trail completely intact
4. ✅ No orphaned records

**Result:**
```
user_subscriptions: DELETED
payment_transactions: KEPT (subscription_id = NULL)
billing_cycles: DELETED
```

---

## 📋 DATA FLOW SUMMARY TABLE

| Stage | payment_transactions | user_subscriptions | billing_cycles |
|-------|:---:|:---:|:---:|
| **Initial Payment** | INSERT | INSERT | INSERT #1 |
| **Autopay #2 Success** | INSERT (recurring) | UPDATE billing_cycle_count=2, total_paid += | INSERT #2 |
| **Autopay #3 Success** | INSERT (recurring) | UPDATE billing_cycle_count=3, total_paid += | INSERT #3 |
| **Autopay Failed** | - | UPDATE status='paused' | - |
| **User Cancels** | SET subscription_id=NULL | DELETE | DELETE CASCADE |

---

## ✅ VERIFICATION CHECKLIST

### Tables Connected Properly:
- ✅ payment_transactions links to user_subscriptions via subscription_id
- ✅ billing_cycles links to user_subscriptions via subscription_id
- ✅ billing_cycles links to payment_transactions via payment_transaction_id
- ✅ Foreign keys have CASCADE/SET NULL constraints

### Webhook Security:
- ✅ Signature verified with RAZORPAY_WEBHOOK_SECRET
- ✅ API calls to Razorpay use API credentials
- ✅ Subscription IDs resolved to actual users
- ✅ No fake webhooks can trigger updates

### Autopay Success Flow:
- ✅ Webhook received with subscription.charged event
- ✅ Fetch true amount from Razorpay API
- ✅ Increment billing_cycle_count
- ✅ Update total_paid
- ✅ Create new billing_cycles record with cycle_number += 1
- ✅ Create new payment_transactions record with payment_type='recurring'
- ✅ Update next_billing_date

### Autopay Failure Flow:
- ✅ Webhook received with subscription.paused event
- ✅ Update user_subscriptions.status = 'paused'
- ✅ Dashboard shows "Subscription Paused"
- ✅ User can re-authorize to resume

### Data Consistency:
- ✅ Cascade delete prevents orphaned records
- ✅ Payment audit trail preserved
- ✅ All amounts reconciled (total_paid = sum of all billing_cycles)
- ✅ Cycle numbers sequential (1, 2, 3...)

---

## 🎯 SECURITY IN ONE LINE

**Razorpay webhooks are HMAC-SHA256 signed with server secret key and verified before processing; subscription amounts fetched from Razorpay API with credentials, not trusted from webhook; all IDs resolved to verify ownership before updating database; foreign keys prevent orphaned records.**

