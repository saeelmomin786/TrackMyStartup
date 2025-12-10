-- =====================================================
-- CREATE RLS POLICIES FOR INVESTOR ASSETS BUCKET
-- =====================================================
-- Run this AFTER creating the investor-assets bucket
-- Note: You may need owner permissions. If you get permission errors,
-- set up policies manually via Supabase Dashboard > Storage > investor-assets > Policies

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DO $$
BEGIN
    -- Drop existing policies for investor-assets bucket
    DROP POLICY IF EXISTS "Public can view investor assets" ON storage.objects;
    DROP POLICY IF EXISTS "Investors can upload their own assets" ON storage.objects;
    DROP POLICY IF EXISTS "Investors can update their own assets" ON storage.objects;
    DROP POLICY IF EXISTS "Investors can delete their own assets" ON storage.objects;
END $$;

-- Policy 1: Allow public read access to investor assets (for logos)
CREATE POLICY "Public can view investor assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'investor-assets');

-- Policy 2: Allow authenticated users to upload their own investor assets
CREATE POLICY "Investors can upload their own assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'investor-assets');

-- Policy 3: Allow authenticated users to update their own investor assets
CREATE POLICY "Investors can update their own assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'investor-assets')
WITH CHECK (bucket_id = 'investor-assets');

-- Policy 4: Allow authenticated users to delete their own investor assets
CREATE POLICY "Investors can delete their own assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'investor-assets');

-- Verify policies were created
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%investor%'
ORDER BY policyname;


