-- =====================================================
-- CREATE IP-TRADEMARK-DOCUMENTS STORAGE BUCKET
-- =====================================================
-- This script creates a dedicated storage bucket for IP/Trademark documents

-- Check if bucket exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM storage.buckets WHERE id = 'ip-trademark-documents'
    ) THEN
        RAISE NOTICE 'Bucket ip-trademark-documents already exists.';
    ELSE
        RAISE NOTICE 'Creating bucket ip-trademark-documents...';
    END IF;
END $$;

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ip-trademark-documents',
    'ip-trademark-documents',
    true, -- Public bucket for easier access
    52428800, -- 50MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Verify bucket was created
SELECT 
    '=== BUCKET VERIFICATION ===' as section,
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'ip-trademark-documents';

-- Note: Storage policies need to be created via Dashboard
-- Go to Storage > Policies and create a policy with:
-- Policy name: Public Access to ip-trademark-documents
-- Allowed operation: All
-- Target roles: public
-- Policy definition: bucket_id = 'ip-trademark-documents'

SELECT '✅ Bucket creation attempted!' as status;
SELECT '⚠️ If this fails, create bucket via Supabase Dashboard' as note;
SELECT '⚠️ Remember to create storage policies via Dashboard' as reminder;


