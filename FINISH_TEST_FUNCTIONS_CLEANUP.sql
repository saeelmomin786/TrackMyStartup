-- =====================================================
-- FINISH TEST FUNCTIONS CLEANUP
-- =====================================================
-- This will remove the 5 remaining test functions
-- ⚠️ Review the function list first using CHECK_REMAINING_CLEANUP_ITEMS.sql

-- =====================================================
-- Step 1: Show functions that will be removed
-- =====================================================
SELECT 
    '=== FUNCTIONS TO BE REMOVED ===' as section,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as function_arguments,
    substring(pg_get_functiondef(p.oid), 1, 200) as function_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (p.proname ILIKE '%test%' OR p.proname ILIKE '%temp%' OR p.proname ILIKE '%old%')
ORDER BY p.proname;

-- =====================================================
-- Step 2: Remove test functions
-- =====================================================
DO $$
DECLARE
    func_record RECORD;
    dropped_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting cleanup of test functions...';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    FOR func_record IN 
        SELECT 
            p.proname,
            p.oid,
            pg_get_function_arguments(p.oid) as func_args,
            pg_get_function_identity_arguments(p.oid) as identity_args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND (p.proname ILIKE '%test%' OR p.proname ILIKE '%temp%' OR p.proname ILIKE '%old%')
        ORDER BY p.proname
    LOOP
        BEGIN
            -- Try with identity arguments first (more reliable)
            IF func_record.identity_args IS NOT NULL AND func_record.identity_args != '' THEN
                EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(func_record.proname) || '(' || func_record.identity_args || ') CASCADE';
            ELSIF func_record.func_args IS NOT NULL AND func_record.func_args != '' THEN
                EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(func_record.proname) || '(' || func_record.func_args || ') CASCADE';
            ELSE
                -- Try without arguments
                EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(func_record.proname) || '() CASCADE';
            END IF;
            
            dropped_count := dropped_count + 1;
            RAISE NOTICE '✅ Dropped: %', func_record.proname;
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                RAISE NOTICE '⚠️  Error dropping %: %', func_record.proname, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ FUNCTION CLEANUP COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Functions dropped: %', dropped_count;
    RAISE NOTICE 'Errors: %', error_count;
    RAISE NOTICE '';
END $$;

-- =====================================================
-- Step 3: Verify cleanup
-- =====================================================
SELECT 
    '=== VERIFICATION ===' as section,
    (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
     WHERE n.nspname = 'public' AND (p.proname ILIKE '%test%' OR p.proname ILIKE '%temp%' OR p.proname ILIKE '%old%')) as remaining_test_functions,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
              WHERE n.nspname = 'public' AND (p.proname ILIKE '%test%' OR p.proname ILIKE '%temp%' OR p.proname ILIKE '%old%')) = 0
        THEN '✅ All test functions removed!'
        ELSE '⚠️ Some test functions remain'
    END as status;















