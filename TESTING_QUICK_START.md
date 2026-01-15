# Testing Quick Start Guide

## Prerequisites Checklist

Before starting tests, ensure:

- [ ] All database migrations are run (especially `28_update_get_user_plan_tier_for_upgrades.sql`)
- [ ] Basic and Premium plans exist in `subscription_plans` table
- [ ] Razorpay keys are configured in environment variables
- [ ] Webhook endpoint is configured in Razorpay dashboard
- [ ] Test user account is ready

## Quick Test Sequence

### 1. Initial Setup Verification
```sql
-- Run in Supabase SQL Editor
-- Check if plans exist
SELECT plan_tier, name, price, interval 
FROM subscription_plans 
WHERE user_type = 'Startup' AND is_active = true;
```

**Expected:** Should see Basic and Premium plans

---

### 2. Test Initial Payment (Basic Plan)

**Step 1: Create Subscription**
```bash
POST /api/razorpay/create-subscription
{
  "user_id": "your-user-id",
  "final_amount": 499,
  "interval": "monthly",
  "plan_name": "Basic Plan"
}
```

**Step 2: Complete Payment in Razorpay**
- Use Razorpay test cards
- Complete payment flow

**Step 3: Verify Payment**
```bash
POST /api/razorpay/verify
{
  "razorpay_payment_id": "pay_xxx",
  "razorpay_order_id": "order_xxx",
  "razorpay_signature": "signature_xxx",
  "razorpay_subscription_id": "sub_xxx",
  "user_id": "your-user-id",
  "plan_id": "basic-plan-id"
}
```

**Step 4: Verify Database**
```sql
-- Replace YOUR_USER_ID
SELECT 
  us.id,
  sp.plan_tier,
  us.status,
  us.autopay_enabled,
  us.billing_cycle_count,
  us.total_paid
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.user_id = 'YOUR_USER_ID'::UUID
ORDER BY us.created_at DESC
LIMIT 1;
```

**Expected:**
- `status` = `'active'`
- `billing_cycle_count` = `1`
- `autopay_enabled` = `true`

---

### 3. Test Upgrade (Basic → Premium)

**Step 1: Upgrade**
```bash
POST /api/subscriptions/upgrade
{
  "user_id": "your-user-id",
  "new_plan_tier": "premium"
}
```

**Step 2: Verify Database**
```sql
-- Check both subscriptions
SELECT 
  us.id,
  sp.plan_tier,
  us.status,
  us.autopay_enabled,
  us.current_period_end
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.user_id = 'YOUR_USER_ID'::UUID
ORDER BY us.created_at DESC;

-- Check plan tier function
SELECT get_user_plan_tier('YOUR_USER_ID'::UUID);
```

**Expected:**
- Two subscriptions (Basic and Premium)
- Basic: `autopay_enabled` = `false`
- Premium: `autopay_enabled` = `true`
- `get_user_plan_tier()` returns `'premium'`

---

### 4. Test Downgrade (Premium → Basic)

**Step 1: Downgrade**
```bash
POST /api/subscriptions/downgrade
{
  "user_id": "your-user-id",
  "new_plan_tier": "basic"
}
```

**Step 2: Verify Database**
```sql
-- Check all subscriptions
SELECT 
  us.id,
  sp.plan_tier,
  us.status,
  us.autopay_enabled
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.user_id = 'YOUR_USER_ID'::UUID
ORDER BY us.created_at DESC;

-- Should still return premium (highest tier)
SELECT get_user_plan_tier('YOUR_USER_ID'::UUID);
```

**Expected:**
- Three subscriptions (old Basic, Premium, new Basic)
- Premium: `autopay_enabled` = `false`
- New Basic: `autopay_enabled` = `true`
- `get_user_plan_tier()` still returns `'premium'` (until Premium expires)

---

### 5. Test Stop Autopay

```bash
POST /api/razorpay/stop-autopay
{
  "subscription_id": "subscription-id",
  "user_id": "your-user-id"
}
```

**Verify:**
```sql
SELECT 
  id,
  status,
  autopay_enabled,
  mandate_status
FROM user_subscriptions
WHERE id = 'subscription-id';
```

**Expected:**
- `autopay_enabled` = `false`
- `status` = `'active'` (still active until cycle ends)

---

## Complete Verification

Run the comprehensive test query:

```sql
-- Use database/29_complete_payment_flow_test.sql
-- Replace YOUR_USER_ID with your test user ID
```

---

## Common Issues & Solutions

### Issue: "plan_tier is null" error
**Solution:** Ensure plan_id is correctly passed and plan exists

### Issue: get_user_plan_tier returns wrong tier
**Solution:** Run `database/28_update_get_user_plan_tier_for_upgrades.sql`

### Issue: Billing cycle not created
**Solution:** Check payment transaction was created first

### Issue: Webhook not updating
**Solution:** Verify webhook URL in Razorpay dashboard

---

## Test Data Cleanup

After testing, you may want to clean up:

```sql
-- WARNING: Only use in test environment!
DELETE FROM billing_cycles 
WHERE subscription_id IN (
  SELECT id FROM user_subscriptions WHERE user_id = 'YOUR_USER_ID'::UUID
);

DELETE FROM payment_transactions 
WHERE user_id = 'YOUR_USER_ID'::UUID;

DELETE FROM subscription_changes 
WHERE user_id = 'YOUR_USER_ID'::UUID;

DELETE FROM user_subscriptions 
WHERE user_id = 'YOUR_USER_ID'::UUID;
```

---

## Next Steps

1. Follow the test sequence above
2. Use `COMPLETE_PAYMENT_FLOW_TEST.md` for detailed verification
3. Use `database/29_complete_payment_flow_test.sql` for comprehensive checks
4. Review `UPGRADE_IMPLEMENTATION.md` for flow details
