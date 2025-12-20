-- =====================================================
-- GET FUNCTION DEFINITION FOR MIGRATION
-- =====================================================
-- Run this in Supabase SQL Editor to get function definition
-- Replace 'FUNCTION_NAME' with the function you want to migrate

-- Example: Get set_advisor_offer_visibility definition
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname = 'set_advisor_offer_visibility';

-- After getting the definition, I'll create the migration script
-- Copy the function_definition and share it, or I'll create the script based on common patterns



