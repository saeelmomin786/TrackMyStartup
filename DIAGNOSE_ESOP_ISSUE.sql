-- =====================================================
-- DIAGNOSE ESOP ISSUE - CHECK CURRENT STATE
-- =====================================================
-- This script helps diagnose why ESOP data might not be showing properly

-- =====================================================
-- STEP 1: CHECK WHICH STARTUPS HAVE STARTUP_SHARES RECORDS
-- =====================================================

SELECT 
    '=== STARTUP SHARES TABLE STATUS ===' as section,
    s.id,
    s.name,
    CASE 
        WHEN ss.startup_id IS NULL THEN '❌ MISSING startup_shares record'
        ELSE '✅ HAS startup_shares record'
    END as shares_table_status,
    ss.esop_reserved_shares,
    ss.price_per_share,
    ss.total_shares,
    ss.updated_at
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
ORDER BY s.id;

-- =====================================================
-- STEP 2: CHECK ESOP DATA IN STARTUPS TABLE
-- =====================================================

SELECT 
    '=== ESOP DATA IN STARTUPS TABLE ===' as section,
    s.id,
    s.name,
    s.esop_reserved_shares as startups_table_esop,
    s.price_per_share as startups_table_pps,
    s.total_shares as startups_table_total
FROM startups s
WHERE s.esop_reserved_shares IS NOT NULL 
   OR s.price_per_share IS NOT NULL 
   OR s.total_shares IS NOT NULL
ORDER BY s.id;

-- =====================================================
-- STEP 3: CHECK ESOP DATA IN STARTUP_SHARES TABLE
-- =====================================================

SELECT 
    '=== ESOP DATA IN STARTUP_SHARES TABLE ===' as section,
    ss.startup_id,
    s.name,
    ss.esop_reserved_shares,
    ss.price_per_share,
    ss.total_shares,
    ss.updated_at
FROM startup_shares ss
JOIN startups s ON ss.startup_id = s.id
ORDER BY ss.startup_id;

-- =====================================================
-- STEP 4: CHECK FOR DATA MISMATCHES
-- =====================================================

SELECT 
    '=== DATA MISMATCHES ===' as section,
    s.id,
    s.name,
    s.esop_reserved_shares as startups_esop,
    ss.esop_reserved_shares as shares_table_esop,
    CASE 
        WHEN s.esop_reserved_shares != ss.esop_reserved_shares THEN '❌ MISMATCH'
        WHEN s.esop_reserved_shares IS NULL AND ss.esop_reserved_shares IS NULL THEN '❌ BOTH NULL'
        WHEN s.esop_reserved_shares IS NULL THEN '⚠️ STARTUPS NULL'
        WHEN ss.esop_reserved_shares IS NULL THEN '⚠️ SHARES_TABLE NULL'
        ELSE '✅ MATCH'
    END as esop_status,
    s.price_per_share as startups_pps,
    ss.price_per_share as shares_table_pps,
    CASE 
        WHEN s.price_per_share != ss.price_per_share THEN '❌ MISMATCH'
        WHEN s.price_per_share IS NULL AND ss.price_per_share IS NULL THEN '❌ BOTH NULL'
        WHEN s.price_per_share IS NULL THEN '⚠️ STARTUPS NULL'
        WHEN ss.price_per_share IS NULL THEN '⚠️ SHARES_TABLE NULL'
        ELSE '✅ MATCH'
    END as pps_status
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id
ORDER BY s.id;

-- =====================================================
-- STEP 5: SUMMARY STATISTICS
-- =====================================================

SELECT 
    '=== SUMMARY STATISTICS ===' as section,
    COUNT(*) as total_startups,
    COUNT(ss.startup_id) as startups_with_shares_records,
    COUNT(*) - COUNT(ss.startup_id) as startups_missing_shares_records,
    COUNT(CASE WHEN s.esop_reserved_shares > 0 THEN 1 END) as startups_with_esop_in_startups_table,
    COUNT(CASE WHEN ss.esop_reserved_shares > 0 THEN 1 END) as startups_with_esop_in_shares_table,
    COUNT(CASE WHEN s.price_per_share > 0 THEN 1 END) as startups_with_pps_in_startups_table,
    COUNT(CASE WHEN ss.price_per_share > 0 THEN 1 END) as startups_with_pps_in_shares_table
FROM startups s
LEFT JOIN startup_shares ss ON s.id = ss.startup_id;
