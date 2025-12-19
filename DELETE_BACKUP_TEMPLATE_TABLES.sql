-- =====================================================
-- DELETE BACKUP AND TEMPLATE TABLES
-- =====================================================
-- ⚠️ Run CHECK_BACKUP_TEMPLATE_TABLES.sql first to review!

DO $$
DECLARE
    table_record RECORD;
    deleted_count INTEGER := 0;
    error_count INTEGER := 0;
    total_size BIGINT := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting deletion of backup/template tables...';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    FOR table_record IN 
        SELECT 
            tablename,
            pg_total_relation_size('public.'||tablename) as table_size,
            (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = tablename) as row_count
        FROM pg_tables
        WHERE schemaname = 'public'
          AND (
              tablename ILIKE '%backup%'
              OR tablename ILIKE '%_backup'
              OR tablename ILIKE '%template%'
              OR tablename ILIKE '%_template'
          )
        ORDER BY tablename
    LOOP
        -- Check if table is referenced by foreign keys
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = 'public'
              AND ccu.table_name = table_record.tablename
        ) THEN
            BEGIN
                EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(table_record.tablename) || ' CASCADE';
                deleted_count := deleted_count + 1;
                total_size := total_size + table_record.table_size;
                RAISE NOTICE '✅ Deleted: % (rows: %, size: ~%)', 
                    table_record.tablename, 
                    table_record.row_count,
                    pg_size_pretty(table_record.table_size);
            EXCEPTION
                WHEN OTHERS THEN
                    error_count := error_count + 1;
                    RAISE NOTICE '⚠️  Error deleting %: %', table_record.tablename, SQLERRM;
            END;
        ELSE
            RAISE NOTICE '⚠️  Skipped: % (has foreign key dependencies)', table_record.tablename;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ BACKUP/TEMPLATE TABLES DELETION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables deleted: %', deleted_count;
    RAISE NOTICE 'Errors: %', error_count;
    RAISE NOTICE 'Skipped (has dependencies): Check manually';
    RAISE NOTICE 'Estimated space freed: ~%', pg_size_pretty(total_size);
    RAISE NOTICE '';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 
    '=== VERIFICATION ===' as section,
    COUNT(*) as remaining_backup_template_tables,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All backup/template tables deleted!'
        ELSE 'ℹ️ ' || COUNT(*) || ' backup/template tables remain'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND (
      tablename ILIKE '%backup%'
      OR tablename ILIKE '%_backup'
      OR tablename ILIKE '%template%'
      OR tablename ILIKE '%_template'
  );


