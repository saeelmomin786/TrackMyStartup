-- =====================================================
-- CHECK USERS AND STARTUPS RLS FOR INVESTMENT ADVISORS
-- =====================================================
-- Verify Investment Advisors can view users and startups
-- needed for Service Requests section
-- =====================================================

-- Step 1: Check users table RLS policies
SELECT 'Step 1: users table RLS Policies' as info;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Investment Advisor Policy'
        WHEN qual LIKE '%Public%' OR qual = 'true' THEN '✅ Public Policy (allows all)'
        WHEN qual LIKE '%Admin%' THEN '✅ Admin Policy'
        ELSE 'Other Policy'
    END as policy_type,
    qual as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
ORDER BY policyname;

-- Step 2: Check startups table RLS policies
SELECT 'Step 2: startups table RLS Policies' as info;
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Investment Advisor Policy'
        WHEN qual LIKE '%Public%' OR qual = 'true' THEN '✅ Public Policy (allows all)'
        WHEN qual LIKE '%user_id%' OR qual LIKE '%auth.uid%' THEN '✅ User Policy'
        WHEN qual LIKE '%Admin%' THEN '✅ Admin Policy'
        ELSE 'Other Policy'
    END as policy_type,
    qual as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'startups'
ORDER BY policyname;

-- Step 3: Check if RLS is enabled
SELECT 'Step 3: RLS Status' as info;
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'startups')
ORDER BY tablename;

-- Step 4: Test if Investment Advisors can see users (for Service Requests)
-- This simulates what the frontend needs to do
SELECT 'Step 4: Test - Can Investment Advisors see users?' as info;
SELECT 
    CASE 
        WHEN COUNT(CASE 
            WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' 
            OR qual LIKE '%Public%' OR qual = 'true'
            THEN 1 
        END) > 0 
        THEN '✅ Investment Advisors can view users'
        ELSE '❌ Investment Advisors CANNOT view users (Service Requests will fail)'
    END as users_access_status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
AND cmd = 'SELECT';

-- Step 5: Test if Investment Advisors can see startups (for Service Requests)
SELECT 'Step 5: Test - Can Investment Advisors see startups?' as info;
SELECT 
    CASE 
        WHEN COUNT(CASE 
            WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' 
            OR qual LIKE '%Public%' OR qual = 'true'
            THEN 1 
        END) > 0 
        THEN '✅ Investment Advisors can view startups'
        ELSE '❌ Investment Advisors CANNOT view startups (Service Requests will fail)'
    END as startups_access_status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'startups'
AND cmd = 'SELECT';

-- Step 6: Recommendation - Create policies if missing
SELECT 'Step 6: Recommendations' as info;
SELECT 
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'users'
            AND (qual LIKE '%Investment Advisor%' OR qual LIKE '%Public%' OR qual = 'true')
        ) THEN '⚠️ Need to add policy: Investment Advisors can view users (or make users table public read)'
        ELSE '✅ Users table access OK'
    END as users_recommendation,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'startups'
            AND (qual LIKE '%Investment Advisor%' OR qual LIKE '%Public%' OR qual = 'true')
        ) THEN '⚠️ Need to add policy: Investment Advisors can view startups (or make startups table public read)'
        ELSE '✅ Startups table access OK'
    END as startups_recommendation;



