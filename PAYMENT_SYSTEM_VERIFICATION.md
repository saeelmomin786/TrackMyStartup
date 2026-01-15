# Payment System Verification & Fixes

## ✅ Fixed Issues

### 1. **plan_tier NOT NULL Error in payment_transactions**
**Problem:** The `payment_transactions` table requires `plan_tier` to be NOT NULL, but the code was inserting `null`.

**Fix Applied:**
- Modified `server.js` `/api/razorpay/verify` endpoint to:
  - Look up `plan_tier` from `subscription_plans` table using `plan_id`
  - Default to `'free'` if plan lookup fails
  - Set `plan_tier` before inserting payment transaction

**Location:** `server.js` lines 645-661

### 2. **Subscription Plans SQL Script Error**
**Problem:** `ON CONFLICT` clause was failing because unique constraint didn't exist.

**Fix Applied:**
- Modified `database/23_ensure_basic_premium_plans_exist.sql` to:
  - Create unique constraint if it doesn't exist (with error handling)
  - Use `DO $$` blocks to check if plan exists, then INSERT or UPDATE accordingly
  - Removed dependency on `ON CONFLICT` clause

## ✅ Verification Checklist

### Database Setup
- [ ] Run `database/23_ensure_basic_premium_plans_exist.sql` to ensure Basic and Premium plans exist
- [ ] Run `database/24_verify_payment_system.sql` to verify all systems are working
- [ ] Check that `subscription_plans` table has plans with `plan_tier` set ('basic', 'premium')

### Payment Flow
- [ ] Test payment flow: Select plan → Payment page → Razorpay checkout → Payment success
- [ ] Verify `payment_transactions` record is created with:
  - ✅ `plan_tier` is set (not null)
  - ✅ `user_id` is set
  - ✅ `status` = 'success'
  - ✅ `payment_type` = 'initial'
  - ✅ `is_autopay` = true (for subscription payments)
  - ✅ `autopay_mandate_id` = subscription_id

### Subscription Creation
- [ ] Verify `user_subscriptions` record is created with:
  - ✅ `user_id` is set
  - ✅ `plan_id` is set (valid UUID)
  - ✅ `status` = 'active'
  - ✅ `razorpay_subscription_id` is set
  - ✅ `payment_gateway` = 'razorpay'
  - ✅ `autopay_enabled` = true
  - ✅ `mandate_status` = 'active'
  - ✅ `current_period_start` and `current_period_end` are set correctly

### Autopay Setup
- [ ] Verify autopay is enabled during initial payment
- [ ] Check that `razorpay_mandate_id` is fetched and stored (via webhook)
- [ ] Verify webhook `subscription.activated` event updates mandate details

### Feature Access
- [ ] Test that features are unlocked based on plan tier:
  - Basic plan: portfolio_fundraising, grants, investor matching, CRM
  - Premium plan: All Basic features + active fundraising campaigns
- [ ] Verify storage limits are set correctly:
  - Basic: 1 GB (1024 MB)
  - Premium: 10 GB (10240 MB)

## 🔍 How to Verify

### 1. Run Verification Script
```sql
-- In Supabase SQL Editor
-- Run: database/24_verify_payment_system.sql
```

This will check:
- ✅ Subscription plans exist with plan_tier
- ✅ User subscriptions are properly configured
- ✅ Payment transactions have plan_tier set
- ✅ Table constraints are in place
- ✅ Recent payments are stored correctly
- ✅ Functions exist for feature access

### 2. Check Recent Payment
After making a test payment, run:
```sql
SELECT 
    pt.*,
    us.razorpay_subscription_id,
    us.autopay_enabled,
    us.mandate_status,
    sp.name as plan_name,
    sp.plan_tier
FROM payment_transactions pt
LEFT JOIN user_subscriptions us ON pt.subscription_id = us.id
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
ORDER BY pt.created_at DESC
LIMIT 1;
```

Expected results:
- `pt.plan_tier` should NOT be null
- `pt.is_autopay` should be true
- `us.autopay_enabled` should be true
- `us.mandate_status` should be 'active'

### 3. Check Subscription Details
```sql
SELECT 
    us.*,
    sp.name as plan_name,
    sp.plan_tier,
    sp.storage_limit_mb,
    sp.features
FROM user_subscriptions us
LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
ORDER BY us.created_at DESC
LIMIT 1;
```

## 🐛 Known Issues & Notes

### Webhook Handler
The `handleSubscriptionCharged` webhook handler currently inserts into `payments` table (old table). This should be updated to use `payment_transactions` table for consistency. However, this doesn't affect the initial payment flow.

### Mandate ID
The `razorpay_mandate_id` is fetched from Razorpay API in the `handleSubscriptionActivated` webhook handler. This happens after the initial payment, so it may not be available immediately.

## 📝 Next Steps

1. **Test the payment flow** end-to-end
2. **Run the verification script** to check system health
3. **Monitor logs** for any errors during payment processing
4. **Verify autopay** is working for recurring payments (after first billing cycle)

## 🔗 Related Files

- `server.js` - Payment verification endpoint (fixed)
- `database/23_ensure_basic_premium_plans_exist.sql` - Plan setup script (fixed)
- `database/24_verify_payment_system.sql` - Verification script (new)
- `lib/paymentService.ts` - Payment service (already correct)
- `components/PaymentPage.tsx` - Payment UI (already correct)
