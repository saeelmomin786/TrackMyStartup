-- Fix for RLS policy that returns multiple rows in subquery
-- The issue: multiple user_profiles rows per auth_user_id
-- The solution: Use a LIMIT 1 to ensure only one startup_id is returned

DROP POLICY IF EXISTS "startups_can_read_program_questions" ON public.incubation_program_questions;

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
      SELECT startup_id FROM public.user_profiles 
      WHERE auth_user_id = auth.uid()
      LIMIT 1  -- Ensure only one row is returned
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
