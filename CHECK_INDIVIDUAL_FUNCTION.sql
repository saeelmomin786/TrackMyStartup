-- =====================================================
-- Check Individual Function for users table usage
-- =====================================================
-- Replace 'FUNCTION_NAME_HERE' with the actual function name
-- =====================================================

-- Example: Check if a specific function uses users table
-- Replace 'accept_investment_offer_with_fee' with the function you want to check

SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'accept_investment_offer_with_fee'  -- Change this to function name you want to check
LIMIT 1;

-- Then manually search the function_definition result for:
-- - 'FROM public.users'
-- - 'JOIN public.users'
-- - 'FROM user_profiles'
-- - 'JOIN user_profiles'



