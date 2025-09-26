-- Add missing columns to recognition_records table
-- This script adds the columns that are being used in the service but missing from the schema

-- Add shares column
ALTER TABLE public.recognition_records 
ADD COLUMN IF NOT EXISTS shares INTEGER;

-- Add price_per_share column
ALTER TABLE public.recognition_records 
ADD COLUMN IF NOT EXISTS price_per_share DECIMAL(15,2);

-- Add investment_amount column
ALTER TABLE public.recognition_records 
ADD COLUMN IF NOT EXISTS investment_amount DECIMAL(15,2);

-- Add post_money_valuation column
ALTER TABLE public.recognition_records 
ADD COLUMN IF NOT EXISTS post_money_valuation DECIMAL(15,2);

-- Create indexes for the new columns for better performance
CREATE INDEX IF NOT EXISTS idx_recognition_records_investment_amount 
ON public.recognition_records(investment_amount);

CREATE INDEX IF NOT EXISTS idx_recognition_records_post_money_valuation 
ON public.recognition_records(post_money_valuation);

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'recognition_records' 
AND column_name IN ('shares', 'price_per_share', 'investment_amount', 'post_money_valuation')
ORDER BY column_name;

-- Show the complete table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'recognition_records' 
ORDER BY ordinal_position;
<<<<<<< HEAD

=======
>>>>>>> aba79bbb99c116b96581e88ab62621652ed6a6b7
