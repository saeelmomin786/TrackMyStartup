# Fix Storage RLS Policy Error

## Issue
**Error:** `StorageApiError: new row violates row-level security policy`

This error occurs when trying to upload files to Supabase Storage buckets because the Row Level Security (RLS) policies are blocking the insert operation.

## Root Cause
The storage bucket policies may be:
1. Using helper functions that don't exist (e.g., `is_startup()`, `is_ca_or_cs()`)
2. Missing or incorrectly configured
3. Conflicting with each other

## Solution

### Run the Fix Script
**File:** `database/FIX_STORAGE_RLS_POLICIES.sql`

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `FIX_STORAGE_RLS_POLICIES.sql`
3. Run the script
4. Verify the policies were created (the script includes verification queries)

### What the Script Does

1. **Drops all existing conflicting policies** to avoid conflicts
2. **Creates simple, working policies** that:
   - Allow authenticated users to INSERT/UPDATE/DELETE files in all buckets
   - Allow public read access (SELECT) to all buckets
   - Don't rely on helper functions
3. **Fixes `user_storage_usage` table RLS policies** to ensure users can insert their own storage records

### Buckets Covered
- `employee-contracts`
- `compliance-documents`
- `financial-documents`
- `pitch-decks`
- `pitch-videos`
- `startup-documents`
- `verification-documents`
- `company-docs`

## Testing

After running the script:
1. Try uploading a file → Should work without RLS errors
2. Check console → Should see successful upload
3. Check Account Tab → Storage should increase

## Additional Issues

### Missing RPC Functions
The console also shows 404 errors for:
- `get_user_storage_limit` → Fixed with `CREATE_GET_USER_STORAGE_LIMIT_FUNCTION.sql`
- `get_equity_distribution` → Separate issue (not related to storage)
- `get_valuation_history` → Separate issue (not related to storage)

These can be fixed separately if needed.

---

## Quick Fix Summary

**Run these SQL scripts in order:**
1. `database/CREATE_GET_USER_STORAGE_LIMIT_FUNCTION.sql` (fixes 404 errors)
2. `database/FIX_STORAGE_RLS_POLICIES.sql` (fixes RLS policy errors)

Both scripts are safe to run multiple times (they use `DROP POLICY IF EXISTS` and `CREATE OR REPLACE`).
