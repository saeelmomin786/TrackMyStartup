# Step 1: Migrate get_user_role() Function

## Function Analysis

**Current State:**
- Function: `get_user_role()`
- Current Implementation: Queries `public.users` table
- Return Type: TEXT
- Used In: Storage policies, helper functions (is_admin, is_startup, etc.)

**Frontend Impact:** ✅ **NONE**
- Function signature stays the same: `get_user_role() RETURNS TEXT`
- Only internal implementation changes (queries `user_profiles` instead of `users`)

## Migration Strategy

Since `auth.uid()` can have multiple profiles in `user_profiles`, we need to:
1. Query `user_profiles` for the user's most recent profile
2. Fallback to `users` table for backward compatibility
3. Return the role as TEXT (same as before)

## SQL Script

See: `MIGRATE_GET_USER_ROLE_FUNCTION.sql`

## After Migration

**Test:**
1. Run the SQL script in Supabase SQL Editor
2. Verify function still works: `SELECT get_user_role();`
3. Test storage policies still work (files should still be accessible)
4. Check helper functions (is_admin, is_startup, etc.) still work

**No Frontend Changes Needed** - This is a pure database function used in RLS policies.

---

## Next Step After This

Once this is confirmed working, we'll proceed to:
- Step 2: Migrate `get_current_profile_safe()` function (used in frontend)


