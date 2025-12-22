-- =====================================================
-- ENABLE RLS ON TABLES (If Disabled)
-- =====================================================
-- ⚠️ Run FIND_TABLES_WITHOUT_RLS.sql first to see which tables need RLS enabled

-- =====================================================
-- Step 1: Generate ALTER TABLE statements to enable RLS
-- =====================================================
SELECT 
    '=== ENABLE RLS STATEMENTS ===' as section,
    tablename,
    'ALTER TABLE public.' || quote_ident(tablename) || ' ENABLE ROW LEVEL SECURITY;' as enable_rls_statement
FROM pg_tables
WHERE schemaname = 'public'
  AND NOT rowsecurity  -- RLS disabled
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE '_pg_%'
ORDER BY tablename;

-- =====================================================
-- Step 2: Enable RLS on all tables that have it disabled
-- =====================================================
-- ⚠️ Uncomment to execute - or copy statements from Step 1 and run individually

/*
DO $$
DECLARE
    table_record RECORD;
    enabled_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Enabling RLS on tables...';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    FOR table_record IN 
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND NOT rowsecurity  -- RLS disabled
          AND tablename NOT LIKE 'pg_%'
          AND tablename NOT LIKE '_pg_%'
        ORDER BY tablename
    LOOP
        BEGIN
            EXECUTE 'ALTER TABLE public.' || quote_ident(table_record.tablename) || ' ENABLE ROW LEVEL SECURITY';
            enabled_count := enabled_count + 1;
            RAISE NOTICE '✅ Enabled RLS on: %', table_record.tablename;
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                RAISE NOTICE '⚠️  Error enabling RLS on %: %', table_record.tablename, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ RLS ENABLED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables with RLS enabled: %', enabled_count;
    RAISE NOTICE 'Errors: %', error_count;
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: Enabling RLS will DENY ALL access by default!';
    RAISE NOTICE '⚠️  You must add RLS policies after enabling RLS!';
    RAISE NOTICE '';
END $$;
*/









