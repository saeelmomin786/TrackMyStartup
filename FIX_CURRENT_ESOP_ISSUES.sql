-- =====================================================
-- FIX CURRENT ESOP ISSUES FOR STARTUP
-- =====================================================
-- This script fixes the specific issues shown in the dashboard

-- =====================================================
-- STEP 1: IDENTIFY THE STARTUP
-- =====================================================

-- Find the startup with name "Your Startup Name"
SELECT 
    '=== FINDING STARTUP ===' as status,
    id,
    name,
    current_valuation
FROM startups 
WHERE name = 'Your Startup Name'
ORDER BY id;

-- =====================================================
-- STEP 2: CHECK CURRENT ESOP CONFIGURATION
-- =====================================================

-- Check current startup_shares configuration
-- Replace 88 with the actual startup ID from step 1
SELECT 
    '=== CURRENT ESOP CONFIGURATION ===' as status,
    ss.startup_id,
    s.name,
    ss.total_shares,
    ss.esop_reserved_shares,
    ss.price_per_share,
    s.current_valuation
FROM startup_shares ss
JOIN startups s ON ss.startup_id = s.id
WHERE s.name = 'Your Startup Name';

-- =====================================================
-- STEP 3: FIX ESOP RESERVED SHARES
-- =====================================================

-- Update ESOP reserved shares to 10,000 (standard value)
-- Replace 88 with the actual startup ID
UPDATE startup_shares 
SET 
    esop_reserved_shares = 10000,
    updated_at = NOW()
WHERE startup_id = (SELECT id FROM startups WHERE name = 'Your Startup Name');

-- =====================================================
-- STEP 4: SET PRICE PER SHARE
-- =====================================================

-- Set a reasonable price per share based on valuation
-- This will calculate price per share if valuation exists
UPDATE startup_shares 
SET 
    price_per_share = CASE 
        WHEN (SELECT current_valuation FROM startups WHERE name = 'Your Startup Name') > 0 
        THEN (SELECT current_valuation FROM startups WHERE name = 'Your Startup Name') / 
             (total_shares + esop_reserved_shares)
        ELSE 0.01  -- Default price per share
    END,
    updated_at = NOW()
WHERE startup_id = (SELECT id FROM startups WHERE name = 'Your Startup Name');

-- =====================================================
-- STEP 5: UPDATE TOTAL SHARES CALCULATION
-- =====================================================

-- Recalculate total shares to include ESOP
UPDATE startup_shares 
SET 
    total_shares = (
        COALESCE((
            SELECT SUM(shares) 
            FROM founders 
            WHERE startup_id = (SELECT id FROM startups WHERE name = 'Your Startup Name')
        ), 0) +
        COALESCE((
            SELECT SUM(shares) 
            FROM investment_records 
            WHERE startup_id = (SELECT id FROM startups WHERE name = 'Your Startup Name')
        ), 0) +
        esop_reserved_shares
    ),
    updated_at = NOW()
WHERE startup_id = (SELECT id FROM startups WHERE name = 'Your Startup Name');

-- =====================================================
-- STEP 6: VERIFICATION
-- =====================================================

-- Check the fixed configuration
SELECT 
    '=== FIXED ESOP CONFIGURATION ===' as status,
    ss.startup_id,
    s.name,
    ss.total_shares,
    ss.esop_reserved_shares,
    ROUND(ss.price_per_share, 4) as price_per_share,
    s.current_valuation,
    (ss.esop_reserved_shares * ss.price_per_share) as esop_reserved_value
FROM startup_shares ss
JOIN startups s ON ss.startup_id = s.id
WHERE s.name = 'Your Startup Name';

-- =====================================================
-- STEP 7: ADD SAMPLE EMPLOYEE (OPTIONAL)
-- =====================================================

-- Add a sample employee to test ESOP functionality
-- Uncomment and modify as needed
/*
INSERT INTO employees (
    startup_id,
    name,
    joining_date,
    entity,
    department,
    salary,
    esop_allocation,
    allocation_type,
    esop_per_allocation,
    created_at,
    updated_at
) VALUES (
    (SELECT id FROM startups WHERE name = 'Your Startup Name'),
    'Sample Employee',
    '2025-01-01',
    'Parent Company',
    'Engineering',
    100000,
    5000,  -- 5000 USD ESOP allocation
    'one-time',
    5000,
    NOW(),
    NOW()
);
*/
