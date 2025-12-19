-- Check 2: Views using users table
-- Run this query only

SELECT 
    table_name as view_name,
    '❌ Uses users table' as status
FROM information_schema.views
WHERE table_schema = 'public'
  AND (
    view_definition ILIKE '%public.users%'
    OR (view_definition ILIKE '%FROM users%' AND view_definition NOT ILIKE '%user_profiles%')
    OR (view_definition ILIKE '%JOIN users%' AND view_definition NOT ILIKE '%user_profiles%')
  )
ORDER BY table_name;


