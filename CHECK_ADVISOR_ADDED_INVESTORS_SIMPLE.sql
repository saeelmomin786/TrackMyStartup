-- =====================================================
-- SIMPLE CHECK: Do advisor_added_investors records exist?
-- =====================================================

-- 1. Count ALL records (bypass RLS by checking as admin or using direct query)
SELECT 
    'Total records in table' as category,
    COUNT(*) as total_count
FROM advisor_added_investors;

-- 2. Show sample records (first 5)
SELECT 
    'Sample records' as category,
    id,
    advisor_id,
    investor_name,
    email,
    is_on_tms,
    tms_investor_id,
    created_at
FROM advisor_added_investors
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check if current user can see any records
-- This will show what the current authenticated user can see
SELECT 
    'Records visible to current user' as category,
    COUNT(*) as visible_count
FROM advisor_added_investors;

-- 4. Show what the current user can see
SELECT 
    'Visible records to current user' as category,
    id,
    advisor_id,
    investor_name,
    email,
    is_on_tms,
    tms_investor_id
FROM advisor_added_investors
ORDER BY created_at DESC
LIMIT 10;



