-- Add currency column to mentor_requests table for consistency
-- This ensures we store the currency used when the request was created

ALTER TABLE mentor_requests 
ADD COLUMN IF NOT EXISTS fee_currency TEXT DEFAULT 'USD';

-- Update comment
COMMENT ON COLUMN mentor_requests.fee_currency IS 'Currency code for fee amounts (USD, INR, EUR, etc.) - matches mentor fee_currency';

