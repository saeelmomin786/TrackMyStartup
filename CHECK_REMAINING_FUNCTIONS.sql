-- =====================================================
-- CHECK REMAINING FUNCTIONS FOR users TABLE REFERENCES
-- =====================================================
-- Check if these functions still reference the users table
-- Run each query separately to get function definitions

-- 1. Check assign_evaluators_to_application
SELECT 
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) ILIKE '%FROM users%' 
            OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
            OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
        THEN '❌ USES users TABLE'
        ELSE '✅ NO users TABLE'
    END as status,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'assign_evaluators_to_application';

-- 2. Check create_advisor_relationships_automatically
SELECT 
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) ILIKE '%FROM users%' 
            OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
            OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
        THEN '❌ USES users TABLE'
        ELSE '✅ NO users TABLE'
    END as status,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'create_advisor_relationships_automatically';

-- 3. Check create_existing_investment_advisor_relationships
SELECT 
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) ILIKE '%FROM users%' 
            OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
            OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
        THEN '❌ USES users TABLE'
        ELSE '✅ NO users TABLE'
    END as status,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'create_existing_investment_advisor_relationships';

-- 4. Check create_investment_offers_automatically
SELECT 
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) ILIKE '%FROM users%' 
            OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
            OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
        THEN '❌ USES users TABLE'
        ELSE '✅ NO users TABLE'
    END as status,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'create_investment_offers_automatically';

-- 5. Check create_missing_offers
SELECT 
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) ILIKE '%FROM users%' 
            OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
            OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
        THEN '❌ USES users TABLE'
        ELSE '✅ NO users TABLE'
    END as status,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'create_missing_offers';

-- 6. Check create_missing_relationships
SELECT 
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) ILIKE '%FROM users%' 
            OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
            OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
        THEN '❌ USES users TABLE'
        ELSE '✅ NO users TABLE'
    END as status,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'create_missing_relationships';











