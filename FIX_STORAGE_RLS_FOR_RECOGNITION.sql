-- Check and fix RLS policies for startup-documents storage bucket

-- 1. Check current policies on the bucket
SELECT 
    'CURRENT STORAGE POLICIES' as check_type,
    policyname as "Policy_Name",
    definition as "Policy_Definition"
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%startup%'
ORDER BY policyname;

-- 2. Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing startup-documents policies if they exist
DROP POLICY IF EXISTS "Startups can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Startups can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Startups can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Startups can delete their own documents" ON storage.objects;

-- 4. Create policies to allow startups to manage their documents
-- Policy for INSERT (upload)
CREATE POLICY "Startups can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'startup-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM startups
    WHERE user_id = auth.uid()
  )
);

-- Policy for SELECT (view/download)
CREATE POLICY "Startups can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'startup-documents'
  AND (
    -- Startups can view their own folder
    (storage.foldername(name))[1] IN (
      SELECT id::text
      FROM startups
      WHERE user_id = auth.uid()
    )
    OR
    -- Facilitators can view documents in their recognition records
    (storage.foldername(name))[1]::integer IN (
      SELECT startup_id
      FROM recognition_records
      WHERE facilitator_code IN (
        SELECT facilitator_code
        FROM user_profiles
        WHERE auth_user_id = auth.uid()
      )
    )
  )
);

-- Policy for UPDATE
CREATE POLICY "Startups can update their own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'startup-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM startups
    WHERE user_id = auth.uid()
  )
);

-- Policy for DELETE
CREATE POLICY "Startups can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'startup-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM startups
    WHERE user_id = auth.uid()
  )
);

-- 5. Verify the policies were created
SELECT 
    'UPDATED STORAGE POLICIES' as check_type,
    policyname as "Policy_Name",
    cmd as "Command"
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%Startups can%'
ORDER BY policyname;
