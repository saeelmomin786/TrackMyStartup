-- =====================================================
-- DELETE USERS BY EMAIL - Complete Cleanup
-- =====================================================
-- This script deletes users and all their associated data
-- from both profile tables and auth.users
-- =====================================================

-- Step 1: Delete from user_profile_sessions (if exists) - wrapped in exception handler
DO $$
BEGIN
    DELETE FROM public.user_profile_sessions
    WHERE auth_user_id IN (
        SELECT id FROM auth.users
        WHERE email IN (
            'iamomkar8767@gmail.com',
            'iamomkar1460@gmail.com',
            'iaomkar1460@gmail.com',
            'omkar.sardesai22@gmail.com'
        )
    );
EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
END $$;

-- Step 2: Delete from user_profiles (main profile table)
DELETE FROM public.user_profiles
WHERE auth_user_id IN (
    SELECT id FROM auth.users
    WHERE email IN (
        'iamomkar8767@gmail.com',
        'iamomkar1460@gmail.com',
        'iaomkar1460@gmail.com',
        'omkar.sardesai22@gmail.com'
    )
)
OR email IN (
    'iamomkar8767@gmail.com',
    'iamomkar1460@gmail.com',
    'iaomkar1460@gmail.com',
    'omkar.sardesai22@gmail.com'
);

-- Step 3: Delete from mentor_profiles (if exists) - wrapped in exception handler
DO $$
BEGIN
    DELETE FROM public.mentor_profiles
    WHERE user_id IN (
        SELECT id FROM auth.users
        WHERE email IN (
            'iamomkar8767@gmail.com',
            'iamomkar1460@gmail.com',
            'iaomkar1460@gmail.com',
            'omkar.sardesai22@gmail.com'
        )
    );
EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
END $$;

-- Step 4: Delete from investment_advisor_profiles (if exists) - wrapped in exception handler
DO $$
BEGIN
    DELETE FROM public.investment_advisor_profiles
    WHERE user_id IN (
        SELECT id FROM auth.users
        WHERE email IN (
            'iamomkar8767@gmail.com',
            'iamomkar1460@gmail.com',
            'iaomkar1460@gmail.com',
            'omkar.sardesai22@gmail.com'
        )
    );
EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
END $$;

-- Step 5: Delete from investor_profiles (if exists) - wrapped in exception handler
DO $$
BEGIN
    DELETE FROM public.investor_profiles
    WHERE user_id IN (
        SELECT id FROM auth.users
        WHERE email IN (
            'iamomkar8767@gmail.com',
            'iamomkar1460@gmail.com',
            'iaomkar1460@gmail.com',
            'omkar.sardesai22@gmail.com'
        )
    );
EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
END $$;

-- Step 6: Delete from startup_profiles (if exists) - wrapped in exception handler
DO $$
BEGIN
    DELETE FROM public.startup_profiles
    WHERE user_id IN (
        SELECT id FROM auth.users
        WHERE email IN (
            'iamomkar8767@gmail.com',
            'iamomkar1460@gmail.com',
            'iaomkar1460@gmail.com',
            'omkar.sardesai22@gmail.com'
        )
    );
EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
END $$;

-- Step 7: Delete from old profiles table (if exists) - wrapped in exception handler
DO $$
BEGIN
    DELETE FROM public.profiles
    WHERE id IN (
        SELECT id FROM auth.users
        WHERE email IN (
            'iamomkar8767@gmail.com',
            'iamomkar1460@gmail.com',
            'iaomkar1460@gmail.com',
            'omkar.sardesai22@gmail.com'
        )
    )
    OR email IN (
        'iamomkar8767@gmail.com',
        'iamomkar1460@gmail.com',
        'iaomkar1460@gmail.com',
        'omkar.sardesai22@gmail.com'
    );
EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
END $$;

-- Step 7.5: Delete from tables that reference public.users (must be done BEFORE deleting from users)
-- CRITICAL: This must run BEFORE deleting from public.users to avoid foreign key constraint violation
-- The foreign key company_documents_created_by_fkey references public.users(id)

