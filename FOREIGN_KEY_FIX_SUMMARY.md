# Foreign Key Constraint Fix - Summary

## 🔴 **Problem**
```
insert or update on table "mentor_requests" violates foreign key constraint "mentor_requests_requester_id_fkey"
```

## 🔍 **Root Cause**
The system now uses `user_profiles` table instead of `users` table. The foreign key constraint in `mentor_requests` requires:
- `requester_id` → must reference `auth.users(id)`
- `mentor_id` → must reference `auth.users(id)`

But the code was potentially passing:
- `user_profiles.id` (profile ID) instead of `user_profiles.auth_user_id` (auth user ID)

## ✅ **Solution Implemented**

### 1. **Updated `lib/mentorService.ts` - `sendConnectRequest()`**
- ✅ Now gets `auth_user_id` directly from `supabase.auth.getUser()`
- ✅ Uses the actual auth user ID (not profile ID) for `requester_id`
- ✅ Handles mentor ID conversion (if it's a profile_id, converts to auth_user_id)
- ✅ Validates both IDs before insert

### 2. **Updated `lib/auth.ts` - `_mapProfileToAuthUser()`**
- ✅ Changed to prioritize `auth_user_id` over `profile_id` for the `id` field
- ✅ This ensures `currentUser.id` is the auth_user_id (which matches foreign key)

### 3. **Validation Logic**
- ✅ Checks if mentor ID exists in `user_profiles`
- ✅ Converts profile_id to auth_user_id if needed
- ✅ Provides helpful error messages

## 📋 **How It Works Now**

1. **When Startup Sends Request:**
   ```typescript
   // Gets auth_user_id from current session
   const { data: { user } } = await supabase.auth.getUser();
   const actualRequesterId = user.id; // This is auth.users.id ✅
   
   // Inserts with correct ID
   mentor_requests.insert({
     requester_id: actualRequesterId, // ✅ Matches foreign key
     mentor_id: actualMentorId,       // ✅ Matches foreign key
   })
   ```

2. **Mentor ID Handling:**
   - If mentorId is `auth_user_id` → Use directly ✅
   - If mentorId is `profile_id` → Convert to `auth_user_id` ✅

## 🎯 **Key Points**

- **Foreign Key Constraint:** `mentor_requests.requester_id` → `auth.users(id)` ✅
- **Foreign Key Constraint:** `mentor_requests.mentor_id` → `auth.users(id)` ✅
- **What We Pass:** `auth.users.id` (same as `user_profiles.auth_user_id`) ✅
- **What We DON'T Pass:** `user_profiles.id` (profile ID) ❌

## ✅ **Testing**

1. **Test Sending Request:**
   - Login as startup
   - Click "Connect" on a mentor
   - Should work without foreign key error ✅

2. **Verify IDs:**
   - Check browser console - should see correct auth_user_id
   - No more foreign key violations ✅

## 📝 **Files Changed**

1. ✅ `lib/mentorService.ts` - Fixed `sendConnectRequest()` to use auth_user_id
2. ✅ `lib/auth.ts` - Updated `_mapProfileToAuthUser()` to prioritize auth_user_id
3. ✅ Created diagnostic SQL: `FIX_MENTOR_REQUESTS_FK_TO_USER_PROFILES.sql`

---

**Status: ✅ Fixed - Now uses auth_user_id (auth.users.id) instead of profile_id**


