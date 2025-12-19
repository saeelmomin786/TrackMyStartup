-- =====================================================
-- COMPLETE DATABASE MIGRATION CHECK (SIMPLE VERSION)
-- =====================================================
-- Run each section separately if needed
-- =====================================================

-- SECTION 1: Functions using users table
SELECT 'Functions using users:' as info;
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

-- SECTION 2: RLS Policies using users table
SELECT 'RLS Policies using users:' as info;
SELECT 
    tablename,
    policyname,
    '❌ Uses users table' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    COALESCE(qual::text, '') ILIKE '%public.users%'
    OR COALESCE(qual::text, '') ILIKE '%users.%'
    OR COALESCE(with_check::text, '') ILIKE '%public.users%'
  )
ORDER BY tablename, policyname;

-- SECTION 3: Views using users table
SELECT 'Views using users:' as info;
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
SELECT 'Foreign Keys pointing to users:' as info;
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    '❌ FK points to users table' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'users'
ORDER BY tc.table_name;

-- SECTION 5: Summary
SELECT 'Summary Counts:' as info;
SELECT 
    (SELECT COUNT(*) FROM pg_proc p
     JOIN pg_namespace n ON p.pronamespace = n.oid
     WHERE n.nspname = 'public'
       AND (pg_get_functiondef(p.oid)::text ILIKE '%FROM public.users%'
         OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.users%')) as functions_count,
    
    (SELECT COUNT(*) FROM pg_policies
     WHERE schemaname = 'public'
       AND (COALESCE(qual::text, '') ILIKE '%public.users%' 
         OR COALESCE(with_check::text, '') ILIKE '%public.users%')) as rls_policies_count,
    
    (SELECT COUNT(*) FROM information_schema.views
     WHERE table_schema = 'public'
       AND view_definition ILIKE '%public.users%') as views_count,
    
    (SELECT COUNT(*) FROM information_schema.table_constraints AS tc
     JOIN information_schema.constraint_column_usage AS ccu
       ON ccu.constraint_name = tc.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema = 'public'
       AND ccu.table_name = 'users') as foreign_keys_count;

