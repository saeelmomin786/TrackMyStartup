-- =====================================================
-- VERIFY ALL POLICIES ARE CORRECT
-- =====================================================
-- Check that all required policies exist and work correctly
-- =====================================================

-- Step 1: List all policies with their types
SELECT 
    'All Policies' as info,
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' THEN '✅ Investment Advisor Policy'
        WHEN qual LIKE '%startup%' OR qual LIKE '%Startup%' THEN '✅ Startup Policy'
        WHEN qual LIKE '%investor_email%' OR qual LIKE '%Investor%' THEN '✅ Investor Policy'
        WHEN qual LIKE '%Admin%' OR qual LIKE '%admin%' THEN '✅ Admin Policy'
        ELSE '⚠️ Other Policy'
    END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers'
ORDER BY policyname;

-- Step 2: Detailed Safety Check (case-insensitive)
SELECT 
    'Detailed Safety Check' as check_type,
    CASE 
        WHEN COUNT(CASE 
            WHEN qual LIKE '%startup%' OR qual LIKE '%Startup%' 
            THEN 1 
        END) > 0 THEN '✅ Startup access ensured'
        ELSE '❌ No Startup policy found'
    END as startup_check,
    CASE 
        WHEN COUNT(CASE 
            WHEN qual LIKE '%investor_email%' OR qual LIKE '%Investor%' 
            THEN 1 
        END) > 0 THEN '✅ Investor access preserved'
        ELSE '⚠️ No Investor policy found'
    END as investor_check,
    CASE 
        WHEN COUNT(CASE 
            WHEN qual LIKE '%Admin%' OR qual LIKE '%admin%' 
            THEN 1 
        END) > 0 THEN '✅ Admin access preserved'
        ELSE '⚠️ No Admin policy found'
    END as admin_check,
    CASE 
        WHEN COUNT(CASE 
            WHEN qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' 
            THEN 1 
        END) > 0 THEN '✅ Investment Advisor access added'
        ELSE '❌ Investment Advisor policy not created'
    END as advisor_check,
    COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers';

-- Step 3: Check for potential issues
SELECT 
    'Potential Issues' as check_type,
    policyname,
    CASE 
        WHEN qual LIKE '%investor_id%' AND cmd = 'SELECT' THEN '⚠️ Uses investor_id (column may not exist)'
        WHEN qual = 'null' AND cmd = 'INSERT' THEN '⚠️ No INSERT check (allows anyone to insert)'
        ELSE '✅ OK'
    END as issue_status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers'
AND (
    (qual LIKE '%investor_id%' AND cmd = 'SELECT')
    OR (qual = 'null' AND cmd = 'INSERT')
);

-- Step 4: Summary
SELECT 
    'Summary' as check_type,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
    COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies,
    COUNT(CASE WHEN cmd = 'ALL' THEN 1 END) as all_policies
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers';




