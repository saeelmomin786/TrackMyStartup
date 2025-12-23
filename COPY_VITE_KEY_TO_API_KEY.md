# 🔑 Copy VITE Key to API Key - Quick Fix

## 🎯 The Solution

Your frontend works because it uses `VITE_SUPABASE_ANON_KEY` (which is correct).

Your API fails because it uses `SUPABASE_ANON_KEY` (which is different/wrong).

**Simple fix: Copy the value from `VITE_SUPABASE_ANON_KEY` to `SUPABASE_ANON_KEY`!**

---

## ✅ Step-by-Step Fix

### **Step 1: Get the Correct Key Value**

1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables
2. **Find `VITE_SUPABASE_ANON_KEY`**
3. **Click on it** to view the value
4. **Copy the entire value** (it's long, make sure you get it all)

### **Step 2: Update SUPABASE_ANON_KEY**

1. **In the same Environment Variables page**
2. **Find `SUPABASE_ANON_KEY`**
3. **Click on it** to edit
4. **Delete the old/wrong value**
5. **Paste the value from `VITE_SUPABASE_ANON_KEY`** (the one that works)
6. **Click "Save"**

### **Step 3: Also Update SUPABASE_URL (if needed)**

1. **Find `VITE_SUPABASE_URL`**
2. **Copy its value**
3. **Update `SUPABASE_URL`** with the same value
4. **Save**

### **Step 4: Redeploy**

1. **Go to Deployments tab**
2. **Click "Redeploy"** on latest deployment
3. **Wait for deployment to complete**

---

## 🎯 Why This Works

- **Frontend**: Uses `VITE_SUPABASE_ANON_KEY` → Works ✅
- **API**: Uses `SUPABASE_ANON_KEY` → Was wrong ❌ → Now will work ✅

After copying, both will use the same correct key!

---

## 📋 Quick Checklist

- [ ] Go to Vercel → Settings → Environment Variables
- [ ] View `VITE_SUPABASE_ANON_KEY` value
- [ ] Copy the entire value
- [ ] Edit `SUPABASE_ANON_KEY`
- [ ] Paste the copied value
- [ ] Save
- [ ] Do the same for URLs (`VITE_SUPABASE_URL` → `SUPABASE_URL`)
- [ ] Redeploy
- [ ] Test sitemap

---

## 💡 Pro Tip

**You can have the same value in both variables!** That's perfectly fine. The frontend needs `VITE_` prefix, but the API needs non-`VITE_` prefix. The values can be identical.

---

**After this, your sitemap should work!** 🚀


