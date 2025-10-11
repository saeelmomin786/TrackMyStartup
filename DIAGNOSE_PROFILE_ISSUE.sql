-- DIAGNOSE_PROFILE_ISSUE.sql
-- This script diagnoses why profile creation is failing
-- Run this in your Supabase SQL Editor

-- Step 1: Check if users table has the required columns
SELECT 'Checking users table columns:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name IN ('startup_name', 'investor_code', 'investment_advisor_code', 'ca_code', 'cs_code')
ORDER BY column_name;

-- Step 2: Check if there are any users in the users table
SELECT 'Current users in users table:' as info;
SELECT 
  id,
  email,
  name,
  role,
  startup_name,
  investor_code,
  created_at
FROM public.users 
ORDER BY created_at DESC
LIMIT 5;

-- Step 3: Check auth.users table
SELECT 'Users in auth.users table:' as info;
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data->>'name' as name,
  raw_user_meta_data->>'role' as role
FROM auth.users 
WHERE email_confirmed_at IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- Step 4: Check for users missing from public.users
SELECT 'Users missing from public.users table:' as info;
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  au.created_at,
  au.raw_user_meta_data->>'name' as name,
  au.raw_user_meta_data->>'role' as role
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email_confirmed_at IS NOT NULL
  AND pu.id IS NULL
ORDER BY au.created_at DESC;

-- Step 5: Check RLS policies
SELECT 'RLS policies on users table:' as info;
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users' 
AND schemaname = 'public';

-- Step 6: Test if we can insert into users table
SELECT 'Testing insert permissions:' as info;
-- This is just a test query to check if the table is accessible
SELECT 
  'Table is accessible' as status,
  COUNT(*) as total_users
FROM public.users;
