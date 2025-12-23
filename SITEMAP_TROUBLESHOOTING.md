# 🔧 Sitemap Troubleshooting Guide

## ❌ Problem: Sitemap Only Shows Homepage

Your sitemap at `https://www.trackmystartup.com/api/sitemap.xml` only shows the homepage and no startup/mentor/investor/advisor profiles.

---

## 🔍 Step 1: Check Vercel Function Logs

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**: Track My Startup
3. **Go to "Functions" tab**
4. **Click on `api/sitemap.xml`**
5. **Check the logs** for errors like:
   - `[SITEMAP ERROR] Missing Supabase configuration`
   - `[SITEMAP ERROR] Failed to fetch startups`
   - `[SITEMAP ERROR] Failed to fetch mentors`

---

## 🔍 Step 2: Verify Environment Variables in Vercel

The sitemap API needs these environment variables:

### **Required Variables:**
- `SUPABASE_URL` OR `VITE_SUPABASE_URL`
- `SUPABASE_ANON_KEY` OR `VITE_SUPABASE_ANON_KEY`

### **How to Check:**
1. **Go to Vercel Dashboard** → Your Project
2. **Go to "Settings"** → **"Environment Variables"**
3. **Verify these are set:**
   - ✅ `SUPABASE_URL` or `VITE_SUPABASE_URL`
   - ✅ `SUPABASE_ANON_KEY` or `VITE_SUPABASE_ANON_KEY`

### **If Missing:**
1. **Get values from Supabase:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to **Settings** → **API**
   - Copy **Project URL** → Use as `SUPABASE_URL` or `VITE_SUPABASE_URL`
   - Copy **anon/public key** → Use as `SUPABASE_ANON_KEY` or `VITE_SUPABASE_ANON_KEY`

2. **Add to Vercel:**
   - Go to Vercel → Settings → Environment Variables
   - Add each variable
   - **Important**: Select **"Production"**, **"Preview"**, and **"Development"** environments
   - Click **"Save"**

3. **Redeploy:**
   - Go to **"Deployments"** tab
   - Click **"Redeploy"** on the latest deployment
   - Or push a new commit to trigger redeploy

---

## 🔍 Step 3: Check Database Tables/Views Exist

The sitemap queries these tables/views:

### **Required Tables/Views:**
- ✅ `startups_public` (view) OR `startups` (table)
- ✅ `mentor_profiles` (table)
- ✅ `investor_profiles` (table)
- ✅ `investment_advisor_profiles` (table)

### **How to Check:**
1. **Go to Supabase Dashboard**
2. **Go to "Table Editor"**
3. **Verify these exist:**
   - `startups_public` view OR `startups` table
   - `mentor_profiles` table
   - `investor_profiles` table
   - `investment_advisor_profiles` table

