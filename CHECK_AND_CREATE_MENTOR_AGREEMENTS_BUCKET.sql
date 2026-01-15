-- =====================================================
-- CHECK AND CREATE MENTOR AGREEMENTS BUCKET
-- =====================================================
-- This script checks if the bucket exists and creates it if needed
-- Storage policies must be created via Dashboard (see instructions below)
-- =====================================================

-- Step 1: Check if bucket exists
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets
WHERE id = 'mentor-agreements';

-- Step 2: If bucket doesn't exist, create it
-- Note: This might fail if you don't have permissions
-- In that case, create it via Dashboard (see CREATE_MENTOR_AGREEMENTS_BUCKET_DASHBOARD.md)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 
    'mentor-agreements',
    'mentor-agreements',
    true,
    52428800, -- 50MB
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png'
    ]
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'mentor-agreements'
);

-- Step 3: Verify bucket was created/exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'mentor-agreements')
        THEN '✅ Bucket exists'
        ELSE '❌ Bucket does not exist - create it via Dashboard'
    END as bucket_status;
