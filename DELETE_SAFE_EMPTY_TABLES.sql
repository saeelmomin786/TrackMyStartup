-- =====================================================
-- DELETE SAFE EMPTY TABLES (No Dependencies)
-- =====================================================
-- ⚠️ Only deletes empty tables that are NOT referenced by foreign keys
-- ⚠️ Run IDENTIFY_SAFE_TABLES_TO_DELETE.sql first to review!

DO $$
DECLARE
    table_record RECORD;
    deleted_count INTEGER := 0;
    error_count INTEGER := 0;
    total_size BIGINT := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting deletion of safe empty tables...';
    RAISE NOTICE 'Tables with NO foreign key dependencies';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    FOR table_record IN 
        WITH empty_tables AS (
            SELECT relname as tablename
            FROM pg_stat_user_tables
            WHERE schemaname = 'public'
              AND n_live_tup = 0
              AND n_tup_ins = 0
              AND n_tup_upd = 0
              AND n_tup_del = 0
        ),
        referenced_tables AS (
            SELECT DISTINCT ccu.table_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = 'public'
              AND ccu.table_schema = 'public'
        )
        SELECT 
            et.tablename,
            pg_total_relation_size('public.'||et.tablename) as table_size
        FROM empty_tables et
        LEFT JOIN referenced_tables rt ON rt.table_name = et.tablename
        WHERE rt.table_name IS NULL  -- Not referenced (safe to delete)
        ORDER BY et.tablename
    LOOP
        BEGIN
            EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(table_record.tablename) || ' CASCADE';
            deleted_count := deleted_count + 1;
            total_size := total_size + table_record.table_size;
            RAISE NOTICE '✅ Deleted: % (~%)', table_record.tablename, pg_size_pretty(table_record.table_size);
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                RAISE NOTICE '⚠️  Error deleting %: %', table_record.tablename, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ SAFE TABLE DELETION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables deleted: %', deleted_count;
    RAISE NOTICE 'Errors: %', error_count;
    RAISE NOTICE 'Estimated space freed: ~%', pg_size_pretty(total_size);
    RAISE NOTICE '';
    RAISE NOTICE 'Note: Some empty tables have dependencies and were NOT deleted.';
    RAISE NOTICE 'Run IDENTIFY_SAFE_TABLES_TO_DELETE.sql to see which ones.';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- VERIFICATION: Count remaining empty tables
-- =====================================================
SELECT 
    '=== VERIFICATION ===' as section,
    COUNT(*) as remaining_empty_tables,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All safe empty tables deleted!'
        ELSE 'ℹ️ ' || COUNT(*) || ' empty tables remain (some have dependencies)'
    END as status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup = 0
  AND n_tup_ins = 0
  AND n_tup_upd = 0
  AND n_tup_del = 0;









