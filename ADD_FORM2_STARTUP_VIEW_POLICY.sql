-- =====================================================
-- ADD RLS POLICY FOR STARTUPS TO VIEW FORM 2 OPPORTUNITIES
-- =====================================================
-- This migration adds a policy allowing startups to view
-- opportunity details for opportunities they have applications for
-- This is needed so they can view Form 2 questions and submit Form 2 responses

-- =====================================================
-- STEP 1: Add RLS Policy to incubation_opportunities
-- =====================================================

-- Drop existing policy if it exists (optional - uncomment if needed)
-- DROP POLICY IF EXISTS "Startups can view opportunities they applied to" ON public.incubation_opportunities;

-- Policy: Startups can view opportunities they have applied to
CREATE POLICY "Startups can view opportunities they applied to"
  ON public.incubation_opportunities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.opportunity_applications oa
      JOIN public.startups s ON oa.startup_id = s.id
      WHERE oa.opportunity_id = incubation_opportunities.id
        AND s.user_id = auth.uid()
    )
  );

-- =====================================================
-- STEP 2: Verify RLS Policy was created
-- =====================================================

SELECT 
  tablename,
  policyname,
  cmd,
  qual IS NOT NULL as has_using_clause
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'incubation_opportunities'
  AND policyname LIKE '%applied to%';
