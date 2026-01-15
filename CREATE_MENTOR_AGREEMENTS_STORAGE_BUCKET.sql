-- =====================================================
-- CREATE MENTOR AGREEMENTS STORAGE BUCKET
-- =====================================================
-- This creates the storage bucket for mentor agreement documents
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================

-- Step 1: Create the storage bucket
-- Note: If this fails, create the bucket manually via Dashboard → Storage → New Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'mentor-agreements',
    'mentor-agreements',
    true, -- Public bucket (so agreements can be viewed)
    52428800, -- 50MB file size limit
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png'
    ]
) ON CONFLICT (id) DO UPDATE
SET 
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png'
    ];

-- Step 2: Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 3: Create storage policies for mentor-agreements bucket

-- Policy 1: Authenticated users can upload agreements
DROP POLICY IF EXISTS "Authenticated users can upload mentor agreements" ON storage.objects;
CREATE POLICY "Authenticated users can upload mentor agreements"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'mentor-agreements'
);

-- Policy 2: Authenticated users can view agreements
DROP POLICY IF EXISTS "Authenticated users can view mentor agreements" ON storage.objects;
CREATE POLICY "Authenticated users can view mentor agreements"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'mentor-agreements'
);

-- Policy 3: Authenticated users can update their uploaded agreements
DROP POLICY IF EXISTS "Authenticated users can update mentor agreements" ON storage.objects;
CREATE POLICY "Authenticated users can update mentor agreements"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'mentor-agreements'
)
WITH CHECK (
    bucket_id = 'mentor-agreements'
);

-- Policy 4: Authenticated users can delete their uploaded agreements
DROP POLICY IF EXISTS "Authenticated users can delete mentor agreements" ON storage.objects;
CREATE POLICY "Authenticated users can delete mentor agreements"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'mentor-agreements'
);

-- Policy 5: Public read access (since bucket is public)
DROP POLICY IF EXISTS "Public can read mentor agreements" ON storage.objects;
CREATE POLICY "Public can read mentor agreements"
ON storage.objects
FOR SELECT
TO public
USING (
    bucket_id = 'mentor-agreements'
);

-- Verify the bucket was created
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets
WHERE id = 'mentor-agreements';

-- Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND policyname LIKE '%mentor agreements%'
ORDER BY policyname;
