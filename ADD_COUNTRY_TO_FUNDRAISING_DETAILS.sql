-- ADD_COUNTRY_TO_FUNDRAISING_DETAILS.sql
-- This script adds a country column to the fundraising_details table

-- Add country column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'fundraising_details' 
        AND column_name = 'country'
    ) THEN
        ALTER TABLE public.fundraising_details
        ADD COLUMN country TEXT;
        
        COMMENT ON COLUMN public.fundraising_details.country IS 'Country from general_data table (optional)';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'fundraising_details'
    AND column_name = 'country';


