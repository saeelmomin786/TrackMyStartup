-- =====================================================
-- SET DOMAIN FOR GOLD VENTURES INVESTMENT ADVISOR
-- =====================================================
-- Domain: tms.goldventuresinvestment.com
-- =====================================================

-- Step 1: Find the Gold Ventures investment advisor
-- (Run this first to see the advisor details)
SELECT 
    id,
    name,
    email,
    investment_advisor_code,
    investor_advisor_domain,
    firm_name
FROM public.users
WHERE role = 'Investment Advisor' 
  AND (
    name ILIKE '%gold%venture%' OR 
    email ILIKE '%gold%venture%' OR
    firm_name ILIKE '%gold%venture%'
  );

-- Step 2: Set the domain for Gold Ventures advisor
-- Option A: Update by advisor code (RECOMMENDED - most reliable)
-- Replace 'IA-XXXXXX' with the actual advisor code from Step 1
UPDATE public.users 
SET investor_advisor_domain = 'tms.goldventuresinvestment.com'
WHERE role = 'Investment Advisor' 
  AND investment_advisor_code = 'IA-XXXXXX';  -- ⚠️ Replace with actual code

-- Option B: Update by name/email (if you don't know the code)
-- Uncomment and modify:
/*
UPDATE public.users 
SET investor_advisor_domain = 'tms.goldventuresinvestment.com'
WHERE role = 'Investment Advisor' 
  AND (
    name ILIKE '%gold%venture%' OR 
    email ILIKE '%gold%venture%' OR
    firm_name ILIKE '%gold%venture%'
  );
*/

-- Step 3: Verify the domain was set correctly
SELECT 
    name,
    email,
    firm_name,
    investment_advisor_code,
    investor_advisor_domain,
    CASE 
        WHEN investor_advisor_domain = 'tms.goldventuresinvestment.com' THEN '✅ Domain Set Correctly'
        WHEN investor_advisor_domain IS NULL THEN '⚠️ Domain Not Set'
        ELSE '⚠️ Different Domain: ' || investor_advisor_domain
    END as status
FROM public.users
WHERE role = 'Investment Advisor' 
  AND (
    name ILIKE '%gold%venture%' OR 
    email ILIKE '%gold%venture%' OR
    firm_name ILIKE '%gold%venture%' OR
    investor_advisor_domain = 'tms.goldventuresinvestment.com'
  );

