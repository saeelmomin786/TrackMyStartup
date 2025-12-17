# Profile Registration - Tables and RLS Policy Analysis

## Problem Summary

When creating a new profile from the dashboard:
- ✅ **Form 1 works** - Profile is created in `user_profiles` (INSERT succeeds)
- ❌ **Form 2 fails** - Error "Failed to update user profile" but profile appears
- ⚠️ **Partial data saved** - Some tables get data, others don't due to RLS policy failures

## Root Cause

**RLS UPDATE policies are missing `WITH CHECK` clause**, which is required in PostgreSQL/Supabase for UPDATE operations. This causes:
- INSERT operations to work (they only need `WITH CHECK`)
- UPDATE operations to fail (they need both `USING` and `WITH CHECK`)

## Tables Used During Profile Registration

### **Form 1 (BasicRegistrationStep)**

| Table | Operation | Status | RLS Policy Issue |
|-------|-----------|--------|------------------|
| `user_profiles` | INSERT | ✅ Works | None - INSERT policy exists |
| `user_profile_sessions` | INSERT/UPDATE | ✅ Works | None - Policy exists |

### **Form 2 (CompleteRegistrationPage)**

#### **For ALL Profile Types:**

| Table | Operation | Status | RLS Policy Issue |
|-------|-----------|--------|------------------|
| `user_profiles` | UPDATE (documents, address, etc.) | ❌ **FAILS** | Missing `WITH CHECK` clause |
| `user_profiles` | UPDATE (`is_profile_complete = true`) | ❌ **FAILS** | Missing `WITH CHECK` clause |

#### **For STARTUP Profile Only:**

| Table | Operation | Status | RLS Policy Issue |
|-------|-----------|--------|------------------|
| `startups` | INSERT/UPDATE | ❌ **MAY FAIL** | Need to verify `WITH CHECK` |
| `founders` | INSERT | ❌ **MAY FAIL** | Need to verify `WITH CHECK` |
| `startup_shares` | INSERT/UPDATE | ❌ **MAY FAIL** | Need to verify `WITH CHECK` |
| `subsidiaries` | INSERT | ❌ **MAY FAIL** | Need to verify `WITH CHECK` |
| `international_operations` | INSERT | ❌ **MAY FAIL** | Need to verify `WITH CHECK` |

#### **For INVESTMENT ADVISOR Profile:**

| Table | Operation | Status | RLS Policy Issue |
|-------|-----------|--------|------------------|
| `advisor_added_startups` | UPDATE (if invited) | ❌ **MAY FAIL** | Need to verify `WITH CHECK` |

## Data Flow Diagram

```
Form 1 (BasicRegistrationStep)
    │
    ├─→ user_profiles.INSERT ✅ (Works - has INSERT policy)
    │
    └─→ user_profile_sessions.INSERT/UPDATE ✅ (Works)

Form 2 (CompleteRegistrationPage)
    │
    ├─→ user_profiles.UPDATE ❌ (FAILS - missing WITH CHECK)
    │   ├─ government_id
    │   ├─ verification_documents
    │   ├─ phone, address, city, state, country
    │   ├─ company, company_type
    │   └─ currency, etc.
    │
    ├─→ user_profiles.UPDATE ❌ (FAILS - missing WITH CHECK)
    │   └─ is_profile_complete = true
    │
    └─→ [If Startup Role]
        ├─→ startups.INSERT/UPDATE ❌ (May fail)
        ├─→ founders.INSERT ❌ (May fail)
        ├─→ startup_shares.INSERT/UPDATE ❌ (May fail)
        ├─→ subsidiaries.INSERT ❌ (May fail)
        └─→ international_operations.INSERT ❌ (May fail)
```

## Why Profile Still Appears

The profile appears because:
1. ✅ **Form 1 INSERT succeeds** - Profile is created in `user_profiles`
2. ❌ **Form 2 UPDATE fails** - But error is caught and user is redirected
3. ⚠️ **Profile exists but incomplete** - Missing Form 2 data (documents, address, etc.)

## Solution

Run `FIX_ALL_PROFILE_REGISTRATION_RLS.sql` which:
1. ✅ Fixes `user_profiles` UPDATE policy (adds `WITH CHECK`)
2. ✅ Fixes all startup-related tables (startups, founders, shares, etc.)
3. ✅ Fixes role-specific profile tables (mentor_profiles, investor_profiles, etc.)
4. ✅ Verifies all policies have correct structure

## Testing After Fix

After running the SQL script, test by:
1. Creating a new Mentor profile from dashboard
2. Completing Form 2
3. Verify no "Failed to update user profile" error
4. Check `user_profiles` table - all Form 2 fields should be populated
5. Check `is_profile_complete` should be `true`





