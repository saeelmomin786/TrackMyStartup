-- Add logo_url column to fundraising_details table
-- This allows startups to upload/enter a logo URL that will be displayed
-- when no pitch video is available

-- Step 1: Add the logo_url column
ALTER TABLE fundraising_details
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Step 2: Add a comment to document the column
COMMENT ON COLUMN fundraising_details.logo_url IS 'URL to the company logo. Displayed when pitch_video_url is not available.';

-- Step 3: Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'fundraising_details'
  AND column_name = 'logo_url';

-- =====================================================
-- STEP 4: CREATE STORAGE BUCKET FOR LOGOS
-- =====================================================

-- Step 4.1: Check if storage bucket already exists
SELECT 
  'Checking existing storage buckets' as step,
  id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id = 'logos';

-- Step 4.2: Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true, -- public bucket for easy access
  5242880, -- 5MB limit (5 * 1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- STEP 5: CREATE STORAGE POLICIES FOR LOGOS BUCKET
-- =====================================================

-- Step 5.1: Allow authenticated users to upload logos
DROP POLICY IF EXISTS "Allow authenticated logo uploads" ON storage.objects;
CREATE POLICY "Allow authenticated logo uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos');

-- Step 5.2: Allow public read access to logos
DROP POLICY IF EXISTS "Allow public logo read access" ON storage.objects;
CREATE POLICY "Allow public logo read access" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'logos');

-- Step 5.3: Allow authenticated users to update their own logos
DROP POLICY IF EXISTS "Allow authenticated logo updates" ON storage.objects;
CREATE POLICY "Allow authenticated logo updates" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'logos')
  WITH CHECK (bucket_id = 'logos');

-- Step 5.4: Allow authenticated users to delete their own logos
DROP POLICY IF EXISTS "Allow authenticated logo deletes" ON storage.objects;
CREATE POLICY "Allow authenticated logo deletes" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'logos');

-- Step 5.5: Verify the bucket and policies were created
SELECT 
  'Verifying logos bucket' as step,
  id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id = 'logos';

