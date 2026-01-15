# 🔧 Fix: Storage Showing 0 MB

## 🎯 Problem
Storage usage shows **0 MB** even though backfill created 183 files for 66 users.

---

## 🔍 Diagnostic Steps

### **1. Check Browser Console**
Open browser DevTools (F12) and check the Console tab when loading the Account Tab. You should see:
- `🔍 Loading storage for user: [userId] plan tier: free`
- `📊 Storage RPC Response: {...}`
- `📦 Storage result: {...}`

### **2. Run Diagnostic SQL**
Run this SQL in Supabase SQL Editor to verify data exists:

```sql
-- Check if data exists
SELECT 
    COUNT(*) as total_files,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(file_size_mb) as total_storage_mb
FROM user_storage_usage;

-- Check storage for a specific user (replace with your user_id)
SELECT 
    user_id,
    COUNT(*) as file_count,
    SUM(file_size_mb) as total_mb
FROM user_storage_usage
WHERE user_id = 'YOUR_USER_ID_HERE'
GROUP BY user_id;

-- Test the RPC function
SELECT get_user_storage_total('YOUR_USER_ID_HERE') as calculated_storage;
```

### **3. Verify RPC Function Exists**
```sql
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_name = 'get_user_storage_total'
AND routine_schema = 'public';
```

---

## 🐛 Possible Issues

### **Issue 1: userId Mismatch**
**Problem:** The `userId` passed to `AccountTab` might not match the `user_id` in `user_storage_usage`.

**Check:**
- In browser console, see what `userId` is being used
- Compare with `user_id` in `user_storage_usage` table
- Make sure they're the same UUID

**Fix:** The `userId` should come from `auth.users.id` (Supabase auth user ID).

### **Issue 2: RPC Function Not Working**
**Problem:** The `get_user_storage_total()` function might not exist or have permission issues.

**Check:**
- Run the diagnostic SQL above
- Verify function exists and is `SECURITY DEFINER`
- Check if RLS is blocking access

**Fix:** Run this SQL to recreate the function:
```sql
CREATE OR REPLACE FUNCTION get_user_storage_total(p_user_id UUID)
RETURNS DECIMAL(10,2) AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(file_size_mb) 
         FROM user_storage_usage 
         WHERE user_id = p_user_id),
        0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_storage_total(UUID) TO authenticated;
```

### **Issue 3: RLS Policy Blocking**
**Problem:** Row Level Security might be preventing the function from reading data.

**Check:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'user_storage_usage';
```

**Fix:** The function is `SECURITY DEFINER`, so it should bypass RLS. But verify the function has proper permissions.

### **Issue 4: Data Type Mismatch**
**Problem:** The RPC function returns `DECIMAL(10,2)` which might not parse correctly.

**Fix:** The code now handles this with `parseFloat(data?.toString() || '0')`.

---

## ✅ What I've Added

1. **Enhanced Logging:**
   - Console logs in `AccountTab` to show userId and plan tier
   - Detailed RPC response logging in `storageUsageService`
   - Direct query fallback if RPC returns 0

2. **Direct Query Fallback:**
   - If RPC returns 0, the code now directly queries `user_storage_usage` table
   - This helps identify if it's an RPC issue or a data issue

3. **Better Error Handling:**
   - More detailed error messages
   - Type checking for RPC response

---

## 🧪 Testing Steps

1. **Open Account Tab** in the dashboard
2. **Open Browser Console** (F12 → Console tab)
3. **Look for these logs:**
   ```
   🔍 Loading storage for user: [uuid] plan tier: free
   📊 Storage RPC Response: { userId: ..., data: ..., ... }
   📦 Storage result: { used_mb: ..., limit_mb: 100, ... }
   ```

4. **If you see errors:**
   - Copy the error message
   - Check the userId being used
   - Verify that userId exists in `user_storage_usage` table

5. **If RPC returns 0 but direct query finds files:**
   - This indicates an RPC function issue
   - Run the SQL fix above to recreate the function

---

## 📝 Next Steps

After checking the console logs:
1. Share the console output
2. Run the diagnostic SQL queries
3. Share the results

This will help identify the exact issue!
