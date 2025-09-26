-- Fix Investor Code Issue - Add Missing Columns to Users Table
-- This script adds the missing columns that are causing the "company_type" error
-- when trying to update user profiles with investor codes

-- 1. Add missing profile columns to users table
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
ADD COLUMN IF NOT EXISTS investment_advisor_code_entered TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS financial_advisor_license_url TEXT,
ADD COLUMN IF NOT EXISTS ca_code TEXT,
ADD COLUMN IF NOT EXISTS cs_code TEXT,
ADD COLUMN IF NOT EXISTS startup_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS verification_documents TEXT[];

-- 2. Create indexes for better performance on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_users_company_type ON public.users(company_type);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_city ON public.users(city);
CREATE INDEX IF NOT EXISTS idx_users_state ON public.users(state);
CREATE INDEX IF NOT EXISTS idx_users_country ON public.users(country);
CREATE INDEX IF NOT EXISTS idx_users_company ON public.users(company);
CREATE INDEX IF NOT EXISTS idx_users_investment_advisor_code ON public.users(investment_advisor_code);

-- 3. Add comments to document the new fields
COMMENT ON COLUMN public.users.company_type IS 'Type of company (e.g., Startup, Corporation, LLC, etc.)';
COMMENT ON COLUMN public.users.phone IS 'User phone number';
COMMENT ON COLUMN public.users.address IS 'User street address';
COMMENT ON COLUMN public.users.city IS 'User city';
COMMENT ON COLUMN public.users.state IS 'User state/province';
COMMENT ON COLUMN public.users.country IS 'User country';
COMMENT ON COLUMN public.users.company IS 'User company/organization name';
COMMENT ON COLUMN public.users.profile_photo_url IS 'Public URL of profile photo';
COMMENT ON COLUMN public.users.government_id IS 'URL to government ID document';
COMMENT ON COLUMN public.users.ca_license IS 'URL to CA license document';
COMMENT ON COLUMN public.users.cs_license IS 'URL to CS license document';
COMMENT ON COLUMN public.users.investment_advisor_code IS 'System-generated investment advisor code';
COMMENT ON COLUMN public.users.investment_advisor_code_entered IS 'User-entered investment advisor code';
COMMENT ON COLUMN public.users.logo_url IS 'Public URL of company logo';
COMMENT ON COLUMN public.users.financial_advisor_license_url IS 'URL to financial advisor license document';
COMMENT ON COLUMN public.users.ca_code IS 'CA code for the user';
COMMENT ON COLUMN public.users.cs_code IS 'CS code for the user';
COMMENT ON COLUMN public.users.startup_count IS 'Number of startups associated with this user';
COMMENT ON COLUMN public.users.verification_documents IS 'Array of URLs to verification documents';

-- 4. Update RLS policies to allow users to update their own profile
-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can select their own profile" ON public.users;

-- Allow users to update their own profile information
CREATE POLICY "Users can update their own profile" ON public.users
FOR UPDATE USING (auth.uid()::text = id::text);

-- Allow users to select their own profile information
CREATE POLICY "Users can select their own profile" ON public.users
FOR SELECT USING (auth.uid()::text = id::text);

-- 5. Verify the new structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name IN (
    'company_type', 'phone', 'address', 'city', 'state', 'country', 
    'company', 'profile_photo_url', 'government_id', 'ca_license', 
    'cs_license', 'investment_advisor_code', 'investment_advisor_code_entered',
    'logo_url', 'financial_advisor_license_url', 'ca_code', 'cs_code',
    'startup_count', 'verification_documents'
  )
ORDER BY column_name;

-- 6. Test the fix by checking if we can now update a user profile
-- (This is just a verification query, not an actual update)
SELECT 
  'Database schema updated successfully. The company_type column and other missing columns have been added.' as status,
  COUNT(*) as total_columns_added
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name IN (
    'company_type', 'phone', 'address', 'city', 'state', 'country', 
    'company', 'profile_photo_url', 'government_id', 'ca_license', 
    'cs_license', 'investment_advisor_code', 'investment_advisor_code_entered',
    'logo_url', 'financial_advisor_license_url', 'ca_code', 'cs_code',
    'startup_count', 'verification_documents'
  );
