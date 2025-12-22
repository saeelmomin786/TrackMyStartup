-- =====================================================
-- CREATE MENTOR PROOF DOCUMENTS STORAGE BUCKET
-- =====================================================
-- This script creates a separate storage bucket for mentor proof documents
-- and sets up RLS policies for secure file uploads
-- =====================================================

-- =====================================================
-- STEP 1: CREATE STORAGE BUCKET
-- =====================================================

-- Create the bucket (public for easy access to proof documents)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mentor-proof-documents', 
  'mentor-proof-documents', 
  true, -- public bucket for easy access
  10485760, -- 10MB limit (10 * 1024 * 1024 bytes)
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/gif', 
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- STEP 2: DROP EXISTING POLICIES (IF ANY)
-- =====================================================

DROP POLICY IF EXISTS "Mentors can upload proof documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can view mentor proof documents" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can read their proof documents" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can update their proof documents" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can delete their proof documents" ON storage.objects;

-- =====================================================
-- STEP 3: CREATE RLS POLICIES
-- =====================================================

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload proof documents
-- File path structure: mentor-proof-documents/{userId}/{filename}
CREATE POLICY "Mentors can upload proof documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mentor-proof-documents'
);

-- Allow public read access to mentor proof documents
CREATE POLICY "Public can view mentor proof documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'mentor-proof-documents');

-- Allow authenticated users to read their own proof documents
CREATE POLICY "Mentors can read their proof documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'mentor-proof-documents');

-- Allow mentors to update their proof documents
CREATE POLICY "Mentors can update their proof documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'mentor-proof-documents')
WITH CHECK (bucket_id = 'mentor-proof-documents');

-- Allow mentors to delete their proof documents
CREATE POLICY "Mentors can delete their proof documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'mentor-proof-documents');

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
WHERE id = 'mentor-proof-documents';

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
AND policyname LIKE '%proof%'
ORDER BY policyname;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. The bucket is public for easy access to proof documents
-- 2. File path structure: mentor-proof-documents/{userId}/{filename}
-- 3. File size limit: 10MB
-- 4. Allowed types: PDF, DOC, DOCX, XLS, XLSX, Images (JPEG, PNG, GIF, WebP)
-- 5. All authenticated users can upload, update, and delete their proof documents
-- 6. Public can read all files in the bucket
-- =====================================================

