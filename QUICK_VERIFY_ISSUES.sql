-- QUICK VERIFICATION - Run this first for a fast check
-- This will tell you immediately if there are issues

-- Check 1: Do the functions exist?
SELECT 
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ All 3 functions exist'
        WHEN COUNT(*) = 0 THEN '❌ NO FUNCTIONS FOUND - Need to create them'
        ELSE '⚠️ Only ' || COUNT(*) || ' of 3 functions found'
    END as function_status,
    COUNT(*) as function_count
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN (
        'approve_lead_investor_advisor_co_investment',
        'approve_startup_advisor_co_investment',
        'approve_startup_co_investment'
    );

-- Check 2: Are there records with WRONG status values?
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No wrong status values found'
        ELSE '❌ FOUND ' || COUNT(*) || ' RECORDS WITH WRONG STATUS VALUES!'
    END as status_value_check,
    COUNT(*) as wrong_status_count
FROM public.co_investment_opportunities
WHERE 
    lead_investor_advisor_approval_status IN ('approve', 'reject')
    OR startup_advisor_approval_status IN ('approve', 'reject')
    OR startup_approval_status IN ('approve', 'reject');

-- Check 3: Do the functions have the bug? (Check function source code)
-- This checks if functions are setting 'approve'/'reject' directly instead of 'approved'/'rejected'
SELECT 
    proname as function_name,
    CASE 
        WHEN pg_get_functiondef(oid) LIKE '%approval_status = p_approval_action%' 
            OR pg_get_functiondef(oid) LIKE '%approval_status = p_approval_action%'
        THEN '❌ BUG FOUND: Function sets status directly from p_approval_action'
        WHEN pg_get_functiondef(oid) LIKE '%approval_status = ''approved''%'
            OR pg_get_functiondef(oid) LIKE '%approval_status = ''rejected''%'
        THEN '✅ CORRECT: Function uses approved/rejected'
        ELSE '⚠️ UNKNOWN: Cannot determine from source code'
    END as bug_status
FROM pg_proc
WHERE proname IN (
    'approve_lead_investor_advisor_co_investment',
    'approve_startup_advisor_co_investment',
    'approve_startup_co_investment'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- FINAL SUMMARY
SELECT 
    '=== VERIFICATION SUMMARY ===' as summary,
    '' as details
UNION ALL
SELECT 
    'If you see "❌" above, you NEED to run FIX_CO_INVESTMENT_APPROVAL_FUNCTIONS.sql',
    'If you see "✅" above, your database is already correct'
UNION ALL
SELECT 
    'If functions are missing, you MUST run the fix script',
    'The fix script is safe to run multiple times (idempotent)';





