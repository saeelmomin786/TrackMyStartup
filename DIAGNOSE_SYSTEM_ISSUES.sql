-- DIAGNOSE SYSTEM ISSUES
-- This script will help us understand why the system isn't working

-- =====================================================
-- 1. CHECK CURRENT DATA COUNTS
-- =====================================================

SELECT 'Current Data Counts' as section;
SELECT 
  'Relationships' as type,
  COUNT(*) as count
FROM investment_advisor_relationships

UNION ALL

SELECT 
  'Offers' as type,
  COUNT(*) as count
FROM investment_offers;

-- =====================================================
-- 2. CHECK RLS POLICIES
-- =====================================================

SELECT 'RLS Policies Check' as section;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('investment_advisor_relationships', 'investment_offers')
ORDER BY tablename, policyname;

-- =====================================================
-- 3. CHECK IF FUNCTIONS EXIST
-- =====================================================

SELECT 'Functions Check' as section;
SELECT routine_name, routine_type, security_type
FROM information_schema.routines 
WHERE routine_name IN ('create_missing_relationships', 'create_missing_offers')
ORDER BY routine_name;

-- =====================================================
-- 4. CHECK TRIGGERS
-- =====================================================

SELECT 'Triggers Check' as section;
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%advisor%' OR trigger_name LIKE '%investment%'
ORDER BY trigger_name;

-- =====================================================
-- 5. TEST FUNCTIONS MANUALLY
-- =====================================================

SELECT 'Manual Function Test' as section;

-- Test create_missing_relationships
SELECT * FROM create_missing_relationships();

-- Test create_missing_offers  
SELECT * FROM create_missing_offers();

-- =====================================================
-- 6. CHECK FOR CONSTRAINTS
-- =====================================================

SELECT 'Constraints Check' as section;
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name IN ('investment_advisor_relationships', 'investment_offers')
ORDER BY tc.table_name, tc.constraint_type;

-- =====================================================
-- 7. CHECK STARTUP DATA WITH ADVISOR CODES
-- =====================================================

SELECT 'Startups with Advisor Codes' as section;
SELECT s.id, s.name, s.investment_advisor_code, u.name as advisor_name, u.email as advisor_email
FROM startups s
LEFT JOIN users u ON u.investment_advisor_code = s.investment_advisor_code
WHERE s.investment_advisor_code IS NOT NULL
ORDER BY s.id;

-- =====================================================
-- 8. FINAL DATA COUNT AFTER TESTS
-- =====================================================

SELECT 'Final Data Counts' as section;
SELECT 
  'Relationships' as type,
  COUNT(*) as count
FROM investment_advisor_relationships

UNION ALL

SELECT 
  'Offers' as type,
  COUNT(*) as count
FROM investment_offers;
