# ✅ Storage Backfill for Existing Files - Complete

## 🎯 Problem Solved

Files uploaded **before** storage tracking was implemented are now automatically backfilled into the `user_storage_usage` table.

---

## 📋 Solution Overview

### **1. Backfill Service** (`lib/backfillStorageTracking.ts`)
- Scans all Supabase Storage buckets
- Matches files to users by path patterns
- Creates `user_storage_usage` records
- Updates `user_subscriptions.storage_used_mb` (for paid users)

### **2. API Endpoint** (`api/storage/backfill.ts`)
- `POST /api/storage/backfill?userId=xxx` - Backfill specific user
- `POST /api/storage/backfill?allUsers=true` - Backfill all users

### **3. SQL Verification** (`database/18_backfill_existing_storage.sql`)
- Queries to verify backfill results
- Check storage by bucket
- Compare tracked vs subscription storage

---

## 🚀 How to Use

### **Option 1: Backfill Specific User (Recommended)**

```bash
POST /api/storage/backfill?userId=user-id-here
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
      }
    ]
  }
}
```

---

### **Option 2: Backfill All Users (Admin)**

```bash
POST /api/storage/backfill?allUsers=true
```

**Warning:** Scans all buckets for all users - can take time!

---

### **Option 3: Quick SQL Update (After Backfill)**

After running the API backfill, update subscription storage:

```sql
-- Recalculate storage for all active subscriptions
SELECT calculate_user_storage_from_tracking(user_id) 
FROM user_subscriptions 
WHERE status = 'active';
```

---

## ✅ What Gets Backfilled

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

## 🔍 Verification

After backfill, verify results:

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
3. **Path Matching** - Files matched by path patterns (may miss edge cases)
4. **One-Time Operation** - Run once to backfill existing files
5. **Future Uploads** - All new uploads automatically tracked ✅

---

## 📊 Flow

```
Existing Files in Storage
  ↓
Backfill API Scans Buckets
  ↓
Matches Files to Users (by path)
  ↓
Creates user_storage_usage Records
  ↓
Updates user_subscriptions.storage_used_mb
  ↓
✅ Storage Now Tracked!
```

---

**Status:** ✅ Complete - Ready to backfill existing files!
