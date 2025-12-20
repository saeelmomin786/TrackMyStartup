-- =====================================================
-- CHECK ALL 262 FUNCTIONS FOR users TABLE USAGE
-- =====================================================
-- This script checks ALL functions in the database to see which ones reference the users table
-- This will give us the complete picture

-- Create temp table to store results
CREATE TEMP TABLE IF NOT EXISTS all_functions_check (
    function_name TEXT,
    uses_user_profiles BOOLEAN DEFAULT FALSE,
    uses_users_table BOOLEAN DEFAULT FALSE,
    has_fallback BOOLEAN DEFAULT FALSE,
    status TEXT
);

-- Clear previous results
TRUNCATE all_functions_check;

-- Check ALL functions in public schema
DO $$
DECLARE
    func_rec RECORD;
    func_def TEXT;
    uses_user_profiles BOOLEAN;
    uses_users BOOLEAN;
    has_fallback BOOLEAN;
    status_text TEXT;
    total_count INTEGER := 0;
    migrated_count INTEGER := 0;
    users_only_count INTEGER := 0;
    fallback_count INTEGER := 0;
BEGIN
    -- Loop through ALL functions in public schema
    FOR func_rec IN 
        SELECT p.proname as func_name
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        ORDER BY p.proname
    LOOP
        BEGIN
            total_count := total_count + 1;
            
            -- Get function definition (skip if too large or errors)
            SELECT pg_get_functiondef(p.oid) INTO func_def
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = func_rec.func_name
            LIMIT 1;
            
            IF func_def IS NULL OR func_def = '' THEN
                INSERT INTO all_functions_check VALUES (
                    func_rec.func_name, FALSE, FALSE, FALSE, 'NO DEFINITION'
                );
                CONTINUE;
            END IF;
            
            -- Check for user_profiles usage
            uses_user_profiles := (
                func_def ILIKE '%FROM user_profiles%'
                OR func_def ILIKE '%JOIN user_profiles%'
                OR func_def ILIKE '%public.user_profiles%'
                OR func_def ILIKE '%user_profiles.%'
            );
            
            -- Check for users table usage
            uses_users := (
                func_def ILIKE '%FROM users%'
                OR func_def ILIKE '%JOIN users%'
                OR func_def ILIKE '%public.users%'
                OR (func_def ILIKE '%users.%' AND NOT func_def ILIKE '%user_profiles%')
            );
            
            -- Only check functions that actually use one of these tables
            IF NOT uses_user_profiles AND NOT uses_users THEN
                INSERT INTO all_functions_check VALUES (
                    func_rec.func_name, FALSE, FALSE, FALSE, 'NEITHER TABLE'
                );
                CONTINUE;
            END IF;
            
            -- Check for fallback logic (only if uses both)
            has_fallback := (
                (uses_user_profiles AND uses_users)
                OR func_def ILIKE '%IF NOT FOUND%'
                OR func_def ILIKE '%fallback%'
            );
            
            -- Determine status
            IF uses_user_profiles AND NOT uses_users AND NOT has_fallback THEN
                status_text := '✅ MIGRATED (user_profiles only)';
                migrated_count := migrated_count + 1;
            ELSIF uses_user_profiles AND uses_users THEN
                status_text := '⚠️ PARTIAL (has fallback)';
                fallback_count := fallback_count + 1;
            ELSIF uses_users AND NOT uses_user_profiles THEN
                status_text := '❌ NOT MIGRATED (users only)';
                users_only_count := users_only_count + 1;
            ELSE
                status_text := '❓ UNKNOWN';
            END IF;
            
            INSERT INTO all_functions_check VALUES (
                func_rec.func_name, 
                uses_user_profiles, 
                uses_users, 
                has_fallback, 
                status_text
            );
            
        EXCEPTION WHEN OTHERS THEN
            -- Skip functions that cause errors
            INSERT INTO all_functions_check VALUES (
                func_rec.func_name, FALSE, FALSE, FALSE, 'ERROR: ' || SUBSTR(SQLERRM, 1, 50)
            );
        END;
    END LOOP;
    
    RAISE NOTICE 'Total functions checked: %', total_count;
    RAISE NOTICE 'Fully migrated: %', migrated_count;
    RAISE NOTICE 'Using users only: %', users_only_count;
    RAISE NOTICE 'Has fallback: %', fallback_count;
END $$;

-- Show only functions that use users or user_profiles tables
SELECT 
    function_name,
    uses_user_profiles,
    uses_users_table,
    has_fallback,
    status
FROM all_functions_check
WHERE uses_user_profiles = TRUE OR uses_users_table = TRUE
ORDER BY 
    CASE status
        WHEN '✅ MIGRATED (user_profiles only)' THEN 1
        WHEN '⚠️ PARTIAL (has fallback)' THEN 2
        WHEN '❌ NOT MIGRATED (users only)' THEN 3
        ELSE 4
    END,
    function_name;

-- Summary counts for functions that use users/user_profiles
SELECT 
    'SUMMARY - Functions using users/user_profiles tables' as info,
    COUNT(*) FILTER (WHERE status = '✅ MIGRATED (user_profiles only)') as fully_migrated_count,
    COUNT(*) FILTER (WHERE status = '⚠️ PARTIAL (has fallback)') as has_fallback_count,
    COUNT(*) FILTER (WHERE status = '❌ NOT MIGRATED (users only)') as not_migrated_count,
    COUNT(*) FILTER (WHERE status LIKE '❓%') as unknown_count,
    COUNT(*) as total_functions_using_tables
FROM all_functions_check
WHERE uses_user_profiles = TRUE OR uses_users_table = TRUE;

-- Show count of all functions
SELECT 
    'TOTAL FUNCTIONS IN DATABASE' as info,
    COUNT(DISTINCT function_name) as total_functions
FROM all_functions_check;



