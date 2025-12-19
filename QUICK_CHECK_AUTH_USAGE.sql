-- Quick check: Are all tables using auth.users?
-- Run this first to get a quick overview

-- 1. Check startups table constraint
SELECT 
    'startups.user_id' AS check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            JOIN pg_namespace n ON t.relnamespace = n.oid
            JOIN pg_class ft ON c.confrelid = ft.oid
            JOIN pg_namespace fn ON ft.relnamespace = fn.oid
            WHERE n.nspname = 'public'
            AND t.relname = 'startups'
            AND c.contype = 'f'
            AND fn.nspname = 'auth'
            AND ft.relname = 'users'
            AND (
                SELECT attname FROM pg_attribute 
                WHERE attrelid = c.conrelid 
                AND attnum = ANY(c.conkey) 
                LIMIT 1
            ) = 'user_id'
        ) THEN '✅ Uses auth.users'
        WHEN EXISTS (
            SELECT 1 
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            JOIN pg_namespace n ON t.relnamespace = n.oid
            JOIN pg_class ft ON c.confrelid = ft.oid
            JOIN pg_namespace fn ON ft.relnamespace = fn.oid
            WHERE n.nspname = 'public'
            AND t.relname = 'startups'
            AND c.contype = 'f'
            AND fn.nspname = 'public'
            AND ft.relname = 'users'
        ) THEN '❌ Uses public.users (NEEDS FIX)'
        ELSE '⚠️ No constraint found'
    END AS status;

-- 2. Check user_profiles table constraint
SELECT 
    'user_profiles.auth_user_id' AS check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            JOIN pg_namespace n ON t.relnamespace = n.oid
            JOIN pg_class ft ON c.confrelid = ft.oid
            JOIN pg_namespace fn ON ft.relnamespace = fn.oid
            WHERE n.nspname = 'public'
            AND t.relname = 'user_profiles'
            AND c.contype = 'f'
            AND fn.nspname = 'auth'
            AND ft.relname = 'users'
        ) THEN '✅ Uses auth.users'
        ELSE '⚠️ Check needed'
    END AS status;

-- 3. List ALL tables with foreign keys to users tables
SELECT 
    n.nspname || '.' || t.relname AS table_name,
    a.attname AS column_name,
    fn.nspname || '.' || ft.relname AS references_table,
    CASE 
        WHEN fn.nspname = 'auth' AND ft.relname = 'users' THEN '✅ auth.users'
        WHEN fn.nspname = 'public' AND ft.relname = 'users' THEN '❌ public.users'
        ELSE '⚠️ Other'
    END AS status
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
JOIN pg_class ft ON c.confrelid = ft.oid
JOIN pg_namespace fn ON ft.relnamespace = fn.oid
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
WHERE c.contype = 'f'
    AND (a.attname LIKE '%user%id%' OR ft.relname = 'users')
    AND n.nspname = 'public'
ORDER BY 
    CASE 
        WHEN fn.nspname = 'auth' AND ft.relname = 'users' THEN 1
        WHEN fn.nspname = 'public' AND ft.relname = 'users' THEN 2
        ELSE 3
    END,
    t.relname;









