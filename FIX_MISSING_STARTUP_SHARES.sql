-- =====================================================
-- FIX MISSING STARTUP_SHARES RECORDS
-- =====================================================
-- This script creates missing startup_shares records for startups
-- that don't have any records in the startup_shares table

-- =====================================================
-- STEP 1: IDENTIFY STARTUPS MISSING STARTUP_SHARES RECORDS
-- =====================================================

SELECT 
    '=== STARTUPS MISSING STARTUP_SHARES RECORDS ===' as status,
    s.id,
    s.name,
    CASE 
        WHEN ss.startup_id IS NULL THEN '❌ MISSING RECORD'
        ELSE '✅ HAS RECORD'
    END as shares_table_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
WHERE ss.startup_id IS NULL
ORDER BY s.id;

-- =====================================================
-- STEP 2: CREATE MISSING STARTUP_SHARES RECORDS
-- =====================================================

-- Insert startup_shares records for startups that don't have them
INSERT INTO startup_shares (startup_id, total_shares, esop_reserved_shares, price_per_share, updated_at)
SELECT 
    s.id,
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
        ) > 0 THEN s.current_valuation / (
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
        )
        ELSE 0
    END,
    NOW()
FROM startups s
WHERE NOT EXISTS (
    SELECT 1 FROM startup_shares ss WHERE ss.startup_id = s.id
);

-- =====================================================
-- STEP 3: VERIFICATION - CHECK ALL STARTUPS AFTER FIX
-- =====================================================

SELECT 
    '=== ALL STARTUPS AFTER MISSING RECORDS FIX ===' as status,
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
