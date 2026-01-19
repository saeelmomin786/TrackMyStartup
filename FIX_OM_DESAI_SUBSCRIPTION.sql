-- ================================================================
-- FIX SUBSCRIPTION FOR: Om Desai (opljwxjmpmkwlulvtg@nesopf.com)
-- Profile ID: db4c251a-9bc2-4e1c-952f-081e14a5ae06
-- Auth User ID: c6b6b22f-d4b8-4c22-afe0-92b623854fb3
-- ================================================================

-- STEP 1: Check Current Subscription Status
-- ================================================================
SELECT 
  id as subscription_id,
  user_id,
  plan_id,
  plan_tier,
  status,
  current_period_start,
  current_period_end,
  CURRENT_TIMESTAMP as now,
  CASE 
    WHEN status = 'active' AND current_period_end > CURRENT_TIMESTAMP THEN '✅ VALID - No fix needed'
    WHEN status = 'active' AND current_period_end <= CURRENT_TIMESTAMP THEN '❌ EXPIRED - Need to extend'
    WHEN status = 'inactive' THEN '❌ INACTIVE - Need to activate'
    ELSE '⚠️ UNKNOWN STATUS'
  END as diagnosis,
  autopay_enabled,
  razorpay_subscription_id,
  payment_gateway,
  amount,
  currency,
  interval,
  billing_cycle_count,
  total_paid,
  created_at,
  updated_at
FROM user_subscriptions
WHERE user_id = 'db4c251a-9bc2-4e1c-952f-081e14a5ae06'
ORDER BY created_at DESC
LIMIT 5;

-- STEP 2: Check Payment Transactions
-- ================================================================
SELECT 
  id as payment_id,
  user_id as payment_user_id,
  auth_user_id as payment_auth_user_id,
  subscription_id,
  plan_tier,
  amount,
  currency,
  status as payment_status,
  payment_type,
  is_autopay,
  razorpay_payment_id,
  razorpay_subscription_id,
  created_at as payment_date
FROM payment_transactions
WHERE auth_user_id = 'c6b6b22f-d4b8-4c22-afe0-92b623854fb3'
ORDER BY created_at DESC
LIMIT 5;

-- STEP 3: Check for Orphaned Payments (payment without subscription)
-- ================================================================
SELECT 
  pt.id as payment_id,
  pt.amount,
  pt.currency,
  pt.plan_tier,
  pt.status,
  pt.razorpay_payment_id,
  pt.razorpay_subscription_id,
  pt.subscription_id,
  CASE 
    WHEN pt.subscription_id IS NULL THEN '❌ ORPHANED - No subscription linked'
    ELSE '✅ LINKED'
  END as payment_status,
  pt.created_at
FROM payment_transactions pt
WHERE pt.auth_user_id = 'c6b6b22f-d4b8-4c22-afe0-92b623854fb3'
AND pt.status = 'success'
ORDER BY pt.created_at DESC
LIMIT 3;


-- ================================================================
-- FIX OPTIONS (Run based on diagnosis from STEP 1)
-- ================================================================

-- ----------------------------------------------------------------
-- FIX A: If subscription exists but EXPIRED (current_period_end in past)
-- ----------------------------------------------------------------
-- Run this to extend the subscription to 30 days from now
/*
UPDATE user_subscriptions
SET 
  current_period_end = CURRENT_TIMESTAMP + INTERVAL '30 days',
  next_billing_date = CURRENT_TIMESTAMP + INTERVAL '30 days',
  status = 'active',
  updated_at = CURRENT_TIMESTAMP
WHERE user_id = 'db4c251a-9bc2-4e1c-952f-081e14a5ae06'
AND id = (
  SELECT id FROM user_subscriptions 
  WHERE user_id = 'db4c251a-9bc2-4e1c-952f-081e14a5ae06'
  ORDER BY created_at DESC 
  LIMIT 1
)
RETURNING *;
*/

-- ----------------------------------------------------------------
-- FIX B: If subscription exists but INACTIVE
-- ----------------------------------------------------------------
-- Run this to activate the subscription
/*
UPDATE user_subscriptions
SET 
  status = 'active',
  current_period_end = CURRENT_TIMESTAMP + INTERVAL '30 days',
  next_billing_date = CURRENT_TIMESTAMP + INTERVAL '30 days',
  updated_at = CURRENT_TIMESTAMP
WHERE user_id = 'db4c251a-9bc2-4e1c-952f-081e14a5ae06'
AND id = (
  SELECT id FROM user_subscriptions 
  WHERE user_id = 'db4c251a-9bc2-4e1c-952f-081e14a5ae06'
  ORDER BY created_at DESC 
  LIMIT 1
)
RETURNING *;
*/

-- ----------------------------------------------------------------
-- FIX C: If NO subscription exists but payment was successful
-- ----------------------------------------------------------------
-- First, get the payment details
/*
SELECT 
  pt.razorpay_subscription_id,
  pt.amount,
  pt.currency,
  pt.plan_tier,
  pt.id as payment_id
FROM payment_transactions pt
WHERE pt.auth_user_id = 'c6b6b22f-d4b8-4c22-afe0-92b623854fb3'
AND pt.status = 'success'
ORDER BY pt.created_at DESC
LIMIT 1;
*/

