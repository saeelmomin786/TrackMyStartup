-- =====================================================
-- CREATE TEAM PHOTOS STORAGE BUCKET
-- =====================================================
-- Creates the team-photos bucket for storing team member photos
-- in the fundraising one-pager
-- =====================================================

-- 1. Create team-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'team-photos',
    'team-photos',
    true,
    5242880, -- 5MB limit per file
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage objects if not already enabled
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS "team_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "team_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "team_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "team_photos_delete" ON storage.objects;

-- 4. Create RLS policy for SELECT (anyone can read public photos)
CREATE POLICY "team_photos_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'team-photos');

-- 5. Create RLS policy for INSERT (authenticated users can upload)
CREATE POLICY "team_photos_insert" ON storage.objects
    FOR INSERT TO AUTHENTICATED WITH CHECK (
        bucket_id = 'team-photos'
        -- Simplified: Allow all authenticated users to upload
        -- Path verification handled by application layer
    );

-- 6. Create RLS policy for UPDATE (authenticated users can update)
CREATE POLICY "team_photos_update" ON storage.objects
    FOR UPDATE TO AUTHENTICATED USING (
        bucket_id = 'team-photos'
    );

-- 7. Create RLS policy for DELETE (authenticated users can delete)
CREATE POLICY "team_photos_delete" ON storage.objects
    FOR DELETE TO AUTHENTICATED USING (
        bucket_id = 'team-photos'
    );

-- 8. Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Team photos bucket created successfully!';
    RAISE NOTICE '✅ RLS policies applied for team-photos bucket';
    RAISE NOTICE '📁 Bucket: team-photos';
    RAISE NOTICE '💾 File size limit: 5MB per image';
    RAISE NOTICE '🖼️ Allowed types: JPEG, PNG, GIF, WebP';
END $$;
