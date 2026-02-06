-- Fix for Tracking Questions RLS Policy
-- This allows startups to read questions for programs they've applied to

-- Drop the old policy that was restricting startup access
DROP POLICY IF EXISTS "startups_can_read_program_questions" ON public.incubation_program_questions;

-- Create the corrected policy that allows startups to read questions
-- if they have an application to an opportunity with that program/facilitator
CREATE POLICY "startups_can_read_program_questions"
ON public.incubation_program_questions
FOR SELECT
TO authenticated
USING (
  -- Startup can read questions if they have an application to an opportunity with this program
  EXISTS (
    SELECT 1
    FROM public.opportunity_applications oa
    JOIN public.incubation_opportunities io ON oa.opportunity_id = io.id
    WHERE oa.startup_id = (
      SELECT startup_id FROM public.user_profiles WHERE auth_user_id = auth.uid()
    )
    AND io.facilitator_id = public.incubation_program_questions.facilitator_id
    AND io.program_name = public.incubation_program_questions.program_name
  )
);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename = 'incubation_program_questions'
ORDER BY policyname;
