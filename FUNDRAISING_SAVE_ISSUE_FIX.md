# Fundraising Details Save Issue - Fix Documentation

## Problem Description

Users with **new registrations** are unable to save fundraising details in the Portfolio Section "Current Fundraising Round". The data appears to save but is not persisted to the database.

## Root Cause

The issue is caused by **Row Level Security (RLS) policies** on the `fundraising_details` table that are checking the wrong table/field for ownership verification.

### Current (Broken) RLS Policy:
```sql
startup_id IN (
    SELECT id FROM startups 
    WHERE name IN (
        SELECT startup_name FROM users 
        WHERE email = auth.jwt() ->> 'email'
    )
)
```

This policy checks the `users` table's `startup_name` field, which works for **old registrations** but fails for **new registrations** because:

1. **New registrations** use the `user_profiles` table instead of the `users` table
2. The `startups` table uses `user_id` which is the `auth_user_id` (from `auth.users`), not the profile ID
3. The policy doesn't match the startup to the authenticated user correctly

### Correct RLS Policy:
```sql
startup_id IN (
    SELECT id FROM startups 
    WHERE user_id = auth.uid()
)
```

This policy correctly matches the startup to the authenticated user's `auth_user_id`, which works for both old and new registrations.

## Solution

A SQL fix script has been created: `FIX_FUNDRAISING_RLS_NEW_REGISTRATION.sql`

This script:
1. Drops the old RLS policies that check `users.startup_name`
2. Creates new RLS policies that check `startups.user_id = auth.uid()`
3. Maintains support for both old and new registrations
4. Includes proper policies for SELECT, INSERT, UPDATE, and DELETE operations
5. Includes Admin access for management

## Implementation Steps

### Step 1: Run the SQL Fix Script

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Run the script: `FIX_FUNDRAISING_RLS_NEW_REGISTRATION.sql`
4. Verify the policies were created correctly

### Step 2: Test the Fix

1. Log in as a user with a new registration
2. Navigate to Startup Dashboard → Fundraising → Portfolio
3. Fill in the "Current Fundraising Round" details
4. Click "Save Fundraising Details"
5. Verify the data is saved and persists after page refresh

## Code Changes Made

### 1. Error Handling Improvements

**File:** `components/startup-health/FundraisingTab.tsx`
- Added better error logging with detailed error information
- Added specific error messages for RLS/permission denied errors
- Added user-friendly error messages

**File:** `lib/capTableService.ts`
- Added detailed error logging for insert and update operations
- Added specific error messages for RLS/permission denied errors
- Added helpful hints for debugging

## Verification

After running the SQL fix, verify:

1. **RLS Policies Created:**
   ```sql
   SELECT policyname, cmd, qual, with_check
   FROM pg_policies 
   WHERE tablename = 'fundraising_details'
   ORDER BY policyname, cmd;
   ```

2. **User Can See Their Startup:**
   ```sql
   SELECT 
       auth.uid() as current_auth_user_id,
       s.id as startup_id,
       s.name as startup_name,
       s.user_id as startup_user_id,
       CASE 
           WHEN s.id IS NOT NULL AND s.user_id = auth.uid() THEN '✅ Startup match found'
           WHEN s.id IS NOT NULL THEN '⚠️ Startup exists but user_id mismatch'
           ELSE '⚠️ No startup found for this user'
       END as status
   FROM startups s
   WHERE s.user_id = auth.uid()
   LIMIT 1;
   ```

## Additional Notes

- The fix maintains backward compatibility with old registrations
- The fix works for both old and new registration flows
- Admin users can still manage all fundraising details
- Investors can still read all active fundraising details (for discover page)

## Troubleshooting

If the issue persists after running the fix:

1. **Check Authentication:**
   - Verify the user is properly authenticated
   - Check that `auth.uid()` returns the correct user ID
   - Verify the startup's `user_id` matches `auth.uid()`

2. **Check RLS Policies:**
   - Verify the new policies were created
   - Check that no conflicting policies exist
   - Verify the policies are enabled

3. **Check Console Logs:**
   - Look for detailed error messages in the browser console
   - Check for RLS policy errors (code 42501)
   - Verify the startup ID is correct

4. **Check Database:**
   - Verify the startup exists in the `startups` table
   - Verify the startup's `user_id` matches the authenticated user's `auth_user_id`
   - Check if there are any existing fundraising_details records

## Related Files

- `FIX_FUNDRAISING_RLS_NEW_REGISTRATION.sql` - SQL fix script
- `components/startup-health/FundraisingTab.tsx` - Frontend component
- `lib/capTableService.ts` - Service layer for fundraising operations



