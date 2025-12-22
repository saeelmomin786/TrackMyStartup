-- =====================================================
-- SAFE CLEANUP SCRIPTS
-- =====================================================
-- Run these scripts ONE BY ONE after reviewing the analysis
-- BACKUP YOUR DATABASE BEFORE RUNNING THESE!

-- =====================================================
-- STEP 1: DELETE OLD users TABLE (After verification)
-- =====================================================
-- ⚠️ WARNING: Only run this if you've verified no dependencies remain!
-- ⚠️ WARNING: Create a backup first!

/*
-- Step 1a: Create backup (REQUIRED!)
CREATE TABLE users_backup AS SELECT * FROM public.users;

-- Step 1b: Verify backup
SELECT COUNT(*) as backup_count FROM users_backup;
SELECT COUNT(*) as original_count FROM public.users;
-- Both should match

-- Step 1c: Drop the table (only after backup is verified!)
-- DROP TABLE IF EXISTS public.users CASCADE;
*/

-- =====================================================
-- STEP 2: REMOVE UNUSED INDEXES
-- =====================================================
-- ⚠️ Review the unused indexes list first!
-- ⚠️ Only remove indexes that are truly unused

/*
-- Generate DROP INDEX statements for unused indexes
SELECT 
    'DROP INDEX IF EXISTS ' || schemaname || '.' || indexname || ';' as drop_statement
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0  -- Never used
  AND indexname NOT LIKE '%pkey%'  -- Don't drop primary keys
  AND indexname NOT LIKE '%_key'  -- Don't drop unique constraints
ORDER BY pg_relation_size(indexrelid) DESC;

-- Copy and run the generated statements one by one
*/

-- =====================================================
-- STEP 3: REMOVE TEST/TEMP FUNCTIONS
-- =====================================================
-- ⚠️ Review each function before dropping!

/*
-- List test/temp functions
SELECT 
    'DROP FUNCTION IF EXISTS ' || p.proname || '(' || 
    pg_get_function_arguments(p.oid) || ');' as drop_statement,
    p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (p.proname ILIKE '%test%' OR p.proname ILIKE '%temp%' OR p.proname ILIKE '%old%')
ORDER BY p.proname;

-- Copy and run the generated statements one by one
*/

-- =====================================================
-- STEP 4: REMOVE TEST/TEMP VIEWS
-- =====================================================
-- ⚠️ Review each view before dropping!

/*
-- List test/temp views
SELECT 
    'DROP VIEW IF EXISTS ' || schemaname || '.' || viewname || ';' as drop_statement,
    viewname
FROM pg_views
WHERE schemaname = 'public'
  AND (viewname ILIKE '%test%' OR viewname ILIKE '%temp%' OR viewname ILIKE '%old%')
ORDER BY viewname;

-- Copy and run the generated statements one by one
*/

-- =====================================================
-- STEP 5: VACUUM ANALYZE (Performance maintenance)
-- =====================================================
-- ✅ This is safe and recommended for performance

-- VACUUM ANALYZE;  -- Uncomment to run
-- This cleans up dead tuples and updates statistics

-- =====================================================
-- STEP 6: REINDEX (Rebuild indexes for better performance)
-- =====================================================
-- ⚠️ This locks tables temporarily - run during low-traffic periods

/*
-- Reindex specific tables (safer than REINDEX DATABASE)
-- REINDEX TABLE CONCURRENTLY public.table_name;

-- Or reindex entire database (may take a while)
-- REINDEX DATABASE current_database();
*/

-- =====================================================
-- STEP 7: ADD MISSING INDEXES (Performance improvement)
-- =====================================================
-- Review the missing indexes analysis and add indexes where needed

/*
-- Example: Add index for a foreign key column
-- CREATE INDEX IF NOT EXISTS idx_table_name_column_name ON public.table_name(column_name);
*/









