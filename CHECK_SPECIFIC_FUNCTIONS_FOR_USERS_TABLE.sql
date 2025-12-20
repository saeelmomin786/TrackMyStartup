-- =====================================================
-- CHECK SPECIFIC FUNCTIONS FOR users TABLE USAGE
-- =====================================================
-- Check known functions that likely use users table

-- List of functions to check (add more as needed)
WITH functions_to_check AS (
    SELECT unnest(ARRAY[
        'get_co_investment_opportunities_for_user',
        'get_all_co_investment_opportunities',
        'get_advisor_clients',
        'get_investor_recommendations',
        'get_due_diligence_requests_for_startup',
        'get_startup_by_user_email',
        'set_advisor_offer_visibility',
        'get_advisor_investors',
        'get_investment_advisor_investors'
    ]) as func_name
)
SELECT 
    f.func_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = f.func_name
        ) THEN '✅ Function exists - Check definition manually'
        ELSE '❌ Function does not exist'
    END as status
FROM functions_to_check f;

-- To check if a specific function uses users table, run this:
-- (Replace 'function_name' with actual function name)
/*
SELECT 
    p.proname,
    CASE 
        WHEN pg_get_functiondef(p.oid) LIKE '%FROM users%' 
            OR pg_get_functiondef(p.oid) LIKE '%JOIN users%'
            OR pg_get_functiondef(p.oid) LIKE '%public.users%'
            OR pg_get_functiondef(p.oid) LIKE '%users.%'
        THEN 'YES - Uses users table'
        ELSE 'NO - Does not use users table'
    END as uses_users_table
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'function_name';
*/



