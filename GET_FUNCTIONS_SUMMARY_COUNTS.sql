-- =====================================================
-- GET SUMMARY COUNTS: Functions using users vs user_profiles
-- =====================================================
-- Quick summary of how many functions use which tables

WITH function_defs AS (
    SELECT 
        p.proname as func_name,
        pg_get_functiondef(p.oid) as func_def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
),
function_analysis AS (
    SELECT 
        func_name,
        CASE 
            WHEN func_def ILIKE '%FROM user_profiles%' 
                OR func_def ILIKE '%JOIN user_profiles%'
                OR func_def ILIKE '%public.user_profiles%'
                OR func_def ILIKE '%user_profiles.%'
            THEN TRUE 
            ELSE FALSE 
        END as uses_user_profiles,
        CASE 
            WHEN func_def ILIKE '%FROM users%' 
                OR func_def ILIKE '%JOIN users%'
                OR func_def ILIKE '%public.users%'
                OR (func_def ILIKE '%users.%' AND func_def NOT ILIKE '%user_profiles%')
            THEN TRUE 
            ELSE FALSE 
        END as uses_users_table,
        CASE 
            WHEN (func_def ILIKE '%FROM user_profiles%' OR func_def ILIKE '%JOIN user_profiles%')
                AND (func_def ILIKE '%FROM users%' OR func_def ILIKE '%JOIN users%')
                OR func_def ILIKE '%IF NOT FOUND%'
                OR func_def ILIKE '%fallback%'
            THEN TRUE 
            ELSE FALSE 
        END as has_fallback
    FROM function_defs
    WHERE func_def IS NOT NULL
)
SELECT 
    '📊 SUMMARY COUNTS' as info,
    COUNT(*) as total_functions,
    COUNT(*) FILTER (WHERE uses_user_profiles = TRUE AND uses_users_table = FALSE AND has_fallback = FALSE) as fully_migrated_user_profiles_only,
    COUNT(*) FILTER (WHERE uses_user_profiles = TRUE AND uses_users_table = TRUE) as has_fallback_logic,
    COUNT(*) FILTER (WHERE uses_users_table = TRUE AND uses_user_profiles = FALSE) as uses_users_only,
    COUNT(*) FILTER (WHERE uses_user_profiles = TRUE OR uses_users_table = TRUE) as total_using_user_tables
FROM function_analysis;


