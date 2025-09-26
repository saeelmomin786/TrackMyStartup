-- =====================================================
-- SAFE CALCULATION FIX (AVOIDS DEADLOCKS)
-- =====================================================
-- Run this script step by step to avoid deadlocks

-- =====================================================
-- STEP 1: CHECK CURRENT DATA (SAFE - READ ONLY)
-- =====================================================

-- Check all startups and their current data
SELECT 
    'Current startup data:' as step,
    s.id,
    s.name,
    s.total_funding,
    s.current_valuation,
    ss.total_shares,
    ss.esop_reserved_shares,
    ss.price_per_share
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
ORDER BY s.id;

-- Check investment records
SELECT 
    'Investment records:' as step,
    startup_id,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    SUM(shares) as total_shares
FROM investment_records 
GROUP BY startup_id
ORDER BY startup_id;

-- Check founders
SELECT 
    'Founders:' as step,
    startup_id,
    COUNT(*) as count,
    SUM(shares) as total_shares
FROM founders 
GROUP BY startup_id
ORDER BY startup_id;

-- =====================================================
-- STEP 2: FIX ESOP RESERVED SHARES (ONE TABLE AT A TIME)
-- =====================================================

-- Fix ESOP reserved shares for all startups that have 0 or NULL
UPDATE startup_shares 
SET 
    esop_reserved_shares = 10000,
    updated_at = NOW()
WHERE esop_reserved_shares = 0 OR esop_reserved_shares IS NULL;

-- Verify the update
SELECT 
    'After ESOP fix:' as step,
    startup_id,
    esop_reserved_shares
FROM startup_shares 
ORDER BY startup_id;

-- =====================================================
-- STEP 3: FIX TOTAL SHARES CALCULATION (ONE TABLE AT A TIME)
-- =====================================================

-- Update total shares calculation for all startups
UPDATE startup_shares 
SET 
    total_shares = (
        COALESCE((
            SELECT SUM(shares) 
            FROM founders 
            WHERE startup_id = startup_shares.startup_id
        ), 0) +
        COALESCE((
            SELECT SUM(shares) 
            FROM investment_records 
            WHERE startup_id = startup_shares.startup_id
        ), 0) +
        COALESCE(esop_reserved_shares, 0)
    ),
    updated_at = NOW();

-- Verify the update
SELECT 
    'After total shares fix:' as step,
    startup_id,
    total_shares,
    esop_reserved_shares
FROM startup_shares 
ORDER BY startup_id;

-- =====================================================
-- STEP 4: FIX PRICE PER SHARE (ONE TABLE AT A TIME)
-- =====================================================

-- Update price per share for all startups
UPDATE startup_shares 
SET 
    price_per_share = CASE 
        WHEN total_shares > 0 THEN (
            SELECT s.current_valuation / startup_shares.total_shares 
            FROM startups s 
            WHERE s.id = startup_shares.startup_id
        )
        ELSE 0
    END,
    updated_at = NOW()
WHERE total_shares > 0;

-- Verify the update
SELECT 
    'After price per share fix:' as step,
    startup_id,
    total_shares,
    price_per_share,
    ROUND(price_per_share, 4) as price_per_share_rounded
FROM startup_shares 
ORDER BY startup_id;

-- =====================================================
-- STEP 5: SYNC TOTAL FUNDING (ONE TABLE AT A TIME)
-- =====================================================

-- Update total funding in startups table
UPDATE startups 
SET 
    total_funding = (
        SELECT COALESCE(SUM(amount), 0)
        FROM investment_records 
        WHERE startup_id = startups.id
    ),
    updated_at = NOW();

-- Verify the update
SELECT 
    'After total funding sync:' as step,
    s.id,
    s.name,
    s.total_funding,
    (SELECT SUM(amount) FROM investment_records WHERE startup_id = s.id) as investment_total
FROM startups s
ORDER BY s.id;

-- =====================================================
-- STEP 6: FINAL VERIFICATION
-- =====================================================

-- Final check of all data
SELECT 
    'Final verification:' as step,
    s.id,
    s.name,
    s.total_funding,
    s.current_valuation,
    ss.total_shares,
    ss.esop_reserved_shares,
    ROUND(ss.price_per_share, 4) as price_per_share,
    (SELECT SUM(shares) FROM founders WHERE startup_id = s.id) as total_founder_shares,
    (SELECT SUM(shares) FROM investment_records WHERE startup_id = s.id) as total_investor_shares,
    (SELECT SUM(amount) FROM investment_records WHERE startup_id = s.id) as total_investment_amount
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
ORDER BY s.id;
