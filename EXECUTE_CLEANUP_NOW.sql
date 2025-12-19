-- =====================================================
-- EXECUTE CLEANUP (Users table excluded - keeping it for now)
-- =====================================================
-- This script focuses on:
-- 1. Removing unused indexes (306 found - BIG IMPACT!)
-- 2. Removing test functions (5 found)

-- =====================================================
-- PART 1: Remove Unused Indexes (306 indexes)
-- =====================================================
-- ⚠️ This will significantly improve write performance and free space
-- ⚠️ Indexes are NEVER used (idx_scan = 0) - safe to remove

DO $$
DECLARE
    idx_record RECORD;
    dropped_count INTEGER := 0;
    error_count INTEGER := 0;
    total_size BIGINT := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting cleanup of unused indexes...';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    FOR idx_record IN 
        SELECT 
            indexrelname,
            pg_relation_size(indexrelid) as index_size
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
          AND idx_scan = 0  -- Never used
          AND indexrelname NOT LIKE '%pkey%'  -- Don't drop primary keys
          AND indexrelname NOT LIKE '%_key'   -- Don't drop unique constraints
          AND indexrelname NOT LIKE '%_pk'    -- Don't drop primary keys (alternative)
          AND NOT (relname = 'users' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'))  -- Don't drop users table indexes (keeping table for now)
        ORDER BY pg_relation_size(indexrelid) DESC
    LOOP
        BEGIN
            EXECUTE 'DROP INDEX IF EXISTS public.' || quote_ident(idx_record.indexrelname);
            dropped_count := dropped_count + 1;
            total_size := total_size + idx_record.index_size;
            
            -- Only log every 50 indexes to avoid too much output
            IF dropped_count % 50 = 0 THEN
                RAISE NOTICE 'Progress: % indexes dropped, ~% space freed...', 
                    dropped_count, pg_size_pretty(total_size);
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                RAISE NOTICE '⚠️  Error dropping %: %', idx_record.indexrelname, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ INDEX CLEANUP COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Indexes dropped: %', dropped_count;
    RAISE NOTICE 'Errors: %', error_count;
    RAISE NOTICE 'Estimated space freed: ~%', pg_size_pretty(total_size);
    RAISE NOTICE '';
END $$;

-- =====================================================
-- PART 2: List Test Functions (Review before dropping)
-- =====================================================
-- ⚠️ Review the list below before proceeding to Part 3

SELECT 
    '=== TEST FUNCTIONS TO REVIEW ===' as section,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as function_arguments,
    substring(pg_get_functiondef(p.oid), 1, 200) as function_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (p.proname ILIKE '%test%' OR p.proname ILIKE '%temp%' OR p.proname ILIKE '%old%')
ORDER BY p.proname;

-- =====================================================
-- PART 3: Remove Test Functions (5 functions)
-- =====================================================
-- ⚠️ Uncomment the section below after reviewing Part 2 results

/*
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
            pg_get_function_arguments(p.oid) as func_args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND (p.proname ILIKE '%test%' OR p.proname ILIKE '%temp%' OR p.proname ILIKE '%old%')
        ORDER BY p.proname
    LOOP
        BEGIN
            IF func_record.func_args IS NULL OR func_record.func_args = '' THEN
                EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(func_record.proname) || '()';
            ELSE
                EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(func_record.proname) || '(' || func_record.func_args || ')';
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
*/

-- =====================================================
-- PART 4: Verification Summary
-- =====================================================
SELECT 
    '=== CLEANUP VERIFICATION ===' as section,
    (SELECT COUNT(*) FROM pg_stat_user_indexes 
     WHERE schemaname = 'public' 
       AND idx_scan = 0 
       AND indexrelname NOT LIKE '%pkey%' 
       AND indexrelname NOT LIKE '%_key' 
       AND indexrelname NOT LIKE '%_pk'
       AND NOT (relname = 'users' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'))) as remaining_unused_indexes,
    (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
     WHERE n.nspname = 'public' AND (p.proname ILIKE '%test%' OR p.proname ILIKE '%temp%' OR p.proname ILIKE '%old%')) as remaining_test_functions,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_stat_user_indexes 
              WHERE schemaname = 'public' 
                AND idx_scan = 0 
                AND indexrelname NOT LIKE '%pkey%' 
                AND indexrelname NOT LIKE '%_key' 
                AND indexrelname NOT LIKE '%_pk'
                AND NOT (relname = 'users' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'))) = 0
             AND (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
                  WHERE n.nspname = 'public' AND (p.proname ILIKE '%test%' OR p.proname ILIKE '%temp%' OR p.proname ILIKE '%old%')) = 0
        THEN '✅ All cleanup complete!'
        ELSE '⚠️ Some items remaining (see counts above)'
    END as status;

