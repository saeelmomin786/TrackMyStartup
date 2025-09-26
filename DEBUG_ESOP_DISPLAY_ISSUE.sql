-- =====================================================
-- DEBUG ESOP DISPLAY ISSUE - CHECK ACTUAL DATA
-- =====================================================
-- This script helps debug why ESOP data might not be displaying in cap table
-- even when it exists in the database

-- =====================================================
-- STEP 1: CHECK ESOP DATA IN BOTH TABLES FOR ALL STARTUPS
-- =====================================================

SELECT 
    '=== ESOP DATA COMPARISON ===' as section,
    s.id,
    s.name,
    s.esop_reserved_shares as startups_table_esop,
    ss.esop_reserved_shares as startup_shares_table_esop,
    s.price_per_share as startups_table_pps,
    ss.price_per_share as startup_shares_table_pps,
    s.total_shares as startups_table_total,
    ss.total_shares as startup_shares_table_total,
    CASE 
        WHEN s.esop_reserved_shares = ss.esop_reserved_shares THEN '✅ MATCH'
        WHEN s.esop_reserved_shares IS NULL AND ss.esop_reserved_shares IS NULL THEN '❌ BOTH NULL'
        WHEN s.esop_reserved_shares IS NULL THEN '⚠️ STARTUPS NULL'
        WHEN ss.esop_reserved_shares IS NULL THEN '⚠️ SHARES_TABLE NULL'
        ELSE '❌ MISMATCH'
    END as esop_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
ORDER BY s.id;

-- =====================================================
-- STEP 2: CHECK SPECIFIC STARTUP DATA (REPLACE WITH YOUR STARTUP ID)
-- =====================================================

-- Replace 'YOUR_STARTUP_ID' with the actual startup ID you're testing
SELECT 
    '=== SPECIFIC STARTUP DATA ===' as section,
    s.id,
    s.name,
    s.esop_reserved_shares,
    s.price_per_share,
    s.total_shares,
    s.current_valuation,
    ss.esop_reserved_shares as shares_table_esop,
    ss.price_per_share as shares_table_pps,
    ss.total_shares as shares_table_total,
    ss.updated_at
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.id = 1  -- Replace with your actual startup ID
ORDER BY s.id;

-- =====================================================
-- STEP 3: CHECK FOUNDERS AND INVESTORS FOR THE STARTUP
-- =====================================================

-- Replace 'YOUR_STARTUP_ID' with the actual startup ID you're testing
SELECT 
    '=== FOUNDERS AND INVESTORS ===' as section,
    'Founders' as type,
    f.name,
    f.shares,
    f.equity_percentage
FROM founders f
WHERE f.startup_id = 1  -- Replace with your actual startup ID

UNION ALL

SELECT 
    '=== FOUNDERS AND INVESTORS ===' as section,
    'Investors' as type,
    ir.investor_name as name,
    ir.shares,
    ir.equity_allocated as equity_percentage
FROM investment_records ir
WHERE ir.startup_id = 1  -- Replace with your actual startup ID

ORDER BY type, name;

-- =====================================================
-- STEP 4: CALCULATE EXPECTED TOTAL SHARES
-- =====================================================

-- Replace 'YOUR_STARTUP_ID' with the actual startup ID you're testing
SELECT 
    '=== EXPECTED CALCULATIONS ===' as section,
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
    ss.total_shares as stored_total_shares,
    CASE 
        WHEN COALESCE((
            SELECT SUM(shares) 
            FROM founders 
            WHERE startup_id = s.id
        ), 0) +
        COALESCE((
            SELECT SUM(shares) 
            FROM investment_records 
            WHERE startup_id = s.id
        ), 0) +
        COALESCE(ss.esop_reserved_shares, 0) = ss.total_shares THEN '✅ MATCH'
        ELSE '❌ MISMATCH'
    END as total_shares_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.id = 1  -- Replace with your actual startup ID
ORDER BY s.id;

-- =====================================================
-- STEP 5: CHECK FOR ANY NULL OR ZERO VALUES
-- =====================================================

SELECT 
    '=== NULL/ZERO VALUES CHECK ===' as section,
    s.id,
    s.name,
    CASE 
        WHEN s.esop_reserved_shares IS NULL THEN '❌ STARTUPS ESOP NULL'
        WHEN s.esop_reserved_shares = 0 THEN '⚠️ STARTUPS ESOP ZERO'
        ELSE '✅ STARTUPS ESOP OK'
    END as startups_esop_status,
    CASE 
        WHEN ss.esop_reserved_shares IS NULL THEN '❌ SHARES_TABLE ESOP NULL'
        WHEN ss.esop_reserved_shares = 0 THEN '⚠️ SHARES_TABLE ESOP ZERO'
        ELSE '✅ SHARES_TABLE ESOP OK'
    END as shares_table_esop_status,
    CASE 
        WHEN s.price_per_share IS NULL THEN '❌ STARTUPS PPS NULL'
        WHEN s.price_per_share = 0 THEN '⚠️ STARTUPS PPS ZERO'
        ELSE '✅ STARTUPS PPS OK'
    END as startups_pps_status,
    CASE 
        WHEN ss.price_per_share IS NULL THEN '❌ SHARES_TABLE PPS NULL'
        WHEN ss.price_per_share = 0 THEN '⚠️ SHARES_TABLE PPS ZERO'
        ELSE '✅ SHARES_TABLE PPS OK'
    END as shares_table_pps_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.id = 1  -- Replace with your actual startup ID
ORDER BY s.id;
