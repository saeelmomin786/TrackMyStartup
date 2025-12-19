-- =====================================================
-- DIAGNOSE WHY POLICIES AREN'T BEING UPDATED
-- =====================================================
-- This shows what the script is seeing vs what needs to be fixed

-- Check how many policies match the WHERE clause
SELECT 
    'POLICIES_MATCHING_WHERE_CLAUSE' as check_type,
    COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      (qual IS NOT NULL AND (
          qual ILIKE '%FROM users%'
          OR qual ILIKE '%JOIN users%'
          OR qual ILIKE '%users.id%'
          OR qual ILIKE '%users.role%'
          OR qual ILIKE '%users.ca_code%'
          OR qual ILIKE '%users.cs_code%'
      ))
      OR (with_check IS NOT NULL AND (
          with_check ILIKE '%FROM users%'
          OR with_check ILIKE '%JOIN users%'
          OR with_check ILIKE '%users.id%'
          OR with_check ILIKE '%users.role%'
          OR with_check ILIKE '%users.ca_code%'
          OR with_check ILIKE '%users.cs_code%'
      ))
  )
  AND NOT (
      (qual IS NULL OR (qual NOT ILIKE '%FROM users%' AND qual NOT ILIKE '%JOIN users%' AND qual NOT ILIKE '%users.id%' AND qual NOT ILIKE '%users.role%' AND qual NOT ILIKE '%users.ca_code%' AND qual NOT ILIKE '%users.cs_code%'))
      AND (with_check IS NULL OR (with_check NOT ILIKE '%FROM users%' AND with_check NOT ILIKE '%JOIN users%' AND with_check NOT ILIKE '%users.id%' AND with_check NOT ILIKE '%users.role%' AND with_check NOT ILIKE '%users.ca_code%' AND with_check NOT ILIKE '%users.cs_code%'))
  );

-- Show a sample of what needs to be fixed
SELECT 
    'SAMPLE_POLICY' as check_type,
    tablename,
    policyname,
    CASE 
        WHEN qual IS NOT NULL AND qual ILIKE '%FROM users%' THEN 'Has FROM users in qual'
        WHEN qual IS NOT NULL AND qual ILIKE '%users.id%' THEN 'Has users.id in qual'
        WHEN qual IS NOT NULL AND qual ILIKE '%users.role%' THEN 'Has users.role in qual'
        WHEN with_check IS NOT NULL AND with_check ILIKE '%FROM users%' THEN 'Has FROM users in with_check'
        ELSE 'Other users reference'
    END as issue_type,
    LEFT(COALESCE(qual, with_check), 300) as expression_preview
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      (qual IS NOT NULL AND (
          qual ILIKE '%FROM users%'
          OR qual ILIKE '%JOIN users%'
          OR qual ILIKE '%users.id%'
          OR qual ILIKE '%users.role%'
          OR qual ILIKE '%users.ca_code%'
          OR qual ILIKE '%users.cs_code%'
      ))
      OR (with_check IS NOT NULL AND (
          with_check ILIKE '%FROM users%'
          OR with_check ILIKE '%JOIN users%'
          OR with_check ILIKE '%users.id%'
          OR with_check ILIKE '%users.role%'
          OR with_check ILIKE '%users.ca_code%'
          OR with_check ILIKE '%users.cs_code%'
      ))
  )
  AND NOT (
      (qual IS NULL OR (qual NOT ILIKE '%FROM users%' AND qual NOT ILIKE '%JOIN users%' AND qual NOT ILIKE '%users.id%' AND qual NOT ILIKE '%users.role%' AND qual NOT ILIKE '%users.ca_code%' AND qual NOT ILIKE '%users.cs_code%'))
      AND (with_check IS NULL OR (with_check NOT ILIKE '%FROM users%' AND with_check NOT ILIKE '%JOIN users%' AND with_check NOT ILIKE '%users.id%' AND with_check NOT ILIKE '%users.role%' AND with_check NOT ILIKE '%users.ca_code%' AND with_check NOT ILIKE '%users.cs_code%'))
  )
LIMIT 3;


