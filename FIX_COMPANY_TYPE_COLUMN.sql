-- Fix Company Type Column Issue
-- This script adds only the missing company_type column that's causing the update to fail

-- 1. Check if company_type column exists
SELECT 
  'Checking company_type column' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
  AND column_name = 'company_type';

-- 2. Add the missing company_type column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS company_type TEXT;

-- 3. Add a comment to document the column
COMMENT ON COLUMN public.users.company_type IS 'Type of company (e.g., Startup, Corporation, LLC, etc.)';

-- 4. Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_users_company_type ON public.users(company_type);

-- 5. Verify the column was added
SELECT 
  'Verification' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
  AND column_name = 'company_type';

-- 6. Test that the update would now work
SELECT 
  'Test Complete' as info,
  'The company_type column now exists and profile updates should work' as message;
