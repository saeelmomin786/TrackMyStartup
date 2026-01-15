# ✅ Free Plan Storage Migration Guide

## 🎯 Problem

All users are on the **free plan by default**, but they don't have subscription records in `user_subscriptions` table. So when we try to calculate storage, there's nothing to update!

## ✅ Solution

Create free plan subscriptions for all users, then calculate storage.

---

## 📋 Step-by-Step Migration

### **Step 1: Run the Migration Script**

**File:** `database/17_create_free_plan_and_migrate_storage.sql`

Run this in Supabase SQL Editor. It will:

1. ✅ **Create free plan** if it doesn't exist
2. ✅ **Create free plan subscriptions** for all users who don't have one
3. ✅ **Calculate storage** from `user_storage_usage` table
4. ✅ **Update `storage_used_mb`** for all subscriptions

---

## 🔍 What the Script Does

### **Step 1: Ensure Free Plan Exists**
```sql
-- Creates free plan if it doesn't exist
INSERT INTO subscription_plans (...)
VALUES ('Free Plan - Startup', 0.00, 'EUR', 'monthly', ...)
ON CONFLICT DO UPDATE ...
```

### **Step 2: Create Subscriptions for All Users**
```sql
-- For each user without a subscription:
-- Creates a free plan subscription record
INSERT INTO user_subscriptions (
    user_id,
    plan_id,  -- Free plan ID
    status,   -- 'active'
    amount,   -- 0.00
    ...
)
```

### **Step 3: Calculate Storage**
```sql
-- Updates storage_used_mb from user_storage_usage table
UPDATE user_subscriptions us
SET storage_used_mb = (
    SELECT SUM(file_size_mb)
    FROM user_storage_usage
    WHERE user_id = us.user_id
)
```

---

## ✅ After Migration

All users will have:
- ✅ A free plan subscription record in `user_subscriptions`
- ✅ `storage_used_mb` calculated and stored
- ✅ `status = 'active'` (so frontend can read it)

---

## 🧪 Verify Results

After running the migration, check:

```sql
-- Check subscriptions
SELECT 
    COUNT(*) as total_subscriptions,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
    COUNT(CASE WHEN amount = 0 THEN 1 END) as free_plan_count
FROM user_subscriptions;

-- Check storage
SELECT 
    COUNT(*) as total_subscriptions,
    COUNT(storage_used_mb) as with_storage,
    COUNT(CASE WHEN storage_used_mb > 0 THEN 1 END) as with_files,
    ROUND(AVG(storage_used_mb), 2) as avg_storage_mb
FROM user_subscriptions;
```

---

## 🚀 Going Forward

After this migration:
- ✅ All users have subscription records
- ✅ Storage is calculated automatically via database trigger
- ✅ Frontend can read `storage_used_mb` from `user_subscriptions`
- ✅ New users will get free plan subscription when they sign up

---

## 📝 Notes

- **Safe to run multiple times** - Uses `ON CONFLICT DO NOTHING`
- **Only creates for users without subscriptions** - Won't duplicate
- **Calculates storage from `user_storage_usage`** - Fast and accurate
- **Works for all users** - Even if they have no files (sets to 0)

---

**Status:** ✅ Ready to run! Just execute `database/17_create_free_plan_and_migrate_storage.sql` in Supabase SQL Editor.
