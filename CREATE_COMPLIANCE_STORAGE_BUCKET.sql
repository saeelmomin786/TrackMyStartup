-- =====================================================
-- CREATE COMPLIANCE DOCUMENTS STORAGE BUCKET
-- =====================================================
-- This script creates the storage bucket needed for IP/trademark document uploads

-- Check if storage bucket exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM storage.buckets WHERE id = 'compliance-documents'
    ) THEN
        RAISE NOTICE 'Storage bucket compliance-documents already exists.';
    ELSE
        RAISE NOTICE 'Creating storage bucket compliance-documents...';
    END IF;
END $$;

-- Try to create storage bucket (may require service role key or dashboard)
-- If this fails, use Supabase Dashboard instead (see instructions below)
DO $$
BEGIN
    -- Try to insert the bucket
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'compliance-documents',
        'compliance-documents',
        true, -- Public bucket for easier access
        52428800, -- 50MB limit
        ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    )
    ON CONFLICT (id) DO UPDATE SET
        public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;
    
    RAISE NOTICE '✅ Bucket creation attempted';
EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE '⚠️ Insufficient permissions. Please use Supabase Dashboard instead (see instructions below)';
WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Error creating bucket: %. Please use Supabase Dashboard instead', SQLERRM;
END $$;

-- Note: Storage policies need to be set up via Supabase Dashboard
-- Go to Storage > Policies and create policies for the compliance-documents bucket
-- Or use the Supabase Dashboard to create the bucket directly (recommended)

-- Verify storage bucket was created
SELECT 
    '=== STORAGE BUCKET VERIFICATION ===' as section,
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'compliance-documents';

-- Final status
DO $$
DECLARE
    bucket_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM storage.buckets WHERE id = 'compliance-documents'
    ) INTO bucket_exists;
    
    IF bucket_exists THEN
        RAISE NOTICE '✅ Storage bucket "compliance-documents" created successfully!';
        RAISE NOTICE '✅ Document uploads should now work!';
    ELSE
        RAISE EXCEPTION '❌ Failed to create storage bucket!';
    END IF;
END $$;

-- =====================================================
-- ALTERNATIVE: CREATE BUCKET VIA SUPABASE DASHBOARD
-- =====================================================
-- If the SQL above fails due to permissions, use the Dashboard:
--
-- 1. Go to your Supabase Dashboard
-- 2. Click on "Storage" in the left sidebar
-- 3. Click "New bucket"
-- 4. Fill in:
--    - Name: compliance-documents
--    - Public bucket: ✅ Yes (check this)
--    - File size limit: 50 MB
--    - Allowed MIME types: (leave empty or add):
--      application/pdf,image/jpeg,image/png,image/gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
-- 5. Click "Create bucket"
--
-- Then set up policies:
-- 1. Go to Storage > Policies
-- 2. Find "compliance-documents" bucket
-- 3. Click "New Policy"
-- 4. Create a policy:
--    - Policy name: Public Access
--    - Allowed operation: All
--    - Target roles: public
--    - Policy definition: bucket_id = 'compliance-documents'
-- 5. Click "Save policy"

SELECT '✅ Storage bucket setup complete!' as status;
SELECT '⚠️ If bucket creation failed, use Supabase Dashboard (see instructions above)' as note;

