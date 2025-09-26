-- =====================================================
-- FIND YOUR STARTUP AND FIX CALCULATION ISSUES
-- =====================================================

-- First, let's find your startup (Synora)
SELECT 'Finding your startup...' as step;

SELECT 
    s.id,
    s.name,
    s.user_id,
    s.total_funding,
    s.current_valuation,
    ss.total_shares,
    ss.esop_reserved_shares,
    ss.price_per_share
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.name ILIKE '%synora%' OR s.name ILIKE '%synora%'
ORDER BY s.created_at DESC;

-- Check if there are any startups at all
SELECT 'All startups in database:' as step;
SELECT id, name, total_funding, current_valuation FROM startups ORDER BY id;

-- Check investment records for all startups
SELECT 'Investment records by startup:' as step;
SELECT 
    startup_id,
    COUNT(*) as investment_count,
    SUM(amount) as total_amount,
    SUM(shares) as total_shares
FROM investment_records 
GROUP BY startup_id
ORDER BY startup_id;

-- Check founders for all startups
SELECT 'Founders by startup:' as step;
SELECT 
    startup_id,
    COUNT(*) as founder_count,
    SUM(shares) as total_shares
FROM founders 
GROUP BY startup_id
ORDER BY startup_id;

-- Check startup_shares for all startups
SELECT 'Startup shares data:' as step;
SELECT 
    startup_id,
    total_shares,
    esop_reserved_shares,
    price_per_share
FROM startup_shares 
ORDER BY startup_id;

-- =====================================================
-- DYNAMIC FIX BASED ON ACTUAL STARTUP ID
-- =====================================================

-- Once you find your actual startup ID, replace 'YOUR_STARTUP_ID' below with the correct ID
-- For example, if your startup ID is 89, change 'YOUR_STARTUP_ID' to 89

-- Uncomment and modify the section below with your actual startup ID:

/*
-- Update ESOP reserved shares
UPDATE startup_shares 
SET 
    esop_reserved_shares = 10000,
    updated_at = NOW()
WHERE startup_id = YOUR_STARTUP_ID;

-- Update total shares to include ESOP
WITH share_calculation AS (
    SELECT 
        COALESCE((SELECT SUM(shares) FROM founders WHERE startup_id = YOUR_STARTUP_ID), 0) +
        COALESCE((SELECT SUM(shares) FROM investment_records WHERE startup_id = YOUR_STARTUP_ID), 0) +
        10000 as calculated_total_shares
)
UPDATE startup_shares 
SET 
    total_shares = (SELECT calculated_total_shares FROM share_calculation),
    updated_at = NOW()
WHERE startup_id = YOUR_STARTUP_ID;

-- Update price per share
UPDATE startup_shares 
SET 
    price_per_share = (
        SELECT current_valuation / total_shares 
        FROM startups s 
        JOIN startup_shares ss ON s.id = ss.startup_id 
        WHERE s.id = YOUR_STARTUP_ID
    ),
    updated_at = NOW()
WHERE startup_id = YOUR_STARTUP_ID;

-- Sync total funding
WITH investment_total AS (
    SELECT COALESCE(SUM(amount), 0) as total_investment_amount
    FROM investment_records 
    WHERE startup_id = YOUR_STARTUP_ID
)
UPDATE startups 
SET 
    total_funding = (SELECT total_investment_amount FROM investment_total),
    updated_at = NOW()
WHERE id = YOUR_STARTUP_ID;
*/
