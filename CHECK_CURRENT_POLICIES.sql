-- =====================================================
-- CHECK CURRENT RLS POLICIES ON INCUBATION_OPPORTUNITIES
-- =====================================================

-- Step 1: Check if RLS is enabled on the table
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS_ENABLED"
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'incubation_opportunities';

-- Step 2: List all existing policies on incubation_opportunities
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  qual as "USING_CONDITION",
  with_check as "WITH_CHECK_CONDITION"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'incubation_opportunities'
ORDER BY policyname;

-- Step 3: Count total policies
SELECT 
  COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'incubation_opportunities';

-- Step 4: Check if "Startups can view opportunities they applied to" policy already exists
SELECT 
  policyname,
  permissive,
  roles
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'incubation_opportunities'
  AND policyname = 'Startups can view opportunities they applied to';
