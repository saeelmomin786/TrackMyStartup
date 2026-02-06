-- Fix recognition_records UPDATE RLS policy to use auth_user_id
-- The policy was blocking facilitators from updating status to 'approved'

DROP POLICY IF EXISTS "rr_update_facilitator" ON recognition_records;

-- Recreate UPDATE policy with correct auth_user_id reference
CREATE POLICY "rr_update_facilitator"
ON recognition_records
FOR UPDATE
TO authenticated
USING (
  facilitator_code = (
    SELECT u.facilitator_code 
    FROM user_profiles u
    WHERE u.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  facilitator_code = (
    SELECT u.facilitator_code 
    FROM user_profiles u
    WHERE u.auth_user_id = auth.uid()
  )
);

-- Verify the policy was created
SELECT policyname, qual, with_check FROM pg_policies 
WHERE tablename = 'recognition_records' 
AND policyname = 'rr_update_facilitator';

-- Test: try to update a recognition record
-- SELECT * FROM recognition_records WHERE id = 50 LIMIT 1;
