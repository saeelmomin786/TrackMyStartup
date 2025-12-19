-- =====================================================
-- GET ACTUAL POLICY EXPRESSIONS FROM SYSTEM TABLES
-- =====================================================
-- This queries the pg_policy system table directly to see the actual stored expressions

SELECT 
    c.relname::text as table_name,
    p.polname::text as policy_name,
    CASE p.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
        ELSE 'UNKNOWN'
    END as command_type,
    pg_get_expr(p.polqual, p.polrelid) as qual_expression,
    pg_get_expr(p.polwithcheck, p.polrelid) as with_check_expression
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND (
      (p.polqual IS NOT NULL AND (
          pg_get_expr(p.polqual, p.polrelid) ILIKE '%FROM users%'
          OR pg_get_expr(p.polqual, p.polrelid) ILIKE '%users.id%'
          OR pg_get_expr(p.polqual, p.polrelid) ILIKE '%users.role%'
      ))
      OR (p.polwithcheck IS NOT NULL AND (
          pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%FROM users%'
          OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%users.id%'
          OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%users.role%'
      ))
  )
ORDER BY c.relname, p.polname
LIMIT 3;

