-- =====================================================
-- GET REMAINING FUNCTIONS AND VIEWS THAT REFERENCE users
-- =====================================================
-- Run this to see what still needs migration

-- =====================================================
-- 1. FUNCTIONS (2 remaining)
-- =====================================================
SELECT 
    '=== REMAINING FUNCTIONS ===' as section,
    p.proname as function_name,
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
    '=== REMAINING VIEWS ===' as section,
    viewname as view_name,
    definition as full_definition
FROM pg_views
WHERE schemaname = 'public'
  AND (
      definition ILIKE '%users%'
      OR definition ILIKE '%public.users%'
  )
ORDER BY viewname;







