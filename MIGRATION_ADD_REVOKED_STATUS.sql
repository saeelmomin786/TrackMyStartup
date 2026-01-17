-- Migration: Add 'revoked' status to due_diligence_requests CHECK constraint

-- Drop the existing constraint
ALTER TABLE public.due_diligence_requests
DROP CONSTRAINT due_diligence_requests_status_check;

-- Add new constraint with 'revoked' status included
ALTER TABLE public.due_diligence_requests
ADD CONSTRAINT due_diligence_requests_status_check 
CHECK (status IN ('pending', 'paid', 'completed', 'failed', 'revoked'));

-- Verify the constraint was updated
SELECT constraint_name, constraint_definition 
FROM information_schema.table_constraints 
WHERE table_name = 'due_diligence_requests' 
AND constraint_type = 'CHECK';
