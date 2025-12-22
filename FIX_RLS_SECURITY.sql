-- =====================================================
-- FIX RLS SECURITY ISSUES
-- =====================================================
-- Step 1: Enable RLS on tables where it's disabled
-- Step 2: Shows which tables need policies

-- =====================================================
-- PART 1: Enable RLS on disabled tables
-- =====================================================
DO $$
DECLARE
    table_record RECORD;
    enabled_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Step 1: Enabling RLS on tables...';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    FOR table_record IN 
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND NOT rowsecurity  -- RLS disabled
          AND tablename NOT LIKE 'pg_%'
          AND tablename NOT LIKE '_pg_%'
        ORDER BY tablename
    LOOP
        BEGIN
            EXECUTE 'ALTER TABLE public.' || quote_ident(table_record.tablename) || ' ENABLE ROW LEVEL SECURITY';
            enabled_count := enabled_count + 1;
            RAISE NOTICE '✅ Enabled RLS on: %', table_record.tablename;
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                RAISE NOTICE '⚠️  Error enabling RLS on %: %', table_record.tablename, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'RLS enabled on % tables', enabled_count;
    IF error_count > 0 THEN
        RAISE NOTICE 'Errors: %', error_count;
    END IF;
    RAISE NOTICE '';
END $$;

-- =====================================================
-- PART 2: List tables that still need policies
-- =====================================================
SELECT 
    '=== TABLES NEEDING RLS POLICIES ===' as section,
    t.tablename,
    (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = t.tablename) as row_count,
    '⚠️ RLS is enabled but no policies exist - Access will be denied!' as warning,
    'You need to create RLS policies for this table' as action_needed
FROM pg_tables t
LEFT JOIN (
    SELECT DISTINCT c.relname
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
) policies ON policies.relname = t.tablename
WHERE t.schemaname = 'public'
  AND t.rowsecurity  -- RLS enabled
  AND policies.relname IS NULL  -- But no policies
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE '_pg_%'
ORDER BY t.tablename;

-- =====================================================
-- PART 3: Verification
-- =====================================================
SELECT 
    '=== VERIFICATION ===' as section,
    (SELECT COUNT(*) FROM pg_tables 
     WHERE schemaname = 'public' 
       AND NOT rowsecurity 
       AND tablename NOT LIKE 'pg_%' 
       AND tablename NOT LIKE '_pg_%') as tables_with_rls_disabled,
    (SELECT COUNT(*) 
     FROM pg_tables t
     LEFT JOIN (
         SELECT DISTINCT c.relname
         FROM pg_policy p
         JOIN pg_class c ON p.polrelid = c.oid
         JOIN pg_namespace n ON c.relnamespace = n.oid
         WHERE n.nspname = 'public'
     ) policies ON policies.relname = t.tablename
     WHERE t.schemaname = 'public'
       AND t.rowsecurity
       AND policies.relname IS NULL
       AND t.tablename NOT LIKE 'pg_%'
       AND t.tablename NOT LIKE '_pg_%') as tables_needing_policies,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_tables 
              WHERE schemaname = 'public' 
                AND NOT rowsecurity 
                AND tablename NOT LIKE 'pg_%' 
                AND tablename NOT LIKE '_pg_%') = 0
             AND (SELECT COUNT(*) 
                  FROM pg_tables t
                  LEFT JOIN (
                      SELECT DISTINCT c.relname
                      FROM pg_policy p
                      JOIN pg_class c ON p.polrelid = c.oid
                      JOIN pg_namespace n ON c.relnamespace = n.oid
                      WHERE n.nspname = 'public'
                  ) policies ON policies.relname = t.tablename
                  WHERE t.schemaname = 'public'
                    AND t.rowsecurity
                    AND policies.relname IS NULL
                    AND t.tablename NOT LIKE 'pg_%'
                    AND t.tablename NOT LIKE '_pg_%') = 0
        THEN '✅ All tables have RLS enabled and policies configured!'
        ELSE '⚠️ Some tables still need RLS configuration'
    END as final_status;







