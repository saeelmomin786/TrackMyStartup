-- =====================================================
-- CHECK ALL TABLES USING AUTH.USERS
-- =====================================================
-- This query shows which tables reference auth.users vs public.users
-- and helps verify that all tables are using auth.users correctly

-- =====================================================
-- 1. Check All Foreign Key Constraints on User-Related Columns
-- =====================================================

SELECT 
    '=== FOREIGN KEY CONSTRAINTS ON USER COLUMNS ===' as section;

SELECT 
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name,
    CASE 
        WHEN ccu.table_schema = 'auth' AND ccu.table_name = 'users' THEN '✅ auth.users'
        WHEN ccu.table_schema = 'public' AND ccu.table_name = 'users' THEN '❌ public.users (should be auth.users)'
        ELSE '⚠️ Other: ' || ccu.table_schema || '.' || ccu.table_name
    END AS status,
    pg_get_constraintdef(tc.oid) AS constraint_definition
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND (
        -- Check for columns that might reference users
        kcu.column_name LIKE '%user%id%' 
        OR kcu.column_name LIKE '%auth%user%id%'
        OR kcu.column_name = 'user_id'
        OR kcu.column_name = 'auth_user_id'
        OR kcu.table_name = 'users'
        OR ccu.table_name = 'users'
    )
ORDER BY 
    CASE 
        WHEN ccu.table_schema = 'auth' AND ccu.table_name = 'users' THEN 1
        WHEN ccu.table_schema = 'public' AND ccu.table_name = 'users' THEN 2
        ELSE 3
    END,
    tc.table_name,
    kcu.column_name;

-- =====================================================
-- 2. Check All Tables with user_id or auth_user_id Columns
-- =====================================================

SELECT 
    '=== TABLES WITH USER ID COLUMNS ===' as section;

SELECT 
    table_schema,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE (
    column_name LIKE '%user%id%' 
    OR column_name LIKE '%auth%user%id%'
    OR column_name = 'user_id'
    OR column_name = 'auth_user_id'
)
AND table_schema IN ('public', 'auth')
AND table_name NOT LIKE 'pg_%'
ORDER BY table_schema, table_name, column_name;

-- =====================================================
-- 3. Specifically Check startups Table
-- =====================================================

SELECT 
    '=== STARTUPS TABLE CONSTRAINT CHECK ===' as section;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema || '.' || ccu.table_name AS references_table,
    CASE 
        WHEN ccu.table_schema = 'auth' AND ccu.table_name = 'users' THEN '✅ CORRECT - Uses auth.users'
        WHEN ccu.table_schema = 'public' AND ccu.table_name = 'users' THEN '❌ WRONG - Should use auth.users'
        ELSE '⚠️ Other reference'
    END AS status,
    pg_get_constraintdef(tc.oid) AS constraint_definition
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.table_name = 'startups'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'user_id';

-- =====================================================
-- 4. Check user_profiles Table (Should Use auth.users)
-- =====================================================

SELECT 
    '=== USER_PROFILES TABLE CONSTRAINT CHECK ===' as section;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema || '.' || ccu.table_name AS references_table,
    CASE 
        WHEN ccu.table_schema = 'auth' AND ccu.table_name = 'users' THEN '✅ CORRECT - Uses auth.users'
        WHEN ccu.table_schema = 'public' AND ccu.table_name = 'users' THEN '❌ WRONG - Should use auth.users'
        ELSE '⚠️ Other reference'
    END AS status,
    pg_get_constraintdef(tc.oid) AS constraint_definition
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.table_name = 'user_profiles'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'auth_user_id';

-- =====================================================
-- 5. Summary: Tables That Need Fixing
-- =====================================================

SELECT 
    '=== SUMMARY: TABLES THAT STILL REFERENCE public.users ===' as section;

SELECT 
    tc.table_schema || '.' || tc.table_name AS table_name,
    kcu.column_name,
    '❌ Still references public.users - needs fix' AS status,
    pg_get_constraintdef(tc.oid) AS current_constraint
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_schema = 'public'
    AND ccu.table_name = 'users'
    AND (
        kcu.column_name LIKE '%user%id%' 
        OR kcu.column_name LIKE '%auth%user%id%'
    )
ORDER BY tc.table_name;

-- =====================================================
-- 6. Summary: Tables Correctly Using auth.users
-- =====================================================

SELECT 
    '=== SUMMARY: TABLES CORRECTLY USING auth.users ===' as section;

SELECT 
    tc.table_schema || '.' || tc.table_name AS table_name,
    kcu.column_name,
    '✅ Correctly references auth.users' AS status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_schema = 'auth'
    AND ccu.table_name = 'users'
ORDER BY tc.table_name, kcu.column_name;








