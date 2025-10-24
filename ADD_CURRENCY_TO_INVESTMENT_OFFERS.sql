-- Add currency column to investment_offers table
-- Run this in Supabase SQL Editor

-- Add currency column to investment_offers table
ALTER TABLE public.investment_offers 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Add comment to document the column
COMMENT ON COLUMN public.investment_offers.currency IS 'Currency code for the investment offer (USD, EUR, GBP, INR, etc.)';

-- Update existing records to have USD as default
UPDATE public.investment_offers 
SET currency = 'USD' 
WHERE currency IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'investment_offers' 
AND column_name = 'currency';

