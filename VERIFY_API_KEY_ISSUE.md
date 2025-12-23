# 🔍 Verify API Key Issue

## ✅ Good News

The logs show environment variables are being found:
```
urlSource: 'SUPABASE_URL' ✅
keySource: 'SUPABASE_ANON_KEY' ✅
urlLength: 40
keyLength: 208
```

## ❌ Problem

But Supabase is rejecting the key:
```
Invalid API key
Double check your Supabase `anon` or `service_role` API key.
```

## 🔍 Possible Causes

### **1. Wrong Key Value**
The key in Vercel might be:
- From a different Supabase project
- Truncated or incomplete
- Has extra spaces/characters
- The service_role key instead of anon key

### **2. URL Mismatch**
The URL might be from a different project than the key.

### **3. Key Format Issue**
The key might have:
- Extra spaces before/after
- Line breaks
- Special characters

---

## ✅ Solution: Verify and Update

### **Step 1: Get the Correct Key from Supabase**

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project** (the one your frontend uses)
3. **Go to "Settings"** → **"API"**
4. **Copy these EXACTLY:**
   - **Project URL** → Should be like `https://xxxxx.supabase.co`
   - **anon public key** → Should start with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### **Step 2: Verify in Vercel**

1. **Go to Vercel Dashboard** → Settings → Environment Variables
2. **Check `SUPABASE_URL`:**
   - Should match the Project URL from Supabase exactly
   - Should be `https://xxxxx.supabase.co`
   - No trailing slash
   - No extra spaces

3. **Check `SUPABASE_ANON_KEY`:**
   - Should match the anon public key from Supabase exactly
   - Should start with `eyJ`
   - Should be very long (200+ characters)
   - No extra spaces before or after
   - No line breaks

### **Step 3: Update if Wrong**

If the values don't match:

1. **Click on the variable** to edit
2. **Delete the old value completely**
3. **Paste the NEW value** from Supabase
4. **Make sure no extra spaces**
5. **Click "Save"**
6. **Repeat for both variables**

### **Step 4: Redeploy**

After updating:
1. **Go to Deployments tab**
2. **Click "Redeploy"**
3. **Wait for deployment to complete**
4. **Test the sitemap again**

---

## 🧪 Quick Test

To verify the key works, you can test it in Supabase SQL Editor:

1. **Go to Supabase Dashboard** → SQL Editor
2. **Run this query:**
   ```sql
   SELECT COUNT(*) FROM startups_public;
   ```
3. **If this works**, the key should work in the sitemap too

---

## 📋 Checklist

- [ ] Go to Supabase Dashboard → Settings → API
- [ ] Copy Project URL exactly
- [ ] Copy anon public key exactly (starts with `eyJ`)
- [ ] Go to Vercel → Settings → Environment Variables
- [ ] Verify `SUPABASE_URL` matches Supabase Project URL
- [ ] Verify `SUPABASE_ANON_KEY` matches Supabase anon key
- [ ] Check for extra spaces (trim if needed)
- [ ] Check key starts with `eyJ`
- [ ] Update if values don't match
- [ ] Save changes
- [ ] Redeploy
- [ ] Test sitemap

---

## 💡 Pro Tip

**The key must be from the SAME Supabase project as the URL!**

If you have multiple Supabase projects:
- Make sure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are from the same project
- The frontend uses one project, but the API might need a different one

---

**After updating and redeploying, the sitemap should work!** 🚀


