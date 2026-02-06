-- Add RLS policies for recognition_records table to allow facilitators to view their records

-- First, check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'recognition_records';

-- Enable RLS if not already enabled
ALTER TABLE recognition_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Facilitators can view their own recognition records" ON recognition_records;
DROP POLICY IF EXISTS "Startups can view their own recognition records" ON recognition_records;
DROP POLICY IF EXISTS "Facilitators can insert recognition records" ON recognition_records;
DROP POLICY IF EXISTS "Startups can insert their own recognition records" ON recognition_records;
DROP POLICY IF EXISTS "Facilitators can update their own recognition records" ON recognition_records;

-- Policy 1: Allow facilitators to view records with their facilitator_code
CREATE POLICY "Facilitators can view their own recognition records"
ON recognition_records
FOR SELECT
TO authenticated
USING (
  -- Match by facilitator_code in the record
  facilitator_code IN (
    SELECT facilitator_code 
    FROM user_profiles 
    WHERE auth_user_id = auth.uid() 
    AND role = 'Startup Facilitation Center'
  )
);

-- Policy 2: Allow startups to view their own recognition records
CREATE POLICY "Startups can view their own recognition records"
ON recognition_records
FOR SELECT
TO authenticated
USING (
  -- Match by startup_id - the startup owns this record
  startup_id IN (
    SELECT id 
    FROM startups 
    WHERE user_id = auth.uid()
  )
);

-- Policy 3: Allow startups to insert their own recognition records
CREATE POLICY "Startups can insert their own recognition records"
ON recognition_records
FOR INSERT
TO authenticated
WITH CHECK (
  startup_id IN (
    SELECT id 
    FROM startups 
    WHERE user_id = auth.uid()
  )
);

-- Policy 4: Allow facilitators to update their own recognition records (for approval)
CREATE POLICY "Facilitators can update their own recognition records"
ON recognition_records
FOR UPDATE
TO authenticated
USING (
  facilitator_code IN (
    SELECT facilitator_code 
    FROM user_profiles 
    WHERE auth_user_id = auth.uid() 
    AND role = 'Startup Facilitation Center'
  )
)
WITH CHECK (
  facilitator_code IN (
    SELECT facilitator_code 
    FROM user_profiles 
    WHERE auth_user_id = auth.uid() 
    AND role = 'Startup Facilitation Center'
  )
);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'recognition_records'
ORDER BY policyname;
