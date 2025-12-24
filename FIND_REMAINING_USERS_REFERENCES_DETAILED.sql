-- =====================================================
-- DETAILED DIAGNOSTIC: Find EXACT remaining references to users table
-- =====================================================
-- This script will show you exactly what still references public.users
-- so we can create migration scripts for them

-- =====================================================
-- 1. FUNCTIONS - Show which functions still reference users
-- =====================================================
SELECT 
    '=== FUNCTIONS STILL REFERENCING users ===' as section,
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) ILIKE '%FROM users%' OR pg_get_functiondef(p.oid) ILIKE '%FROM public.users%' THEN 'FROM users'
        WHEN pg_get_functiondef(p.oid) ILIKE '%JOIN users%' OR pg_get_functiondef(p.oid) ILIKE '%JOIN public.users%' THEN 'JOIN users'
        WHEN pg_get_functiondef(p.oid) ILIKE '%public.users%' THEN 'public.users reference'
        ELSE 'Other users reference'
    END as reference_type
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
-- 2. VIEWS - Show which views still reference users
-- =====================================================
SELECT 
    '=== VIEWS STILL REFERENCING users ===' as section,
    viewname as view_name,
    CASE 
        WHEN definition ILIKE '%FROM users%' OR definition ILIKE '%FROM public.users%' THEN 'FROM users'
        WHEN definition ILIKE '%JOIN users%' OR definition ILIKE '%JOIN public.users%' THEN 'JOIN users'
        WHEN definition ILIKE '%public.users%' THEN 'public.users reference'
        ELSE 'Other users reference'
    END as reference_type,
    LEFT(definition, 200) as definition_preview
FROM pg_views
WHERE schemaname = 'public'
  AND (
      definition ILIKE '%users%'
      OR definition ILIKE '%public.users%'
  )
ORDER BY viewname;

-- =====================================================
-- 3. RLS POLICIES - Show which policies still reference users
-- =====================================================
SELECT 
    '=== RLS POLICIES STILL REFERENCING users ===' as section,
    pp.tablename || '.' || pp.policyname as policy_name,
    CASE 
        WHEN pp.qual IS NOT NULL AND (pp.qual ILIKE '%users%' OR pp.qual ILIKE '%public.users%') THEN 'qual expression'
        WHEN pp.with_check IS NOT NULL AND (pp.with_check ILIKE '%users%' OR pp.with_check ILIKE '%public.users%') THEN 'with_check expression'
        ELSE 'Other'
    END as reference_type,
    COALESCE(LEFT(pp.qual, 200), LEFT(pp.with_check, 200)) as policy_expression_preview
FROM pg_policies pp
WHERE schemaname = 'public'
  AND (
      (pp.qual IS NOT NULL AND (pp.qual ILIKE '%users%' OR pp.qual ILIKE '%public.users%'))
      OR (pp.with_check IS NOT NULL AND (pp.with_check ILIKE '%users%' OR pp.with_check ILIKE '%public.users%'))
  )
ORDER BY pp.tablename, pp.policyname;

-- =====================================================
-- 4. FOREIGN KEYS - Show which FKs still reference users
-- =====================================================
SELECT 
    '=== FOREIGN KEYS STILL REFERENCING users ===' as section,
    tc.table_name || '.' || tc.constraint_name as fk_name,
    kcu.column_name as referencing_column,
    ccu.table_name as referenced_table,
    ccu.column_name as referenced_column
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

-- =====================================================
-- 5. SUMMARY COUNTS
-- =====================================================
SELECT 
    '=== SUMMARY COUNTS ===' as section,
    (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
     WHERE n.nspname = 'public' AND (pg_get_functiondef(p.oid) ILIKE '%FROM users%' OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%' OR pg_get_functiondef(p.oid) ILIKE '%public.users%')) as functions_count,
    (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public' AND (definition ILIKE '%users%' OR definition ILIKE '%public.users%')) as views_count,
    (SELECT COUNT(*) FROM pg_policies pp WHERE schemaname = 'public' AND ((pp.qual IS NOT NULL AND (pp.qual ILIKE '%users%' OR pp.qual ILIKE '%public.users%')) OR (pp.with_check IS NOT NULL AND (pp.with_check ILIKE '%users%' OR pp.with_check ILIKE '%public.users%')))) as rls_policies_count,
    (SELECT COUNT(*) FROM information_schema.table_constraints tc JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND ccu.table_name = 'users') as foreign_keys_count;















