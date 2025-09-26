-- =====================================================
-- FIX CALCULATION ISSUES IN DASHBOARD
-- =====================================================

-- First, let's check the current data
SELECT 'Current Data Check' as step;

SELECT 
    s.id,
    s.name,
    s.total_funding,
    s.current_valuation,
    ss.total_shares,
    ss.esop_reserved_shares,
    ss.price_per_share
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.id = 88;

-- Check investment records
SELECT 
    'Investment Records' as type,
    ir.investment_type,
    ir.amount,
    ir.shares
FROM investment_records ir
WHERE ir.startup_id = 88;

-- Check founders
SELECT 
    'Founders' as type,
    f.name,
    f.shares
FROM founders f
WHERE f.startup_id = 88;

-- =====================================================
-- FIX 1: Update ESOP Reserved Shares
-- =====================================================

-- Update ESOP reserved shares to 10,000
UPDATE startup_shares 
SET 
    esop_reserved_shares = 10000,
    updated_at = NOW()
WHERE startup_id = 88;

-- =====================================================
-- FIX 2: Update Total Shares to Include ESOP
-- =====================================================

-- Calculate correct total shares
WITH share_calculation AS (
    SELECT 
        88000 + 22000 + 10000 as calculated_total_shares
)
UPDATE startup_shares 
SET 
    total_shares = (SELECT calculated_total_shares FROM share_calculation),
    updated_at = NOW()
WHERE startup_id = 88;

-- =====================================================
-- FIX 3: Update Price Per Share
-- =====================================================

-- Update price per share based on current valuation and total shares
UPDATE startup_shares 
SET 
    price_per_share = 39400.00 / 121000.00, -- Current valuation / total shares
    updated_at = NOW()
WHERE startup_id = 88;

-- =====================================================
-- FIX 4: Sync Total Funding Between Tables
-- =====================================================

-- Update startups.total_funding to match investment records total
WITH investment_total AS (
    SELECT COALESCE(SUM(amount), 0) as total_investment_amount
    FROM investment_records 
    WHERE startup_id = 88
)
UPDATE startups 
SET 
    total_funding = (SELECT total_investment_amount FROM investment_total),
    updated_at = NOW()
WHERE id = 88;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'After Fixes - Verification' as step;

-- Check updated data
SELECT 
    s.id,
    s.name,
    s.total_funding,
    s.current_valuation,
    ss.total_shares,
    ss.esop_reserved_shares,
    ss.price_per_share,
    ROUND(ss.price_per_share, 4) as price_per_share_rounded
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.id = 88;

-- Verify calculations
SELECT 
    'Verification Calculations' as type,
    (SELECT SUM(shares) FROM founders WHERE startup_id = 88) as total_founder_shares,
    (SELECT SUM(shares) FROM investment_records WHERE startup_id = 88) as total_investor_shares,
    (SELECT esop_reserved_shares FROM startup_shares WHERE startup_id = 88) as esop_reserved_shares,
    (SELECT total_shares FROM startup_shares WHERE startup_id = 88) as total_shares,
    (SELECT total_funding FROM startups WHERE id = 88) as total_funding_from_startups,
    (SELECT SUM(amount) FROM investment_records WHERE startup_id = 88) as total_funding_from_investments;
