# Create IP/Trademark Storage Bucket

## Step-by-Step Instructions

### Via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Log in to [supabase.com](https://supabase.com)
   - Select your project
   - Click on **Storage** in the left sidebar

2. **Create New Bucket**
   - Click **"New bucket"** or **"Create a new bucket"**
   - Fill in the details:
     - **Name**: `ip-trademark-documents` (exact name, no spaces)
     - **Public bucket**: ✅ **Yes** (check this box - important!)
     - **File size limit**: `50` MB
     - **Allowed MIME types**: (leave empty for all types, or add):
       ```
       application/pdf,image/jpeg,image/png,image/gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
       ```
   - Click **"Create bucket"**

3. **Set Up Storage Policies**
   - Go to **Storage** → **Policies** (or click on the bucket name, then Policies)
   - Click **"New Policy"**
   - Choose **"Create a policy from scratch"** or **"For full customization"**
   - Fill in:
     - **Policy name**: `Public Access to ip-trademark-documents`
     - **Allowed operation**: `All` (or select: SELECT, INSERT, UPDATE, DELETE)
     - **Target roles**: `public` (or `authenticated` if you want to restrict to logged-in users)
     - **Policy definition (USING expression)**:
       ```sql
       bucket_id = 'ip-trademark-documents'
       ```
     - **WITH CHECK expression** (if available):
       ```sql
       bucket_id = 'ip-trademark-documents'
       ```
   - Click **"Review"** then **"Save policy"**

4. **Verify**
   - Go back to **Storage** → **Buckets**
   - You should see `ip-trademark-documents` in the list
   - Click on it to verify it's set to **Public**

## After Creating the Bucket

Once the bucket is created, the code will automatically use it. The bucket name `ip-trademark-documents` is now configured in the service file.

## File Organization

Files will be stored like this:
```
ip-trademark-documents/
├── record-id-1_timestamp.pdf
├── record-id-2_timestamp.jpg
└── record-id-3_timestamp.docx
```

## Troubleshooting

- **If uploads still fail**: Make sure the bucket is set to **Public**
- **If you get permission errors**: Check that the storage policy was created correctly
- **If files don't appear**: Refresh the page and check the bucket in Storage dashboard

