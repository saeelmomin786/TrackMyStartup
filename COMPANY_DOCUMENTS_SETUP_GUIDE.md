# Company Documents Storage Setup Guide

## Quick Fix for "Bucket not found" Error

If you're seeing the error: **"Storage bucket 'company-documents' does not exist"**, follow these steps:

## Option 1: Using Supabase Dashboard (Easiest)

### Step 1: Create the Storage Bucket
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **"Create a new bucket"** button

### Step 2: Configure the Bucket
Fill in the following details:
- **Name**: `company-documents` (must be exactly this, case-sensitive)
- **Public bucket**: ✅ **Yes** (check this box - important!)
- **File size limit**: `52428800` (50MB in bytes) or just `50` MB
- **Allowed MIME types**: Leave empty (allows all types) OR add:
  ```
  application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,image/jpeg,image/jpg,image/png,image/gif,video/mp4,video/avi,application/zip,application/x-rar-compressed
  ```

5. Click **"Create bucket"**

### Step 3: Set Up Storage Policies (Recommended)
1. Click on the **"company-documents"** bucket you just created
2. Go to the **"Policies"** tab
3. Click **"New Policy"**

#### Policy 1: Users can view company documents
- **Policy name**: `Users can view company documents for their startups`
- **Allowed operation**: `SELECT`
- **Target roles**: `authenticated`
- **USING expression**:
  ```sql
  bucket_id = 'company-documents' AND
  (storage.foldername(name))[1] IN (
      SELECT id::text FROM startups 
      WHERE user_id = auth.uid()
  )
  ```

#### Policy 2: Users can upload company documents
- **Policy name**: `Users can upload company documents for their startups`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **WITH CHECK expression**:
  ```sql
  bucket_id = 'company-documents' AND
  (storage.foldername(name))[1] IN (
      SELECT id::text FROM startups 
      WHERE user_id = auth.uid()
  )
  ```

#### Policy 3: Users can update company documents
- **Policy name**: `Users can update company documents for their startups`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **USING expression**: Same as Policy 1
- **WITH CHECK expression**: Same as Policy 2

#### Policy 4: Users can delete company documents
- **Policy name**: `Users can delete company documents for their startups`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**: Same as Policy 1

## Option 2: Using SQL (Faster)

If you prefer to use SQL, run the SQL script:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `COMPANY_DOCUMENTS_STORAGE_SETUP.sql`
4. Click **"Run"**

This will create the bucket and all necessary policies automatically.

## Verify Setup

After creating the bucket:
1. Try uploading a document again in the Company Documents section
2. Check that the file appears in the bucket in Supabase Dashboard
3. Verify you can view and download the uploaded document

## Troubleshooting

### Still getting "Bucket not found" error?
- ✅ Double-check the bucket name is exactly `company-documents` (case-sensitive)
- ✅ Ensure the bucket is marked as **Public**
- ✅ Verify you're in the correct Supabase project

### Getting "Permission denied" error?
- ✅ Make sure you're logged in
- ✅ Verify the storage policies are set up correctly
- ✅ Check that the bucket is public

### File upload fails?
- ✅ Check file size (should be under 50MB)
- ✅ Verify file type is allowed
- ✅ Try a smaller file first to test

## Need Help?

If you continue to experience issues:
1. Check the browser console for detailed error messages
2. Verify your Supabase project settings
3. Make sure you have the correct permissions in your Supabase project

