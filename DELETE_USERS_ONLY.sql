-- =====================================================
-- SIMPLE USER DELETION - NO UPDATES, NO FUNCTION CHANGES
-- =====================================================
-- This script ONLY deletes the specified users and their data
-- It does NOT update any functions, triggers, or existing logic
-- Target users:
-- - siddhisolapurkar20@gmail.com
-- - siddhi.solapurkar22@pccoepune.org  
-- - solapurkarsiddhi@gmail.com

-- =====================================================
-- METHOD 1: SIMPLE CASCADE DELETION (RECOMMENDED)
-- =====================================================

-- Delete from auth.users - this will cascade to all related tables
DELETE FROM auth.users 
WHERE email IN (
    'siddhisolapurkar20@gmail.com',
    'siddhi.solapurkar22@pccoepune.org',
    'solapurkarsiddhi@gmail.com'
);

-- =====================================================
-- METHOD 2: MANUAL DELETION (IF METHOD 1 FAILS)
-- =====================================================

-- Uncomment this section ONLY if the above doesn't work
-- Delete in reverse dependency order to avoid foreign key errors

/*
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
-- VERIFICATION (OPTIONAL)
-- =====================================================

-- Check if users are deleted (uncomment to verify)
/*
SELECT 
    'Users deleted:' as check_type,
    COUNT(*) as remaining_count
FROM auth.users 
WHERE email IN (
    'siddhisolapurkar20@gmail.com',
    'siddhi.solapurkar22@pccoepune.org',
    'solapurkarsiddhi@gmail.com'
);
*/






