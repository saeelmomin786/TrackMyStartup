-- =====================================================
-- GET SAMPLE RLS POLICIES TO UNDERSTAND PATTERNS
-- =====================================================
-- This shows examples of policies that reference users
-- Helps understand what needs to be migrated

SELECT 
    tablename,
    policyname,
    cmd as command_type,
    CASE 
        WHEN qual IS NOT NULL AND (qual ILIKE '%users%' OR qual ILIKE '%public.users%') THEN 'qual'
        WHEN with_check IS NOT NULL AND (with_check ILIKE '%users%' OR with_check ILIKE '%public.users%') THEN 'with_check'
        ELSE 'both'
    END as expression_type,
    COALESCE(LEFT(qual, 200), LEFT(with_check, 200)) as policy_expression_preview
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      (qual IS NOT NULL AND (qual ILIKE '%users%' OR qual ILIKE '%public.users%'))
      OR (with_check IS NOT NULL AND (with_check ILIKE '%users%' OR with_check ILIKE '%public.users%'))
  )
ORDER BY tablename, policyname
LIMIT 20;















