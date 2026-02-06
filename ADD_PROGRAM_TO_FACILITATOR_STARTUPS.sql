-- Add program_name column to facilitator_startups table
-- This will track which program each startup is assigned to

-- Add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'facilitator_startups' 
        AND column_name = 'program_name'
    ) THEN
        ALTER TABLE public.facilitator_startups 
        ADD COLUMN program_name TEXT;
        
        RAISE NOTICE 'Added program_name column to facilitator_startups table';
    ELSE
        RAISE NOTICE 'program_name column already exists';
    END IF;
END $$;

-- Create an index for better performance when filtering by program
CREATE INDEX IF NOT EXISTS idx_facilitator_startups_program_name 
ON public.facilitator_startups(program_name);

-- Show the updated table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'facilitator_startups'
ORDER BY ordinal_position;
