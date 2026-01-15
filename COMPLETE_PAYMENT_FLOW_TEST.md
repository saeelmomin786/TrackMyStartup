# Complete Payment Flow Testing Guide

## Overview
This guide covers testing the entire payment system from initial payment to upgrades/downgrades.

## Prerequisites

1. **Database Setup:**
   - Run all migration scripts in order
   - Ensure Basic and Premium plans exist
   - Run `database/28_update_get_user_plan_tier_for_upgrades.sql`

2. **Environment:**
   - Razorpay keys configured
   - Webhook endpoint configured in Razorpay dashboard
   - Test user account ready

3. **Tools:**
   - Postman/Thunder Client for API testing
   - Supabase SQL Editor for database verification
   - Razorpay Dashboard for payment verification

---

## Test Flow 1: Initial Payment (Basic Plan)

### Step 1: Create Subscription
**Endpoint:** `POST /api/razorpay/create-subscription`

**Request:**
```json
{
  "user_id": "your-test-user-id",
  "final_amount": 499,
  "interval": "monthly",
  "plan_name": "Basic Plan"
}
```

**Expected Response:**
- Razorpay subscription object with `id`
- Status: `created` or `authenticated`

**Verify:**
- [ ] Subscription created in Razorpay
- [ ] Subscription ID returned

### Step 2: Verify Payment
**Endpoint:** `POST /api/razorpay/verify`

**Request:**
```json
{
  "razorpay_payment_id": "pay_xxx",
  "razorpay_order_id": "order_xxx",
  "razorpay_signature": "signature_xxx",
  "razorpay_subscription_id": "sub_xxx",
  "user_id": "your-test-user-id",
  "plan_id": "basic-plan-id"
}
```

**Expected Response:**
- Success message
- Subscription created in database

**Database Verification:**
```sql
-- Check subscription created
SELECT 
  id,
  user_id,
  status,
  plan_id,
  current_period_start,
  current_period_end,
  autopay_enabled,
  mandate_status,
  billing_cycle_count,
  total_paid
FROM user_subscriptions
WHERE user_id = 'your-test-user-id'
ORDER BY created_at DESC
LIMIT 1;

-- Check payment transaction
SELECT 
  id,
  user_id,
  subscription_id,
  amount,
  status,
  payment_type,
  plan_tier
FROM payment_transactions
WHERE user_id = 'your-test-user-id'
ORDER BY created_at DESC
LIMIT 1;

-- Check billing cycle
SELECT 
  id,
  subscription_id,
  cycle_number,
  period_start,
  period_end,
  amount,
  status,
  plan_tier
FROM billing_cycles
WHERE subscription_id = (
  SELECT id FROM user_subscriptions 
  WHERE user_id = 'your-test-user-id' 
  ORDER BY created_at DESC LIMIT 1
);
```

**Verify:**
- [ ] Subscription status = `'active'`
- [ ] `billing_cycle_count` = 1
- [ ] `total_paid` = initial amount
- [ ] Payment transaction status = `'completed'`
- [ ] Payment transaction `plan_tier` = `'basic'`
- [ ] Payment transaction `payment_type` = `'initial'`
- [ ] Billing cycle created with cycle_number = 1
- [ ] `autopay_enabled` = `true`
- [ ] `mandate_status` = `'active'` (after webhook)

### Step 3: Verify Webhook (Subscription Activated)
**Simulate:** `subscription.activated` webhook event

**Expected:**
- Mandate status updated to `'active'`
- Subscription status remains `'active'`

**Database Verification:**
```sql
SELECT 
  id,
  status,
  autopay_enabled,
  mandate_status,
  razorpay_mandate_id
FROM user_subscriptions
WHERE user_id = 'your-test-user-id'
ORDER BY created_at DESC
LIMIT 1;
```

**Verify:**
- [ ] `mandate_status` = `'active'`
- [ ] `razorpay_mandate_id` is set

---

## Test Flow 2: Recurring Payment (Autopay)

### Step 1: Wait for Next Billing Cycle
**Or simulate:** `subscription.charged` webhook event

**Webhook Payload:**
```json
{
  "event": "subscription.charged",
  "payload": {
    "subscription": {
      "id": "sub_xxx",
      "status": "active",
      "current_start": 1234567890,
      "current_end": 1234567890
    },
    "payment": {
      "id": "pay_xxx",
      "amount": 49900,
      "currency": "INR",
      "status": "captured"
    }
  }
}
```

**Expected:**
- New billing cycle created
- Payment transaction created
- Subscription billing_cycle_count incremented
- total_paid updated

**Database Verification:**
```sql
-- Check subscription updated
SELECT 
  id,
  billing_cycle_count,
  total_paid,
  last_billing_date,
  next_billing_date
FROM user_subscriptions
WHERE user_id = 'your-test-user-id'
ORDER BY created_at DESC
LIMIT 1;

-- Check new payment transaction
SELECT 
  id,
  amount,
  status,
  payment_type,
  plan_tier
FROM payment_transactions
WHERE user_id = 'your-test-user-id'
AND payment_type = 'recurring'
ORDER BY created_at DESC
LIMIT 1;

-- Check new billing cycle
SELECT 
  id,
  cycle_number,
  period_start,
  period_end,
  amount,
  status
FROM billing_cycles
WHERE subscription_id = (
  SELECT id FROM user_subscriptions 
  WHERE user_id = 'your-test-user-id' 
  ORDER BY created_at DESC LIMIT 1
)
ORDER BY cycle_number DESC
LIMIT 1;
```

