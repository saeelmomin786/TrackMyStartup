# Form 2 (CompleteRegistrationPage) Verification Checklist

## ✅ Verified Configurations

### 1. **Profile Update - user_profiles Table** ✅
- **Location:** Lines 1151-1189
- **Status:** ✅ CORRECT
- **What it does:**
  - Checks if profile exists in `user_profiles` by profile ID
  - Falls back to checking by `auth_user_id` (for new registrations)
  - Updates `user_profiles` table if profile found
  - Falls back to `users` table only for old users (backward compatibility)
- **Fields Updated:**
  - ✅ government_id
  - ✅ ca_license
  - ✅ verification_documents
  - ✅ logo_url (Investment Advisor)
  - ✅ financial_advisor_license_url (Investment Advisor)
  - ✅ center_name (Facilitator)
  - ✅ country
  - ✅ company_type
  - ✅ registration_date
  - ✅ currency
  - ✅ ca_service_code
  - ✅ cs_service_code
  - ✅ investment_advisor_code_entered
  - ✅ is_profile_complete (set to true after update)

### 2. **Startup Creation - startups Table** ✅
- **Location:** Lines 1264-1341
- **Status:** ✅ CORRECT
- **What it does:**
  - Uses `auth_user_id` (from `auth.users`) for `startups.user_id` ✅
  - Creates startup record with all required fields
  - Updates startup with profile data (country, company_type, etc.)
- **Important:** Uses `auth_user_id`, NOT profile ID (correct!)

### 3. **Founders Creation - founders Table** ✅
- **Location:** Lines 1345-1366
- **Status:** ✅ CORRECT
- **What it does:**
  - Links founders to startup by `startup_id`
  - Saves founder data correctly

### 4. **Startup Shares - startup_shares Table** ✅
- **Location:** Lines 1407-1426
- **Status:** ✅ CORRECT
- **What it does:**
  - Syncs shares data to `startup_shares` table
  - Links to startup by `startup_id`

### 5. **Subsidiaries Creation - subsidiaries Table** ✅
- **Location:** Lines 1478-1496
- **Status:** ✅ CORRECT
- **What it does:**
  - Creates subsidiaries linked to startup
  - Saves CA/CS codes correctly

### 6. **International Operations - international_operations Table** ✅
- **Location:** Lines 1498-1514
- **Status:** ✅ CORRECT
- **What it does:**
  - Creates international operations linked to startup

### 7. **Investment Advisor Auto-Linking** ✅ FIXED
- **Location:** Lines 1529-1598
- **Status:** ✅ CORRECT
- **What it does:**
  - Checks `user_profiles` table first (new system)
  - Falls back to `users` table (backward compatibility)
  - Uses `auth_user_id` for `advisor_added_startups.advisor_id` (correct)
  - Auto-links startup to Investment Advisor when invited

### 8. **Advisor Code Updates** ✅
- **Location:** Lines 1541-1568, 1605-1635
- **Status:** ✅ CORRECT
- **What it does:**
  - Checks if profile is in `user_profiles` or `users`
  - Updates the correct table
  - Updates `startups` table with advisor code

---

## ⚠️ Issues Found

### Issue 1: Investment Advisor Lookup Uses Old Table ✅ FIXED
**Location:** Line 1529-1598
**Status:** ✅ FIXED
**What was fixed:**
- Now checks `user_profiles` table first (new system)
- Falls back to `users` table for backward compatibility
- Uses `auth_user_id` for `advisor_added_startups.advisor_id` (correct)

```typescript
// ✅ FIXED: Now checks both tables
// Try user_profiles first (new system)
const { data: advisorProfile } = await authService.supabase
  .from('user_profiles')
  .select('id, auth_user_id, investment_advisor_code, name')
  .eq('investment_advisor_code', advisorCodeFromInvite)
  .eq('role', 'Investment Advisor')
  .maybeSingle();

if (advisorProfile) {
  advisorData = advisorProfile;
  advisorAuthUserId = advisorProfile.auth_user_id;
} else {
  // Fallback to users table (old system - backward compatibility)
  const { data: oldAdvisorData } = await authService.supabase
    .from('users')
    .select('id, investment_advisor_code, name')
    .eq('investment_advisor_code', advisorCodeFromInvite)
    .eq('role', 'Investment Advisor')
    .maybeSingle();
  // ...
}
```

---

## 📋 Missing Fields Check

### Fields NOT in updateData (but may not be collected in Form 2):
- ❓ phone - Not in Form 2 (only in Edit Profile)
- ❓ address - Not in Form 2 (only in Edit Profile)
- ❓ city - Not in Form 2 (only in Edit Profile)
- ❓ state - Not in Form 2 (only in Edit Profile)
- ❓ company - Not in Form 2 (only in Edit Profile)

**Note:** These fields are collected in Edit Profile modal, not in Form 2 registration. This is correct.

---

## ✅ Summary

| Component | Status | Table Used | ID Used | Notes |
|-----------|--------|------------|---------|-------|
| **Profile Update** | ✅ Correct | `user_profiles` (new) / `users` (old) | Profile ID | Falls back correctly |
| **Startup Creation** | ✅ Correct | `startups` | `auth_user_id` | Uses correct ID |
| **Founders** | ✅ Correct | `founders` | `startup_id` | Correct |
| **Startup Shares** | ✅ Correct | `startup_shares` | `startup_id` | Correct |
| **Subsidiaries** | ✅ Correct | `subsidiaries` | `startup_id` | Correct |
| **Investment Advisor Lookup** | ✅ Fixed | `user_profiles` / `users` | `auth_user_id` | Checks both tables correctly |
| **Advisor Code Updates** | ✅ Correct | `user_profiles` / `users` | Profile ID | Correct |

---

## ✅ All Issues Fixed

All configuration issues have been resolved:
- ✅ Profile updates use correct table (`user_profiles` for new users, `users` for old users)
- ✅ Startup creation uses `auth_user_id` correctly
- ✅ Investment Advisor lookup checks both tables with fallback
- ✅ All ID references use correct identifiers (profile ID vs auth_user_id)

