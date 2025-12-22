-- =====================================================
-- ANALYZE TABLE DEPENDENCIES
-- =====================================================
-- For a specific table, check what depends on it (to see if it's safe to delete)

-- =====================================================
-- 1. Find tables that reference a specific table (via foreign keys)
-- =====================================================
-- Replace 'table_name' with the table you want to check
SELECT 
    '=== TABLES THAT REFERENCE YOUR TABLE ===' as section,
    tc.table_name as referencing_table,
    kcu.column_name as referencing_column,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column,
    tc.constraint_name as fk_name,
    '⚠️ This table depends on the referenced table' as warning
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'YOUR_TABLE_NAME_HERE'  -- Replace with table name
ORDER BY tc.table_name;

-- =====================================================
-- 2. Find what a specific table references (tables it depends on)
-- =====================================================
SELECT 
    '=== TABLES YOUR TABLE REFERENCES ===' as section,
    tc.table_name as table_name,
    kcu.column_name as column_name,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column,
    'ℹ️ Your table depends on this table' as info
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'YOUR_TABLE_NAME_HERE'  -- Replace with table name
ORDER BY ccu.table_name;

-- =====================================================
-- 3. Check for views that use a specific table
-- =====================================================
SELECT 
    '=== VIEWS USING YOUR TABLE ===' as section,
    viewname as view_name,
    '⚠️ This view depends on the table' as warning,
    substring(definition, 1, 200) as view_definition_preview
FROM pg_views
WHERE schemaname = 'public'
  AND definition ILIKE '%YOUR_TABLE_NAME_HERE%'  -- Replace with table name
ORDER BY viewname;

-- =====================================================
-- 4. Check for functions that use a specific table
-- =====================================================
SELECT 
    '=== FUNCTIONS USING YOUR TABLE ===' as section,
    p.proname as function_name,
    '⚠️ This function depends on the table' as warning,
    substring(pg_get_functiondef(p.oid), 1, 200) as function_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%YOUR_TABLE_NAME_HERE%'  -- Replace with table name
ORDER BY p.proname;







