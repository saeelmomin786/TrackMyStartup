-- =====================================================
-- CHECK MIGRATION ONE BY ONE (SAFEST VERSION)
-- =====================================================
-- Run each query separately to avoid errors
-- =====================================================

-- QUERY 1: Functions using users table
SELECT 
    p.proname as function_name,
    '❌ Uses users table' as status
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

-- QUERY 2: RLS Policies using users table (query system tables directly to avoid array_agg error)
SELECT 
    c.relname as tablename,
    pol.polname as policyname,
    '❌ Uses users table' as status
FROM pg_policy pol
JOIN pg_class c ON pol.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    pg_get_expr(pol.polqual, pol.polrelid) ILIKE '%public.users%'
    OR pg_get_expr(pol.polqual, pol.polrelid) ILIKE '%users.%'
    OR pg_get_expr(pol.polwithcheck, pol.polrelid) ILIKE '%public.users%'
    OR pg_get_expr(pol.polwithcheck, pol.polrelid) ILIKE '%users.%'
  )
ORDER BY c.relname, pol.polname;

-- QUERY 3: Views using users table (run separately)
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

-- QUERY 4: Foreign Keys pointing to users (run separately)
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    '❌ FK points to users' as status
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

-- QUERY 5: Count functions (run separately)
SELECT COUNT(*) as functions_using_users
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    pg_get_functiondef(p.oid)::text ILIKE '%FROM public.users%'
    OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.users%'
  );

-- QUERY 6: Count RLS policies (using system tables directly to avoid array_agg error)
SELECT COUNT(*) as rls_policies_using_users
FROM pg_policy pol
JOIN pg_class c ON pol.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    pg_get_expr(pol.polqual, pol.polrelid) ILIKE '%public.users%'
    OR pg_get_expr(pol.polqual, pol.polrelid) ILIKE '%users.%'
    OR pg_get_expr(pol.polwithcheck, pol.polrelid) ILIKE '%public.users%'
  );

-- QUERY 7: Count views (run separately)
SELECT COUNT(*) as views_using_users
FROM information_schema.views
WHERE table_schema = 'public'
  AND view_definition ILIKE '%public.users%';

-- QUERY 8: Count foreign keys (run separately)
SELECT COUNT(*) as foreign_keys_to_users
FROM information_schema.table_constraints AS tc
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'users';

