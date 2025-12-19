-- =====================================================
-- LIST THE 3 PAYMENT-RELATED TABLES
-- =====================================================
-- Shows exactly which payment tables will be deleted

SELECT 
    '=== THE 3 PAYMENT TABLES ===' as section,
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as table_size,
    (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = tablename) as row_count,
    (SELECT (n_tup_ins + n_tup_upd + n_tup_del) FROM pg_stat_user_tables WHERE relname = tablename) as total_operations,
    '⚠️ Will be deleted - you are rebuilding payment system' as status
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
ORDER BY tablename;


