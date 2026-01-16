-- ============================================================================
-- RLS FIX - PRE-DEPLOYMENT VERIFICATION SCRIPT
-- ============================================================================
-- Run this script FIRST in Supabase SQL Editor to verify:
-- 1. Current state of RLS policies
-- 2. Whether users table still exists
-- 3. If subscription data is properly linked to user_profiles
-- 4. Safety of applying the migration
--
-- Expected output: All checks pass = Safe to proceed
-- ============================================================================

-- Removed psql meta-commands (\set, \echo) to make this script compatible
-- with Supabase SQL Editor which accepts plain SQL only.

-- ============================================================================
-- CHECK 1: Verify user_profiles and users tables
-- ============================================================================
SELECT '========== CHECK 1: TABLE EXISTENCE ==========' as info;

SELECT 
  'user_profiles' as table_name,
  CASE 
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_profiles') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status,
  (SELECT COUNT(*) FROM public.user_profiles)::text as row_count
UNION ALL
SELECT 
  'users' as table_name,
  CASE 
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') 
    THEN '⚠️ EXISTS (deprecated)' 
    ELSE '✅ REMOVED' 
  END as status,
  CASE 
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') 
    THEN (SELECT COUNT(*)::text FROM public.users)
    ELSE 'N/A'
  END as row_count
UNION ALL
SELECT 
  'user_subscriptions' as table_name,
  CASE 
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_subscriptions') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status,
  (SELECT COUNT(*)::text FROM public.user_subscriptions)
;

-- ============================================================================
-- CHECK 2: Verify subscription data links to user_profiles
-- ============================================================================
SELECT '========== CHECK 2: DATA INTEGRITY ==========' as info;

SELECT 
  'Subscriptions linked to profiles' as check_name,
  COUNT(*) as total_subscriptions,
  COUNT(CASE WHEN up.id IS NOT NULL THEN 1 END) as linked_to_profile,
  COUNT(CASE WHEN up.id IS NULL THEN 1 END) as missing_profile,
  ROUND(100.0 * COUNT(CASE WHEN up.id IS NOT NULL THEN 1 END) / COUNT(*), 2) as percent_linked
FROM public.user_subscriptions us
LEFT JOIN public.user_profiles up ON us.user_id = up.id;

-- ============================================================================
-- CHECK 3: Check current RLS policies on billing tables
-- ============================================================================
SELECT '========== CHECK 3: CURRENT RLS POLICIES ==========' as info;

SELECT 
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(DISTINCT policyname, ', ' ORDER BY policyname) as policy_names,
  SUM(CASE WHEN qual::text ILIKE '%public.users%' OR with_check::text ILIKE '%public.users%' THEN 1 ELSE 0 END) as policies_using_old_users_table
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('user_subscriptions', 'payments', 'coupons', 'coupon_redemptions', 'subscription_plans')
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- CHECK 4: List policies that WILL BE CHANGED
-- ============================================================================
SELECT '========== CHECK 4: POLICIES TO BE FIXED ==========' as info;

SELECT 
  tablename,
  policyname,
  'Uses public.users table' as issue,
  'Will be replaced with user_profiles join' as fix
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('user_subscriptions', 'payments', 'coupons', 'coupon_redemptions', 'subscription_plans')
  AND (qual::text ILIKE '%public.users%' OR with_check::text ILIKE '%public.users%')
ORDER BY tablename, policyname;

-- ============================================================================
-- CHECK 5: Sample subscription records
-- ============================================================================
SELECT '========== CHECK 5: SAMPLE SUBSCRIPTION DATA ==========' as info;

SELECT 
  'Sample Active Subscriptions (limit 5)' as check_name;

SELECT 
  us.user_id,
  us.plan_tier,
  us.status,
  us.created_at,
  CASE WHEN up.id IS NOT NULL THEN 'LINKED ✅' ELSE 'MISSING ❌' END as profile_status,
  up.auth_user_id,
  up.email,
  up.role
FROM public.user_subscriptions us
LEFT JOIN public.user_profiles up ON us.user_id = up.id
WHERE us.status = 'active'
ORDER BY us.created_at DESC
LIMIT 5;

-- ============================================================================
-- CHECK 6: Verify admin check works with user_profiles
-- ============================================================================
SELECT '========== CHECK 6: ADMIN VERIFICATION ==========' as info;

SELECT 
  'Admins in user_profiles' as check_name,
  COUNT(*) as total_count
FROM public.user_profiles
WHERE role = 'Admin';

-- ============================================================================
-- CHECK 7: Test subscription visibility (simulate RLS policy)
-- ============================================================================
SELECT '========== CHECK 7: POLICY TEST SIMULATION ==========' as info;

-- This simulates what the NEW RLS policy would do
-- Replace 'YOUR_AUTH_UUID_HERE' with actual auth.uid() when testing
SELECT 
  'Simulated RLS Policy Test' as test_name,
  COUNT(*) as accessible_subscriptions,
  STRING_AGG(DISTINCT plan_tier, ', ') as accessible_plans
FROM public.user_subscriptions us
WHERE EXISTS (
  -- This is what the NEW policy will do:
  -- Match subscription.user_id with user_profiles.id WHERE user_profiles.auth_user_id = auth.uid()
  SELECT 1 FROM public.user_profiles up 
  WHERE up.id = us.user_id 
  AND up.auth_user_id = 'ea07161a-5c9e-40aa-a63a-9160d5d2bd33'::uuid -- Your test user ID
);

-- ============================================================================
-- CHECK 8: Final Safety Assessment
-- ============================================================================
SELECT '========== CHECK 8: SAFETY ASSESSMENT ==========' as info;

WITH safety_checks AS (
  SELECT 
    'user_profiles exists' as check_item,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_profiles') as is_safe
  UNION ALL
  SELECT 
    'user_subscriptions exists',
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_subscriptions')
  UNION ALL
  SELECT 
    'Subscriptions linked to profiles (>90%)',
    (SELECT COUNT(CASE WHEN up.id IS NOT NULL THEN 1 END)::numeric / NULLIF(COUNT(*), 0) FROM public.user_subscriptions us LEFT JOIN public.user_profiles up ON us.user_id = up.id) > 0.9
  UNION ALL
  SELECT 
    'user_profiles has auth_user_id column',
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_profiles' AND column_name='auth_user_id')
  UNION ALL
  SELECT 
    'user_subscriptions has proper schema',
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_subscriptions' AND column_name='user_id')
    AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_subscriptions' AND column_name='status')
)
SELECT 
  COUNT(*) as total_checks,
  SUM(CASE WHEN is_safe THEN 1 ELSE 0 END) as passing_checks,
  SUM(CASE WHEN NOT is_safe THEN 1 ELSE 0 END) as failing_checks,
  CASE 
    WHEN SUM(CASE WHEN is_safe THEN 1 ELSE 0 END) = COUNT(*) 
    THEN '✅ ALL CHECKS PASSED - SAFE TO PROCEED'
    ELSE '❌ SOME CHECKS FAILED - REVIEW BEFORE PROCEEDING'
  END as conclusion
FROM safety_checks;

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT '========== SUMMARY ==========' as info;
SELECT 'If you see ✅ above, you can safely run CREATE_BILLING_RLS.sql' as info;
SELECT 'If you see ❌, contact support before proceeding' as info;
SELECT '' as info;
SELECT 'Next step: Run CREATE_BILLING_RLS.sql in your Supabase SQL Editor' as info;
