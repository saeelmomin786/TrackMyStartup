# 🔑 Fix Invalid API Key Error

## ❌ Problem

The logs show:
```
[SITEMAP ERROR] Failed to fetch startups: {
  message: 'Invalid API key',
  hint: 'Double check your Supabase `anon` or `service_role` API key.'
}
```

This means the `SUPABASE_ANON_KEY` in Vercel is **invalid or incorrect**.

---

## ✅ Solution: Update API Key in Vercel

### **Step 1: Get the Correct API Key from Supabase**

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Go to "Settings"** → **"API"**
4. **Copy the "anon public" key** (NOT the service_role key)
   - It should start with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - This is the key that allows public/anonymous access

### **Step 2: Update in Vercel**

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**: Track My Startup
3. **Go to "Settings"** → **"Environment Variables"**
4. **Find `SUPABASE_ANON_KEY` or `VITE_SUPABASE_ANON_KEY`**
5. **Click on it to edit**
6. **Paste the correct key** from Supabase
   - Make sure there are **no extra spaces** before or after
   - Make sure you copied the **entire key** (it's very long)
7. **Click "Save"**

### **Step 3: Also Check SUPABASE_URL**

While you're there, verify `SUPABASE_URL` or `VITE_SUPABASE_URL`:
- Should be: `https://your-project-id.supabase.co`
- Get it from Supabase Dashboard → Settings → API → Project URL

### **Step 4: Redeploy**

After updating the environment variables:

1. **Go to "Deployments" tab** in Vercel
2. **Click "Redeploy"** on the latest deployment
3. **Or push a new commit** to trigger redeploy

---

## 🔍 Verify the Fix

After redeploying:

1. **Wait 1-2 minutes** for deployment to complete
2. **Visit**: `https://www.trackmystartup.com/api/sitemap.xml`
3. **Check Vercel logs** again:
   - Should see: `[SITEMAP] Found X startups`
   - Should NOT see: `[SITEMAP ERROR] Invalid API key`

---

## ⚠️ Common Mistakes

1. **Using service_role key instead of anon key**
   - ❌ Wrong: service_role key (has more permissions but shouldn't be used for public APIs)
   - ✅ Correct: anon/public key (for public access)

2. **Extra spaces or line breaks**
   - Make sure the key is pasted as one continuous string
   - No spaces before or after

3. **Wrong project**
   - Make sure you're using the API key from the correct Supabase project

4. **Key from different environment**
   - Make sure you're using the Production key, not a test/staging key

---

## 📋 Quick Checklist

- [ ] Go to Supabase Dashboard → Settings → API
- [ ] Copy the **anon/public** key (not service_role)
- [ ] Go to Vercel → Settings → Environment Variables
- [ ] Update `SUPABASE_ANON_KEY` or `VITE_SUPABASE_ANON_KEY`
- [ ] Verify `SUPABASE_URL` is correct
- [ ] Make sure no extra spaces in the key
- [ ] Save changes
- [ ] Redeploy in Vercel
- [ ] Test sitemap URL
- [ ] Check logs for success messages

---

## 🎯 Expected Result

After fixing, you should see in logs:
```
[SITEMAP] Found 10 startups
[SITEMAP] Found 5 mentors
[SITEMAP] Found 3 investors
[SITEMAP] Found 2 advisors
[SITEMAP] Generated successfully
```

And the sitemap XML should include all your profiles! 🚀


