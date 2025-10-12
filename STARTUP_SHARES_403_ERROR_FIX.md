# Startup Shares 403 Forbidden Error Fix

## Problem Description

The application was experiencing 403 Forbidden errors when facilitators (users with role "Startup Facilitation Center") tried to save price per share data to the `startup_shares` table. The error occurred in the `upsertPricePerShare` function in `capTableService.ts`.

## Root Cause

The issue was caused by overly restrictive Row Level Security (RLS) policies on the `startup_shares` table. The existing policies only allowed access based on startup ownership:

```sql
-- Old restrictive policy
CREATE POLICY "Startup users can manage their own shares" ON startup_shares
    FOR ALL USING (
        startup_id IN (
            SELECT id FROM startups 
            WHERE name IN (
                SELECT startup_name FROM users 
                WHERE email = auth.jwt() ->> 'email'
            )
        )
    );
```

This policy only worked for users who owned startups, but facilitators need broader access to manage startup data across multiple startups.

## Solution

Created comprehensive RLS policies that include facilitator access:

### 1. **Select Policies**
- **Own startup shares**: Users can view their own startup's shares
- **Facilitator access**: Facilitators, admins, CA, CS can view all startup shares

### 2. **Management Policies**  
- **Own startup shares**: Startup owners can manage their own shares
- **Facilitator access**: Facilitators, admins, CA, CS can manage all startup shares

### 3. **Helper Function**
Added a helper function `can_access_startup_shares()` to check user permissions programmatically.

## Files Modified

1. **`FIX_STARTUP_SHARES_RLS_POLICIES.sql`** - Main fix script
2. **`STARTUP_SHARES_403_ERROR_FIX.md`** - This documentation

## How to Apply the Fix

1. Run the SQL script `FIX_STARTUP_SHARES_RLS_POLICIES.sql` in your Supabase SQL Editor
2. The script will:
   - Drop existing restrictive policies
   - Create new comprehensive policies
   - Grant necessary permissions
   - Verify the fix works

## Verification

After applying the fix, facilitators should be able to:
- ✅ View startup shares data
- ✅ Save price per share data
- ✅ Update total shares
- ✅ Manage ESOP reserved shares

## Error Logs Before Fix

```
dlesebbmlrewsbmqvuza.supabase.co/rest/v1/startup_shares?on_conflict=startup_id&select=price_per_share%2Ctotal_shares%2Cesop_reserved_shares:1  Failed to load resource: the server responded with a status of 403 ()
capTableService.ts:226 ❌ Upsert error: Object
CapTableTab.tsx:2160 ❌ Failed to save price per share: Object
```

## User Roles Affected

- ✅ **Startup Facilitation Center** - Now has full access
- ✅ **Admin** - Now has full access  
- ✅ **CA** - Now has full access
- ✅ **CS** - Now has full access
- ✅ **Startup** - Still has access to their own startups

## Testing

The fix includes test queries to verify:
1. RLS policies are correctly applied
2. Facilitators can access startup shares data
3. All user roles have appropriate permissions

## Related Files

- `lib/capTableService.ts` - Service layer that was failing
- `components/CapTableTab.tsx` - UI component showing the error
- `CAP_TABLE_RLS_POLICIES.sql` - Original policies (now updated)

## Notes

- The fix maintains security by ensuring only authorized roles can access the data
- Startup owners still have full access to their own data
- Facilitators now have the access they need to perform their duties
- The solution is scalable and follows Supabase RLS best practices
