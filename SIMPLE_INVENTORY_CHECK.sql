-- =====================================================
-- SIMPLE DATABASE INVENTORY (Run Each Section Separately)
-- =====================================================

-- Query 1: List all tables
SELECT table_name 
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Query 2: List all functions (names only)
SELECT p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- Query 3: Functions using users table (simple check - avoid pg_get_functiondef in WHERE)
-- Note: We'll check these individually if needed
SELECT p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;
-- TODO: Manually check each function for 'users' table usage

-- Query 4: Skip - we'll check manually based on Query 3 results

-- Query 5: List all views
SELECT table_name as view_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- Query 6: Foreign keys pointing to users table
SELECT 
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'users'
ORDER BY tc.table_name, kcu.column_name;

