-- =====================================================
-- ADD RLS POLICY FOR STARTUPS TO UPDATE ASSIGNMENTS
-- =====================================================
-- This allows startups to update agreement_url and agreement_status
-- when uploading agreements for their mentor assignments
-- =====================================================

-- Policy: Startups can update their assignments (for agreement upload)
DROP POLICY IF EXISTS "Startups can update their assignments" ON public.mentor_startup_assignments;

CREATE POLICY "Startups can update their assignments"
ON public.mentor_startup_assignments
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.startups 
        WHERE id = mentor_startup_assignments.startup_id 
        AND user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.startups 
        WHERE id = mentor_startup_assignments.startup_id 
        AND user_id = auth.uid()
    )
);

-- Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'mentor_startup_assignments'
AND policyname = 'Startups can update their assignments';
