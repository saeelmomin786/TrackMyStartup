-- ADD_ONE_PAGER_URL_TO_FUNDRAISING.sql
-- This script adds the one_pager_url column to the fundraising_details table

-- Add the one_pager_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'fundraising_details' 
        AND column_name = 'one_pager_url'
    ) THEN
        ALTER TABLE fundraising_details 
        ADD COLUMN one_pager_url TEXT;
        
        RAISE NOTICE 'Column one_pager_url added successfully to fundraising_details table';
    ELSE
        RAISE NOTICE 'Column one_pager_url already exists in fundraising_details table';
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
    AND column_name = 'one_pager_url';

-- Refresh PostgREST schema cache (if using PostgREST)
-- This ensures the API immediately recognizes the new column
NOTIFY pgrst, 'reload schema';

