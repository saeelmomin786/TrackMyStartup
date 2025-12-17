-- =====================================================
-- DIAGNOSE INVESTMENT ADVISOR DISCOVER PITCHES DATA
-- =====================================================
-- Check if there's data and if RLS is blocking it
-- =====================================================

-- 1. Check if Investment Advisor has due diligence requests
-- Replace 'YOUR_ADVISOR_AUTH_UID' with actual auth.uid() when testing
SELECT 
    'Due Diligence Requests for Investment Advisor' as category,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
FROM due_diligence_requests
WHERE user_id IN (
    SELECT id FROM users 
    WHERE role = 'Investment Advisor'
    LIMIT 5  -- Check first 5 advisors
);

-- 2. Check if Investment Advisor has recommendations
SELECT 
    'Recommendations by Investment Advisor' as category,
    COUNT(*) as total_recommendations,
    COUNT(DISTINCT investment_advisor_id) as unique_advisors,
    COUNT(DISTINCT startup_id) as unique_startups,
    COUNT(DISTINCT investor_id) as unique_investors
FROM investment_advisor_recommendations
WHERE investment_advisor_id IN (
    SELECT id FROM users 
    WHERE role = 'Investment Advisor'
    LIMIT 5  -- Check first 5 advisors
);

-- 3. Check RLS policies are correct
SELECT 
    'RLS Policy Check' as category,
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
        ELSE '⚠️ Check policy'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('due_diligence_requests', 'investment_advisor_recommendations')
AND cmd IN ('SELECT', 'INSERT', 'UPDATE')
ORDER BY tablename, cmd;

-- 4. Test query that Investment Advisor would run (simulate)
-- This shows what data an Investment Advisor can see
SELECT 
    'Test: What Investment Advisor can see' as category,
    'due_diligence_requests' as table_name,
    COUNT(*) as visible_records
FROM due_diligence_requests
WHERE user_id = auth.uid()  -- This will use the current authenticated user
UNION ALL
SELECT 
    'Test: What Investment Advisor can see' as category,
    'investment_advisor_recommendations' as table_name,
    COUNT(*) as visible_records
FROM investment_advisor_recommendations
WHERE investment_advisor_id = auth.uid();  -- This will use the current authenticated user

-- 5. Check if there are any Investment Advisors in the system
SELECT 
    'Investment Advisors in system' as category,
    COUNT(*) as total_advisors,
    STRING_AGG(email, ', ') as advisor_emails
FROM users
WHERE role = 'Investment Advisor'
LIMIT 10;





