# INTAKE CRM RLS FIX - ACTION GUIDE

## Issue Summary
IntakeCRMBoard was getting 403 Forbidden errors from Supabase because:
- **Root Cause**: RLS policies checked `user_profiles.id` but FacilitatorView passes `auth.uid()` directly
- **Why**: The `facilitator_id` column stores auth user UUID, not user_profiles table primary key
- **Result**: No match found, all operations blocked

## What Was Fixed

### 1. ✅ Identified facilitatorId Source
- Found at [FacilitatorView.tsx](components/FacilitatorView.tsx#L1129): `setFacilitatorId(user.id)`
- Uses `supabase.auth.getUser()` which returns auth UUID, not profile ID
- This is correct - just needed RLS policies to match

### 2. ✅ Created Proper RLS Fix
- **File**: [FIX_INTAKE_CRM_RLS_PROPER.sql](FIX_INTAKE_CRM_RLS_PROPER.sql)
- **Changes**:
  - Removed `user_profiles` table lookups from all policies
  - Changed to direct comparison: `facilitator_id = auth.uid()`
  - Applied to all 3 tables: `intake_crm_columns`, `intake_crm_status_map`, `intake_crm_attachments`
  - For status_map & attachments: checks via column ownership (column.facilitator_id = auth.uid())

### 3. ✅ Removed localStorage Fallback
- **File**: [IntakeCRMBoard.tsx](components/IntakeCRMBoard.tsx)
- **Removed**:
  - localStorage reads in `loadColumns()`
  - localStorage fallback in `handleAddStatusColumn()`
  - localStorage fallback in `handleRemoveStatusColumn()`
  - Hardcoded default columns fallback
- **Now**: Pure Supabase operations with proper error messages

## Action Required

### STEP 1: Execute RLS Fix in Supabase
```sql
-- Run this file in Supabase SQL Editor:
FIX_INTAKE_CRM_RLS_PROPER.sql
```

**What it does:**
- Drops old RLS policies with user_profiles lookup
- Creates new policies that directly compare facilitator_id with auth.uid()
- Much simpler and matches your auth structure

### STEP 2: Verify Tables Exist
Check these tables exist in Supabase:
- `intake_crm_columns`
- `intake_crm_status_map`
- `intake_crm_attachments`

If not, run: `CREATE_INTAKE_CRM_TABLES.sql` first (then run FIX_INTAKE_CRM_RLS_PROPER.sql to fix policies)

### STEP 3: Test the Fix
1. Log in as a facilitator user
2. Navigate to Intake Management
3. Check browser console for errors:
   - **Before fix**: `403 Forbidden` errors
   - **After fix**: Should see "Loaded columns from Supabase" or "Initialized default columns"
4. Test operations:
   - Add a new column
   - Drag-and-drop an application
   - Delete a column

## Expected Results

### Before Fix (Current State)
```
❌ Error loading CRM columns: Object
❌ dlesebbmlrewsbmqvuza.supabase.co/rest/v1/intake_crm_columns 403
❌ Error initializing default columns: Object
❌ Error adding intake CRM column: Object
```

### After Fix (Expected)
```
✅ Loaded columns from Supabase: [...]
✅ Column added: [...] created for intake CRM
✅ Moved application [...] to column [...]
✅ Column removed, Applications moved to the first column
```

## Why This Fix Works

### Problem Pattern
```sql
-- OLD (broken): Looking up user_profiles.id
WHERE EXISTS (
  SELECT 1 FROM user_profiles up
  WHERE up.id = facilitator_id  -- facilitator_id is UUID, not profile ID
    AND up.auth_user_id = auth.uid()
)
```

### Solution Pattern
```sql
-- NEW (correct): Direct comparison with auth.uid()
WHERE facilitator_id = auth.uid()
```

### Why It Matches Your Code
```typescript
// FacilitatorView.tsx line 1129
const { data: { user } } = await supabase.auth.getUser();
setFacilitatorId(user.id);  // This is auth.uid(), not user_profiles.id

// IntakeCRMBoard.tsx line 3111
<IntakeCRMBoard facilitatorId={facilitatorId} ... />  // Passes auth UUID

// intakeCRMService.ts - ALL methods use this facilitatorId
const { data, error } = await supabase
  .from('intake_crm_columns')
  .insert({ facilitator_id, ... });  // Stores auth UUID
```

## Rollback Plan
If something goes wrong, you can revert RLS policies:
```sql
-- Run the original policies from CREATE_INTAKE_CRM_TABLES.sql (lines 77-214)
-- But this will bring back the 403 errors
```

## Code Changes Summary

### IntakeCRMBoard.tsx
- **Line ~86-114**: Removed localStorage and hardcoded defaults fallback from `loadColumns()`
- **Line ~150-157**: Simplified `loadStatusMap()` (removed "fallback" comment)
- **Line ~171-196**: Removed localStorage fallback from `handleAddStatusColumn()`
- **Line ~199-225**: Removed localStorage fallback from `handleRemoveStatusColumn()`
- **Result**: Pure Supabase operations, proper error handling

### FIX_INTAKE_CRM_RLS_PROPER.sql (New File)
- 136 lines of corrected RLS policies
- Removes user_profiles dependency
- Direct auth.uid() comparison
- Maintains security (users can only see/modify their own data)

## Related Files
- [CREATE_INTAKE_CRM_TABLES.sql](CREATE_INTAKE_CRM_TABLES.sql) - Original table creation (has broken RLS)
- [FIX_INTAKE_CRM_RLS.sql](FIX_INTAKE_CRM_RLS.sql) - Previous attempt (too permissive - allows all authenticated users)
- [intakeCRMService.ts](services/intakeCRMService.ts) - Service layer (working correctly)
- [FacilitatorView.tsx](components/FacilitatorView.tsx) - Parent component (line 1129, 3111)

## Next Steps After Fix
1. ✅ Execute FIX_INTAKE_CRM_RLS_PROPER.sql
2. Test in browser as facilitator
3. Monitor console for Supabase operations
4. Verify drag-and-drop persists to database
5. Check column add/delete works
6. Confirm no localStorage usage

## Notes
- This fix aligns with your previous optimization where you removed the "users" table
- The system now uses `auth.uid()` consistently across RLS policies
- No more user_profiles lookup overhead
- Simpler, faster, and matches your actual data structure
