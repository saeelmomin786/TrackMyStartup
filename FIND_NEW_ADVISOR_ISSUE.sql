-- =====================================================
-- FIND THE EXACT ISSUE WITH NEW ADVISORS
-- =====================================================
-- This will show you exactly what's different
-- =====================================================

-- Check 1: Show NEW advisors (only in user_profiles, not in users)
SELECT 
    'NEW Advisor (user_profiles only)' as advisor_type,
    id as profile_id,
    auth_user_id,
    email,
    name,
    investment_advisor_code,
    LENGTH(investment_advisor_code) as code_length,
    TRIM(investment_advisor_code) as trimmed_code,
    logo_url,
    CASE 
        WHEN logo_url IS NULL OR logo_url = '' THEN '❌ NO LOGO'
        ELSE '✅ HAS LOGO'
    END as logo_status,
    created_at
FROM public.user_profiles
WHERE role = 'Investment Advisor'
  AND NOT EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = user_profiles.auth_user_id 
      AND u.role = 'Investment Advisor'
  )
ORDER BY created_at DESC;

-- Check 2: Show investors/startups under NEW advisors
SELECT 
    'Investor/Startup under NEW advisor' as user_type,
    up.id as profile_id,
    up.email,
    up.name,
    up.role,
    up.investment_advisor_code_entered as entered_code,
    LENGTH(up.investment_advisor_code_entered) as entered_code_length,
    TRIM(up.investment_advisor_code_entered) as trimmed_entered_code,
    up.advisor_accepted,
    -- Find the advisor they're trying to match
    advisor.investment_advisor_code as advisor_has_code,
    CASE 
        WHEN advisor.investment_advisor_code IS NULL THEN '❌ ADVISOR HAS NO CODE'
        WHEN TRIM(UPPER(up.investment_advisor_code_entered)) = TRIM(UPPER(advisor.investment_advisor_code)) THEN '✅ CODES MATCH'
        ELSE '❌ CODES DO NOT MATCH: ' || up.investment_advisor_code_entered || ' vs ' || advisor.investment_advisor_code
    END as code_match_status
FROM public.user_profiles up
LEFT JOIN public.user_profiles advisor ON 
    TRIM(UPPER(advisor.investment_advisor_code)) = TRIM(UPPER(up.investment_advisor_code_entered))
    AND advisor.role = 'Investment Advisor'
WHERE up.role IN ('Investor', 'Startup')
  AND up.investment_advisor_code_entered IS NOT NULL
  AND up.investment_advisor_code_entered != ''
  AND advisor.id IS NOT NULL -- Only show if advisor exists
ORDER BY up.created_at DESC
LIMIT 10;

-- Check 3: Test query - Can we find a new advisor by code?
-- This simulates what getInvestmentAdvisorByCode does
SELECT 
    'Test: Can query new advisor by code?' as test_type,
    'Testing with first new advisor code' as note,
    advisor_code_to_test.investment_advisor_code as test_code,
    CASE 
        WHEN found_advisor.id IS NOT NULL THEN '✅ FOUND ADVISOR'
        ELSE '❌ NOT FOUND'
    END as query_result,
    found_advisor.name as advisor_name,
    found_advisor.logo_url,
    CASE 
        WHEN found_advisor.logo_url IS NULL OR found_advisor.logo_url = '' THEN '❌ NO LOGO'
        ELSE '✅ HAS LOGO'
    END as logo_status
FROM (
    SELECT investment_advisor_code
    FROM public.user_profiles
    WHERE role = 'Investment Advisor'
      AND investment_advisor_code IS NOT NULL
      AND investment_advisor_code != ''
      AND NOT EXISTS (
          SELECT 1 FROM public.users u 
          WHERE u.id = user_profiles.auth_user_id 
          AND u.role = 'Investment Advisor'
      )
    ORDER BY created_at DESC
    LIMIT 1
) advisor_code_to_test
LEFT JOIN LATERAL (
    SELECT 
        id,
        auth_user_id,
        name,
        investment_advisor_code,
        logo_url
    FROM public.user_profiles
    WHERE role = 'Investment Advisor'
      AND TRIM(UPPER(investment_advisor_code)) = TRIM(UPPER(advisor_code_to_test.investment_advisor_code))
    LIMIT 1
) found_advisor ON true;

-- Check 4: Compare code formats - old vs new
SELECT 
    'Code Format Comparison' as check_type,
    'OLD advisors (users table)' as source,
    investment_advisor_code,
    LENGTH(investment_advisor_code) as code_length,
    CASE 
        WHEN investment_advisor_code ~ '^[A-Z]{2}-[A-Z0-9]{6,}$' THEN '✅ Format looks correct'
        ELSE '⚠️ Unusual format'
    END as format_check
FROM public.users
WHERE role = 'Investment Advisor'
  AND investment_advisor_code IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

SELECT 
    'Code Format Comparison' as check_type,
    'NEW advisors (user_profiles)' as source,
    investment_advisor_code,
    LENGTH(investment_advisor_code) as code_length,
    CASE 
        WHEN investment_advisor_code ~ '^[A-Z]{2}-[A-Z0-9]{6,}$' THEN '✅ Format looks correct'
        ELSE '⚠️ Unusual format'
    END as format_check
FROM public.user_profiles
WHERE role = 'Investment Advisor'
  AND investment_advisor_code IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = user_profiles.auth_user_id 
      AND u.role = 'Investment Advisor'
  )
ORDER BY created_at DESC
LIMIT 5;

-- Check 5: Show a specific example - find one new advisor and their clients
SELECT 
    'Example: New Advisor and Clients' as check_type,
    advisor.id as advisor_profile_id,
    advisor.name as advisor_name,
    advisor.investment_advisor_code,
    advisor.logo_url,
    COUNT(client.id) as number_of_clients,
    STRING_AGG(client.investment_advisor_code_entered, ', ') as client_entered_codes
FROM public.user_profiles advisor
LEFT JOIN public.user_profiles client ON 
    TRIM(UPPER(client.investment_advisor_code_entered)) = TRIM(UPPER(advisor.investment_advisor_code))
    AND client.role IN ('Investor', 'Startup')
WHERE advisor.role = 'Investment Advisor'
  AND advisor.investment_advisor_code IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = advisor.auth_user_id 
      AND u.role = 'Investment Advisor'
  )
GROUP BY advisor.id, advisor.name, advisor.investment_advisor_code, advisor.logo_url
ORDER BY advisor.created_at DESC
LIMIT 3;

-- Summary
SELECT 
    '📊 DIAGNOSTIC RESULTS' as status,
    'Review the queries above to see:' as note_1,
    '1. If new advisors have codes set correctly' as note_2,
    '2. If investors/startups codes match advisor codes' as note_3,
    '3. If we can query new advisors by code' as note_4,
    '4. Any format differences between old and new' as note_5;

