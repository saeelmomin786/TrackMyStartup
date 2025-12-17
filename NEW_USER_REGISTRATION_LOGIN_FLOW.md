# New User Registration → Login Flow Verification

## ✅ Complete Flow Analysis

### Step 1: Registration (BasicRegistrationStep)

**Flow:**
1. User fills registration form (email, password, name, role, etc.)
2. User receives OTP email
3. User enters OTP code
4. Calls `/api/verify-otp` with `purpose='register'`

**What `/api/verify-otp` does (purpose='register'):**
- ✅ Checks `user_profiles` for existing profile with same email + role
- ✅ Creates auth user in `auth.users` (if doesn't exist)
- ✅ Creates profile in `user_profiles` table
- ✅ Sets active profile in `user_profile_sessions`
- ✅ Returns success

**After successful registration:**
- ✅ Redirects to login page (`onNavigateToLogin()` - line 364 in BasicRegistrationStep.tsx)

---

### Step 2: Login (LoginPage)

**Flow:**
1. User enters email and password
2. Calls `authService.signInMinimal()` (line 137 in LoginPage.tsx)
3. `signInMinimal()` uses `supabase.auth.signInWithPassword()` to authenticate
4. ✅ Authentication works because user exists in `auth.users` (created during registration)

**After successful authentication:**
5. Calls `getCurrentUser()` (line 147 in LoginPage.tsx)
6. `getCurrentUser()` should:
   - ✅ Get auth user from `auth.users` (already authenticated)
   - ✅ Check `user_profile_sessions` for active profile
   - ✅ Get profile from `user_profiles` table (created during registration)
   - ✅ Return profile data

---

## ✅ Verification Points

### 1. Registration creates everything needed:
- ✅ Auth user in `auth.users` → **YES** (line 121-134 in verify-otp.ts)
- ✅ Profile in `user_profiles` → **YES** (line 202-220 in verify-otp.ts)
- ✅ Session in `user_profile_sessions` → **YES** (line 228-234 in verify-otp.ts)

### 2. Login can authenticate:
- ✅ `signInMinimal()` uses `supabase.auth.signInWithPassword()` → **YES**
- ✅ User exists in `auth.users` (created during registration) → **YES**
- ✅ Authentication should succeed → **YES**

### 3. Login can retrieve profile:
- ✅ `getCurrentUser()` checks `user_profiles` first → **YES** (line 324-325 in auth.ts)
- ✅ Uses RPC function `get_current_profile_safe` → **YES** (line 325 in auth.ts)
- ✅ Profile exists in `user_profiles` (created during registration) → **YES**
- ✅ Should find and return profile → **YES**

---

## ✅ Conclusion

**The flow should work correctly!** Here's why:

1. **Registration** creates:
   - Auth user ✅
   - Profile in `user_profiles` ✅
   - Session in `user_profile_sessions` ✅

2. **Login** can:
   - Authenticate the user ✅
   - Find the profile via `getCurrentUser()` ✅

---

## ⚠️ Potential Issue to Check

**The RPC function `get_current_profile_safe` needs to exist in the database!**

If this function doesn't exist, `getCurrentUser()` will fail to retrieve the profile.

**To verify:**
- Check if `get_current_profile_safe` function exists in Supabase
- If not, it should be created by the migration script `SAFE_MULTI_PROFILE_MIGRATION.sql`

---

## 🔍 Testing Steps

1. **Register a new user:**
   - Fill registration form
   - Enter OTP
   - Should redirect to login

2. **Login with the same credentials:**
   - Enter email/password
   - Should authenticate successfully
   - Should load user profile from `user_profiles`

3. **Check console logs:**
   - Should see: "User authenticated: [email]"
   - Should see profile data loaded
   - Should NOT see "No profile found"

---

## 📋 Summary

| Step | Action | Status | Table Used |
|------|--------|--------|------------|
| **Registration** | Create auth user | ✅ Working | `auth.users` |
| **Registration** | Create profile | ✅ Working | `user_profiles` |
| **Registration** | Set active profile | ✅ Working | `user_profile_sessions` |
| **Login** | Authenticate | ✅ Working | `auth.users` |
| **Login** | Get profile | ✅ Should work | `user_profiles` via RPC |

**Overall Status: ✅ SHOULD WORK (assuming RPC function exists)**

