-- =====================================================
-- CLEANUP UNUSED INDEXES (306 found!)
-- =====================================================
-- This script generates DROP INDEX statements for unused indexes
-- ⚠️ Review the list before running!

-- =====================================================
-- STEP 1: Review unused indexes (sorted by size)
-- =====================================================
SELECT 
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as times_used,
    'DROP INDEX IF EXISTS ' || schemaname || '.' || indexrelname || ';' as drop_statement
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0  -- Never used
  AND indexrelname NOT LIKE '%pkey%'  -- Don't drop primary keys
  AND indexrelname NOT LIKE '%_key'   -- Don't drop unique constraints
  AND indexrelname NOT LIKE '%_pk'    -- Don't drop primary keys (alternative naming)
ORDER BY pg_relation_size(indexrelid) DESC;

-- =====================================================
-- STEP 2: Summary of space that can be freed
-- =====================================================
SELECT 
    '=== SPACE TO BE FREED ===' as summary,
    COUNT(*) as unused_index_count,
    pg_size_pretty(SUM(pg_relation_size(indexrelid))) as total_space_to_free,
    'Run DROP INDEX statements above to free this space' as note
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelname NOT LIKE '%pkey%'
  AND indexrelname NOT LIKE '%_key'
  AND indexrelname NOT LIKE '%_pk';

-- =====================================================
-- STEP 3: Generate batch DROP statements (SAFER - One by one)
-- =====================================================
-- Copy the drop_statement column from Step 1 and run them one by one
-- OR use the script below to drop them in batches

/*
-- OPTION A: Drop indexes one by one (SAFEST - recommended)
-- Copy each DROP INDEX statement from Step 1 and run individually

-- OPTION B: Drop in batches (if you're confident)
-- Uncomment and run this DO block to drop all unused indexes at once:

DO $$
DECLARE
    idx_record RECORD;
    dropped_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting to drop unused indexes...';
    
    FOR idx_record IN 
        SELECT indexrelname
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
          AND idx_scan = 0
          AND indexrelname NOT LIKE '%pkey%'
          AND indexrelname NOT LIKE '%_key'
          AND indexrelname NOT LIKE '%_pk'
        ORDER BY pg_relation_size(indexrelid) DESC
    LOOP
        BEGIN
            EXECUTE 'DROP INDEX IF EXISTS public.' || quote_ident(idx_record.indexrelname);
            dropped_count := dropped_count + 1;
            RAISE NOTICE 'Dropped: %', idx_record.indexrelname;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error dropping %: %', idx_record.indexrelname, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Completed. Dropped % unused indexes.', dropped_count;
END $$;
*/











