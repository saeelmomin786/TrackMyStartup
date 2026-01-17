# 🔧 Fix: Add 'revoked' Status to Due Diligence Requests

## ❌ Problem

When trying to revoke due diligence access, got error:
```
new row for relation "due_diligence_requests" violates constraint "due_diligence_requests_status_check"
```

## 🎯 Root Cause

The database table `due_diligence_requests` has a CHECK constraint that only allows these status values:
- `'pending'`
- `'paid'`
- `'completed'`
- `'failed'`

But our new revoke function tries to set status to `'revoked'` which is NOT in the list!

## ✅ Solution

Update the CHECK constraint to include `'revoked'` as a valid status.

### Step 1: Run Migration SQL

Copy and paste this into Supabase SQL Editor and run it:

```sql
-- Migration: Add 'revoked' status to due_diligence_requests CHECK constraint

-- Drop the existing constraint
ALTER TABLE public.due_diligence_requests
DROP CONSTRAINT due_diligence_requests_status_check;

-- Add new constraint with 'revoked' status included
ALTER TABLE public.due_diligence_requests
ADD CONSTRAINT due_diligence_requests_status_check 
CHECK (status IN ('pending', 'paid', 'completed', 'failed', 'revoked'));

-- Verify the constraint was updated
SELECT constraint_name, constraint_definition 
FROM information_schema.table_constraints 
WHERE table_name = 'due_diligence_requests' 
AND constraint_type = 'CHECK';
```

### Step 2: Verify the Fix

Run this query to confirm:

```sql
SELECT constraint_name, constraint_definition 
FROM information_schema.table_constraints 
WHERE table_name = 'due_diligence_requests' 
AND constraint_type = 'CHECK';
```

Should show the constraint includes: `'pending', 'paid', 'completed', 'failed', 'revoked'`

### Step 3: Test the Revoke Function

In the browser:
1. Login as Startup owner
2. Go to Dashboard → Due Diligence Requests
3. Find a request with status = 'completed'
4. Click "Stop Access" button
5. Should now work without error!

Check database:
```sql
SELECT status FROM due_diligence_requests 
WHERE id = '[REQUEST_ID]';

-- Should show: revoked
```

---

## 📊 Valid Status Values

After this fix, the valid status values are:

| Status | Meaning | Transition |
|--------|---------|-----------|
| `'pending'` | Request created, awaiting approval | → completed/failed |
| `'completed'` | Approved, access granted | → revoked |
| `'paid'` | Payment processed, access granted | → revoked |
| `'failed'` | Request rejected | (final) |
| `'revoked'` | **NEW** - Access revoked by startup | (final) |

---

## 🎯 After Fix - Complete Feature Flow

```
PENDING (yellow)
    ↓ Approve
COMPLETED (green) + "Stop Access" button
    ↓ Click "Stop Access"
REVOKED (orange) + Must request again
    ↓ Investor requests again
PENDING (yellow)
    ↓ Approve again
COMPLETED (green) again
```

---

## ✅ Files Updated

1. **Migration File Created:** `MIGRATION_ADD_REVOKED_STATUS.sql`
   - Contains the ALTER TABLE command
   - Can be run in Supabase SQL Editor

2. **Schema File Updated:** `FINANCIAL_MODEL_SCHEMA.sql`
   - Updated CHECK constraint definition
   - For future reference/deployments

---

## 🚀 Next Steps After Fix

1. Run the migration SQL in Supabase
2. Verify the constraint was updated
3. Test the "Stop Access" button - should now work!
4. The feature is now fully functional

---

## 💡 Why This Happened

When we added the revoke feature, we:
1. ✅ Created the RPC function
2. ✅ Added the backend method
3. ✅ Added the frontend UI

But we forgot to:
4. ❌ Update the database constraint to allow 'revoked' status

This is now fixed!

