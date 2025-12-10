-- =====================================================
-- ADD DOMAIN AND STAGE COLUMNS TO ADVISOR ADDED INVESTORS
-- =====================================================
-- This script adds domain and stage columns to the advisor_added_investors table

DO $$
BEGIN
    -- Add domain column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'advisor_added_investors'
        AND column_name = 'domain'
    ) THEN
        ALTER TABLE public.advisor_added_investors
        ADD COLUMN domain TEXT;
    END IF;

    -- Add stage column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'advisor_added_investors'
        AND column_name = 'stage'
    ) THEN
        ALTER TABLE public.advisor_added_investors
        ADD COLUMN stage TEXT;
    END IF;
END $$;




