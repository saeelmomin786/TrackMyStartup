-- =====================================================
-- DIAGNOSE WHY INVESTMENT INTERESTS ARE NOT SHOWING
-- =====================================================

-- 1. Check if there are ANY favorites in the table
SELECT 
    '1. Total Favorites in Database' as check_section,
    COUNT(*) as total_favorites,
    COUNT(DISTINCT investor_id) as unique_investors_with_favorites,
    COUNT(DISTINCT startup_id) as unique_startups_favorited
FROM public.investor_favorites;

-- 2. Show sample favorites data
SELECT 
    '2. Sample Favorites Data' as check_section,
    id,
    investor_id,
    startup_id,
    created_at
FROM public.investor_favorites
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check Investment Advisors and their codes
SELECT 
    '3. Investment Advisors and Codes' as check_section,
    id as advisor_id,
    name as advisor_name,
    email as advisor_email,
    investment_advisor_code,
    role
FROM public.users
WHERE role = 'Investment Advisor'
ORDER BY name;

-- 4. Check Investors with advisor codes entered
SELECT 
    '4. Investors with Advisor Codes Entered' as check_section,
    id as investor_id,
    name as investor_name,
    email as investor_email,
    investment_advisor_code_entered,
    advisor_accepted,
    role,
    CASE 
        WHEN advisor_accepted = true THEN '✅ ACCEPTED'
        WHEN investment_advisor_code_entered IS NOT NULL AND investment_advisor_code_entered != '' THEN '⚠️ PENDING (code entered but not accepted)'
        ELSE '❌ NO CODE ENTERED'
    END as status
FROM public.users
WHERE role = 'Investor'
AND (investment_advisor_code_entered IS NOT NULL OR advisor_accepted = true)
ORDER BY advisor_accepted DESC, investment_advisor_code_entered;

-- 5. Check if investors with favorites have advisor codes
SELECT 
    '5. Investors with Favorites - Advisor Code Status' as check_section,
    u.id as investor_id,
    u.name as investor_name,
    u.email as investor_email,
    u.investment_advisor_code_entered,
    u.advisor_accepted,
    COUNT(if.id) as favorite_count,
    CASE 
        WHEN u.advisor_accepted = true AND u.investment_advisor_code_entered IS NOT NULL THEN '✅ ACCEPTED - Should show in Investment Interests'
        WHEN u.investment_advisor_code_entered IS NOT NULL THEN '⚠️ PENDING - Will show after acceptance'
        ELSE '❌ NO ADVISOR CODE - Will not show'
    END as status
FROM public.users u
INNER JOIN public.investor_favorites if ON if.investor_id = u.id
WHERE u.role = 'Investor'
GROUP BY u.id, u.name, u.email, u.investment_advisor_code_entered, u.advisor_accepted
ORDER BY favorite_count DESC;

-- 6. Match favorites with advisor codes (the actual query logic)
SELECT 
    '6. Investment Interests That SHOULD Show' as check_section,
    advisor.id as advisor_id,
    advisor.name as advisor_name,
    advisor.investment_advisor_code as advisor_code,
    investor.id as investor_id,
    investor.name as investor_name,
    investor.investment_advisor_code_entered as investor_entered_code,
    investor.advisor_accepted,
    COUNT(if.id) as favorite_count,
    CASE 
        WHEN investor.advisor_accepted = true 
             AND investor.investment_advisor_code_entered = advisor.investment_advisor_code 
        THEN '✅ SHOULD SHOW'
        ELSE '❌ WILL NOT SHOW'
    END as will_show
FROM public.users advisor
CROSS JOIN public.users investor
LEFT JOIN public.investor_favorites if ON if.investor_id = investor.id
WHERE advisor.role = 'Investment Advisor'
AND investor.role = 'Investor'
AND investor.investment_advisor_code_entered = advisor.investment_advisor_code
AND investor.advisor_accepted = true
GROUP BY advisor.id, advisor.name, advisor.investment_advisor_code,
         investor.id, investor.name, investor.investment_advisor_code_entered, investor.advisor_accepted
HAVING COUNT(if.id) > 0
ORDER BY favorite_count DESC;

-- 7. Check RLS Policy for Investment Advisors
SELECT 
    '7. RLS Policy Check' as check_section,
    policyname,
    cmd as command_type,
    CASE 
        WHEN qual LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
        ELSE '⚠️ Check auth.uid() usage'
    END as auth_check,
    CASE 
        WHEN qual LIKE '%advisor_accepted%' AND qual LIKE '%true%' THEN '✅ Checks advisor_accepted = true'
        ELSE '⚠️ May not check advisor_accepted'
    END as acceptance_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investor_favorites'
AND policyname LIKE '%Investment Advisor%'
ORDER BY policyname;

-- 8. Test query that Investment Advisor would run (replace YOUR_ADVISOR_ID with actual advisor auth.uid())
SELECT 
    '8. Test Query for Investment Advisor' as check_section,
    'Replace YOUR_ADVISOR_ID with actual advisor auth.uid() to test' as note,
    'Run: SELECT * FROM investor_favorites WHERE investor_id IN (SELECT id FROM users WHERE investment_advisor_code_entered = (SELECT investment_advisor_code FROM users WHERE id = auth.uid()) AND advisor_accepted = true)' as test_query;

-- =====================================================
-- SUMMARY AND RECOMMENDATIONS
-- =====================================================
SELECT 
    'SUMMARY' as section,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.investor_favorites) = 0 
        THEN '❌ NO FAVORITES - Investors need to favorite startups first'
        ELSE '✅ Favorites exist'
    END as favorites_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.users WHERE role = 'Investor' AND advisor_accepted = true) = 0
        THEN '❌ NO ACCEPTED INVESTORS - Accept investor requests first'
        ELSE '✅ Accepted investors exist'
    END as investors_status,
    CASE 
        WHEN (
            SELECT COUNT(*) 
            FROM public.users advisor
            INNER JOIN public.users investor ON investor.investment_advisor_code_entered = advisor.investment_advisor_code
            INNER JOIN public.investor_favorites if ON if.investor_id = investor.id
            WHERE advisor.role = 'Investment Advisor'
            AND investor.role = 'Investor'
            AND investor.advisor_accepted = true
        ) = 0
        THEN '❌ NO MATCHING DATA - Check advisor codes match and investors are accepted'
        ELSE '✅ Matching data exists - Should show in Investment Interests'
    END as matching_status;


