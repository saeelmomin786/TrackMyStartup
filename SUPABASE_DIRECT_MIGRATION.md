# ✅ Direct Supabase Migration - No API Needed!

## 🎯 Run Migration Directly in Supabase SQL Editor

You can run the storage migration **directly in Supabase** without any API calls!

---

## 🚀 **3 Ways to Run (Choose One)**

### **Option 1: Simplest (Recommended)** ⭐

**File:** `database/14_simple_migrate_storage.sql`

Just run this in Supabase SQL Editor:

```sql
SELECT * FROM recalculate_all_user_storage();
```

**That's it!** This uses the existing function and updates all users.

---

### **Option 2: Fastest (Single Query)**

**File:** `database/13_quick_migrate_storage.sql`

Run this single UPDATE query:

```sql
UPDATE user_subscriptions us
SET 
    storage_used_mb = (
        SELECT COALESCE(SUM(file_size_mb), 0)
        FROM user_storage_usage
        WHERE user_id = us.user_id
    ),
    updated_at = NOW()
WHERE status = 'active';
```

**Fastest method** - single query, no loops!

---

### **Option 3: Detailed (With Progress Logging)**

**File:** `database/12_migrate_all_users_storage.sql`

Run the full script for detailed progress and verification.

---

## 📋 **Step-by-Step Instructions**

### **Step 1: Open Supabase SQL Editor**

1. Go to your Supabase Dashboard
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New Query"**

### **Step 2: Run Migration**

**Copy and paste this (simplest method):**

```sql
SELECT * FROM recalculate_all_user_storage();
```

**Or this (fastest method):**

```sql
UPDATE user_subscriptions us
SET 
    storage_used_mb = (
        SELECT COALESCE(SUM(file_size_mb), 0)
        FROM user_storage_usage
        WHERE user_id = us.user_id
    ),
    updated_at = NOW()
WHERE status = 'active';
```

### **Step 3: Click "Run"**

Click the **"Run"** button (or press `Ctrl+Enter`)

### **Step 4: Verify Results**

Run this to check:

```sql
SELECT 
    COUNT(*) as total_users,
    COUNT(storage_used_mb) as users_with_storage,
    ROUND(AVG(storage_used_mb), 2) as avg_storage_mb,
    ROUND(SUM(storage_used_mb), 2) as total_storage_mb
FROM user_subscriptions
WHERE status = 'active';
```

---

## ✅ **Benefits of Direct SQL**

1. ✅ **No API needed** - Runs directly in Supabase
2. ✅ **Faster** - No network calls, runs in database
3. ✅ **Works from any domain** - Doesn't matter which domain you use
4. ✅ **Simple** - Just copy/paste SQL
5. ✅ **Safe** - Can run multiple times (idempotent)

---

## 🔍 **What Each Method Does**

### **Method 1: `recalculate_all_user_storage()`**
- Uses existing database function
- Updates all users
- Returns results table
- **Best for:** First-time migration

### **Method 2: Direct UPDATE Query**
- Single SQL query
- Fastest execution
- Updates all users at once
- **Best for:** Quick migration

### **Method 3: Detailed Script**
- Progress logging
- Error handling
- Verification queries
- **Best for:** Large migrations with monitoring

---

## 📊 **Performance**

| Method | Time for 1000 Users | Complexity |
|--------|-------------------|------------|
| **Method 1** (Function) | ~30 seconds | ⭐ Simple |
| **Method 2** (UPDATE) | ~5 seconds | ⭐⭐ Very Fast |
| **Method 3** (Script) | ~1-2 minutes | ⭐⭐⭐ Detailed |

---

## 🎯 **Recommended: Method 2 (Direct UPDATE)**

**Why?**
- ✅ Fastest (single query)
- ✅ Simplest (one SQL statement)
- ✅ No function dependencies
- ✅ Works immediately

**Just run this:**

```sql
UPDATE user_subscriptions us
SET 
    storage_used_mb = (
        SELECT COALESCE(SUM(file_size_mb), 0)
        FROM user_storage_usage
        WHERE user_id = us.user_id
    ),
    updated_at = NOW()
WHERE status = 'active';
```

**Done!** 🚀

---

## ✅ **After Migration**

Going forward, the **database trigger** automatically updates storage on every upload/delete - no manual steps needed!

---

**Status:** ✅ Ready to run directly in Supabase SQL Editor!