-- Create a SECURITY DEFINER function to bypass RLS and delete from company_documents
CREATE OR REPLACE FUNCTION delete_company_documents_for_users(user_emails TEXT[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
    auth_user_ids UUID[];
BEGIN
    -- Get all auth user IDs that match the emails
    SELECT ARRAY_AGG(id) INTO auth_user_ids
    FROM auth.users
    WHERE email = ANY(user_emails);
    
    -- Delete from company_documents where created_by matches users to be deleted
    -- This function runs with elevated privileges to bypass RLS
    -- Try both public.users and auth.users IDs to cover all cases
    DELETE FROM public.company_documents
    WHERE created_by IN (
        -- Get all user IDs from public.users that match the emails
        SELECT u.id 
        FROM public.users u
        WHERE u.id = ANY(auth_user_ids)
        OR u.email = ANY(user_emails)
    )
    OR created_by = ANY(auth_user_ids);  -- Also try direct auth.users IDs
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
EXCEPTION 
    WHEN undefined_table THEN
        -- Table doesn't exist, return 0
        RETURN 0;
END $$;

-- Execute the function to delete company_documents
SELECT delete_company_documents_for_users(ARRAY[
    'iamomkar8767@gmail.com',
    'iamomkar1460@gmail.com',
    'iaomkar1460@gmail.com',
    'omkar.sardesai22@gmail.com'
]) as deleted_company_documents_count;

-- Clean up the function
DROP FUNCTION IF EXISTS delete_company_documents_for_users(TEXT[]);

-- Delete from other tables that might reference public.users
-- Add more tables here as needed based on foreign key constraints
DO $$
BEGIN
    -- Delete from any other tables with created_by, user_id, etc. that reference public.users
    -- This is a catch-all for common foreign key patterns
    EXECUTE '
    DELETE FROM public.compliance_submissions
    WHERE submitted_by_user_id IN (
        SELECT id FROM public.users
        WHERE id IN (SELECT id FROM auth.users WHERE email = ANY($1))
        OR email = ANY($1)
    )' USING ARRAY[
        'iamomkar8767@gmail.com',
        'iamomkar1460@gmail.com',
        'iaomkar1460@gmail.com',
        'omkar.sardesai22@gmail.com'
    ];
EXCEPTION WHEN undefined_table THEN
    NULL;
END $$;

DO $$
BEGIN
    DELETE FROM public.compliance_reviews
    WHERE reviewed_by_user_id IN (
        SELECT id FROM public.users
        WHERE id IN (
            SELECT id FROM auth.users
            WHERE email IN (
                'iamomkar8767@gmail.com',
                'iamomkar1460@gmail.com',
                'iaomkar1460@gmail.com',
                'omkar.sardesai22@gmail.com'
            )
        )
        OR email IN (
            'iamomkar8767@gmail.com',
            'iamomkar1460@gmail.com',
            'iaomkar1460@gmail.com',
            'omkar.sardesai22@gmail.com'
        )
    );
EXCEPTION WHEN undefined_table THEN
    NULL;
END $$;

-- Step 8: Delete from old users table (if exists) - wrapped in exception handler
DO $$
BEGIN
    DELETE FROM public.users
    WHERE id IN (
        SELECT id FROM auth.users
        WHERE email IN (
            'iamomkar8767@gmail.com',
            'iamomkar1460@gmail.com',
            'iaomkar1460@gmail.com',
            'omkar.sardesai22@gmail.com'
        )
    )
    OR email IN (
        'iamomkar8767@gmail.com',
        'iamomkar1460@gmail.com',
        'iaomkar1460@gmail.com',
        'omkar.sardesai22@gmail.com'
    );
EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
END $$;

-- Step 9: Delete from public tables (mentors_public_table, advisors_public_table) - wrapped in exception handlers
DO $$
BEGIN
    DELETE FROM public.mentors_public_table
    WHERE user_id IN (
        SELECT id FROM auth.users
        WHERE email IN (
            'iamomkar8767@gmail.com',
            'iamomkar1460@gmail.com',
            'iaomkar1460@gmail.com',
            'omkar.sardesai22@gmail.com'
        )
    );
EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
END $$;

DO $$
BEGIN
    DELETE FROM public.advisors_public_table
    WHERE user_id IN (
        SELECT id FROM auth.users
        WHERE email IN (
            'iamomkar8767@gmail.com',
            'iamomkar1460@gmail.com',
            'iaomkar1460@gmail.com',
            'omkar.sardesai22@gmail.com'
        )
    );
EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
    NULL;
END $$;

-- Step 10: Finally, delete from auth.users (this will cascade to any tables with ON DELETE CASCADE)
DELETE FROM auth.users
WHERE email IN (
    'iamomkar8767@gmail.com',
    'iamomkar1460@gmail.com',
    'iaomkar1460@gmail.com',
    'omkar.sardesai22@gmail.com'
);

-- =====================================================
-- VERIFICATION QUERY (Run separately to check)
-- =====================================================
-- Uncomment below to verify deletion:

/*
SELECT 
    'auth.users' as table_name,
    COUNT(*) as remaining_count
FROM auth.users
WHERE email IN (
    'iamomkar8767@gmail.com',
    'iamomkar1460@gmail.com',
    'iaomkar1460@gmail.com',
    'omkar.sardesai22@gmail.com'
)

UNION ALL

SELECT 
    'user_profiles' as table_name,
    COUNT(*) as remaining_count
FROM public.user_profiles
WHERE email IN (
    'iamomkar8767@gmail.com',
    'iamomkar1460@gmail.com',
    'iaomkar1460@gmail.com',
    'omkar.sardesai22@gmail.com'
);
*/

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '✅ Users deleted successfully!' as status;
SELECT '📧 Emails removed:' as info;
SELECT '   - iamomkar8767@gmail.com' as email;
SELECT '   - iamomkar1460@gmail.com' as email;
SELECT '   - iaomkar1460@gmail.com' as email;
SELECT '   - omkar.sardesai22@gmail.com' as email;

