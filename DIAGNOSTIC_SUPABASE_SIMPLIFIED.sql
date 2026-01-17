-- =====================================================
-- SUPABASE BILLING TABLES DIAGNOSTIC - SIMPLIFIED
-- =====================================================
-- Run each section separately in Supabase SQL Editor

-- =====================================================
-- 1. CHECK RLS POLICIES - What policies exist?
-- =====================================================
SELECT 
  tablename as table_name,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename IN ('payment_transactions', 'user_subscriptions', 'billing_cycles')
ORDER BY tablename, policyname;

-- =====================================================
-- 2. CHECK IF RLS ENABLED
-- =====================================================
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('payment_transactions', 'user_subscriptions', 'billing_cycles')
ORDER BY tablename;

-- =====================================================
-- 3. CHECK FOREIGN KEYS
-- =====================================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('payment_transactions', 'user_subscriptions', 'billing_cycles')
ORDER BY tc.table_name;

-- =====================================================
-- 4. COUNT RECORDS
-- =====================================================
SELECT 
  'payment_transactions' as table_name,
  COUNT(*) as count
FROM public.payment_transactions
UNION ALL
SELECT 
  'user_subscriptions',
  COUNT(*)
FROM public.user_subscriptions
UNION ALL
SELECT 
  'billing_cycles',
  COUNT(*)
FROM public.billing_cycles;

-- =====================================================
-- 5. SAMPLE DATA - payment_transactions
-- =====================================================
SELECT 
  id,
  user_id as auth_user_id,
  subscription_id,
  payment_gateway,
  status,
  amount
FROM public.payment_transactions
LIMIT 3;

-- =====================================================
-- 6. SAMPLE DATA - user_subscriptions
-- =====================================================
SELECT 
  us.id as subscription_id,
  us.user_id as profile_id,
  up.auth_user_id,
  us.status,
  us.razorpay_subscription_id,
  us.billing_cycle_count
FROM public.user_subscriptions us
LEFT JOIN public.user_profiles up ON up.id = us.user_id
LIMIT 3;

-- =====================================================
-- 7. SAMPLE DATA - billing_cycles
-- =====================================================
SELECT 
  id,
  subscription_id,
  cycle_number,
  amount,
  status
FROM public.billing_cycles
LIMIT 3;

-- =====================================================
-- 8. CHECK auth_user_id to profile_id mapping
-- =====================================================
SELECT 
  id as profile_id,
  auth_user_id,
  role,
  email
FROM public.user_profiles
LIMIT 5;

-- =====================================================
-- 9. COMPLETE FLOW - show how tables connect
-- =====================================================
SELECT 
  up.auth_user_id,
  up.id as profile_id,
  up.role,
  COUNT(DISTINCT us.id) as subscription_count,
  COUNT(DISTINCT bc.id) as billing_cycle_count,
  COUNT(DISTINCT pt.id) as payment_count
FROM public.user_profiles up
LEFT JOIN public.user_subscriptions us ON us.user_id = up.id
LEFT JOIN public.billing_cycles bc ON bc.subscription_id = us.id
LEFT JOIN public.payment_transactions pt ON pt.subscription_id = us.id
WHERE up.auth_user_id IS NOT NULL
GROUP BY up.auth_user_id, up.id, up.role
LIMIT 10;

