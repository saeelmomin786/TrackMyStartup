-- =====================================================
-- CHECK CURRENT RLS POLICIES ON user_subscriptions
-- =====================================================
-- Run this in Supabase SQL Editor to see what policies exist
-- =====================================================

-- 1. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'user_subscriptions';

-- 2. List all current policies on user_subscriptions
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS command,
  qual AS using_expression,
  with_check
FROM pg_policies
WHERE tablename = 'user_subscriptions'
ORDER BY policyname;

-- 3. Get detailed policy definitions (more readable)
SELECT 
  policyname AS "Policy Name",
  cmd AS "Command Type",
  CASE 
    WHEN cmd = 'SELECT' THEN 'Read'
    WHEN cmd = 'INSERT' THEN 'Create'
    WHEN cmd = 'UPDATE' THEN 'Modify'
    WHEN cmd = 'DELETE' THEN 'Remove'
    WHEN cmd = 'ALL' THEN 'All Operations'
  END AS "Operation",
  permissive AS "Permissive",
  roles AS "Roles",
  qual AS "USING Clause",
  with_check AS "WITH CHECK Clause"
FROM pg_policies
WHERE tablename = 'user_subscriptions'
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    WHEN 'ALL' THEN 5
  END,
  policyname;

-- 4. Check if paid_by_advisor_id column exists
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_subscriptions'
  AND column_name IN ('user_id', 'paid_by_advisor_id')
ORDER BY ordinal_position;

-- 5. Check related tables for policy references
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE qual::text LIKE '%user_subscriptions%'
   OR with_check::text LIKE '%user_subscriptions%'
ORDER BY tablename, policyname;
