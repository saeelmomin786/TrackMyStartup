-- Check all RLS policies on startup_shares table
SELECT 
  policyname,
  cmd,
  qual AS "USING (SELECT condition)",
  with_check AS "WITH CHECK (INSERT/UPDATE condition)"
FROM pg_policies 
WHERE tablename = 'startup_shares'
ORDER BY policyname;

-- Alternative view with more details
SELECT 
  policyname,
  schemaname,
  tablename,
  permissive,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'startup_shares'
ORDER BY policyname;

-- Count total policies
SELECT 
  COUNT(*) as total_policies,
  COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
  COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
  COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies
FROM pg_policies 
WHERE tablename = 'startup_shares';
