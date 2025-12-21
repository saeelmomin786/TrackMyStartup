-- =====================================================
-- GET THE 19 REMAINING POLICIES
-- =====================================================
-- See what patterns are still in the remaining policies

SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual IS NOT NULL AND qual ILIKE '%FROM users%' THEN 'Has FROM users in qual'
        WHEN qual IS NOT NULL AND qual ILIKE '%users.role%' THEN 'Has users.role in qual'
        WHEN qual IS NOT NULL AND qual ILIKE '%users.id%' THEN 'Has users.id in qual'
        WHEN qual IS NOT NULL AND qual ILIKE '%users.ca_code%' THEN 'Has users.ca_code in qual'
        WHEN qual IS NOT NULL AND qual ILIKE '%users.cs_code%' THEN 'Has users.cs_code in qual'
        ELSE 'Other users reference in qual'
    END as qual_issue,
    CASE 
        WHEN with_check IS NOT NULL AND with_check ILIKE '%FROM users%' THEN 'Has FROM users in with_check'
        WHEN with_check IS NOT NULL AND with_check ILIKE '%users.role%' THEN 'Has users.role in with_check'
        WHEN with_check IS NOT NULL AND with_check ILIKE '%users.id%' THEN 'Has users.id in with_check'
        WHEN with_check IS NOT NULL AND with_check ILIKE '%users.ca_code%' THEN 'Has users.ca_code in with_check'
        WHEN with_check IS NOT NULL AND with_check ILIKE '%users.cs_code%' THEN 'Has users.cs_code in with_check'
        ELSE 'Other users reference in with_check'
    END as with_check_issue,
    LEFT(COALESCE(qual, with_check), 400) as expression_preview
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      (qual IS NOT NULL AND (
          qual ILIKE '%FROM users%'
          OR qual ILIKE '%users.role%'
          OR (qual ILIKE '%users.id%' AND qual NOT ILIKE '%user_profiles%')
          OR qual ILIKE '%users.ca_code%'
          OR qual ILIKE '%users.cs_code%'
      ))
      OR (with_check IS NOT NULL AND (
          with_check ILIKE '%FROM users%'
          OR with_check ILIKE '%users.role%'
          OR (with_check ILIKE '%users.id%' AND with_check NOT ILIKE '%user_profiles%')
          OR with_check ILIKE '%users.ca_code%'
          OR with_check ILIKE '%users.cs_code%'
      ))
  )
ORDER BY tablename, policyname;





