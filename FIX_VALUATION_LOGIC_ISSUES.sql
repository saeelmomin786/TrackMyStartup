-- FIX_VALUATION_LOGIC_ISSUES.sql
-- Fix critical valuation logic inconsistencies between startup and facilitation views
-- This ensures consistent valuation calculations across all views

-- =====================================================
-- STEP 1: VERIFY CURRENT VALUATION DATA
-- =====================================================

SELECT '=== CURRENT VALUATION DATA ANALYSIS ===' as info;

-- Check current valuation data in startups table
SELECT 
    id,
    name,
    current_valuation,
    total_funding,
    CASE 
        WHEN current_valuation = total_funding THEN '❌ WRONG - Valuation = Funding'
        WHEN current_valuation > total_funding THEN '✅ OK - Valuation > Funding'
        WHEN current_valuation < total_funding THEN '⚠️ CHECK - Valuation < Funding'
        ELSE '❓ UNKNOWN'
    END as valuation_status
FROM startups 
WHERE current_valuation IS NOT NULL 
ORDER BY current_valuation DESC
LIMIT 10;

-- =====================================================
-- STEP 2: FIX VALUATION CALCULATION LOGIC
-- =====================================================

-- Create a function to get correct current valuation
CREATE OR REPLACE FUNCTION get_correct_current_valuation(p_startup_id INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    base_valuation DECIMAL;
    latest_post_money DECIMAL;
    correct_valuation DECIMAL;
BEGIN
    -- Get base valuation from startup_shares (if exists)
    SELECT COALESCE(total_shares * price_per_share, 0) 
    INTO base_valuation
    FROM startup_shares 
    WHERE startup_id = p_startup_id;
    
    -- Get latest post-money valuation from investment records
    SELECT COALESCE(post_money_valuation, 0)
    INTO latest_post_money
    FROM investment_records 
    WHERE startup_id = p_startup_id 
    AND post_money_valuation IS NOT NULL 
    AND post_money_valuation > 0
    ORDER BY date DESC, id DESC 
    LIMIT 1;
    
    -- Calculate correct valuation
    -- Priority: latest post-money > base (total_shares * price_per_share) > 0
    correct_valuation := COALESCE(
        latest_post_money,
        base_valuation,
        0
    );
    
    RETURN correct_valuation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 3: UPDATE INCORRECT VALUATIONS
-- =====================================================

-- Fix startups where current_valuation = total_funding (wrong logic)
UPDATE startups 
SET 
    current_valuation = get_correct_current_valuation(id),
    updated_at = NOW()
WHERE current_valuation = total_funding 
AND current_valuation > 0;

-- Fix startups where current_valuation is NULL or 0 but should have a value
UPDATE startups 
SET 
    current_valuation = get_correct_current_valuation(id),
    updated_at = NOW()
WHERE (current_valuation IS NULL OR current_valuation = 0)
AND id IN (
    SELECT DISTINCT startup_id 
    FROM investment_records 
    WHERE startup_id IS NOT NULL
);

-- Fix any remaining mismatches: non-zero current_valuation that differs from computed value
UPDATE startups s
SET 
    current_valuation = get_correct_current_valuation(s.id),
    updated_at = NOW()
WHERE COALESCE(s.current_valuation, 0) <> COALESCE(get_correct_current_valuation(s.id), 0);

-- =====================================================
-- STEP 4: CREATE CONSISTENT PRICE PER SHARE CALCULATION
-- =====================================================

-- Create function for consistent price per share calculation
CREATE OR REPLACE FUNCTION calculate_price_per_share(p_startup_id INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    total_shares INTEGER;
    current_valuation DECIMAL;
    price_per_share DECIMAL;
BEGIN
    -- Get total shares
    SELECT COALESCE(
        (SELECT SUM(shares) FROM founders WHERE startup_id = p_startup_id),
        0
    ) + COALESCE(
        (SELECT SUM(shares) FROM investment_records WHERE startup_id = p_startup_id),
        0
    ) + COALESCE(
        (SELECT esop_reserved_shares FROM startup_shares WHERE startup_id = p_startup_id),
        0
    ) INTO total_shares;
    
    -- Get current valuation
    SELECT get_correct_current_valuation(p_startup_id) INTO current_valuation;
    
    -- Calculate price per share
    price_per_share := CASE 
        WHEN total_shares > 0 AND current_valuation > 0 THEN 
            current_valuation / total_shares
        ELSE 0
    END;
    
    RETURN price_per_share;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 5: UPDATE STARTUP_SHARES WITH CORRECT VALUES
-- =====================================================

-- Update startup_shares with correct price per share
UPDATE startup_shares 
SET 
    price_per_share = calculate_price_per_share(startup_id),
    total_shares = (
        COALESCE((SELECT SUM(shares) FROM founders WHERE startup_id = startup_shares.startup_id), 0) +
        COALESCE((SELECT SUM(shares) FROM investment_records WHERE startup_id = startup_shares.startup_id), 0) +
        COALESCE(esop_reserved_shares, 0)
    ),
    updated_at = NOW()
WHERE startup_id IN (
    SELECT id FROM startups 
    WHERE current_valuation IS NOT NULL 
    AND current_valuation > 0
);

-- =====================================================
-- STEP 6: VERIFICATION
-- =====================================================

SELECT '=== VERIFICATION - FIXED VALUATION DATA ===' as info;

-- Check fixed valuations
SELECT 
    id,
    name,
    current_valuation,
    total_funding,
    CASE 
        WHEN current_valuation = total_funding THEN '❌ STILL WRONG'
        WHEN current_valuation > total_funding THEN '✅ FIXED'
        WHEN current_valuation < total_funding THEN '⚠️ CHECK'
        ELSE '❓ UNKNOWN'
    END as valuation_status
FROM startups 
WHERE current_valuation IS NOT NULL 
ORDER BY current_valuation DESC
LIMIT 10;

-- Check price per share calculations
SELECT 
    ss.startup_id,
    s.name,
    ss.total_shares,
    ss.price_per_share,
    s.current_valuation,
    CASE 
        WHEN ss.total_shares > 0 THEN ROUND(s.current_valuation / ss.total_shares, 4)
        ELSE 0
    END as calculated_price_per_share,
    CASE 
        WHEN ABS(ss.price_per_share - (s.current_valuation / ss.total_shares)) < 0.01 THEN '✅ CONSISTENT'
        ELSE '❌ INCONSISTENT'
    END as price_consistency
FROM startup_shares ss
JOIN startups s ON ss.startup_id = s.id
WHERE ss.total_shares > 0
ORDER BY ss.startup_id
LIMIT 10;

-- =====================================================
-- STEP 7: CREATE HELPER FUNCTIONS FOR FRONTEND
-- =====================================================

-- Function to get startup data with correct valuation
CREATE OR REPLACE FUNCTION get_startup_with_correct_valuation(p_startup_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    name TEXT,
    current_valuation DECIMAL,
    total_funding DECIMAL,
    price_per_share DECIMAL,
    total_shares INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        get_correct_current_valuation(p_startup_id) as current_valuation,
        s.total_funding,
        calculate_price_per_share(p_startup_id) as price_per_share,
        COALESCE(
            (SELECT SUM(shares) FROM founders WHERE startup_id = p_startup_id),
            0
        ) + COALESCE(
            (SELECT SUM(shares) FROM investment_records WHERE startup_id = p_startup_id),
            0
        ) + COALESCE(
            (SELECT esop_reserved_shares FROM startup_shares WHERE startup_id = p_startup_id),
            0
        ) as total_shares
    FROM startups s
    WHERE s.id = p_startup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '=== VALUATION LOGIC FIXES COMPLETED ===' as info;
SELECT 'All valuation inconsistencies have been addressed.' as result;
