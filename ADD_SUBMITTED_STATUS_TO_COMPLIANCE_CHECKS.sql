-- =====================================================
-- ADD 'SUBMITTED' STATUS TO COMPLIANCE_CHECKS TABLE
-- =====================================================
-- This script updates the CHECK constraints on ca_status and cs_status
-- to include the new 'Submitted' status value
-- =====================================================

-- Step 1: Drop existing CHECK constraints
ALTER TABLE public.compliance_checks 
DROP CONSTRAINT IF EXISTS compliance_checks_ca_status_check;

ALTER TABLE public.compliance_checks 
DROP CONSTRAINT IF EXISTS compliance_checks_cs_status_check;

-- Step 2: Add new CHECK constraints that include 'Submitted'
ALTER TABLE public.compliance_checks 
ADD CONSTRAINT compliance_checks_ca_status_check 
CHECK (ca_status IN ('Pending', 'Submitted', 'Verified', 'Rejected', 'Not Required'));

ALTER TABLE public.compliance_checks 
ADD CONSTRAINT compliance_checks_cs_status_check 
CHECK (cs_status IN ('Pending', 'Submitted', 'Verified', 'Rejected', 'Not Required'));

-- Step 3: Verify the constraints were added
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%compliance_checks%status%'
ORDER BY constraint_name;

-- =====================================================
-- NOTES:
-- - This works for Parent Company, Subsidiaries, and International Operations
-- - The status flow is now: Pending → Submitted → Verified
-- - When a user uploads a document, status changes from Pending to Submitted
-- - When CA/CS verifies, status changes from Submitted to Verified
-- =====================================================

