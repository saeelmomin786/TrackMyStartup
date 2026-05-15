-- FIX: Allow same mentor to be assigned to multiple startups under same facilitator
-- Current constraint prevents this (duplicates at facilitator_code + mentor_user_id level)
-- New constraint should only prevent duplicates at (facilitator_code, mentor_user_id, startup_id) level

-- Step 1: Drop the old incorrect unique constraint
ALTER TABLE facilitator_mentor_assignments
DROP CONSTRAINT IF EXISTS facilitator_code_mentor_user__key;

-- Step 2: Add the correct unique constraint that includes startup_id
ALTER TABLE facilitator_mentor_assignments
ADD CONSTRAINT facilitator_mentor_assignment_unique 
UNIQUE (facilitator_code, mentor_user_id, startup_id, status);

-- Verify the constraint was added
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE table_name = 'facilitator_mentor_assignments'
AND constraint_type = 'UNIQUE';