**Verify:**
- [ ] `billing_cycle_count` = 2
- [ ] `total_paid` = initial + recurring amount
- [ ] New payment transaction with `payment_type` = `'recurring'`
- [ ] New billing cycle with `cycle_number` = 2
- [ ] Payment transaction status = `'completed'`

---

## Test Flow 3: Plan Upgrade (Basic → Premium)

### Step 1: Upgrade Subscription
**Endpoint:** `POST /api/subscriptions/upgrade`

**Request:**
```json
{
  "user_id": "your-test-user-id",
  "new_plan_tier": "premium"
}
```

**Expected Response:**
- Success message
- New Premium subscription created
- Old Basic subscription autopay disabled

**Database Verification:**
```sql
-- Check both subscriptions
SELECT 
  id,
  plan_id,
  status,
  autopay_enabled,
  mandate_status,
  current_period_start,
  current_period_end,
  previous_plan_tier,
  previous_subscription_id
FROM user_subscriptions
WHERE user_id = 'your-test-user-id'
ORDER BY created_at DESC;

-- Check plan tiers
SELECT 
  us.id,
  us.status,
  us.autopay_enabled,
  sp.plan_tier,
  us.current_period_end
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.user_id = 'your-test-user-id'
ORDER BY us.created_at DESC;

-- Check upgrade payment transaction
SELECT 
  id,
  amount,
  status,
  payment_type,
  plan_tier,
  plan_tier_before,
  plan_tier_after
FROM payment_transactions
WHERE user_id = 'your-test-user-id'
AND payment_type = 'upgrade'
ORDER BY created_at DESC
LIMIT 1;

-- Check subscription change
SELECT 
  id,
  change_type,
  plan_tier_before,
  plan_tier_after,
  amount_before_inr,
  amount_after_inr,
  reason
FROM subscription_changes
WHERE user_id = 'your-test-user-id'
ORDER BY created_at DESC
LIMIT 1;
```

**Verify:**
- [ ] Two subscriptions exist (Basic and Premium)
- [ ] Basic subscription: `status` = `'active'`, `autopay_enabled` = `false`
- [ ] Premium subscription: `status` = `'active'`, `autopay_enabled` = `true`
- [ ] Premium subscription has `previous_plan_tier` = `'basic'`
- [ ] Upgrade payment transaction created
- [ ] Subscription change recorded with `change_type` = `'upgrade'`

### Step 2: Verify Feature Access
**Test:** `get_user_plan_tier()` function

**Database Verification:**
```sql
-- Test plan tier function
SELECT get_user_plan_tier('your-test-user-id'::UUID) as current_plan_tier;
```

**Verify:**
- [ ] Returns `'premium'` (highest tier)

### Step 3: Verify Premium Access
**Test:** Feature access functions

**Database Verification:**
```sql
-- Test feature access
SELECT can_user_access_feature('your-test-user-id'::UUID, 'premium_feature_name') as has_access;
```

**Verify:**
- [ ] Returns `true` for Premium features

---

## Test Flow 4: Plan Downgrade (Premium → Basic)

### Step 1: Downgrade Subscription
**Endpoint:** `POST /api/subscriptions/downgrade`

**Request:**
```json
{
  "user_id": "your-test-user-id",
  "new_plan_tier": "basic"
}
```

**Expected Response:**
- Success message
- New Basic subscription created
- Old Premium subscription autopay disabled

**Database Verification:**
```sql
-- Check all subscriptions
SELECT 
  us.id,
  us.status,
  us.autopay_enabled,
  sp.plan_tier,
  us.current_period_end
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.user_id = 'your-test-user-id'
ORDER BY us.created_at DESC;

-- Check downgrade payment transaction
SELECT 
  id,
  amount,
  status,
  payment_type,
  plan_tier,
  plan_tier_before,
  plan_tier_after
FROM payment_transactions
WHERE user_id = 'your-test-user-id'
AND payment_type = 'downgrade'
ORDER BY created_at DESC
LIMIT 1;

-- Check subscription change
SELECT 
  id,
  change_type,
  plan_tier_before,
  plan_tier_after,
  reason
FROM subscription_changes
WHERE user_id = 'your-test-user-id'
AND change_type = 'downgrade'
ORDER BY created_at DESC
LIMIT 1;
```

**Verify:**
- [ ] Three subscriptions exist (old Basic, Premium, new Basic)
- [ ] Premium subscription: `status` = `'active'`, `autopay_enabled` = `false`
- [ ] New Basic subscription: `status` = `'active'`, `autopay_enabled` = `true`
- [ ] Downgrade payment transaction created
- [ ] Subscription change recorded

