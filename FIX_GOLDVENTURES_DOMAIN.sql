-- =====================================================
-- FIX GOLD VENTURES DOMAIN FORMAT
-- =====================================================
-- Current: https://tms.goldventuresinvestment.com/?page=login
-- Should be: tms.goldventuresinvestment.com
-- =====================================================

-- Fix the domain format (remove protocol and path)
UPDATE public.user_profiles 
SET investor_advisor_domain = 'tms.goldventuresinvestment.com'
WHERE investment_advisor_code = 'IA-015461'
  AND role = 'Investment Advisor';

-- Also fix in users table if it exists there
UPDATE public.users 
SET investor_advisor_domain = 'tms.goldventuresinvestment.com'
WHERE investment_advisor_code = 'IA-015461'
  AND role = 'Investment Advisor';

-- Verify the fix
SELECT 
    name,
    email,
    investment_advisor_code,
    investor_advisor_domain,
    CASE 
        WHEN investor_advisor_domain = 'tms.goldventuresinvestment.com' THEN '✅ Correct Format'
        ELSE '⚠️ Needs Fix: ' || investor_advisor_domain
    END as status
FROM public.user_profiles
WHERE investment_advisor_code = 'IA-015461';

