-- Run this in Supabase SQL Editor to check and backup current RLS policies
-- This will show you what's currently deployed before you apply the new fix

-- 1. Check all RLS policies on subscription_plans
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  qual as "for_select",
  with_check as "for_insert_update"
FROM pg_policies 
WHERE tablename = 'subscription_plans'
ORDER BY tablename, policyname;

-- 2. Check all RLS policies on coupons
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  qual as "for_select",
  with_check as "for_insert_update"
FROM pg_policies 
WHERE tablename = 'coupons'
ORDER BY tablename, policyname;

-- 3. Check all RLS policies on user_subscriptions (THE IMPORTANT ONE)
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  qual as "for_select",
  with_check as "for_insert_update"
FROM pg_policies 
WHERE tablename = 'user_subscriptions'
ORDER BY tablename, policyname;

-- 4. Check if RLS is enabled on these tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS_Enabled"
FROM pg_tables 
WHERE tablename IN ('subscription_plans', 'coupons', 'user_subscriptions', 'payments')
  AND schemaname = 'public'
ORDER BY tablename;

-- 5. Show current policy definitions for user_subscriptions (most detailed)
SELECT 
  schemaname,
  tablename,
  policyname,
  qual as policy_expression,
  with_check as with_check_expression,
  cmd as policy_type
FROM pg_policies
WHERE tablename = 'user_subscriptions'
  AND schemaname = 'public'
ORDER BY policyname;
