-- =====================================================
-- FIX RLS POLICIES FOR MENTOR_STARTUP_ASSIGNMENTS
-- =====================================================
-- This allows startups to view their own assignments
-- in the "My Services" section

-- Policy: Startups can view assignments for their startup
DROP POLICY IF EXISTS "Startups can view their assignments" ON public.mentor_startup_assignments;
CREATE POLICY "Startups can view their assignments"
ON public.mentor_startup_assignments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.startups 
        WHERE id = mentor_startup_assignments.startup_id 
        AND user_id = auth.uid()
    )
);

-- Keep existing policies for mentors and admins
-- (These should already exist, but won't be affected by this change)
