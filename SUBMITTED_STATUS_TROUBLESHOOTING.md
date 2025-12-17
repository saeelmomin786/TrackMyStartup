# Troubleshooting: Status Not Changing to "Submitted" After Upload

## Issue
When uploading a document, the status is not changing from "Pending" to "Submitted".

## Root Causes & Solutions

### 1. Database Constraint Not Updated (Most Likely)

**Problem:** The database CHECK constraint doesn't allow 'Submitted' status yet.

**Solution:** Run the SQL migration script:
1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL from `ADD_SUBMITTED_STATUS_TO_COMPLIANCE_CHECKS.sql`
3. This will update the constraints to allow 'Submitted' status

**How to verify:**
```sql
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%compliance_checks%status%';
```

You should see 'Submitted' in the allowed values.

### 2. Check Browser Console Logs

After uploading a document, check the browser console for these logs:
- `🔄 updateStatusToSubmitted called:` - Confirms the function is being called
- `📊 Final requirements:` - Shows if CA/CS requirements are detected
- `🔍 CA Status check:` / `🔍 CS Status check:` - Shows status comparison
- `📝 Updating compliance_checks with:` - Shows what's being updated
- `✅ Status updated to Submitted` - Confirms successful update
- `❌ Error updating status to Submitted:` - Shows any errors

### 3. Verify Task Requirements

The status only updates if:
- `caRequired` is true (for CA status)
- `csRequired` is true (for CS status)
- Current status is "Pending"

Check the console logs to see if requirements are being detected correctly.

### 4. Database Record Exists

The update requires a record in `compliance_checks` table. If the record doesn't exist, the update will fail silently.

**Check if record exists:**
```sql
SELECT * FROM compliance_checks 
WHERE startup_id = YOUR_STARTUP_ID 
AND task_id = 'YOUR_TASK_ID';
```

### 5. Status Value Mismatch

The database stores status as strings ('Pending', 'Submitted', etc.), not enum values. The code now handles both, but if you see errors about constraint violations, the migration hasn't been run.

## Quick Fix Steps

1. **Run the SQL migration** (most important):
   ```sql
   -- Run ADD_SUBMITTED_STATUS_TO_COMPLIANCE_CHECKS.sql
   ```

2. **Check browser console** for detailed logs

3. **Verify the update worked**:
   ```sql
   SELECT ca_status, cs_status 
   FROM compliance_checks 
   WHERE startup_id = YOUR_STARTUP_ID 
   AND task_id = 'YOUR_TASK_ID';
   ```

4. **If still not working**, check:
   - Are CA/CS requirements set correctly for the task?
   - Is the current status actually "Pending"?
   - Are there any error messages in the console?

## Expected Behavior

1. User uploads document → Status changes from "Pending" to "Submitted"
2. CA/CS verifies document → Status changes from "Submitted" to "Verified"
3. Works for all entity types: Parent Company, Subsidiaries, International Operations

## Code Flow

1. `uploadComplianceDocument()` is called
2. Document is uploaded to storage/database
3. `updateStatusToSubmitted()` is called
4. Function checks if CA/CS is required
5. Function checks if current status is "Pending"
6. Updates status to "Submitted" if conditions are met

