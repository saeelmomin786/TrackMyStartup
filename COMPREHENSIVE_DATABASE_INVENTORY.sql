-- =====================================================
-- COMPREHENSIVE DATABASE INVENTORY
-- =====================================================
-- This script creates a complete inventory of all database objects
-- to plan the migration from users table to user_profiles
-- Run each section separately
-- =====================================================

-- SECTION 1: All Tables in Public Schema
SELECT 
    'TABLE' as object_type,
    table_name,
    'N/A' as reference_status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- SECTION 2: All Functions in Public Schema (with users reference check)
-- Run this query - it will show function names
SELECT 
    'FUNCTION' as object_type,
    p.proname as object_name,
    CASE 
        WHEN pg_get_functiondef(p.oid)::text ILIKE '%FROM public.user_profiles%'
          OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.user_profiles%'
        THEN '✅ Uses user_profiles'
        WHEN pg_get_functiondef(p.oid)::text ILIKE '%FROM public.users%'
          OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.users%'
          OR (pg_get_functiondef(p.oid)::text ILIKE '%JOIN users%' 
              AND pg_get_functiondef(p.oid)::text NOT ILIKE '%user_profiles%')
        THEN '❌ Uses users table'
        ELSE '⚠️ No clear reference'
    END as reference_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY reference_status, p.proname;

-- SECTION 3: All Views in Public Schema
SELECT 
    'VIEW' as object_type,
    table_name as object_name,
    CASE 
        WHEN view_definition ILIKE '%public.user_profiles%' THEN '✅ Uses user_profiles'
        WHEN view_definition ILIKE '%public.users%' 
          OR (view_definition ILIKE '%FROM users%' AND view_definition NOT ILIKE '%user_profiles%')
          OR (view_definition ILIKE '%JOIN users%' AND view_definition NOT ILIKE '%user_profiles%')
        THEN '❌ Uses users table'
        ELSE '⚠️ No clear reference'
    END as reference_status
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY reference_status, table_name;

-- SECTION 4: All Foreign Keys Pointing to users table
SELECT 
    'FOREIGN_KEY' as object_type,
    tc.table_name as source_table,
    kcu.column_name as source_column,
    tc.constraint_name,
    '❌ Points to users table' as reference_status
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
ORDER BY tc.table_name, kcu.column_name;

-- SECTION 5: Summary Counts
SELECT 
    'SUMMARY' as info,
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tables,
    
    (SELECT COUNT(*) FROM pg_proc p
     JOIN pg_namespace n ON p.pronamespace = n.oid
     WHERE n.nspname = 'public') as total_functions,
    
    (SELECT COUNT(*) FROM information_schema.views
     WHERE table_schema = 'public') as total_views,
    
    (SELECT COUNT(*) FROM information_schema.table_constraints AS tc
     JOIN information_schema.constraint_column_usage AS ccu
       ON ccu.constraint_name = tc.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema = 'public'
       AND ccu.table_name = 'users') as fk_to_users_count,
    
    (SELECT COUNT(*) FROM pg_proc p
     JOIN pg_namespace n ON p.pronamespace = n.oid
     WHERE n.nspname = 'public'
       AND (pg_get_functiondef(p.oid)::text ILIKE '%FROM public.users%'
         OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.users%'
         OR (pg_get_functiondef(p.oid)::text ILIKE '%JOIN users%' 
             AND pg_get_functiondef(p.oid)::text NOT ILIKE '%user_profiles%'))) as functions_using_users,
    
    (SELECT COUNT(*) FROM information_schema.views
     WHERE table_schema = 'public'
       AND (view_definition ILIKE '%public.users%'
         OR (view_definition ILIKE '%FROM users%' AND view_definition NOT ILIKE '%user_profiles%')
         OR (view_definition ILIKE '%JOIN users%' AND view_definition NOT ILIKE '%user_profiles%'))) as views_using_users;


