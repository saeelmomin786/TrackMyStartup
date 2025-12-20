-- =====================================================
-- FIND ALL FUNCTIONS THAT USE users TABLE (FIXED VERSION)
-- =====================================================
-- This script finds all PostgreSQL functions that reference the users table
-- Fixed to avoid array_agg errors

-- Method 1: Simple approach - list all functions first
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    'Check manually' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname NOT LIKE 'pg_%'
    AND p.proname NOT LIKE '_%'
ORDER BY p.proname;

-- Method 2: Check function definitions one by one (run separately for each function)
-- Replace 'function_name_here' with actual function name from Method 1
/*
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'function_name_here';
*/

-- Method 3: Use pg_depend to find functions that depend on users table
SELECT DISTINCT
    p.proname as function_name,
    'May use users table' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_depend d ON d.objid = p.oid
JOIN pg_class c ON d.refobjid = c.oid
JOIN pg_namespace ns ON c.relnamespace = ns.oid
WHERE n.nspname = 'public'
    AND ns.nspname = 'public'
    AND c.relname = 'users'
    AND d.deptype IN ('n', 'a')
ORDER BY p.proname;



