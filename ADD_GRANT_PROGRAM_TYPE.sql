-- =====================================================
-- ADD GRANT PROGRAM TYPE TO INCUBATION_PROGRAMS
-- =====================================================
-- This script adds 'Grant' as a valid program type for incubation_programs table

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

