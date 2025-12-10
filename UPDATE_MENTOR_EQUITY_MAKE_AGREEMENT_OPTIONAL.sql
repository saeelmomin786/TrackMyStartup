-- Update mentor_equity_records table to make signed_agreement_url optional
-- This script alters the existing table if it was created with NOT NULL constraint

-- Step 1: Make signed_agreement_url nullable
ALTER TABLE public.mentor_equity_records 
ALTER COLUMN signed_agreement_url DROP NOT NULL;

-- Step 2: Verify the change
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'mentor_equity_records'
  AND column_name = 'signed_agreement_url';














