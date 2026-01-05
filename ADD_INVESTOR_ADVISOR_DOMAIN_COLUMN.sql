-- =====================================================
-- ADD INVESTOR ADVISOR DOMAIN COLUMN
-- =====================================================
-- This script adds a domain column to store the domain/subdomain
-- for each investment advisor, making domain-to-code mapping dynamic
-- =====================================================

-- Step 1: Add domain column to users table (for Investment Advisors)
-- This stores the domain/subdomain where the advisor's website is hosted
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS investor_advisor_domain TEXT;

-- Step 2: Add domain column to user_profiles table (for multi-profile system)
-- This allows domain mapping per profile if using multi-profile system
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS investor_advisor_domain TEXT;

-- Step 3: Create index for faster domain lookups
CREATE INDEX IF NOT EXISTS idx_users_investor_advisor_domain 
ON public.users(investor_advisor_domain) 
WHERE role = 'Investment Advisor';

CREATE INDEX IF NOT EXISTS idx_user_profiles_investor_advisor_domain 
ON public.user_profiles(investor_advisor_domain) 
WHERE role = 'Investment Advisor';

-- Step 4: Add comments for documentation
COMMENT ON COLUMN public.users.investor_advisor_domain IS 
'Domain or subdomain where the investment advisor hosts their website. Used to auto-populate investment_advisor_code during registration. Example: sarvesh.trackmystartup.com or mulsetu.com';

COMMENT ON COLUMN public.user_profiles.investor_advisor_domain IS 
'Domain or subdomain where the investment advisor hosts their website. Used to auto-populate investment_advisor_code during registration. Example: sarvesh.trackmystartup.com or mulsetu.com';

-- Step 5: Set domains for existing advisors
-- =====================================================
-- IMPORTANT: You need to manually set the domain for each investment advisor
-- Choose one of these methods:
--
-- METHOD 1: Update by name/email
-- METHOD 2: Update by investment_advisor_code (recommended)
-- METHOD 3: Use Supabase Dashboard UI (no SQL needed)
-- =====================================================

-- METHOD 1: Set domain by advisor name/email
-- Uncomment and modify these examples:

/*
-- Example 1: Set domain for Sarvesh
UPDATE public.users 
SET investor_advisor_domain = 'sarvesh.trackmystartup.com'
WHERE role = 'Investment Advisor' 
  AND (name ILIKE '%Sarvesh%' OR email ILIKE '%sarvesh%');

-- Example 2: Set domain for Mulsetu advisor
UPDATE public.users 
SET investor_advisor_domain = 'mulsetu.com'
WHERE role = 'Investment Advisor' 
  AND (name ILIKE '%Mulsetu%' OR email ILIKE '%mulsetu%');
*/

-- METHOD 2: Set domain by investment_advisor_code (RECOMMENDED)
-- This is the most reliable method - use the exact advisor code
-- Uncomment and modify:

/*
-- Example: Set domain for advisor with code IA-ABC123
UPDATE public.users 
SET investor_advisor_domain = 'sarvesh.trackmystartup.com'
WHERE role = 'Investment Advisor' 
  AND investment_advisor_code = 'IA-ABC123';
*/

-- METHOD 3: List all advisors to see their codes first
-- Run this to see all advisors and their codes:

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
ORDER BY name;

-- Step 6: Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users' 
  AND column_name = 'investor_advisor_domain';

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles' 
  AND column_name = 'investor_advisor_domain';

