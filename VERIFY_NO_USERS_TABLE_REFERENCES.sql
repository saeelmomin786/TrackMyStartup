-- =====================================================
-- COMPREHENSIVE VERIFICATION: Check for ANY remaining references to public.users
-- =====================================================
-- Run this after all migrations to ensure nothing references users table anymore
-- Goal: Verify we can safely delete the users table

-- =====================================================
-- 1. CHECK FUNCTIONS
-- =====================================================
SELECT 
    'FUNCTIONS' as check_type,
    COUNT(*) as remaining_references,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO users TABLE REFERENCES IN FUNCTIONS'
        ELSE '❌ ' || COUNT(*) || ' FUNCTIONS STILL REFERENCE users TABLE'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
      pg_get_functiondef(p.oid) ILIKE '%FROM users%'
      OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
      OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
      OR pg_get_functiondef(p.oid) ILIKE '%JOIN public.users%'
      OR pg_get_functiondef(p.oid) ILIKE '%FROM public.users%'
  );

-- Show which functions (if any) still reference users
SELECT 
    'FUNCTION_DETAILS' as check_type,
    p.proname as function_name,
    '❌ STILL REFERENCES users TABLE' as status
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
-- 2. CHECK VIEWS
-- =====================================================
SELECT 
    'VIEWS' as check_type,
    COUNT(*) as remaining_references,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO users TABLE REFERENCES IN VIEWS'
        ELSE '❌ ' || COUNT(*) || ' VIEWS STILL REFERENCE users TABLE'
    END as status
FROM pg_views
WHERE schemaname = 'public'
  AND (
      definition ILIKE '%users%'
      OR definition ILIKE '%public.users%'
  );

-- Show which views (if any) still reference users
SELECT 
    'VIEW_DETAILS' as check_type,
    viewname as view_name,
    '❌ STILL REFERENCES users TABLE' as status
FROM pg_views
WHERE schemaname = 'public'
  AND (
      definition ILIKE '%users%'
      OR definition ILIKE '%public.users%'
  )
ORDER BY viewname;

-- =====================================================
-- 3. CHECK RLS POLICIES (using pg_policy system table)
-- =====================================================
SELECT 
    'RLS_POLICIES' as check_type,
    COUNT(*) as remaining_references,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO users TABLE REFERENCES IN RLS POLICIES'
        ELSE '❌ ' || COUNT(*) || ' RLS POLICIES STILL REFERENCE users TABLE'
    END as status
FROM pg_policies pp
WHERE schemaname = 'public'
  AND (
      (pp.qual IS NOT NULL AND (pp.qual ILIKE '%users%' OR pp.qual ILIKE '%public.users%'))
      OR (pp.with_check IS NOT NULL AND (pp.with_check ILIKE '%users%' OR pp.with_check ILIKE '%public.users%'))
  );

-- Show which RLS policies (if any) still reference users
SELECT 
    'RLS_POLICY_DETAILS' as check_type,
    pp.tablename || '.' || pp.policyname as policy_name,
    '❌ STILL REFERENCES users TABLE' as status
FROM pg_policies pp
WHERE schemaname = 'public'
  AND (
      (pp.qual IS NOT NULL AND (pp.qual ILIKE '%users%' OR pp.qual ILIKE '%public.users%'))
      OR (pp.with_check IS NOT NULL AND (pp.with_check ILIKE '%users%' OR pp.with_check ILIKE '%public.users%'))
  )
ORDER BY pp.tablename, pp.policyname;

-- =====================================================
-- 4. CHECK FOREIGN KEY CONSTRAINTS
-- =====================================================
-- Note: We already migrated FKs to indexes, but let's verify
SELECT 
    'FOREIGN_KEYS' as check_type,
    COUNT(*) as remaining_references,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO FOREIGN KEYS REFERENCE users TABLE'
        ELSE '❌ ' || COUNT(*) || ' FOREIGN KEYS STILL REFERENCE users TABLE'
    END as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'users';

-- Show which foreign keys (if any) still reference users
SELECT 
    'FK_DETAILS' as check_type,
    tc.table_name || '.' || tc.constraint_name as fk_name,
    '❌ STILL REFERENCES users TABLE' as status
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
-- 5. FINAL SUMMARY
-- =====================================================
SELECT 
    '=== FINAL SUMMARY ===' as summary,
    CASE 
        WHEN (
            (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
             WHERE n.nspname = 'public' AND (pg_get_functiondef(p.oid) ILIKE '%FROM users%' OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%' OR pg_get_functiondef(p.oid) ILIKE '%public.users%')) = 0
            AND (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public' AND (definition ILIKE '%users%' OR definition ILIKE '%public.users%')) = 0
            AND (SELECT COUNT(*) FROM pg_policies pp WHERE schemaname = 'public' AND ((pp.qual IS NOT NULL AND (pp.qual ILIKE '%users%' OR pp.qual ILIKE '%public.users%')) OR (pp.with_check IS NOT NULL AND (pp.with_check ILIKE '%users%' OR pp.with_check ILIKE '%public.users%')))) = 0
            AND (SELECT COUNT(*) FROM information_schema.table_constraints tc JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND ccu.table_name = 'users') = 0
        ) THEN '✅ SAFE TO DELETE users TABLE - NO REFERENCES FOUND'
        ELSE '❌ DO NOT DELETE users TABLE YET - REFERENCES STILL EXIST'
    END as final_status;

