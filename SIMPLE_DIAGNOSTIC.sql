-- ✅ SIMPLE DIAGNOSTIC - One Query, Easy Copy/Paste Results

WITH diagnostics AS (
    SELECT
        -- Section 1: Negative Credits Check
        (SELECT COUNT(*) FROM advisor_credits WHERE credits_available < 0) as negative_credits_count,
        
        -- Section 2: Sample negative advisors
        (SELECT STRING_AGG(advisor_user_id::text, ', ') FROM advisor_credits WHERE credits_available < 0 LIMIT 5) as advisors_with_negative,
        
        -- Section 3: Min and Max balance
        (SELECT MIN(credits_available) FROM advisor_credits) as min_balance,
        (SELECT MAX(credits_available) FROM advisor_credits) as max_balance,
        
        -- Section 4: Total advisors
        (SELECT COUNT(*) FROM advisor_credits) as total_advisors,
        
        -- Section 5: Active assignments
        (SELECT COUNT(*) FROM advisor_credit_assignments WHERE status = 'active') as active_assignments,
        
        -- Section 6: Active subscriptions
        (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'active') as active_subscriptions,
        
        -- Section 7: CHECK constraints count
        (SELECT COUNT(*) FROM information_schema.check_constraints 
         WHERE constraint_schema = 'public' AND constraint_name LIKE '%credit%') as check_constraints_count,
        
        -- Section 8: Safe function exists?
        (SELECT EXISTS (
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'public' AND routine_name = 'deduct_advisor_credit_safe'
        )) as safe_function_exists,
        
        -- Section 9: RLS policy for Investment Advisor
        (SELECT COUNT(*) FROM pg_policies 
         WHERE tablename = 'user_subscriptions' AND policyname LIKE '%investment_advisor%') as advisor_rls_policy_exists
)
SELECT 
    '🔍 DATABASE DIAGNOSTIC RESULTS' as report,
    negative_credits_count,
    advisors_with_negative,
    min_balance,
    max_balance,
    total_advisors,
    active_assignments,
    active_subscriptions,
    check_constraints_count,
    safe_function_exists,
    advisor_rls_policy_exists
FROM diagnostics;

-- =====================================================
-- DETAILED VIEW: Negative Credits (if any)
-- =====================================================
SELECT 
    'NEGATIVE CREDITS DETAILS' as details,
    advisor_user_id,
    credits_available,
    credits_used,
    credits_purchased
FROM advisor_credits
WHERE credits_available < 0
LIMIT 10;

-- =====================================================
-- DETAILED VIEW: CHECK Constraints
-- =====================================================
SELECT 
    'CHECK CONSTRAINTS' as constraints,
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
LIMIT 10;

-- =====================================================
-- DETAILED VIEW: RPC Functions
-- =====================================================
SELECT 
    'RPC FUNCTIONS' as functions,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND (routine_name LIKE '%advisor%' OR routine_name LIKE '%credit%')
ORDER BY routine_name;

-- =====================================================
-- DETAILED VIEW: RLS Policies
-- =====================================================
SELECT 
    'RLS POLICIES' as policies,
    tablename,
    policyname,
    roles,
    permissive
FROM pg_policies
WHERE tablename = 'user_subscriptions'
ORDER BY policyname;
