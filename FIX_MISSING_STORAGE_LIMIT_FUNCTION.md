# Fix Missing `get_user_storage_limit` Function

## Issue
The `get_user_storage_limit` RPC function is not found in the database, causing 404 errors in the console.

## Solution

### Option 1: Create the Function (Recommended)
Run the SQL script to create the function in your Supabase database:

**File:** `database/CREATE_GET_USER_STORAGE_LIMIT_FUNCTION.sql`

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `CREATE_GET_USER_STORAGE_LIMIT_FUNCTION.sql`
3. Run the script
4. Verify the function was created:
   ```sql
   SELECT routine_name, routine_type 
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name = 'get_user_storage_limit';
   ```

### Option 2: Code Already Handles It (Current State)
The code has been updated to:
- ✅ Suppress error logs for "function not found" errors (PGRST202)
- ✅ Use fallback method to query `subscription_plans` directly
- ✅ Default to 100 MB if all methods fail

**The storage tracking will work even without the function**, but creating it is recommended for better performance.

---

## What Changed

### `lib/storageService.ts`
- Added check for `PGRST202` error code (function not found)
- Suppresses error log if function doesn't exist (since fallback works)
- Logs informational message instead: `ℹ️ [STORAGE] get_user_storage_limit function not found, using fallback method`

---

## Testing

After running the SQL script:
1. Upload a document → Should work without 404 errors
2. Check console → Should see successful storage limit check
3. Check Account Tab → Storage should display correctly

---

## Notes

- The function is defined in `database/04_update_subscription_tables.sql` but may not have been run
- The standalone script `CREATE_GET_USER_STORAGE_LIMIT_FUNCTION.sql` can be run independently
- The code will work with or without the function, but the function provides better performance
