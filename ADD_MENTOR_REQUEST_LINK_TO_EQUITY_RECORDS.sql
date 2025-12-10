-- Add request_id column to mentor_equity_records to link with mentor_requests
-- This allows tracking which mentor request led to the equity allocation

-- Step 1: Add request_id column
ALTER TABLE public.mentor_equity_records 
ADD COLUMN IF NOT EXISTS request_id BIGINT REFERENCES public.mentor_requests(id) ON DELETE SET NULL;

-- Step 2: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_mentor_equity_records_request_id ON public.mentor_equity_records(request_id);

-- Step 3: Verify the change
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'mentor_equity_records'
  AND column_name = 'request_id';














