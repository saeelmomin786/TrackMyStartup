# 🐛 ADVISOR CREDIT SYSTEM ISSUES & FIXES

**Date:** January 18, 2026  
**Reported Issues:**
1. ✅ Subscription created successfully (5 credits/month)
2. ❌ Total purchased in Account tab NOT increasing
3. ❌ Toggle ON for startup fails with "failed to create" error

---

## 🔍 ROOT CAUSE ANALYSIS

### **Issue 1: Initial Credits Not Added**

**Problem:**  
When advisor creates a subscription, `billing_cycle_count: 0` is set, which means this is the FIRST subscription period. However, **NO initial credits are added** at this point!

**Current Flow:**
```
Advisor creates subscription →
  ↓
billing_cycle_count = 0 ←  NO credits added yet!
  ↓
Waits for first webhook (subscription.charged) →
  ↓
Webhook adds credits (billing_cycle_count = 1)
```

**Location:** `lib/advisorCreditService.ts` line ~1070
```typescript
.insert({
  // ...
  billing_cycle_count: 0,  // ← First period, no credits yet
  total_paid: 0  // ← No payment recorded yet
})
```

**Why This Happens:**  
The system is designed to add credits ONLY when webhooks fire for subscription payments. But the FIRST payment happens immediately when subscription is created - the webhook might be delayed or not processed yet.

---

### **Issue 2: Toggle "Failed to Create" Error**

**Problem:**  
When advisor toggles ON a startup, the system tries to:
1. Check if advisor has credits (FAILS because no credits added yet!)
2. Deduct 1 credit
3. Create subscription for startup

**Location:** `lib/advisorCreditService.ts` line ~416
```typescript
// Check if advisor has available credits
const credits = await this.getAdvisorCredits(advisorUserId);
if (!credits || credits.credits_available < 1) {
  return {
    success: false,
    error: 'No credits available. Please purchase credits first.'  // ← THIS ERROR!
  };
}
```

**Root Cause Chain:**
```
1. Subscription created → billing_cycle_count = 0
2. No credits added → credits_available = 0
3. Advisor tries to toggle startup → Check fails: credits_available < 1
4. Error: "No credits available"
```

---

### **Issue 3: Account Tab Total Purchased Not Updating**

**Problem:**  
`total_paid` in `advisor_credit_subscriptions` table stays at 0 until first webhook processes.

**Current Value:**
```sql
SELECT total_paid, billing_cycle_count 
FROM advisor_credit_subscriptions 
WHERE advisor_user_id = 'your-id';

-- Result:
-- total_paid = 0  ← Not updated yet!
-- billing_cycle_count = 0  ← First period
```

**Why:**  
The `total_paid` is only updated in `processSubscriptionPayment()` which is called by webhooks.

---

## ✅ SOLUTION: ADD INITIAL CREDITS ON SUBSCRIPTION CREATION

### **Fix 1: Add Credits Immediately After Subscription Creation**

**File:** `lib/advisorCreditService.ts`  
**Function:** `createSubscription()`  
**Line:** After line ~1140 (after subscription is created successfully)

**Add this code:**
```typescript
// After subscription is created successfully
if (subscription && subscription.id) {
  console.log('✅ Subscription created, now adding initial credits...');
  
  // Add initial credits for the first billing cycle
  // This makes credits available immediately without waiting for webhook
  const creditsAdded = await this.addCredits(
    advisorUserId,
    plan.credits_per_month,
    plan.price_per_month,
    plan.currency,
    razorpaySubscriptionId ? 'razorpay' : 'payaid',
    razorpaySubscriptionId || paypalSubscriptionId || 'initial_subscription'
  );
  
  if (!creditsAdded) {
    console.warn('⚠️ Failed to add initial credits. Webhooks will add them later.');
  } else {
    console.log('✅ Initial credits added successfully!');
    
    // Update subscription to mark that initial credits were added
    await supabase
      .from('advisor_credit_subscriptions')
      .update({
        billing_cycle_count: 1,  // Mark as first cycle completed
        total_paid: plan.price_per_month  // Record initial payment
      })
      .eq('id', subscription.id);
  }
}
```

