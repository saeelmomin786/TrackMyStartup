-- =====================================================
-- CHECK THE 3 REMAINING TRULY UNUSED INDEXES
-- =====================================================
-- These are indexes that are NOT on users table, NOT primary keys, NOT unique constraints
-- Let's see what they are to decide if they're safe to remove

SELECT 
    '=== THE 3 REMAINING UNUSED INDEXES ===' as section,
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as times_used,
    pg_get_indexdef(indexrelid) as index_definition,
    CASE 
        WHEN indexrelname LIKE 'idx_%' THEN 'Looks like a regular index - likely safe to remove'
        WHEN indexrelname LIKE '%_idx' THEN 'Regular index - likely safe to remove'
        ELSE 'Review index definition above'
    END as recommendation
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelname NOT LIKE '%pkey%'
  AND indexrelname NOT LIKE '%_key'
  AND indexrelname NOT LIKE '%_pk'
  AND NOT (relname = 'users' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'))
ORDER BY pg_relation_size(indexrelid) DESC;

-- If you want to remove these 3, uncomment and run:
/*
DO $$
DECLARE
    idx_record RECORD;
BEGIN
    FOR idx_record IN 
        SELECT indexrelname
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
          AND idx_scan = 0
          AND indexrelname NOT LIKE '%pkey%'
          AND indexrelname NOT LIKE '%_key'
          AND indexrelname NOT LIKE '%_pk'
          AND NOT (relname = 'users' AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'))
    LOOP
        BEGIN
            EXECUTE 'DROP INDEX IF EXISTS public.' || quote_ident(idx_record.indexrelname);
            RAISE NOTICE '✅ Dropped: %', idx_record.indexrelname;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️  Error dropping %: %', idx_record.indexrelname, SQLERRM;
        END;
    END LOOP;
END $$;
*/









