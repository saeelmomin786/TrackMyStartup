-- =====================================================
-- ADD FIRM_NAME COLUMN TO USERS TABLE
-- =====================================================
-- This script adds the firm_name column to the users table
-- for Investment Advisors to store their firm name during registration
-- The firm_name will be displayed everywhere instead of the personal name

-- Step 1: Add firm_name column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS firm_name TEXT;

-- Step 2: Add comment for documentation
COMMENT ON COLUMN public.users.firm_name IS 'Firm/Company name for Investment Advisors. This name will be displayed on the dashboard instead of personal name.';

-- Step 3: Create index for better query performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_users_firm_name ON public.users(firm_name) WHERE firm_name IS NOT NULL;

-- Step 4: Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name = 'firm_name';

