-- =====================================================
-- LIST ALL FUNCTIONS BY STATUS
-- =====================================================
-- Shows which functions fall into each category

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
    func_name,
    CASE 
        WHEN uses_user_profiles = TRUE AND uses_users_table = FALSE AND has_fallback = FALSE 
        THEN '✅ MIGRATED (user_profiles only)'
        WHEN uses_user_profiles = TRUE AND uses_users_table = TRUE 
        THEN '⚠️ HAS FALLBACK (uses both)'
        WHEN uses_users_table = TRUE AND uses_user_profiles = FALSE 
        THEN '❌ NOT MIGRATED (users only)'
        ELSE '➖ NOT RELATED'
    END as status
FROM function_analysis
WHERE uses_user_profiles = TRUE OR uses_users_table = TRUE
ORDER BY 
    CASE 
        WHEN uses_user_profiles = TRUE AND uses_users_table = FALSE AND has_fallback = FALSE THEN 1
        WHEN uses_user_profiles = TRUE AND uses_users_table = TRUE THEN 2
        WHEN uses_users_table = TRUE AND uses_user_profiles = FALSE THEN 3
        ELSE 4
    END,
    func_name;


