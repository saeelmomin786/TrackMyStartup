-- =====================================================
-- CHECK BACKUP AND TEMPLATE TABLES
-- =====================================================
-- Review these tables before deletion

-- =====================================================
-- 1. Check dependencies for backup/template tables
-- =====================================================
WITH backup_tables AS (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND (
          tablename ILIKE '%backup%'
          OR tablename ILIKE '%_backup'
          OR tablename ILIKE '%template%'
          OR tablename ILIKE '%_template'
      )
)
SELECT 
    '=== BACKUP/TEMPLATE TABLES DEPENDENCIES ===' as section,
    bt.tablename,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = 'public'
              AND ccu.table_name = bt.tablename
        ) THEN '⚠️ Referenced by foreign keys'
        ELSE '✅ No foreign key dependencies - Safe to delete'
    END as dependency_status,
    (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = bt.tablename) as row_count,
    pg_size_pretty(pg_total_relation_size('public.'||bt.tablename)) as table_size
FROM backup_tables bt
ORDER BY bt.tablename;

-- =====================================================
-- 2. Show what references backup/template tables
-- =====================================================
SELECT 
    '=== WHAT REFERENCES BACKUP/TEMPLATE TABLES ===' as section,
    ccu.table_name as backup_template_table,
    tc.table_name as referencing_table,
    kcu.column_name as fk_column,
    tc.constraint_name as fk_name
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
  AND (
      ccu.table_name ILIKE '%backup%'
      OR ccu.table_name ILIKE '%_backup'
      OR ccu.table_name ILIKE '%template%'
      OR ccu.table_name ILIKE '%_template'
  )
ORDER BY ccu.table_name, tc.table_name;





