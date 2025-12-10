-- =====================================================
-- ADD DOMAIN COLUMN TO INVESTOR_PROFILES TABLE
-- =====================================================
-- This script adds a domain column to the investor_profiles table
-- to store investment domain preferences (array of domains)

-- Add domain column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'investor_profiles' 
        AND column_name = 'domain'
    ) THEN
        ALTER TABLE public.investor_profiles
        ADD COLUMN domain TEXT[];
    END IF;
END $$;

-- Create index on domain for filtering (using GIN index for array)
CREATE INDEX IF NOT EXISTS idx_investor_profiles_domain ON public.investor_profiles USING GIN(domain);

-- Add comment for documentation
COMMENT ON COLUMN public.investor_profiles.domain IS 'Array of investment domains the investor focuses on (e.g., AI, Healthcare, FinTech, etc.)';




