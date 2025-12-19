-- Check 6: Summary counts (safe queries only)
-- Run this to get counts

SELECT 
    'Functions using users' as category,
    COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    pg_get_functiondef(p.oid)::text ILIKE '%FROM public.users%'
    OR pg_get_functiondef(p.oid)::text ILIKE '%JOIN public.users%'
  )

UNION ALL

SELECT 
    'Views using users' as category,
    COUNT(*) as count
FROM information_schema.views
WHERE table_schema = 'public'
  AND view_definition ILIKE '%public.users%'

UNION ALL

SELECT 
    'Foreign Keys to users' as category,
    COUNT(*) as count
FROM information_schema.table_constraints AS tc
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'users';


