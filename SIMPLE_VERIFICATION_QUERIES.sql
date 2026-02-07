-- =====================================================
-- VERIFICATION QUERIES FOR SUPABASE SQL EDITOR
-- (Simpler version - optimized for web UI)
-- =====================================================

-- ===================================================
-- QUERY #1: CHECK ALL RLS POLICIES ON INTAKE CRM
-- Run this first to see current policies
-- ===================================================

SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    qual AS "Policy Condition (SELECT/UPDATE USING)",
    with_check AS "Policy Condition (INSERT/UPDATE WITH CHECK)"
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('intake_crm_columns', 'intake_crm_status_map', 'intake_crm_attachments')
ORDER BY tablename, policyname;


-- ===================================================
-- QUERY #2: CHECK FUNDRAISING CRM POLICIES
-- Run this to see fundraising CRM policies
-- ===================================================

SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    qual AS "Policy Condition (SELECT/UPDATE USING)",
    with_check AS "Policy Condition (INSERT/UPDATE WITH CHECK)"
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('fundraising_crm_columns', 'fundraising_crm_investors', 'fundraising_crm_metadata', 'fundraising_crm_attachments')
ORDER BY tablename, policyname;


-- ===================================================
-- QUERY #3: CHECK IF RLS IS ENABLED ON CRM TABLES
-- ===================================================

SELECT 
    tablename,
    CASE WHEN rowsecurity = true THEN '✅ YES' ELSE '❌ NO' END AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('intake_crm_columns', 'intake_crm_status_map', 'intake_crm_attachments',
                     'fundraising_crm_columns', 'fundraising_crm_investors', 'fundraising_crm_metadata', 'fundraising_crm_attachments')
ORDER BY tablename;


-- ===================================================
-- QUERY #4: COUNT EXISTING INTAKE CRM DATA
-- ===================================================

SELECT 
    'intake_crm_columns' AS table_name,
    COUNT(*) AS row_count,
    CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '❌ Empty' END AS status
FROM public.intake_crm_columns

UNION ALL

SELECT 
    'intake_crm_status_map' AS table_name,
    COUNT(*) AS row_count,
    CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '❌ Empty' END AS status
FROM public.intake_crm_status_map

UNION ALL

SELECT 
    'intake_crm_attachments' AS table_name,
    COUNT(*) AS row_count,
    CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '❌ Empty' END AS status
FROM public.intake_crm_attachments;


-- ===================================================
-- QUERY #5: COUNT EXISTING FUNDRAISING CRM DATA
-- ===================================================

SELECT 
    'fundraising_crm_columns' AS table_name,
    COUNT(*) AS row_count,
    CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '❌ Empty' END AS status
FROM public.fundraising_crm_columns

UNION ALL

SELECT 
    'fundraising_crm_investors' AS table_name,
    COUNT(*) AS row_count,
    CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '❌ Empty' END AS status
FROM public.fundraising_crm_investors

UNION ALL

SELECT 
    'fundraising_crm_metadata' AS table_name,
    COUNT(*) AS row_count,
    CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '❌ Empty' END AS status
FROM public.fundraising_crm_metadata

UNION ALL

SELECT 
    'fundraising_crm_attachments' AS table_name,
    COUNT(*) AS row_count,
    CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '❌ Empty' END AS status
FROM public.fundraising_crm_attachments;


-- ===================================================
-- QUERY #6: CHECK USER PROFILES STRUCTURE
-- See what auth_user_id looks like
-- ===================================================

SELECT 
    id AS "profile_id (UUID)",
    auth_user_id AS "auth_user_id (UUID)",
    CASE WHEN id = auth_user_id THEN '❌ Same (BAD for Intake CRM)' 
         ELSE '✅ Different (Expected)' END AS "id_vs_auth_id"
FROM public.user_profiles 
LIMIT 5;


-- ===================================================
-- INSTRUCTIONS:
-- ===================================================
-- 1. Run QUERY #1 first - should show intake CRM policies
--    Look for policies like:
--    - icc_select_own
--    - icc_insert_own
--    - icc_update_own
--    - icc_delete_own
--
-- 2. In the "Policy Condition" column, you should see:
--    WHERE up.id = public.intake_crm_columns.facilitator_id
--    AND up.auth_user_id = auth.uid()
--    
--    This is the BUG! Should be checking up.auth_user_id instead
--
-- 3. Run QUERY #6 to see user_profiles
--    Notice that profile_id ≠ auth_user_id
--    This confirms the RLS logic is wrong
--
-- 4. After running queries, we'll apply the fix!
-- ===================================================
