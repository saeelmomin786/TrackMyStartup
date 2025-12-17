# Fix for Mentor Code and Update Issue

## Issues Found

1. ❌ **Mentor code not generated** - `createProfile()` function doesn't generate mentor codes
2. ❌ **Documents not updating** - UPDATE operation still failing

## Fixes Applied

### 1. ✅ Added Mentor Code Generation

**File: `lib/utils.ts`**
- Added `generateMentorCode()` function
- Format: `MEN-XXXXXX` (same pattern as Investor and Investment Advisor codes)

**File: `lib/auth.ts`**
- Added import for `generateMentorCode`
- Updated `createProfile()` to generate mentor code when role is 'Mentor'

### 2. ✅ Enhanced Error Logging

**File: `components/CompleteRegistrationPage.tsx`**
- Added detailed error logging for UPDATE failures
- Now logs: error message, code, details, hint, table name, profile ID

## Next Steps

### Step 1: Verify RLS Policies Are Fixed

Run this SQL script to check if policies have WITH CHECK clause:
```sql
-- Run: VERIFY_RLS_POLICIES_FIXED.sql
```

**Expected Result:**
- All UPDATE policies should show "✅ Has WITH CHECK"
- If any show "❌ Missing WITH CHECK", the RLS fix didn't apply correctly

### Step 2: Check Browser Console

After the fix, when you try to complete Form 2, check the browser console for:
- Detailed error messages
- Error code (e.g., "42501" = permission denied)
- Error details and hints

### Step 3: Test Again

1. Create a new Mentor profile from dashboard
2. Fill Form 2
3. Check console for detailed errors
4. Verify mentor code is generated (check in Supabase `user_profiles` table)

## If UPDATE Still Fails

If you still see "Failed to update user profile" error, check the console for:
- Error code (will help identify the issue)
- Error message (will show what's blocking)
- Error details (will show which field/operation failed)

Common issues:
- **42501**: Permission denied - RLS policy issue
- **23505**: Unique constraint violation - duplicate data
- **23503**: Foreign key violation - missing reference
- **23502**: Not null violation - required field missing

## Mentor Code Verification

After creating a Mentor profile, verify in Supabase:
```sql
SELECT id, name, role, mentor_code 
FROM user_profiles 
WHERE role = 'Mentor' 
ORDER BY created_at DESC 
LIMIT 5;
```

All Mentor profiles should have a `mentor_code` in format `MEN-XXXXXX`.





