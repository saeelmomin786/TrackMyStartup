# Setup Mentor Proof Documents Storage Bucket

## Option 1: Using Supabase Dashboard (Recommended - No SQL Permissions Needed)

### Step 1: Create the Bucket

1. Go to your **Supabase Dashboard**
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"** button
4. Enter the following:
   - **Name**: `mentor-proof-documents`
   - **Public bucket**: ✅ Check this (so documents are publicly accessible)
   - **File size limit**: `10485760` (10MB = 10 * 1024 * 1024 bytes)
   - **Allowed MIME types**: 
     - `application/pdf`
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - `application/vnd.ms-excel`
     - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
     - `image/jpeg`
     - `image/jpg`
     - `image/png`
     - `image/gif`
     - `image/webp`
5. Click **"Create bucket"**

### Step 2: Set Up RLS Policies

1. Click on the **"mentor-proof-documents"** bucket you just created
2. Go to the **"Policies"** tab
3. Click **"New Policy"**

#### Policy 1: Public Read Access
- **Policy name**: `Public can view mentor proof documents`
- **Allowed operation**: `SELECT`
- **Target roles**: `public`
- **USING expression**:
```sql
bucket_id = 'mentor-proof-documents'
```
- Click **"Review"** then **"Save policy"**

#### Policy 2: Authenticated Upload
- **Policy name**: `Mentors can upload proof documents`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **WITH CHECK expression**:
```sql
bucket_id = 'mentor-proof-documents'
```
- Click **"Review"** then **"Save policy"**

#### Policy 3: Authenticated Read
- **Policy name**: `Mentors can read their proof documents`
- **Allowed operation**: `SELECT`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'mentor-proof-documents'
```
- Click **"Review"** then **"Save policy"**

#### Policy 4: Authenticated Update
- **Policy name**: `Mentors can update their proof documents`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'mentor-proof-documents'
```
- **WITH CHECK expression**:
```sql
bucket_id = 'mentor-proof-documents'
```
- Click **"Review"** then **"Save policy"**

#### Policy 5: Authenticated Delete
- **Policy name**: `Mentors can delete their proof documents`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**:
```sql
bucket_id = 'mentor-proof-documents'
```
- Click **"Review"** then **"Save policy"**

### Step 3: Verify Setup

1. Go back to the **Storage** page
2. You should see the `mentor-proof-documents` bucket listed
3. Click on it and verify the policies are all created

## Option 2: Using SQL (If you have owner permissions)

If you have owner permissions, you can run the `CREATE_MENTOR_PROOF_DOCUMENTS_BUCKET.sql` script in the SQL Editor.

## Notes

- The bucket is public for easy access to proof documents
- File path structure: `{userId}/{filename}` within the bucket
- File size limit: 10MB
- All authenticated users can upload, update, and delete their proof documents
- Public can read all files in the bucket

