# Profile Switch Issues - Root Cause Analysis

## Issues Identified

### 🔴 **ISSUE #1: ID Mismatch Between Profile ID and CurrentUser ID**

**Location:** `lib/auth.ts:468` and `components/ProfileSwitcher.tsx:74`

**Problem:**
- `_mapProfileToAuthUser()` sets `id: profile.auth_user_id || profile.profile_id || profile.id`
- This means `currentUser.id` = `auth_user_id` (stays constant across profile switches)
- But `ProfileSwitcher` receives `currentProfileId={currentUser.id}` which is `auth_user_id`
- `ProfileSwitcher` compares `profileId === currentProfile?.id` where `profileId` is `profile_id` (changes on switch)
- `currentProfile.id` from `getUserProfiles()` is also `profile_id`
- **Result:** Comparison always fails, so ProfileSwitcher can't detect which profile is active

**Evidence:**
```typescript
// RPC function returns: profile_id and auth_user_id separately
// SAFE_MULTI_PROFILE_MIGRATION_DYNAMIC.sql:277-278
SELECT p.id::UUID as profile_id, p.auth_user_id::UUID as auth_user_id, ...

// lib/auth.ts:468 - WRONG: Prioritizes auth_user_id!
id: profile.auth_user_id || profile.profile_id || profile.id, // Returns auth_user_id!

// App.tsx:3681
<ProfileSwitcher currentProfileId={currentUser.id} /> // This is auth_user_id!

// ProfileSwitcher.tsx:74
if (profileId === currentProfile?.id) { // profileId is profile_id, currentProfile.id is profile_id
  // But currentProfileId prop is auth_user_id - MISMATCH!
}
```

**Root Cause:** The RPC function correctly returns both `profile_id` and `auth_user_id`, but `_mapProfileToAuthUser()` incorrectly prioritizes `auth_user_id` for the `id` field. It should use `profile_id` as the primary identifier.

---

### 🔴 **ISSUE #2: Cache Not Cleared on Profile Switch**

**Location:** `lib/auth.ts:369-406` and `lib/auth.ts:1073-1106`

**Problem:**
- `getCurrentUser()` has a 5-second cache based on `auth_user_id`
- When `switchProfile()` is called, it doesn't clear `_getCurrentUserCache`
- After switching profiles, if `getCurrentUser()` is called within 5 seconds, it returns **cached old profile data**
- The cache key is `auth_user_id`, which stays the same, so cache thinks it's valid

**Evidence:**
```typescript
// lib/auth.ts:1073 - switchProfile() doesn't clear cache
async switchProfile(profileId: string) {
  // ... switches profile in database ...
  const currentProfile = await this.getCurrentUser(); // Might return cached old profile!
  // No cache clear here!
}

// lib/auth.ts:384 - Cache check
if (_getCurrentUserCache.promise && 
    (now - _getCurrentUserCache.timestamp) < GET_CURRENT_USER_CACHE_MS &&
    _getCurrentUserCache.userId === currentUserId) { // auth_user_id matches, cache valid!
  return _getCurrentUserCache.promise; // Returns OLD profile data!
}
```

---

### 🔴 **ISSUE #3: Auth State Listener Resets Profile After Switch**

**Location:** `App.tsx:882-1052`

