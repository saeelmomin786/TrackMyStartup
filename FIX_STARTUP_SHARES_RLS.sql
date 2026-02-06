-- Fix startup_shares RLS to allow facilitator to add shares when approving recognition
-- The trigger on recognition_records tries to insert into startup_shares
-- We need to allow this insert with proper authorization

-- First, check existing policies on startup_shares
SELECT policyname, cmd, qual, with_check FROM pg_policies 
WHERE tablename = 'startup_shares'
ORDER BY policyname;

-- Drop old restrictive INSERT policy if it exists
DROP POLICY IF EXISTS "startup_shares_insert_policy" ON startup_shares;
DROP POLICY IF EXISTS "Users can insert own startup shares" ON startup_shares;

-- Create permissive INSERT policy for facilitators approving recognition
-- Allow insert if the startup exists and facilitator is recognized for that startup
CREATE POLICY "startup_shares_insert_by_facilitator"
ON startup_shares
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM startups s
    JOIN recognition_records rr ON rr.startup_id = s.id
    JOIN user_profiles u ON u.facilitator_code = rr.facilitator_code
    WHERE s.id = startup_shares.startup_id
    AND u.auth_user_id = auth.uid()
    AND rr.status = 'approved'
  )
);

-- Verify the policy
SELECT policyname, cmd, qual, with_check FROM pg_policies 
WHERE tablename = 'startup_shares'
ORDER BY policyname;
