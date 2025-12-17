-- =====================================================
-- SAFE RESTORE RLS POLICIES (AVOIDS DEADLOCKS)
-- =====================================================
-- Use this version if you encounter deadlock errors
-- It processes tables one at a time with delays
-- =====================================================

-- IMPORTANT: 
-- 1. Close all other database connections/active queries
-- 2. Run during low-traffic period
-- 3. This script processes tables sequentially with small delays

DO $$
DECLARE
    backup_rec RECORD;
    restore_sql TEXT;
    latest_backup TIMESTAMP WITH TIME ZONE;
    table_name_var TEXT;
    policy_name_var TEXT;
    policy_count INTEGER;
BEGIN
    -- Get the latest backup timestamp
    SELECT MAX(backup_timestamp) INTO latest_backup
    FROM public.rls_policies_backup;
    
    IF latest_backup IS NULL THEN
        RAISE EXCEPTION 'No backup found. Please run BACKUP_RLS_POLICIES.sql first.';
    END IF;
    
    RAISE NOTICE 'Restoring policies from backup timestamp: %', latest_backup;
    RAISE NOTICE 'Processing tables one at a time to avoid deadlocks...';
    
    -- Process each table separately
    FOR table_name_var IN 
        SELECT DISTINCT tablename 
        FROM public.rls_policies_backup 
        WHERE backup_timestamp = latest_backup
        ORDER BY tablename
    LOOP
        RAISE NOTICE 'Processing table: %', table_name_var;
        
        -- Count policies for this table
        SELECT COUNT(*) INTO policy_count
        FROM public.rls_policies_backup 
        WHERE tablename = table_name_var 
        AND backup_timestamp = latest_backup;
        
        RAISE NOTICE '  Found % policies to restore', policy_count;
        
        -- Drop all existing policies for this table
        FOR policy_name_var IN
            SELECT DISTINCT policyname 
            FROM pg_policies
            WHERE tablename = table_name_var
            AND schemaname = 'public'
        LOOP
            BEGIN
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 
                    policy_name_var, table_name_var);
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING '  Could not drop policy %: %', policy_name_var, SQLERRM;
            END;
        END LOOP;
        
        -- Small delay to release locks
        PERFORM pg_sleep(0.1);
        
        -- Restore policies for this table
        FOR backup_rec IN 
            SELECT * FROM public.rls_policies_backup 
            WHERE tablename = table_name_var
            AND backup_timestamp = latest_backup
            ORDER BY policyname
        LOOP
            BEGIN
                restore_sql := format(
                    'CREATE POLICY %I ON public.%I FOR %s TO %s%s%s',
                    backup_rec.policyname,
                    backup_rec.tablename,
                    backup_rec.cmd,
                    array_to_string(backup_rec.roles, ', '),
                    CASE WHEN backup_rec.qual IS NOT NULL 
                        THEN format(' USING (%s)', backup_rec.qual) 
                        ELSE '' END,
                    CASE WHEN backup_rec.with_check IS NOT NULL 
                        THEN format(' WITH CHECK (%s)', backup_rec.with_check) 
                        ELSE '' END
                );
                
                EXECUTE restore_sql;
                RAISE NOTICE '  ✅ Restored: %', backup_rec.policyname;
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING '  ❌ Failed to restore %: %', 
                    backup_rec.policyname, SQLERRM;
            END;
        END LOOP;
        
        -- Small delay between tables
        PERFORM pg_sleep(0.1);
        
        RAISE NOTICE '  ✅ Completed table: %', table_name_var;
    END LOOP;
    
    RAISE NOTICE '✅ Restore complete for all tables';
END $$;

-- Show restore summary
SELECT 
    '✅ RESTORE COMPLETE' as status,
    COUNT(*) as policies_restored,
    COUNT(DISTINCT tablename) as tables_restored
FROM public.rls_policies_backup
WHERE backup_timestamp = (SELECT MAX(backup_timestamp) FROM public.rls_policies_backup);





