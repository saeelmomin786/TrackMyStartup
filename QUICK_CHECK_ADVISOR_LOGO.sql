-- =====================================================
-- QUICK CHECK - ADVISOR LOGO ACCESS
-- =====================================================
-- Simple check to see if policies exist and advisors have logos
-- =====================================================

-- Check 1: Do the required policies exist?
SELECT 
    'Policy Check' as check_type,
    'user_profiles: Anyone can view Investment Advisor profiles' as policy_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'user_profiles' 
            AND policyname = 'Anyone can view Investment Advisor profiles'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING - Run fix script!'
    END as status
UNION ALL
SELECT 
    'Policy Check',
    'users: Anyone can view Investment Advisor profiles (users table)',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'users' 
            AND policyname = 'Anyone can view Investment Advisor profiles (users table)'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING - Run fix script!'
    END;

-- Check 2: Do advisors have logos?
SELECT 
    'Advisor Logo Check' as check_type,
    'user_profiles table' as table_name,
    COUNT(*) as total_advisors,
    COUNT(CASE WHEN logo_url IS NOT NULL AND logo_url != '' THEN 1 END) as advisors_with_logos,
    COUNT(CASE WHEN logo_url IS NULL OR logo_url = '' THEN 1 END) as advisors_without_logos
FROM public.user_profiles
WHERE role = 'Investment Advisor'
UNION ALL
SELECT 
    'Advisor Logo Check',
    'users table',
    COUNT(*),
    COUNT(CASE WHEN logo_url IS NOT NULL AND logo_url != '' THEN 1 END),
    COUNT(CASE WHEN logo_url IS NULL OR logo_url = '' THEN 1 END)
FROM public.users
WHERE role = 'Investment Advisor';

-- Check 3: Show sample advisors with their logo status
SELECT 
    'Sample Advisors' as check_type,
    'user_profiles' as source_table,
    investment_advisor_code,
    name,
    CASE 
        WHEN logo_url IS NULL THEN '❌ NO LOGO'
        WHEN logo_url = '' THEN '❌ NO LOGO'
        ELSE '✅ HAS LOGO'
    END as logo_status
FROM public.user_profiles
WHERE role = 'Investment Advisor'
ORDER BY created_at DESC
LIMIT 5;

