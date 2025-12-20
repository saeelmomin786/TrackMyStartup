-- Diagnose Investment Interests Issue
-- Check what's actually happening with the data and RLS policies

-- 1. Check if investor has favorites
SELECT 
    'Investor favorites check' as test,
    investor_id,
    COUNT(*) as favorite_count
FROM investor_favorites
WHERE investor_id = '31f063f4-256a-490a-bb47-338482e3c441'
GROUP BY investor_id;

-- 2. Check investor in user_profiles table
SELECT 
    'Investor in user_profiles' as test,
    id,
    auth_user_id,
    name,
    email,
    role,
    investment_advisor_code_entered,
    advisor_accepted
FROM user_profiles
WHERE auth_user_id = '31f063f4-256a-490a-bb47-338482e3c441'
OR id = '31f063f4-256a-490a-bb47-338482e3c441';

-- 3. Check Investment Advisor in user_profiles table
SELECT 
    'Investment Advisor in user_profiles' as test,
    id,
    auth_user_id,
    name,
    email,
    role,
    investment_advisor_code
FROM user_profiles
WHERE auth_user_id = '7322be22-6fbe-41ed-942b-b80c8721cd77'
OR id = '7322be22-6fbe-41ed-942b-b80c8721cd77';

-- 4. Check if relationship exists in investment_advisor_relationships
SELECT 
    'Relationship in investment_advisor_relationships' as test,
    iar.*
FROM investment_advisor_relationships iar
WHERE iar.investment_advisor_id = '7322be22-6fbe-41ed-942b-b80c8721cd77'
AND iar.investor_id = '31f063f4-256a-490a-bb47-338482e3c441'
AND iar.relationship_type = 'advisor_investor';

-- 5. Check current RLS policy on investor_favorites
SELECT 
    'Current RLS Policy' as test,
    policyname,
    qual
FROM pg_policies
WHERE tablename = 'investor_favorites'
AND policyname = 'Investment Advisors can view assigned investor favorites';

-- 6. Check all investor_ids in favorites table (if RLS allows)
SELECT 
    'All investor_ids in favorites' as test,
    investor_id,
    COUNT(*) as count
FROM investor_favorites
GROUP BY investor_id
ORDER BY count DESC
LIMIT 20;

