-- Check a specific function for fallback logic
-- Replace 'function_name_here' with the actual function name

-- Example: Check accept_investment_offer_with_fee for fallback
SELECT 
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid)::text ILIKE '%FROM public.user_profiles%'
          OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.user_profiles%'
        THEN '✅ Uses user_profiles'
        ELSE '❌ Does NOT use user_profiles'
    END as uses_user_profiles,
    CASE 
        WHEN pg_get_functiondef(p.oid)::text ILIKE '%FROM public.users%'
          OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.users%'
        THEN '✅ Uses users'
        ELSE '❌ Does NOT use users'
    END as uses_users,
    CASE 
        WHEN (pg_get_functiondef(p.oid)::text ILIKE '%FROM public.user_profiles%'
              OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.user_profiles%')
          AND (pg_get_functiondef(p.oid)::text ILIKE '%FROM public.users%'
               OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.users%')
        THEN '✅ Has fallback (uses both)'
        WHEN pg_get_functiondef(p.oid)::text ILIKE '%FROM public.user_profiles%'
          OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.user_profiles%'
        THEN '✅ Uses ONLY user_profiles (good!)'
        WHEN pg_get_functiondef(p.oid)::text ILIKE '%FROM public.users%'
          OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.users%'
        THEN '❌ Uses ONLY users (needs migration)'
        ELSE '⚠️ No clear reference'
    END as migration_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'accept_investment_offer_with_fee',
    'get_offers_for_investment_advisor',
    'should_reveal_contact_details',
    'set_advisor_offer_visibility',
    'get_user_role',
    'get_current_profile_safe'
  )
ORDER BY p.proname;


