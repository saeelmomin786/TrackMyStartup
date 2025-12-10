-- =====================================================
-- ADD ALLOW_STARTUP_REQUESTS COLUMN TO INVESTOR_PROFILES TABLE
-- =====================================================
-- This script adds an allow_startup_requests column to control whether
-- the investor profile is visible to startups and if startups can send requests

-- Add allow_startup_requests column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'investor_profiles' 
        AND column_name = 'allow_startup_requests'
    ) THEN
        ALTER TABLE public.investor_profiles
        ADD COLUMN allow_startup_requests BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.investor_profiles.allow_startup_requests IS 'Controls whether investor profile is visible to startups and if startups can send pitch requests. Default is true (visible).';





