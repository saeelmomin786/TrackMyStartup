-- =====================================================
-- SETUP SUPABASE STORAGE BUCKET FOR MENTOR AGREEMENTS
-- =====================================================
-- Run this in Supabase SQL Editor to create the storage bucket
-- =====================================================

-- Create storage bucket for mentor agreements
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mentor-agreements',
  'mentor-agreements',
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY['application/pdf'] -- Only PDF files
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy: Mentors can upload agreements
CREATE POLICY "Mentors can upload agreements"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'mentor-agreements' AND
  auth.role() = 'authenticated'
);

-- Create storage policy: Users can view their own agreements
CREATE POLICY "Users can view their own agreements"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'mentor-agreements' AND
  auth.role() = 'authenticated'
);

-- Create storage policy: Users can update their own agreements
CREATE POLICY "Users can update their own agreements"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'mentor-agreements' AND
  auth.role() = 'authenticated'
);

-- Note: For production, you may want to add more restrictive policies
-- based on mentor_id and startup_id matching the authenticated user
