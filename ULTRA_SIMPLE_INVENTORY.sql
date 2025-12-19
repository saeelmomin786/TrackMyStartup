-- =====================================================
-- ULTRA SIMPLE INVENTORY (No Complex Functions)
-- =====================================================
-- This avoids pg_get_functiondef entirely to prevent errors
-- =====================================================

-- Query 1: All tables
SELECT table_name 
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Query 2: All function names (no definition check)
SELECT p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- Query 3: All views
SELECT table_name as view_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- Query 4: Foreign keys pointing to users table
SELECT 
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'users'
ORDER BY tc.table_name, kcu.column_name;

-- Query 5: Count summary (safe queries only)
SELECT 
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tables,
    
    (SELECT COUNT(*) FROM pg_proc p
     JOIN pg_namespace n ON p.pronamespace = n.oid
     WHERE n.nspname = 'public') as total_functions,
    
    (SELECT COUNT(*) FROM information_schema.views
     WHERE table_schema = 'public') as total_views,
    
    (SELECT COUNT(*) FROM information_schema.table_constraints AS tc
     JOIN information_schema.constraint_column_usage AS ccu
       ON ccu.constraint_name = tc.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema = 'public'
       AND ccu.table_name = 'users') as fk_to_users_count;

