-- =====================================================
-- FIND ALL FUNCTIONS THAT USE users TABLE
-- =====================================================
-- This script finds all PostgreSQL functions that reference the users table
-- Run this to get a complete list of functions that need migration

-- Method 1: Check function definitions for 'users' table reference
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND (
        pg_get_functiondef(p.oid) LIKE '%FROM users%'
        OR pg_get_functiondef(p.oid) LIKE '%JOIN users%'
        OR pg_get_functiondef(p.oid) LIKE '%public.users%'
        OR pg_get_functiondef(p.oid) LIKE '%users u%'
        OR pg_get_functiondef(p.oid) LIKE '%users.%'
    )
ORDER BY p.proname;

-- Method 2: Check for specific patterns (more comprehensive)
SELECT DISTINCT
    p.proname as function_name,
    'Uses users table' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND (
        pg_get_functiondef(p.oid) ~* '(FROM|JOIN|UPDATE|INSERT INTO).*users[^_a-z]'
        OR pg_get_functiondef(p.oid) LIKE '%public.users%'
    )
ORDER BY p.proname;

-- Method 3: List all functions and check manually
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname NOT LIKE 'pg_%'
ORDER BY p.proname;


