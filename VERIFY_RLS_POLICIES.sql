-- VERIFY_RLS_POLICIES.sql
-- Verify that all RLS policies for due diligence access were created correctly

-- =====================================================
-- 1. CHECK ALL TABLES FOR DUE DILIGENCE POLICIES
-- =====================================================

-- Check financial_records policies
SELECT '=== FINANCIAL_RECORDS POLICIES ===' as info;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'financial_records'
ORDER BY policyname;

-- Check employees policies
SELECT '=== EMPLOYEES POLICIES ===' as info;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'employees'
ORDER BY policyname;

-- Check investment_records policies
SELECT '=== INVESTMENT_RECORDS POLICIES ===' as info;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'investment_records'
ORDER BY policyname;

-- Check startups policies
SELECT '=== STARTUPS POLICIES ===' as info;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'startups'
ORDER BY policyname;

-- Check startup_shares policies (if table exists)
SELECT '=== STARTUP_SHARES POLICIES ===' as info;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'startup_shares'
ORDER BY policyname;

-- Check founders policies
SELECT '=== FOUNDERS POLICIES ===' as info;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'founders'
ORDER BY policyname;

-- =====================================================
-- 2. VERIFY SPECIFIC POLICIES EXIST
-- =====================================================

-- Check if our specific policies exist
SELECT '=== VERIFYING DUE DILIGENCE POLICIES ===' as info;

SELECT 
    'financial_records' as table_name,
    'Investors with due diligence can view financial records' as policy_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'financial_records' 
        AND policyname = 'Investors with due diligence can view financial records'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
UNION ALL
SELECT 
    'employees' as table_name,
    'Investors with due diligence can view employees' as policy_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'employees' 
        AND policyname = 'Investors with due diligence can view employees'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
UNION ALL
SELECT 
    'investment_records' as table_name,
    'Investors with due diligence can view investment records' as policy_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'investment_records' 
        AND policyname = 'Investors with due diligence can view investment records'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
UNION ALL
SELECT 
    'startups' as table_name,
    'Investors with due diligence can view startups' as policy_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'startups' 
        AND policyname = 'Investors with due diligence can view startups'
    ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status;

-- =====================================================
-- 3. CHECK FOR "ANYONE CAN VIEW" POLICIES
-- =====================================================

-- Note: If "Anyone can view" policies exist, they might override our more restrictive policies
-- However, RLS uses OR logic, so multiple policies can coexist

SELECT '=== "ANYONE CAN VIEW" POLICIES (might need review) ===' as info;
SELECT tablename, policyname 
FROM pg_policies 
WHERE policyname LIKE '%Anyone can view%'
ORDER BY tablename;

-- =====================================================
-- 4. TEST DUE DILIGENCE ACCESS (COMMENTED OUT - RUN MANUALLY)
-- =====================================================

-- To test, run as an investor user with a completed due diligence request:
-- 
-- SELECT COUNT(*) FROM financial_records 
-- WHERE startup_id = <STARTUP_ID_WITH_COMPLETED_DD>;
--
-- SELECT COUNT(*) FROM employees 
-- WHERE startup_id = <STARTUP_ID_WITH_COMPLETED_DD>;
--
-- SELECT COUNT(*) FROM investment_records 
-- WHERE startup_id = <STARTUP_ID_WITH_COMPLETED_DD>;

