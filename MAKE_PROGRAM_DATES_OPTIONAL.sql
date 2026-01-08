-- =====================================================
-- MAKE PROGRAM DATES OPTIONAL
-- =====================================================
-- This script makes start_date and end_date optional in incubation_programs table

-- Drop existing NOT NULL constraints
ALTER TABLE incubation_programs 
ALTER COLUMN start_date DROP NOT NULL;

ALTER TABLE incubation_programs 
ALTER COLUMN end_date DROP NOT NULL;

-- Verify the changes
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'incubation_programs'
AND column_name IN ('start_date', 'end_date');

