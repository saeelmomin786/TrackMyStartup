-- Test script to verify Investment Advisor can access investor favorites
-- Run this in Supabase SQL Editor while logged in as the Investment Advisor

-- 1. Check if you can see any favorites at all (should show count if RLS allows)
SELECT 
    'Total favorites visible to current user' as test,
    COUNT(*) as count
FROM public.investor_favorites;

-- 2. Check what investor_ids are in the favorites table (if RLS allows)
SELECT 
    'Sample investor_ids in table' as test,
    investor_id,
    COUNT(*) as favorite_count
FROM public.investor_favorites
GROUP BY investor_id
LIMIT 10;

-- 3. Check your current user info
SELECT 
    'Current user info' as test,
    auth.uid() as current_auth_uid,
    (SELECT role FROM public.users WHERE id = auth.uid()) as role_from_users,
    (SELECT investment_advisor_code FROM public.users WHERE id = auth.uid()) as advisor_code_from_users,
    (SELECT role FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1) as role_from_profiles,
    (SELECT investment_advisor_code FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1) as advisor_code_from_profiles;

-- 4. Check assigned investors from users table
SELECT 
    'Assigned investors from users table' as test,
    u.id as investor_id,
    u.name as investor_name,
    u.email as investor_email,
    u.investment_advisor_code_entered,
    u.advisor_accepted,
    u.role,
    'from users table' as source
FROM public.users u
WHERE u.role = 'Investor'
AND u.investment_advisor_code_entered = (SELECT investment_advisor_code FROM public.users WHERE id = auth.uid())
AND u.advisor_accepted = true;

-- 4b. Check assigned investors from user_profiles table
SELECT 
    'Assigned investors from user_profiles table' as test,
    up.auth_user_id as investor_id,
    up.name as investor_name,
    up.email as investor_email,
    up.investment_advisor_code_entered,
    up.advisor_accepted,
    up.role,
    'from user_profiles table' as source
FROM public.user_profiles up
WHERE up.role = 'Investor'
AND up.investment_advisor_code_entered = (
    SELECT COALESCE(
        (SELECT investment_advisor_code FROM public.users WHERE id = auth.uid()),
        (SELECT investment_advisor_code FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1)
    )
)
AND up.advisor_accepted = true;

-- 5. Check if favorites exist for assigned investors
SELECT 
    'Favorites for assigned investors' as test,
    if.investor_id,
    COUNT(*) as favorite_count
FROM public.investor_favorites if
WHERE if.investor_id IN (
    -- Get investor IDs from users table
    SELECT u.id
    FROM public.users u
    WHERE u.role = 'Investor'
    AND u.investment_advisor_code_entered = (SELECT investment_advisor_code FROM public.users WHERE id = auth.uid())
    AND u.advisor_accepted = true
    
    UNION
    
    -- Get investor IDs from user_profiles table
    SELECT up.auth_user_id
    FROM public.user_profiles up
    WHERE up.role = 'Investor'
    AND up.investment_advisor_code_entered = (
        SELECT COALESCE(
            (SELECT investment_advisor_code FROM public.users WHERE id = auth.uid()),
            (SELECT investment_advisor_code FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1)
        )
    )
    AND up.advisor_accepted = true
)
GROUP BY if.investor_id;

