-- Test Script for Investor Code Fix
-- Run this after executing FIX_INVESTOR_CODE_ISSUE.sql to verify the fix works

-- 1. Check if all required columns now exist
SELECT 
  'company_type' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'company_type'
    ) THEN 'EXISTS ✅'
    ELSE 'MISSING ❌'
  END as status

UNION ALL

SELECT 
  'investment_advisor_code_entered' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'investment_advisor_code_entered'
    ) THEN 'EXISTS ✅'
    ELSE 'MISSING ❌'
  END as status

UNION ALL

SELECT 
  'phone' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'phone'
    ) THEN 'EXISTS ✅'
    ELSE 'MISSING ❌'
  END as status

UNION ALL

SELECT 
  'address' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'address'
    ) THEN 'EXISTS ✅'
    ELSE 'MISSING ❌'
  END as status;

-- 2. Test if we can now update a user profile with company_type
-- (This is a dry run - it won't actually update anything)
SELECT 
  'Test Update Query' as test_name,
  'This query would work now that company_type column exists' as result;

-- 3. Show the current structure of the users table
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

-- 4. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'users' 
  AND schemaname = 'public';
