-- Allow facilitators to update program_name in startups table
-- This is needed when approving recognition records to assign the program

-- Check current UPDATE policies on startups
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'startups'
AND cmd = 'UPDATE'
ORDER BY policyname;

-- Create new policy to allow facilitators to update program_name
CREATE POLICY "facilitators_can_update_program_name"
ON startups
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM recognition_records rr
    JOIN user_profiles u ON u.facilitator_code = rr.facilitator_code
    WHERE rr.startup_id = startups.id
    AND u.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM recognition_records rr
    JOIN user_profiles u ON u.facilitator_code = rr.facilitator_code
    WHERE rr.startup_id = startups.id
    AND u.auth_user_id = auth.uid()
  )
);

-- Verify policy created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'startups'
AND policyname = 'facilitators_can_update_program_name';
