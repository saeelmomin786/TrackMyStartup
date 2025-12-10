# Manual Setup: Investor Assets Storage Policies

Since SQL requires owner permissions, set up the policies through the Supabase Dashboard.

## Step-by-Step Instructions

### 1. Navigate to Storage Policies
1. Go to your **Supabase Dashboard**
2. Click **Storage** in the left sidebar
3. Click on the **`investor-assets`** bucket
4. Click on the **"Policies"** tab at the top

### 2. Create Policy 1: Public Read Access

Click **"New Policy"** and fill in:

**Basic Settings:**
- **Policy name**: `Public can view investor assets`
- **Allowed operation**: Select **`SELECT`**
- **Target roles**: Select **`public`**

**Policy definition:**
- **USING expression**:
```sql
bucket_id = 'investor-assets'
```

Click **"Review"** then **"Save policy"**

---

### 3. Create Policy 2: Authenticated Upload

Click **"New Policy"** and fill in:

**Basic Settings:**
- **Policy name**: `Investors can upload their own assets`
- **Allowed operation**: Select **`INSERT`**
- **Target roles**: Select **`authenticated`**

**Policy definition:**
- **WITH CHECK expression**:
```sql
bucket_id = 'investor-assets'
```

Click **"Review"** then **"Save policy"**

---

### 4. Create Policy 3: Authenticated Update

Click **"New Policy"** and fill in:

**Basic Settings:**
- **Policy name**: `Investors can update their own assets`
- **Allowed operation**: Select **`UPDATE`**
- **Target roles**: Select **`authenticated`**

**Policy definition:**
- **USING expression**:
```sql
bucket_id = 'investor-assets'
```
- **WITH CHECK expression**:
```sql
bucket_id = 'investor-assets'
```

Click **"Review"** then **"Save policy"**

---

### 5. Create Policy 4: Authenticated Delete

Click **"New Policy"** and fill in:

**Basic Settings:**
- **Policy name**: `Investors can delete their own assets`
- **Allowed operation**: Select **`DELETE`**
- **Target roles**: Select **`authenticated`**

**Policy definition:**
- **USING expression**:
```sql
bucket_id = 'investor-assets'
```

Click **"Review"** then **"Save policy"**

---

## Verification

After creating all 4 policies, you should see them listed in the Policies tab:
1. ✅ Public can view investor assets (SELECT)
2. ✅ Investors can upload their own assets (INSERT)
3. ✅ Investors can update their own assets (UPDATE)
4. ✅ Investors can delete their own assets (DELETE)

## Test the Upload

1. Go to your app's Investor Profile page
2. Try uploading a logo
3. It should work now! 🎉

## Troubleshooting

If upload still fails:
- Check browser console for error messages
- Verify all 4 policies are created
- Make sure the bucket is set to **Public**
- Check that you're logged in (authenticated)



