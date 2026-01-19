# 🔧 FIX: Subscription Page Loop After Payment

## 🐛 Problem Description

User **Om Desai** (opljwxjmpmkwlulvtg@nesopf.com) has:
- ✅ Paid for subscription (payment shown as "payment done")
- ✅ Profile is complete (`is_profile_complete: true`)
- ❌ Clicking "Go to Dashboard" redirects back to subscription page

## 🔍 Root Cause

The system checks subscription validity by verifying:
1. Subscription exists with `status = 'active'`
2. **`current_period_end > NOW()`** ← This is likely the issue

Even if payment was successful, if the `current_period_end` date is:
- Set in the past
- Not set correctly during payment verification
- Expired due to time zone issues

The subscription will be considered invalid and user gets redirected back.

## 📍 Where the Check Happens

### 1. **App.tsx (Lines 467-491)**
```typescript
const checkSubscriptionAfterLogin = async () => {
  if (isAuthenticated && currentUser && currentUser.role === 'Startup' && !isLoading) {
    const subscription = await subscriptionService.getUserSubscription(currentUser.id);
    
    if (!subscription) {
      // No subscription found - redirect to subscription page
      console.log('❌ No subscription found → redirecting to subscription page');
      setCurrentPage('subscription');
      return;
    }
  }
};
```

### 2. **subscriptionService.ts (Lines 89-99)**
```typescript
const { data, error } = await supabase
  .from('user_subscriptions')
  .select('*')
  .in('user_id', profileIds)
  .eq('status', 'active')  // ✅ Must be active
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (!data) {
  console.log('❌ No active subscription found for any profile');
  return null;  // ← This causes redirect to subscription page
}
```

### 3. **Database Function: is_subscription_valid()**
```sql
SELECT COUNT(*) INTO v_count
FROM user_subscriptions
WHERE user_id = p_user_id
AND (
    (status = 'active' AND current_period_end > NOW())  -- ⚠️ Period must not be expired
    OR
    (status = 'past_due' AND grace_period_ends_at IS NOT NULL AND grace_period_ends_at > NOW())
);
```

## 🔧 Solution: Check & Fix Subscription

### Step 1: Identify the User's Profile ID

Run this query in Supabase SQL Editor to find the profile_id:

```sql
-- Get profile_id for the user
SELECT 
  id as profile_id,
  auth_user_id,
  email,
  name,
  role,
  startup_name,
  is_profile_complete,
  created_at
FROM user_profiles
WHERE email = 'opljwxjmpmkwlulvtg@nesopf.com';
```

**Expected Output:**
- `profile_id` = UUID (this is what we need)
- `auth_user_id` = UUID (from auth.users table)
- `email` = opljwxjmpmkwlulvtg@nesopf.com
- `is_profile_complete` = true

### Step 2: Check Subscription Status

Using the `profile_id` from Step 1:

```sql
-- Check subscription for this user
SELECT 
  id,
  user_id,
  plan_id,
  plan_tier,
  status,
  current_period_start,
  current_period_end,
  CURRENT_TIMESTAMP as now,
  CURRENT_TIMESTAMP > current_period_end as is_expired,
  autopay_enabled,
  razorpay_subscription_id,
  payment_gateway,
  created_at,
  updated_at
FROM user_subscriptions
WHERE user_id = 'PASTE_PROFILE_ID_HERE'  -- Replace with actual profile_id from Step 1
ORDER BY created_at DESC
LIMIT 5;
```

### Step 3: Check Recent Payment Transaction

```sql
-- Check payment transactions
SELECT 
  pt.id,
  pt.user_id,
  pt.auth_user_id,
  pt.subscription_id,
  pt.plan_tier,
  pt.amount,
  pt.currency,
  pt.status,
  pt.payment_type,
  pt.is_autopay,
  pt.razorpay_payment_id,
  pt.razorpay_subscription_id,
  pt.created_at
FROM payment_transactions pt
WHERE pt.auth_user_id = (
  SELECT auth_user_id FROM user_profiles WHERE email = 'opljwxjmpmkwlulvtg@nesopf.com'
)
ORDER BY pt.created_at DESC
LIMIT 5;
```

## 🎯 Diagnosis & Fixes

### Scenario A: Subscription Exists but Expired

**If you see:**
- `status = 'active'`
- `is_expired = true` (current_period_end is in the past)

**Fix: Extend the subscription period**

```sql
-- Fix: Extend subscription to 30 days from now
UPDATE user_subscriptions
SET 
  current_period_end = CURRENT_TIMESTAMP + INTERVAL '30 days',
  updated_at = CURRENT_TIMESTAMP
WHERE user_id = 'PASTE_PROFILE_ID_HERE'  -- Replace with actual profile_id
AND status = 'active';

-- Verify the fix
SELECT 
  user_id,
  status,
  current_period_end,
  CURRENT_TIMESTAMP > current_period_end as is_expired
FROM user_subscriptions
WHERE user_id = 'PASTE_PROFILE_ID_HERE';
```

### Scenario B: No Subscription Record Found

**If Step 2 returns no rows:**

This means payment was processed but subscription was not created. Check:

```sql
-- Check if payment exists without subscription
SELECT * FROM payment_transactions
WHERE auth_user_id = (
  SELECT auth_user_id FROM user_profiles WHERE email = 'opljwxjmpmkwlulvtg@nesopf.com'
)
AND subscription_id IS NULL
ORDER BY created_at DESC
LIMIT 1;
```

**If payment exists but no subscription:**

