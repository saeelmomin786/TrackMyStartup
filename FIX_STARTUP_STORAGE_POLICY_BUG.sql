-- Fix the broken startup_documents_insert and startup_documents_select policies

-- Drop the broken policies
DROP POLICY IF EXISTS "startup_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "startup_documents_select" ON storage.objects;

-- Recreate with correct syntax (using 'name' instead of 's.name')
CREATE POLICY "startup_documents_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'startup-documents'
  AND EXISTS (
    SELECT 1
    FROM startups s
    WHERE s.user_id = auth.uid()
    AND s.id::text = (storage.foldername(name))[1]  -- FIXED: use 'name' instead of 's.name'
  )
);

CREATE POLICY "startup_documents_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'startup-documents'
  AND EXISTS (
    SELECT 1
    FROM startups s
    WHERE s.user_id = auth.uid()
    AND s.id::text = (storage.foldername(name))[1]  -- FIXED: use 'name' instead of 's.name'
  )
);

-- Verify the fix
SELECT 
    'UPDATED POLICIES' as check_type,
    policyname as "Policy_Name",
    cmd as "Command",
    with_check as "With_Check (INSERT)",
    qual as "Using (SELECT)"
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname IN ('startup_documents_insert', 'startup_documents_select')
ORDER BY policyname;
