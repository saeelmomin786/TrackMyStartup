-- =====================================================
-- CHECK INDIVIDUAL FUNCTION: user_profiles vs users vs fallback
-- =====================================================
-- Replace 'FUNCTION_NAME' with the actual function name you want to check
-- Run this query for each function separately

DO $$
DECLARE
    func_def TEXT;
    func_name TEXT := 'FUNCTION_NAME'; -- CHANGE THIS to the function you want to check
    uses_user_profiles BOOLEAN := FALSE;
    uses_users BOOLEAN := FALSE;
    has_fallback BOOLEAN := FALSE;
BEGIN
    -- Get function definition
    SELECT pg_get_functiondef(p.oid) INTO func_def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = func_name;
    
    IF func_def IS NULL THEN
        RAISE NOTICE 'Function % not found', func_name;
        RETURN;
    END IF;
    
    -- Check for user_profiles usage
    uses_user_profiles := (
        func_def LIKE '%FROM user_profiles%'
        OR func_def LIKE '%JOIN user_profiles%'
        OR func_def LIKE '%public.user_profiles%'
    );
    
    -- Check for users table usage
    uses_users := (
        func_def LIKE '%FROM users%'
        OR func_def LIKE '%JOIN users%'
        OR func_def LIKE '%public.users%'
        OR func_def LIKE '%users.%'
    );
    
    -- Check for fallback logic (IF NOT FOUND, ELSE, fallback patterns)
    has_fallback := (
        func_def LIKE '%IF NOT FOUND%'
        OR (func_def LIKE '%IF%' AND func_def LIKE '%users%' AND func_def LIKE '%user_profiles%')
        OR func_def LIKE '%fallback%'
        OR (uses_user_profiles AND uses_users)
    );
    
    -- Report results
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Function: %', func_name;
    RAISE NOTICE 'Uses user_profiles: %', uses_user_profiles;
    RAISE NOTICE 'Uses users table: %', uses_users;
    RAISE NOTICE 'Has fallback logic: %', has_fallback;
    RAISE NOTICE '========================================';
    
    IF uses_user_profiles AND NOT uses_users AND NOT has_fallback THEN
        RAISE NOTICE '✅ Status: FULLY MIGRATED (user_profiles only, no fallback)';
    ELSIF uses_user_profiles AND uses_users THEN
        RAISE NOTICE '⚠️ Status: PARTIAL MIGRATION (has fallback)';
    ELSIF uses_users AND NOT uses_user_profiles THEN
        RAISE NOTICE '❌ Status: NOT MIGRATED (uses users table only)';
    ELSE
        RAISE NOTICE '❓ Status: UNKNOWN (check manually)';
    END IF;
END $$;



