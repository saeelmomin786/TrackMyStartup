-- CLEANUP_DUPLICATE_STORAGE_POLICIES.sql
-- Remove duplicate/old storage policies that may conflict or pose security risks
-- This script safely removes policies with strange names and public access

-- 1. Check current policies before cleanup
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual as using_clause,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND (policyname LIKE '%pitch-deck%' OR policyname LIKE '%business-plan%')
ORDER BY policyname, cmd;

-- 2. Drop duplicate/old policies that may conflict or pose security risks
-- These policies have strange names and/or public access which is a security concern

-- Drop old pitch-decks policies with strange names
DROP POLICY IF EXISTS "pitch-decks-delete zvbcpp_0" ON storage.objects;
DROP POLICY IF EXISTS "pitch-decks-update zvbcpp_0" ON storage.objects;
DROP POLICY IF EXISTS "pitch-decks-upload zvbcpp_0" ON storage.objects;
DROP POLICY IF EXISTS "pitch-decks-view zvbcpp_0" ON storage.objects;

-- Drop any other old policies that might conflict
DROP POLICY IF EXISTS "pitch-decks-upload" ON storage.objects;
DROP POLICY IF EXISTS "pitch-decks-update" ON storage.objects;
DROP POLICY IF EXISTS "pitch-decks-delete" ON storage.objects;
DROP POLICY IF EXISTS "pitch-decks-view" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to download files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated business plan uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public business plan read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated business plan updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated business plan deletes" ON storage.objects;

-- 3. Verify policies after cleanup
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

-- Expected policies after cleanup:
-- For pitch-decks:
-- - pitch-decks-upload-own (INSERT, authenticated)
-- - pitch-decks-read-own (SELECT, authenticated)
-- - pitch-decks-update-own (UPDATE, authenticated)
-- - pitch-decks-delete-own (DELETE, authenticated)
--
-- For business-plans:
-- - business-plans-upload-own (INSERT, authenticated)
-- - business-plans-read-own (SELECT, authenticated)
-- - business-plans-read-public (SELECT, public - for investors)
-- - business-plans-update-own (UPDATE, authenticated)
-- - business-plans-delete-own (DELETE, authenticated)

-- 4. Security check: Verify no public policies exist for write operations
SELECT 
    '⚠️ SECURITY WARNING: Public write policies found!' as warning,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND (policyname LIKE '%pitch-deck%' OR policyname LIKE '%business-plan%')
AND roles::text LIKE '%public%'
AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
ORDER BY policyname;

-- If the above query returns any rows, those policies should be removed for security



