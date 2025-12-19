-- =====================================================
-- FIX STORAGE POLICIES FOR COMPLIANCE-DOCUMENTS BUCKET
-- =====================================================
-- This script sets up proper storage policies for file uploads
-- Run this AFTER the bucket has been created via Dashboard

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies for compliance-documents bucket to start fresh
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to compliance-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to compliance-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view compliance-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update compliance-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete compliance-documents" ON storage.objects;
DROP POLICY IF EXISTS "Startups can upload their own compliance documents" ON storage.objects;
DROP POLICY IF EXISTS "Startups can view their own compliance documents" ON storage.objects;

-- Create simple public access policy for compliance-documents bucket
-- This allows anyone (including authenticated users) to upload/view files
CREATE POLICY "Public Access to compliance-documents" ON storage.objects
    FOR ALL 
    USING (bucket_id = 'compliance-documents')
    WITH CHECK (bucket_id = 'compliance-documents');

-- Verify the policy was created
SELECT 
    '=== STORAGE POLICY VERIFICATION ===' as section,
    schemaname,
    tablename,
    policyname,
    cmd as command_type
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%compliance%'
ORDER BY policyname;

-- Verify bucket exists and is public
SELECT 
    '=== BUCKET VERIFICATION ===' as section,
    id,
    name,
    public,
    file_size_limit
FROM storage.buckets 
WHERE id = 'compliance-documents';

-- Final status
DO $$
BEGIN
    RAISE NOTICE '✅ Storage policies updated for compliance-documents bucket';
    RAISE NOTICE '✅ File uploads should now work!';
END $$;

SELECT '✅ Storage policies setup complete!' as status;
