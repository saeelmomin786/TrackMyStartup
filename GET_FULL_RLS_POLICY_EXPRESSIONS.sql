-- =====================================================
-- GET FULL RLS POLICY EXPRESSIONS
-- =====================================================
-- This shows the complete policy expressions to understand exact format

SELECT 
    tablename,
    policyname,
    cmd,
    qual as full_qual_expression,
    with_check as full_with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      (qual IS NOT NULL AND (qual ILIKE '%users%' OR qual ILIKE '%public.users%'))
      OR (with_check IS NOT NULL AND (with_check ILIKE '%users%' OR with_check ILIKE '%public.users%'))
  )
ORDER BY tablename, policyname
LIMIT 10;















