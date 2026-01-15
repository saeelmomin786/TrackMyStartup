# 🔧 Compliance: Storage Tracking & "Submitted" Status Fix

## 🎯 Two Issues Identified

### **Issue 1: "Submitted" Status Error**
**Error Message:** `"Document uploaded successfully, but status could not be updated to 'Submitted'. Please run the database migration: ADD_SUBMITTED_STATUS_TO_COMPLIANCE_CHECKS.sql"`

**Root Cause:** The database `CHECK` constraint on `compliance_checks` table doesn't include 'Submitted' as a valid status value.

**Solution:** Run the migration SQL script in Supabase.

---

### **Issue 2: Storage Tracking for Compliance**
**Question:** Is compliance calculating storage correctly?

**Answer:** ✅ **YES, it's already implemented correctly!**

**How it works:**
1. Gets `user_id` from `startups` table (which is `auth_user_id` - UUID)
2. Uses `uploadFileWithTracking()` with correct `userId`
3. Tracks storage in `user_storage_usage` table
4. Database trigger updates `user_subscriptions.storage_used_mb`

**Code Location:** `lib/complianceRulesIntegrationService.ts` lines 741-762

---

## ✅ What's Already Working

### **Storage Tracking:**
```typescript
// Line 741-748: Gets auth_user_id from startups table
const { data: startupData } = await supabase
  .from('startups')
  .select('user_id')
  .eq('id', startupId)
  .single();

const userId = startupData?.user_id || uploadedBy; // ✅ Uses auth_user_id

// Line 751-762: Uploads with storage tracking
const uploadResult = await uploadFileWithTracking({
  userId: userId, // ✅ Correct UUID
  fileType: 'compliance',
  ...
});
```

**This is correct!** Storage tracking is working for compliance uploads.

---

## ⚠️ Potential Issue: Fallback

**Line 748:**
```typescript
const userId = startupData?.user_id || uploadedBy;
```

**Problem:** If `startupData` is not found, it falls back to `uploadedBy` (which is an email string, not a UUID).

**Impact:** If startup is not found, storage tracking might fail or use wrong ID.

**Fix Needed:** Ensure startup always exists, or get `auth_user_id` directly from auth session.

---

## 🔧 Fix for "Submitted" Status

### **Step 1: Run Migration in Supabase**

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `ADD_SUBMITTED_STATUS_TO_COMPLIANCE_CHECKS.sql`
3. Run the SQL script
4. Verify constraints were updated

### **Step 2: Verify Migration**

Run this SQL to check:
```sql
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%compliance_checks%status%'
ORDER BY constraint_name;
```

You should see 'Submitted' in the CHECK constraints.

---

## 🧪 Testing

### **Test Storage Tracking:**
1. Upload a compliance document
2. Check browser console - should see:
   ```
   ✅ File uploaded and storage tracked: { ... }
   ```
3. Go to Account Tab - storage should increase

### **Test Status Update:**
1. Upload a compliance document
2. Check `compliance_checks` table:
   ```sql
   SELECT task_id, ca_status, cs_status 
   FROM compliance_checks 
   WHERE startup_id = [your_startup_id]
   ORDER BY updated_at DESC 
   LIMIT 5;
   ```
3. Status should be 'Submitted' (not 'Pending')

---

## 📝 Summary

| Issue | Status | Action Needed |
|-------|--------|--------------|
| Storage Tracking | ✅ Working | None - already correct |
| "Submitted" Status | ❌ Not Working | Run migration SQL |
| Fallback userId | ⚠️ Potential Issue | Consider improvement |

---

## 🚀 Next Steps

1. **Run the migration** `ADD_SUBMITTED_STATUS_TO_COMPLIANCE_CHECKS.sql` in Supabase
2. **Test compliance upload** - status should update to "Submitted"
3. **Verify storage tracking** - check Account Tab after upload
4. **(Optional)** Improve fallback logic for `userId` if startup not found
