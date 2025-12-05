-- Add fee structure fields to mentor_profiles table

-- Add fee-related columns
ALTER TABLE public.mentor_profiles 
ADD COLUMN IF NOT EXISTS fee_type TEXT,
ADD COLUMN IF NOT EXISTS fee_amount_min DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS fee_amount_max DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS fee_currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS fee_description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.mentor_profiles.fee_type IS 'Type of fee: Hourly, Monthly, Project-based, Equity-based, Free, Negotiable, Other';
COMMENT ON COLUMN public.mentor_profiles.fee_amount_min IS 'Minimum fee amount in specified currency';
COMMENT ON COLUMN public.mentor_profiles.fee_amount_max IS 'Maximum fee amount in specified currency';
COMMENT ON COLUMN public.mentor_profiles.fee_currency IS 'Currency code for fee amounts (USD, INR, EUR, etc.)';
COMMENT ON COLUMN public.mentor_profiles.fee_description IS 'Additional details about fee structure and payment terms';



