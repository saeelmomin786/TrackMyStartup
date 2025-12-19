-- =====================================================
-- SIMPLE: List Functions and Check Individually
-- =====================================================
-- This avoids the array_agg error by listing functions first,
-- then you can check each one individually

-- Step 1: List all functions in public schema (no filters)
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- Step 2: For each function from Step 1, run this query to check if it uses 'users' table
-- Replace 'YOUR_FUNCTION_NAME' with the actual function name
/*
SELECT 
    CASE 
        WHEN pg_get_functiondef(p.oid) LIKE '%FROM users%' THEN 'Uses users table (FROM)'
        WHEN pg_get_functiondef(p.oid) LIKE '%JOIN users%' THEN 'Uses users table (JOIN)'
        WHEN pg_get_functiondef(p.oid) LIKE '%public.users%' THEN 'Uses users table (public.users)'
        WHEN pg_get_functiondef(p.oid) LIKE '%users.%' THEN 'Uses users table (users.)'
        ELSE 'Does not use users table'
    END as usage_status,
    p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'YOUR_FUNCTION_NAME';
*/

