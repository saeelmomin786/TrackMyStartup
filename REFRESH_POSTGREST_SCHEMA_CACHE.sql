-- Refresh PostgREST schema cache for co_investment_offers functions
-- Run this to ensure PostgREST can see the functions

-- First, verify the function exists with correct signature
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS function_arguments,
    pg_get_function_result(p.oid) AS return_type,
    p.oid AS function_oid
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'approve_co_investment_offer_investor_advisor'
ORDER BY p.oid;

-- Check if there are multiple versions of this function (different signatures)
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS function_arguments,
    pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname LIKE '%approve_co_investment%'
ORDER BY p.proname, p.oid;

-- If multiple versions exist, drop the old/wrong ones
-- DROP FUNCTION IF EXISTS public.approve_co_investment_offer_investor_advisor(TEXT);
-- DROP FUNCTION IF EXISTS public.approve_co_investment_offer_investor_advisor(INTEGER);

-- Recreate the function to force schema refresh (already in CREATE_CO_INVESTMENT_OFFERS_TABLE.sql)









