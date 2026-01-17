-- =====================================================
-- GET RLS POLICY DETAILS - SIMPLE VERSION
-- =====================================================

-- This shows the exact RLS policies on billing_cycles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'billing_cycles'
AND policyname = 'Users can view their own billing cycles';

-- Also check payment_transactions RLS policy
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'payment_transactions'
AND policyname = 'Users can view their own payment transactions';

-- Also check user_subscriptions RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_subscriptions'
ORDER BY policyname;
