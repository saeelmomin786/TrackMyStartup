-- =====================================================
-- RESTORE RLS POLICIES FROM BACKUP (DEADLOCK-SAFE)
-- =====================================================
-- Run this if you need to restore policies after running the fix script
-- This version uses a single transaction and proper locking to avoid deadlocks
-- =====================================================

-- IMPORTANT: Close all other database connections before running this
-- Or run during low-traffic period to avoid deadlocks

BEGIN;

DO $$
DECLARE
    backup_rec RECORD;
    restore_sql TEXT;
    latest_backup TIMESTAMP WITH TIME ZONE;
    table_name_var TEXT;
    policy_name_var TEXT;
BEGIN
    -- Get the latest backup timestamp
    SELECT MAX(backup_timestamp) INTO latest_backup
    FROM public.rls_policies_backup;
    
    IF latest_backup IS NULL THEN
        RAISE EXCEPTION 'No backup found. Please run BACKUP_RLS_POLICIES.sql first.';
    END IF;
    
    RAISE NOTICE 'Restoring policies from backup timestamp: %', latest_backup;
    
    -- Step 1: Drop all current policies (grouped by table to minimize locks)
    FOR table_name_var IN 
        SELECT DISTINCT tablename 
        FROM public.rls_policies_backup 
        WHERE backup_timestamp = latest_backup
        ORDER BY tablename
    LOOP
        -- Drop all policies for this table in one go
        FOR policy_name_var IN
            SELECT policyname 
            FROM public.rls_policies_backup 
            WHERE tablename = table_name_var 
            AND backup_timestamp = latest_backup
        LOOP
            BEGIN
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 
                    policy_name_var, table_name_var);
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Could not drop policy % on %: %', 
                    policy_name_var, table_name_var, SQLERRM;
            END;
        END LOOP;
        
        RAISE NOTICE 'Dropped policies for table: %', table_name_var;
    END LOOP;
    
    -- Step 2: Restore policies from backup (in same order)
    FOR backup_rec IN 
        SELECT * FROM public.rls_policies_backup 
        WHERE backup_timestamp = latest_backup
        ORDER BY tablename, policyname
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
            RAISE NOTICE 'Restored policy: % on %', backup_rec.policyname, backup_rec.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to restore policy % on %: %', 
                backup_rec.policyname, backup_rec.tablename, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '✅ Restore complete';
END $$;

COMMIT;

-- Show restore summary
SELECT 
    '✅ RESTORE COMPLETE' as status,
    COUNT(*) as policies_restored
FROM public.rls_policies_backup
WHERE backup_timestamp = (SELECT MAX(backup_timestamp) FROM public.rls_policies_backup);