---

### **Fix 2: Update Total Purchased Display**

**File:** Component that shows Account tab  
**Issue:** Might be reading from wrong field or not refreshing

Check if the Account tab is reading:
- `total_paid` from `advisor_credit_subscriptions`
- OR `SUM(amount_paid)` from `credit_purchase_history`

**Correct Query:**
```typescript
// Get total purchased
const { data: subscriptions } = await supabase
  .from('advisor_credit_subscriptions')
  .select('total_paid')
  .eq('advisor_user_id', advisorUserId)
  .eq('status', 'active');

const totalPurchased = subscriptions?.reduce((sum, sub) => sum + (sub.total_paid || 0), 0) || 0;
```

OR from purchase history:
```typescript
const { data: history } = await supabase
  .from('credit_purchase_history')
  .select('amount_paid')
  .eq('advisor_user_id', advisorUserId)
  .eq('status', 'completed');

const totalPurchased = history?.reduce((sum, h) => sum + (h.amount_paid || 0), 0) || 0;
```

---

## 🔧 IMPLEMENTATION STEPS

### **Step 1: Fix createSubscription to Add Initial Credits**

Location: `lib/advisorCreditService.ts` line ~1140

```typescript
// BEFORE (current code):
return {
  success: true,
  subscriptionId: subscription.id
};

// AFTER (with fix):
// Add initial credits immediately
console.log('✅ Subscription created, adding initial credits...');
const creditsAdded = await this.addCredits(
  advisorUserId,
  plan.credits_per_month,
  plan.price_per_month,
  plan.currency,
  razorpaySubscriptionId ? 'razorpay' : 'payaid',
  razorpaySubscriptionId || paypalSubscriptionId || `sub_${subscription.id}`
);

if (creditsAdded) {
  // Update billing cycle count and total paid
  await supabase
    .from('advisor_credit_subscriptions')
    .update({
      billing_cycle_count: 1,
      total_paid: plan.price_per_month,
      last_billing_date: new Date().toISOString()
    })
    .eq('id', subscription.id);
  
  console.log('✅ Initial credits added and subscription updated');
}

return {
  success: true,
  subscriptionId: subscription.id
};
```

---

### **Step 2: Verify Account Tab Uses Correct Field**

Find the component showing total purchased and ensure it reads `total_paid` or sums up `credit_purchase_history`.

---

### **Step 3: Handle Race Condition**

If webhook arrives BEFORE frontend finishes:
- Webhook might try to add credits (billing_cycle = 1)
- Frontend also tries to add credits
- Result: Credits added TWICE!

**Solution:** Add idempotency check in `processSubscriptionPayment()`:

```typescript
// Before adding credits, check billing_cycle_count
if (subscription.billing_cycle_count === 0) {
  // This is first payment - might have been added by frontend already
  // Check if credits were already added
  const { data: existingHistory } = await supabase
    .from('credit_purchase_history')
    .select('id')
    .eq('advisor_user_id', subscription.advisor_user_id)
    .eq('payment_transaction_id', transactionId)
    .maybeSingle();
  
  if (existingHistory) {
    console.log('⚠️ Credits already added for this transaction, skipping');
    return true;
  }
}
```

---

## 📋 TESTING CHECKLIST

After applying fixes:

- [ ] Create new advisor subscription
- [ ] Check if credits are available immediately (should be > 0)
- [ ] Check total_paid in advisor_credit_subscriptions (should be > 0)
- [ ] Check credit_purchase_history has record
- [ ] Try toggling startup ON (should work now)
- [ ] Check Account tab shows correct total purchased
- [ ] Wait for webhook to fire
- [ ] Verify credits are NOT doubled (idempotency works)

---

## 🎯 SUMMARY

**Root Cause:** Initial credits not added when subscription created - only added on webhook

**Fixes Needed:**
1. ✅ Add initial credits immediately in `createSubscription()`
2. ✅ Update `billing_cycle_count` and `total_paid` immediately
3. ✅ Add idempotency check in webhook handler
4. ✅ Verify Account tab reads correct field

**Impact:** After fix, advisors can use credits immediately without waiting for webhook! 🎉
