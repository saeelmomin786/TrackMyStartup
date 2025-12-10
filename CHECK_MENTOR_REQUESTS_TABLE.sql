-- Check if mentor_requests table exists (required for foreign key)
SELECT 
    'Table Check' as check_type,
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'mentor_requests'
        ) 
        THEN 'EXISTS'
        ELSE 'DOES NOT EXIST'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'mentor_requests';

-- If table doesn't exist, show all mentor-related tables
SELECT 
    'All Mentor Tables' as check_type,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%mentor%'
ORDER BY table_name;














