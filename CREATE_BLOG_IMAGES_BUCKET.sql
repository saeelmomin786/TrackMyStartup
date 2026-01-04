-- =====================================================
-- BLOG IMAGES STORAGE BUCKET SETUP
-- =====================================================
-- Run this in your Supabase SQL Editor to create the storage bucket for blog cover images
-- =====================================================

-- Create the blog-images storage bucket
-- Note: This needs to be done in Supabase Dashboard → Storage → Create Bucket
-- Bucket name: blog-images
-- Public: Yes (so images can be accessed publicly)
-- File size limit: 5MB (recommended)
-- Allowed MIME types: image/*

-- After creating the bucket, run the following to set up RLS policies:

-- Policy: Anyone can read blog images (public access)
CREATE POLICY "Public blog images are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-images');

-- Policy: Only authenticated admins can upload blog images
CREATE POLICY "Only admins can upload blog images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'blog-images' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'Admin'
  )
);

-- Policy: Only authenticated admins can update blog images
CREATE POLICY "Only admins can update blog images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'blog-images' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'Admin'
  )
);

-- Policy: Only authenticated admins can delete blog images
CREATE POLICY "Only admins can delete blog images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'blog-images' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'Admin'
  )
);

-- =====================================================
-- MANUAL STEPS REQUIRED:
-- =====================================================
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click "Create Bucket"
-- 3. Set bucket name: "blog-images"
-- 4. Make it Public: Yes
-- 5. Set file size limit: 5MB (optional but recommended)
-- 6. Set allowed MIME types: image/* (optional but recommended)
-- 7. Click "Create"
-- 8. Then run the SQL policies above
-- =====================================================



