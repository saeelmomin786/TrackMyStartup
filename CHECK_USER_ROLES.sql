-- CHECK_USER_ROLES.sql
-- This script checks what roles users have and what forms they need
-- Run this in your Supabase SQL Editor

-- Step 1: Check all user roles in the system
SELECT 'User roles distribution:' as info;
SELECT 
  role,
  COUNT(*) as user_count
FROM public.users 
GROUP BY role
ORDER BY user_count DESC;

-- Step 2: Check what forms each role needs
SELECT 'Users by role with their Form 2 status:' as info;
SELECT 
  u.email,
  u.role,
  u.government_id,
  u.ca_license,
  s.name as startup_name,
  s.country_of_registration as startup_country,
  CASE 
    WHEN u.role = 'Startup' THEN
      CASE 
        WHEN u.government_id IS NOT NULL 
             AND u.ca_license IS NOT NULL 
             AND s.name IS NOT NULL 
             AND s.country_of_registration IS NOT NULL 
        THEN 'FORM 2 COMPLETE'
        ELSE 'FORM 2 INCOMPLETE'
      END
    WHEN u.role = 'Investor' THEN
      CASE 
        WHEN u.government_id IS NOT NULL 
             AND u.ca_license IS NOT NULL 
        THEN 'FORM 2 COMPLETE'
        ELSE 'FORM 2 INCOMPLETE'
      END
    WHEN u.role = 'Investment Advisor' THEN
      CASE 
        WHEN u.government_id IS NOT NULL 
             AND u.ca_license IS NOT NULL 
        THEN 'FORM 2 COMPLETE'
        ELSE 'FORM 2 INCOMPLETE'
      END
    WHEN u.role = 'Startup Facilitation Center' THEN
      CASE 
        WHEN u.government_id IS NOT NULL 
             AND u.ca_license IS NOT NULL 
        THEN 'FORM 2 COMPLETE'
        ELSE 'FORM 2 INCOMPLETE'
      END
    ELSE 'UNKNOWN ROLE'
  END as form2_status
FROM public.users u
LEFT JOIN public.startups s ON u.id = s.user_id
ORDER BY u.role, u.created_at DESC;

-- Step 3: Check what documents each role needs
SELECT 'Document requirements by role:' as info;
SELECT 
  'Startup' as role,
  'government_id, ca_license, startup_name, startup_country' as required_fields
UNION ALL
SELECT 
  'Investor' as role,
  'government_id, ca_license' as required_fields
UNION ALL
SELECT 
  'Investment Advisor' as role,
  'government_id, ca_license, financial_advisor_license_url' as required_fields
UNION ALL
SELECT 
  'Startup Facilitation Center' as role,
  'government_id, ca_license' as required_fields;