### Step 2: Verify Feature Access (During Transition)
**Database Verification:**
```sql
-- Should still return premium (highest tier)
SELECT get_user_plan_tier('your-test-user-id'::UUID) as current_plan_tier;
```

**Verify:**
- [ ] Returns `'premium'` (Premium still active until cycle ends)

### Step 3: Simulate Premium Expiration
**Database Update:**
```sql
-- Manually expire Premium subscription
UPDATE user_subscriptions
SET 
  status = 'expired',
  current_period_end = NOW() - INTERVAL '1 day'
WHERE user_id = 'your-test-user-id'
AND id = (
  SELECT id FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = 'your-test-user-id'
  AND sp.plan_tier = 'premium'
  ORDER BY us.created_at DESC
  LIMIT 1
);
```

**Verify Feature Access:**
```sql
-- Should now return basic
SELECT get_user_plan_tier('your-test-user-id'::UUID) as current_plan_tier;
```

**Verify:**
- [ ] Returns `'basic'` (Premium expired, Basic is now active)

---

## Test Flow 5: Stop Autopay

### Step 1: Stop Autopay
**Endpoint:** `POST /api/razorpay/stop-autopay`

**Request:**
```json
{
  "subscription_id": "subscription-id",
  "user_id": "your-test-user-id"
}
```

**Expected Response:**
- Success message
- Autopay disabled

**Database Verification:**
```sql
SELECT 
  id,
  status,
  autopay_enabled,
  mandate_status
FROM user_subscriptions
WHERE id = 'subscription-id';
```

**Verify:**
- [ ] `autopay_enabled` = `false`
- [ ] `mandate_status` = `'cancelled'`
- [ ] `status` = `'active'` (still active until cycle ends)

---

## Test Flow 6: Payment Failure Handling

### Step 1: Simulate Payment Failure
**Webhook:** `subscription.charged` with failed status

**Expected:**
- Subscription status = `'past_due'`
- Grace period set
- Payment transaction status = `'failed'`

**Database Verification:**
```sql
SELECT 
  id,
  status,
  grace_period_ends_at
FROM user_subscriptions
WHERE user_id = 'your-test-user-id'
ORDER BY created_at DESC
LIMIT 1;
```

**Verify:**
- [ ] `status` = `'past_due'`
- [ ] `grace_period_ends_at` is set

---

## Comprehensive Verification Query

Run this query to verify all payment data:

```sql
-- Complete payment flow verification
SELECT 
  'Subscriptions' as check_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'active') as active_count,
  COUNT(*) FILTER (WHERE autopay_enabled = true) as autopay_enabled_count
FROM user_subscriptions
WHERE user_id = 'your-test-user-id'

UNION ALL

SELECT 
  'Payment Transactions' as check_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE payment_type = 'initial') as initial_count
FROM payment_transactions
WHERE user_id = 'your-test-user-id'

UNION ALL

SELECT 
  'Billing Cycles' as check_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  MAX(cycle_number) as max_cycle_number
FROM billing_cycles
WHERE subscription_id IN (
  SELECT id FROM user_subscriptions WHERE user_id = 'your-test-user-id'
)

UNION ALL

SELECT 
  'Subscription Changes' as check_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE change_type = 'upgrade') as upgrade_count,
  COUNT(*) FILTER (WHERE change_type = 'downgrade') as downgrade_count
FROM subscription_changes
WHERE user_id = 'your-test-user-id';
```

---

## Test Checklist Summary

### Initial Payment
- [ ] Subscription created in Razorpay
- [ ] Subscription created in database
- [ ] Payment transaction recorded
- [ ] Billing cycle created
- [ ] Autopay enabled
- [ ] Mandate active

### Recurring Payment
- [ ] New billing cycle created
- [ ] Payment transaction recorded
- [ ] Billing cycle count incremented
- [ ] Total paid updated

### Upgrade
- [ ] Old subscription autopay disabled
- [ ] New subscription created
- [ ] Upgrade payment recorded
- [ ] Subscription change recorded
- [ ] Premium access granted

### Downgrade
- [ ] Old subscription autopay disabled
- [ ] New subscription created
- [ ] Downgrade payment recorded
- [ ] Subscription change recorded
- [ ] Feature access correct (highest tier)

### Autopay Cancellation
- [ ] Autopay disabled
- [ ] Mandate cancelled
- [ ] Subscription remains active

### Payment Failure
- [ ] Status updated to past_due
- [ ] Grace period set
- [ ] Payment failure recorded

---

## Troubleshooting

### Issue: Payment transaction missing plan_tier
**Solution:** Check that plan_id is correctly passed and plan exists in subscription_plans table

### Issue: Billing cycle not created
**Solution:** Verify payment transaction was created successfully first

### Issue: get_user_plan_tier returns wrong tier
**Solution:** Run `database/28_update_get_user_plan_tier_for_upgrades.sql` to update function

### Issue: Autopay not working
**Solution:** Check mandate_status is 'active' and razorpay_mandate_id is set

### Issue: Webhook not updating status
**Solution:** Verify webhook endpoint is configured correctly in Razorpay dashboard