-- Then create the subscription manually
-- ⚠️ IMPORTANT: Update the VALUES below based on the payment details above
/*
INSERT INTO user_subscriptions (
  user_id,
  plan_id,
  plan_tier,
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
  'db4c251a-9bc2-4e1c-952f-081e14a5ae06',  -- user_id (profile_id)
  (SELECT id FROM subscription_plans WHERE plan_tier = 'basic' AND currency = 'INR' LIMIT 1),  -- plan_id
  'basic',  -- plan_tier (change to 'premium' if needed)
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '30 days',  -- 30 days for monthly
  800,  -- amount (update based on actual payment)
  'INR',  -- currency
  'monthly',  -- interval
  'razorpay',
  true,  -- autopay_enabled
  NULL,  -- razorpay_subscription_id (update if available)
  1,  -- billing_cycle_count
  800,  -- total_paid (update based on actual payment)
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '30 days'
)
RETURNING *;
*/

-- After creating subscription, link it to the payment
/*
UPDATE payment_transactions
SET subscription_id = (
  SELECT id FROM user_subscriptions 
  WHERE user_id = 'db4c251a-9bc2-4e1c-952f-081e14a5ae06'
  ORDER BY created_at DESC 
  LIMIT 1
)
WHERE auth_user_id = 'c6b6b22f-d4b8-4c22-afe0-92b623854fb3'
AND subscription_id IS NULL
AND status = 'success'
RETURNING *;
*/

-- ----------------------------------------------------------------
-- FIX D: If subscription has wrong user_id (auth_user_id instead of profile_id)
-- ----------------------------------------------------------------
/*
-- Check if subscription exists with auth_user_id
SELECT * FROM user_subscriptions 
WHERE user_id = 'c6b6b22f-d4b8-4c22-afe0-92b623854fb3';

-- If found, fix it
UPDATE user_subscriptions
SET user_id = 'db4c251a-9bc2-4e1c-952f-081e14a5ae06'
WHERE user_id = 'c6b6b22f-d4b8-4c22-afe0-92b623854fb3'
RETURNING *;
*/


-- ================================================================
-- VERIFICATION AFTER FIX
-- ================================================================
-- Run this to confirm everything is working
/*
SELECT 
  'Om Desai' as user_name,
  'opljwxjmpmkwlulvtg@nesopf.com' as email,
  us.id as subscription_id,
  us.status,
  us.plan_tier,
  us.current_period_end,
  CURRENT_TIMESTAMP as now,
  CASE 
    WHEN us.status = 'active' AND us.current_period_end > CURRENT_TIMESTAMP THEN '✅ VALID - User can access dashboard'
    WHEN us.status = 'active' AND us.current_period_end <= CURRENT_TIMESTAMP THEN '❌ STILL EXPIRED'
    ELSE '❌ STILL INACTIVE'
  END as final_status,
  us.autopay_enabled,
  us.razorpay_subscription_id,
  pt.razorpay_payment_id,
  pt.amount as payment_amount,
  pt.status as payment_status,
  pt.created_at as payment_date
FROM user_subscriptions us
LEFT JOIN payment_transactions pt ON pt.subscription_id = us.id
WHERE us.user_id = 'db4c251a-9bc2-4e1c-952f-081e14a5ae06'
ORDER BY us.created_at DESC, pt.created_at DESC
LIMIT 1;
*/


-- ================================================================
-- QUICK FIX (if you just want to unblock the user immediately)
-- ================================================================
-- This will find the most recent subscription and extend it
/*
UPDATE user_subscriptions
SET 
  current_period_end = CURRENT_TIMESTAMP + INTERVAL '30 days',
  next_billing_date = CURRENT_TIMESTAMP + INTERVAL '30 days',
  status = 'active',
  updated_at = CURRENT_TIMESTAMP
WHERE user_id = 'db4c251a-9bc2-4e1c-952f-081e14a5ae06'
AND id = (
  SELECT id FROM user_subscriptions 
  WHERE user_id = 'db4c251a-9bc2-4e1c-952f-081e14a5ae06'
  ORDER BY created_at DESC 
  LIMIT 1
)
RETURNING 
  id as subscription_id,
  status,
  plan_tier,
  current_period_end,
  'User should now be able to access dashboard' as result;
*/

-- If no subscription exists at all, run this:
/*
INSERT INTO user_subscriptions (
  user_id,
  plan_id,
  plan_tier,
  status,
  current_period_start,
  current_period_end,
  amount,
  currency,
  interval,
  payment_gateway,
  autopay_enabled,
  billing_cycle_count,
  total_paid,
  last_billing_date,
  next_billing_date
)
SELECT
  'db4c251a-9bc2-4e1c-952f-081e14a5ae06',  -- user_id
  sp.id,  -- plan_id
  'basic',  -- plan_tier
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  sp.price,
  sp.currency,
  'monthly',
  'razorpay',
  true,
  1,
  sp.price,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '30 days'
FROM subscription_plans sp
WHERE sp.plan_tier = 'basic' 
AND sp.currency = 'INR'
LIMIT 1
RETURNING *;
*/
