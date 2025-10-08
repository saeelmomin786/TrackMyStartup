-- =====================================================
-- SAFE DELETION OF SPECIFIC STARTUP USERS
-- =====================================================
-- This script safely deletes the specified startup users and all their related data
-- while handling foreign key constraints properly
-- 
-- Target users:
-- - siddhisolapurkar20@gmail.com
-- - siddhi.solapurkar22@pccoepune.org  
-- - solapurkarsiddhi@gmail.com

-- =====================================================
-- STEP 1: CREATE TEMPORARY TABLES FOR SAFE DELETION
-- =====================================================

-- Create temporary table to store startup IDs to delete
CREATE TEMP TABLE temp_startup_ids AS
SELECT DISTINCT s.id as startup_id
FROM public.startups s
JOIN public.users u ON s.id = u.startup_id
WHERE u.email IN (
    'siddhisolapurkar20@gmail.com',
    'siddhi.solapurkar22@pccoepune.org',
    'solapurkarsiddhi@gmail.com'
);

-- Create temporary table to store user IDs to delete
CREATE TEMP TABLE temp_user_ids AS
SELECT id as user_id, email
FROM auth.users 
WHERE email IN (
    'siddhisolapurkar20@gmail.com',
    'siddhi.solapurkar22@pccoepune.org',
    'solapurkarsiddhi@gmail.com'
);

-- =====================================================
-- STEP 2: SHOW WHAT WILL BE DELETED (DRY RUN)
-- =====================================================

SELECT 'DRY RUN - Records to be deleted:' as info;

-- Show startups to be deleted
SELECT 
    'Startups to delete:' as type,
    s.id,
    s.name,
    u.email
FROM public.startups s
JOIN public.users u ON s.id = u.startup_id
WHERE u.email IN (
    'siddhisolapurkar20@gmail.com',
    'siddhi.solapurkar22@pccoepune.org',
    'solapurkarsiddhi@gmail.com'
);

-- Show related records counts
SELECT 
    'Financial Records:' as table_name,
    COUNT(*) as count
FROM public.financial_records fr
JOIN temp_startup_ids t ON fr.startup_id = t.startup_id

UNION ALL

SELECT 
    'Investment Records:' as table_name,
    COUNT(*) as count
FROM public.investment_records ir
JOIN temp_startup_ids t ON ir.startup_id = t.startup_id

UNION ALL

SELECT 
    'Employees:' as table_name,
    COUNT(*) as count
FROM public.employees e
JOIN temp_startup_ids t ON e.startup_id = t.startup_id

UNION ALL

SELECT 
    'Subsidiaries:' as table_name,
    COUNT(*) as count
FROM public.subsidiaries sub
JOIN temp_startup_ids t ON sub.startup_id = t.startup_id

UNION ALL

SELECT 
    'International Ops:' as table_name,
    COUNT(*) as count
FROM public.international_ops io
JOIN temp_startup_ids t ON io.startup_id = t.startup_id

UNION ALL

SELECT 
    'Founders:' as table_name,
    COUNT(*) as count
FROM public.founders f
JOIN temp_startup_ids t ON f.startup_id = t.startup_id;

-- =====================================================
-- STEP 3: ACTUAL DELETION (COMMENT OUT IF YOU WANT DRY RUN ONLY)
-- =====================================================

-- Uncomment the following section to perform actual deletion
-- Make sure to backup your database first!

/*
-- Delete in order of dependencies (most dependent first)

-- 1. Delete financial records
DELETE FROM public.financial_records 
WHERE startup_id IN (SELECT startup_id FROM temp_startup_ids);

-- 2. Delete investment records  
DELETE FROM public.investment_records 
WHERE startup_id IN (SELECT startup_id FROM temp_startup_ids);

-- 3. Delete employees
DELETE FROM public.employees 
WHERE startup_id IN (SELECT startup_id FROM temp_startup_ids);

-- 4. Delete subsidiaries
DELETE FROM public.subsidiaries 
WHERE startup_id IN (SELECT startup_id FROM temp_startup_ids);

-- 5. Delete international operations
DELETE FROM public.international_ops 
WHERE startup_id IN (SELECT startup_id FROM temp_startup_ids);

-- 6. Delete founders
DELETE FROM public.founders 
WHERE startup_id IN (SELECT startup_id FROM temp_startup_ids);

-- 7. Delete user subscriptions
DELETE FROM public.user_subscriptions 
WHERE user_id IN (SELECT user_id FROM temp_user_ids);

-- 8. Delete from public.users (this will cascade due to foreign key)
DELETE FROM public.users 
WHERE id IN (SELECT user_id FROM temp_user_ids);

-- 9. Delete startups
DELETE FROM public.startups 
WHERE id IN (SELECT startup_id FROM temp_startup_ids);

-- 10. Finally delete from auth.users (this will cascade to public.users)
DELETE FROM auth.users 
WHERE id IN (SELECT user_id FROM temp_user_ids);
*/

-- =====================================================
-- STEP 4: VERIFICATION AFTER DELETION
-- =====================================================

-- Uncomment after running the deletion
/*
-- Verify users are deleted
SELECT 
    'Users deleted:' as check_type,
    COUNT(*) as remaining_count
FROM auth.users 
WHERE email IN (
    'siddhisolapurkar20@gmail.com',
    'siddhi.solapurkar22@pccoepune.org',
    'solapurkarsiddhi@gmail.com'
);

-- Verify startups are deleted
SELECT 
    'Startups deleted:' as check_type,
    COUNT(*) as remaining_count
FROM public.startups s
JOIN public.users u ON s.id = u.startup_id
WHERE u.email IN (
    'siddhisolapurkar20@gmail.com',
    'siddhi.solapurkar22@pccoepune.org',
    'solapurkarsiddhi@gmail.com'
);

-- Check for any orphaned records
SELECT 
    'Orphaned financial records:' as check_type,
    COUNT(*) as orphaned_count
FROM public.financial_records fr
LEFT JOIN public.startups s ON fr.startup_id = s.id
WHERE s.id IS NULL;
*/

-- =====================================================
-- CLEANUP TEMPORARY TABLES
-- =====================================================

DROP TABLE IF EXISTS temp_startup_ids;
DROP TABLE IF EXISTS temp_user_ids;






