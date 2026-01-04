-- =====================================================
-- ADD PUBLIC READ POLICY FOR MENTOR METRICS
-- =====================================================
-- This allows public pages to read mentor_startup_assignments
-- for calculating metrics (counts only, not full data)
-- =====================================================

-- Add public read policy for mentor_startup_assignments
-- This allows anonymous users to read assignment data for public mentor profiles
DROP POLICY IF EXISTS "Public can read mentor assignments for metrics" ON public.mentor_startup_assignments;

CREATE POLICY "Public can read mentor assignments for metrics" 
ON public.mentor_startup_assignments
FOR SELECT 
TO anon, authenticated
USING (true);

-- Grant SELECT permission to anonymous users
GRANT SELECT ON public.mentor_startup_assignments TO anon;

