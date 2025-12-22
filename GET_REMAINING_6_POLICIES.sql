-- =====================================================
-- GET THE 6 REMAINING POLICIES
-- =====================================================
-- See what patterns are still in the last 6 policies

SELECT 
    tablename,
    policyname,
    cmd,
    LEFT(qual, 500) as qual_preview,
    LEFT(with_check, 500) as with_check_preview
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      (qual IS NOT NULL AND (
          qual ILIKE '%FROM users%'
          OR qual ILIKE '%users.email%'
          OR qual ILIKE '%users.startup_name%'
          OR qual ILIKE '%users.investor_code%'
          OR qual ILIKE '%users.mentor_code%'
          OR qual ILIKE '%users.role%'
      ))
      OR (with_check IS NOT NULL AND (
          with_check ILIKE '%FROM users%'
          OR with_check ILIKE '%users.email%'
          OR with_check ILIKE '%users.startup_name%'
          OR with_check ILIKE '%users.investor_code%'
          OR with_check ILIKE '%users.mentor_code%'
          OR with_check ILIKE '%users.role%'
      ))
  )
ORDER BY tablename, policyname;









