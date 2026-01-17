# ✅ Webhook Flow Verification - Razorpay & PayPal

## How Each Gateway Sends User ID Information

### **RAZORPAY Webhook Flow**

**1. Subscription Creation (Frontend sends auth_user_id):**
```javascript
// server.js line 472-478
notes: { 
  user_id,  // ← This is auth.uid() from Supabase Auth
  trial_startup: "true",
  plan_type
}
```

**2. When Razorpay sends webhook events:**
- Event: `subscription.charged`, `subscription.paused`, `mandate.revoked`, etc.
- Payload contains: `subscription.notes.user_id` (the **auth_user_id**)

**3. Server extracts and processes:**
```javascript
// server.js line 5309
const userIdFromNotes = subDetails?.notes?.user_id || subscription?.notes?.user_id || null;

// Then resolves using helper function:
const resolved = await resolveUserSubscriptionRecord({
  razorpaySubscriptionId: subscription.id,
  userId: userIdFromNotes  // ← This is auth_user_id
});
```

**4. Key insertion points:**
- ✅ `payment_transactions.user_id` = **auth_user_id** (from Razorpay notes)
- ✅ `user_subscriptions.user_id` = **profile_id** (converted using helper function)
- ✅ `subscription_changes.user_id` = **profile_id** (NOW FIXED ✅)

---

### **PAYPAL Webhook Flow**

**1. Subscription Creation (Frontend sends auth_user_id):**
```javascript
// server.js (initial payment verification)
// PayPal stores subscription ID in user_subscriptions
// User ID is stored as profile_id (same as Razorpay)
```

**2. When PayPal sends webhook events:**
- Event: `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`, `BILLING.SUBSCRIPTION.SUSPENDED`, etc.
- Payload contains: `subscription.id` (PayPal subscription ID)
- **Note:** PayPal does NOT send user_id in webhook notes (unlike Razorpay)

**3. Server extracts and processes:**
```javascript
// server.js line 2722-2734
if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
  const subscription = event.resource;
  await handlePayPalSubscriptionActivated(subscription, event);
}

// Handler looks up subscription by PayPal subscription ID:
// server.js line 2925
.eq('paypal_subscription_id', subscription.id)
```

**4. Key insertion points:**
- ✅ `user_subscriptions.paypal_subscription_id` = subscription ID (links to user)
- ✅ Updates to `user_subscriptions` use query: `.eq('paypal_subscription_id', subscription.id)`
- ✅ No need to insert `subscription_changes` in PayPal handlers (they just update status)

---

## Comparison: Razorpay vs PayPal

| Aspect | Razorpay | PayPal |
|--------|----------|--------|
| **Sends user_id in webhook** | ✅ YES (in notes) | ❌ NO |
| **Requires user_id lookup** | ✅ YES (from notes) | ❌ NO (lookup by subscription ID) |
| **User ID format sent** | auth_user_id | PayPal subscription ID |
| **Database lookup method** | `razorpay_subscription_id` + `notes.user_id` | `paypal_subscription_id` |
| **Supports autopay** | ✅ YES (mandate system) | ✅ YES (billing agreement) |
| **Failed charge handling** | ✅ subscription.paused event | ✅ BILLING.SUBSCRIPTION.SUSPENDED |
| **Subscription cancellation** | ✅ subscription.cancelled event | ✅ BILLING.SUBSCRIPTION.CANCELLED |

---

## Where auth_user_id vs profile_id is Used

### **auth_user_id (Razorpay webhook notes):**
```
Razorpay webhook event
  ↓
subscription.notes.user_id = auth_user_id
  ↓
Used to find matching user_subscriptions row
```

### **profile_id (Application database):**
```
✅ user_subscriptions.user_id = profile_id
✅ billing_cycles.subscription_id → user_subscriptions.id (foreign key)
✅ subscription_changes.user_id = profile_id (NOW FIXED ✅)
✅ payment_transactions.user_id = auth_user_id (webhook origin)
```

---

## Webhook Signature Verification

### **Razorpay:**
```javascript
// server.js line 3270
const payload = req.body.toString();
const signature = req.headers["x-razorpay-signature"];
const expected = crypto.createHmac("sha256", webhookSecret).update(payload).digest("hex");
if (expected !== signature) return res.status(401).json({ error: "Invalid signature" });
```
✅ HMAC-SHA256 verification implemented

### **PayPal:**
```javascript
// server.js line 2636
const webhookId = process.env.PAYPAL_WEBHOOK_ID || process.env.VITE_PAYPAL_WEBHOOK_ID;
// Signature verification commented out, but webhookId available for production
```
⚠️ Signature verification available but not enforced (should add for production)

---

## Summary: ID Conversion Flow is CORRECT ✅

1. **Razorpay sends:** `notes.user_id = auth_user_id`
2. **Server converts:** `auth_user_id → profile_id` using helper function
3. **Database stores:** profile_id in user_subscriptions, subscription_changes
4. **PayPal sends:** `paypal_subscription_id` (no user_id needed)
5. **Database looks up:** user_subscriptions by paypal_subscription_id

**No remaining issues!** All ID conversions are properly implemented. ✅

---

## Tables Status After FK Fix

| Table | user_id Column | Foreign Key | Status |
|-------|---|---|---|
| payment_transactions | auth_user_id | → auth.users(id) | ✅ Correct (webhook source) |
| user_subscriptions | profile_id | → user_profiles(id) | ✅ Correct |
| billing_cycles | subscription_id | → user_subscriptions(id) | ✅ Correct |
| subscription_changes | profile_id | → user_profiles(id) | ✅ FIXED! |

**All foreign keys are now correctly configured!** ✅
