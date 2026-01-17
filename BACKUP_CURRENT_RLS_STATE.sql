-- BACKUP: Export current RLS policies BEFORE applying fix
-- Run this to save current state, then check results

-- 1. Get current user_subscriptions policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual as policy_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'user_subscriptions'
  AND schemaname = 'public'
ORDER BY policyname;

-- 2. Get all table RLS status
SELECT 
  tablename,
  rowsecurity as "RLS_Enabled"
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('user_subscriptions', 'subscription_plans', 'coupons', 'advisor_credit_assignments')
ORDER BY tablename;

-- Save this output before running FIX_RLS_ADVISOR_SUBSCRIPTIONS.sql
