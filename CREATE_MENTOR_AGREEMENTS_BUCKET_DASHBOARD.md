# Create Mentor Agreements Storage Bucket

## ⚠️ IMPORTANT: Use Dashboard Method

**The SQL script will fail with "must be owner of table objects" error.**  
**You MUST create the bucket and policies via the Supabase Dashboard.**

## Quick Setup via Supabase Dashboard

Follow these steps to create the bucket manually:

### Step 1: Create the Bucket

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New bucket"** or **"Create a new bucket"**
3. Fill in the details:
   - **Name**: `mentor-agreements` (exact name, case-sensitive)
   - **Public bucket**: ✅ **Yes** (check this box - important!)
   - **File size limit**: `50` MB (or `52428800` bytes)
   - **Allowed MIME types** (optional, leave empty for all types):
     ```
     application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png
     ```
4. Click **"Create bucket"**

### Step 2: Set Up Storage Policies

1. Go to **Storage** → **Policies** (or click on the `mentor-agreements` bucket, then **Policies** tab)
2. Click **"New Policy"**
3. Choose **"Create a policy from scratch"**

#### Policy 1: Upload Agreements
- **Policy name**: `Authenticated users can upload mentor agreements`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **Policy definition (WITH CHECK)**:
  ```sql
  bucket_id = 'mentor-agreements'
  ```
- Click **"Review"** then **"Save policy"**

#### Policy 2: View Agreements
- **Policy name**: `Authenticated users can view mentor agreements`
- **Allowed operation**: `SELECT`
- **Target roles**: `authenticated`
- **Policy definition (USING)**:
  ```sql
  bucket_id = 'mentor-agreements'
  ```
- Click **"Review"** then **"Save policy"**

#### Policy 3: Public Read Access (Optional)
- **Policy name**: `Public can read mentor agreements`
- **Allowed operation**: `SELECT`
- **Target roles**: `public`
- **Policy definition (USING)**:
  ```sql
  bucket_id = 'mentor-agreements'
  ```
- Click **"Review"** then **"Save policy"**

### Step 3: Verify

1. Go back to **Storage** → **Buckets**
2. You should see `mentor-agreements` in the list
3. Click on it to verify it's set to **Public**
4. Check the **Policies** tab to see the policies you created

## After Setup

Once the bucket is created, the agreement upload should work. The bucket name `mentor-agreements` is already configured in the code.
