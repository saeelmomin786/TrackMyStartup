-- =====================================================
-- CHECK REMAINING REFERENCES TO public.users TABLE
-- =====================================================
-- This script identifies all SQL functions, views, triggers, and RLS policies
-- that still reference the public.users table instead of user_profiles
-- =====================================================

-- 1. Check SQL Functions that reference public.users
-- Note: This checks the function definition text for references to users table
SELECT 
    'FUNCTIONS' as object_type,
    n.nspname as schema_name,
    p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    EXISTS (
      SELECT 1 
      WHERE pg_get_functiondef(p.oid)::text ILIKE '%FROM public.users%'
         OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.users%'
         OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN users%'
         OR pg_get_functiondef(p.oid)::text ILIKE '%users.%'
         OR pg_get_functiondef(p.oid)::text ILIKE '%public.users%'
    )
  )
ORDER BY n.nspname, p.proname;

-- 2. Check RLS Policies that reference public.users
SELECT 
    'RLS_POLICIES' as object_type,
    schemaname,
    tablename,
    policyname,
    CASE WHEN qual IS NOT NULL THEN qual::text ELSE NULL END as policy_condition,
    CASE WHEN with_check IS NOT NULL THEN with_check::text ELSE NULL END as policy_check
FROM pg_policies
WHERE (qual::text ILIKE '%public.users%'
   OR qual::text ILIKE '%users.%'
   OR with_check::text ILIKE '%public.users%'
   OR with_check::text ILIKE '%users.%')
ORDER BY schemaname, tablename, policyname;

-- 3. Check Views that reference public.users
SELECT 
    'VIEWS' as object_type,
    table_schema as schema_name,
    table_name as view_name,
    view_definition
FROM information_schema.views
WHERE view_definition ILIKE '%public.users%'
   OR view_definition ILIKE '%FROM users%'
   OR view_definition ILIKE '%JOIN users%'
ORDER BY table_schema, table_name;

-- 4. Check Triggers that might reference users table
SELECT 
    'TRIGGERS' as object_type,
    t.tgname as trigger_name,
    n.nspname as schema_name,
    c.relname as table_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_triggerdef(t.oid)::text ILIKE '%users%'
ORDER BY n.nspname, c.relname, t.tgname;

-- 5. Summary: Count references by type
SELECT 
    'SUMMARY' as info,
    (SELECT COUNT(*) 
     FROM pg_proc p
     JOIN pg_namespace n ON p.pronamespace = n.oid
     WHERE n.nspname = 'public'
       AND (pg_get_functiondef(p.oid)::text ILIKE '%FROM public.users%'
        OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.users%'
        OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN users%')) as functions_count,
    
    (SELECT COUNT(*) 
     FROM pg_policies
     WHERE (qual::text ILIKE '%public.users%'
        OR qual::text ILIKE '%users.%'
        OR with_check::text ILIKE '%public.users%')) as rls_policies_count,
    
    (SELECT COUNT(*) 
     FROM information_schema.views
     WHERE view_definition ILIKE '%public.users%'
        OR view_definition ILIKE '%FROM users%'
        OR view_definition ILIKE '%JOIN users%') as views_count,
    
    (SELECT COUNT(*) 
     FROM pg_trigger t
     JOIN pg_class c ON t.tgrelid = c.oid
     JOIN pg_namespace n ON c.relnamespace = n.oid
     WHERE n.nspname = 'public'
       AND pg_get_triggerdef(t.oid)::text ILIKE '%users%') as triggers_count;

-- 6. Check specific critical functions (investment offers related)
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

