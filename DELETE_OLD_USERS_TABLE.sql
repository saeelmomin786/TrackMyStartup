-- =====================================================
-- DELETE OLD users TABLE
-- =====================================================
-- ⚠️ This table has been fully migrated to user_profiles
-- ⚠️ All dependencies have been verified as removed
-- ⚠️ BACKUP BEFORE DELETING!

-- =====================================================
-- STEP 1: Verify table exists and check row count
-- =====================================================
SELECT 
    '=== VERIFICATION ===' as step,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
        THEN '✅ users table exists'
        ELSE '❌ users table does not exist'
    END as status,
    (SELECT COUNT(*)::text FROM public.users) as row_count;

-- =====================================================
-- STEP 2: Create backup (REQUIRED!)
-- =====================================================
-- Uncomment to create backup:

/*
CREATE TABLE IF NOT EXISTS users_backup AS 
SELECT * FROM public.users;

-- Verify backup
SELECT 
    'Backup created' as status,
    COUNT(*) as backup_row_count
FROM users_backup;

SELECT 
    'Original table' as status,
    COUNT(*) as original_row_count
FROM public.users;

-- Both counts should match!
*/

-- =====================================================
-- STEP 3: Drop the table (ONLY AFTER BACKUP VERIFIED!)
-- =====================================================
-- ⚠️ Uncomment ONLY after backup is verified in Step 2

/*
DROP TABLE IF EXISTS public.users CASCADE;
*/

-- =====================================================
-- STEP 4: Verify deletion
-- =====================================================
-- Run after Step 3:
/*
SELECT 
    '=== DELETION VERIFICATION ===' as step,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
        THEN '❌ Table still exists - deletion failed'
        ELSE '✅ Table deleted successfully'
    END as status;
*/















