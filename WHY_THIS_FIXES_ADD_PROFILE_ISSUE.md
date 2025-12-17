# Why This Script Fixes the "Add Profile" Issue

## Your Scenario

1. ✅ **User is already registered as Startup** (has existing profile)
2. ✅ **User is logged in** (authenticated)
3. ✅ **User clicks "Add Profile"** from dashboard
4. ✅ **User selects "Mentor" role** and fills Form 1
5. ❌ **Form 2 fails** with "Failed to update user profile" error
6. ⚠️ **Profile appears but incomplete** (missing Form 2 data)

## Why It Fails

### Step-by-Step What Happens:

**Form 1 (BasicRegistrationStep):**
```
✅ Creates new profile in user_profiles table
   - INSERT operation
   - Uses: auth_user_id (same as Startup profile)
   - Creates: New Mentor profile with different role
   - Status: ✅ WORKS (INSERT policy exists)
```

**Form 2 (CompleteRegistrationPage):**
```
❌ Tries to UPDATE the new Mentor profile
   - UPDATE operation
   - Updates: government_id, documents, address, phone, etc.
   - Updates: is_profile_complete = true
   - Status: ❌ FAILS (UPDATE policy missing WITH CHECK clause)
```

## The Problem

The RLS UPDATE policy for `user_profiles` is:
```sql
-- CURRENT (BROKEN):
CREATE POLICY "Users can update their own profiles" 
    FOR UPDATE
    USING (auth.uid() = auth_user_id);
    -- ❌ Missing WITH CHECK clause!
```

PostgreSQL/Supabase requires **BOTH** clauses for UPDATE:
- `USING`: Checks if you can see the existing row ✅ (exists)
- `WITH CHECK`: Checks if you can update with new values ❌ (missing!)

## The Fix

The script fixes it to:
```sql
-- FIXED:
CREATE POLICY "Users can update their own profiles" 
    FOR UPDATE
    USING (auth.uid() = auth_user_id)      -- ✅ Can see row
    WITH CHECK (auth.uid() = auth_user_id); -- ✅ Can update row
```

## Why This Works for Your Scenario

1. **Same auth_user_id**: Both Startup and Mentor profiles share the same `auth_user_id` (your email account)
2. **Policy checks auth_user_id**: The policy allows updates if `auth.uid() = auth_user_id`
3. **Both profiles belong to you**: Since both profiles have the same `auth_user_id`, you can update both
4. **Form 2 will now succeed**: The UPDATE operation will pass the RLS check

## What Gets Fixed

After running the script:

**Before:**
```
Form 1: ✅ Creates Mentor profile
Form 2: ❌ Fails to update Mentor profile
Result: Profile exists but incomplete
```

**After:**
```
Form 1: ✅ Creates Mentor profile
Form 2: ✅ Successfully updates Mentor profile
Result: Complete profile with all Form 2 data saved
```

## Security

The fix is **secure** because:
- ✅ Only allows updates to profiles where `auth.uid() = auth_user_id`
- ✅ You can only update your own profiles (same email account)
- ✅ Cannot update other users' profiles
- ✅ Same security level, just correct policy structure

## Test After Running Script

1. Log in as Startup profile
2. Click "Add Profile"
3. Select "Mentor" role
4. Fill Form 1 → Submit
5. Fill Form 2 → Submit
6. ✅ Should complete without "Failed to update user profile" error
7. ✅ Check profile - all Form 2 data should be saved






