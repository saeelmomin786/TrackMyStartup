-- DIAGNOSTIC CHECK: Run this BEFORE applying the RLS fixes
-- This will tell us if users table exists and if we can safely proceed

-- ===== STEP 1: Check if users table exists =====
SELECT 'STEP 1: TABLE EXISTENCE CHECK' as diagnostic;

SELECT 
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') as "users_table_exists",
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') as "user_profiles_table_exists";

-- ===== STEP 2: Check users table status (if it exists) =====
SELECT 'STEP 2: USERS TABLE STATUS' as diagnostic;

SELECT 
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM public.users) as row_count
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';

-- ===== STEP 3: Check user_profiles table status =====
SELECT 'STEP 3: USER_PROFILES TABLE STATUS' as diagnostic;

SELECT 
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM public.user_profiles) as row_count
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- ===== STEP 4: Check RLS policies currently using users table =====
SELECT 'STEP 4: RLS POLICIES STILL REFERENCING USERS TABLE' as diagnostic;

SELECT 
  schemaname,
  tablename,
  policyname,
  CASE WHEN qual::text IS NOT NULL THEN 'YES (qual)' ELSE 'NO' END as references_users_in_qual,
  CASE WHEN with_check::text IS NOT NULL THEN 'YES (check)' ELSE 'NO' END as references_users_in_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND (qual::text ILIKE '%public.users%' OR with_check::text ILIKE '%public.users%')
ORDER BY tablename, policyname;

-- ===== STEP 5: Check subscription user IDs (sample) =====
SELECT 'STEP 5: SAMPLE SUBSCRIPTION RECORDS' as diagnostic;

SELECT 
  COUNT(*) as total_subscriptions,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(CASE WHEN status='active' THEN 1 END) as active_count,
  COUNT(CASE WHEN status='inactive' THEN 1 END) as inactive_count
FROM public.user_subscriptions;

-- ===== STEP 6: Verify sample subscription user exists in user_profiles =====
SELECT 'STEP 6: VERIFY SUBSCRIPTION USER IDs IN USER_PROFILES' as diagnostic;

SELECT 
  us.user_id,
  us.plan_tier,
  us.status,
  CASE 
    WHEN up.id IS NOT NULL THEN 'YES - Profile exists'
    ELSE 'NO - Profile NOT FOUND'
  END as profile_exists,
  up.auth_user_id,
  up.role
FROM public.user_subscriptions us
LEFT JOIN public.user_profiles up ON us.user_id = up.id
LIMIT 5;

-- ===== STEP 7: Check for missing profiles =====
SELECT 'STEP 7: SUBSCRIPTIONS WITH MISSING PROFILES' as diagnostic;

SELECT 
  COUNT(*) as count_missing_profiles,
  STRING_AGG(DISTINCT us.user_id::text, ', ') as user_ids
FROM public.user_subscriptions us
LEFT JOIN public.user_profiles up ON us.user_id = up.id
WHERE up.id IS NULL;

-- ===== STEP 8: Check for duplicate active subscriptions =====
SELECT 'STEP 8: USERS WITH MULTIPLE ACTIVE SUBSCRIPTIONS' as diagnostic;

WITH active_subs AS (
  SELECT 
    user_id,
    COUNT(*) as active_count,
    STRING_AGG(plan_tier, ', ') as plan_tiers
  FROM public.user_subscriptions
  WHERE status = 'active'
  GROUP BY user_id
  HAVING COUNT(*) > 1
)
SELECT * FROM active_subs;

-- ===== STEP 9: Quick test - can we read own subscription? =====
SELECT 'STEP 9: RLS POLICY TEST (if you run this as authenticated user)' as diagnostic;

SELECT 
  COUNT(*) as subscription_count,
  MAX(plan_tier) as max_plan
FROM public.user_subscriptions
WHERE status = 'active'
LIMIT 1;

-- ===== SUMMARY =====
SELECT 'ALL CHECKS COMPLETE - Ready for RLS migration?' as result;
