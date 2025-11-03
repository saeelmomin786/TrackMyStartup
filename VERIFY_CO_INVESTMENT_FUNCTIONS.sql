-- Verification script to check if co-investment approval functions exist
-- Run this first to see what functions exist

-- Check if the function exists
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS function_arguments,
    pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'approve_co_investment_offer_investor_advisor';

-- If the above returns no rows, the function doesn't exist
-- Run CREATE_CO_INVESTMENT_OFFERS_TABLE.sql to create it









