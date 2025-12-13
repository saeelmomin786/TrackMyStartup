-- =====================================================
-- ADD COUNTRY COLUMN TO ADVISOR MANDATES TABLE
-- =====================================================
-- This migration adds the country column to advisor_mandates table
-- This allows Investment Advisors to filter startups by country in their mandates

-- Add country column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'advisor_mandates' 
        AND column_name = 'country'
    ) THEN
        ALTER TABLE public.advisor_mandates 
        ADD COLUMN country VARCHAR(100);
        
        COMMENT ON COLUMN public.advisor_mandates.country IS 'Country filter (from general_data table)';
    END IF;
END $$;


