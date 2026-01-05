-- =====================================================
-- SET DOMAINS FOR INVESTMENT ADVISORS
-- =====================================================
-- Run this after ADD_INVESTOR_ADVISOR_DOMAIN_COLUMN.sql
-- =====================================================

-- Step 1: View all advisors and their current domain status
SELECT 
    name,
    email,
    investment_advisor_code,
    investor_advisor_domain,
    CASE 
        WHEN investor_advisor_domain IS NULL THEN '⚠️ No Domain Set'
        ELSE '✅ Domain: ' || investor_advisor_domain
    END as status
FROM public.users
WHERE role = 'Investment Advisor'
ORDER BY 
    CASE WHEN investor_advisor_domain IS NULL THEN 1 ELSE 0 END,  -- Show advisors without domains first
    name;

-- =====================================================
-- Step 2: Set domains for each advisor
-- =====================================================
-- Uncomment and modify the UPDATE statements below
-- Replace 'IA-XXXXXX' with actual advisor codes
-- Replace 'domain.com' with actual domains
-- =====================================================

/*
-- Example 1: Set domain for Sarvesh (by advisor code - RECOMMENDED)
UPDATE public.users 
SET investor_advisor_domain = 'sarvesh.trackmystartup.com'
WHERE role = 'Investment Advisor' 
  AND investment_advisor_code = 'IA-ABC123';  -- Replace with actual code

-- Example 2: Set domain for Mulsetu
UPDATE public.users 
SET investor_advisor_domain = 'mulsetu.com'
WHERE role = 'Investment Advisor' 
  AND investment_advisor_code = 'IA-XYZ789';  -- Replace with actual code

-- Example 3: Set domain by name (if you don't know the code)
UPDATE public.users 
SET investor_advisor_domain = 'advisor.trackmystartup.com'
WHERE role = 'Investment Advisor' 
  AND (name ILIKE '%AdvisorName%' OR email ILIKE '%advisor@example.com%');

-- Example 4: Set domain for Gold Ventures (tms.goldventuresinvestment.com)
-- First find the advisor code, then run:
UPDATE public.users 
SET investor_advisor_domain = 'tms.goldventuresinvestment.com'
WHERE role = 'Investment Advisor' 
  AND investment_advisor_code = 'IA-XXXXXX';  -- Replace with actual code
*/

-- =====================================================
-- Step 3: Verify domains are set correctly
-- =====================================================
SELECT 
    name,
    email,
    investment_advisor_code,
    investor_advisor_domain,
    CASE 
        WHEN investor_advisor_domain IS NULL THEN '⚠️ No Domain'
        ELSE '✅ Set'
    END as status
FROM public.users
WHERE role = 'Investment Advisor'
ORDER BY name;

