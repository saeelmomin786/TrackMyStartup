-- VERIFY_CO_INVESTMENT_DATA_FETCH.sql
-- Verify that co-investment opportunities data can be fetched correctly with joins

-- =====================================================
-- 1. CHECK TABLE STRUCTURE
-- =====================================================

SELECT '=== CO_INVESTMENT_OPPORTUNITIES TABLE STRUCTURE ===' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'co_investment_opportunities'
ORDER BY ordinal_position;

-- =====================================================
-- 2. CHECK FOREIGN KEY RELATIONSHIPS
-- =====================================================

SELECT '=== FOREIGN KEY CONSTRAINTS ===' as info;
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'co_investment_opportunities';

-- =====================================================
-- 3. CHECK DATA EXISTS
-- =====================================================

SELECT '=== ACTIVE CO-INVESTMENT OPPORTUNITIES COUNT ===' as info;
SELECT COUNT(*) as total_active_opportunities
FROM co_investment_opportunities
WHERE status = 'active';

-- =====================================================
-- 4. TEST DATA FETCH WITH JOINS (Simulating Supabase Query)
-- =====================================================

SELECT '=== SAMPLE DATA WITH JOINS ===' as info;
SELECT 
    cio.id,
    cio.startup_id,
    cio.listed_by_user_id,
    cio.listed_by_type,
    cio.investment_amount,
    cio.equity_percentage,
    cio.status,
    cio.stage,
    cio.created_at,
    s.name as startup_name,
    s.sector as startup_sector,
    u.name as lead_investor_name,
    u.email as lead_investor_email
FROM co_investment_opportunities cio
LEFT JOIN startups s ON cio.startup_id = s.id
LEFT JOIN users u ON cio.listed_by_user_id = u.id
WHERE cio.status = 'active'
ORDER BY cio.created_at DESC
LIMIT 5;

-- =====================================================
-- 5. CHECK FOR NULL VALUES THAT MIGHT CAUSE ISSUES
-- =====================================================

SELECT '=== CHECKING FOR NULL VALUES ===' as info;
SELECT 
    COUNT(*) FILTER (WHERE startup_id IS NULL) as null_startup_ids,
    COUNT(*) FILTER (WHERE listed_by_user_id IS NULL) as null_listed_by_user_ids,
    COUNT(*) FILTER (WHERE investment_amount IS NULL) as null_investment_amounts,
    COUNT(*) FILTER (WHERE equity_percentage IS NULL) as null_equity_percentages
FROM co_investment_opportunities
WHERE status = 'active';

-- =====================================================
-- 6. CHECK IF STARTUPS EXIST FOR ALL OPPORTUNITIES
-- =====================================================

SELECT '=== MISSING STARTUP DATA ===' as info;
SELECT 
    cio.id as opportunity_id,
    cio.startup_id,
    cio.listed_by_user_id
FROM co_investment_opportunities cio
LEFT JOIN startups s ON cio.startup_id = s.id
WHERE cio.status = 'active'
  AND s.id IS NULL;

-- =====================================================
-- 7. CHECK IF USERS EXIST FOR ALL OPPORTUNITIES
-- =====================================================

SELECT '=== MISSING USER DATA ===' as info;
SELECT 
    cio.id as opportunity_id,
    cio.startup_id,
    cio.listed_by_user_id
FROM co_investment_opportunities cio
LEFT JOIN users u ON cio.listed_by_user_id = u.id
WHERE cio.status = 'active'
  AND u.id IS NULL;

-- =====================================================
-- 8. TEST QUERY MATCHING THE CODE (Supabase format)
-- =====================================================

SELECT '=== SUPABASE-STYLE QUERY TEST ===' as info;
-- This simulates what Supabase should return
SELECT 
    cio.id,
    cio.startup_id,
    cio.listed_by_user_id,
    cio.listed_by_type,
    cio.investment_amount,
    cio.equity_percentage,
    cio.minimum_co_investment,
    cio.maximum_co_investment,
    cio.status,
    cio.stage,
    cio.created_at,
    -- Startup data (simulating join)
    json_build_object(
        'name', s.name,
        'sector', s.sector
    ) as startup,
    -- User data (simulating join)
    json_build_object(
        'name', u.name,
        'email', u.email
    ) as listed_by_user
FROM co_investment_opportunities cio
LEFT JOIN startups s ON cio.startup_id = s.id
LEFT JOIN users u ON cio.listed_by_user_id = u.id
WHERE cio.status = 'active'
ORDER BY cio.created_at DESC
LIMIT 3;

