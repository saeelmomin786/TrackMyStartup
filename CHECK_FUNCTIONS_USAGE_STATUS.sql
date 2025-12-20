-- =====================================================
-- CHECK FUNCTIONS: user_profiles vs users vs fallback
-- =====================================================
-- This script checks known functions to see which table they use

-- List of functions to check
WITH functions_to_check AS (
    SELECT unnest(ARRAY[
        'get_user_role',
        'get_current_profile_safe',
        'get_user_public_info',
        'accept_investment_offer_with_fee',
        'get_offers_for_investment_advisor',
        'should_reveal_contact_details',
        'get_co_investment_opportunities_for_user',
        'get_advisor_clients',
        'get_center_by_user_email',
        'get_all_co_investment_opportunities',
        'get_advisor_investors',
        'get_startup_by_user_email',
        'get_user_profile',
        'set_advisor_offer_visibility',
        'get_due_diligence_requests_for_startup',
        'get_investor_recommendations',
        'get_investment_advisor_investors',
        'get_investment_advisor_startups',
        'get_recommended_co_investment_opportunities'
    ]) as func_name
)
SELECT 
    f.func_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = f.func_name
        ) THEN '✅ EXISTS'
        ELSE '❌ NOT FOUND'
    END as function_exists
FROM functions_to_check f
ORDER BY f.func_name;

-- Manual check for each function:
-- Replace 'FUNCTION_NAME' with actual function name and run this:
/*
SELECT 
    CASE 
        WHEN pg_get_functiondef(p.oid) LIKE '%FROM user_profiles%' 
            OR pg_get_functiondef(p.oid) LIKE '%JOIN user_profiles%'
            OR pg_get_functiondef(p.oid) LIKE '%public.user_profiles%'
        THEN '✅ Uses user_profiles'
        WHEN pg_get_functiondef(p.oid) LIKE '%FROM users%' 
            OR pg_get_functiondef(p.oid) LIKE '%JOIN users%'
            OR pg_get_functiondef(p.oid) LIKE '%public.users%'
        THEN '❌ Uses users table'
        ELSE '⚠️ Check manually'
    END as status,
    p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'FUNCTION_NAME';
*/



