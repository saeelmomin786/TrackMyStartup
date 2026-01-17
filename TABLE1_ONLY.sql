-- TABLE 1: MAIN DIAGNOSTIC SUMMARY - SIMPLIFIED

SELECT 'NEGATIVE_CREDITS' as check_type, (SELECT COUNT(*) FROM advisor_credits WHERE credits_available < 0)::text as result
UNION ALL
SELECT 'MIN_BALANCE', (SELECT MIN(credits_available) FROM advisor_credits)::text
UNION ALL
SELECT 'MAX_BALANCE', (SELECT MAX(credits_available) FROM advisor_credits)::text
UNION ALL
SELECT 'TOTAL_ADVISORS', (SELECT COUNT(*) FROM advisor_credits)::text
UNION ALL
SELECT 'ACTIVE_ASSIGNMENTS', (SELECT COUNT(*) FROM advisor_credit_assignments WHERE status = 'active')::text
UNION ALL
SELECT 'ACTIVE_SUBSCRIPTIONS', (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'active')::text
UNION ALL
SELECT 'CHECK_CONSTRAINTS_COUNT', (SELECT COUNT(*) FROM information_schema.check_constraints WHERE constraint_schema = 'public' AND constraint_name LIKE '%credit%')::text
UNION ALL
SELECT 'SAFE_FUNCTION_EXISTS', (SELECT CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'deduct_advisor_credit_safe') THEN 'YES' ELSE 'NO' END)::text;
