# Fundraising RLS Fix - Safety Analysis

## ✅ SAFE TO RUN - Impact Analysis

### What This Script Does
- **ONLY modifies RLS (Row Level Security) policies** - does NOT touch:
  - Table structure
  - Data
  - Foreign keys
  - Triggers
  - Indexes

### Integration Check

#### 1. **fundraising_details vs Cap Table**
- ✅ **Separate tables** - no direct relationship
- `fundraising_details`: Stores fundraising **ask** (what startup wants to raise)
- `investment_records`: Stores actual **investments** (cap table data)
- ✅ **No foreign key** between them
- ✅ **No triggers** that link them
- ✅ **Safe to update RLS independently**

#### 2. **How They're Used Together**
- `fundraising_details.equity` - Used for **display** on investor pages
- `investment_records.equity_allocated` - Used for **actual cap table calculations**
- They're read together but **not linked by constraints**

### What Changes

#### Policies Being Modified:
1. **Drops**: `fundraising_details_owner_manage` (missing WITH CHECK clause)
2. **Creates**: 
   - `fundraising_details_startup_select` (SELECT)
   - `fundraising_details_startup_insert` (INSERT)
   - `fundraising_details_startup_update` (UPDATE - **with WITH CHECK**)
   - `fundraising_details_startup_delete` (DELETE)
   - `fundraising_details_admin_manage` (Admin access)

#### Policies Being Preserved:
- ✅ `fundraising_details_read_all` - **NOT dropped** (needed for investors)

### Safety Features

1. **IF NOT EXISTS** - Won't create duplicate policies
2. **DROP IF EXISTS** - Won't error if policy doesn't exist
3. **Idempotent GRANTs** - Safe to run multiple times
4. **Preserves read access** - Investors can still see all fundraising
5. **Adds Admin access** - Admins can manage all fundraising

### Existing Flow Impact

#### ✅ **No Breaking Changes**:
- Investors can still **read** all fundraising details (read-all policy preserved)
- Startups can still **read** their own fundraising (new select policy)
- Startups can now **update** their fundraising (was broken, now fixed)
- Admins can now **manage** all fundraising (new admin policy)

#### ✅ **What Gets Fixed**:
- UPDATE operations will now work (was failing due to missing WITH CHECK)
- Proper security checks (users can only update their own startup's data)
- Admin override for management

### Rollback Plan

If something goes wrong, you can:
```sql
-- Option 1: Recreate the old policy (temporary fix)
CREATE POLICY fundraising_details_owner_manage ON fundraising_details
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Option 2: Drop all policies and recreate
-- (Use the original FIX_FUNDRAISING_RLS.sql)
```

### Testing Checklist

After running the script:
1. ✅ Startup user can update their fundraising details
2. ✅ Investor can view all fundraising details (read-only)
3. ✅ Admin can update any fundraising details
4. ✅ Cap table still works (separate table, no impact)
5. ✅ Investment records still work (separate table, no impact)

### Conclusion

**✅ SAFE TO RUN** - This script:
- Only fixes RLS policies
- Doesn't affect table structure or data
- Doesn't affect cap table or investment records
- Preserves existing read access
- Adds proper UPDATE support
- Can be rolled back if needed

