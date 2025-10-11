-- FIX_PROFILE_CREATION_AFTER_VERIFICATION.sql
-- This script creates profiles for users who verified email but don't have profiles
-- Run this in your Supabase SQL Editor

-- Step 1: Find users who verified email but don't have profiles
SELECT 'Users who verified email but missing profiles:' as info;
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  au.created_at,
  au.raw_user_meta_data->>'name' as name,
  au.raw_user_meta_data->>'role' as role,
  au.raw_user_meta_data->>'startupName' as startup_name,
  au.raw_user_meta_data->>'centerName' as center_name,
  au.raw_user_meta_data->>'investmentAdvisorCode' as investment_advisor_code_entered
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email_confirmed_at IS NOT NULL
  AND pu.id IS NULL
ORDER BY au.created_at DESC;

-- Step 2: Create profiles for these users
INSERT INTO public.users (
  id,
  email,
  name,
  role,
  startup_name,
  center_name,
  investment_advisor_code_entered,
  registration_date,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', 'Unknown'),
  COALESCE(au.raw_user_meta_data->>'role', 'Investor')::user_role,
  CASE 
    WHEN au.raw_user_meta_data->>'role' = 'Startup' 
    THEN au.raw_user_meta_data->>'startupName' 
    ELSE NULL 
  END,
  CASE 
    WHEN au.raw_user_meta_data->>'role' = 'Startup Facilitation Center' 
    THEN au.raw_user_meta_data->>'centerName' 
    ELSE NULL 
  END,
  au.raw_user_meta_data->>'investmentAdvisorCode',
  au.created_at::date,
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email_confirmed_at IS NOT NULL
  AND pu.id IS NULL;

-- Step 3: Generate codes for users who need them
UPDATE public.users 
SET 
  investor_code = 'INV-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')
WHERE role = 'Investor' 
  AND investor_code IS NULL;

UPDATE public.users 
SET 
  investment_advisor_code = 'IA-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')
WHERE role = 'Investment Advisor' 
  AND investment_advisor_code IS NULL;

-- Step 4: Verify the fix
SELECT 'Verification - users with profiles after fix:' as info;
SELECT 
  pu.id,
  pu.email,
  pu.name,
  pu.role,
  pu.startup_name,
  pu.investor_code,
  pu.investment_advisor_code,
  pu.created_at
FROM public.users pu
ORDER BY pu.created_at DESC
LIMIT 10;
