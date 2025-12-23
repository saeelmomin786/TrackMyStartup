# 🔒 Security: Rotate Your API Key

## ⚠️ Important Security Notice

Your Supabase API key was exposed in documentation. While the `anon` key is meant to be public (it's used in frontend code), it's still good practice to rotate it if you're concerned.

---

## 🔄 How to Rotate Your Supabase API Key

### **Step 1: Generate New Key in Supabase**

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Go to "Settings"** → **"API"**
4. **Click "Reset"** next to the anon public key
5. **Copy the new key** that appears

### **Step 2: Update Your Code**

1. **Update `config/environment.ts`:**
   - Replace the `supabaseAnonKey` value with the new key
   - Update both `development` and `production` sections

2. **Update Vercel Environment Variables:**
   - Go to Vercel → Settings → Environment Variables
   - Update `SUPABASE_ANON_KEY` with the new key
   - Update `VITE_SUPABASE_ANON_KEY` with the new key
   - Save

### **Step 3: Redeploy**

1. **Commit and push** the updated `config/environment.ts`
2. **Redeploy** in Vercel (or it will auto-deploy)

---

## 📝 Note About Anon Keys

The `anon` (anonymous) key is **designed to be public** - it's used in frontend JavaScript code that anyone can see. However:

- ✅ It's restricted by RLS (Row Level Security) policies
- ✅ It only allows operations your RLS policies permit
- ✅ It cannot bypass security rules

**If your RLS policies are set up correctly, the anon key is safe to use publicly.**

---

## 🔒 For Better Security

1. **Review your RLS policies** - Make sure they're restrictive enough
2. **Use service_role key only on server** - Never expose it in frontend
3. **Rotate keys periodically** - Good security practice
4. **Monitor API usage** - Check Supabase dashboard for unusual activity

---

## ✅ After Rotation

- Update all places where the key is used:
  - `config/environment.ts`
  - Vercel environment variables
  - Any other configuration files

---

**Remember: The anon key is meant to be public, but rotating it is still a good security practice!** 🔒