```sql
-- Get required data
SELECT 
  pt.id as payment_id,
  pt.auth_user_id,
  up.id as profile_id,
  pt.razorpay_subscription_id,
  pt.amount,
  pt.currency,
  pt.plan_tier
FROM payment_transactions pt
JOIN user_profiles up ON pt.auth_user_id = up.auth_user_id
WHERE up.email = 'opljwxjmpmkwlulvtg@nesopf.com'
ORDER BY pt.created_at DESC
LIMIT 1;
```

**Then create the missing subscription:**

```sql
-- Create subscription manually (use data from above)
INSERT INTO user_subscriptions (
  user_id,  -- Use profile_id from above
  plan_id,  -- Get from subscription_plans table
  plan_tier,  -- Use from payment_transactions
  status,
  current_period_start,
  current_period_end,
  amount,
  currency,
  interval,
  payment_gateway,
  autopay_enabled,
  razorpay_subscription_id,
  billing_cycle_count,
  total_paid,
  last_billing_date,
  next_billing_date
)
VALUES (
  'PASTE_PROFILE_ID_HERE',  -- profile_id from above
  (SELECT id FROM subscription_plans WHERE plan_tier = 'basic' LIMIT 1),  -- Adjust tier
  'basic',  -- or 'premium' based on payment
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '30 days',  -- 30 days for monthly
  800,  -- Amount paid
  'INR',  -- Currency
  'monthly',  -- or 'yearly'
  'razorpay',
  true,  -- autopay_enabled
  'PASTE_RAZORPAY_SUB_ID_HERE',  -- From payment_transactions
  1,  -- First billing cycle
  800,  -- Total paid
  CURRENT_TIMESTAMP,  -- Last billing date
  CURRENT_TIMESTAMP + INTERVAL '30 days'  -- Next billing date
)
RETURNING *;
```

### Scenario C: Wrong User ID in Subscription

**If subscription exists but with wrong `user_id`:**

```sql
-- Check if subscription exists with auth_user_id instead of profile_id
SELECT 
  us.*,
  'auth_user_id mismatch' as issue
FROM user_subscriptions us
WHERE us.user_id = (
  SELECT auth_user_id FROM user_profiles WHERE email = 'opljwxjmpmkwlulvtg@nesopf.com'
);

-- If found, fix it
UPDATE user_subscriptions
SET user_id = (
  SELECT id FROM user_profiles WHERE email = 'opljwxjmpmkwlulvtg@nesopf.com'
)
WHERE user_id = (
  SELECT auth_user_id FROM user_profiles WHERE email = 'opljwxjmpmkwlulvtg@nesopf.com'
);
```

## 🧪 Verification After Fix

Run this final check:

```sql
-- Complete verification query
WITH user_data AS (
  SELECT 
    id as profile_id,
    auth_user_id,
    email,
    name,
    role,
    startup_name
  FROM user_profiles
  WHERE email = 'opljwxjmpmkwlulvtg@nesopf.com'
)
SELECT 
  ud.email,
  ud.name,
  ud.role,
  us.id as subscription_id,
  us.status,
  us.plan_tier,
  us.current_period_end,
  CURRENT_TIMESTAMP as now,
  CASE 
    WHEN us.status = 'active' AND us.current_period_end > CURRENT_TIMESTAMP THEN '✅ VALID'
    WHEN us.status = 'active' AND us.current_period_end <= CURRENT_TIMESTAMP THEN '❌ EXPIRED'
    ELSE '❌ INACTIVE'
  END as subscription_status,
  us.autopay_enabled,
  us.razorpay_subscription_id,
  pt.razorpay_payment_id,
  pt.amount as payment_amount,
  pt.status as payment_status
FROM user_data ud
LEFT JOIN user_subscriptions us ON us.user_id = ud.profile_id
LEFT JOIN payment_transactions pt ON pt.subscription_id = us.id
ORDER BY us.created_at DESC, pt.created_at DESC
LIMIT 1;
```

**Expected Result:**
- `subscription_status` = ✅ VALID
- `status` = active
- `current_period_end` > now
- `payment_status` = success

## 🚀 Quick Fix for User

If you want to immediately unblock the user, run:

```sql
-- Quick fix: Find and extend the user's subscription
UPDATE user_subscriptions
SET 
  current_period_end = CURRENT_TIMESTAMP + INTERVAL '30 days',
  status = 'active',
  updated_at = CURRENT_TIMESTAMP
WHERE user_id = (
  SELECT id FROM user_profiles WHERE email = 'opljwxjmpmkwlulvtg@nesopf.com'
)
RETURNING *;
```

## 📝 Prevention: Check Payment Verification Code

The issue might be in the payment verification endpoint. Check:

**File:** `api/payment/verify.ts` or `server.js`

Ensure that when subscription is created:
- `current_period_start` = NOW()
- `current_period_end` = NOW() + 30 days (for monthly) or NOW() + 365 days (for yearly)
- `status` = 'active'
- `user_id` = profile_id (NOT auth_user_id)

## 🔍 Debug in Browser Console

Ask the user to open browser console (F12) and run:

```javascript
// Check current user
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);

// Check profile
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('auth_user_id', user.id)
  .single();
console.log('Profile:', profile);

// Check subscription
const { data: subscription } = await supabase
  .from('user_subscriptions')
  .select('*')
  .eq('user_id', profile.id)
  .eq('status', 'active');
console.log('Subscription:', subscription);
```

This will show exactly what's missing or incorrect.

---

## 📞 Next Steps

1. Run **Step 1** to get profile_id
2. Run **Step 2** to check subscription
3. Apply appropriate fix based on scenario
4. Run verification query
5. Ask user to refresh page and try "Go to Dashboard" again

If issue persists after fix, check:
- Browser cache (clear and reload)
- Multiple subscriptions (deactivate duplicates)
- RLS policies on `user_subscriptions` table
