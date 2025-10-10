-- Fix subscription user_id to match current authenticated user
-- Replace the user_id in the subscription record

-- Step 1: Check current subscriptions
SELECT 'BEFORE UPDATE' as status, * FROM user_subscriptions 
WHERE user_id IN ('88e3b037-4bf9-4e79-91ac-ed3cc2746b88', '3d6fa11c-562d-4b35-abe4-703208a9b422');

-- Step 2: Update the subscription to current user
UPDATE user_subscriptions 
SET user_id = '3d6fa11c-562d-4b35-abe4-703208a9b422'
WHERE user_id = '88e3b037-4bf9-4e79-91ac-ed3cc2746b88';

-- Step 3: Verify the update worked
SELECT 'AFTER UPDATE' as status, * FROM user_subscriptions 
WHERE user_id = '3d6fa11c-562d-4b35-abe4-703208a9b422';

-- Step 4: Check if subscription is valid
SELECT 
  *,
  CASE 
    WHEN current_period_end > NOW() THEN 'VALID - Should show dashboard'
    ELSE 'EXPIRED - Will redirect to payment'
  END as validity_status
FROM user_subscriptions 
WHERE user_id = '3d6fa11c-562d-4b35-abe4-703208a9b422';
