-- =====================================================
-- COMPREHENSIVE RLS POLICY AUDIT SCRIPT
-- =====================================================
-- This script identifies potential RLS policy issues by:
-- 1. Listing all tables with RLS enabled
-- 2. Checking foreign key constraints
-- 3. Identifying column names used for user references
-- 4. Verifying RLS policies match table structure
-- =====================================================

-- =====================================================
-- STEP 1: List all tables with RLS enabled
-- =====================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- STEP 2: Find all foreign key constraints to users/user_profiles
-- =====================================================
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND (
        ccu.table_name = 'users' 
        OR ccu.table_name = 'user_profiles'
        OR ccu.table_name = 'auth.users'
    )
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- STEP 3: List all columns that might reference users
-- =====================================================
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND (
        column_name LIKE '%user_id%'
        OR column_name LIKE '%investor_id%'
        OR column_name LIKE '%advisor_id%'
        OR column_name LIKE '%mentor_id%'
        OR column_name LIKE '%requester_id%'
        OR column_name LIKE '%created_by%'
        OR column_name LIKE '%owner_id%'
    )
ORDER BY table_name, column_name;

-- =====================================================
-- STEP 4: List all existing RLS policies
-- =====================================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- STEP 5: Identify tables with RLS but no policies
-- =====================================================
SELECT
    t.tablename,
    CASE WHEN p.tablename IS NULL THEN 'NO POLICIES' ELSE 'HAS POLICIES' END as policy_status,
    COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
    AND EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE c.relname = t.tablename
        AND n.nspname = t.schemaname
        AND c.relrowsecurity = true
    )
GROUP BY t.tablename, p.tablename
ORDER BY t.tablename;

-- =====================================================
-- STEP 6: Check for common issues
-- =====================================================
-- Issue 1: Tables with foreign keys to users(id) but policies using profile IDs
SELECT DISTINCT
    tc.table_name,
    kcu.column_name,
    'Foreign key to users(id) - must use auth.uid()' as issue
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND ccu.table_name = 'users'
    AND ccu.column_name = 'id'
    AND tc.table_name IN (
        SELECT tablename FROM pg_policies WHERE schemaname = 'public'
    );

-- Issue 2: Tables with user_id columns but no matching policies
SELECT
    c.table_name,
    c.column_name,
    'Has user_id column but may have incorrect RLS policy' as issue
FROM information_schema.columns c
WHERE c.table_schema = 'public'
    AND c.column_name LIKE '%user_id%'
    AND c.table_name IN (
        SELECT tablename FROM pg_policies WHERE schemaname = 'public'
    )
ORDER BY c.table_name;

-- =====================================================
-- STEP 7: Summary Report
-- =====================================================
SELECT 
    'RLS AUDIT SUMMARY' as report_type,
    COUNT(DISTINCT t.tablename) as tables_with_rls,
    COUNT(DISTINCT p.policyname) as total_policies,
    COUNT(DISTINCT fk.table_name) as tables_with_user_fks
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
LEFT JOIN (
    SELECT DISTINCT tc.table_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND (ccu.table_name = 'users' OR ccu.table_name = 'user_profiles')
) fk ON t.tablename = fk.table_name
WHERE t.schemaname = 'public'
    AND EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE c.relname = t.tablename
        AND n.nspname = t.schemaname
        AND c.relrowsecurity = true
    );





