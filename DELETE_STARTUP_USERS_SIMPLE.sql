-- =====================================================
-- SIMPLE DELETION OF SPECIFIC STARTUP USERS
-- =====================================================
-- This script deletes the specified startup users and all their data
-- Target users:
-- - siddhisolapurkar20@gmail.com
-- - siddhi.solapurkar22@pccoepune.org  
-- - solapurkarsiddhi@gmail.com

-- =====================================================
-- METHOD 1: DELETE BY EMAIL (RECOMMENDED)
-- =====================================================

-- This approach deletes from auth.users first, which will cascade
-- to all related tables due to foreign key constraints

-- Step 1: Delete from auth.users (this will cascade to public.users and all related tables)
DELETE FROM auth.users 
WHERE email IN (
    'siddhisolapurkar20@gmail.com',
    'siddhi.solapurkar22@pccoepune.org',
    'solapurkarsiddhi@gmail.com'
);

-- =====================================================
-- METHOD 2: MANUAL CASCADE DELETION (IF METHOD 1 DOESN'T WORK)
-- =====================================================

-- Uncomment this section if the above doesn't work due to constraint issues

/*
-- Delete in reverse dependency order

-- 1. Delete financial records
DELETE FROM public.financial_records 
WHERE startup_id IN (
    SELECT s.id 
    FROM public.startups s
    JOIN public.users u ON s.id = u.startup_id
    WHERE u.email IN (
        'siddhisolapurkar20@gmail.com',
        'siddhi.solapurkar22@pccoepune.org',
        'solapurkarsiddhi@gmail.com'
    )
);

-- 2. Delete investment records
DELETE FROM public.investment_records 
WHERE startup_id IN (
    SELECT s.id 
    FROM public.startups s
    JOIN public.users u ON s.id = u.startup_id
    WHERE u.email IN (
        'siddhisolapurkar20@gmail.com',
        'siddhi.solapurkar22@pccoepune.org',
        'solapurkarsiddhi@gmail.com'
    )
);

-- 3. Delete employees
DELETE FROM public.employees 
WHERE startup_id IN (
    SELECT s.id 
    FROM public.startups s
    JOIN public.users u ON s.id = u.startup_id
    WHERE u.email IN (
        'siddhisolapurkar20@gmail.com',
        'siddhi.solapurkar22@pccoepune.org',
        'solapurkarsiddhi@gmail.com'
    )
);

-- 4. Delete subsidiaries
DELETE FROM public.subsidiaries 
WHERE startup_id IN (
    SELECT s.id 
    FROM public.startups s
    JOIN public.users u ON s.id = u.startup_id
    WHERE u.email IN (
        'siddhisolapurkar20@gmail.com',
        'siddhi.solapurkar22@pccoepune.org',
        'solapurkarsiddhi@gmail.com'
    )
);

-- 5. Delete international operations
DELETE FROM public.international_ops 
WHERE startup_id IN (
    SELECT s.id 
    FROM public.startups s
    JOIN public.users u ON s.id = u.startup_id
    WHERE u.email IN (
        'siddhisolapurkar20@gmail.com',
        'siddhi.solapurkar22@pccoepune.org',
        'solapurkarsiddhi@gmail.com'
    )
);

-- 6. Delete founders
DELETE FROM public.founders 
WHERE startup_id IN (
    SELECT s.id 
    FROM public.startups s
    JOIN public.users u ON s.id = u.startup_id
    WHERE u.email IN (
        'siddhisolapurkar20@gmail.com',
        'siddhi.solapurkar22@pccoepune.org',
        'solapurkarsiddhi@gmail.com'
    )
);

-- 7. Delete user subscriptions
DELETE FROM public.user_subscriptions 
WHERE user_id IN (
    SELECT id 
    FROM auth.users 
    WHERE email IN (
        'siddhisolapurkar20@gmail.com',
        'siddhi.solapurkar22@pccoepune.org',
        'solapurkarsiddhi@gmail.com'
    )
);

-- 8. Delete from public.users
DELETE FROM public.users 
WHERE email IN (
    'siddhisolapurkar20@gmail.com',
    'siddhi.solapurkar22@pccoepune.org',
    'solapurkarsiddhi@gmail.com'
);

-- 9. Delete startups
DELETE FROM public.startups 
WHERE id IN (
    SELECT s.id 
    FROM public.startups s
    JOIN public.users u ON s.id = u.startup_id
    WHERE u.email IN (
        'siddhisolapurkar20@gmail.com',
        'siddhi.solapurkar22@pccoepune.org',
        'solapurkarsiddhi@gmail.com'
    )
);

-- 10. Finally delete from auth.users
DELETE FROM auth.users 
WHERE email IN (
    'siddhisolapurkar20@gmail.com',
    'siddhi.solapurkar22@pccoepune.org',
    'solapurkarsiddhi@gmail.com'
);
*/

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if users are deleted
SELECT 
    'Verification - Remaining users:' as check_type,
    COUNT(*) as count
FROM auth.users 
WHERE email IN (
    'siddhisolapurkar20@gmail.com',
    'siddhi.solapurkar22@pccoepune.org',
    'solapurkarsiddhi@gmail.com'
);

-- Check if startups are deleted
SELECT 
    'Verification - Remaining startups:' as check_type,
    COUNT(*) as count
FROM public.startups s
JOIN public.users u ON s.id = u.startup_id
WHERE u.email IN (
    'siddhisolapurkar20@gmail.com',
    'siddhi.solapurkar22@pccoepune.org',
    'solapurkarsiddhi@gmail.com'
);

-- Check for orphaned records
SELECT 
    'Verification - Orphaned financial records:' as check_type,
    COUNT(*) as count
FROM public.financial_records fr
LEFT JOIN public.startups s ON fr.startup_id = s.id
WHERE s.id IS NULL;






