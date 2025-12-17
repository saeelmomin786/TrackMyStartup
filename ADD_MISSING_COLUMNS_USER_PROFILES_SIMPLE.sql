-- =====================================================
-- ADD MISSING COLUMNS TO user_profiles TABLE (SIMPLE VERSION)
-- =====================================================
-- This script adds the specific columns that the code tries to update
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Add all columns that CompleteRegistrationPage.tsx tries to update
ALTER TABLE public.user_profiles 
-- Service codes (from Form 2)
ADD COLUMN IF NOT EXISTS ca_service_code TEXT,
ADD COLUMN IF NOT EXISTS cs_service_code TEXT,

-- Additional fields that might be missing
ADD COLUMN IF NOT EXISTS advisor_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS startup_count INTEGER DEFAULT 0;

-- Verify the columns were added
SELECT 
    '✅ Columns Added' as status,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
  AND column_name IN ('ca_service_code', 'cs_service_code', 'advisor_accepted', 'startup_count')
ORDER BY column_name;

-- Check what columns the code is trying to update vs what exists
SELECT 
    'Column Check' as info,
    'government_id' as column_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profiles' 
          AND column_name = 'government_id'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
    'Column Check',
    'ca_license',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profiles' 
          AND column_name = 'ca_license'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'Column Check',
    'verification_documents',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profiles' 
          AND column_name = 'verification_documents'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'Column Check',
    'logo_url',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profiles' 
          AND column_name = 'logo_url'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'Column Check',
    'financial_advisor_license_url',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profiles' 
          AND column_name = 'financial_advisor_license_url'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'Column Check',
    'center_name',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profiles' 
          AND column_name = 'center_name'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'Column Check',
    'country',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profiles' 
          AND column_name = 'country'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'Column Check',
    'company_type',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profiles' 
          AND column_name = 'company_type'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'Column Check',
    'registration_date',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profiles' 
          AND column_name = 'registration_date'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'Column Check',
    'currency',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profiles' 
          AND column_name = 'currency'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'Column Check',
    'ca_service_code',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profiles' 
          AND column_name = 'ca_service_code'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'Column Check',
    'cs_service_code',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profiles' 
          AND column_name = 'cs_service_code'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'Column Check',
    'investment_advisor_code_entered',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profiles' 
          AND column_name = 'investment_advisor_code_entered'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'Column Check',
    'updated_at',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'user_profiles' 
          AND column_name = 'updated_at'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END;

-- Summary
SELECT 
    '✅ Migration Script Complete' as status,
    'Run the COMPLETE_USER_PROFILES_MIGRATION.sql for full migration' as note,
    'Or check the column status above to see what is missing' as result;




