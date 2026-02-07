-- =====================================================
-- VERIFICATION QUERIES FOR SUPABASE
-- =====================================================
-- Run these queries in Supabase SQL Editor to check:
-- 1. Current RLS policies on CRM tables
-- 2. Table structures
-- 3. Any existing data
-- =====================================================

-- =====================================================
-- 1. CHECK ALL RLS POLICIES ON INTAKE CRM TABLES
-- =====================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual AS policy_condition,
    with_check
FROM pg_policies 
WHERE tablename IN ('intake_crm_columns', 'intake_crm_status_map', 'intake_crm_attachments')
ORDER BY tablename, policyname;

-- =====================================================
-- 2. CHECK ALL RLS POLICIES ON FUNDRAISING CRM TABLES
-- =====================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual AS policy_condition,
    with_check
FROM pg_policies 
WHERE tablename IN ('fundraising_crm_columns', 'fundraising_crm_investors', 'fundraising_crm_metadata', 'fundraising_crm_attachments')
ORDER BY tablename, policyname;

-- =====================================================
-- 3. CHECK INTAKE CRM COLUMNS TABLE STRUCTURE
-- =====================================================
\d+ public.intake_crm_columns

-- =====================================================
-- 4. CHECK INTAKE CRM STATUS MAP TABLE STRUCTURE
-- =====================================================
\d+ public.intake_crm_status_map

-- =====================================================
-- 5. CHECK FUNDRAISING CRM COLUMNS TABLE STRUCTURE
-- =====================================================
\d+ public.fundraising_crm_columns

-- =====================================================
-- 6. COUNT EXISTING DATA
-- =====================================================
SELECT 
    'intake_crm_columns' AS table_name,
    COUNT(*) AS row_count
FROM public.intake_crm_columns

UNION ALL

SELECT 
    'intake_crm_status_map' AS table_name,
    COUNT(*) AS row_count
FROM public.intake_crm_status_map

UNION ALL

SELECT 
    'fundraising_crm_columns' AS table_name,
    COUNT(*) AS row_count
FROM public.fundraising_crm_columns

UNION ALL

SELECT 
    'fundraising_crm_investors' AS table_name,
    COUNT(*) AS row_count
FROM public.fundraising_crm_investors;

-- =====================================================
-- 7. SAMPLE DATA FROM INTAKE CRM (if any)
-- =====================================================
SELECT * FROM public.intake_crm_columns LIMIT 5;
SELECT * FROM public.intake_crm_status_map LIMIT 5;

-- =====================================================
-- 8. SAMPLE DATA FROM FUNDRAISING CRM (if any)
-- =====================================================
SELECT * FROM public.fundraising_crm_columns LIMIT 5;
SELECT * FROM public.fundraising_crm_investors LIMIT 5;

-- =====================================================
-- 9. CHECK USER PROFILES (to understand ID fields)
-- =====================================================
SELECT 
    id AS profile_id,
    auth_user_id,
    startup_id
FROM public.user_profiles 
LIMIT 3;

-- =====================================================
-- 10. CHECK RLS ENABLED STATUS
-- =====================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('intake_crm_columns', 'intake_crm_status_map', 'intake_crm_attachments', 
                     'fundraising_crm_columns', 'fundraising_crm_investors', 'fundraising_crm_metadata', 'fundraising_crm_attachments')
ORDER BY tablename;
