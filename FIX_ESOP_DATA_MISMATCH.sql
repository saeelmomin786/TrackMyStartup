-- =====================================================
-- FIX ESOP DATA MISMATCH - SYNORA STARTUP
-- =====================================================
-- This script fixes the ESOP data mismatch between startups and startup_shares tables
-- for Synora startup (ID: 90)

-- =====================================================
-- STEP 1: CHECK CURRENT DATA
-- =====================================================

SELECT 
    '=== CURRENT DATA BEFORE FIX ===' as status,
    s.id,
    s.name,
    s.esop_reserved_shares as startups_esop,
    ss.esop_reserved_shares as shares_table_esop,
    s.price_per_share as startups_pps,
    ss.price_per_share as shares_table_pps,
    s.total_shares as startups_total,
    ss.total_shares as shares_table_total
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.id = 90;

-- =====================================================
-- STEP 2: DECIDE WHICH VALUE IS CORRECT
-- =====================================================
-- Based on your data:
-- startups.esop_reserved_shares = 10,000
-- startup_shares.esop_reserved_shares = 100,000
-- 
-- We need to decide which one is correct. Let's check the context:

-- Check if there are any employees with ESOP allocations
SELECT 
    '=== EMPLOYEE ESOP ALLOCATIONS ===' as status,
    COUNT(*) as total_employees,
    SUM(esop_allocation) as total_allocated_esop,
    AVG(esop_allocation) as avg_esop_allocation
FROM employees 
WHERE startup_id = 90 AND esop_allocation > 0;

-- Check founders and investors to understand the scale
SELECT 
    '=== FOUNDERS AND INVESTORS ===' as status,
    'Founders' as type,
    SUM(shares) as total_shares
FROM founders 
WHERE startup_id = 90

UNION ALL

SELECT 
    '=== FOUNDERS AND INVESTORS ===' as status,
    'Investors' as type,
    SUM(shares) as total_shares
FROM investment_records 
WHERE startup_id = 90;

-- =====================================================
-- STEP 3: FIX THE MISMATCH (CHOOSE ONE APPROACH)
-- =====================================================

-- OPTION A: Make startup_shares match startups table (10,000 ESOP)
-- Uncomment the lines below if you want to use 10,000 as the correct value

-- UPDATE startup_shares 
-- SET 
--     esop_reserved_shares = 10000,
--     updated_at = NOW()
-- WHERE startup_id = 90;

-- OPTION B: Make startups table match startup_shares table (100,000 ESOP)
-- Uncomment the lines below if you want to use 100,000 as the correct value

UPDATE startups 
SET 
    esop_reserved_shares = 100000,
    updated_at = NOW()
WHERE id = 90;

-- =====================================================
-- STEP 4: RECALCULATE TOTAL SHARES
-- =====================================================

-- Recalculate total shares to include the correct ESOP amount
UPDATE startup_shares 
SET 
    total_shares = (
        COALESCE((
            SELECT SUM(shares) 
            FROM founders 
            WHERE startup_id = 90
        ), 0) +
        COALESCE((
            SELECT SUM(shares) 
            FROM investment_records 
            WHERE startup_id = 90
        ), 0) +
        100000  -- Using 100,000 as the ESOP amount
    ),
    updated_at = NOW()
WHERE startup_id = 90;

-- =====================================================
-- STEP 5: VERIFY THE FIX
-- =====================================================

SELECT 
    '=== DATA AFTER FIX ===' as status,
    s.id,
    s.name,
    s.esop_reserved_shares as startups_esop,
    ss.esop_reserved_shares as shares_table_esop,
    s.price_per_share as startups_pps,
    ss.price_per_share as shares_table_pps,
    s.total_shares as startups_total,
    ss.total_shares as shares_table_total,
    CASE 
        WHEN s.esop_reserved_shares = ss.esop_reserved_shares THEN '✅ FIXED - MATCH'
        ELSE '❌ STILL MISMATCH'
    END as fix_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.id = 90;

-- =====================================================
-- STEP 6: SHOW FINAL CALCULATIONS
-- =====================================================

SELECT 
    '=== FINAL CALCULATIONS ===' as status,
    s.id,
    s.name,
    COALESCE((
        SELECT SUM(shares) 
        FROM founders 
        WHERE startup_id = s.id
    ), 0) as total_founder_shares,
    COALESCE((
        SELECT SUM(shares) 
        FROM investment_records 
        WHERE startup_id = s.id
    ), 0) as total_investor_shares,
    COALESCE(ss.esop_reserved_shares, 0) as esop_reserved_shares,
    COALESCE((
        SELECT SUM(shares) 
        FROM founders 
        WHERE startup_id = s.id
    ), 0) +
    COALESCE((
        SELECT SUM(shares) 
        FROM investment_records 
        WHERE startup_id = s.id
    ), 0) +
    COALESCE(ss.esop_reserved_shares, 0) as calculated_total_shares,
    ss.total_shares as stored_total_shares
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.id = 90;
