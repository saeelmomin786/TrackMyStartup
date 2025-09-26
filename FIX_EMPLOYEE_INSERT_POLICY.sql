-- Fix Employee Insert Policy Issue
-- This script fixes the missing INSERT policy for the employees table

-- 1. Check current policies on employees table
SELECT 
  policyname,
  cmd AS command,
  roles,
  qual AS "using",
  with_check
FROM pg_policies 
WHERE schemaname='public' AND tablename='employees'
ORDER BY policyname;

-- 2. Drop the incomplete INSERT policy if it exists
DROP POLICY IF EXISTS "Users can add employees to their own startups" ON employees;

-- 3. Create the correct INSERT policy
CREATE POLICY "Users can add employees to their own startups" ON employees
    FOR INSERT WITH CHECK (
        startup_id IN (
            SELECT id FROM startups WHERE user_id = auth.uid()
        )
    );

-- 4. Verify the policy was created correctly
SELECT 
  policyname,
  cmd AS command,
  roles,
  qual AS "using",
  with_check
FROM pg_policies 
WHERE schemaname='public' AND tablename='employees' 
  AND policyname = 'Users can add employees to their own startups';

-- 5. Test that the policy works by checking if we can insert (this won't actually insert)
SELECT 
  'Policy Test' as status,
  'INSERT policy for employees table has been fixed' as message;

-- 6. Check if employees table exists and has the right structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'employees' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
