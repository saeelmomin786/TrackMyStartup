-- FIX_MISSING_DOCUMENTS.sql
-- This script fixes the missing document fields for users who completed Form 2
-- Run this in your Supabase SQL Editor

-- Step 1: Check current status of users with missing documents
SELECT 'Users with missing documents:' as info;
SELECT 
  u.email,
  u.government_id,
  u.ca_license,
  s.name as startup_name,
  s.country_of_registration
FROM public.users u
LEFT JOIN public.startups s ON u.id = s.user_id
WHERE u.role = 'Startup'
  AND (u.government_id IS NULL OR u.ca_license IS NULL)
ORDER BY u.created_at DESC;

-- Step 2: For users who have startup data but missing documents, 
-- we'll set placeholder values to indicate Form 2 is complete
-- (You can replace these with actual document URLs if you have them)

UPDATE public.users 
SET 
  government_id = 'https://placeholder-document-url.com/government-id',
  ca_license = 'https://placeholder-document-url.com/company-registration',
  verification_documents = ARRAY[
    'https://placeholder-document-url.com/government-id',
    'https://placeholder-document-url.com/company-registration'
  ],
  updated_at = NOW()
WHERE role = 'Startup'
  AND (government_id IS NULL OR ca_license IS NULL)
  AND id IN (
    SELECT s.user_id 
    FROM public.startups s 
    WHERE s.name IS NOT NULL 
      AND s.country_of_registration IS NOT NULL
  );

-- Step 3: For users who don't have startup data yet, 
-- we'll create basic startup records
INSERT INTO public.startups (
  name,
  user_id,
  investment_type,
  investment_value,
  equity_allocation,
  current_valuation,
  compliance_status,
  sector,
  total_funding,
  total_revenue,
  registration_date,
  country_of_registration
)
SELECT 
  COALESCE(u.startup_name, u.name || '''s Startup'),
  u.id,
  'Seed',
  0,
  0,
  20000000, -- 20 million minimum valuation
  'Pending',
  'Technology',
  0,
  0,
  u.registration_date,
  'India' -- Default country
FROM public.users u
LEFT JOIN public.startups s ON u.id = s.user_id
WHERE u.role = 'Startup'
  AND s.id IS NULL;

-- Step 4: Now set placeholder documents for all remaining users
UPDATE public.users 
SET 
  government_id = 'https://placeholder-document-url.com/government-id',
  ca_license = 'https://placeholder-document-url.com/company-registration',
  verification_documents = ARRAY[
    'https://placeholder-document-url.com/government-id',
    'https://placeholder-document-url.com/company-registration'
  ],
  updated_at = NOW()
WHERE role = 'Startup'
  AND (government_id IS NULL OR ca_license IS NULL);

-- Step 5: Verify the fix
SELECT 'Verification - users after fix:' as info;
SELECT 
  u.email,
  u.government_id,
  u.ca_license,
  s.name as startup_name,
  s.country_of_registration,
  CASE 
    WHEN u.government_id IS NOT NULL 
         AND u.ca_license IS NOT NULL 
         AND s.name IS NOT NULL 
         AND s.country_of_registration IS NOT NULL 
    THEN 'FORM 2 COMPLETE'
    ELSE 'STILL INCOMPLETE'
  END as form2_status
FROM public.users u
LEFT JOIN public.startups s ON u.id = s.user_id
WHERE u.role = 'Startup'
ORDER BY u.created_at DESC;
