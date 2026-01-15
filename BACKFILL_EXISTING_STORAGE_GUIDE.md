# ✅ Backfill Storage Tracking for Existing Files

## 🎯 Problem

Files uploaded **before** storage tracking was implemented are not tracked in the `user_storage_usage` table. We need to backfill these files.

---

## ✅ Solution

Created a backfill service that:
1. Scans Supabase Storage buckets
2. Matches files to users by path patterns
3. Creates `user_storage_usage` records
4. Updates `user_subscriptions.storage_used_mb` (for paid users)

---

## 📋 How to Run Backfill

### **Option 1: Backfill Specific User (Recommended)**

**API Endpoint:**
```bash
POST /api/storage/backfill?userId=user-id-here
```

**Or from browser console:**
```javascript
fetch('/api/storage/backfill?userId=YOUR_USER_ID', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

**Response:**
```json
{
  "success": true,
  "message": "Backfill completed: 15 files tracked",
  "result": {
    "filesProcessed": 20,
    "filesTracked": 15,
    "totalStorageMB": 45.67,
    "details": [
      {
        "bucket": "compliance-documents",
        "filesFound": 5,
        "filesTracked": 5,
        "storageMB": 12.34
      },
      ...
    ]
  }
}
```

---

### **Option 2: Backfill All Users (Admin)**

**API Endpoint:**
```bash
POST /api/storage/backfill?allUsers=true
```

**Warning:** This scans all buckets for all users - can take a while!

---

### **Option 3: Direct SQL (Fastest - For All Users)**

Run this in Supabase SQL Editor after the API backfill:

```sql
-- Recalculate storage for all users with subscriptions
SELECT calculate_user_storage_from_tracking(user_id) 
FROM user_subscriptions 
WHERE status = 'active';
```

---

## 🔍 What Gets Backfilled

### **Buckets Scanned:**
- ✅ `startup-documents` - Contracts, agreements
- ✅ `compliance-documents` - Compliance files
- ✅ `financial-attachments` - Financial invoices/receipts
- ✅ `financial-documents` - Financial documents
- ✅ `company-documents` - Company documents
- ✅ `pitch-decks` - Pitch decks, one-pagers
- ✅ `pitch-videos` - Pitch videos
- ✅ `employee-contracts` - Employee contracts
- ✅ `verification-documents` - Registration documents
- ✅ `cap-table-documents` - Investment proofs
- ✅ `business-plans` - Business plans
- ✅ `logos` - Company logos

### **File Matching:**
Files are matched to users by:
1. **Startup ID in path** - `{startupId}/file.pdf`
2. **Application ID in path** - `contracts/{applicationId}/file.pdf`
3. **User ID in path** - `{userId}/file.pdf`

---

## ✅ What Happens

1. **Scans buckets** - Lists all files in each bucket
2. **Matches files** - Checks if file belongs to user
3. **Checks existing** - Skips files already tracked
4. **Creates records** - Inserts into `user_storage_usage`
5. **Updates subscription** - Updates `storage_used_mb` (for paid users)

---

## 📊 Verification

After backfill, check results:

```sql
-- Check total tracked files
SELECT 
    COUNT(*) as total_files,
    COUNT(DISTINCT user_id) as users,
    ROUND(SUM(file_size_mb), 2) as total_mb
FROM user_storage_usage;

-- Check by bucket
SELECT 
    CASE 
        WHEN storage_location LIKE 'compliance-documents%' THEN 'compliance'
        WHEN storage_location LIKE 'financial%' THEN 'financial'
        WHEN storage_location LIKE 'employee-contracts%' THEN 'employees'
        WHEN storage_location LIKE 'pitch-decks%' THEN 'pitch-decks'
        ELSE 'other'
    END as bucket_type,
    COUNT(*) as files,
    ROUND(SUM(file_size_mb), 2) as mb
FROM user_storage_usage
GROUP BY bucket_type;
```

---

## ⚠️ Important Notes

1. **Drive Links NOT Backfilled** - Only actual file uploads are tracked
2. **Skips Existing** - Files already in `user_storage_usage` are skipped
3. **Path Matching** - Files are matched by path patterns (may miss some edge cases)
4. **One-Time Operation** - Run once to backfill existing files
5. **Future Uploads** - All new uploads are automatically tracked

---

## 🚀 Quick Start

1. **Test with one user:**
   ```bash
   POST /api/storage/backfill?userId=test-user-id
   ```

2. **Verify results:**
   - Check `user_storage_usage` table
   - Check Account Tab shows correct storage

3. **Backfill all users:**
   ```bash
   POST /api/storage/backfill?allUsers=true
   ```

---

**Status:** ✅ Ready to use! Run the API endpoint to backfill existing files.
