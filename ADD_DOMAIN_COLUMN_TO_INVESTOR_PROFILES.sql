-- Add missing columns to investor_profiles table
-- This script adds the 'domain' column and other missing fields

-- Check if domain column exists, if not add it
ALTER TABLE public.investor_profiles
ADD COLUMN IF NOT EXISTS domain TEXT[];

-- Add index on domain for filtering (using GIN index for array)
CREATE INDEX IF NOT EXISTS idx_investor_profiles_domain ON public.investor_profiles USING GIN(domain);

-- Add comment for documentation
COMMENT ON COLUMN public.investor_profiles.domain IS 'Array of investment domains/sectors the investor focuses on (e.g., Agriculture, AI, Climate, E-commerce, etc.)';

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'investor_profiles'
ORDER BY ordinal_position;
