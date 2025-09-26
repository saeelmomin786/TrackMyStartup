-- =====================================================
-- SINGLE STARTUP TEST FIX (SAFE TO TEST)
-- =====================================================
-- This script fixes calculations for ONE startup only
-- Replace 'YOUR_STARTUP_ID' with your actual startup ID
-- This is safe to test because it only affects one startup

-- =====================================================
-- STEP 1: FIND YOUR STARTUP ID
-- =====================================================

-- First, find your startup ID (replace 'Synora' with your startup name)
SELECT 
    'Your startup ID is: ' || id as message,
    id as startup_id,
    name,
    total_funding,
    current_valuation
FROM startups 
WHERE name ILIKE '%synora%' 
ORDER BY created_at DESC 
LIMIT 1;

-- =====================================================
-- STEP 2: CHECK CURRENT DATA FOR YOUR STARTUP
-- =====================================================

-- Check current data (replace 89 with your actual startup ID from Step 1)
SELECT 
    '=== CURRENT DATA FOR YOUR STARTUP ===' as step,
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
-- STEP 3: SHOW WHAT THE FIXES WOULD BE (READ-ONLY)
-- =====================================================

-- Show what the fixes would change (replace 89 with your startup ID)
SELECT 
    s.id,
    s.name,
    'ESOP Reserved Shares' as field,
    COALESCE(ss.esop_reserved_shares, 0) as current_value,
    10000 as new_value,
    CASE 
        WHEN ss.esop_reserved_shares = 0 OR ss.esop_reserved_shares IS NULL 
        THEN 'WILL CHANGE: 0 → 10000'
        ELSE 'NO CHANGE NEEDED'
    END as change_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.id = 89

UNION ALL

SELECT 
    s.id,
    s.name,
    'Total Shares' as field,
    ss.total_shares as current_value,
    (
        COALESCE((SELECT SUM(shares) FROM founders WHERE startup_id = 89), 0) +
        COALESCE((SELECT SUM(shares) FROM investment_records WHERE startup_id = 89), 0) +
        10000
    ) as new_value,
    CASE 
        WHEN ss.total_shares != (
            COALESCE((SELECT SUM(shares) FROM founders WHERE startup_id = 89), 0) +
            COALESCE((SELECT SUM(shares) FROM investment_records WHERE startup_id = 89), 0) +
            10000
        )
        THEN 'WILL CHANGE: Recalculated'
        ELSE 'NO CHANGE NEEDED'
    END as change_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.id = 89

UNION ALL

SELECT 
    s.id,
    s.name,
    'Price Per Share' as field,
    ss.price_per_share as current_value,
    CASE 
        WHEN (
            COALESCE((SELECT SUM(shares) FROM founders WHERE startup_id = 89), 0) +
            COALESCE((SELECT SUM(shares) FROM investment_records WHERE startup_id = 89), 0) +
            10000
        ) > 0 
        THEN ROUND(s.current_valuation / (
            COALESCE((SELECT SUM(shares) FROM founders WHERE startup_id = 89), 0) +
            COALESCE((SELECT SUM(shares) FROM investment_records WHERE startup_id = 89), 0) +
            10000
        ), 4)
        ELSE 0
    END as new_value,
    CASE 
        WHEN ss.price_per_share != CASE 
            WHEN (
                COALESCE((SELECT SUM(shares) FROM founders WHERE startup_id = 89), 0) +
                COALESCE((SELECT SUM(shares) FROM investment_records WHERE startup_id = 89), 0) +
                10000
            ) > 0 
            THEN ROUND(s.current_valuation / (
                COALESCE((SELECT SUM(shares) FROM founders WHERE startup_id = 89), 0) +
                COALESCE((SELECT SUM(shares) FROM investment_records WHERE startup_id = 89), 0) +
                10000
            ), 4)
            ELSE 0
        END
        THEN 'WILL CHANGE: Recalculated'
        ELSE 'NO CHANGE NEEDED'
    END as change_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.id = 89

UNION ALL

SELECT 
    s.id,
    s.name,
    'Total Funding' as field,
    s.total_funding as current_value,
    COALESCE((SELECT SUM(amount) FROM investment_records WHERE startup_id = 89), 0) as new_value,
    CASE 
        WHEN s.total_funding != COALESCE((SELECT SUM(amount) FROM investment_records WHERE startup_id = 89), 0)
        THEN 'WILL CHANGE: Synced with investments'
        ELSE 'NO CHANGE NEEDED'
    END as change_status
FROM startups s
WHERE s.id = 89;

-- =====================================================
-- STEP 4: APPLY FIXES (ONLY IF YOU'RE READY)
-- =====================================================

-- UNCOMMENT THE LINES BELOW ONLY AFTER YOU'VE REVIEWED THE CHANGES ABOVE
-- Replace 89 with your actual startup ID

/*
-- Fix ESOP reserved shares
UPDATE startup_shares 
SET 
    esop_reserved_shares = 10000,
    updated_at = NOW()
WHERE startup_id = 89;

-- Fix total shares calculation
UPDATE startup_shares 
SET 
    total_shares = (
        COALESCE((SELECT SUM(shares) FROM founders WHERE startup_id = 89), 0) +
        COALESCE((SELECT SUM(shares) FROM investment_records WHERE startup_id = 89), 0) +
        10000
    ),
    updated_at = NOW()
WHERE startup_id = 89;

-- Fix price per share
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

-- Fix total funding
UPDATE startups 
SET 
    total_funding = (
        SELECT COALESCE(SUM(amount), 0)
        FROM investment_records 
        WHERE startup_id = 89
    ),
    updated_at = NOW()
WHERE id = 89;
*/

-- =====================================================
-- STEP 5: VERIFY FIXES (RUN AFTER APPLYING FIXES)
-- =====================================================

-- UNCOMMENT THE LINES BELOW TO VERIFY THE FIXES
-- Replace 89 with your actual startup ID

/*
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
    (SELECT SUM(amount) FROM investment_records WHERE startup_id = 89) as total_investment_amount
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.id = 89;
*/
