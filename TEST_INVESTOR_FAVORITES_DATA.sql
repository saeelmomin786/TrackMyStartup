-- Test script to check investor favorites data (no auth required)
-- This helps verify the data exists and structure is correct

-- 1. Check total favorites in table
SELECT 
    'Total favorites in table' as test,
    COUNT(*) as count
FROM public.investor_favorites;

-- 2. Check what investor_ids exist in the table
SELECT 
    'Investor IDs in favorites table' as test,
    investor_id,
    COUNT(*) as favorite_count
FROM public.investor_favorites
GROUP BY investor_id
ORDER BY favorite_count DESC
LIMIT 20;

-- 3. Check specific investor (replace with actual investor ID)
-- Based on logs, the investor ID is: 31f063f4-256a-490a-bb47-338482e3c441
SELECT 
    'Favorites for investor 31f063f4-256a-490a-bb47-338482e3c441' as test,
    COUNT(*) as favorite_count
FROM public.investor_favorites
WHERE investor_id = '31f063f4-256a-490a-bb47-338482e3c441';

-- 4. Check if this investor exists in users table
SELECT 
    'Investor in users table' as test,
    id,
    name,
    email,
    role,
    investment_advisor_code_entered,
    advisor_accepted
FROM public.users
WHERE id = '31f063f4-256a-490a-bb47-338482e3c441';

-- 5. Check if this investor exists in user_profiles table
SELECT 
    'Investor in user_profiles table' as test,
    id,
    auth_user_id,
    name,
    email,
    role,
    investment_advisor_code_entered,
    advisor_accepted
FROM public.user_profiles
WHERE auth_user_id = '31f063f4-256a-490a-bb47-338482e3c441'
OR id = '31f063f4-256a-490a-bb47-338482e3c441';

-- 6. Check Investment Advisor info (replace with actual advisor ID)
-- Based on logs, the advisor ID is: 7322be22-6fbe-41ed-942b-b80c8721cd77
SELECT 
    'Investment Advisor info' as test,
    id,
    name,
    email,
    role,
    investment_advisor_code
FROM public.users
WHERE id = '7322be22-6fbe-41ed-942b-b80c8721cd77';

-- 7. Check RLS policies on investor_favorites table
SELECT 
    'RLS Policies on investor_favorites' as test,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'investor_favorites'
ORDER BY policyname;

