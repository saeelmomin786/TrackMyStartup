-- =====================================================
-- UPDATE MENTOR ASSETS STORAGE POLICIES FOR PROOF DOCUMENTS
-- =====================================================
-- This script updates the RLS policies for mentor-assets bucket
-- to allow uploads to the mentor-proof-documents folder
-- =====================================================

-- =====================================================
-- STEP 1: DROP EXISTING POLICIES (IF ANY)
-- =====================================================

DROP POLICY IF EXISTS "Mentors can upload to mentor-assets" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can update in mentor-assets" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can delete from mentor-assets" ON storage.objects;

-- =====================================================
-- STEP 2: CREATE UPDATED RLS POLICIES
-- =====================================================

-- Allow authenticated users to upload to mentor-assets bucket
-- File path structure: mentor-logos/{filename}, mentor-videos/{filename}, or mentor-proof-documents/{userId}/{filename}
CREATE POLICY "Mentors can upload to mentor-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mentor-assets' AND
  (
    (storage.foldername(name))[1] = 'mentor-logos' OR
    (storage.foldername(name))[1] = 'mentor-videos' OR
    (storage.foldername(name))[1] = 'mentor-proof-documents'
  )
);

-- Allow mentors to update files in mentor-assets
CREATE POLICY "Mentors can update in mentor-assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'mentor-assets' AND
  (
    (storage.foldername(name))[1] = 'mentor-logos' OR
    (storage.foldername(name))[1] = 'mentor-videos' OR
    (storage.foldername(name))[1] = 'mentor-proof-documents'
  )
)
WITH CHECK (
  bucket_id = 'mentor-assets' AND
  (
    (storage.foldername(name))[1] = 'mentor-logos' OR
    (storage.foldername(name))[1] = 'mentor-videos' OR
    (storage.foldername(name))[1] = 'mentor-proof-documents'
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
    (storage.foldername(name))[1] = 'mentor-videos' OR
    (storage.foldername(name))[1] = 'mentor-proof-documents'
  )
);

-- =====================================================
-- STEP 3: UPDATE ALLOWED MIME TYPES (IF NEEDED)
-- =====================================================
-- Add PDF and document types for proof documents

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 
  'image/jpg', 
  'image/png', 
  'image/gif', 
  'image/webp', 
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
WHERE id = 'mentor-assets';

-- =====================================================
-- STEP 4: VERIFY POLICIES
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
-- 1. The policies now allow uploads to:
--    - mentor-logos/{filename} for logos
--    - mentor-videos/{filename} for videos
--    - mentor-proof-documents/{userId}/{filename} for proof documents
-- 2. All authenticated users can upload to these folders
-- 3. Public can read all files in the bucket (existing policy)
-- 4. Added PDF and DOC/DOCX MIME types for proof documents
-- =====================================================

