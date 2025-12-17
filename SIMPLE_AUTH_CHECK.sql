-- =====================================================
-- SIMPLE CHECK: Are all tables using auth.users?
-- =====================================================
-- Run this single query to see which tables use auth.users vs public.users

SELECT 
    n.nspname || '.' || t.relname AS table_name,
    a.attname AS column_name,
    fn.nspname || '.' || ft.relname AS references_table,
    c.conname AS constraint_name,
    CASE 
        WHEN fn.nspname = 'auth' AND ft.relname = 'users' THEN '✅ Uses auth.users'
        WHEN fn.nspname = 'public' AND ft.relname = 'users' THEN '❌ Uses public.users (NEEDS FIX)'
        ELSE '⚠️ Other: ' || fn.nspname || '.' || ft.relname
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
    AND t.relname NOT LIKE 'pg_%'
ORDER BY 
    CASE 
        WHEN fn.nspname = 'auth' AND ft.relname = 'users' THEN 1
        WHEN fn.nspname = 'public' AND ft.relname = 'users' THEN 2
        ELSE 3
    END,
    t.relname,
    a.attname;


