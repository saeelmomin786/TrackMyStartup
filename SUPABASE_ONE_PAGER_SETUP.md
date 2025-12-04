# Supabase Setup for One-Pager PDF Storage

This guide explains how to set up Supabase to store one-pager PDFs and link them to fundraising details.

## Steps Required:

### 1. Add Column to Database Table

Run the SQL migration script `ADD_ONE_PAGER_URL_TO_FUNDRAISING.sql` in your Supabase SQL Editor:

**Option A: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `ADD_ONE_PAGER_URL_TO_FUNDRAISING.sql`
5. Click **Run** or press `Ctrl+Enter`

**Option B: Direct SQL Command**
```sql
ALTER TABLE fundraising_details 
ADD COLUMN IF NOT EXISTS one_pager_url TEXT;
```

### 2. Verify Storage Bucket Exists

The code uses the `pitch-decks` storage bucket. Verify it exists:

1. Go to **Storage** in your Supabase dashboard
2. Check if `pitch-decks` bucket exists
3. If it doesn't exist, create it:
   - Click **New bucket**
   - Name: `pitch-decks`
   - Public: **Yes** (if you want public URLs) or **No** (if you want signed URLs)
   - File size limit: Set appropriate limit (e.g., 50MB)
   - Allowed MIME types: `application/pdf`

### 3. Set Storage Bucket Policies (RLS)

Ensure proper Row Level Security (RLS) policies are set for the `pitch-decks` bucket:

**For Startups to upload their own PDFs:**
```sql
-- Allow startups to upload files to their own folder
CREATE POLICY "Startups can upload one-pagers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pitch-decks' AND
  (storage.foldername(name))[1]::text = (SELECT id::text FROM startups WHERE id IN (
    SELECT startup_id FROM user_profiles WHERE email = auth.email()
  ))
);

-- Allow startups to read their own files
CREATE POLICY "Startups can read their one-pagers"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'pitch-decks' AND
  (storage.foldername(name))[1]::text = (SELECT id::text FROM startups WHERE id IN (
    SELECT startup_id FROM user_profiles WHERE email = auth.email()
  ))
);

-- Allow startups to delete their own files
CREATE POLICY "Startups can delete their one-pagers"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'pitch-decks' AND
  (storage.foldername(name))[1]::text = (SELECT id::text FROM startups WHERE id IN (
    SELECT startup_id FROM user_profiles WHERE email = auth.email()
  ))
);
```

**For Public Access (if bucket is public):**
```sql
-- Allow public read access to one-pagers
CREATE POLICY "Public can read one-pagers"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'pitch-decks');
```

### 4. Verify the Setup

After completing the above steps:

1. **Check Column Exists:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'fundraising_details' 
   AND column_name = 'one_pager_url';
   ```

2. **Test Storage Access:**
   - Try uploading a PDF through the app
   - Check if it appears in the `pitch-decks` bucket under `{startup_id}/one-pagers/`

3. **Check Database Record:**
   ```sql
   SELECT id, startup_id, one_pager_url 
   FROM fundraising_details 
   WHERE one_pager_url IS NOT NULL;
   ```

## File Structure in Storage

PDFs will be stored in the following structure:
```
pitch-decks/
  └── {startup_id}/
      └── one-pagers/
          └── one-pager.pdf
```

## Troubleshooting

### Error: "Could not find the 'one_pager_url' column"
- **Solution:** Run the SQL migration script to add the column

### Error: "Bucket not found"
- **Solution:** Create the `pitch-decks` bucket in Storage settings

### Error: "Permission denied"
- **Solution:** Check RLS policies for the storage bucket

### Error: "File upload failed"
- **Solution:** 
  - Check file size limits
  - Verify MIME type is allowed
  - Check storage bucket policies

## Notes

- The PDF will be replaced each time the user clicks "Save" (same filename: `one-pager.pdf`)
- Old PDFs in the `one-pagers` folder are automatically deleted before uploading a new one
- The URL is stored in the `fundraising_details` table for easy retrieval

