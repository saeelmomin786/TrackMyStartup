-- =====================================================
-- CHECK CURRENT STATE OF POLICIES
-- =====================================================
-- See what patterns are currently in policies

SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual IS NOT NULL AND qual ILIKE '%FROM users%' THEN 'Has FROM users'
        WHEN qual IS NOT NULL AND qual ILIKE '%JOIN users%' THEN 'Has JOIN users'
        WHEN qual IS NOT NULL AND qual ILIKE '%users.investor_code%' THEN 'Has users.investor_code'
        WHEN qual IS NOT NULL AND qual ILIKE '%users.role%' THEN 'Has users.role'
        WHEN qual IS NOT NULL AND qual ILIKE '%users.mentor_code%' THEN 'Has users.mentor_code'
        WHEN qual IS NOT NULL AND qual ILIKE '%users.id%' THEN 'Has users.id'
        WHEN qual IS NOT NULL AND qual ILIKE '%users.email%' THEN 'Has users.email'
        ELSE 'Other'
    END as qual_issue,
    CASE 
        WHEN with_check IS NOT NULL AND with_check ILIKE '%FROM users%' THEN 'Has FROM users'
        WHEN with_check IS NOT NULL AND with_check ILIKE '%JOIN users%' THEN 'Has JOIN users'
        WHEN with_check IS NOT NULL AND with_check ILIKE '%users.investor_code%' THEN 'Has users.investor_code'
        WHEN with_check IS NOT NULL AND with_check ILIKE '%users.role%' THEN 'Has users.role'
        WHEN with_check IS NOT NULL AND with_check ILIKE '%users.mentor_code%' THEN 'Has users.mentor_code'
        WHEN with_check IS NOT NULL AND with_check ILIKE '%users.id%' THEN 'Has users.id'
        WHEN with_check IS NOT NULL AND with_check ILIKE '%users.email%' THEN 'Has users.email'
        ELSE 'Other'
    END as with_check_issue,
    LEFT(COALESCE(qual, with_check), 300) as expression_preview
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      (qual IS NOT NULL AND (
          qual ILIKE '%FROM users%'
          OR qual ILIKE '%JOIN users%'
          OR qual ILIKE '%users.investor_code%'
          OR qual ILIKE '%users.role%'
          OR qual ILIKE '%users.mentor_code%'
          OR qual ILIKE '%users.id%'
          OR qual ILIKE '%users.email%'
      ))
      OR (with_check IS NOT NULL AND (
          with_check ILIKE '%FROM users%'
          OR with_check ILIKE '%JOIN users%'
          OR with_check ILIKE '%users.investor_code%'
          OR with_check ILIKE '%users.role%'
          OR with_check ILIKE '%users.mentor_code%'
          OR with_check ILIKE '%users.id%'
          OR with_check ILIKE '%users.email%'
      ))
  )
ORDER BY tablename, policyname;











