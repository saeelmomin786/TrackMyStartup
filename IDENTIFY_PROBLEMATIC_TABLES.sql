-- =====================================================
-- IDENTIFY TABLES WITH RLS ISSUES
-- =====================================================
-- Run this to see which tables need manual fixes
-- =====================================================

-- =====================================================
-- 1. Tables with user reference columns that might have issues
-- =====================================================
SELECT 
    'Tables to check' as category,
    c.table_name,
    c.column_name,
    c.data_type,
    CASE 
        WHEN c.data_type LIKE 'character varying%' OR c.data_type LIKE 'varchar%' OR c.data_type = 'text' THEN 'TEXT/VARCHAR - needs casting'
        WHEN c.data_type = 'uuid' THEN 'UUID - standard'
        ELSE c.data_type
    END as type_note,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = c.table_name
            AND kcu.column_name = c.column_name
            AND ccu.table_name = 'users'
            AND ccu.column_name = 'id'
            AND tc.constraint_type = 'FOREIGN KEY'
        ) THEN 'FK to users(id) - MUST use auth.uid()'
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = c.table_name
            AND kcu.column_name = c.column_name
            AND ccu.table_name = 'user_profiles'
            AND tc.constraint_type = 'FOREIGN KEY'
        ) THEN 'FK to user_profiles - can use profile ID'
        ELSE 'No FK - can use both'
    END as fk_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_class cls
            JOIN pg_namespace n ON cls.relnamespace = n.oid
            WHERE cls.relname = c.table_name
            AND n.nspname = 'public'
            AND cls.relrowsecurity = true
        ) THEN 'RLS Enabled'
        ELSE 'RLS NOT Enabled'
    END as rls_status
FROM information_schema.columns c
WHERE c.table_schema = 'public'
AND (
    c.column_name LIKE '%user_id%'
    OR c.column_name LIKE '%investor_id%'
    OR c.column_name LIKE '%advisor_id%'
    OR c.column_name LIKE '%mentor_id%'
    OR c.column_name LIKE '%requester_id%'
)
ORDER BY 
    CASE 
        WHEN c.column_name = 'user_id' THEN 1
        WHEN c.column_name LIKE '%_id' THEN 2
        ELSE 3
    END,
    c.table_name,
    c.column_name;

-- =====================================================
-- 2. Tables with RLS but potentially problematic policies
-- =====================================================
SELECT 
    'Tables with RLS policies' as category,
    p.tablename,
    COUNT(*) as policy_count,
    STRING_AGG(DISTINCT p.cmd::text, ', ' ORDER BY p.cmd::text) as policy_types,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_schema = 'public'
            AND c.table_name = p.tablename
            AND (
                c.column_name LIKE '%user_id%'
                OR c.column_name LIKE '%investor_id%'
                OR c.column_name LIKE '%advisor_id%'
            )
            AND EXISTS (
                SELECT 1 FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
                WHERE tc.table_name = c.table_name
                AND kcu.column_name = c.column_name
                AND ccu.table_name = 'users'
                AND ccu.column_name = 'id'
                AND tc.constraint_type = 'FOREIGN KEY'
            )
        ) THEN 'Has FK to users(id) - check if policies use auth.uid()'
        ELSE 'OK'
    END as check_needed
FROM pg_policies p
WHERE p.schemaname = 'public'
GROUP BY p.tablename
ORDER BY p.tablename;





