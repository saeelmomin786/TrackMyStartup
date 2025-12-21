# Console Error Checklist - Profile Switch Issues

## What to Check in Browser Console

Please check your browser console (F12 → Console tab) and look for these specific messages:

### 🔴 Critical Errors to Look For:

1. **Profile ID Mismatch Warning**
   ```
   ⚠️ Profile ID mismatch! Expected: [profile_id] Got: [auth_user_id]
   ⚠️ Expected role: [role] Got role: [different_role]
   ```
   **Location:** `App.tsx:3715-3718`
   - This confirms Issue #5 (ID mismatch)

2. **Retry Logic Failing**
   ```
   🔄 Attempt 1: Refreshed user after switch: [role] [auth_user_id] Expected: [role] [profile_id]
   🔄 Attempt 2: Refreshed user after switch: [role] [auth_user_id] Expected: [role] [profile_id]
   🔄 Attempt 3: Refreshed user after switch: [role] [auth_user_id] Expected: [role] [profile_id]
   ```
   **Location:** `App.tsx:3693`
   - This confirms the retry logic is failing because IDs don't match

3. **Verification Getting Wrong Profile**
   ```
   🔄 Verified current profile after switch: [old_role] [auth_user_id] Expected profile ID: [profile_id]
   ```
   **Location:** `lib/auth.ts:1100`
   - This confirms Issue #6 (no force refresh, gets cached data)

4. **Profile Not Found in List**
   ```
   ❌ Switched profile not found in list
   ```
   **Location:** `ProfileSwitcher.tsx:90`
   - This could happen if profile comparison fails

### 🟡 Warnings to Look For:

5. **Different User Detected (Cache Clear)**
   ```
   ⚠️ Different user detected, clearing old cache for security
   ```
   **Location:** `lib/auth.ts:391`
   - This should happen but might not if cache isn't being cleared properly

6. **Auth Event Ignored**
   ```
   🚫 Ignoring auth event because ignoreAuthEvents flag is set
   ```
   **Location:** `App.tsx:894`
   - This is normal, but if it's NOT showing, auth listener might be interfering

### 🔵 Info Messages to Check:

7. **Profile Switch Success But Wrong Data**
   ```
   ✅ Profile switch RPC successful, result: [data]
   🔄 Verified current profile after switch: [OLD_ROLE] [auth_user_id] Expected profile ID: [NEW_PROFILE_ID]
   ```
   - Database switch works, but verification gets wrong profile (cache issue)

8. **Multiple getCurrentUser Calls**
   ```
   🔄 Attempt 1: Refreshed user after switch: ...
   🔄 Attempt 2: Refreshed user after switch: ...
   🔄 Attempt 3: Refreshed user after switch: ...
   ```
   - All returning same (wrong) profile = cache issue

---

## What to Share

Please share:

1. **All console errors** (red messages with ❌)
2. **All warnings** (yellow messages with ⚠️)
3. **The specific log messages** when you switch profiles:
   - `🔄 Switching to profile: [id]`
   - `✅ Profile switch RPC successful`
   - `🔄 Verified current profile after switch: [what it shows]`
   - `🔄 Attempt X: Refreshed user after switch: [what it shows]`
   - `⚠️ Profile ID mismatch! Expected: [X] Got: [Y]`

4. **What you see in the UI:**
   - What profile name/role shows in the header?
   - What profile name/role shows in the dashboard?
   - What profile is highlighted in ProfileSwitcher dropdown?

---

## Expected vs Actual Behavior

### Expected (After Fix):
```
🔄 Switching to profile: profile-123
✅ Profile switch RPC successful
🔄 Verified current profile after switch: Mentor profile-123 Expected profile ID: profile-123
✅ Got correct profile!
✅ Updating currentUser state with: Mentor
🔄 Profile complete, reloading data for role: Mentor
```

### Actual (Current Bug):
```
🔄 Switching to profile: profile-123
✅ Profile switch RPC successful
🔄 Verified current profile after switch: Startup auth-user-id Expected profile ID: profile-123
⚠️ Profile ID mismatch! Expected: profile-123 Got: auth-user-id
🔄 Attempt 1: Refreshed user after switch: Startup auth-user-id Expected: Mentor profile-123
🔄 Attempt 2: Refreshed user after switch: Startup auth-user-id Expected: Mentor profile-123
🔄 Attempt 3: Refreshed user after switch: Startup auth-user-id Expected: Mentor profile-123
```

---

## Quick Test

1. Open browser console (F12)
2. Switch to a different profile
3. Copy ALL console messages from the moment you click "Switch Profile"
4. Share them here

This will help confirm which specific issues are happening in your case!

