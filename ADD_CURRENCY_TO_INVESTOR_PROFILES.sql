-- Add currency column to investor_profiles table
-- Run this if the table already exists and you need to add the currency field

ALTER TABLE public.investor_profiles
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';

-- Add comment for the new column
COMMENT ON COLUMN public.investor_profiles.currency IS 'Currency code for ticket sizes (USD, EUR, INR, etc.)';


