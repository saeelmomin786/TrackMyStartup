-- =====================================================
-- CREATE MENTOR PROOF DOCUMENTS STORAGE BUCKET (SIMPLE)
-- =====================================================
-- This script creates the storage bucket only
-- RLS policies must be set up manually via Supabase Dashboard
-- =====================================================
-- Note: This script only creates the bucket. You must set up
-- RLS policies manually in Supabase Dashboard > Storage > 
-- mentor-proof-documents > Policies
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

-- Verify the bucket was created
SELECT 
  'Bucket created successfully' as status,
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'mentor-proof-documents';

-- =====================================================
-- IMPORTANT: After running this SQL, you MUST set up
-- RLS policies manually in Supabase Dashboard:
-- =====================================================
-- 
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click on "mentor-proof-documents" bucket
-- 3. Go to "Policies" tab
-- 4. Add the following policies:
--
-- Policy 1: "Public can view mentor proof documents"
--   - Policy type: SELECT
--   - Target roles: public
--   - USING expression: bucket_id = 'mentor-proof-documents'
--
-- Policy 2: "Mentors can upload proof documents"
--   - Policy type: INSERT
--   - Target roles: authenticated
--   - WITH CHECK expression: bucket_id = 'mentor-proof-documents'
--
-- Policy 3: "Mentors can read their proof documents"
--   - Policy type: SELECT
--   - Target roles: authenticated
--   - USING expression: bucket_id = 'mentor-proof-documents'
--
-- Policy 4: "Mentors can update their proof documents"
--   - Policy type: UPDATE
--   - Target roles: authenticated
--   - USING expression: bucket_id = 'mentor-proof-documents'
--   - WITH CHECK expression: bucket_id = 'mentor-proof-documents'
--
-- Policy 5: "Mentors can delete their proof documents"
--   - Policy type: DELETE
--   - Target roles: authenticated
--   - USING expression: bucket_id = 'mentor-proof-documents'
--
-- =====================================================


