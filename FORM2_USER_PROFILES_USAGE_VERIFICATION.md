# Form 2 - User Profiles Usage Verification

## Summary

**Question:** Are we using `user_profiles` everywhere in Registration Form 2?

**Answer:** ✅ **YES** - We are using `user_profiles` table everywhere for new users, with fallback to `users` table only for backward compatibility with old users.

---

## ✅ Correct Usage Locations

### 1. **Profile Detection (Line 488-504)** ✅ FIXED
- **Location:** `checkUserAndRedirect()` function
- **What it does:** Checks if profile exists in `user_profiles` by `auth_user_id`
- **Status:** ✅ FIXED - Now correctly checks by `auth_user_id` instead of `id`

```typescript
// ✅ FIXED: Checks user_profiles by auth_user_id (correct)
const { data: profileCheck } = await authService.supabase
  .from('user_profiles')
  .select('id, auth_user_id')
  .eq('auth_user_id', user.id)  // ✅ Correct - user.id is auth_user_id
  .maybeSingle();

if (profileCheck) {
  // Update using profile ID
  await supabase.from('user_profiles').update(...).eq('id', profileCheck.id);
} else {
  // Fallback to users table (backward compatibility)
  await supabase.from('users').update(...).eq('id', user.id);
}
```

### 2. **Main Profile Update (Line 1151-1189)** ✅ CORRECT
- **Location:** `handleSubmit()` function
- **What it does:** Updates user profile with Form 2 data
- **Status:** ✅ CORRECT - Checks `user_profiles` first, falls back to `users`

```typescript
// ✅ Correct: Checks by profile ID first, then by auth_user_id
const { data: profileById } = await authService.supabase
  .from('user_profiles')
  .select('id, auth_user_id')
  .eq('id', userData.id)
  .maybeSingle();

if (profileById) {
  profileCheck = profileById;
} else if (authUserId) {
  // If not found by ID, try by auth_user_id (for new registrations)
  const { data: profileByAuth } = await authService.supabase
    .from('user_profiles')
    .select('id, auth_user_id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  
  if (profileByAuth) {
    profileCheck = profileByAuth;
    userData.id = profileByAuth.id; // Update to actual profile ID
  }
}

const tableToUpdate = profileCheck ? 'user_profiles' : 'users';
// Updates correct table
```

### 3. **Profile Completion Flag (Line 1237-1244)** ✅ CORRECT
- **Location:** `handleSubmit()` function
- **What it does:** Sets `is_profile_complete = true` after successful update
- **Status:** ✅ CORRECT - Only updates `user_profiles` (new system)

```typescript
// ✅ Correct: Only updates user_profiles (new system only)
if (profileCheck) {
  await authService.supabase
    .from('user_profiles')
    .update({ is_profile_complete: true })
    .eq('id', userData.id);
}
```

### 4. **Investment Advisor Lookup (Line 1534-1557)** ✅ CORRECT
- **Location:** `handleSubmit()` function (advisor auto-linking)
- **What it does:** Finds Investment Advisor by code
- **Status:** ✅ CORRECT - Checks `user_profiles` first, falls back to `users`

```typescript
// ✅ Correct: Checks user_profiles first
const { data: advisorProfile } = await authService.supabase
  .from('user_profiles')
  .select('id, auth_user_id, investment_advisor_code, name')
  .eq('investment_advisor_code', advisorCodeFromInvite)
  .eq('role', 'Investment Advisor')
  .maybeSingle();

if (advisorProfile) {
  advisorAuthUserId = advisorProfile.auth_user_id; // ✅ Uses auth_user_id
} else {
  // Fallback to users table (backward compatibility)
  const { data: oldAdvisorData } = await authService.supabase
    .from('users')
    .select('id, investment_advisor_code, name')
    .eq('investment_advisor_code', advisorCodeFromInvite)
    .eq('role', 'Investment Advisor')
    .maybeSingle();
}
```

### 5. **Profile ID Selection (Line 539-557)** ✅ FIXED
- **Location:** `checkUserAndRedirect()` function
- **What it does:** Determines which profile ID to use
- **Status:** ✅ FIXED - Now uses profile ID from `profileData` instead of `user.id`

```typescript
// ✅ FIXED: Uses profile ID from profileData, not auth_user_id
const actualProfileId = newProfileId || (profileData && (profileData as any).id) || user.id;
setUserData({
  id: actualProfileId, // ✅ Profile ID, not auth_user_id
  // ...
});
```

---

## ✅ Other Tables (Correct Usage)

### 6. **Startups Table (Line 1274-1341)** ✅ CORRECT
- **Status:** ✅ CORRECT - Uses `auth_user_id` (from `auth.users`) for `startups.user_id`
- **Note:** This is correct - `startups.user_id` uses `auth_user_id`, not profile ID

```typescript
// ✅ Correct: startups.user_id uses auth_user_id
const { data: { user: authUser } } = await authService.supabase.auth.getUser();
const authUserId = authUser.id;

await authService.supabase
  .from('startups')
  .insert({
    user_id: authUserId  // ✅ Uses auth_user_id, not profile ID
  });
```

### 7. **Founders, Shares, Subsidiaries** ✅ CORRECT
- **Status:** ✅ CORRECT - All linked to `startup_id`, not user ID
- **Note:** These don't need changes

---

## ⚠️ Fallback to `users` Table (Backward Compatibility)

The code **intentionally** falls back to the `users` table in these cases:

1. **Profile Updates (Line 1188):** If profile not found in `user_profiles`, updates `users` table
2. **Profile Detection (Line 464-469):** If `getCurrentUser()` returns null, tries `users` table directly
3. **Investment Advisor Lookup (Line 1546-1556):** If not found in `user_profiles`, checks `users` table

**This is correct behavior** - it ensures backward compatibility with existing users in the old system.

---

## Summary Table

| Operation | Table Used | ID Used | Status |
|-----------|------------|---------|--------|
| **Profile Detection (initial)** | `user_profiles` → `users` | `auth_user_id` → `id` | ✅ FIXED |
| **Profile Update** | `user_profiles` → `users` | Profile ID / `auth_user_id` | ✅ CORRECT |
| **Profile Completion Flag** | `user_profiles` only | Profile ID | ✅ CORRECT |
| **Investment Advisor Lookup** | `user_profiles` → `users` | `auth_user_id` | ✅ CORRECT |
| **Profile ID Selection** | N/A | Profile ID from `profileData` | ✅ FIXED |
| **Startups Creation** | `startups` | `auth_user_id` | ✅ CORRECT |
| **Founders/Shares/Subsidiaries** | Respective tables | `startup_id` | ✅ CORRECT |

---

## Conclusion

✅ **YES** - Form 2 is correctly using `user_profiles` everywhere for new users.

✅ All new user registrations go to `user_profiles` table.

✅ Backward compatibility is maintained with `users` table fallback for old users.

✅ All ID references are correct (profile ID vs `auth_user_id`).

