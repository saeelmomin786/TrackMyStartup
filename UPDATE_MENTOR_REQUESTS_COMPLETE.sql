-- =====================================================
-- UPDATE MENTOR_REQUESTS TABLE FOR COMPLETE CONNECTION FLOW
-- =====================================================
-- Adds fields for fee/equity negotiation and proposed amounts

-- Add proposed amounts from startup
ALTER TABLE mentor_requests 
ADD COLUMN IF NOT EXISTS proposed_fee_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS proposed_equity_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS proposed_esop_percentage DECIMAL(5, 2);

-- Add negotiated amounts from mentor (counter-proposal)
ALTER TABLE mentor_requests 
ADD COLUMN IF NOT EXISTS negotiated_fee_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS negotiated_equity_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS negotiated_esop_percentage DECIMAL(5, 2);

-- Update status constraint to include 'negotiating'
ALTER TABLE mentor_requests 
DROP CONSTRAINT IF EXISTS mentor_requests_status_check;

ALTER TABLE mentor_requests 
ADD CONSTRAINT mentor_requests_status_check 
CHECK (status IN ('pending', 'negotiating', 'accepted', 'rejected', 'cancelled'));

-- Set default status if not exists
ALTER TABLE mentor_requests 
ALTER COLUMN status SET DEFAULT 'pending';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_mentor_requests_status 
ON mentor_requests(mentor_id, status) 
WHERE status IN ('pending', 'negotiating');

-- Add index for startup requests
CREATE INDEX IF NOT EXISTS idx_mentor_requests_startup 
ON mentor_requests(startup_id, status) 
WHERE requester_type = 'Startup';

