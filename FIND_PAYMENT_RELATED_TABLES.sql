-- =====================================================
-- FIND ALL PAYMENT-RELATED TABLES
-- =====================================================
-- Identifies all tables related to payments for deletion
-- You're rebuilding payment system, so these can be removed

-- =====================================================
-- 1. Find tables with "payment" in the name
-- =====================================================
SELECT 
    '=== PAYMENT-RELATED TABLES ===' as section,
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as table_size,
    (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = tablename) as row_count,
    (SELECT (n_tup_ins + n_tup_upd + n_tup_del) FROM pg_stat_user_tables WHERE relname = tablename) as total_operations,
    '⚠️ Payment table - candidate for deletion' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND (
      tablename ILIKE '%payment%'
      OR tablename ILIKE '%transaction%'
      OR tablename ILIKE '%subscription%'
      OR tablename ILIKE '%invoice%'
      OR tablename ILIKE '%billing%'
      OR tablename ILIKE '%charge%'
      OR tablename ILIKE '%fee%'
      OR tablename ILIKE '%commission%'
      OR tablename ILIKE '%payout%'
  )
ORDER BY pg_total_relation_size('public.'||tablename) DESC;

-- =====================================================
-- 2. Check dependencies for payment tables
-- =====================================================
SELECT 
    '=== PAYMENT TABLES DEPENDENCIES ===' as section,
    ccu.table_name as payment_table,
    tc.table_name as referencing_table,
    kcu.column_name as fk_column,
    tc.constraint_name as fk_name,
    CASE 
        WHEN tc.table_name ILIKE '%payment%' OR tc.table_name ILIKE '%transaction%' 
        THEN '✅ Referencing table is also payment-related'
        ELSE '⚠️ Non-payment table references payment table'
    END as dependency_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_schema = 'public'
  AND (
      ccu.table_name ILIKE '%payment%'
      OR ccu.table_name ILIKE '%transaction%'
      OR ccu.table_name ILIKE '%subscription%'
      OR ccu.table_name ILIKE '%invoice%'
      OR ccu.table_name ILIKE '%billing%'
      OR ccu.table_name ILIKE '%charge%'
      OR ccu.table_name ILIKE '%fee%'
      OR ccu.table_name ILIKE '%commission%'
      OR ccu.table_name ILIKE '%payout%'
  )
ORDER BY ccu.table_name, tc.table_name;

-- =====================================================
-- 3. Summary of payment tables
-- =====================================================
SELECT 
    '=== PAYMENT TABLES SUMMARY ===' as section,
    COUNT(*) as total_payment_tables,
    SUM((SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = tablename)) as total_rows,
    pg_size_pretty(SUM(pg_total_relation_size('public.'||tablename))) as total_size,
    'These tables will be deleted as you rebuild payment system' as note
FROM pg_tables
WHERE schemaname = 'public'
  AND (
      tablename ILIKE '%payment%'
      OR tablename ILIKE '%transaction%'
      OR tablename ILIKE '%subscription%'
      OR tablename ILIKE '%invoice%'
      OR tablename ILIKE '%billing%'
      OR tablename ILIKE '%charge%'
      OR tablename ILIKE '%fee%'
      OR tablename ILIKE '%commission%'
      OR tablename ILIKE '%payout%'
  );















