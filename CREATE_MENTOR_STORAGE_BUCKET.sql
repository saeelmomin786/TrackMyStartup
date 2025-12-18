-- =====================================================
-- CREATE MENTOR STORAGE BUCKET FOR LOGOS AND VIDEOS
-- =====================================================
-- This script creates the mentor-assets storage bucket
-- and sets up RLS policies for secure file uploads
-- =====================================================

-- =====================================================
-- STEP 1: CREATE STORAGE BUCKET
-- =====================================================

-- Create the bucket (public for easy access to mentor logos/videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mentor-assets', 
  'mentor-assets', 
  true, -- public bucket for easy access
  10485760, -- 10MB limit (10 * 1024 * 1024 bytes)
  ARRAY[
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/gif', 
    'image/webp', 
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- STEP 2: DROP EXISTING POLICIES (IF ANY)
-- =====================================================

DROP POLICY IF EXISTS "Mentors can upload their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view mentor assets" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can update their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can delete their own assets" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can upload to mentor-assets" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can update in mentor-assets" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can delete from mentor-assets" ON storage.objects;

-- =====================================================
-- STEP 3: CREATE RLS POLICIES
-- =====================================================

-- Allow authenticated users to upload to mentor-assets bucket
-- File path structure: mentor-logos/{filename} or mentor-videos/{filename}
CREATE POLICY "Mentors can upload to mentor-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mentor-assets' AND
  (
    (storage.foldername(name))[1] = 'mentor-logos' OR
    (storage.foldername(name))[1] = 'mentor-videos'
  )
);

-- Allow public read access to mentor assets
CREATE POLICY "Public can view mentor assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'mentor-assets');

-- Allow authenticated users to read their own files
CREATE POLICY "Mentors can read mentor-assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'mentor-assets');

-- Allow mentors to update files in mentor-assets
CREATE POLICY "Mentors can update in mentor-assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'mentor-assets' AND
  (
    (storage.foldername(name))[1] = 'mentor-logos' OR
    (storage.foldername(name))[1] = 'mentor-videos'
  )
)
WITH CHECK (
  bucket_id = 'mentor-assets' AND
  (
    (storage.foldername(name))[1] = 'mentor-logos' OR
    (storage.foldername(name))[1] = 'mentor-videos'
  )
);

-- Allow mentors to delete files from mentor-assets
CREATE POLICY "Mentors can delete from mentor-assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'mentor-assets' AND
  (
    (storage.foldername(name))[1] = 'mentor-logos' OR
    (storage.foldername(name))[1] = 'mentor-videos'
  )
);

-- =====================================================
-- STEP 4: VERIFY BUCKET CREATION
-- =====================================================

SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
FROM storage.buckets
WHERE id = 'mentor-assets';

-- =====================================================
-- STEP 5: VERIFY POLICIES
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%mentor%'
ORDER BY policyname;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. The bucket is public for easy access to mentor logos/videos
-- 2. File paths should be:
--    - mentor-logos/{filename} for logos
--    - mentor-videos/{filename} for videos
-- 3. File size limit: 10MB
-- 4. Allowed types: Images (JPEG, PNG, GIF, WebP, SVG) and Videos (MP4, WebM, QuickTime)
-- 5. All authenticated users can upload to mentor-assets
-- 6. Public can read all files in the bucket
-- =====================================================
