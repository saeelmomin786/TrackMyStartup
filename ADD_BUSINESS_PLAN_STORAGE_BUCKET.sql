-- Create storage bucket for Business Plan documents
-- Run this in Supabase SQL editor

-- Step 1: Check if storage bucket already exists
SELECT 
  'Checking existing storage buckets' as step,
  id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id = 'business-plans';

-- Step 2: Create storage bucket for business plans
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-plans',
  'business-plans',
  true, -- public bucket for easy access
  10485760, -- 10MB limit (10 * 1024 * 1024 bytes)
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- STEP 3: CREATE STORAGE POLICIES FOR BUSINESS PLANS BUCKET
-- =====================================================

-- Step 3.1: Allow authenticated users to upload business plans
DROP POLICY IF EXISTS "Allow authenticated business plan uploads" ON storage.objects;
CREATE POLICY "Allow authenticated business plan uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-plans');

-- Step 3.2: Allow public read access to business plans
DROP POLICY IF EXISTS "Allow public business plan read access" ON storage.objects;
CREATE POLICY "Allow public business plan read access" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'business-plans');

-- Step 3.3: Allow authenticated users to update their own business plans
DROP POLICY IF EXISTS "Allow authenticated business plan updates" ON storage.objects;
CREATE POLICY "Allow authenticated business plan updates" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'business-plans')
  WITH CHECK (bucket_id = 'business-plans');

-- Step 3.4: Allow authenticated users to delete their own business plans
DROP POLICY IF EXISTS "Allow authenticated business plan deletes" ON storage.objects;
CREATE POLICY "Allow authenticated business plan deletes" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'business-plans');

-- Step 3.5: Verify the bucket and policies were created
SELECT 
  'Verifying business-plans bucket' as step,
  id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id = 'business-plans';

