-- FIX_MANUAL_PROFILE_ISSUE.sql
-- This script helps diagnose and fix issues when a profile exists in user_profiles
-- but the auth user doesn't exist or password isn't set

-- Step 1: Check if auth user exists for this profile
-- Replace '96bcf1bb-4781-425f-896f-8ab1c6680fdd' with your actual auth_user_id
SELECT 
    'Checking auth user...' as step,
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users
WHERE id = '96bcf1bb-4781-425f-896f-8ab1c6680fdd';

-- Step 2: Check if profile exists in user_profiles
SELECT 
    'Checking profile...' as step,
    id,
    auth_user_id,
    email,
    name,
    role
FROM public.user_profiles
WHERE email = 'omkar.sardesai22@pccoepune.org';

-- Step 3: Check if check_email_exists function exists
SELECT 
    'Checking function...' as step,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'check_email_exists';

-- Step 4: Test the check_email_exists function
SELECT 
    'Testing function...' as step,
    check_email_exists('omkar.sardesai22@pccoepune.org') as email_exists;

-- Step 5: If auth user doesn't exist, you need to create it
-- NOTE: You cannot create auth users directly via SQL - you must use Supabase Admin API
-- OR use the registration flow to create the auth user properly

-- Step 6: If auth user exists but password is wrong, you can reset it via:
-- Supabase Dashboard > Authentication > Users > Select user > Reset Password
-- OR use the forgot password flow

-- IMPORTANT: If the profile was created manually (not via registration flow),
-- you need to:
-- 1. Create the auth user via Supabase Admin API or registration flow
-- 2. Set the password via forgot password flow or admin reset
-- 3. Ensure the auth_user_id in user_profiles matches the auth.users.id

