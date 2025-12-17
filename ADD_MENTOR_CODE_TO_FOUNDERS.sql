-- ADD_MENTOR_CODE_TO_FOUNDERS.sql
-- This script adds mentor_code column to founders table if it doesn't exist

-- Add mentor_code column to founders table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'founders' AND column_name = 'mentor_code'
    ) THEN
        ALTER TABLE founders ADD COLUMN mentor_code VARCHAR(20);
        RAISE NOTICE 'Added mentor_code column to founders table';
    ELSE
        RAISE NOTICE 'mentor_code column already exists in founders table';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'founders' 
    AND column_name = 'mentor_code';












