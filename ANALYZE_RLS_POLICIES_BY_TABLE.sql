-- =====================================================
-- ANALYZE RLS POLICIES BY TABLE
-- =====================================================
-- This shows which tables have the most policies referencing users
-- Helps prioritize migration

SELECT 
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ' ORDER BY policyname) as policy_names
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      (qual IS NOT NULL AND (qual ILIKE '%users%' OR qual ILIKE '%public.users%'))
      OR (with_check IS NOT NULL AND (with_check ILIKE '%users%' OR with_check ILIKE '%public.users%'))
  )
GROUP BY tablename
ORDER BY COUNT(*) DESC;















