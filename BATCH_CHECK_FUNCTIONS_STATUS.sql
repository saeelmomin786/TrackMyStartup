-- =====================================================
-- BATCH CHECK: All Functions Status
-- =====================================================
-- This creates a summary table showing which functions use which tables

-- Create a temp table to store results
CREATE TEMP TABLE IF NOT EXISTS function_status_check (
    function_name TEXT,
    uses_user_profiles BOOLEAN DEFAULT FALSE,
    uses_users_table BOOLEAN DEFAULT FALSE,
    has_fallback BOOLEAN DEFAULT FALSE,
    status TEXT
);

-- Clear previous results
TRUNCATE function_status_check;

-- Function to check each function and insert into temp table
DO $$
DECLARE
    func_rec RECORD;
    func_def TEXT;
    uses_user_profiles BOOLEAN;
    uses_users BOOLEAN;
    has_fallback BOOLEAN;
    status_text TEXT;
BEGIN
    -- List of functions to check
    FOR func_rec IN 
        SELECT unnest(ARRAY[
            'get_user_role',
            'get_current_profile_safe',
            'get_user_public_info',
            'accept_investment_offer_with_fee',
            'get_offers_for_investment_advisor',
            'should_reveal_contact_details',
            'get_co_investment_opportunities_for_user',
            'get_advisor_clients',
            'get_center_by_user_email',
            'get_all_co_investment_opportunities',
            'get_advisor_investors',
            'get_startup_by_user_email',
            'get_user_profile',
            'set_advisor_offer_visibility'
        ]) as func_name
    LOOP
        BEGIN
            -- Get function definition
            SELECT pg_get_functiondef(p.oid) INTO func_def
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' AND p.proname = func_rec.func_name
            LIMIT 1;
            
            IF func_def IS NULL THEN
                INSERT INTO function_status_check VALUES (
                    func_rec.func_name, FALSE, FALSE, FALSE, 'NOT FOUND'
                );
                CONTINUE;
            END IF;
            
            -- Check for user_profiles usage
            uses_user_profiles := (
                func_def ILIKE '%FROM user_profiles%'
                OR func_def ILIKE '%JOIN user_profiles%'
                OR func_def ILIKE '%public.user_profiles%'
            );
            
            -- Check for users table usage
            uses_users := (
                func_def ILIKE '%FROM users%'
                OR func_def ILIKE '%JOIN users%'
                OR func_def ILIKE '%public.users%'
                OR (func_def ILIKE '%users.%' AND NOT func_def ILIKE '%user_profiles%')
            );
            
            -- Check for fallback logic
            has_fallback := (
                (uses_user_profiles AND uses_users)
                OR func_def ILIKE '%IF NOT FOUND%'
                OR func_def ILIKE '%fallback%'
            );
            
            -- Determine status
            IF uses_user_profiles AND NOT uses_users AND NOT has_fallback THEN
                status_text := '✅ MIGRATED (user_profiles only)';
            ELSIF uses_user_profiles AND uses_users THEN
                status_text := '⚠️ PARTIAL (has fallback)';
            ELSIF uses_users AND NOT uses_user_profiles THEN
                status_text := '❌ NOT MIGRATED (users only)';
            ELSE
                status_text := '❓ UNKNOWN';
            END IF;
            
            INSERT INTO function_status_check VALUES (
                func_rec.func_name, 
                uses_user_profiles, 
                uses_users, 
                has_fallback, 
                status_text
            );
            
        EXCEPTION WHEN OTHERS THEN
            INSERT INTO function_status_check VALUES (
                func_rec.func_name, FALSE, FALSE, FALSE, 'ERROR: ' || SQLERRM
            );
        END;
    END LOOP;
END $$;

-- Show results
SELECT 
    function_name,
    uses_user_profiles,
    uses_users_table,
    has_fallback,
    status
FROM function_status_check
ORDER BY 
    CASE status
        WHEN '✅ MIGRATED (user_profiles only)' THEN 1
        WHEN '⚠️ PARTIAL (has fallback)' THEN 2
        WHEN '❌ NOT MIGRATED (users only)' THEN 3
        ELSE 4
    END,
    function_name;

-- Summary counts
SELECT 
    'SUMMARY' as info,
    COUNT(*) FILTER (WHERE status = '✅ MIGRATED (user_profiles only)') as fully_migrated,
    COUNT(*) FILTER (WHERE status = '⚠️ PARTIAL (has fallback)') as has_fallback,
    COUNT(*) FILTER (WHERE status = '❌ NOT MIGRATED (users only)') as not_migrated,
    COUNT(*) FILTER (WHERE status LIKE '❓%' OR status LIKE 'ERROR%' OR status = 'NOT FOUND') as unknown_or_error
FROM function_status_check;


