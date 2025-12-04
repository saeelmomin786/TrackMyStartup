-- =====================================================
-- UPDATE MENTOR TABLES TO SUPPORT MANUAL ENTRY
-- =====================================================
-- This script updates the mentor tables to allow manual entry
-- of startup names and emails (startup_id can be null)
-- =====================================================

-- Step 1: Make startup_id nullable in mentor_startup_assignments
ALTER TABLE mentor_startup_assignments 
ALTER COLUMN startup_id DROP NOT NULL;

-- Step 2: Update the UNIQUE constraint to handle null values
-- Drop the existing unique constraint
ALTER TABLE mentor_startup_assignments 
DROP CONSTRAINT IF EXISTS mentor_startup_assignments_mentor_id_startup_id_key;

-- Create a new unique constraint that allows multiple nulls
-- (PostgreSQL allows multiple nulls in unique constraints)
CREATE UNIQUE INDEX IF NOT EXISTS mentor_startup_assignments_unique 
ON mentor_startup_assignments(mentor_id, startup_id) 
WHERE startup_id IS NOT NULL;

-- For null startup_id, we'll rely on notes to store the data
-- No unique constraint needed for null startup_id entries

-- Step 3: Make startup_id nullable in mentor_founded_startups
ALTER TABLE mentor_founded_startups 
ALTER COLUMN startup_id DROP NOT NULL;

-- Step 4: Update the UNIQUE constraint for founded startups
ALTER TABLE mentor_founded_startups 
DROP CONSTRAINT IF EXISTS mentor_founded_startups_mentor_id_startup_id_key;

-- Create a new unique constraint that allows multiple nulls
CREATE UNIQUE INDEX IF NOT EXISTS mentor_founded_startups_unique 
ON mentor_founded_startups(mentor_id, startup_id) 
WHERE startup_id IS NOT NULL;

-- Step 4a: Add notes field to mentor_founded_startups to store startup_name and email_id
ALTER TABLE mentor_founded_startups 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Step 5: Verify the changes
SELECT 'Tables updated successfully' as status;
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'mentor_startup_assignments'
AND column_name = 'startup_id';

SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'mentor_founded_startups'
AND column_name = 'startup_id';

-- =====================================================
-- NOTE: 
-- - startup_name and email_id will be stored in the 'notes' field as JSON
-- - Format: {"startup_name": "...", "email_id": "..."}
-- - startup_id can be null for manually entered startups
-- =====================================================

