-- RENAME_STAGE_TO_ROUND_TYPE_IN_INVESTOR_LIST.sql
-- This script renames the 'stage' column to 'round_type' in the investor_list table

-- Rename the column from 'stage' to 'round_type'
DO $$ 
BEGIN
    -- Check if stage column exists and round_type doesn't exist
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'investor_list' 
        AND column_name = 'stage'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'investor_list' 
        AND column_name = 'round_type'
    ) THEN
        ALTER TABLE public.investor_list
        RENAME COLUMN stage TO round_type;
        
        COMMENT ON COLUMN public.investor_list.round_type IS 'Array of round types (Pre-Seed, Seed, Series A, etc.) from general_data table';
    END IF;
END $$;

-- Verify the column was renamed
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'investor_list'
    AND column_name IN ('stage', 'round_type')
ORDER BY column_name;




