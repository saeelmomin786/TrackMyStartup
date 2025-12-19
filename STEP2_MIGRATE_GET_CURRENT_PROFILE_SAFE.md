# Step 2: Migrate get_current_profile_safe() Function

## Function Analysis

**Current State:**
- Function: `get_current_profile_safe(auth_user_uuid UUID)`
- Current Implementation: Queries `user_profiles` + `user_profile_sessions`, falls back to `users` table
- Return Type: TABLE (returns array)
- Used In: Frontend (`lib/auth.ts` line 346)

**Frontend Impact:** ✅ **NONE**
- Function signature stays the same: `get_current_profile_safe(UUID) RETURNS TABLE`
- Return format stays the same: Array of profile objects
- Only internal implementation changes (removes fallback to `users` table)

## Migration Strategy

Since all users have profiles in `user_profiles`:
1. Remove the fallback to `users` table
2. Keep the same function signature
3. Keep the same return format (all columns stay the same)
4. Use optimized join query (no conditional logic)

## SQL Script

See: `MIGRATE_GET_CURRENT_PROFILE_SAFE_FUNCTION.sql`

## After Migration

**Test:**
1. Run the SQL script in Supabase SQL Editor
2. Test login in frontend - should work as before
3. Verify `getCurrentUser()` still works correctly
4. Check that profile data loads correctly

**No Frontend Changes Needed** - This is a pure database optimization.

---

## Next Step After This

Once this is confirmed working, we'll proceed to:
- Step 3: Migrate `get_user_public_info()` function (check frontend usage first)


