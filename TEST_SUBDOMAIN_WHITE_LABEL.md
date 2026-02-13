# 🧪 Testing Subdomain White-Label Branding

## ✅ Quick Test Guide

### **Step 1: Run Database Migration**

```bash
# Run SQL file in Supabase SQL Editor or via CLI
```

Paste and execute: `CREATE_SUBDOMAIN_CONFIGS_TABLE.sql`

---

### **Step 2: Add Test Subdomain Configuration**

In Supabase SQL Editor, run:

```sql
-- Add test subdomain
INSERT INTO public.subdomain_configs (subdomain, name, logo_url)
VALUES (
    'test',
    'Test Company',
    'https://via.placeholder.com/150/0000FF/FFFFFF?text=TEST'
)
ON CONFLICT (subdomain) DO UPDATE 
SET name = EXCLUDED.name, logo_url = EXCLUDED.logo_url;
```

---

### **Step 3: Test Locally**

#### **3.1 Main Domain (No Subdomain)**
1. Visit: `http://localhost:5000`
2. Log in as any user
3. Expected: **TrackMyStartup default logo** in header

#### **3.2 Test Subdomain (With Configuration)**
1. Visit: `http://test.localhost:5000`
2. Log in as any user (Startup, Investor, Advisor, etc.)
3. Expected: **"Test Company" logo + name** in header

---

### **Step 4: Test with Real Logo**

```sql
-- Update test subdomain with your actual logo
UPDATE public.subdomain_configs
SET logo_url = 'https://your-storage-url.com/your-logo.png'
WHERE subdomain = 'test';
```

Then refresh: `http://test.localhost:5000`

---

### **Step 5: Test Multiple Users**

1. Log in as **Startup** → See subdomain branding
2. Log in as **Investor** → See subdomain branding
3. Log in as **Investment Advisor** → See subdomain branding
4. Log in as **any role** → See subdomain branding

✅ **All users should see the same branding based on subdomain!**

---

## 🔍 Debugging

### **Check if Subdomain Config is Loading**

Open browser console and look for:
```
✅ Subdomain config loaded: { subdomain: 'test', name: 'Test Company', logo_url: '...' }
```

Or:
```
ℹ️ No subdomain config (main domain or subdomain not configured)
```

### **Verify Database**

```sql
-- Check all configs
SELECT * FROM public.subdomain_configs;

-- Check specific subdomain
SELECT * FROM public.subdomain_configs WHERE subdomain = 'test';
```

---

## 🌐 Production Testing

### **DNS Setup Required**

For production subdomains like `xyz.trackmystartup.com`:

1. Add DNS record: `CNAME xyz -> your-app.vercel.app`
2. Add to Vercel domains
3. Insert config in database:

```sql
INSERT INTO public.subdomain_configs (subdomain, name, logo_url)
VALUES ('xyz', 'XYZ Investment Firm', 'https://your-cdn.com/xyz-logo.png');
```

---

## ✅ Expected Behavior

| URL | User Role | Expected Header |
|-----|-----------|----------------|
| `localhost:5000` | Any | TrackMyStartup logo |
| `test.localhost:5000` | Any | Test Company logo + name |
| `xyz.trackmystartup.com` | Any | XYZ logo + name |
| `trackmystartup.com` | Any | TrackMyStartup logo |

---

## 🐛 Common Issues

### **Issue: Subdomain config not loading**
**Solution**: 
- Check browser console for errors
- Verify subdomain exists in database
- Check RLS policies are applied

### **Issue: Logo not displaying**
**Solution**:
- Verify logo URL is accessible (CORS enabled)
- Check logo URL in database is correct
- Inspect network tab for 404 errors

### **Issue: Shows wrong branding**
**Solution**:
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check subdomain extraction logic

---

## 🎉 Success Criteria

✅ Main domain shows TrackMyStartup logo
✅ Test subdomain shows Test Company branding
✅ All user roles see same subdomain branding
✅ No errors in browser console
✅ Logo loads correctly
✅ Company name displays correctly

---

## 📝 Next Steps

1. Test with actual production subdomain
2. Add real logo URLs
3. Test on multiple browsers
4. Test on mobile devices
5. Verify performance
