-- Add request_id column WITHOUT foreign key constraint first
-- This is safer if mentor_requests table doesn't exist yet

-- Step 1: Add request_id column without foreign key
ALTER TABLE public.mentor_equity_records 
ADD COLUMN IF NOT EXISTS request_id BIGINT;

-- Step 2: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mentor_equity_records_request_id 
ON public.mentor_equity_records(request_id);

-- Step 3: Verify the column was added
SELECT 
    'Verification' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'mentor_equity_records'
  AND column_name = 'request_id';

-- Step 4: Add foreign key constraint if mentor_requests table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'mentor_requests'
    ) THEN
        -- Add foreign key constraint
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'mentor_equity_records_request_id_fkey'
            AND table_name = 'mentor_equity_records'
        ) THEN
            ALTER TABLE public.mentor_equity_records 
            ADD CONSTRAINT mentor_equity_records_request_id_fkey 
            FOREIGN KEY (request_id) 
            REFERENCES public.mentor_requests(id) 
            ON DELETE SET NULL;
            
            RAISE NOTICE 'Foreign key constraint added successfully';
        ELSE
            RAISE NOTICE 'Foreign key constraint already exists';
        END IF;
    ELSE
        RAISE NOTICE 'mentor_requests table does not exist. Column added without foreign key.';
        RAISE NOTICE 'You can add the foreign key later after creating mentor_requests table.';
    END IF;
END $$;














