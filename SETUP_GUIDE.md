# Supabase Storage Setup Guide

## Required Storage Buckets

To enable file uploads in the application, you need to create the following storage buckets in your Supabase project:

### 1. Go to Supabase Dashboard
1. Open your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **Create a new bucket**

### 2. Create Required Buckets

Create these buckets one by one:

#### Bucket 1: `verification-documents`
- **Purpose**: Store government IDs, licenses, and verification documents
- **Settings**: 
  - Public bucket: ✅ Yes
  - File size limit: 50MB
  - Allowed MIME types: `application/pdf`, `image/*`

#### Bucket 2: `startup-documents`
- **Purpose**: Store startup-related documents
- **Settings**:
  - Public bucket: ✅ Yes
  - File size limit: 50MB
  - Allowed MIME types: `application/pdf`, `image/*`

#### Bucket 3: `pitch-decks`
- **Purpose**: Store pitch deck presentations
- **Settings**:
  - Public bucket: ✅ Yes
  - File size limit: 100MB
  - Allowed MIME types: `application/pdf`, `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`

#### Bucket 4: `pitch-videos`
- **Purpose**: Store pitch videos
- **Settings**:
  - Public bucket: ✅ Yes
  - File size limit: 500MB
  - Allowed MIME types: `video/*`

#### Bucket 5: `financial-documents`
- **Purpose**: Store financial records and documents
- **Settings**:
  - Public bucket: ✅ Yes
  - File size limit: 50MB
  - Allowed MIME types: `application/pdf`, `image/*`

#### Bucket 6: `employee-contracts`
- **Purpose**: Store employee contracts and agreements
- **Settings**:
  - Public bucket: ✅ Yes
  - File size limit: 50MB
  - Allowed MIME types: `application/pdf`, `image/*`

#### Bucket 7: `company-documents`
- **Purpose**: Store company documents in the startup dashboard
- **Settings**:
  - Public bucket: ✅ Yes
  - File size limit: 50MB
  - Allowed MIME types: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `text/plain`, `image/jpeg`, `image/jpg`, `image/png`, `image/gif`, `video/mp4`, `video/avi`, `application/zip`, `application/x-rar-compressed`

### 3. Storage Policies (Optional)

After creating the buckets, you can set up storage policies for better security:

1. Go to **Storage** → **Policies**
2. For each bucket, create policies:
   - **Upload Policy**: Allow authenticated users to upload files
   - **Download Policy**: Allow public access to download files

### 4. Test File Upload

After creating the buckets:
1. Try registering a new user with file uploads
2. Check the browser console for any storage-related errors
3. Verify files appear in the respective buckets in Supabase Dashboard

## Troubleshooting

### "Bucket does not exist" Error
- Make sure you've created all required buckets
- Check bucket names match exactly (case-sensitive)
- Ensure buckets are set to public

### "Permission denied" Error
- Check if you're authenticated
- Verify storage policies allow uploads
- Ensure bucket is public

### "Upload timeout" Error
- Check file size (should be under bucket limit)
- Verify file type is allowed
- Try uploading a smaller file first

## Quick Commands (Supabase CLI)

If you have Supabase CLI installed:

```bash
# Create all buckets at once
supabase storage create-bucket verification-documents --public
supabase storage create-bucket startup-documents --public
supabase storage create-bucket pitch-decks --public
supabase storage create-bucket pitch-videos --public
supabase storage create-bucket financial-documents --public
supabase storage create-bucket employee-contracts --public
supabase storage create-bucket company-documents --public
```

## Quick Setup Using SQL

Alternatively, you can run the SQL setup file to create the `company-documents` bucket and its policies:

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Run the SQL from `COMPANY_DOCUMENTS_STORAGE_SETUP.sql` file
