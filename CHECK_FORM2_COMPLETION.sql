-- CHECK_FORM2_COMPLETION.sql
-- This script checks if Form 2 completion data is properly stored
-- Run this in your Supabase SQL Editor

-- Step 1: Check the specific user's profile data
SELECT 'Checking user profile for Form 2 completion:' as info;
SELECT 
  id,
  email,
  name,
  role,
  government_id,
  ca_license,
  verification_documents,
  created_at
FROM public.users 
WHERE email = 'swapnilwalave96@gmail.com';

-- Step 2: Check the user's startup data
SELECT 'Checking startup data for Form 2 completion:' as info;
SELECT 
  s.id,
  s.name,
  s.country_of_registration,
  s.user_id,
  s.created_at,
  u.email
FROM public.startups s
JOIN public.users u ON s.user_id = u.id
WHERE u.email = 'swapnilwalave96@gmail.com';

-- Step 3: Check if user has any startup records
SELECT 'All startups for this user:' as info;
SELECT 
  s.id,
  s.name,
  s.country_of_registration,
  s.user_id,
  s.created_at
FROM public.startups s
WHERE s.user_id = '2c0e6da9-6ade-41db-a672-945ab7dbf131';

-- Step 4: Check what's missing for Form 2 completion
SELECT 'Form 2 completion status:' as info;
SELECT 
  u.email,
  CASE 
    WHEN u.government_id IS NULL THEN 'MISSING: government_id'
    WHEN u.ca_license IS NULL THEN 'MISSING: ca_license'
    WHEN s.name IS NULL THEN 'MISSING: startup name'
    WHEN s.country_of_registration IS NULL THEN 'MISSING: startup country'
    ELSE 'FORM 2 COMPLETE'
  END as form2_status,
  u.government_id,
  u.ca_license,
  s.name as startup_name,
  s.country_of_registration as startup_country
FROM public.users u
LEFT JOIN public.startups s ON u.id = s.user_id
WHERE u.email = 'swapnilwalave96@gmail.com';

-- Step 5: Check all users with incomplete Form 2
SELECT 'All users with incomplete Form 2:' as info;
SELECT 
  u.email,
  u.government_id,
  u.ca_license,
  s.name as startup_name,
  s.country_of_registration as startup_country,
  CASE 
    WHEN u.government_id IS NULL THEN 'Missing government_id'
    WHEN u.ca_license IS NULL THEN 'Missing ca_license'
    WHEN s.name IS NULL THEN 'Missing startup name'
    WHEN s.country_of_registration IS NULL THEN 'Missing startup country'
    ELSE 'Complete'
  END as missing_field
FROM public.users u
LEFT JOIN public.startups s ON u.id = s.user_id
WHERE u.role = 'Startup'
  AND (u.government_id IS NULL 
       OR u.ca_license IS NULL 
       OR s.name IS NULL 
       OR s.country_of_registration IS NULL)
ORDER BY u.created_at DESC;
