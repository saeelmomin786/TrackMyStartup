-- Force drop and recreate with explicit column reference

DROP POLICY IF EXISTS "startup_documents_insert" ON storage.objects CASCADE;
DROP POLICY IF EXISTS "startup_documents_select" ON storage.objects CASCADE;

-- Recreate INSERT policy with correct file path reference
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
    AND s.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

-- Recreate SELECT policy with correct file path reference  
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
    AND s.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

-- Verify
SELECT policyname, with_check, qual FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
AND policyname IN ('startup_documents_insert', 'startup_documents_select');
