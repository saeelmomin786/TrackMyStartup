-- =====================================================
-- GET DETAILED LIST OF ALL REMAINING REFERENCES
-- =====================================================
-- Run each section separately to see what needs migration

-- =====================================================
-- 1. FUNCTIONS (2 remaining)
-- =====================================================
SELECT 
    'FUNCTION' as object_type,
    p.proname as object_name,
    pg_get_functiondef(p.oid) as full_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
      pg_get_functiondef(p.oid) ILIKE '%FROM users%'
      OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
      OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
      OR pg_get_functiondef(p.oid) ILIKE '%JOIN public.users%'
      OR pg_get_functiondef(p.oid) ILIKE '%FROM public.users%'
  )
ORDER BY p.proname;

-- =====================================================
-- 2. VIEWS (4 remaining)
-- =====================================================
SELECT 
    'VIEW' as object_type,
    viewname as object_name,
    definition as full_definition
FROM pg_views
WHERE schemaname = 'public'
  AND (
      definition ILIKE '%users%'
      OR definition ILIKE '%public.users%'
  )
ORDER BY viewname;

-- =====================================================
-- 3. RLS POLICIES (133 remaining) - Show first 20
-- =====================================================
SELECT 
    'RLS_POLICY' as object_type,
    tablename || '.' || policyname as object_name,
    COALESCE(qual, with_check, 'N/A') as policy_expression,
    cmd as command_type
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      (qual IS NOT NULL AND (qual ILIKE '%users%' OR qual ILIKE '%public.users%'))
      OR (with_check IS NOT NULL AND (with_check ILIKE '%users%' OR with_check ILIKE '%public.users%'))
  )
ORDER BY tablename, policyname
LIMIT 20;

-- Get count by table
SELECT 
    'RLS_POLICY_COUNT_BY_TABLE' as object_type,
    tablename as object_name,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      (qual IS NOT NULL AND (qual ILIKE '%users%' OR qual ILIKE '%public.users%'))
      OR (with_check IS NOT NULL AND (with_check ILIKE '%users%' OR with_check ILIKE '%public.users%'))
  )
GROUP BY tablename
ORDER BY COUNT(*) DESC;

-- =====================================================
-- 4. FOREIGN KEYS (40 remaining)
-- =====================================================
SELECT 
    'FOREIGN_KEY' as object_type,
    tc.table_name || '.' || tc.constraint_name as object_name,
    kcu.column_name as referencing_column,
    ccu.table_name || '.' || ccu.column_name as referenced_table_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'users'
ORDER BY tc.table_name, tc.constraint_name;

-- Get count by table
SELECT 
    'FK_COUNT_BY_TABLE' as object_type,
    tc.table_name as object_name,
    COUNT(*) as fk_count
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'users'
GROUP BY tc.table_name
ORDER BY COUNT(*) DESC;











