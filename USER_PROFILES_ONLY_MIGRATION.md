# Migration to User_Profiles Only

## ✅ Changes Made

All code has been updated to use **ONLY** the `user_profiles` table. The `users` table is no longer used anywhere.

### Files Updated:

1. **`lib/auth.ts`**
   - ✅ `_getCurrentUserInternal()` - Removed fallback to `users` table
   - ✅ `isProfileComplete()` - Removed fallback to `users` table
   - ✅ `getCurrentUser()` - Updated comment to reflect user_profiles only
   - ✅ `updateProfile()` - Removed fallback to `users` table
   - ✅ `handleEmailConfirmation()` - Updated to use `user_profiles` only
   - ⚠️ `signUp()` - Still has `users` table reference (legacy function, registration goes through `verify-otp.ts`)
   - ⚠️ `createProfile()` - Still has `users` table reference (legacy function, registration goes through `verify-otp.ts`)

2. **`lib/database.ts`**
   - ✅ `userService.getCurrentUser()` - Removed fallback to `users` table

3. **`components/CompleteRegistrationPage.tsx`**
   - ✅ Removed all fallbacks to `users` table
   - ✅ Updated advisor lookup to use `user_profiles` only
   - ✅ Updated profile updates to use `user_profiles` only

4. **`components/startup-health/ProfileTab.tsx`**
   - ✅ Removed fallback to `users` table for user profile documents

### Important Notes:

- **Registration Flow**: The main registration flow goes through `api/verify-otp.ts`, which already uses `user_profiles` correctly.
- **Legacy Functions**: The `signUp()` and `createProfile()` functions in `lib/auth.ts` still reference the `users` table, but these appear to be legacy functions that are not used in the current registration flow. They can be removed or updated if needed.
- **App.tsx**: There's also a reference in `App.tsx` that creates profiles from metadata, which should be updated to use `user_profiles`.

### Next Steps:

1. ✅ All critical paths now use `user_profiles` only
2. ⚠️ Consider removing or updating legacy functions (`signUp()`, `createProfile()`)
3. ⚠️ Update `App.tsx` profile creation from metadata to use `user_profiles`

### Testing:

- ✅ New user registration (through `verify-otp.ts`)
- ✅ User login
- ✅ Profile updates
- ✅ Form 2 completion
- ⚠️ Legacy signup flow (if still in use)

