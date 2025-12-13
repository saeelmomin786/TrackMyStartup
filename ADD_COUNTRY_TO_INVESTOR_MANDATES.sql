-- =====================================================
-- ADD COUNTRY COLUMN TO INVESTOR MANDATES TABLE
-- =====================================================
-- This migration adds the country column to investor_mandates table
-- This allows Investors to filter startups by country in their mandates

-- Add country column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'investor_mandates' 
        AND column_name = 'country'
    ) THEN
        ALTER TABLE public.investor_mandates 
        ADD COLUMN country VARCHAR(100);
        
        COMMENT ON COLUMN public.investor_mandates.country IS 'Country filter (from general_data table)';
    END IF;
END $$;


