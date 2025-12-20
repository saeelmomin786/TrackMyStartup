-- =====================================================
-- UPDATE MENTOR REQUESTS TABLE FOR CONNECTION FLOW
-- =====================================================
-- Adds fields for fee/equity negotiation and negotiation status

-- Add proposed amounts from startup
ALTER TABLE mentor_requests 
ADD COLUMN IF NOT EXISTS proposed_fee_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS proposed_equity_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS proposed_esop_percentage DECIMAL(5, 2);

-- Add negotiated amounts from mentor
ALTER TABLE mentor_requests 
ADD COLUMN IF NOT EXISTS negotiated_fee_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS negotiated_equity_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS negotiated_esop_percentage DECIMAL(5, 2);

-- Update status to include 'negotiating'
ALTER TABLE mentor_requests 
DROP CONSTRAINT IF EXISTS mentor_requests_status_check;

ALTER TABLE mentor_requests 
ADD CONSTRAINT mentor_requests_status_check 
CHECK (status IN ('pending', 'negotiating', 'accepted', 'rejected', 'cancelled'));

-- Set default status if not exists
ALTER TABLE mentor_requests 
ALTER COLUMN status SET DEFAULT 'pending';


