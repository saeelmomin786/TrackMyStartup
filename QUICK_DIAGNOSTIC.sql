-- ✅ QUICK DIAGNOSTIC - Just The Key Info You Need

-- TABLE 1: MAIN DIAGNOSTIC SUMMARY
SELECT 
    'TABLE 1: MAIN DIAGNOSTIC' as section,
    (SELECT COUNT(*) FROM advisor_credits WHERE credits_available < 0)::text as negative_credits_count,
    (SELECT MIN(credits_available) FROM advisor_credits)::text as min_balance,
    (SELECT MAX(credits_available) FROM advisor_credits)::text as max_balance,
    (SELECT COUNT(*) FROM advisor_credits)::text as total_advisors,
    (SELECT COUNT(*) FROM advisor_credit_assignments WHERE status = 'active')::text as active_assignments,
    (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'active')::text as active_subscriptions,
    (SELECT COUNT(*) FROM information_schema.check_constraints 
     WHERE constraint_schema = 'public' AND constraint_name LIKE '%credit%')::text as check_constraints_count,
    (SELECT CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public' AND routine_name = 'deduct_advisor_credit_safe'
    ) THEN 'YES' ELSE 'NO' END)::text as safe_function_exists;

-- TABLE 2: CHECK CONSTRAINTS
SELECT 
    'TABLE 2: CHECK CONSTRAINTS' as section,
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
ORDER BY constraint_name;

-- TABLE 3: RPC FUNCTIONS (advisor & credit related)
SELECT 
    'TABLE 3: RPC FUNCTIONS' as section,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND (routine_name LIKE '%advisor%' OR routine_name LIKE '%credit%')
ORDER BY routine_name;
