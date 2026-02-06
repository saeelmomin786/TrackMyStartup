-- Fix RLS policies for recognition_records to use auth_user_id instead of id

-- Drop the broken facilitator policies
DROP POLICY IF EXISTS "Facilitators can view records where they are facilitator" ON recognition_records;
DROP POLICY IF EXISTS "rr_update_facilitator" ON recognition_records;

-- Recreate with correct auth_user_id check
CREATE POLICY "Facilitators can view records where they are facilitator"
ON recognition_records
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_profiles u
    WHERE u.facilitator_code = recognition_records.facilitator_code
    AND u.auth_user_id = auth.uid()  -- FIXED: use auth_user_id instead of id
  )
);

CREATE POLICY "rr_update_facilitator"
ON recognition_records
FOR UPDATE
TO authenticated
USING (
  facilitator_code = (
    SELECT u.facilitator_code
    FROM user_profiles u
    WHERE u.auth_user_id = auth.uid()  -- FIXED: use auth_user_id instead of id
  )
)
WITH CHECK (
  facilitator_code = (
    SELECT u.facilitator_code
    FROM user_profiles u
    WHERE u.auth_user_id = auth.uid()  -- FIXED: use auth_user_id instead of id
  )
);

-- Verify the fix
SELECT 
    policyname as "Policy_Name",
    cmd as "Command",
    qual as "USING_Condition"
FROM pg_policies
WHERE tablename = 'recognition_records'
AND policyname IN ('Facilitators can view records where they are facilitator', 'rr_update_facilitator')
ORDER BY policyname;
