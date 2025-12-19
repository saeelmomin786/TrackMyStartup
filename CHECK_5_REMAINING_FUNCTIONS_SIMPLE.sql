-- =====================================================
-- CHECK 5 REMAINING FUNCTIONS - RUN ALL AT ONCE
-- =====================================================
-- This will check all 5 remaining functions in one go

-- 1. assign_evaluators_to_application
SELECT 
    '1. assign_evaluators_to_application' as check_number,
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) ILIKE '%FROM users%' 
            OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
            OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
        THEN '❌ USES users TABLE'
        ELSE '✅ NO users TABLE'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'assign_evaluators_to_application'

UNION ALL

-- 2. create_advisor_relationships_automatically
SELECT 
    '2. create_advisor_relationships_automatically' as check_number,
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) ILIKE '%FROM users%' 
            OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
            OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
        THEN '❌ USES users TABLE'
        ELSE '✅ NO users TABLE'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'create_advisor_relationships_automatically'

UNION ALL

-- 3. create_existing_investment_advisor_relationships
SELECT 
    '3. create_existing_investment_advisor_relationships' as check_number,
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) ILIKE '%FROM users%' 
            OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
            OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
        THEN '❌ USES users TABLE'
        ELSE '✅ NO users TABLE'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'create_existing_investment_advisor_relationships'

UNION ALL

-- 4. create_investment_offers_automatically
SELECT 
    '4. create_investment_offers_automatically' as check_number,
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) ILIKE '%FROM users%' 
            OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
            OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
        THEN '❌ USES users TABLE'
        ELSE '✅ NO users TABLE'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'create_investment_offers_automatically'

UNION ALL

-- 5. create_missing_offers
SELECT 
    '5. create_missing_offers' as check_number,
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) ILIKE '%FROM users%' 
            OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
            OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
        THEN '❌ USES users TABLE'
        ELSE '✅ NO users TABLE'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'create_missing_offers';


