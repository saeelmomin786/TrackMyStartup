-- =====================================================
-- COMPLETE CRM UPDATES FOR GRANT/INCUBATION PROGRAMS
-- =====================================================
-- Run these queries in order to update your database
-- for the new CRM grant/incubation program features

-- =====================================================
-- STEP 1: ADD GRANT PROGRAM TYPE
-- =====================================================
-- This adds 'Grant' as a valid program type for incubation_programs table

-- Drop the existing check constraint
ALTER TABLE incubation_programs 
DROP CONSTRAINT IF EXISTS incubation_programs_program_type_check;

-- Add the new check constraint with 'Grant' included
ALTER TABLE incubation_programs 
ADD CONSTRAINT incubation_programs_program_type_check 
CHECK (program_type IN ('Grant', 'Incubation', 'Acceleration', 'Mentorship', 'Bootcamp'));

-- Verify the constraint was added
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'incubation_programs'::regclass
AND conname = 'incubation_programs_program_type_check';

-- =====================================================
-- STEP 2: MAKE PROGRAM DATES OPTIONAL
-- =====================================================
-- This makes start_date and end_date optional in incubation_programs table

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

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this to verify all changes were applied correctly

SELECT 
    'Program Types' AS check_type,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'incubation_programs'::regclass
AND conname = 'incubation_programs_program_type_check'

UNION ALL

SELECT 
    'Date Columns' AS check_type,
    column_name AS constraint_name,
    CASE 
        WHEN is_nullable = 'YES' THEN 'NULLABLE (Optional)'
        ELSE 'NOT NULL (Required)'
    END AS constraint_definition
FROM information_schema.columns
WHERE table_name = 'incubation_programs'
AND column_name IN ('start_date', 'end_date');

