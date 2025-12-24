-- =====================================================
-- GET FULL EXPRESSIONS OF REMAINING POLICIES
-- =====================================================
-- This shows complete expressions to identify what patterns we're missing

SELECT 
    tablename,
    policyname,
    cmd,
    qual as full_qual_expression,
    with_check as full_with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      (qual IS NOT NULL AND (
          qual ILIKE '%FROM users%'
          OR qual ILIKE '%JOIN users%'
          OR (qual ILIKE '%users%' AND qual NOT ILIKE '%user_profiles%')
      ))
      OR (with_check IS NOT NULL AND (
          with_check ILIKE '%FROM users%'
          OR with_check ILIKE '%JOIN users%'
          OR (with_check ILIKE '%users%' AND with_check NOT ILIKE '%user_profiles%')
      ))
  )
ORDER BY tablename, policyname
LIMIT 5;















