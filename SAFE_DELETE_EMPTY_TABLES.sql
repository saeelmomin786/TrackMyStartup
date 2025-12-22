-- =====================================================
-- SAFE DELETE EMPTY UNUSED TABLES
-- =====================================================
-- ⚠️ WARNING: Run CHECK_EMPTY_TABLES_DEPENDENCIES.sql FIRST!
-- ⚠️ Only deletes tables that are empty and not referenced

-- =====================================================
-- Step 1: List empty tables that are NOT referenced by foreign keys
-- =====================================================
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
    '=== SAFE TO DELETE (Not Referenced) ===' as section,
    et.tablename,
    pg_size_pretty(pg_total_relation_size('public.'||et.tablename)) as table_size,
    'DROP TABLE IF EXISTS public.' || quote_ident(et.tablename) || ' CASCADE;' as drop_statement
FROM empty_tables et
LEFT JOIN referenced_tables rt ON rt.table_name = et.tablename
WHERE rt.table_name IS NULL  -- Not referenced
ORDER BY pg_total_relation_size('public.'||et.tablename) DESC;

-- =====================================================
-- Step 2: Generate backup statements (RECOMMENDED)
-- =====================================================
-- Uncomment to create backups before deletion

/*
-- Create backups for empty tables (just in case)
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
    'CREATE TABLE backup_' || et.tablename || ' AS SELECT * FROM public.' || quote_ident(et.tablename) || ';' as backup_statement
FROM empty_tables et
LEFT JOIN referenced_tables rt ON rt.table_name = et.tablename
WHERE rt.table_name IS NULL  -- Not referenced
ORDER BY et.tablename;
*/

-- =====================================================
-- Step 3: Batch delete (ONLY AFTER CHECKING DEPENDENCIES!)
-- =====================================================
-- ⚠️ Uncomment ONLY after verifying no dependencies in Step 1

/*
DO $$
DECLARE
    table_record RECORD;
    deleted_count INTEGER := 0;
    error_count INTEGER := 0;
    total_size BIGINT := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting deletion of empty unused tables...';
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
        WHERE rt.table_name IS NULL  -- Not referenced
        ORDER BY pg_total_relation_size('public.'||et.tablename) DESC
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
    RAISE NOTICE '✅ TABLE DELETION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables deleted: %', deleted_count;
    RAISE NOTICE 'Errors: %', error_count;
    RAISE NOTICE 'Estimated space freed: ~%', pg_size_pretty(total_size);
    RAISE NOTICE '';
END $$;
*/







