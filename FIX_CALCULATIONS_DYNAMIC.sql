-- =====================================================
-- DYNAMIC CALCULATION FIX FOR ANY STARTUP
-- =====================================================

-- Step 1: Find your startup ID
-- Replace 'Synora' with your actual startup name if different
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

-- Step 2: Check current data for your startup
-- (Replace 89 with your actual startup ID from Step 1)
SELECT 
    'Current data for your startup:' as step,
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

-- Step 3: Fix ESOP reserved shares (Replace 89 with your startup ID)
UPDATE startup_shares 
SET 
    esop_reserved_shares = 10000,
    updated_at = NOW()
WHERE startup_id = 89;

-- Step 4: Fix total shares calculation (Replace 89 with your startup ID)
UPDATE startup_shares 
SET 
    total_shares = (
        COALESCE((SELECT SUM(shares) FROM founders WHERE startup_id = 89), 0) +
        COALESCE((SELECT SUM(shares) FROM investment_records WHERE startup_id = 89), 0) +
        10000
    ),
    updated_at = NOW()
WHERE startup_id = 89;

-- Step 5: Fix price per share (Replace 89 with your startup ID)
UPDATE startup_shares 
SET 
    price_per_share = (
        SELECT s.current_valuation / ss.total_shares 
        FROM startups s 
        JOIN startup_shares ss ON s.id = ss.startup_id 
        WHERE s.id = 89
    ),
    updated_at = NOW()
WHERE startup_id = 89;

-- Step 6: Sync total funding (Replace 89 with your startup ID)
UPDATE startups 
SET 
    total_funding = (
        SELECT COALESCE(SUM(amount), 0)
        FROM investment_records 
        WHERE startup_id = 89
    ),
    updated_at = NOW()
WHERE id = 89;

-- Step 7: Verify the fixes
SELECT 
    'After fixes - verification:' as step,
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
