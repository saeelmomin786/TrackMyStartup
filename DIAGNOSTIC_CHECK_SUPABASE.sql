-- =====================================================
-- SUPABASE BILLING TABLES DIAGNOSTIC CHECK
-- =====================================================
-- Run this in Supabase SQL Editor to verify current state
-- Copy the entire script and run it

-- =====================================================
-- 1. CHECK RLS POLICIES ON payment_transactions
-- =====================================================
SELECT 
  'payment_transactions' as table_name,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'payment_transactions'
ORDER BY policyname;

-- =====================================================
-- 2. CHECK RLS POLICIES ON user_subscriptions
-- =====================================================
SELECT 
  'user_subscriptions' as table_name,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'user_subscriptions'
ORDER BY policyname;

-- =====================================================
-- 3. CHECK RLS POLICIES ON billing_cycles
-- =====================================================
SELECT 
  'billing_cycles' as table_name,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'billing_cycles'
ORDER BY policyname;

-- =====================================================
-- 4. CHECK TABLE STRUCTURE - payment_transactions
-- =====================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'payment_transactions'
ORDER BY ordinal_position;

-- =====================================================
-- 5. CHECK TABLE STRUCTURE - user_subscriptions
-- =====================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions'
ORDER BY ordinal_position;

-- =====================================================
-- 6. CHECK TABLE STRUCTURE - billing_cycles
-- =====================================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'billing_cycles'
ORDER BY ordinal_position;

-- =====================================================
-- 7. CHECK FOREIGN KEY CONSTRAINTS
-- =====================================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS referenced_table_name,
  ccu.column_name AS referenced_column_name,
  rc.update_rule,
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
-- 8. CHECK IF RLS IS ENABLED ON TABLES
-- =====================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('payment_transactions', 'user_subscriptions', 'billing_cycles')
ORDER BY tablename;

-- =====================================================
-- 9. LIST ALL TABLES WITH RLS ENABLED
-- =====================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('payment_transactions', 'user_subscriptions', 'billing_cycles')
ORDER BY tablename;

-- =====================================================
-- 10. COUNT RECORDS IN EACH TABLE
-- =====================================================
SELECT 
  'payment_transactions' as table_name,
  COUNT(*) as total_records
FROM public.payment_transactions
UNION ALL
SELECT 
  'user_subscriptions' as table_name,
  COUNT(*) as total_records
FROM public.user_subscriptions
UNION ALL
SELECT 
  'billing_cycles' as table_name,
  COUNT(*) as total_records
FROM public.billing_cycles;

-- =====================================================
-- 11. CHECK DATA SAMPLE - payment_transactions
-- =====================================================
SELECT 
  'payment_transactions' as source,
  id,
  user_id,
  subscription_id,
  payment_gateway,
  status,
  amount,
  created_at
FROM public.payment_transactions
LIMIT 5;

-- =====================================================
-- 12. CHECK DATA SAMPLE - user_subscriptions
-- =====================================================
SELECT 
  'user_subscriptions' as source,
  us.id,
  us.user_id as profile_id,
  up.auth_user_id,
  us.plan_id,
  us.status,
  us.razorpay_subscription_id,
  us.billing_cycle_count,
  us.created_at
FROM public.user_subscriptions us
LEFT JOIN public.user_profiles up ON up.id = us.user_id
LIMIT 5;

-- =====================================================
-- 13. CHECK DATA SAMPLE - billing_cycles
-- =====================================================
SELECT 
  'billing_cycles' as source,
  bc.id,
  bc.subscription_id,
  bc.cycle_number,
  bc.amount,
  bc.status,
  bc.period_start,
  bc.period_end,
  bc.created_at
FROM public.billing_cycles bc
LIMIT 5;
SELECT 
  'user_profiles' as source,
  id as profile_id,
  auth_user_id,
  role,
  email,
  created_at
FROM public.user_profiles
LIMIT 10;

-- =====================================================
-- 17. SHOW COMPLETE DIAGNOSTIC - auth_user_id vs profile_id
-- =====================================================
SELECT 
  'Complete Flow Check' as check_name,
  up.auth_user_id,
  up.id as profile_id,
  up.role,
  us.id as subscription_id,
  us.status as subscription_status,
  us.billing_cycle_count,
  bc.cycle_number,
  bc.status as cycle_status,
  pt.id as payment_id,
  pt.status as payment_status
FROM public.user_profiles up
LEFT JOIN public.user_subscriptions us ON us.user_id = up.id
LEFT JOIN public.billing_cycles bc ON bc.subscription_id = us.id
LEFT JOIN public.payment_transactions pt ON pt.subscription_id = us.id
WHERE up.auth_user_id IS NOT NULL
LIMIT 10;

-- =====================================================
-- 18. TEST RLS POLICY - Simulate user access
-- =====================================================
-- This shows what the current policy allows/blocks
-- It won't actually run as a user, but shows the logic

SELECT 
  'RLS Policy Test' as test_type,
  'Current billing_cycles RLS checks:' as description
UNION ALL
SELECT 
  'RLS Policy Test',
  'SELECT: EXISTS(SELECT 1 FROM user_subscriptions WHERE user_subscriptions.id = billing_cycles.subscription_id AND user_subscriptions.user_id = auth.uid())'
UNION ALL
SELECT 
  'RLS Policy Test',
  'Problem: user_subscriptions.user_id is profile_id, but auth.uid() is auth_user_id - NEVER MATCH!'
UNION ALL
SELECT 
  'RLS Policy Test',
  'Fix needed: Join user_profiles to convert auth_user_id to profile_id';

