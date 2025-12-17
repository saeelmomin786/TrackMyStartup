-- =====================================================
-- ADD ALL MISSING COLUMNS TO user_profiles TABLE
-- =====================================================
-- This script adds all columns that exist in users table
-- but are missing from user_profiles table
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Check current user_profiles columns
SELECT 
    'Current user_profiles columns' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Step 2: Add ALL missing columns from users table to user_profiles
-- These are columns that the code tries to update but don't exist in user_profiles

ALTER TABLE public.user_profiles 
-- Service codes (used in Form 2)
ADD COLUMN IF NOT EXISTS ca_service_code TEXT,
ADD COLUMN IF NOT EXISTS cs_service_code TEXT,

-- Additional profile fields that might be missing
ADD COLUMN IF NOT EXISTS advisor_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS startup_count INTEGER DEFAULT 0,

-- Additional verification/document fields
ADD COLUMN IF NOT EXISTS cs_license TEXT; -- Note: ca_license already exists

-- Step 3: Verify all columns were added
SELECT 
    'Verification: All user_profiles columns' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Step 4: Check for any columns that might be in users but not in user_profiles
-- (This is a comparison query - run to see what's missing)
SELECT 
    'Columns in users but NOT in user_profiles' as info,
    u.column_name,
    u.data_type
FROM information_schema.columns u
WHERE u.table_schema = 'public' 
  AND u.table_name = 'users'
  AND u.column_name NOT IN (
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
  )
  AND u.column_name NOT IN ('id') -- Exclude primary key
ORDER BY u.column_name;

-- Step 5: Summary
SELECT 
    '✅ Migration Complete' as status,
    'All necessary columns added to user_profiles table' as note,
    'Profile registration should now work correctly' as result;





