-- =====================================================
-- SAFE DELETION OF SPECIFIC STARTUP USERS
-- =====================================================
-- This script safely deletes the specified startup users and all their related data
-- without affecting other users or constraints
-- 
-- Users to delete:
-- - siddhisolapurkar20@gmail.com
-- - siddhi.solapurkar22@pccoepune.org  
-- - solapurkarsiddhi@gmail.com

-- =====================================================
-- STEP 1: IDENTIFY USERS TO DELETE
-- =====================================================

-- First, let's identify the user IDs for the emails
WITH users_to_delete AS (
    SELECT id, email, name
    FROM auth.users 
    WHERE email IN (
        'siddhisolapurkar20@gmail.com',
        'siddhi.solapurkar22@pccoepune.org',
        'solapurkarsiddhi@gmail.com'
    )
),
startup_ids AS (
    SELECT s.id as startup_id, u.email
    FROM public.startups s
    JOIN public.users u ON s.id = u.startup_id
    WHERE u.email IN (
        'siddhisolapurkar20@gmail.com',
        'siddhi.solapurkar22@pccoepune.org',
        'solapurkarsiddhi@gmail.com'
    )
)

-- =====================================================
-- STEP 2: DELETE IN REVERSE ORDER OF DEPENDENCIES
-- =====================================================

-- Delete from most dependent tables first
-- (This ensures foreign key constraints are satisfied)

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

-- 8. Delete from public.users table
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

-- 10. Finally, delete from auth.users (this will cascade to public.users)
DELETE FROM auth.users 
WHERE email IN (
    'siddhisolapurkar20@gmail.com',
    'siddhi.solapurkar22@pccoepune.org',
    'solapurkarsiddhi@gmail.com'
);

-- =====================================================
-- STEP 3: VERIFICATION
-- =====================================================

-- Verify that the users have been completely deleted
SELECT 
    'Verification Results' as check_type,
    COUNT(*) as remaining_users
FROM auth.users 
WHERE email IN (
    'siddhisolapurkar20@gmail.com',
    'siddhi.solapurkar22@pccoepune.org',
    'solapurkarsiddhi@gmail.com'
);

-- Check for any orphaned records
SELECT 
    'Orphaned Records Check' as check_type,
    'financial_records' as table_name,
    COUNT(*) as orphaned_count
FROM public.financial_records fr
LEFT JOIN public.startups s ON fr.startup_id = s.id
WHERE s.id IS NULL

UNION ALL

SELECT 
    'Orphaned Records Check' as check_type,
    'investment_records' as table_name,
    COUNT(*) as orphaned_count
FROM public.investment_records ir
LEFT JOIN public.startups s ON ir.startup_id = s.id
WHERE s.id IS NULL

UNION ALL

SELECT 
    'Orphaned Records Check' as check_type,
    'employees' as table_name,
    COUNT(*) as orphaned_count
FROM public.employees e
LEFT JOIN public.startups s ON e.startup_id = s.id
WHERE s.id IS NULL;

-- =====================================================
-- ALTERNATIVE: IF YOU WANT TO DELETE ONLY SPECIFIC STARTUP DATA
-- =====================================================
-- Uncomment this section if you want to delete only startup-related data
-- but keep the user accounts

/*
-- Alternative approach: Delete only startup data, keep user accounts
WITH target_startups AS (
    SELECT s.id as startup_id
    FROM public.startups s
    JOIN public.users u ON s.id = u.startup_id
    WHERE u.email IN (
        'siddhisolapurkar20@gmail.com',
        'siddhi.solapurkar22@pccoepune.org',
        'solapurkarsiddhi@gmail.com'
    )
)

-- Delete startup-related data only
DELETE FROM public.financial_records 
WHERE startup_id IN (SELECT startup_id FROM target_startups);

DELETE FROM public.investment_records 
WHERE startup_id IN (SELECT startup_id FROM target_startups);

DELETE FROM public.employees 
WHERE startup_id IN (SELECT startup_id FROM target_startups);

DELETE FROM public.subsidiaries 
WHERE startup_id IN (SELECT startup_id FROM target_startups);

DELETE FROM public.international_ops 
WHERE startup_id IN (SELECT startup_id FROM target_startups);

DELETE FROM public.founders 
WHERE startup_id IN (SELECT startup_id FROM target_startups);

DELETE FROM public.startups 
WHERE id IN (SELECT startup_id FROM target_startups);

-- Update user role to remove startup association
UPDATE public.users 
SET role = 'Investor' 
WHERE email IN (
    'siddhisolapurkar20@gmail.com',
    'siddhi.solapurkar22@pccoepune.org',
    'solapurkarsiddhi@gmail.com'
);
*/






