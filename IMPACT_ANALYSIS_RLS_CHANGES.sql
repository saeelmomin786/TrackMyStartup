-- IMPACT ANALYSIS SQL: Shows exactly what will change
-- Run this to see what RLS policies exist and which ones we're fixing

-- ===== SECTION 1: Current RLS Policies on Billing Tables =====
SELECT 'CURRENT RLS POLICIES - BILLING TABLES' as section;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual::text as "Condition (USING)",
  with_check::text as "Check (WITH CHECK)"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('user_subscriptions', 'payments', 'coupons', 'coupon_redemptions', 'subscription_plans')
ORDER BY tablename, policyname;

-- ===== SECTION 2: Which policies reference users table (BEFORE FIX) =====
SELECT 'POLICIES THAT WILL BE CHANGED' as section;

SELECT DISTINCT
  tablename,
  policyname,
  'BEFORE' as status,
  qual::text as old_condition
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('user_subscriptions', 'payments', 'coupons', 'coupon_redemptions', 'subscription_plans')
  AND qual::text ILIKE '%public.users%'
UNION ALL
SELECT DISTINCT
  tablename,
  policyname,
  'BEFORE' as status,
  with_check::text as old_condition
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('user_subscriptions', 'payments', 'coupons', 'coupon_redemptions', 'subscription_plans')
  AND with_check::text ILIKE '%public.users%';

-- ===== SECTION 3: Total count of affected policies =====
SELECT 'SUMMARY OF CHANGES' as section;

SELECT 
  COUNT(DISTINCT policyname) as total_policies_to_fix,
  COUNT(DISTINCT tablename) as tables_affected
FROM pg_policies
WHERE schemaname = 'public' 
  AND (qual::text ILIKE '%public.users%' OR with_check::text ILIKE '%public.users%')
  AND tablename IN ('user_subscriptions', 'payments', 'coupons', 'coupon_redemptions', 'subscription_plans');

-- ===== SECTION 4: Check if users table is still being used elsewhere =====
SELECT 'OTHER USERS TABLE REFERENCES' as section;

-- Check RLS policies on OTHER tables (not billing)
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policies_using_users
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename NOT IN ('user_subscriptions', 'payments', 'coupons', 'coupon_redemptions', 'subscription_plans')
  AND (qual::text ILIKE '%public.users%' OR with_check::text ILIKE '%public.users%')
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ===== SECTION 5: List of SQL files that reference users table =====
-- (This helps us understand the full migration scope)
SELECT 'FILES THAT NEED CHECKING' as section;

CREATE TEMP TABLE sql_files_info AS
SELECT 
  'From grep_search results' as source,
  'CREATE_BILLING_RLS.sql' as file_name,
  7 as count_of_references,
  'RLS policies for subscription/payment/coupon tables' as description
UNION ALL
SELECT 
  'From grep_search results' as source,
  'COMPLETE_INVESTMENT_ADVISOR_DASHBOARD_FIX.sql' as file_name,
  4 as count_of_references,
  'RLS policies for advisor dashboards' as description
UNION ALL
SELECT 
  'From grep_search results' as source,
  'COMPLIANCE_DATABASE_SETUP.sql' as file_name,
  7 as count_of_references,
  'RLS policies for compliance tables' as description;

SELECT * FROM sql_files_info;

-- ===== SECTION 6: Are we ready for the migration? =====
SELECT 'PRE-MIGRATION CHECKLIST' as section;

SELECT 
  CASE 
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_profiles') 
    THEN '✅ user_profiles table exists' 
    ELSE '❌ user_profiles table NOT FOUND' 
  END as check_1,
  CASE 
    WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') 
    THEN '⚠️ users table still exists' 
    ELSE '✅ users table removed' 
  END as check_2,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.user_profiles) > 0 
    THEN '✅ user_profiles has data' 
    ELSE '❌ user_profiles is empty' 
  END as check_3,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.user_subscriptions WHERE status='active') > 0 
    THEN '✅ Active subscriptions exist' 
    ELSE '⚠️ No active subscriptions' 
  END as check_4;
