# 🔧 Fix Vercel Environment Variables for API Routes

## 🚨 The Problem

Your frontend works because it uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, but the **serverless API function** (sitemap.xml) can't access them properly.

**Why?**
- `VITE_` prefixed variables are processed by Vite for **client-side** code
- Vercel **serverless functions** (API routes) run on the **server** and may not have access to `VITE_` variables
- The sitemap API needs `SUPABASE_URL` and `SUPABASE_ANON_KEY` (without `VITE_` prefix)

---

## ✅ Solution: Add Non-VITE_ Variables

You need to add **duplicate** environment variables in Vercel with **non-VITE_ names**:

### **Step 1: Get Your Current Values**

1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables
2. **Find these variables:**
   - `VITE_SUPABASE_URL` → Copy the value
   - `VITE_SUPABASE_ANON_KEY` → Copy the value

### **Step 2: Add Duplicate Variables (Without VITE_ Prefix)**

1. **In the same Environment Variables page**, click **"Add New"**

2. **Add First Variable:**
   - **Name**: `SUPABASE_URL` (no VITE_ prefix)
   - **Value**: Paste the same value from `VITE_SUPABASE_URL`
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development
   - Click **"Save"**

3. **Add Second Variable:**
   - **Name**: `SUPABASE_ANON_KEY` (no VITE_ prefix)
   - **Value**: Paste the same value from `VITE_SUPABASE_ANON_KEY`
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development
   - Click **"Save"**

### **Step 3: Verify Both Sets Exist**

You should now have **4 variables**:
- ✅ `VITE_SUPABASE_URL` (for frontend)
- ✅ `VITE_SUPABASE_ANON_KEY` (for frontend)
- ✅ `SUPABASE_URL` (for API routes) ← **NEW**
- ✅ `SUPABASE_ANON_KEY` (for API routes) ← **NEW**

### **Step 4: Redeploy**

After adding the variables:

1. **Go to "Deployments" tab**
2. **Click "Redeploy"** on the latest deployment
3. **Or push a new commit** to trigger redeploy

---

## 🔍 Verify the Fix

After redeploying:

1. **Wait 1-2 minutes** for deployment
2. **Visit**: `https://www.trackmystartup.com/api/sitemap.xml`
3. **Check Vercel logs** - should see:
   ```
   [SITEMAP] Environment check: {
     hasUrl: true,
     hasKey: true,
     urlSource: 'SUPABASE_URL',
     keySource: 'SUPABASE_ANON_KEY'
   }
   [SITEMAP] Found X startups
   ```

---

## 📋 Quick Checklist

- [ ] Go to Vercel → Settings → Environment Variables
- [ ] Copy value from `VITE_SUPABASE_URL`
- [ ] Add new variable: `SUPABASE_URL` with same value
- [ ] Copy value from `VITE_SUPABASE_ANON_KEY`
- [ ] Add new variable: `SUPABASE_ANON_KEY` with same value
- [ ] Select all environments (Production, Preview, Development)
- [ ] Save both variables
- [ ] Redeploy
- [ ] Test sitemap URL
- [ ] Check logs for success

---

## 💡 Why This Happens

- **Frontend code** (React/Vite): Uses `VITE_` prefixed variables
- **Serverless functions** (API routes): Need non-prefixed variables
- **Vercel** exposes all env vars, but the code checks for specific names
- **Solution**: Have both versions so both work

---

## 🎯 Expected Result

After fixing, the sitemap should include:
- ✅ Homepage
- ✅ All startup profiles
- ✅ All mentor profiles
- ✅ All investor profiles
- ✅ All advisor profiles

And logs should show:
```
[SITEMAP] Found 10 startups
[SITEMAP] Found 5 mentors
[SITEMAP] Generated successfully
```

---

**The key is: Your frontend uses `VITE_` variables, but your API needs non-`VITE_` variables!** 🔑


