-- =====================================================
-- MIGRATE EXISTING INVESTMENT ADVISORS FIRM_NAME
-- =====================================================
-- This script copies the existing 'name' to 'firm_name' for all existing Investment Advisors
-- This is OPTIONAL - only run if you want existing advisors to have their name as firm_name
-- 
-- WARNING: This will overwrite any existing firm_name values
-- Only run this if you want to migrate existing Investment Advisors

-- Step 1: Update firm_name for all existing Investment Advisors
-- This copies their current 'name' to 'firm_name' if firm_name is NULL
UPDATE public.users
SET firm_name = name
WHERE role = 'Investment Advisor'
  AND firm_name IS NULL
  AND name IS NOT NULL;

-- Step 2: Show the results
SELECT 
    id,
    email,
    name,
    firm_name,
    role,
    CASE 
        WHEN firm_name IS NOT NULL THEN '✅ Has firm_name'
        ELSE '❌ No firm_name'
    END as status
FROM public.users
WHERE role = 'Investment Advisor'
ORDER BY created_at DESC;

-- Step 3: Count how many were updated
SELECT 
    COUNT(*) as total_investment_advisors,
    COUNT(firm_name) as advisors_with_firm_name,
    COUNT(*) - COUNT(firm_name) as advisors_without_firm_name
FROM public.users
WHERE role = 'Investment Advisor';

