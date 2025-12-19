-- =====================================================
-- COMPLETE DATABASE MIGRATION CHECK (SAFE VERSION)
-- =====================================================
-- This version avoids array_agg errors by using safer queries
-- Run each section separately
-- =====================================================

-- SECTION 1: Functions using users table
SELECT '=== Functions using users table ===' as section;
SELECT 
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid)::text ILIKE '%FROM public.users%' THEN '❌ FROM public.users'
        WHEN pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.users%' THEN '❌ JOIN public.users'
        ELSE '❌ Uses users'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    pg_get_functiondef(p.oid)::text ILIKE '%FROM public.users%'
    OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.users%'
    OR (pg_get_functiondef(p.oid)::text ILIKE '%JOIN users%' 
        AND pg_get_functiondef(p.oid)::text NOT ILIKE '%user_profiles%')
  )
ORDER BY p.proname;

-- SECTION 2: RLS Policies using users table (safer query)
SELECT '=== RLS Policies using users table ===' as section;
SELECT 
    schemaname,
    tablename,
    policyname,
    '❌ Uses users table' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    CASE WHEN qual IS NOT NULL THEN qual::text ELSE '' END ILIKE '%public.users%'
    OR CASE WHEN qual IS NOT NULL THEN qual::text ELSE '' END ILIKE '%users.%'
    OR CASE WHEN with_check IS NOT NULL THEN with_check::text ELSE '' END ILIKE '%public.users%'
  )
ORDER BY tablename, policyname;

-- SECTION 3: Views using users table
SELECT '=== Views using users table ===' as section;
SELECT 
    table_name as view_name,
    '❌ Uses users table' as status
FROM information_schema.views
WHERE table_schema = 'public'
  AND (
    view_definition ILIKE '%public.users%'
    OR (view_definition ILIKE '%FROM users%' AND view_definition NOT ILIKE '%user_profiles%')
    OR (view_definition ILIKE '%JOIN users%' AND view_definition NOT ILIKE '%user_profiles%')
  )
ORDER BY table_name;

-- SECTION 4: Foreign Keys on users table
SELECT '=== Foreign Keys pointing to users table ===' as section;
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    '❌ FK points to users table' as status
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
ORDER BY tc.table_name;

-- SECTION 5: Triggers using users table
SELECT '=== Triggers using users table ===' as section;
SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    t.tgname as trigger_name,
    '❌ Uses users table' as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_triggerdef(t.oid)::text ILIKE '%users%'
  AND pg_get_triggerdef(t.oid)::text NOT ILIKE '%user_profiles%'
ORDER BY c.relname, t.tgname;

-- SECTION 6: Summary Counts
SELECT '=== Summary Counts ===' as section;
SELECT 
    'Functions' as category,
    COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    pg_get_functiondef(p.oid)::text ILIKE '%FROM public.users%'
    OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.users%'
  )
UNION ALL
SELECT 
    'RLS Policies' as category,
    COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    CASE WHEN qual IS NOT NULL THEN qual::text ELSE '' END ILIKE '%public.users%'
    OR CASE WHEN with_check IS NOT NULL THEN with_check::text ELSE '' END ILIKE '%public.users%'
  )
UNION ALL
SELECT 
    'Views' as category,
    COUNT(*) as count
FROM information_schema.views
WHERE table_schema = 'public'
  AND view_definition ILIKE '%public.users%'
UNION ALL
SELECT 
    'Foreign Keys' as category,
    COUNT(*) as count
FROM information_schema.table_constraints AS tc
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'users'
UNION ALL
SELECT 
    'Triggers' as category,
    COUNT(*) as count
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_triggerdef(t.oid)::text ILIKE '%users%'
  AND pg_get_triggerdef(t.oid)::text NOT ILIKE '%user_profiles%';

