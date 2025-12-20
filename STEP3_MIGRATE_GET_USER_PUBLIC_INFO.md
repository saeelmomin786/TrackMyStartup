# Step 3: Migrate get_user_public_info() Function

## Function Analysis

**Current State:**
- Function: `get_user_public_info(p_user_id UUID)`
- Current Implementation: Queries `public.users` table
- Return Type: JSON object with `{id, name, email, company_name}`
- Used For: Displaying lead investor information in co-investment offers

**Frontend Impact:** ✅ **NONE**
- Function signature stays the same: `get_user_public_info(UUID) RETURNS JSON`
- Return format stays the same: JSON object with same fields
- Only internal implementation changes (queries `user_profiles` instead of `users`)

## Migration Strategy

Since all users have profiles in `user_profiles`:
1. Query `user_profiles` instead of `users` table
2. Use `auth_user_id` to match (since p_user_id is auth user ID)
3. Get most recent profile if user has multiple profiles
4. Map `company_name` from `company`, `firm_name`, or `startup_name` fields
5. Keep same return format (JSON with id, name, email, company_name)

## SQL Script

See: `MIGRATE_GET_USER_PUBLIC_INFO_FUNCTION.sql`

## After Migration

**Test:**
1. Run the SQL script in Supabase SQL Editor
2. If used in frontend, test co-investment offer display
3. Verify public user info displays correctly

**No Frontend Changes Needed** - This is a pure database optimization.

---

## Next Step After This

Once this is confirmed working, we'll proceed to:
- Check and migrate `set_advisor_offer_visibility()` if it exists
- Then continue with remaining frequently used functions



