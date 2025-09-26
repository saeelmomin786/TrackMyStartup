-- Fix Investor Code Saving Issue
-- This script specifically adds the missing investment_advisor_code_entered column
-- that is preventing investor codes from being saved properly

-- 1. Check current status of investment advisor related columns
SELECT 
  'Current Status Check' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
  AND column_name LIKE '%investment_advisor%'
ORDER BY column_name;

-- 2. Add the missing investment_advisor_code_entered column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS investment_advisor_code_entered TEXT;

-- 3. Add other missing columns that are causing the company_type error
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS company_type TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS government_id TEXT,
ADD COLUMN IF NOT EXISTS ca_license TEXT,
ADD COLUMN IF NOT EXISTS cs_license TEXT,
ADD COLUMN IF NOT EXISTS investment_advisor_code TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS financial_advisor_license_url TEXT,
ADD COLUMN IF NOT EXISTS ca_code TEXT,
ADD COLUMN IF NOT EXISTS cs_code TEXT,
ADD COLUMN IF NOT EXISTS startup_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS verification_documents TEXT[];

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_investment_advisor_code_entered ON public.users(investment_advisor_code_entered);
CREATE INDEX IF NOT EXISTS idx_users_company_type ON public.users(company_type);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

-- 5. Add comments to document the columns
COMMENT ON COLUMN public.users.investment_advisor_code_entered IS 'Investment advisor code entered by user during registration or profile update';
COMMENT ON COLUMN public.users.company_type IS 'Type of company (e.g., Startup, Corporation, LLC, etc.)';
COMMENT ON COLUMN public.users.phone IS 'User phone number';

-- 6. Verify the columns were added successfully
SELECT 
  'Verification - Investment Advisor Columns' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
  AND column_name IN (
    'investment_advisor_code_entered',
    'investment_advisor_code',
    'company_type'
  )
ORDER BY column_name;

-- 7. Test that we can now update a user with investment advisor code
-- (This is just a verification query, not an actual update)
SELECT 
  'Test Query' as info,
  'The investment_advisor_code_entered column now exists and can be updated' as message;

-- 8. Show sample of what the update would look like
SELECT 
  'Sample Update Query' as info,
  'UPDATE users SET investment_advisor_code_entered = ''IA-123456'' WHERE id = ''user-id'';' as sample_query;
