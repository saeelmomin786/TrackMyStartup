-- =====================================================
-- COMPLETE DATABASE MIGRATION CHECK
-- =====================================================
-- This script checks ALL tables, functions, RLS policies, views, and triggers
-- to identify what still references the public.users table
-- =====================================================

-- =====================================================
-- SECTION 1: ALL SQL FUNCTIONS
-- =====================================================
SELECT 
    '=== ALL FUNCTIONS STILL USING public.users ===' as section;

SELECT 
    'FUNCTION' as object_type,
    n.nspname as schema_name,
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid)::text ILIKE '%FROM public.users%' THEN 'FROM users'
        WHEN pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.users%' THEN 'JOIN users'
        WHEN pg_get_functiondef(p.oid)::text ILIKE '%JOIN users%' THEN 'JOIN users (without schema)'
        WHEN pg_get_functiondef(p.oid)::text ILIKE '%users.%' THEN 'users table reference'
        ELSE 'Other users reference'
    END as reference_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname IN ('public', 'auth')
  AND (
    pg_get_functiondef(p.oid)::text ILIKE '%FROM public.users%'
    OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.users%'
    OR (pg_get_functiondef(p.oid)::text ILIKE '%JOIN users%' 
        AND pg_get_functiondef(p.oid)::text NOT ILIKE '%user_profiles%')
    OR (pg_get_functiondef(p.oid)::text ILIKE '%users.%' 
        AND pg_get_functiondef(p.oid)::text NOT ILIKE '%user_profiles%')
  )
ORDER BY n.nspname, p.proname;

-- =====================================================
-- SECTION 2: ALL RLS POLICIES
-- =====================================================
SELECT 
    '=== ALL RLS POLICIES STILL USING public.users ===' as section;

SELECT 
    'RLS_POLICY' as object_type,
    schemaname,
    tablename,
    policyname,
    CASE 
        WHEN qual::text ILIKE '%public.users%' THEN 'Uses public.users in condition'
        WHEN qual::text ILIKE '%users.%' THEN 'Uses users table in condition'
        WHEN with_check::text ILIKE '%public.users%' THEN 'Uses public.users in check'
        WHEN with_check::text ILIKE '%users.%' THEN 'Uses users table in check'
        ELSE 'Uses users table'
    END as reference_type
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual::text ILIKE '%public.users%'
    OR qual::text ILIKE '%users.%'
    OR with_check::text ILIKE '%public.users%'
    OR with_check::text ILIKE '%users.%'
  )
ORDER BY tablename, policyname;

-- =====================================================
-- SECTION 3: ALL VIEWS
-- =====================================================
SELECT 
    '=== ALL VIEWS STILL USING public.users ===' as section;

SELECT 
    'VIEW' as object_type,
    table_schema as schema_name,
    table_name as view_name,
    CASE 
        WHEN view_definition ILIKE '%FROM public.users%' THEN 'FROM users'
        WHEN view_definition ILIKE '%JOIN public.users%' THEN 'JOIN users'
        WHEN view_definition ILIKE '%FROM users%' THEN 'FROM users (without schema)'
        WHEN view_definition ILIKE '%JOIN users%' THEN 'JOIN users (without schema)'
        ELSE 'Uses users table'
    END as reference_type
FROM information_schema.views
WHERE table_schema = 'public'
  AND (
    view_definition ILIKE '%public.users%'
    OR (view_definition ILIKE '%FROM users%' AND view_definition NOT ILIKE '%user_profiles%')
    OR (view_definition ILIKE '%JOIN users%' AND view_definition NOT ILIKE '%user_profiles%')
  )
ORDER BY table_name;

-- =====================================================
-- SECTION 4: ALL TRIGGERS
-- =====================================================
SELECT 
    '=== ALL TRIGGERS STILL USING public.users ===' as section;

SELECT 
    'TRIGGER' as object_type,
    n.nspname as schema_name,
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid)::text as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_triggerdef(t.oid)::text ILIKE '%users%'
  AND pg_get_triggerdef(t.oid)::text NOT ILIKE '%user_profiles%'
ORDER BY c.relname, t.tgname;

-- =====================================================
-- SECTION 5: CHECK ALL TABLES FOR COLUMNS THAT REFERENCE users
-- =====================================================
SELECT 
    '=== TABLES WITH FOREIGN KEYS OR INDEXES ON users ===' as section;

-- Check for foreign key constraints (should be none after migration)
SELECT 
    'FK_CONSTRAINT' as object_type,
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'users'
ORDER BY tc.table_name, tc.constraint_name;

-- Check for indexes that reference users (should be none, but check anyway)
SELECT 
    'INDEX' as object_type,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexdef ILIKE '%users%'
    AND indexdef NOT ILIKE '%user_profiles%'
  )
ORDER BY tablename, indexname;

-- =====================================================
-- SECTION 6: SUMMARY COUNT
-- =====================================================
SELECT 
    '=== SUMMARY COUNTS ===' as section;

SELECT 
    'SUMMARY' as info,
    (SELECT COUNT(*) 
     FROM pg_proc p
     JOIN pg_namespace n ON p.pronamespace = n.oid
     WHERE n.nspname IN ('public', 'auth')
       AND (
         pg_get_functiondef(p.oid)::text ILIKE '%FROM public.users%'
         OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.users%'
         OR (pg_get_functiondef(p.oid)::text ILIKE '%JOIN users%' 
             AND pg_get_functiondef(p.oid)::text NOT ILIKE '%user_profiles%')
       )) as functions_using_users,
    
    (SELECT COUNT(*) 
     FROM pg_policies
     WHERE schemaname = 'public'
       AND (
         qual::text ILIKE '%public.users%'
         OR qual::text ILIKE '%users.%'
         OR with_check::text ILIKE '%public.users%'
       )) as rls_policies_using_users,
    
    (SELECT COUNT(*) 
     FROM information_schema.views
     WHERE table_schema = 'public'
       AND (
         view_definition ILIKE '%public.users%'
         OR (view_definition ILIKE '%FROM users%' AND view_definition NOT ILIKE '%user_profiles%')
         OR (view_definition ILIKE '%JOIN users%' AND view_definition NOT ILIKE '%user_profiles%')
       )) as views_using_users,
    
    (SELECT COUNT(*) 
     FROM information_schema.table_constraints AS tc
     JOIN information_schema.constraint_column_usage AS ccu
       ON ccu.constraint_name = tc.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema = 'public'
       AND ccu.table_name = 'users') as fk_constraints_on_users;

-- =====================================================
-- SECTION 7: LIST ALL TABLES (for reference)
-- =====================================================
SELECT 
    '=== ALL PUBLIC TABLES (for reference) ===' as section;

SELECT 
    'TABLE' as object_type,
    table_schema,
    table_name,
    CASE 
        WHEN table_name = 'users' THEN '⚠️ OLD TABLE (should not be used)'
        WHEN table_name = 'user_profiles' THEN '✅ NEW TABLE (use this)'
        ELSE 'Regular table'
    END as table_status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY 
    CASE WHEN table_name = 'user_profiles' THEN 1
         WHEN table_name = 'users' THEN 2
         ELSE 3
    END,
    table_name;

