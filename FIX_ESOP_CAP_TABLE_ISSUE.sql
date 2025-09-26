-- =====================================================
-- FIX ESOP CAP TABLE ISSUE - COMPREHENSIVE SOLUTION
-- =====================================================
-- This script fixes the ESOP display issue in cap table by ensuring
-- all startups have proper startup_shares records with correct ESOP data

-- =====================================================
-- STEP 1: CREATE MISSING STARTUP_SHARES RECORDS
-- =====================================================

-- Insert startup_shares records for startups that don't have them
INSERT INTO startup_shares (startup_id, total_shares, esop_reserved_shares, price_per_share, updated_at)
SELECT 
    s.id,
    -- Calculate total shares: founders + investors + ESOP
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
    10000, -- Default ESOP reserved shares
    10000, -- ESOP reserved shares (default)
    -- Calculate price per share based on current valuation
    CASE 
        WHEN s.current_valuation > 0 AND (
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
            10000
        ) > 0 THEN ROUND(s.current_valuation / (
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
            10000
        ), 4)
        ELSE 0.01 -- Default price per share
    END,
    NOW()
FROM startups s
WHERE NOT EXISTS (
    SELECT 1 FROM startup_shares ss WHERE ss.startup_id = s.id
);

-- =====================================================
-- STEP 2: FIX EXISTING STARTUP_SHARES RECORDS WITH ESOP = 0
-- =====================================================

-- Update existing startup_shares records that have ESOP = 0 or NULL
UPDATE startup_shares 
SET 
    esop_reserved_shares = 10000,
    updated_at = NOW()
WHERE esop_reserved_shares = 0 OR esop_reserved_shares IS NULL;

-- =====================================================
-- STEP 3: RECALCULATE TOTAL SHARES FOR ALL STARTUPS
-- =====================================================

-- Update total_shares to include ESOP reserved shares
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

-- =====================================================
-- STEP 4: RECALCULATE PRICE PER SHARE FOR ALL STARTUPS
-- =====================================================

-- Update price per share based on current valuation and total shares
UPDATE startup_shares 
SET 
    price_per_share = CASE 
        WHEN total_shares > 0 AND (
            SELECT s.current_valuation 
            FROM startups s 
            WHERE s.id = startup_shares.startup_id
        ) > 0 THEN ROUND((
            SELECT s.current_valuation 
            FROM startups s 
            WHERE s.id = startup_shares.startup_id
        ) / total_shares, 4)
        ELSE price_per_share -- Keep existing value if no valuation
    END,
    updated_at = NOW()
WHERE total_shares > 0;

-- =====================================================
-- STEP 5: VERIFY THE FIX
-- =====================================================

-- Show all startups with their ESOP data
SELECT 
    '=== VERIFICATION: ALL STARTUPS WITH ESOP DATA ===' as status,
    s.id,
    s.name,
    ss.esop_reserved_shares,
    ss.price_per_share,
    ss.total_shares,
    s.current_valuation,
    CASE 
        WHEN ss.esop_reserved_shares > 0 THEN '✅ ESOP CONFIGURED'
        ELSE '❌ NO ESOP'
    END as esop_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
ORDER BY s.id;

-- =====================================================
-- STEP 6: SUMMARY STATISTICS
-- =====================================================

SELECT 
    '=== FINAL SUMMARY ===' as status,
    COUNT(*) as total_startups,
    COUNT(ss.startup_id) as startups_with_shares_records,
    COUNT(CASE WHEN ss.esop_reserved_shares > 0 THEN 1 END) as startups_with_esop,
    COUNT(CASE WHEN ss.price_per_share > 0 THEN 1 END) as startups_with_price_per_share,
    ROUND(AVG(ss.esop_reserved_shares), 0) as avg_esop_reserved_shares,
    ROUND(AVG(ss.price_per_share), 4) as avg_price_per_share
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id;
