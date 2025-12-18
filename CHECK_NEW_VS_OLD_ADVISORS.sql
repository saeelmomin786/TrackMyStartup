-- =====================================================
-- CHECK NEW VS OLD ADVISORS - FIND THE DIFFERENCE
-- =====================================================
-- This will help identify why new advisors don't work
-- but old advisors do
-- =====================================================

-- Check 1: Compare advisors in user_profiles (new) vs users (old)
SELECT 
    'NEW Advisors (user_profiles)' as advisor_type,
    id as profile_id,
    auth_user_id,
    email,
    name,
    role,
    investment_advisor_code,
    CASE 
        WHEN logo_url IS NULL THEN '❌ NO LOGO'
        WHEN logo_url = '' THEN '❌ NO LOGO'
        ELSE '✅ HAS LOGO'
    END as logo_status,
    logo_url,
    created_at
FROM public.user_profiles
WHERE role = 'Investment Advisor'
ORDER BY created_at DESC
LIMIT 10;

SELECT 
    'OLD Advisors (users table)' as advisor_type,
    id,
    email,
    name,
    role,
    investment_advisor_code,
    CASE 
        WHEN logo_url IS NULL THEN '❌ NO LOGO'
        WHEN logo_url = '' THEN '❌ NO LOGO'
        ELSE '✅ HAS LOGO'
    END as logo_status,
    logo_url,
    created_at
FROM public.users
WHERE role = 'Investment Advisor'
ORDER BY created_at DESC
LIMIT 10;

-- Check 2: Find advisors that exist in user_profiles but NOT in users
-- (These are the new advisors)
SELECT 
    'New Advisors (only in user_profiles)' as check_type,
    up.id as profile_id,
    up.auth_user_id,
    up.email,
    up.name,
    up.investment_advisor_code,
    up.logo_url,
    up.created_at,
    CASE 
        WHEN up.logo_url IS NULL OR up.logo_url = '' THEN '❌ NO LOGO'
        ELSE '✅ HAS LOGO'
    END as logo_status,
    'Check if this advisor code can be found by getInvestmentAdvisorByCode' as note
FROM public.user_profiles up
WHERE up.role = 'Investment Advisor'
  AND NOT EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = up.auth_user_id 
      AND u.role = 'Investment Advisor'
  )
ORDER BY up.created_at DESC;

-- Check 3: Test if we can query new advisors by code (simulating getInvestmentAdvisorByCode)
-- Replace 'IA-6LH4YP' with a new advisor code to test
SELECT 
    'Test Query: Find advisor by code (user_profiles)' as test_type,
    auth_user_id as id,
    email,
    name,
    role,
    investment_advisor_code,
    logo_url,
    CASE 
        WHEN logo_url IS NULL OR logo_url = '' THEN '❌ NO LOGO'
        ELSE '✅ HAS LOGO'
    END as logo_status
FROM public.user_profiles
WHERE role = 'Investment Advisor'
  AND investment_advisor_code IS NOT NULL
  AND investment_advisor_code != ''
ORDER BY created_at DESC
LIMIT 5;

-- Check 4: Check if new advisors have their code properly set
SELECT 
    'New Advisor Code Check' as check_type,
    COUNT(*) as total_new_advisors,
    COUNT(CASE WHEN investment_advisor_code IS NOT NULL AND investment_advisor_code != '' THEN 1 END) as advisors_with_code,
    COUNT(CASE WHEN investment_advisor_code IS NULL OR investment_advisor_code = '' THEN 1 END) as advisors_without_code
FROM public.user_profiles
WHERE role = 'Investment Advisor'
  AND NOT EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = user_profiles.auth_user_id 
      AND u.role = 'Investment Advisor'
  );

-- Check 5: Compare how codes are stored (case sensitivity, whitespace)
SELECT 
    'Code Format Check' as check_type,
    'user_profiles' as table_name,
    investment_advisor_code,
    LENGTH(investment_advisor_code) as code_length,
    TRIM(investment_advisor_code) as trimmed_code,
    CASE 
        WHEN investment_advisor_code != TRIM(investment_advisor_code) THEN '⚠️ Has whitespace'
        ELSE '✅ Clean'
    END as code_status
FROM public.user_profiles
WHERE role = 'Investment Advisor'
  AND investment_advisor_code IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Check 6: Find investors/startups under new advisors
SELECT 
    'Investors/Startups under NEW advisors' as check_type,
    up.id as profile_id,
    up.email,
    up.name,
    up.role,
    up.investment_advisor_code_entered as entered_code,
    up.advisor_accepted,
    CASE 
        WHEN up.investment_advisor_code_entered IS NULL OR up.investment_advisor_code_entered = '' THEN '❌ NO CODE'
        ELSE '✅ HAS CODE: ' || up.investment_advisor_code_entered
    END as code_status
FROM public.user_profiles up
WHERE up.role IN ('Investor', 'Startup')
  AND up.investment_advisor_code_entered IS NOT NULL
  AND up.investment_advisor_code_entered != ''
  AND EXISTS (
      SELECT 1 FROM public.user_profiles advisor
      WHERE advisor.role = 'Investment Advisor'
      AND advisor.investment_advisor_code = up.investment_advisor_code_entered
      AND NOT EXISTS (
          SELECT 1 FROM public.users u 
          WHERE u.id = advisor.auth_user_id 
          AND u.role = 'Investment Advisor'
      )
  )
ORDER BY up.created_at DESC
LIMIT 10;

-- Summary
SELECT 
    '📊 DIAGNOSTIC COMPLETE' as status,
    'Key things to check:' as note_1,
    '1. Do new advisors have investment_advisor_code set?' as note_2,
    '2. Do investors/startups have investment_advisor_code_entered matching?' as note_3,
    '3. Are codes matching exactly (case, whitespace)?' as note_4,
    '4. Can we query new advisors by code?' as note_5;



