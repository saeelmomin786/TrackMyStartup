# Investor Assets Storage Bucket Setup Instructions

## Option 1: Using Supabase Dashboard (Recommended)

### Step 1: Create the Bucket
1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"** button
4. Enter the following:
   - **Name**: `investor-assets`
   - **Public bucket**: ✅ Check this (so logos are publicly accessible)
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: 
     - `image/jpeg`
     - `image/jpg`
     - `image/png`
     - `image/gif`
     - `image/webp`
     - `image/svg+xml`
5. Click **"Create bucket"**

### Step 2: Set Up RLS Policies
1. Click on the **"investor-assets"** bucket you just created
2. Go to the **"Policies"** tab
3. Click **"New Policy"**

#### Policy 1: Public Read Access
- **Policy name**: `Public can view investor assets`
- **Allowed operation**: `SELECT`
- **Target roles**: `public`
- **USING expression**:
```sql
bucket_id = 'investor-assets'
```
- Click **"Review"** then **"Save policy"**

#### Policy 2: Authenticated Upload
- **Policy name**: `Investors can upload their own assets`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **WITH CHECK expression**:
```sql
bucket_id = 'investor-assets'
```
- Click **"Review"** then **"Save policy"**

#### Policy 3: Authenticated Update
- **Policy name**: `Investors can update their own assets`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'investor-assets'
```
- **WITH CHECK expression**:
```sql
bucket_id = 'investor-assets'
```
- Click **"Review"** then **"Save policy"**

#### Policy 4: Authenticated Delete
- **Policy name**: `Investors can delete their own assets`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'investor-assets'
```
- Click **"Review"** then **"Save policy"**

## Option 2: Using SQL (If you have proper permissions)

If you have owner/admin permissions, you can run:
- `CREATE_INVESTOR_ASSETS_BUCKET.sql` (full version with policies)
- Or `CREATE_INVESTOR_ASSETS_BUCKET_SIMPLE.sql` (bucket only, then set policies manually)

## Verification

After setup, test the upload functionality:
1. Go to Investor Profile in your app
2. Try uploading a logo
3. If successful, the logo should appear in the preview

## Troubleshooting

### Error: "Bucket not found"
- Make sure the bucket name is exactly `investor-assets`
- Check that the bucket was created successfully

### Error: "Permission denied" or "new row violates row-level security"
- Make sure all 4 RLS policies are created
- Verify the policies have the correct expressions
- Check that the bucket is set to public

### Error: "File size too large"
- The limit is 5MB
- Try compressing the image or using a smaller file

### Error: "Invalid file type"
- Only image files are allowed (JPEG, PNG, GIF, WebP, SVG)
- Make sure the file extension matches the file type


