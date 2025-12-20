-- Check 5: RLS Policies using users table (simplified)
-- This uses a very simple approach to avoid array_agg errors

-- First, let's just get all RLS policies and check manually
-- This query gets all policies on public schema tables
SELECT 
    c.relname as table_name,
    pol.polname as policy_name,
    pol.polcmd as command_type
FROM pg_policy pol
JOIN pg_class c ON pol.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY c.relname, pol.polname;

-- Note: To check if a policy uses users table, you would need to inspect
-- the policy expression. Due to array_agg issues, we'll need to check
-- each policy manually or use a different approach.



