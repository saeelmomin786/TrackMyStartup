-- Run this to find WHY 403 is still occurring despite correct policies
-- This checks if the data in user_profiles matches what's being inserted

-- 1. Get your current auth.uid()
SELECT auth.uid() as "Your_Current_Auth_User_ID";

-- 2. Check if you have a profile_id for your auth_user_id
SELECT 
  id as profile_id,
  auth_user_id,
  role,
  created_at
FROM user_profiles
WHERE auth_user_id = auth.uid()
LIMIT 10;

-- 3. Check your existing subscriptions (if any)
SELECT 
  id,
  user_id as profile_id,
  plan_id,
  status,
  created_at,
  current_period_end
FROM user_subscriptions
WHERE user_id IN (
  SELECT id FROM user_profiles WHERE auth_user_id = auth.uid()
)
LIMIT 10;

-- 4. Check if all subscription_plans exist and are readable
SELECT * FROM subscription_plans LIMIT 5;

-- 5. Check RLS is enabled
SELECT 
  tablename,
  rowsecurity as "RLS_Enabled"
FROM pg_tables 
WHERE tablename IN ('user_subscriptions', 'user_profiles', 'subscription_plans')
  AND schemaname = 'public'
ORDER BY tablename;

-- 6. Try a simple test INSERT (this will show if INSERT policy works)
-- UNCOMMENT ONLY IF YOU WANT TO TEST - This creates a test subscription
/*
INSERT INTO user_subscriptions (
  user_id,
  plan_id,
  status,
  current_period_start,
  current_period_end
) VALUES (
  (SELECT id FROM user_profiles WHERE auth_user_id = auth.uid() LIMIT 1),
  (SELECT id FROM subscription_plans WHERE tier = 'Premium' LIMIT 1),
  'active',
  NOW(),
  NOW() + interval '30 days'
)
RETURNING *;
*/
