-- =====================================================
-- VERIFY NO FALLBACK LOGIC TO users TABLE
-- =====================================================
-- This script checks for any fallback patterns that might still query users table

-- =====================================================
-- 1. Check for COALESCE with users table
-- =====================================================
SELECT 
    'COALESCE_FALLBACK' as check_type,
    COUNT(*) as functions_with_coalesce_fallback,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO COALESCE FALLBACK TO users TABLE'
        ELSE '❌ ' || COUNT(*) || ' FUNCTIONS USE COALESCE WITH users TABLE'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%COALESCE%'
  AND pg_get_functiondef(p.oid) ILIKE '%FROM users%'
  AND pg_get_functiondef(p.oid) NOT ILIKE '%user_profiles%';

-- =====================================================
-- 2. Check for IF/ELSE fallback patterns
-- =====================================================
SELECT 
    'IF_ELSE_FALLBACK' as check_type,
    COUNT(*) as functions_with_if_else_fallback,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO IF/ELSE FALLBACK TO users TABLE'
        ELSE '❌ ' || COUNT(*) || ' FUNCTIONS USE IF/ELSE WITH users TABLE'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
      pg_get_functiondef(p.oid) ILIKE '%IF NOT FOUND%'
      OR pg_get_functiondef(p.oid) ILIKE '%ELSE%FROM users%'
      OR pg_get_functiondef(p.oid) ILIKE '%IF EXISTS%users%'
  )
  AND pg_get_functiondef(p.oid) ILIKE '%FROM users%'
  AND pg_get_functiondef(p.oid) NOT ILIKE '%user_profiles%';

-- =====================================================
-- 3. Check for LEFT JOIN fallback patterns
-- =====================================================
SELECT 
    'LEFT_JOIN_FALLBACK' as check_type,
    COUNT(*) as functions_with_left_join_fallback,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO LEFT JOIN FALLBACK TO users TABLE'
        ELSE '❌ ' || COUNT(*) || ' FUNCTIONS USE LEFT JOIN WITH users TABLE'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%LEFT JOIN users%'
  AND pg_get_functiondef(p.oid) NOT ILIKE '%user_profiles%';

-- =====================================================
-- 4. Check for OR EXISTS fallback patterns
-- =====================================================
SELECT 
    'OR_EXISTS_FALLBACK' as check_type,
    COUNT(*) as functions_with_or_exists_fallback,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO OR EXISTS FALLBACK TO users TABLE'
        ELSE '❌ ' || COUNT(*) || ' FUNCTIONS USE OR EXISTS WITH users TABLE'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
      pg_get_functiondef(p.oid) ILIKE '%OR EXISTS%users%'
      OR pg_get_functiondef(p.oid) ILIKE '%OR (SELECT%FROM users%'
  )
  AND pg_get_functiondef(p.oid) NOT ILIKE '%user_profiles%';

-- =====================================================
-- 5. Check for UNION fallback patterns
-- =====================================================
SELECT 
    'UNION_FALLBACK' as check_type,
    COUNT(*) as functions_with_union_fallback,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO UNION FALLBACK TO users TABLE'
        ELSE '❌ ' || COUNT(*) || ' FUNCTIONS USE UNION WITH users TABLE'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%UNION%'
  AND pg_get_functiondef(p.oid) ILIKE '%FROM users%'
  AND pg_get_functiondef(p.oid) NOT ILIKE '%user_profiles%';

-- =====================================================
-- 6. Check for CASE WHEN fallback patterns
-- =====================================================
SELECT 
    'CASE_WHEN_FALLBACK' as check_type,
    COUNT(*) as functions_with_case_fallback,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO CASE WHEN FALLBACK TO users TABLE'
        ELSE '❌ ' || COUNT(*) || ' FUNCTIONS USE CASE WHEN WITH users TABLE'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%CASE%WHEN%users%'
  AND pg_get_functiondef(p.oid) NOT ILIKE '%user_profiles%';

-- =====================================================
-- 7. FINAL VERIFICATION: Any function that queries users table
-- =====================================================
SELECT 
    '=== FINAL FALLBACK CHECK ===' as summary,
    COUNT(*) as total_functions_with_users_fallback,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO FALLBACK LOGIC TO users TABLE - FULLY OPTIMIZED!'
        ELSE '❌ ' || COUNT(*) || ' FUNCTIONS STILL HAVE FALLBACK TO users TABLE'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
      pg_get_functiondef(p.oid) ILIKE '%FROM users%'
      OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
      OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
  )
  AND pg_get_functiondef(p.oid) NOT ILIKE '%auth.users%'
  AND pg_get_functiondef(p.oid) NOT ILIKE '%user_profiles%';

-- Show details if any found
SELECT 
    'FALLBACK_DETAILS' as check_type,
    p.proname as function_name,
    '⚠️ Still has fallback to users table' as status,
    substring(pg_get_functiondef(p.oid), 1, 500) as function_snippet
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
      pg_get_functiondef(p.oid) ILIKE '%FROM users%'
      OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
      OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
  )
  AND pg_get_functiondef(p.oid) NOT ILIKE '%auth.users%'
  AND pg_get_functiondef(p.oid) NOT ILIKE '%user_profiles%'
ORDER BY p.proname;











