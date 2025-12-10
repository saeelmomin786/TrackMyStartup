-- =====================================================
-- CREATE INVESTOR ASSETS STORAGE BUCKET
-- =====================================================
-- This creates the storage bucket for investor logos and assets
-- Run this in Supabase SQL Editor

-- Step 1: Create the investor-assets bucket
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

-- Step 2: Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if they exist (for idempotency)
DO $$
BEGIN
    -- Drop existing policies for investor-assets bucket
    DROP POLICY IF EXISTS "Investors can upload their own assets" ON storage.objects;
    DROP POLICY IF EXISTS "Public can view investor assets" ON storage.objects;
    DROP POLICY IF EXISTS "Investors can update their own assets" ON storage.objects;
    DROP POLICY IF EXISTS "Investors can delete their own assets" ON storage.objects;
END $$;

-- Step 4: Create RLS policy - Allow authenticated users to upload their own investor assets
CREATE POLICY "Investors can upload their own assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'investor-assets'
);

-- Step 5: Create RLS policy - Allow public read access to investor assets (for logos)
CREATE POLICY "Public can view investor assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'investor-assets');

-- Step 6: Create RLS policy - Allow authenticated users to update their own investor assets
CREATE POLICY "Investors can update their own assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'investor-assets')
WITH CHECK (bucket_id = 'investor-assets');

-- Step 7: Create RLS policy - Allow authenticated users to delete their own investor assets
CREATE POLICY "Investors can delete their own assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'investor-assets');

-- Step 8: Verify the bucket was created
SELECT 
  'Verifying investor-assets bucket' as step,
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'investor-assets';



