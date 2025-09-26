-- =====================================================
-- TEST SCRIPT: VERIFY NEW STARTUP ESOP AUTOMATIC SETUP
-- =====================================================
-- This script tests that new startups automatically get proper ESOP setup
-- Run this AFTER running COMPLETE_ESOP_SYSTEM_FIX.sql

-- =====================================================
-- STEP 1: CREATE A TEST STARTUP
-- =====================================================

-- Insert a test startup to verify automatic ESOP setup
INSERT INTO startups (name, description, current_valuation, created_at, updated_at)
VALUES ('Test Startup for ESOP', 'Testing automatic ESOP setup', 1000000, NOW(), NOW());

-- Get the ID of the test startup
-- (In a real scenario, you'd get this from the INSERT result)

-- =====================================================
-- STEP 2: CHECK IF STARTUP_SHARES WAS AUTOMATICALLY CREATED
-- =====================================================

-- Check if the test startup got automatic startup_shares record
SELECT 
    '=== TEST STARTUP AUTOMATIC ESOP SETUP ===' as status,
    s.id,
    s.name,
    ss.total_shares,
    ss.esop_reserved_shares,
    ss.price_per_share,
    CASE 
        WHEN ss.startup_id IS NOT NULL THEN '✅ AUTOMATIC SETUP WORKING'
        ELSE '❌ AUTOMATIC SETUP FAILED'
    END as auto_setup_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.name = 'Test Startup for ESOP'
ORDER BY s.id DESC
LIMIT 1;

-- =====================================================
-- STEP 3: TEST FOUNDER ADDITION TRIGGER
-- =====================================================

-- Add a founder to the test startup to test trigger
INSERT INTO founders (startup_id, name, shares, created_at, updated_at)
SELECT 
    s.id,
    'Test Founder',
    50000,
    NOW(),
    NOW()
FROM startups s
WHERE s.name = 'Test Startup for ESOP'
LIMIT 1;

-- Check if shares were automatically recalculated
SELECT 
    '=== AFTER ADDING FOUNDER ===' as status,
    s.id,
    s.name,
    ss.total_shares,
    ss.esop_reserved_shares,
    ss.price_per_share,
    (SELECT SUM(shares) FROM founders WHERE startup_id = s.id) as total_founder_shares,
    CASE 
        WHEN ss.total_shares = (SELECT SUM(shares) FROM founders WHERE startup_id = s.id) + ss.esop_reserved_shares
        THEN '✅ SHARES AUTO-RECALCULATED'
        ELSE '❌ SHARES NOT RECALCULATED'
    END as recalculation_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.name = 'Test Startup for ESOP'
ORDER BY s.id DESC
LIMIT 1;

-- =====================================================
-- STEP 4: TEST INVESTMENT ADDITION TRIGGER
-- =====================================================

-- Add an investment to the test startup to test trigger
INSERT INTO investment_records (startup_id, investor_name, amount, shares, investment_date, created_at, updated_at)
SELECT 
    s.id,
    'Test Investor',
    100000,
    10000,
    NOW(),
    NOW(),
    NOW()
FROM startups s
WHERE s.name = 'Test Startup for ESOP'
LIMIT 1;

-- Check if shares and funding were automatically recalculated
SELECT 
    '=== AFTER ADDING INVESTMENT ===' as status,
    s.id,
    s.name,
    ss.total_shares,
    ss.esop_reserved_shares,
    ss.price_per_share,
    s.total_funding,
    (SELECT SUM(shares) FROM founders WHERE startup_id = s.id) as total_founder_shares,
    (SELECT SUM(shares) FROM investment_records WHERE startup_id = s.id) as total_investor_shares,
    (SELECT SUM(amount) FROM investment_records WHERE startup_id = s.id) as calculated_total_funding,
    CASE 
        WHEN ss.total_shares = (
            COALESCE((SELECT SUM(shares) FROM founders WHERE startup_id = s.id), 0) +
            COALESCE((SELECT SUM(shares) FROM investment_records WHERE startup_id = s.id), 0) +
            ss.esop_reserved_shares
        ) AND s.total_funding = (SELECT SUM(amount) FROM investment_records WHERE startup_id = s.id)
        THEN '✅ ALL AUTO-RECALCULATED'
        ELSE '❌ RECALCULATION FAILED'
    END as full_recalculation_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.name = 'Test Startup for ESOP'
ORDER BY s.id DESC
LIMIT 1;

-- =====================================================
-- STEP 5: CLEANUP TEST DATA
-- =====================================================

-- Remove test data (optional - you can keep it for further testing)
-- DELETE FROM investment_records WHERE startup_id IN (SELECT id FROM startups WHERE name = 'Test Startup for ESOP');
-- DELETE FROM founders WHERE startup_id IN (SELECT id FROM startups WHERE name = 'Test Startup for ESOP');
-- DELETE FROM startup_shares WHERE startup_id IN (SELECT id FROM startups WHERE name = 'Test Startup for ESOP');
-- DELETE FROM startups WHERE name = 'Test Startup for ESOP';

-- =====================================================
-- STEP 6: FINAL SYSTEM STATUS
-- =====================================================

-- Show final status of all startups including the test
SELECT 
    '=== FINAL SYSTEM STATUS (INCLUDING TEST) ===' as status,
    s.id,
    s.name,
    ss.total_shares,
    ss.esop_reserved_shares,
    ROUND(ss.price_per_share, 4) as price_per_share,
    (SELECT SUM(shares) FROM founders WHERE startup_id = s.id) as total_founder_shares,
    (SELECT SUM(shares) FROM investment_records WHERE startup_id = s.id) as total_investor_shares,
    CASE 
        WHEN ss.esop_reserved_shares = 0 OR ss.esop_reserved_shares IS NULL 
        THEN '❌ STILL HAS ISSUE'
        ELSE '✅ ESOP FIXED'
    END as esop_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
ORDER BY s.id;
