-- =====================================================
-- CHECK REMAINING REFERENCES TO public.users TABLE (SIMPLE VERSION)
-- =====================================================
-- Run each section separately if you get errors
-- =====================================================

-- SECTION 1: Check SQL Functions that reference public.users
SELECT 
    'FUNCTIONS' as object_type,
    n.nspname as schema_name,
    p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid)::text ILIKE '%FROM public.users%'
ORDER BY p.proname;

-- SECTION 2: Check SQL Functions with JOIN users
SELECT 
    'FUNCTIONS_JOIN' as object_type,
    n.nspname as schema_name,
    p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.users%'
    OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN users%')
ORDER BY p.proname;

-- SECTION 3: Check RLS Policies that reference public.users
SELECT 
    'RLS_POLICIES' as object_type,
    schemaname,
    tablename,
    policyname
FROM pg_policies
WHERE qual::text ILIKE '%public.users%'
   OR qual::text ILIKE '%users.%'
   OR with_check::text ILIKE '%public.users%'
   OR with_check::text ILIKE '%users.%'
ORDER BY schemaname, tablename, policyname;

-- SECTION 4: Check Views that reference public.users
SELECT 
    'VIEWS' as object_type,
    table_schema as schema_name,
    table_name as view_name
FROM information_schema.views
WHERE view_definition ILIKE '%public.users%'
   OR view_definition ILIKE '%FROM users%'
   OR view_definition ILIKE '%JOIN users%'
ORDER BY table_schema, table_name;

-- SECTION 5: Check critical functions status
SELECT 
    'CRITICAL_FUNCTIONS' as object_type,
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid)::text ILIKE '%FROM public.users%' 
          OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.users%'
          OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN users%'
        THEN '❌ STILL USES public.users'
        WHEN pg_get_functiondef(p.oid)::text ILIKE '%FROM public.user_profiles%'
          OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.user_profiles%'
        THEN '✅ USES user_profiles'
        ELSE '⚠️ NO CLEAR REFERENCE'
    END as table_reference
FROM pg_proc p
WHERE p.proname IN (
    'approve_investor_advisor_offer',
    'approve_startup_advisor_offer',
    'approve_startup_offer',
    'create_investment_offer_with_fee',
    'create_co_investment_offer'
)
AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY p.proname;

