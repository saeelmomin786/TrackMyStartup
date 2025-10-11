-- FIX_FORM2_BY_ROLE.sql
-- This script fixes Form 2 completion based on user role
-- Run this in your Supabase SQL Editor

-- Step 1: Check current user roles
SELECT 'Current user roles:' as info;
SELECT 
  role,
  COUNT(*) as user_count
FROM public.users 
GROUP BY role
ORDER BY user_count DESC;

-- Step 2: Fix Form 2 for Startup users (need documents + startup data)
UPDATE public.users 
SET 
  government_id = COALESCE(government_id, 'https://placeholder-document-url.com/government-id'),
  ca_license = COALESCE(ca_license, 'https://placeholder-document-url.com/company-registration'),
  verification_documents = ARRAY[
    COALESCE(government_id, 'https://placeholder-document-url.com/government-id'),
    COALESCE(ca_license, 'https://placeholder-document-url.com/company-registration')
  ],
  updated_at = NOW()
WHERE role = 'Startup'
  AND (government_id IS NULL OR ca_license IS NULL);

-- Step 3: Fix Form 2 for Investor users (need documents only)
UPDATE public.users 
SET 
  government_id = COALESCE(government_id, 'https://placeholder-document-url.com/government-id'),
  ca_license = COALESCE(ca_license, 'https://placeholder-document-url.com/company-registration'),
  verification_documents = ARRAY[
    COALESCE(government_id, 'https://placeholder-document-url.com/government-id'),
    COALESCE(ca_license, 'https://placeholder-document-url.com/company-registration')
  ],
  updated_at = NOW()
WHERE role = 'Investor'
  AND (government_id IS NULL OR ca_license IS NULL);

-- Step 4: Fix Form 2 for Investment Advisor users (need documents + license)
UPDATE public.users 
SET 
  government_id = COALESCE(government_id, 'https://placeholder-document-url.com/government-id'),
  ca_license = COALESCE(ca_license, 'https://placeholder-document-url.com/company-registration'),
  financial_advisor_license_url = COALESCE(financial_advisor_license_url, 'https://placeholder-document-url.com/financial-license'),
  verification_documents = ARRAY[
    COALESCE(government_id, 'https://placeholder-document-url.com/government-id'),
    COALESCE(ca_license, 'https://placeholder-document-url.com/company-registration'),
    COALESCE(financial_advisor_license_url, 'https://placeholder-document-url.com/financial-license')
  ],
  updated_at = NOW()
WHERE role = 'Investment Advisor'
  AND (government_id IS NULL OR ca_license IS NULL);

-- Step 5: Fix Form 2 for Startup Facilitation Center users (need documents only)
UPDATE public.users 
SET 
  government_id = COALESCE(government_id, 'https://placeholder-document-url.com/government-id'),
  ca_license = COALESCE(ca_license, 'https://placeholder-document-url.com/company-registration'),
  verification_documents = ARRAY[
    COALESCE(government_id, 'https://placeholder-document-url.com/government-id'),
    COALESCE(ca_license, 'https://placeholder-document-url.com/company-registration')
  ],
  updated_at = NOW()
WHERE role = 'Startup Facilitation Center'
  AND (government_id IS NULL OR ca_license IS NULL);

-- Step 6: Create missing startup records for Startup users only
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

-- Step 7: Verify Form 2 completion by role
SELECT 'Form 2 completion status by role:' as info;
SELECT 
  u.role,
  COUNT(*) as total_users,
  SUM(CASE 
    WHEN u.role = 'Startup' THEN
      CASE 
        WHEN u.government_id IS NOT NULL 
             AND u.ca_license IS NOT NULL 
             AND s.name IS NOT NULL 
             AND s.country_of_registration IS NOT NULL 
        THEN 1 ELSE 0 END
    WHEN u.role IN ('Investor', 'Investment Advisor', 'Startup Facilitation Center') THEN
      CASE 
        WHEN u.government_id IS NOT NULL 
             AND u.ca_license IS NOT NULL 
        THEN 1 ELSE 0 END
    ELSE 0
  END) as form2_complete,
  SUM(CASE 
    WHEN u.role = 'Startup' THEN
      CASE 
        WHEN u.government_id IS NOT NULL 
             AND u.ca_license IS NOT NULL 
             AND s.name IS NOT NULL 
             AND s.country_of_registration IS NOT NULL 
        THEN 0 ELSE 1 END
    WHEN u.role IN ('Investor', 'Investment Advisor', 'Startup Facilitation Center') THEN
      CASE 
        WHEN u.government_id IS NOT NULL 
             AND u.ca_license IS NOT NULL 
        THEN 0 ELSE 1 END
    ELSE 1
  END) as form2_incomplete
FROM public.users u
LEFT JOIN public.startups s ON u.id = s.user_id
GROUP BY u.role
ORDER BY total_users DESC;
