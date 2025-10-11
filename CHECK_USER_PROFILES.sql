-- CHECK_USER_PROFILES.sql
-- This script checks if user profiles exist and what's causing the issue
-- Run this in your Supabase SQL Editor

-- Step 1: Check if users table exists and has data
SELECT 'Checking users table structure and data:' as info;

-- Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Step 2: Check if there are any users in the users table
SELECT 'Users in users table:' as info;
SELECT 
  id,
  email,
  name,
  role,
  created_at,
  registration_date
FROM public.users 
ORDER BY created_at DESC
LIMIT 10;

-- Step 3: Check auth.users table (Supabase auth table)
SELECT 'Users in auth.users table:' as info;
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users 
ORDER BY created_at DESC
LIMIT 10;

-- Step 4: Check if there's a mismatch between auth.users and public.users
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

-- Step 5: Check for any specific user (replace with actual user ID if needed)
SELECT 'Checking specific user profile:' as info;
SELECT 
  'User ID: 2c0e6da9-6ade-41db-a672-945ab7dbf131' as user_id,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.users WHERE id = '2c0e6da9-6ade-41db-a672-945ab7dbf131') 
    THEN 'Profile EXISTS in users table'
    ELSE 'Profile DOES NOT EXIST in users table'
  END as profile_status;

-- Step 6: Check RLS policies on users table
SELECT 'RLS policies on users table:' as info;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users' 
AND schemaname = 'public';

-- Step 7: Test a simple select query
SELECT 'Testing simple select query:' as info;
SELECT COUNT(*) as total_users FROM public.users;
