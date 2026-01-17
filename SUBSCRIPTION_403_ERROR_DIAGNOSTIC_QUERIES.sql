-- SUBSCRIPTION CREATION 403 ERROR - DIAGNOSTIC QUERIES
-- Run these in Supabase SQL Editor to diagnose the issue

-- ============================================================
-- 1. CHECK RLS STATUS ON SUBSCRIPTION TABLES
-- ============================================================

SELECT 
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS ENABLED'
    ELSE '❌ RLS DISABLED'
  END as rls_status
FROM pg_tables
WHERE tablename IN ('user_subscriptions', 'subscription_plans', 'coupons', 'payments', 'coupon_redemptions')
ORDER BY tablename;

-- Expected: All tables should have rowsecurity = true

-- ============================================================
-- 2. CHECK EXISTING RLS POLICIES
-- ============================================================

SELECT 
  tablename,
  policyname,
  CASE 
    WHEN cmd = 'SELECT' THEN '📖 READ'
    WHEN cmd = 'INSERT' THEN '✍️ INSERT'
    WHEN cmd = 'UPDATE' THEN '✏️ UPDATE'
    WHEN cmd = 'DELETE' THEN '🗑️ DELETE'
    ELSE cmd
  END as policy_type,
  CASE 
    WHEN qual::text ILIKE '%user_profiles%' THEN '✅ Uses user_profiles'
    WHEN qual::text ILIKE '%users%' AND NOT tablename IN ('users', 'subscription_plans') THEN '❌ BROKEN: Uses old users table'
    WHEN qual::text = '' OR qual::text IS NULL THEN '⚠️ Allow all (no condition)'
    ELSE '🔹 Custom condition'
  END as policy_quality,
  qual::text as policy_condition
FROM pg_policies
WHERE tablename IN ('user_subscriptions', 'subscription_plans', 'coupons', 'payments', 'coupon_redemptions')
ORDER BY tablename, policyname;

-- Expected Results:
-- user_subscriptions: 4-5 policies, all using user_profiles in condition
-- subscription_plans: 2 policies (read all, admin write)
-- coupons: 2 policies (read all, admin write)
-- payments: 3-4 policies using user_profiles
-- coupon_redemptions: 2-3 policies using user_profiles

-- ============================================================
-- 3. CHECK USER_SUBSCRIPTIONS TABLE STRUCTURE
-- ============================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_subscriptions'
ORDER BY ordinal_position;

-- ============================================================
-- 4. COUNT SUBSCRIPTIONS BY STATUS
-- ============================================================

SELECT 
  status,
  COUNT(*) as count,
  CASE 
    WHEN status = 'active' THEN '✅ Active'
    WHEN status = 'inactive' THEN '⚠️ Inactive'
    WHEN status = 'cancelled' THEN '🗑️ Cancelled'
    WHEN status = 'past_due' THEN '❌ Past Due'
  END as status_label
FROM public.user_subscriptions
GROUP BY status;

-- ============================================================
-- 5. SAMPLE SUBSCRIPTION RECORDS (First 5)
-- ============================================================

SELECT 
  id,
  user_id,
  plan_id,
  plan_tier,
  status,
  current_period_start,
  current_period_end,
  paid_by_advisor_id,
  created_at
FROM public.user_subscriptions
LIMIT 5;

-- ============================================================
-- 6. VERIFY USER_PROFILES TABLE HAS auth_user_id
-- ============================================================

SELECT 
  id,
  auth_user_id,
  role,
  name,
  email,
  created_at
FROM public.user_profiles
WHERE role IN ('Investment Advisor', 'Startup')
LIMIT 5;

-- ============================================================
-- 7. CHECK FOR SUBSCRIPTION RECORDS WITH NULL USER_ID
-- ============================================================

SELECT 
  COUNT(*) as null_user_id_count
FROM public.user_subscriptions
WHERE user_id IS NULL;

-- Expected: 0 (all subscriptions should have user_id)

