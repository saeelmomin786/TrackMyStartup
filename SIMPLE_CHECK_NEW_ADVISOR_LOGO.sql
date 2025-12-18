-- =====================================================
-- SIMPLE CHECK - NEW ADVISOR LOGO ISSUE
-- =====================================================
-- This will show you the exact problem in one query
-- =====================================================

-- THE KEY CHECK: Can investors/startups find their advisor?
SELECT 
    '🔍 KEY CHECK: Advisor Logo Access' as check_type,
    client.email as client_email,
    client.name as client_name,
    client.role as client_role,
    client.investment_advisor_code_entered as client_entered_code,
    advisor.investment_advisor_code as advisor_has_code,
    advisor.name as advisor_name,
    advisor.logo_url,
    CASE 
        WHEN advisor.id IS NULL THEN '❌ ADVISOR NOT FOUND - This is the problem!'
        WHEN TRIM(UPPER(client.investment_advisor_code_entered)) != TRIM(UPPER(advisor.investment_advisor_code)) THEN '❌ CODES DO NOT MATCH'
        WHEN advisor.logo_url IS NULL OR advisor.logo_url = '' THEN '❌ ADVISOR HAS NO LOGO'
        ELSE '✅ EVERYTHING OK - Logo should work'
    END as status,
    CASE 
        WHEN advisor.id IS NULL THEN 'Check if advisor code exists in user_profiles'
        WHEN TRIM(UPPER(client.investment_advisor_code_entered)) != TRIM(UPPER(advisor.investment_advisor_code)) THEN 
            'Client code: ' || client.investment_advisor_code_entered || ' vs Advisor code: ' || advisor.investment_advisor_code
        WHEN advisor.logo_url IS NULL OR advisor.logo_url = '' THEN 'Advisor needs to upload logo'
        ELSE 'Logo should be visible'
    END as details
FROM public.user_profiles client
LEFT JOIN public.user_profiles advisor ON 
    TRIM(UPPER(advisor.investment_advisor_code)) = TRIM(UPPER(client.investment_advisor_code_entered))
    AND advisor.role = 'Investment Advisor'
    -- Only check NEW advisors (not in users table)
    AND NOT EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = advisor.auth_user_id 
        AND u.role = 'Investment Advisor'
    )
WHERE client.role IN ('Investor', 'Startup')
  AND client.investment_advisor_code_entered IS NOT NULL
  AND client.investment_advisor_code_entered != ''
ORDER BY client.created_at DESC
LIMIT 10;

-- BONUS: Show all new advisors and if they have logos
SELECT 
    'New Advisors Logo Status' as check_type,
    name as advisor_name,
    investment_advisor_code,
    CASE 
        WHEN logo_url IS NULL OR logo_url = '' THEN '❌ NO LOGO'
        ELSE '✅ HAS LOGO'
    END as logo_status,
    logo_url
FROM public.user_profiles
WHERE role = 'Investment Advisor'
  AND NOT EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = user_profiles.auth_user_id 
      AND u.role = 'Investment Advisor'
  )
ORDER BY created_at DESC;

