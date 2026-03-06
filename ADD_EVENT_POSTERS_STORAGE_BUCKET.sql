-- =====================================================
-- CREATE STORAGE BUCKET FOR EVENT POSTERS
-- =====================================================
-- Run in Supabase SQL Editor.

BEGIN;

-- 1) Create or update bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-posters',
  'event-posters',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) Policies for uploads and public reads
DROP POLICY IF EXISTS "Allow authenticated event poster uploads" ON storage.objects;
CREATE POLICY "Allow authenticated event poster uploads"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-posters');

DROP POLICY IF EXISTS "Allow public event poster read access" ON storage.objects;
CREATE POLICY "Allow public event poster read access"
ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'event-posters');

DROP POLICY IF EXISTS "Allow authenticated event poster updates" ON storage.objects;
CREATE POLICY "Allow authenticated event poster updates"
ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'event-posters')
WITH CHECK (bucket_id = 'event-posters');

DROP POLICY IF EXISTS "Allow authenticated event poster deletes" ON storage.objects;
CREATE POLICY "Allow authenticated event poster deletes"
ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'event-posters');

COMMIT;
