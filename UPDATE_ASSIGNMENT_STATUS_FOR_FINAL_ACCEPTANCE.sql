-- =====================================================
-- UPDATE ASSIGNMENT STATUS FOR FINAL ACCEPTANCE FLOW
-- =====================================================
-- Add 'ready_for_activation' status for assignments waiting for mentor's final acceptance

-- Update status CHECK constraint to include 'ready_for_activation'
ALTER TABLE public.mentor_startup_assignments 
DROP CONSTRAINT IF EXISTS mentor_startup_assignments_status_check;

ALTER TABLE public.mentor_startup_assignments
ADD CONSTRAINT mentor_startup_assignments_status_check 
CHECK (status IN (
    'active', 
    'completed', 
    'cancelled',
    'pending_payment',
    'pending_agreement',
    'pending_payment_and_agreement',
    'ready_for_activation'
));
