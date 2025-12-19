-- Check which functions use user_profiles first (with or without fallback)
-- vs functions that ONLY use users table
-- Run each query separately

-- Query 1: Functions that use user_profiles (good!)
SELECT 
    'USES user_profiles' as status,
    p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    pg_get_functiondef(p.oid)::text ILIKE '%FROM public.user_profiles%'
    OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.user_profiles%'
  )
ORDER BY p.proname;

-- Query 2: Functions that use users table - check individually for fallback
-- (This list shows functions using users - manually check if they also reference user_profiles)
SELECT 
    'USES users table' as status,
    p.proname as function_name,
    'Check manually for fallback' as note
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

