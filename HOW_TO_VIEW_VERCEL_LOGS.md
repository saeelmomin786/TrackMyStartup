# 📊 How to View Vercel Function Logs

## 🔍 Understanding the Log Entry

The log entry you shared shows:
- ✅ **Status**: 200 (request succeeded)
- ⏱️ **Duration**: 694ms
- 💾 **Memory**: 267MB used
- 🔄 **Cache**: MISS (not cached)

However, this log doesn't show the **console.log** messages from our improved sitemap API. We need to see the actual function output.

---

## 📋 Step-by-Step: View Detailed Logs

### **Method 1: Vercel Dashboard (Recommended)**

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**: Track My Startup
3. **Go to "Deployments" tab**
4. **Click on the latest deployment** (the one with the sitemap fix)
5. **Click on "Functions" tab** (or scroll down)
6. **Click on `api/sitemap.xml`**
7. **You should see logs like:**
   ```
   [SITEMAP] Found 5 startups
   [SITEMAP] Found 2 mentors
   [SITEMAP ERROR] Failed to fetch investors: ...
   ```

### **Method 2: Real-time Logs**

1. **Go to Vercel Dashboard** → Your Project
2. **Go to "Logs" tab** (or "Runtime Logs")
3. **Filter by**: `api/sitemap.xml`
4. **Refresh the sitemap URL** in your browser
5. **Watch the logs appear in real-time**

### **Method 3: Vercel CLI**

If you have Vercel CLI installed:

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# Link to your project
vercel link

# View logs
vercel logs --follow
```

---

## 🔍 What to Look For

### **Good Signs:**
```
[SITEMAP] Found 10 startups
[SITEMAP] Found 5 mentors
[SITEMAP] Found 3 investors
[SITEMAP] Found 2 advisors
[SITEMAP] Generated successfully
```

### **Error Signs:**
```
[SITEMAP ERROR] Missing Supabase configuration
[SITEMAP ERROR] Failed to fetch startups: ...
[SITEMAP ERROR] Failed to fetch mentors: ...
[SITEMAP ERROR] Permission denied
[SITEMAP ERROR] relation "startups_public" does not exist
```

---

## 🚨 Common Issues & What Logs Show

### **Issue 1: Missing Environment Variables**
**Logs will show:**
```
[SITEMAP ERROR] Missing Supabase configuration: {
  hasUrl: false,
  hasKey: false,
  envKeys: []
}
```

**Solution:** Add environment variables in Vercel Dashboard → Settings → Environment Variables

---

### **Issue 2: RLS Policy Blocking**
**Logs will show:**
```
[SITEMAP ERROR] Failed to fetch startups: {
  message: "new row violates row-level security policy",
  code: "42501"
}
```

**Solution:** Update RLS policies to allow `anon` role to read (see SITEMAP_TROUBLESHOOTING.md)

---

### **Issue 3: Table/View Doesn't Exist**
**Logs will show:**
```
[SITEMAP ERROR] Failed to fetch startups: {
  message: "relation \"startups_public\" does not exist",
  code: "42P01"
}
```

**Solution:** Create the missing table/view in Supabase

---

### **Issue 4: No Data**
**Logs will show:**
```
[SITEMAP] Found 0 startups
[SITEMAP] Found 0 mentors
[SITEMAP] No startups found
```

**Solution:** Add data to your tables, or check if data exists

---

## 📝 Quick Test

1. **Visit the sitemap URL:**
   ```
   https://www.trackmystartup.com/api/sitemap.xml
   ```

2. **Immediately check Vercel logs:**
   - Go to Vercel Dashboard
   - Check "Logs" or "Functions" tab
   - Look for `[SITEMAP]` messages

3. **Share the logs** so we can diagnose the issue

---

## 💡 Pro Tip

If you don't see any `[SITEMAP]` log messages, it means:
- The function might not be using the updated code
- You need to **redeploy** after the changes
- Check if the deployment includes the latest code

---

## 🔄 Next Steps

1. **View the detailed logs** using Method 1 above
2. **Share the log output** (especially any `[SITEMAP ERROR]` messages)
3. **We'll diagnose** the specific issue based on the error messages

---

**The log entry you shared shows the request succeeded, but we need to see the actual console.log output to know why the sitemap is empty!** 🔍

