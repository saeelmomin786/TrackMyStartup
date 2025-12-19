-- Quick check for critical functions only
-- This checks the 5 most important functions

SELECT 
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
    END as status
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

