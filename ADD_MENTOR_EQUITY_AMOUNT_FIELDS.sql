-- Add equity amount (ESOP) fields to mentor_profiles table
-- Replaces equity_percentage with min/max equity amount fields

-- Add equity amount columns
ALTER TABLE public.mentor_profiles 
ADD COLUMN IF NOT EXISTS equity_amount_min DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS equity_amount_max DECIMAL(15, 2);

-- Add comments for documentation
COMMENT ON COLUMN public.mentor_profiles.equity_amount_min IS 'Minimum equity amount (ESOP) in specified currency';
COMMENT ON COLUMN public.mentor_profiles.equity_amount_max IS 'Maximum equity amount (ESOP) in specified currency';

-- Optional: Drop the old equity_percentage column if it exists
-- Uncomment the following line if you want to remove the old column:
-- ALTER TABLE public.mentor_profiles DROP COLUMN IF EXISTS equity_percentage;












