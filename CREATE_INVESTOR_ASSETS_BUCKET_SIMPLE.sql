-- =====================================================
-- CREATE INVESTOR ASSETS STORAGE BUCKET (SIMPLE VERSION)
-- =====================================================
-- This creates the storage bucket for investor logos
-- Note: Storage policies must be set up manually in Supabase Dashboard

-- Create the investor-assets bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'investor-assets',
  'investor-assets',
  true, -- public bucket for easy access to logos
  5242880, -- 5MB limit (5 * 1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
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
WHERE id = 'investor-assets';

-- =====================================================
-- IMPORTANT: After running this SQL, you MUST set up
-- RLS policies manually in Supabase Dashboard:
-- =====================================================
-- 
-- 1. Go to Supabase Dashboard > Storage
-- 2. Click on "investor-assets" bucket
-- 3. Go to "Policies" tab
-- 4. Add the following policies:
--
-- Policy 1: "Public can view investor assets"
--   - Policy type: SELECT
--   - Target roles: public
--   - USING expression: bucket_id = 'investor-assets'
--
-- Policy 2: "Investors can upload their own assets"
--   - Policy type: INSERT
--   - Target roles: authenticated
--   - WITH CHECK expression: bucket_id = 'investor-assets'
--
-- Policy 3: "Investors can update their own assets"
--   - Policy type: UPDATE
--   - Target roles: authenticated
--   - USING expression: bucket_id = 'investor-assets'
--   - WITH CHECK expression: bucket_id = 'investor-assets'
--
-- Policy 4: "Investors can delete their own assets"
--   - Policy type: DELETE
--   - Target roles: authenticated
--   - USING expression: bucket_id = 'investor-assets'
--
-- =====================================================


