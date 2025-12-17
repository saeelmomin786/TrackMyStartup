-- =====================================================
-- VERIFY IF 'SUBMITTED' STATUS MIGRATION HAS BEEN RUN
-- =====================================================
-- Run this to check if the database allows 'Submitted' status
-- =====================================================

-- Check the current constraints
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%compliance_checks%status%'
ORDER BY constraint_name;

-- Try to see what values are currently allowed
-- If you see 'Submitted' in the check_clause, the migration has been run
-- If you DON'T see 'Submitted', you need to run ADD_SUBMITTED_STATUS_TO_COMPLIANCE_CHECKS.sql

-- Test: Try to update a status to 'Submitted' (this will fail if migration hasn't been run)
-- Uncomment the lines below to test (replace 181 with your startup_id and a valid task_id):
/*
UPDATE compliance_checks 
SET ca_status = 'Submitted' 
WHERE startup_id = 181 
AND task_id = 'your-task-id-here'
LIMIT 1;

-- Check if it worked
SELECT ca_status, cs_status, task_id 
FROM compliance_checks 
WHERE startup_id = 181 
LIMIT 5;
*/

