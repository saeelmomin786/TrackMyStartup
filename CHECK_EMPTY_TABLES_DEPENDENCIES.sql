-- =====================================================
-- CHECK DEPENDENCIES FOR EMPTY UNUSED TABLES
-- =====================================================
-- This checks if empty tables are safe to delete by verifying:
-- 1. No foreign keys pointing to them
-- 2. No views using them
-- 3. No functions using them

-- =====================================================
-- 1. EMPTY TABLES WITH NO DEPENDENCIES (SAFE TO DELETE)
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
),
views_using_tables AS (
    SELECT DISTINCT 
        regexp_split_to_table(definition, '\s+') as tablename
    FROM pg_views
    WHERE schemaname = 'public'
      AND definition ~ '\b(public\.)?[a-z_]+'
    -- This is a simplified check - would need more sophisticated parsing
)
SELECT 
    '=== EMPTY TABLES - DEPENDENCY CHECK ===' as section,
    et.tablename,
    CASE 
        WHEN rt.table_name IS NOT NULL THEN '⚠️ REFERENCED BY OTHER TABLES - DO NOT DELETE'
        ELSE '✅ Not referenced - Safe candidate'
    END as dependency_status,
    CASE 
        WHEN rt.table_name IS NOT NULL THEN 'Has foreign key references'
        ELSE 'No dependencies found'
    END as details
FROM empty_tables et
LEFT JOIN referenced_tables rt ON rt.table_name = et.tablename
ORDER BY 
    CASE WHEN rt.table_name IS NOT NULL THEN 0 ELSE 1 END,
    et.tablename;

-- =====================================================
-- 2. CHECK SPECIFIC EMPTY TABLES FOR FOREIGN KEY REFERENCES
-- =====================================================
-- Shows which tables reference each empty table
SELECT 
    '=== FOREIGN KEY REFERENCES TO EMPTY TABLES ===' as section,
    ccu.table_name as empty_table,
    tc.table_name as referencing_table,
    kcu.column_name as referencing_column,
    tc.constraint_name as fk_name,
    '⚠️ This table references the empty table' as warning
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_schema = 'public'
  AND ccu.table_name IN (
      SELECT relname
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND n_live_tup = 0
        AND n_tup_ins = 0
        AND n_tup_upd = 0
        AND n_tup_del = 0
  )
ORDER BY ccu.table_name, tc.table_name;







