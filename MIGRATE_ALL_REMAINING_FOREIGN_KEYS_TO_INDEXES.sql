-- =====================================================
-- MIGRATE ALL REMAINING FOREIGN KEYS TO INDEXES
-- =====================================================
-- Since user_profiles.auth_user_id is not unique, we cannot use FKs
-- Instead, we'll drop all FKs referencing users table and create indexes
-- 
-- IMPORTANT: Run GET_ALL_FK_DETAILS.sql first to see what will be migrated
-- This script is idempotent - safe to run multiple times

DO $$
DECLARE
    fk_record RECORD;
    index_name TEXT;
    fk_count INTEGER := 0;
    index_count INTEGER := 0;
BEGIN
    -- Loop through all foreign keys that reference users table
    FOR fk_record IN 
        SELECT 
            tc.table_name,
            tc.constraint_name,
            kcu.column_name as referencing_column,
            ccu.column_name as referenced_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
            AND tc.table_name = kcu.table_name
        JOIN information_schema.constraint_column_usage ccu 
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND ccu.table_name = 'users'
        ORDER BY tc.table_name, tc.constraint_name
    LOOP
        -- Generate index name
        index_name := 'idx_' || fk_record.table_name || '_' || fk_record.referencing_column;
        
        -- Drop the foreign key constraint
        BEGIN
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', 
                fk_record.table_name, 
                fk_record.constraint_name);
            fk_count := fk_count + 1;
            RAISE NOTICE '✅ Dropped FK: %.%', fk_record.table_name, fk_record.constraint_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️  Could not drop FK %.%: %', fk_record.table_name, fk_record.constraint_name, SQLERRM;
        END;
        
        -- Create index if it doesn't exist
        BEGIN
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)', 
                index_name,
                fk_record.table_name,
                fk_record.referencing_column);
            index_count := index_count + 1;
            RAISE NOTICE '✅ Created index: %', index_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️  Could not create index %: %', index_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== MIGRATION SUMMARY ===';
    RAISE NOTICE 'Foreign keys dropped: %', fk_count;
    RAISE NOTICE 'Indexes created: %', index_count;
    RAISE NOTICE '✅ Migration complete!';
END $$;

-- Verify migration
SELECT 
    '=== VERIFICATION ===' as status,
    (SELECT COUNT(*) FROM information_schema.table_constraints tc
     JOIN information_schema.constraint_column_usage ccu 
         ON ccu.constraint_name = tc.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema = 'public'
       AND ccu.table_name = 'users') as remaining_fks,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.table_constraints tc
              JOIN information_schema.constraint_column_usage ccu 
                  ON ccu.constraint_name = tc.constraint_name
              WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = 'public'
                AND ccu.table_name = 'users') = 0 
        THEN '✅ ALL FOREIGN KEYS MIGRATED TO INDEXES'
        ELSE '❌ SOME FOREIGN KEYS STILL EXIST'
    END as final_status;











