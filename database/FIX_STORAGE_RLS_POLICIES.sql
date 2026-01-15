-- =====================================================
-- FIX STORAGE RLS POLICIES FOR FILE UPLOADS
-- =====================================================
-- This script fixes the "new row violates row-level security policy" error
-- by creating simple, working storage policies for all buckets

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP EXISTING POLICIES (to avoid conflicts)
-- =====================================================

-- Drop all existing policies for the buckets we use
DROP POLICY IF EXISTS "Allow authenticated users to upload employee contracts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to employee contracts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update employee contracts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete employee contracts" ON storage.objects;
DROP POLICY IF EXISTS "employee-contracts-upload" ON storage.objects;
DROP POLICY IF EXISTS "employee-contracts-update" ON storage.objects;
DROP POLICY IF EXISTS "employee-contracts-delete" ON storage.objects;
DROP POLICY IF EXISTS "employee-contracts-view" ON storage.objects;

-- Drop policies for other buckets too
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to download files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete files" ON storage.objects;

-- Drop comprehensive policies
DROP POLICY IF EXISTS "compliance-documents-upload" ON storage.objects;
DROP POLICY IF EXISTS "compliance-documents-update" ON storage.objects;
DROP POLICY IF EXISTS "compliance-documents-delete" ON storage.objects;
DROP POLICY IF EXISTS "compliance-documents-view" ON storage.objects;
DROP POLICY IF EXISTS "financial-documents-upload" ON storage.objects;
DROP POLICY IF EXISTS "financial-documents-update" ON storage.objects;
DROP POLICY IF EXISTS "financial-documents-delete" ON storage.objects;
DROP POLICY IF EXISTS "financial-documents-view" ON storage.objects;
DROP POLICY IF EXISTS "pitch-decks-upload" ON storage.objects;
DROP POLICY IF EXISTS "pitch-decks-update" ON storage.objects;
DROP POLICY IF EXISTS "pitch-decks-delete" ON storage.objects;
DROP POLICY IF EXISTS "pitch-decks-view" ON storage.objects;
DROP POLICY IF EXISTS "startup-documents-upload" ON storage.objects;
DROP POLICY IF EXISTS "startup-documents-update" ON storage.objects;
DROP POLICY IF EXISTS "startup-documents-delete" ON storage.objects;
DROP POLICY IF EXISTS "startup-documents-view" ON storage.objects;
DROP POLICY IF EXISTS "verification-documents-upload" ON storage.objects;
DROP POLICY IF EXISTS "verification-documents-update" ON storage.objects;
DROP POLICY IF EXISTS "verification-documents-delete" ON storage.objects;
DROP POLICY IF EXISTS "verification-documents-view" ON storage.objects;

-- =====================================================
-- CREATE SIMPLE, WORKING POLICIES
-- =====================================================
-- These policies allow authenticated users to upload/update/delete files
-- in any of the buckets, and allow public read access

-- 1. INSERT POLICY: Allow authenticated users to upload files to any bucket
CREATE POLICY "storage-insert-authenticated" ON storage.objects
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id IN (
    'employee-contracts',
    'compliance-documents',
    'financial-documents',
    'pitch-decks',
    'pitch-videos',
    'startup-documents',
    'verification-documents',
    'company-docs'
  )
);

-- 2. SELECT POLICY: Allow public read access to all buckets
CREATE POLICY "storage-select-public" ON storage.objects
FOR SELECT 
USING (
  bucket_id IN (
    'employee-contracts',
    'compliance-documents',
    'financial-documents',
    'pitch-decks',
    'pitch-videos',
    'startup-documents',
    'verification-documents',
    'company-docs'
  )
);

-- 3. UPDATE POLICY: Allow authenticated users to update files
CREATE POLICY "storage-update-authenticated" ON storage.objects
FOR UPDATE 
USING (
  auth.role() = 'authenticated' AND
  bucket_id IN (
    'employee-contracts',
    'compliance-documents',
    'financial-documents',
    'pitch-decks',
    'pitch-videos',
    'startup-documents',
    'verification-documents',
    'company-docs'
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id IN (
    'employee-contracts',
    'compliance-documents',
    'financial-documents',
    'pitch-decks',
    'pitch-videos',
    'startup-documents',
    'verification-documents',
    'company-docs'
  )
);

-- 4. DELETE POLICY: Allow authenticated users to delete files
CREATE POLICY "storage-delete-authenticated" ON storage.objects
FOR DELETE 
USING (
  auth.role() = 'authenticated' AND
  bucket_id IN (
    'employee-contracts',
    'compliance-documents',
    'financial-documents',
    'pitch-decks',
    'pitch-videos',
    'startup-documents',
    'verification-documents',
    'company-docs'
  )
);

-- =====================================================
-- VERIFY POLICIES WERE CREATED
-- =====================================================

SELECT 
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE 'storage-%'
ORDER BY policyname;

-- =====================================================
-- VERIFY USER_STORAGE_USAGE RLS POLICIES
-- =====================================================

-- Ensure RLS is enabled
ALTER TABLE user_storage_usage ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Users can view their own storage usage" ON user_storage_usage;
DROP POLICY IF EXISTS "Users can insert their own storage usage" ON user_storage_usage;
DROP POLICY IF EXISTS "Users can update their own storage usage" ON user_storage_usage;
DROP POLICY IF EXISTS "Users can delete their own storage usage" ON user_storage_usage;

-- Users can only see their own storage usage
CREATE POLICY "Users can view their own storage usage"
    ON user_storage_usage FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own storage records
CREATE POLICY "Users can insert their own storage usage"
    ON user_storage_usage FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own storage records
CREATE POLICY "Users can update their own storage usage"
    ON user_storage_usage FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own storage records
CREATE POLICY "Users can delete their own storage usage"
    ON user_storage_usage FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- VERIFY USER_STORAGE_USAGE POLICIES
-- =====================================================

SELECT 
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'user_storage_usage' 
AND schemaname = 'public'
ORDER BY policyname;

SELECT '✅ Storage RLS policies fixed!' as status;
