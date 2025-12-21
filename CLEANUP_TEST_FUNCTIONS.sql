-- =====================================================
-- CLEANUP TEST FUNCTIONS (5 found)
-- =====================================================
-- ⚠️ Review each function before dropping!

-- =====================================================
-- STEP 1: List test/temp functions
-- =====================================================
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as function_arguments,
    pg_get_function_result(p.oid) as return_type,
    'DROP FUNCTION IF EXISTS ' || p.proname || '(' || 
    COALESCE(pg_get_function_arguments(p.oid), '') || ');' as drop_statement
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (p.proname ILIKE '%test%' OR p.proname ILIKE '%temp%' OR p.proname ILIKE '%old%')
ORDER BY p.proname;

-- =====================================================
-- STEP 2: Show function definitions (review before dropping)
-- =====================================================
SELECT 
    p.proname as function_name,
    substring(pg_get_functiondef(p.oid), 1, 500) as function_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (p.proname ILIKE '%test%' OR p.proname ILIKE '%temp%' OR p.proname ILIKE '%old%')
ORDER BY p.proname;

-- =====================================================
-- STEP 3: Drop functions (uncomment after review)
-- =====================================================
-- Copy the drop_statement from Step 1 and run individually
-- OR review the function definitions in Step 2 first

/*
-- Example drop statements (REVIEW BEFORE RUNNING):
-- DROP FUNCTION IF EXISTS test_function_name();
-- DROP FUNCTION IF EXISTS temp_function_name(integer);
*/





