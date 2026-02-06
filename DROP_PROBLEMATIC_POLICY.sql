-- =====================================================
-- DROP THE POLICY CAUSING INFINITE RECURSION
-- =====================================================

DROP POLICY IF EXISTS "Startups can view opportunities they applied to" ON public.incubation_opportunities;

-- Verify it's removed
SELECT 
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'incubation_opportunities'
ORDER BY policyname;
