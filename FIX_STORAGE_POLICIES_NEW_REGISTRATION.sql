-- FIX_STORAGE_POLICIES_NEW_REGISTRATION.sql
-- Fix storage bucket policies for pitch-decks, business-plans to work with new registration flow
-- 
-- ISSUE: Storage policies may be using old authentication methods that don't work for new registrations
-- 
-- SOLUTION: Update policies to check startups.user_id = auth.uid() based on folder path
-- Files are stored as: {startupId}/filename or {startupId}/folder/filename

-- =====================================================
-- STEP 1: PITCH-DECKS BUCKET POLICIES
-- =====================================================
-- Files stored as: {startupId}/pitch-decks/filename or {startupId}/one-pagers/filename

-- Drop old policies that might conflict
-- Also drop policies with strange names that may have been created incorrectly
DROP POLICY IF EXISTS "pitch-decks-upload" ON storage.objects;
DROP POLICY IF EXISTS "pitch-decks-update" ON storage.objects;
DROP POLICY IF EXISTS "pitch-decks-delete" ON storage.objects;
DROP POLICY IF EXISTS "pitch-decks-view" ON storage.objects;
DROP POLICY IF EXISTS "pitch-decks-delete zvbcpp_0" ON storage.objects;
DROP POLICY IF EXISTS "pitch-decks-update zvbcpp_0" ON storage.objects;
DROP POLICY IF EXISTS "pitch-decks-upload zvbcpp_0" ON storage.objects;
DROP POLICY IF EXISTS "pitch-decks-view zvbcpp_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to download files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete files" ON storage.objects;

-- Policy for INSERT (upload) - allow users to upload to their startup's folder
CREATE POLICY "pitch-decks-upload-own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'pitch-decks' AND
    -- Check if the first folder in the path matches a startup owned by the user
    (storage.foldername(name))[1]::text IN (
        SELECT id::text FROM startups 
        WHERE user_id = auth.uid()
    )
    OR
    -- Or if they are an Admin
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE auth_user_id = auth.uid() 
        AND role = 'Admin'
    )
);

-- Policy for SELECT (read) - allow users to read their startup's files
CREATE POLICY "pitch-decks-read-own" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'pitch-decks' AND
    -- Check if the first folder in the path matches a startup owned by the user
    (storage.foldername(name))[1]::text IN (
        SELECT id::text FROM startups 
        WHERE user_id = auth.uid()
    )
    OR
    -- Or if they are an Admin
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE auth_user_id = auth.uid() 
        AND role = 'Admin'
    )
);

-- Policy for UPDATE (modify) - allow users to update their startup's files
CREATE POLICY "pitch-decks-update-own" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'pitch-decks' AND
    (storage.foldername(name))[1]::text IN (
        SELECT id::text FROM startups 
        WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE auth_user_id = auth.uid() 
        AND role = 'Admin'
    )
)
WITH CHECK (
    bucket_id = 'pitch-decks' AND
    (storage.foldername(name))[1]::text IN (
        SELECT id::text FROM startups 
        WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE auth_user_id = auth.uid() 
        AND role = 'Admin'
    )
);

-- Policy for DELETE - allow users to delete their startup's files
CREATE POLICY "pitch-decks-delete-own" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'pitch-decks' AND
    (storage.foldername(name))[1]::text IN (
        SELECT id::text FROM startups 
        WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE auth_user_id = auth.uid() 
        AND role = 'Admin'
    )
);

-- =====================================================
-- STEP 2: BUSINESS-PLANS BUCKET POLICIES
-- =====================================================
-- Files stored as: {startupId}/business-plan.ext

-- Drop old policies that might conflict
DROP POLICY IF EXISTS "Allow authenticated business plan uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public business plan read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated business plan updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated business plan deletes" ON storage.objects;

-- Policy for INSERT (upload) - allow users to upload to their startup's folder
CREATE POLICY "business-plans-upload-own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'business-plans' AND
    -- Check if the first folder in the path matches a startup owned by the user
    (storage.foldername(name))[1]::text IN (
        SELECT id::text FROM startups 
        WHERE user_id = auth.uid()
    )
    OR
    -- Or if they are an Admin
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE auth_user_id = auth.uid() 
        AND role = 'Admin'
    )
);

-- Policy for SELECT (read) - allow users to read their startup's files
-- Also allow public read for investors to view business plans
CREATE POLICY "business-plans-read-own" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'business-plans' AND
    -- Check if the first folder in the path matches a startup owned by the user
    (storage.foldername(name))[1]::text IN (
        SELECT id::text FROM startups 
        WHERE user_id = auth.uid()
    )
    OR
    -- Or if they are an Admin
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE auth_user_id = auth.uid() 
        AND role = 'Admin'
    )
);

-- Policy for public read (for investors to view business plans)
CREATE POLICY "business-plans-read-public" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'business-plans');

-- Policy for UPDATE (modify) - allow users to update their startup's files
CREATE POLICY "business-plans-update-own" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'business-plans' AND
    (storage.foldername(name))[1]::text IN (
        SELECT id::text FROM startups 
        WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE auth_user_id = auth.uid() 
        AND role = 'Admin'
    )
)
WITH CHECK (
    bucket_id = 'business-plans' AND
    (storage.foldername(name))[1]::text IN (
        SELECT id::text FROM startups 
        WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE auth_user_id = auth.uid() 
        AND role = 'Admin'
    )
);

-- Policy for DELETE - allow users to delete their startup's files
CREATE POLICY "business-plans-delete-own" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'business-plans' AND
    (storage.foldername(name))[1]::text IN (
        SELECT id::text FROM startups 
        WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE auth_user_id = auth.uid() 
        AND role = 'Admin'
    )
);

-- =====================================================
-- STEP 3: VERIFY BUCKETS EXIST
-- =====================================================

-- Check if buckets exist, create if they don't
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'pitch-decks',
        'pitch-decks',
        true, -- public bucket for easy access
        52428800, -- 50MB limit
        ARRAY['application/pdf']
    ),
    (
        'business-plans',
        'business-plans',
        true, -- public bucket for easy access
        10485760, -- 10MB limit
        ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    )
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- STEP 4: GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO public;
GRANT SELECT ON startups TO authenticated;
GRANT SELECT ON user_profiles TO authenticated;

-- =====================================================
-- STEP 5: VERIFY POLICIES
-- =====================================================

SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_status,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_status
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND (policyname LIKE '%pitch-deck%' OR policyname LIKE '%business-plan%')
ORDER BY policyname, cmd;

-- =====================================================
-- STEP 6: TEST QUERY (for debugging)
-- =====================================================

-- Test if user can see their startup (for debugging)
SELECT 
    auth.uid() as current_auth_user_id,
    s.id as startup_id,
    s.name as startup_name,
    s.user_id as startup_user_id,
    CASE 
        WHEN s.id IS NOT NULL AND s.user_id = auth.uid() THEN '✅ Startup match found'
        WHEN s.id IS NOT NULL THEN '⚠️ Startup exists but user_id mismatch'
        ELSE '⚠️ No startup found for this user'
    END as status
FROM startups s
WHERE s.user_id = auth.uid()
LIMIT 1;

