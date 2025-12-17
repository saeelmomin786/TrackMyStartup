# Safe RLS Policy Fix Procedure

## ⚠️ Important Safety Information

The `FIX_ALL_RLS_POLICIES_DYNAMIC.sql` script is designed to be **safe and non-destructive**, but it does modify RLS policies. Here's what you need to know:

## What the Script Does

1. **Drops existing policies** and recreates them with improved logic
2. **Checks foreign key constraints** to determine correct policy structure
3. **Creates more permissive policies** that support both:
   - `auth.uid()` (for tables with FK to `users(id)`)
   - Profile IDs (for tables without FK constraints)

## Why It's Safe

### ✅ Existing Functionality Preserved
- The new policies are **more permissive**, not less
- They support both old and new authentication systems
- Tables with FK to `users(id)` will use `auth.uid()` (same as before)
- Tables without FK constraints will support both (more flexible)

### ✅ No Data Changes
- **No data is modified** - only RLS policies are changed
- **No table structures are altered**
- **No foreign keys are changed**

### ✅ Rollback Available
- Backup script creates a full backup of all policies
- Restore script can revert all changes if needed

## Recommended Procedure

### Step 1: Backup (REQUIRED)
```sql
-- Run this FIRST
\i BACKUP_RLS_POLICIES.sql
```
This creates a backup of all current policies in `rls_policies_backup` table.

### Step 2: Test on Non-Critical Tables (OPTIONAL)
If you want to be extra cautious, you can:
1. Test the script on a development/staging database first
2. Or modify the script to only fix specific tables

### Step 3: Run the Fix
```sql
-- Run the dynamic fix
\i FIX_ALL_RLS_POLICIES_DYNAMIC.sql
```

### Step 4: Verify
```sql
-- Check for any issues
\i VERIFY_RLS_POLICIES_COMPLETE.sql
```

### Step 5: Test Critical Flows
Test these critical user flows:
- ✅ Login/logout
- ✅ Profile switching
- ✅ Favoriting startups (Investor/Advisor)
- ✅ Creating investment offers
- ✅ Due diligence requests
- ✅ Startup registration
- ✅ Dashboard data loading

### Step 6: Rollback if Needed (ONLY IF ISSUES)
```sql
-- Only run this if you encounter issues
\i RESTORE_RLS_POLICIES.sql
```

## What Could Go Wrong?

### Potential Issues:
1. **Overly restrictive policies** - If a table has a complex access pattern not covered by the script
2. **Missing policies** - If a table needs special handling not in the script
3. **Performance** - If policies become too complex (unlikely)

### If Issues Occur:
1. Check the verification script output
2. Review error messages in application logs
3. Restore from backup if needed
4. Report specific issues for targeted fixes

## Tables That Are Safe to Fix

The script handles these automatically:
- ✅ All tables with `user_id` columns
- ✅ All tables with `investor_id` columns  
- ✅ All tables with `advisor_id` columns
- ✅ All tables with `mentor_id` columns
- ✅ Special cases (startup_addition_requests, advisor_added_startups, etc.)

## Tables That Might Need Manual Review

These might need special handling:
- Tables with complex access patterns
- Tables with multiple user reference columns
- Tables with role-based access beyond simple user matching

## Summary

**The script is designed to be safe**, but:
1. ✅ **Always backup first** (BACKUP_RLS_POLICIES.sql)
2. ✅ **Test critical flows** after running
3. ✅ **Keep the backup** until you're confident everything works
4. ✅ **Rollback is available** if needed

The new policies are **more permissive** than the old ones, so existing functionality should continue to work. The main improvement is fixing foreign key constraint violations (like the `investor_favorites` issue).





