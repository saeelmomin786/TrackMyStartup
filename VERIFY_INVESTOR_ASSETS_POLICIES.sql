-- =====================================================
-- VERIFY INVESTOR ASSETS STORAGE POLICIES
-- =====================================================
-- Run this to check if all policies are created correctly

-- Check all policies for investor-assets bucket
SELECT 
  policyname as "Policy Name",
  cmd as "Operation",
  roles as "Target Roles",
  qual as "USING Expression",
  with_check as "WITH CHECK Expression"
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (
    policyname LIKE '%investor%' 
    OR qual::text LIKE '%investor-assets%'
    OR with_check::text LIKE '%investor-assets%'
  )
ORDER BY 
  CASE cmd
    WHEN 'SELECT' THEN 1
    WHEN 'INSERT' THEN 2
    WHEN 'UPDATE' THEN 3
    WHEN 'DELETE' THEN 4
    ELSE 5
  END,
  policyname;

-- Count policies
SELECT 
  COUNT(*) as "Total Policies Found",
  COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as "SELECT Policies",
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as "INSERT Policies",
  COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as "UPDATE Policies",
  COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as "DELETE Policies"
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (
    policyname LIKE '%investor%' 
    OR qual::text LIKE '%investor-assets%'
    OR with_check::text LIKE '%investor-assets%'
  );

-- Expected policies checklist
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND cmd = 'SELECT'
        AND roles::text LIKE '%public%'
        AND (qual::text LIKE '%investor-assets%' OR policyname LIKE '%investor%')
    ) THEN '✅ Public SELECT policy exists'
    ELSE '❌ Public SELECT policy MISSING'
  END as "Public Read Policy",
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND cmd = 'INSERT'
        AND roles::text LIKE '%authenticated%'
        AND (with_check::text LIKE '%investor-assets%' OR policyname LIKE '%investor%')
    ) THEN '✅ Authenticated INSERT policy exists'
    ELSE '❌ Authenticated INSERT policy MISSING'
  END as "Upload Policy",
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND cmd = 'UPDATE'
        AND roles::text LIKE '%authenticated%'
        AND (qual::text LIKE '%investor-assets%' OR policyname LIKE '%investor%')
    ) THEN '✅ Authenticated UPDATE policy exists'
    ELSE '❌ Authenticated UPDATE policy MISSING'
  END as "Update Policy",
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND cmd = 'DELETE'
        AND roles::text LIKE '%authenticated%'
        AND (qual::text LIKE '%investor-assets%' OR policyname LIKE '%investor%')
    ) THEN '✅ Authenticated DELETE policy exists'
    ELSE '❌ Authenticated DELETE policy MISSING'
  END as "Delete Policy";


