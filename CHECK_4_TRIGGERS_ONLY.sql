-- Check 4: Triggers using users table
-- Run this query only

SELECT 
    c.relname as table_name,
    t.tgname as trigger_name,
    '❌ Uses users table' as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_triggerdef(t.oid)::text ILIKE '%users%'
  AND pg_get_triggerdef(t.oid)::text NOT ILIKE '%user_profiles%'
ORDER BY c.relname, t.tgname;



