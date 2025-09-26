-- =====================================================
-- SAFE READ-ONLY ANALYSIS (NO DESTRUCTIVE OPERATIONS)
-- =====================================================
-- This script ONLY READS data - it does NOT modify anything
-- Run this first to see what needs to be fixed

-- =====================================================
-- STEP 1: ANALYZE CURRENT DATA
-- =====================================================

-- Check all startups and their current data
SELECT 
    '=== CURRENT STARTUP DATA ===' as analysis,
    s.id,
    s.name,
    s.total_funding,
    s.current_valuation,
    ss.total_shares,
    ss.esop_reserved_shares,
    ss.price_per_share,
    CASE 
        WHEN ss.esop_reserved_shares = 0 OR ss.esop_reserved_shares IS NULL 
        THEN '❌ NEEDS FIX: ESOP is 0 or NULL'
        ELSE '✅ OK: ESOP has value'
    END as esop_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
ORDER BY s.id;

-- =====================================================
-- STEP 2: ANALYZE INVESTMENT RECORDS
-- =====================================================

-- Check investment records by startup
SELECT 
    '=== INVESTMENT RECORDS ANALYSIS ===' as analysis,
    startup_id,
    COUNT(*) as investment_count,
    SUM(amount) as total_investment_amount,
    SUM(shares) as total_investment_shares,
    MIN(amount) as min_investment,
    MAX(amount) as max_investment
FROM investment_records 
GROUP BY startup_id
ORDER BY startup_id;

-- =====================================================
-- STEP 3: ANALYZE FOUNDERS
-- =====================================================

-- Check founders by startup
SELECT 
    '=== FOUNDERS ANALYSIS ===' as analysis,
    startup_id,
    COUNT(*) as founder_count,
    SUM(shares) as total_founder_shares,
    MIN(shares) as min_founder_shares,
    MAX(shares) as max_founder_shares
FROM founders 
GROUP BY startup_id
ORDER BY startup_id;

-- =====================================================
-- STEP 4: CALCULATE WHAT THE FIXES WOULD BE
-- =====================================================

-- Show what the total shares SHOULD be after fixes
SELECT 
    s.id,
    s.name,
    COALESCE((
        SELECT SUM(shares) 
        FROM founders 
        WHERE startup_id = s.id
    ), 0) as current_founder_shares,
    COALESCE((
        SELECT SUM(shares) 
        FROM investment_records 
        WHERE startup_id = s.id
    ), 0) as current_investor_shares,
    COALESCE(ss.esop_reserved_shares, 0) as current_esop_shares,
    CASE 
        WHEN ss.esop_reserved_shares = 0 OR ss.esop_reserved_shares IS NULL 
        THEN 10000 
        ELSE ss.esop_reserved_shares 
    END as fixed_esop_shares,
    (
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
        CASE 
            WHEN ss.esop_reserved_shares = 0 OR ss.esop_reserved_shares IS NULL 
            THEN 10000 
            ELSE ss.esop_reserved_shares 
        END
    ) as calculated_total_shares,
    ss.total_shares as current_total_shares,
    CASE 
        WHEN ss.total_shares != (
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
            CASE 
                WHEN ss.esop_reserved_shares = 0 OR ss.esop_reserved_shares IS NULL 
                THEN 10000 
                ELSE ss.esop_reserved_shares 
            END
        )
        THEN '❌ NEEDS FIX: Total shares mismatch'
        ELSE '✅ OK: Total shares correct'
    END as total_shares_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
ORDER BY s.id;

-- =====================================================
-- STEP 5: CALCULATE WHAT THE PRICE PER SHARE SHOULD BE
-- =====================================================

-- Show what the price per share SHOULD be after fixes
SELECT 
    s.id,
    s.name,
    s.current_valuation,
    (
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
        CASE 
            WHEN ss.esop_reserved_shares = 0 OR ss.esop_reserved_shares IS NULL 
            THEN 10000 
            ELSE ss.esop_reserved_shares 
        END
    ) as calculated_total_shares,
    CASE 
        WHEN (
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
            CASE 
                WHEN ss.esop_reserved_shares = 0 OR ss.esop_reserved_shares IS NULL 
                THEN 10000 
                ELSE ss.esop_reserved_shares 
            END
        ) > 0 
        THEN ROUND(s.current_valuation / (
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
            CASE 
                WHEN ss.esop_reserved_shares = 0 OR ss.esop_reserved_shares IS NULL 
                THEN 10000 
                ELSE ss.esop_reserved_shares 
            END
        ), 4)
        ELSE 0
    END as calculated_price_per_share,
    ss.price_per_share as current_price_per_share,
    CASE 
        WHEN ss.price_per_share != CASE 
            WHEN (
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
                CASE 
                    WHEN ss.esop_reserved_shares = 0 OR ss.esop_reserved_shares IS NULL 
                    THEN 10000 
                    ELSE ss.esop_reserved_shares 
                END
            ) > 0 
            THEN ROUND(s.current_valuation / (
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
                CASE 
                    WHEN ss.esop_reserved_shares = 0 OR ss.esop_reserved_shares IS NULL 
                    THEN 10000 
                    ELSE ss.esop_reserved_shares 
                END
            ), 4)
            ELSE 0
        END
        THEN '❌ NEEDS FIX: Price per share mismatch'
        ELSE '✅ OK: Price per share correct'
    END as price_per_share_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
ORDER BY s.id;

-- =====================================================
-- STEP 6: CALCULATE WHAT THE TOTAL FUNDING SHOULD BE
-- =====================================================

-- Show what the total funding SHOULD be after fixes
SELECT 
    s.id,
    s.name,
    s.total_funding as current_total_funding,
    COALESCE((
        SELECT SUM(amount) 
        FROM investment_records 
        WHERE startup_id = s.id
    ), 0) as calculated_total_funding,
    CASE 
        WHEN s.total_funding != COALESCE((
            SELECT SUM(amount) 
            FROM investment_records 
            WHERE startup_id = s.id
        ), 0)
        THEN '❌ NEEDS FIX: Total funding mismatch'
        ELSE '✅ OK: Total funding correct'
    END as total_funding_status
FROM startups s
ORDER BY s.id;

-- =====================================================
-- STEP 7: SUMMARY OF WHAT NEEDS TO BE FIXED
-- =====================================================

-- Summary of all issues that need fixing
SELECT 
    s.id,
    s.name,
    CASE 
        WHEN ss.esop_reserved_shares = 0 OR ss.esop_reserved_shares IS NULL 
        THEN 'Fix ESOP: Set to 10000'
        ELSE 'ESOP OK'
    END as esop_fix_needed,
    CASE 
        WHEN ss.total_shares != (
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
            CASE 
                WHEN ss.esop_reserved_shares = 0 OR ss.esop_reserved_shares IS NULL 
                THEN 10000 
                ELSE ss.esop_reserved_shares 
            END
        )
        THEN 'Fix Total Shares: Recalculate'
        ELSE 'Total Shares OK'
    END as total_shares_fix_needed,
    CASE 
        WHEN s.total_funding != COALESCE((
            SELECT SUM(amount) 
            FROM investment_records 
            WHERE startup_id = s.id
        ), 0)
        THEN 'Fix Total Funding: Sync with investments'
        ELSE 'Total Funding OK'
    END as total_funding_fix_needed
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
ORDER BY s.id;
