-- TABLE 1: MAIN DIAGNOSTIC SUMMARY
SELECT 
    'NEGATIVE_CREDITS' as check_type,
    (SELECT COUNT(*) FROM advisor_credits WHERE credits_available < 0)::text as result;

SELECT 
    'MIN_BALANCE' as check_type,
    (SELECT MIN(credits_available) FROM advisor_credits)::text as result;

SELECT 
    'MAX_BALANCE' as check_type,
    (SELECT MAX(credits_available) FROM advisor_credits)::text as result;

SELECT 
    'TOTAL_ADVISORS' as check_type,
    (SELECT COUNT(*) FROM advisor_credits)::text as result;

SELECT 
    'ACTIVE_ASSIGNMENTS' as check_type,
    (SELECT COUNT(*) FROM advisor_credit_assignments WHERE status = 'active')::text as result;

SELECT 
    'ACTIVE_SUBSCRIPTIONS' as check_type,
    (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'active')::text as result;

SELECT 
    'CHECK_CONSTRAINTS_COUNT' as check_type,
    (SELECT COUNT(*) FROM information_schema.check_constraints 
     WHERE constraint_schema = 'public' AND constraint_name LIKE '%credit%')::text as result;

SELECT 
    'SAFE_FUNCTION_EXISTS' as check_type,
    (SELECT CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public' AND routine_name = 'deduct_advisor_credit_safe'
    ) THEN 'YES' ELSE 'NO' END)::text as result;

-- TABLE 2: CHECK CONSTRAINTS
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
ORDER BY constraint_name;
