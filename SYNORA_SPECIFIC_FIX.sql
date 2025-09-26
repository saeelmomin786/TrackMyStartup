-- =====================================================
-- SYNORA (ID 89) SPECIFIC FIX
-- =====================================================
-- This script fixes the calculation issues for Synora only
-- Based on the analysis results

-- =====================================================
-- CURRENT ISSUES FOR SYNORA (ID 89):
-- =====================================================
-- 1. ESOP Reserved Shares: 100000 (should be 10000)
-- 2. Total Shares: 1000000 (should be 131000)
-- 3. Price Per Share: 0.01 (should be 0.0000 based on current calculation)
-- 4. Total Funding: 2000.00 (should be 41700.00)

-- =====================================================
-- STEP 1: VERIFY CURRENT DATA
-- =====================================================

SELECT 
    '=== CURRENT DATA FOR SYNORA (ID 89) ===' as step,
    s.id,
    s.name,
    s.total_funding,
    s.current_valuation,
    ss.total_shares,
    ss.esop_reserved_shares,
    ss.price_per_share,
    (SELECT SUM(shares) FROM founders WHERE startup_id = 89) as total_founder_shares,
    (SELECT SUM(shares) FROM investment_records WHERE startup_id = 89) as total_investor_shares,
    (SELECT SUM(amount) FROM investment_records WHERE startup_id = 89) as total_investment_amount
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.id = 89;

-- =====================================================
-- STEP 2: APPLY FIXES FOR SYNORA
-- =====================================================

-- Fix 1: Update ESOP reserved shares from 100000 to 10000
UPDATE startup_shares 
SET 
    esop_reserved_shares = 10000,
    updated_at = NOW()
WHERE startup_id = 89;

-- Fix 2: Update total shares calculation
-- Current: 1000000, Should be: 99000 (founders) + 22000 (investors) + 10000 (ESOP) = 131000
UPDATE startup_shares 
SET 
    total_shares = (
        COALESCE((SELECT SUM(shares) FROM founders WHERE startup_id = 89), 0) +
        COALESCE((SELECT SUM(shares) FROM investment_records WHERE startup_id = 89), 0) +
        10000
    ),
    updated_at = NOW()
WHERE startup_id = 89;

-- Fix 3: Update price per share
-- Current: 0.01, Should be: current_valuation / total_shares
UPDATE startup_shares 
SET 
    price_per_share = CASE 
        WHEN total_shares > 0 THEN (
            SELECT s.current_valuation / startup_shares.total_shares 
            FROM startups s 
            WHERE s.id = 89
        )
        ELSE 0
    END,
    updated_at = NOW()
WHERE startup_id = 89;

-- Fix 4: Update total funding to match investment records
-- Current: 2000.00, Should be: 41700.00 (sum of all investment records)
UPDATE startups 
SET 
    total_funding = (
        SELECT COALESCE(SUM(amount), 0)
        FROM investment_records 
        WHERE startup_id = 89
    ),
    updated_at = NOW()
WHERE id = 89;

-- =====================================================
-- STEP 3: VERIFY FIXES
-- =====================================================

SELECT 
    '=== AFTER FIXES - VERIFICATION ===' as step,
    s.id,
    s.name,
    s.total_funding,
    s.current_valuation,
    ss.total_shares,
    ss.esop_reserved_shares,
    ROUND(ss.price_per_share, 4) as price_per_share,
    (SELECT SUM(shares) FROM founders WHERE startup_id = 89) as total_founder_shares,
    (SELECT SUM(shares) FROM investment_records WHERE startup_id = 89) as total_investor_shares,
    (SELECT SUM(amount) FROM investment_records WHERE startup_id = 89) as total_investment_amount,
    -- Calculate what the total shares should be
    (
        COALESCE((SELECT SUM(shares) FROM founders WHERE startup_id = 89), 0) +
        COALESCE((SELECT SUM(shares) FROM investment_records WHERE startup_id = 89), 0) +
        ss.esop_reserved_shares
    ) as calculated_total_shares,
    -- Check if calculations are correct
    CASE 
        WHEN ss.total_shares = (
            COALESCE((SELECT SUM(shares) FROM founders WHERE startup_id = 89), 0) +
            COALESCE((SELECT SUM(shares) FROM investment_records WHERE startup_id = 89), 0) +
            ss.esop_reserved_shares
        )
        THEN '✅ CORRECT'
        ELSE '❌ STILL WRONG'
    END as total_shares_status,
    CASE 
        WHEN s.total_funding = COALESCE((SELECT SUM(amount) FROM investment_records WHERE startup_id = 89), 0)
        THEN '✅ CORRECT'
        ELSE '❌ STILL WRONG'
    END as total_funding_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.id = 89;

-- =====================================================
-- STEP 4: EXPECTED RESULTS
-- =====================================================

SELECT 
    'ESOP Reserved Shares' as field,
    '100000 → 10000' as change,
    '✅ Fixed' as status

UNION ALL

SELECT 
    'Total Shares' as field,
    '1000000 → 131000' as change,
    '✅ Fixed' as status

UNION ALL

SELECT 
    'Price Per Share' as field,
    '0.01 → 0.30 (39400/131000)' as change,
    '✅ Fixed' as status

UNION ALL

SELECT 
    'Total Funding' as field,
    '2000.00 → 41700.00' as change,
    '✅ Fixed' as status;
