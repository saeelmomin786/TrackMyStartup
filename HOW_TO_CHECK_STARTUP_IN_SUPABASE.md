# How to Check if Startup was Created in Supabase

## 📍 **Where to Check:**

### **1. Supabase Dashboard → Table Editor**

Go to: **Supabase Dashboard** → **Table Editor** → **`startups` table**

---

## 🔍 **What to Look For:**

### **Step 1: Find Your Auth User ID**

First, you need to find your `auth_user_id` (from `auth.users` table):

1. Go to **Table Editor** → **`auth.users`** table
2. Find your email: `7makodas@gmail.com`
3. Copy the **`id`** field (this is your `auth_user_id`)
   - Example: `50e3a3fc-41ee-4067-bd35-21d06eaaaa08`

### **Step 2: Check Startups Table**

1. Go to **Table Editor** → **`startups`** table
2. Look for rows where **`user_id`** = your `auth_user_id` (from Step 1)
3. Check if there's a startup with name **"NEW TESTING"**

---

## 📊 **SQL Query to Check:**

You can also use the **SQL Editor** in Supabase:

### **Query 1: Find your auth_user_id**
```sql
SELECT id, email 
FROM auth.users 
WHERE email = '7makodas@gmail.com';
```

### **Query 2: Check if startup exists for your auth_user_id**
```sql
SELECT 
  s.id,
  s.name,
  s.user_id,
  s.sector,
  s.current_valuation,
  s.compliance_status,
  s.registration_date,
  s.created_at
FROM startups s
WHERE s.user_id = '50e3a3fc-41ee-4067-bd35-21d06eaaaa08';  -- Replace with your auth_user_id
```

### **Query 3: Check all startups for your email (with profile info)**
```sql
SELECT 
  s.id as startup_id,
  s.name as startup_name,
  s.user_id as auth_user_id,
  up.id as profile_id,
  up.email,
  up.role,
  up.startup_name as profile_startup_name,
  s.created_at as startup_created_at
FROM startups s
INNER JOIN user_profiles up ON up.auth_user_id = s.user_id
WHERE up.email = '7makodas@gmail.com';
```

---

## ✅ **What You Should See:**

If startup was created successfully, you should see:

| Column | Expected Value |
|--------|----------------|
| `id` | A number (e.g., 257) |
| `name` | "NEW TESTING" |
| `user_id` | Your auth_user_id (UUID from auth.users) |
| `sector` | "Technology" (or whatever was set) |
| `current_valuation` | 0 (or calculated value) |
| `compliance_status` | "Pending" |
| `registration_date` | Today's date |
| `created_at` | Timestamp when created |

---

## ❌ **If Startup is NOT Found:**

### **Check These:**

1. **Check `user_profiles` table:**
   ```sql
   SELECT 
     id,
     email,
     role,
     startup_name,
     auth_user_id,
     is_profile_complete
   FROM user_profiles
   WHERE email = '7makodas@gmail.com';
   ```

2. **Check if profile exists:**
   - Profile ID should be: `f79c9e9f-e5e4-48ae-ac1f-574719b7b414`
   - `startup_name` should be: "NEW TESTING"
   - `is_profile_complete` should be: `true` (after Form 2)

3. **Check `user_profile_sessions` table:**
   ```sql
   SELECT 
     auth_user_id,
     current_profile_id,
     updated_at
   FROM user_profile_sessions
   WHERE auth_user_id = '50e3a3fc-41ee-4067-bd35-21d06eaaaa08';  -- Your auth_user_id
   ```

---

## 🔧 **Common Issues:**

### **Issue 1: Startup has wrong `user_id`**
- **Symptom:** Startup exists but `user_id` = profile ID instead of auth_user_id
- **Fix:** The startup was created with profile ID (wrong). Need to update it.

### **Issue 2: No startup found**
- **Symptom:** No rows in `startups` table for your `auth_user_id`
- **Possible causes:**
  - Form 2 wasn't completed
  - Startup creation failed (check browser console for errors)
  - `user_id` was set incorrectly

### **Issue 3: Multiple startups**
- **Symptom:** Multiple startups with same name
- **Check:** Look at `created_at` to see which is the latest

---

## 📝 **Quick Check Query (All-in-One):**

Run this to see everything at once:

```sql
-- Get your complete profile and startup info
SELECT 
  -- Auth User Info
  au.id as auth_user_id,
  au.email,
  
  -- Profile Info
  up.id as profile_id,
  up.role,
  up.startup_name as profile_startup_name,
  up.is_profile_complete,
  up.government_id,
  up.ca_license,
  
  -- Startup Info
  s.id as startup_id,
  s.name as startup_name,
  s.user_id as startup_user_id,
  s.sector,
  s.compliance_status,
  s.created_at as startup_created_at,
  
  -- Session Info
  ups.current_profile_id as active_profile_id
  
FROM auth.users au
LEFT JOIN user_profiles up ON up.auth_user_id = au.id
LEFT JOIN startups s ON s.user_id = au.id
LEFT JOIN user_profile_sessions ups ON ups.auth_user_id = au.id
WHERE au.email = '7makodas@gmail.com'
ORDER BY s.created_at DESC NULLS LAST;
```

---

## 🎯 **Expected Result:**

If everything is working correctly, you should see:

```
auth_user_id: 50e3a3fc-41ee-4067-bd35-21d06eaaaa08
email: 7makodas@gmail.com
profile_id: f79c9e9f-e5e4-48ae-ac1f-574719b7b414
role: Startup
profile_startup_name: NEW TESTING
is_profile_complete: true
startup_id: [some number]
startup_name: NEW TESTING
startup_user_id: 50e3a3fc-41ee-4067-bd35-21d06eaaaa08  ← Should match auth_user_id!
active_profile_id: f79c9e9f-e5e4-48ae-ac1f-574719b7b414
```

---

## 🚨 **If `startup_user_id` ≠ `auth_user_id`:**

This means the startup was created with the wrong ID. You need to update it:

```sql
-- Find the startup with wrong user_id
SELECT * FROM startups 
WHERE name = 'NEW TESTING' 
AND user_id != '50e3a3fc-41ee-4067-bd35-21d06eaaaa08';

-- Update it (replace startup_id with actual ID)
UPDATE startups 
SET user_id = '50e3a3fc-41ee-4067-bd35-21d06eaaaa08'  -- Your auth_user_id
WHERE id = [startup_id];
```

---

## 📍 **Summary:**

1. **Go to:** Supabase Dashboard → Table Editor
2. **Check:** `startups` table
3. **Look for:** Row where `user_id` = your `auth_user_id` (from `auth.users`)
4. **Verify:** `name` = "NEW TESTING" and `user_id` matches your auth_user_id

If you don't see it, check the browser console for errors when completing Form 2!

