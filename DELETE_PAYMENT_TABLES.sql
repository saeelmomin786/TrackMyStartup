-- =====================================================
-- DELETE ALL PAYMENT-RELATED TABLES
-- =====================================================
-- ⚠️ WARNING: You're rebuilding payment system
-- ⚠️ This will delete all payment-related tables
-- ⚠️ Run FIND_PAYMENT_RELATED_TABLES.sql first to review!

-- =====================================================
-- Step 1: List all payment tables that will be deleted
-- =====================================================
SELECT 
    '=== PAYMENT TABLES TO BE DELETED ===' as section,
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as table_size,
    (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = tablename) as row_count,
    'DROP TABLE IF EXISTS public.' || quote_ident(tablename) || ' CASCADE;' as drop_statement
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

-- =====================================================
-- Step 2: Delete all payment-related tables
-- =====================================================
DO $$
DECLARE
    table_record RECORD;
    deleted_count INTEGER := 0;
    error_count INTEGER := 0;
    total_size BIGINT := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting deletion of payment-related tables...';
    RAISE NOTICE 'You are rebuilding payment system';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    FOR table_record IN 
        SELECT 
            tablename,
            pg_total_relation_size('public.'||tablename) as table_size,
            (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = tablename) as row_count
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
        ORDER BY tablename
    LOOP
        BEGIN
            EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(table_record.tablename) || ' CASCADE';
            deleted_count := deleted_count + 1;
            total_size := total_size + table_record.table_size;
            RAISE NOTICE '✅ Deleted: % (rows: %, size: ~%)', 
                table_record.tablename, 
                table_record.row_count,
                pg_size_pretty(table_record.table_size);
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                RAISE NOTICE '⚠️  Error deleting %: %', table_record.tablename, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ PAYMENT TABLES DELETION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Payment tables deleted: %', deleted_count;
    RAISE NOTICE 'Errors: %', error_count;
    RAISE NOTICE 'Estimated space freed: ~%', pg_size_pretty(total_size);
    RAISE NOTICE '';
    RAISE NOTICE 'You can now rebuild your payment system!';
    RAISE NOTICE '';
END $$;

-- =====================================================
-- Step 3: Verification
-- =====================================================
SELECT 
    '=== VERIFICATION ===' as section,
    COUNT(*) as remaining_payment_tables,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All payment tables deleted!'
        ELSE '⚠️ ' || COUNT(*) || ' payment tables remain'
    END as status
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









