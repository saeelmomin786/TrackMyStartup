-- =====================================================
-- FIX ESOP MISMATCH - FINAL FIX FOR SYNORA
-- =====================================================
-- Current situation:
-- startups.esop_reserved_shares = 100,000
-- startup_shares.esop_reserved_shares = 10,000
-- 
-- We need to make startup_shares match startups table (100,000)

-- =====================================================
-- STEP 1: UPDATE STARTUP_SHARES TABLE TO MATCH STARTUPS TABLE
-- =====================================================

UPDATE startup_shares 
SET 
    esop_reserved_shares = 100000,
    updated_at = NOW()
WHERE startup_id = 90;

-- =====================================================
-- STEP 2: RECALCULATE TOTAL SHARES
-- =====================================================

-- Recalculate total shares to include the correct ESOP amount (100,000)
UPDATE startup_shares 
SET 
    total_shares = (
        COALESCE((
            SELECT SUM(shares) 
            FROM founders 
            WHERE startup_id = 90
        ), 0) +
        COALESCE((
            SELECT SUM(shares) 
            FROM investment_records 
            WHERE startup_id = 90
        ), 0) +
        100000  -- ESOP reserved shares
    ),
    updated_at = NOW()
WHERE startup_id = 90;

-- =====================================================
-- STEP 3: VERIFY THE FIX
-- =====================================================

SELECT 
    '=== VERIFICATION AFTER FIX ===' as status,
    s.id,
    s.name,
    s.esop_reserved_shares as startups_esop,
    ss.esop_reserved_shares as shares_table_esop,
    s.price_per_share as startups_pps,
    ss.price_per_share as shares_table_pps,
    s.total_shares as startups_total,
    ss.total_shares as shares_table_total,
    CASE 
        WHEN s.esop_reserved_shares = ss.esop_reserved_shares THEN '✅ FIXED - MATCH'
        ELSE '❌ STILL MISMATCH'
    END as fix_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.id = 90;

-- =====================================================
-- STEP 4: SHOW FINAL CALCULATIONS
-- =====================================================

SELECT 
    '=== FINAL CALCULATIONS ===' as status,
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
        COALESCE(ss.esop_reserved_shares, 0) = ss.total_shares THEN '✅ TOTAL SHARES MATCH'
        ELSE '❌ TOTAL SHARES MISMATCH'
    END as total_shares_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE s.id = 90;
