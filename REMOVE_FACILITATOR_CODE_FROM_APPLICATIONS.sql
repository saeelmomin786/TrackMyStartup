-- Remove facilitator_code column from opportunity_applications table
-- This undoes the changes made by ADD_FACILITATOR_CODE_TO_APPLICATIONS.sql

-- 1. Drop the index first (required before dropping the column)
DROP INDEX IF EXISTS idx_opportunity_applications_facilitator_code;

-- 2. Drop the facilitator_code column
ALTER TABLE public.opportunity_applications
DROP COLUMN IF EXISTS facilitator_code;

-- 3. Verify the column has been removed
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'opportunity_applications' 
AND table_schema = 'public'
AND column_name = 'facilitator_code';

-- This should return no rows if the column was successfully removed
