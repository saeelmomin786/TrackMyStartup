-- 🧪 POST-DEPLOYMENT VERIFICATION TESTS
-- Run these after applying FIX_USER_SUBSCRIPTIONS_RLS_IMMEDIATE.sql
-- All queries should return results without errors

-- ✅ TEST 1: Verify all policies exist
SELECT COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'user_subscriptions'
AND policyname IN (
  'user_subscriptions_user_read',
  'user_subscriptions_user_insert',
  'user_subscriptions_user_update',
  'user_subscriptions_admin_all'
);
-- Expected result: 4 (all policies present)

-- ✅ TEST 2: List all user_subscriptions policies
SELECT 
  policyname,
  permissive,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'user_subscriptions'
ORDER BY policyname;
-- Expected result: 4 rows with INSERT, UPDATE, SELECT, ALL commands

-- ✅ TEST 3: Check RLS is enabled on table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'user_subscriptions';
-- Expected result: rowsecurity = true

-- ✅ TEST 4: Verify user_profiles table exists (required for policy joins)
SELECT 
  COUNT(*) as profile_count
FROM public.user_profiles
LIMIT 1;
-- Expected result: Shows count of profiles

-- ✅ TEST 5: Check policy logic - Show INSERT policy details
SELECT 
  policyname,
  with_check
FROM pg_policies 
WHERE tablename = 'user_subscriptions'
AND policyname = 'user_subscriptions_user_insert';
-- Expected result: WITH CHECK clause contains user_profiles join

-- ✅ TEST 6: Verify no anonymous access
SELECT 
  policyname,
  roles::text as role_list
FROM pg_policies 
WHERE tablename = 'user_subscriptions'
AND 'anon' = ANY(roles);
-- Expected result: 0 rows (no anonymous policies)

-- ✅ TEST 7: List all RLS-enabled tables in public schema
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND rowsecurity = true
ORDER BY tablename;
-- Expected result: Shows all RLS-enabled tables

-- 📊 SUMMARY: If all tests return expected results, RLS is properly configured
-- and users should be able to INSERT subscription records without 403 errors