### **If Missing:**
- Run the SQL scripts to create them:
  - `CREATE_STARTUP_PUBLIC_VIEW.sql` (if `startups_public` doesn't exist)
  - `CREATE_MENTOR_PROFILES_TABLE.sql`
  - `CREATE_INVESTOR_PROFILES_TABLE.sql`
  - `CREATE_INVESTMENT_ADVISOR_PROFILES_TABLE.sql`

---

## 🔍 Step 4: Check RLS (Row Level Security) Policies

The sitemap uses the **anon** (anonymous) role, so RLS policies must allow public read access.

### **Check RLS Policies:**

1. **Go to Supabase Dashboard**
2. **Go to "Authentication"** → **"Policies"**
3. **For each table/view, check:**

#### **For `startups_public` view:**
- Should allow `SELECT` for `anon` role
- If using `startups` table, should allow `SELECT` for `anon` role

#### **For `mentor_profiles` table:**
- Should allow `SELECT` for `anon` role

#### **For `investor_profiles` table:**
- Should allow `SELECT` for `anon` role

#### **For `investment_advisor_profiles` table:**
- Should allow `SELECT` for `anon` role

### **If RLS is Blocking:**

Run this SQL in Supabase SQL Editor to allow public read access:

```sql
-- Allow public read access to startups_public view
ALTER VIEW startups_public SET (security_invoker = true);

-- Allow public read access to mentor_profiles
CREATE POLICY "Public can view mentor profiles" ON mentor_profiles
FOR SELECT
TO anon
USING (true);

-- Allow public read access to investor_profiles
CREATE POLICY "Public can view investor profiles" ON investor_profiles
FOR SELECT
TO anon
USING (true);

-- Allow public read access to investment_advisor_profiles
CREATE POLICY "Public can view advisor profiles" ON investment_advisor_profiles
FOR SELECT
TO anon
USING (true);
```

---

## 🔍 Step 5: Test the Sitemap API Locally

1. **Set up local environment:**
   ```bash
   # Create .env file with:
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   ```

2. **Run the API locally:**
   ```bash
   # If using Vercel CLI
   vercel dev
   
   # Or test the function directly
   ```

3. **Check the output:**
   - Visit: `http://localhost:3000/api/sitemap.xml`
   - Should see all profiles in XML

---

## 🔍 Step 6: Check for Data

Even if everything is configured correctly, the sitemap will be empty if there's no data:

### **Verify Data Exists:**
1. **Go to Supabase Dashboard**
2. **Go to "Table Editor"**
3. **Check each table:**
   - `startups_public` or `startups` → Should have rows
   - `mentor_profiles` → Should have rows
   - `investor_profiles` → Should have rows
   - `investment_advisor_profiles` → Should have rows

### **Check Required Fields:**
- `startups.name` → Must not be NULL
- `mentor_profiles.mentor_name` → Must not be NULL
- `investor_profiles.investor_name` → Must not be NULL
- `investment_advisor_profiles.firm_name` OR `advisor_name` → Must not be NULL

---

## ✅ Quick Fix Checklist

- [ ] Check Vercel function logs for errors
- [ ] Verify environment variables are set in Vercel
- [ ] Verify environment variables are set for Production, Preview, and Development
- [ ] Redeploy after adding environment variables
- [ ] Check database tables/views exist
- [ ] Check RLS policies allow `anon` role to read
- [ ] Verify data exists in tables
- [ ] Verify required fields (name, mentor_name, etc.) are not NULL
- [ ] Test sitemap URL: `https://www.trackmystartup.com/api/sitemap.xml`

---

## 🚨 Common Error Messages

### **Error: "Missing Supabase configuration"**
**Solution:** Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel environment variables

### **Error: "Failed to fetch startups"**
**Solution:** 
- Check if `startups_public` view exists
- Check RLS policies allow `anon` role
- Verify data exists in table

### **Error: "Permission denied" or "RLS policy violation"**
**Solution:** Update RLS policies to allow public read access (see Step 4)

### **Error: "relation does not exist"**
**Solution:** Table/view doesn't exist - run SQL scripts to create it

### **Sitemap is empty (no profiles)**
**Solution:**
- Check if data exists in tables
- Check if name fields are not NULL
- Check Vercel logs for specific errors

---

## 📞 Still Not Working?

1. **Check Vercel Function Logs** - Most errors will show here
2. **Test Supabase Connection** - Try querying tables directly in Supabase SQL Editor
3. **Check Network Tab** - See if API is returning errors
4. **Verify Environment Variables** - Make sure they're set correctly in Vercel

---

## 🎯 Expected Result

After fixing the issues, your sitemap should look like:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.trackmystartup.com/</loc>
    ...
  </url>
  <url>
    <loc>https://www.trackmystartup.com/startup/startup-name-1</loc>
    ...
  </url>
  <url>
    <loc>https://www.trackmystartup.com/startup/startup-name-2</loc>
    ...
  </url>
  <url>
    <loc>https://www.trackmystartup.com/mentor/mentor-name</loc>
    ...
  </url>
  <!-- More URLs... -->
</urlset>
```

---

**Remember**: After fixing issues, **redeploy** your Vercel project for changes to take effect! 🚀