**Problem:**
- Auth state listener fires after profile switch
- It checks `currentUserRef.current.id === session.user.id` (both are `auth_user_id`, so always match)
- But it calls `getCurrentUser()` which might return **cached old profile** (Issue #2)
- This overwrites the newly switched profile with old cached data
- The listener doesn't know a profile switch happened, so it "refreshes" with stale data

**Evidence:**
```typescript
// App.tsx:1050-1052
if (isMounted && (!currentUserRef.current || !currentUserRef.current.role) && !hasInitialDataLoadedRef.current) {
  const completeUser = await authService.getCurrentUser(); // Gets cached old profile!
  // Overwrites currentUser with old profile
}
```

---

### 🔴 **ISSUE #4: Dashboard Uses Stale currentUser State**

**Location:** `App.tsx:3682-3754`

**Problem:**
- After profile switch, `setCurrentUser(refreshedUser)` is called
- But React state updates are asynchronous
- Dashboard components might render with **old `currentUser`** before state updates
- Multiple components read `currentUser` at different times, causing mismatches
- Header shows new profile, dashboard shows old profile (or vice versa)

**Evidence:**
```typescript
// App.tsx:3730
setCurrentUser(refreshedUser); // Async state update

// App.tsx:3754
fetchData(true); // Might run before currentUser state updates

// Dashboard components read currentUser at different render cycles
// Header reads: new profile
// Dashboard reads: old profile (stale state)
```

---

### 🔴 **ISSUE #5: Profile ID Comparison in onProfileSwitch**

**Location:** `App.tsx:3696`

**Problem:**
- `onProfileSwitch` callback compares `refreshedUser.id === profile.id`
- But `refreshedUser.id` is `auth_user_id` (from `_mapProfileToAuthUser`)
- `profile.id` is `profile_id` (from `getUserProfiles`)
- **They will NEVER match!** This causes the retry logic to fail

**Evidence:**
```typescript
// App.tsx:3696
if (refreshedUser && refreshedUser.id === profile.id) { // auth_user_id === profile_id? NEVER!
  console.log('✅ Got correct profile!');
  break;
}

// This check always fails, so retry logic runs 3 times and still fails
```

---

### 🔴 **ISSUE #6: No Force Refresh in switchProfile Verification**

**Location:** `lib/auth.ts:1099`

**Problem:**
- `switchProfile()` calls `getCurrentUser()` to verify the switch
- But it doesn't pass `forceRefresh: true`
- So it gets **cached old profile** instead of fresh data from database
- Verification always fails or shows wrong profile

**Evidence:**
```typescript
// lib/auth.ts:1099
const currentProfile = await this.getCurrentUser(); // No forceRefresh!
// Gets cached old profile, not the newly switched one!
```

---

### 🔴 **ISSUE #7: Page Refresh Falls Back to Wrong Profile**

**Location:** `App.tsx:1050-1052` and `lib/auth.ts:444-462`

**Problem:**
- On page refresh, auth state listener calls `getCurrentUser()`
- If cache is stale or RPC returns wrong profile, it loads wrong profile
- No verification that loaded profile matches what user expects
- Falls back to first profile or cached profile instead of active profile

---

## Summary of Root Causes

1. **ID Confusion**: `currentUser.id` is `auth_user_id`, but comparisons expect `profile_id`
2. **Cache Pollution**: Cache not cleared on profile switch, returns old profile
3. **Race Conditions**: State updates are async, components read stale data
4. **Missing Force Refresh**: `getCurrentUser()` calls don't force refresh after switch
5. **Wrong Comparisons**: Comparing `auth_user_id` with `profile_id` always fails

---

## Impact

- ✅ Profile switch updates database correctly
- ❌ Frontend state doesn't update correctly
- ❌ Header shows one profile, dashboard shows another
- ❌ After refresh, wrong profile loads
- ❌ ProfileSwitcher can't detect active profile
- ❌ Retry logic fails because of ID mismatch

---

## Files Affected

1. `lib/auth.ts` - ID mapping, cache management, switchProfile
2. `App.tsx` - Profile switch callback, auth state listener
3. `components/ProfileSwitcher.tsx` - Profile comparison logic

---

## Next Steps (To Fix)

1. **Fix ID mapping** - Change `_mapProfileToAuthUser()` to use `profile_id` as `id` (not `auth_user_id`)
2. **Clear cache** - Clear `_getCurrentUserCache` in `switchProfile()` before calling `getCurrentUser()`
3. **Force refresh** - Use `forceRefresh: true` in all `getCurrentUser()` calls after profile switch
4. **Fix comparisons** - Update all comparisons to use `profile_id` consistently
5. **Store both IDs** - Consider adding both `profile_id` and `auth_user_id` to AuthUser interface
6. **Update listener** - Make auth state listener respect profile switches and clear cache

---

## Quick Reference: What's Broken

| Component | Expected | Actual | Impact |
|-----------|----------|--------|--------|
| `currentUser.id` | `profile_id` | `auth_user_id` | All comparisons fail |
| ProfileSwitcher | Shows active profile | Can't detect active | Wrong profile highlighted |
| Dashboard | Shows new profile data | Shows old cached data | Mismatch with header |
| After refresh | Loads active profile | Loads cached/wrong profile | Falls back to wrong profile |
| Profile switch verification | Confirms new profile | Gets cached old profile | Verification fails |

---

## Critical Fix Priority

1. **HIGHEST**: Fix `_mapProfileToAuthUser()` to use `profile_id` as `id`
2. **HIGH**: Clear cache in `switchProfile()` 
3. **HIGH**: Use `forceRefresh: true` after profile switch
4. **MEDIUM**: Fix ProfileSwitcher comparison logic
5. **MEDIUM**: Update auth state listener to clear cache on profile switch

