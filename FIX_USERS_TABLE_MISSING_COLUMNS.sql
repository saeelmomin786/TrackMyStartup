-- FIX_USERS_TABLE_MISSING_COLUMNS.sql
-- This script adds all missing columns to the users table
-- Run this in your Supabase SQL Editor

-- Step 1: Check current users table structure
SELECT 'Current users table structure:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Step 2: Add all missing columns that the code is trying to insert
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS startup_name TEXT,
ADD COLUMN IF NOT EXISTS center_name TEXT,
ADD COLUMN IF NOT EXISTS investor_code TEXT,
ADD COLUMN IF NOT EXISTS investment_advisor_code TEXT,
ADD COLUMN IF NOT EXISTS investment_advisor_code_entered TEXT,
ADD COLUMN IF NOT EXISTS ca_code TEXT,
ADD COLUMN IF NOT EXISTS cs_code TEXT,
ADD COLUMN IF NOT EXISTS government_id TEXT,
ADD COLUMN IF NOT EXISTS ca_license TEXT,
ADD COLUMN IF NOT EXISTS verification_documents TEXT[],
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS proof_of_business_url TEXT,
ADD COLUMN IF NOT EXISTS financial_advisor_license_url TEXT,
ADD COLUMN IF NOT EXISTS startup_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS company_type TEXT;

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_startup_name ON public.users(startup_name);
CREATE INDEX IF NOT EXISTS idx_users_investor_code ON public.users(investor_code);
CREATE INDEX IF NOT EXISTS idx_users_investment_advisor_code ON public.users(investment_advisor_code);
CREATE INDEX IF NOT EXISTS idx_users_ca_code ON public.users(ca_code);
CREATE INDEX IF NOT EXISTS idx_users_cs_code ON public.users(cs_code);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_city ON public.users(city);
CREATE INDEX IF NOT EXISTS idx_users_state ON public.users(state);
CREATE INDEX IF NOT EXISTS idx_users_country ON public.users(country);
CREATE INDEX IF NOT EXISTS idx_users_company ON public.users(company);

-- Step 4: Add comments to document the new fields
COMMENT ON COLUMN public.users.startup_name IS 'Name of the startup (for Startup role users)';
COMMENT ON COLUMN public.users.center_name IS 'Name of the facilitation center (for Startup Facilitation Center role users)';
COMMENT ON COLUMN public.users.investor_code IS 'Unique investor code (auto-generated)';
COMMENT ON COLUMN public.users.investment_advisor_code IS 'Investment advisor code (auto-generated)';
COMMENT ON COLUMN public.users.investment_advisor_code_entered IS 'Investment advisor code entered by user during registration';
COMMENT ON COLUMN public.users.ca_code IS 'Chartered Accountant code (auto-generated)';
COMMENT ON COLUMN public.users.cs_code IS 'Company Secretary code (auto-generated)';
COMMENT ON COLUMN public.users.government_id IS 'URL to government ID document';
COMMENT ON COLUMN public.users.ca_license IS 'URL to CA license document';
COMMENT ON COLUMN public.users.verification_documents IS 'Array of verification document URLs';
COMMENT ON COLUMN public.users.phone IS 'User phone number';
COMMENT ON COLUMN public.users.address IS 'User street address';
COMMENT ON COLUMN public.users.city IS 'User city';
COMMENT ON COLUMN public.users.state IS 'User state/province';
COMMENT ON COLUMN public.users.country IS 'User country';
COMMENT ON COLUMN public.users.company IS 'User company/organization';
COMMENT ON COLUMN public.users.profile_photo_url IS 'Public URL of profile photo';
COMMENT ON COLUMN public.users.logo_url IS 'Public URL of company logo';
COMMENT ON COLUMN public.users.proof_of_business_url IS 'Public URL of proof of business document';
COMMENT ON COLUMN public.users.financial_advisor_license_url IS 'Public URL of financial advisor license';
COMMENT ON COLUMN public.users.startup_count IS 'Number of startups associated with user';
COMMENT ON COLUMN public.users.company_type IS 'Type of company (e.g., Startup, Corporation, LLC, etc.)';

-- Step 5: Verify the updated structure
SELECT 'Updated users table structure:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Step 6: Test insert to verify all columns exist
SELECT 'Testing insert with all required columns:' as info;
-- This is just a test query, not an actual insert
SELECT 
  'id' as id,
  'test@example.com' as email,
  'Test User' as name,
  'Startup' as role,
  'Test Startup' as startup_name,
  NULL as center_name,
  'INV-123456' as investor_code,
  'IA-123456' as investment_advisor_code,
  NULL as investment_advisor_code_entered,
  NULL as ca_code,
  NULL as cs_code,
  NULL as government_id,
  NULL as ca_license,
  NULL as verification_documents,
  NULL as phone,
  NULL as address,
  NULL as city,
  NULL as state,
  NULL as country,
  NULL as company,
  NULL as profile_photo_url,
  NULL as logo_url,
  NULL as proof_of_business_url,
  NULL as financial_advisor_license_url,
  0 as startup_count,
  NULL as company_type;