-- ============================================================
-- 8. LIST ALL POLICIES ON user_subscriptions IN DETAIL
-- ============================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual as select_condition,
  with_check as insert_update_condition,
  cmd as policy_command
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_subscriptions'
ORDER BY policyname;

-- ============================================================
-- 9. TEST: Can you SELECT from user_subscriptions?
-- ============================================================

-- Run as authenticated user (if you set policy correctly)
-- This should either show results or be filtered by RLS
SELECT COUNT(*) as total_subscriptions
FROM public.user_subscriptions;

-- Expected: Either returns a count or RLS blocks it
-- If RLS blocks it, you'll get an error

-- ============================================================
-- 10. IDENTIFY BROKEN POLICIES
-- ============================================================

-- Show policies that reference the old 'users' table (BROKEN)
WITH old_table_refs AS (
  SELECT 
    tablename,
    policyname,
    qual::text || ' ' || COALESCE(with_check::text, '') as full_policy
  FROM pg_policies
  WHERE schemaname = 'public'
)
SELECT 
  tablename,
  policyname,
  CASE 
    WHEN full_policy ILIKE '%from%users%' OR full_policy ILIKE '%join%users%' 
      THEN '❌ REFERENCES OLD "users" TABLE - BROKEN'
    ELSE '✅ OK'
  END as status,
  full_policy
FROM old_table_refs
WHERE full_policy ILIKE '%users%'
  AND tablename NOT IN ('users', 'user_profiles')
ORDER BY tablename;

-- ============================================================
-- 11. COMPARE ID SYSTEMS (auth.uid() vs profile_id vs user_id)
-- ============================================================

-- Check how IDs are used:
-- auth.users.id (in auth schema) = auth_user_id in our system
-- user_profiles.id = profile_id (this is what goes in user_subscriptions.user_id)
-- user_subscriptions.user_id = profile_id (NOT auth_user_id!)

SELECT 
  'user_subscriptions' as table_name,
  'user_id' as column_name,
  'profile_id' as expected_value,
  'Used in foreign key to user_profiles.id' as usage_note
UNION ALL
SELECT 
  'user_profiles',
  'id',
  'profile_id (UUID)',
  'Primary key'
UNION ALL
SELECT 
  'user_profiles',
  'auth_user_id',
  'auth_user_id (UUID from auth.users)',
  'Foreign key to auth.users.id'
UNION ALL
SELECT 
  'advisor_credit_subscriptions',
  'advisor_user_id',
  'auth_user_id',
  'Foreign key to auth.users.id (NOT profile_id!)'
ORDER BY table_name, column_name;

-- ============================================================
-- 12. SAMPLE: Show a subscription with full user chain
-- ============================================================

SELECT 
  s.id as subscription_id,
  s.user_id as subscription_user_id,
  s.plan_tier,
  s.status,
  up.id as profile_id,
  up.auth_user_id,
  up.name,
  up.email,
  up.role
FROM public.user_subscriptions s
LEFT JOIN public.user_profiles up ON up.id = s.user_id
LIMIT 1;

-- Expected output shows:
-- subscription_user_id = profile_id (should match)
-- profile_id = up.id (should match)
-- auth_user_id = the UUID from auth.users table

-- ============================================================
-- SUMMARY OF ISSUES TO CHECK
-- ============================================================
-- ✅ RLS enabled on all subscription tables?
-- ✅ All policies use user_profiles table (NOT users)?
-- ✅ INSERT policy exists for user_subscriptions?
-- ✅ SELECT policy exists for user_subscriptions?
-- ✅ UPDATE policy exists for user_subscriptions?
-- ✅ Admin policy exists for all operations?
-- ✅ No NULL user_id values in subscriptions?
-- ✅ user_subscriptions.user_id = user_profiles.id (profile_id)?
-- ✅ user_profiles.auth_user_id is populated?
-- ✅ RLS policies correctly join user_profiles?
