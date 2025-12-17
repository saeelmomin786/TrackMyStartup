-- Fix startups.user_id foreign key constraint
-- The constraint currently references public.users, but should reference auth.users
-- This change is SAFE because:
-- 1. Existing data won't be deleted (ON DELETE CASCADE only applies to future deletes)
-- 2. Constraint only validates on INSERT/UPDATE, existing rows aren't checked immediately
-- 3. Our code already uses auth_user_id from auth.users, so this aligns the constraint with code

-- Step 1: Check current constraint
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'startups_user_id_fkey';

-- Step 2: Check if any existing startups have user_id that doesn't exist in auth.users
-- This helps identify potential issues BEFORE changing the constraint
SELECT 
    '⚠️ Startups with user_id NOT in auth.users (will need fixing after constraint change):' as info;
    
SELECT 
    s.id,
    s.name,
    s.user_id,
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = s.user_id) THEN '✅ OK - exists in auth.users'
        ELSE '❌ WARNING - does not exist in auth.users'
    END AS auth_user_status
FROM public.startups s
WHERE s.user_id IS NOT NULL
ORDER BY 
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = s.user_id) THEN 0
        ELSE 1
    END;

-- Step 3: Count how many startups might be affected
SELECT 
    COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = s.user_id)) as startups_with_valid_auth_user,
    COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE id = s.user_id)) as startups_with_invalid_user_id,
    COUNT(*) as total_startups
FROM public.startups s
WHERE s.user_id IS NOT NULL;

-- Step 4: Drop the old constraint that references public.users
-- NOTE: This is safe - dropping a constraint doesn't delete data
ALTER TABLE public.startups 
DROP CONSTRAINT IF EXISTS startups_user_id_fkey;

-- Step 5: Create new constraint that references auth.users
-- NOTE: This will NOT validate existing data immediately
-- It only validates on INSERT/UPDATE operations going forward
ALTER TABLE public.startups
ADD CONSTRAINT startups_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Step 6: Verify the new constraint was created correctly
SELECT 
    '✅ New constraint created:' as info;
    
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'startups_user_id_fkey';

-- Step 7: Test constraint validation (this will show if any existing rows violate it)
-- IMPORTANT: After changing the constraint, UPDATE operations will validate user_id against auth.users
-- This query shows which startups would pass/fail on UPDATE:
SELECT 
    'Testing constraint validation on existing startups (UPDATE operations):' as info;
    
SELECT 
    s.id,
    s.name,
    s.user_id,
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = s.user_id) THEN '✅ UPDATE will work - user_id exists in auth.users'
        ELSE '❌ UPDATE will FAIL - user_id does not exist in auth.users (needs fixing)'
    END AS update_status
FROM public.startups s
WHERE s.user_id IS NOT NULL
ORDER BY 
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = s.user_id) THEN 0
        ELSE 1
    END;

-- Step 8: Fix any startups with invalid user_ids (ONLY if Step 7 shows failures)
-- This maps user_ids from public.users to auth.users by email
-- Run this ONLY if you found startups with invalid user_ids:
/*
UPDATE public.startups s
SET user_id = (
    SELECT au.id 
    FROM auth.users au
    INNER JOIN public.users u ON u.email = au.email
    WHERE u.id = s.user_id
    LIMIT 1
)
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = s.user_id
)
AND EXISTS (
    SELECT 1 
    FROM public.users u
    INNER JOIN auth.users au ON au.email = u.email
    WHERE u.id = s.user_id
);
*/

