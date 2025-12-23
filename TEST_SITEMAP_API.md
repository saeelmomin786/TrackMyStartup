# 🧪 Test Sitemap API - Quick Diagnostic

## Step 1: Check Vercel Function Logs

The updated sitemap API now has detailed logging. Let's see what's happening:

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**: Track My Startup
3. **Go to "Deployments" tab**
4. **Click on the latest deployment** (should be the one we just pushed)
5. **Click on "Functions" tab**
6. **Click on `api/sitemap.xml`**
7. **Look for logs starting with `[SITEMAP]`**

### What to Look For:

**If you see:**
```
[SITEMAP ERROR] Missing Supabase configuration: {
  hasUrl: false,
  hasKey: false
}
```
→ **Solution**: Environment variables are missing in Vercel

**If you see:**
```
[SITEMAP ERROR] Failed to fetch startups: {
  message: "new row violates row-level security policy",
  code: "42501"
}
```
→ **Solution**: RLS policies are blocking access

**If you see:**
```
[SITEMAP ERROR] Failed to fetch startups: {
  message: "relation \"startups_public\" does not exist",
  code: "42P01"
}
```
→ **Solution**: Table/view doesn't exist

**If you see:**
```
[SITEMAP] Found 0 startups
[SITEMAP] No startups found
```
→ **Solution**: No data in tables, or RLS is blocking

---

## Step 2: Verify Environment Variables

1. **Go to Vercel Dashboard** → Your Project
2. **Go to "Settings"** → **"Environment Variables"**
3. **Check if these exist:**
   - ✅ `SUPABASE_URL` OR `VITE_SUPABASE_URL`
   - ✅ `SUPABASE_ANON_KEY` OR `VITE_SUPABASE_ANON_KEY`

4. **If missing, add them:**
   - Get from Supabase Dashboard → Settings → API
   - Add to Vercel → Settings → Environment Variables
   - **Important**: Select **Production**, **Preview**, and **Development**
   - Click **"Save"**
   - **Redeploy** after adding

---

## Step 3: Test Directly in Supabase

Let's verify the data exists and is accessible:

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Go to "SQL Editor"**
3. **Run these queries:**

### Test 1: Check if startups_public exists
```sql
SELECT COUNT(*) FROM startups_public;
```

### Test 2: Check if startups table exists (fallback)
```sql
SELECT COUNT(*) FROM startups;
```

### Test 3: Check if mentor_profiles exists
```sql
SELECT COUNT(*) FROM mentor_profiles;
```

### Test 4: Test with anon role (what sitemap uses)
```sql
-- Switch to anon role
SET ROLE anon;

-- Try to query
SELECT COUNT(*) FROM startups_public;

-- If this fails, RLS is blocking
```

---

## Step 4: Quick Fix - Add Environment Variables

If environment variables are missing:

1. **Get Supabase URL and Key:**
   - Go to Supabase Dashboard → Settings → API
   - Copy **Project URL** → This is `SUPABASE_URL`
   - Copy **anon/public key** → This is `SUPABASE_ANON_KEY`

2. **Add to Vercel:**
   - Vercel Dashboard → Settings → Environment Variables
   - Click **"Add New"**
   - Name: `SUPABASE_URL`
   - Value: `https://your-project.supabase.co`
   - Environments: ✅ Production, ✅ Preview, ✅ Development
   - Click **"Save"**
   - Repeat for `SUPABASE_ANON_KEY`

3. **Redeploy:**
   - Go to "Deployments" tab
   - Click **"Redeploy"** on latest deployment
   - Or push a new commit

---

## Step 5: Check RLS Policies

If environment variables are set but still failing:

1. **Go to Supabase Dashboard**
2. **Go to "Authentication"** → **"Policies"**
3. **For each table, check:**

### For `startups_public` view:
- Should allow `SELECT` for `anon` role
- If using `startups` table, should allow `SELECT` for `anon` role

### For `mentor_profiles`:
- Should allow `SELECT` for `anon` role

### Quick Fix - Allow Public Read:
Run this in Supabase SQL Editor:

```sql
-- Allow public read access to startups_public (if it's a view)
-- Note: Views inherit RLS from underlying tables

-- Allow public read access to startups table
CREATE POLICY "Public can view startups for sitemap" ON startups
FOR SELECT
TO anon
USING (true);

-- Allow public read access to mentor_profiles
CREATE POLICY "Public can view mentor profiles for sitemap" ON mentor_profiles
FOR SELECT
TO anon
USING (true);

-- Allow public read access to investor_profiles
CREATE POLICY "Public can view investor profiles for sitemap" ON investor_profiles
FOR SELECT
TO anon
USING (true);

-- Allow public read access to investment_advisor_profiles
CREATE POLICY "Public can view advisor profiles for sitemap" ON investment_advisor_profiles
FOR SELECT
TO anon
USING (true);
```

---

## 📋 Share the Results

Please share:
1. **What you see in Vercel logs** (especially `[SITEMAP ERROR]` messages)
2. **Whether environment variables are set** in Vercel
3. **Results of the Supabase queries** (how many rows in each table)

This will help me diagnose the exact issue! 🔍


