-- Comprehensive fix for recognition_records UPDATE policy
-- Drop all existing UPDATE/DELETE policies to start fresh
DROP POLICY IF EXISTS "rr_update_facilitator" ON recognition_records;
DROP POLICY IF EXISTS "recognition_records_update" ON recognition_records;
DROP POLICY IF EXISTS "recognition_records_delete" ON recognition_records;

-- Create a simpler UPDATE policy that allows authenticated facilitators to update their records
CREATE POLICY "recognition_records_update_by_facilitator"
ON recognition_records
FOR UPDATE
TO authenticated
USING (
  -- Allow update if facilitator_code matches current user's facilitator_code
  EXISTS (
    SELECT 1 FROM user_profiles u
    WHERE u.facilitator_code = recognition_records.facilitator_code
    AND u.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  -- Same check for the new row
  EXISTS (
    SELECT 1 FROM user_profiles u
    WHERE u.facilitator_code = recognition_records.facilitator_code
    AND u.auth_user_id = auth.uid()
  )
);

-- Verify policies
SELECT policyname, cmd, qual, with_check FROM pg_policies 
WHERE tablename = 'recognition_records'
ORDER BY policyname;
