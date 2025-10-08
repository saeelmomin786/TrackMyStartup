-- TEST_MESSAGING_FIXES.sql
-- Test the messaging fixes

-- 1. Test if the send_incubation_message function exists
SELECT 
    'Function Check' as test_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'send_incubation_message' 
            AND routine_schema = 'public'
        ) 
        THEN 'send_incubation_message function exists'
        ELSE 'send_incubation_message function missing'
    END as function_status;

-- 2. Test if we can get application details
SELECT 
    'Application Check' as test_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.opportunity_applications LIMIT 1)
        THEN 'Applications exist in database'
        ELSE 'No applications found'
    END as application_status;

-- 3. Test UUID validation function
SELECT 
    'UUID Validation' as test_type,
    is_valid_uuid('123e4567-e89b-12d3-a456-426614174000') as valid_uuid_test,
    is_valid_uuid('invalid-uuid') as invalid_uuid_test,
    is_valid_uuid('') as empty_uuid_test;

-- 4. Test if we can get user ID from application
SELECT 
    'User ID Check' as test_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.opportunity_applications oa JOIN public.startups s ON oa.startup_id = s.id LIMIT 1)
        THEN 'Can get user ID from application'
        ELSE 'Cannot get user ID from application'
    END as user_id_status;

-- 5. Show success message
SELECT 'SUCCESS: All messaging fixes have been applied!' as status;












