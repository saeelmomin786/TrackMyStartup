-- Fix the root cause: Add UPDATE policy to startup_shares
-- This allows the trigger function to UPDATE existing shares instead of failing and trying to INSERT

-- Drop only the specific conflicting policies from our previous attempts
DROP POLICY IF EXISTS "startup_shares_update" ON startup_shares;
DROP POLICY IF EXISTS "startup_shares_update_by_system" ON startup_shares;
DROP POLICY IF EXISTS "startup_shares_update_by_trigger" ON startup_shares;

-- KEEP "Users can update startup shares" (existing policy)
-- We'll ADD a new policy instead of replacing, so both can work together

-- Create UPDATE policy that allows trigger to update shares
-- This covers updates from:
-- 1. The startup owner (user_id = auth.uid())
-- 2. Facilitators approving recognition records
-- 3. System triggers (founders, investments, mentors changes)
CREATE POLICY "startup_shares_update_comprehensive"
ON startup_shares
FOR UPDATE
TO authenticated
USING (
  -- Allow startup owner to update their shares
  EXISTS (
    SELECT 1 FROM startups s
    WHERE s.id = startup_shares.startup_id
    AND s.user_id = auth.uid()
  )
  OR
  -- Allow facilitator to update shares for their recognized startups
  EXISTS (
    SELECT 1 FROM startups s
    JOIN recognition_records rr ON rr.startup_id = s.id
    JOIN user_profiles u ON u.facilitator_code = rr.facilitator_code
    WHERE s.id = startup_shares.startup_id
    AND u.auth_user_id = auth.uid()
  )
  OR
  -- Allow investors to update shares for startups they've invested in
  EXISTS (
    SELECT 1 FROM startups s
    JOIN investment_records ir ON ir.startup_id = s.id
    JOIN user_profiles u ON u.investor_code = ir.investor_code
    WHERE s.id = startup_shares.startup_id
    AND u.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  -- Same conditions for the updated data
  EXISTS (
    SELECT 1 FROM startups s
    WHERE s.id = startup_shares.startup_id
    AND s.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM startups s
    JOIN recognition_records rr ON rr.startup_id = s.id
    JOIN user_profiles u ON u.facilitator_code = rr.facilitator_code
    WHERE s.id = startup_shares.startup_id
    AND u.auth_user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM startups s
    JOIN investment_records ir ON ir.startup_id = s.id
    JOIN user_profiles u ON u.investor_code = ir.investor_code
    WHERE s.id = startup_shares.startup_id
    AND u.auth_user_id = auth.uid()
  )
);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'startup_shares'
AND policyname = 'startup_shares_update_comprehensive';

-- Test: Check current policies on startup_shares
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'startup_shares'
ORDER BY cmd, policyname;
