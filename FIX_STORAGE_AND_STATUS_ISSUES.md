# Fix Storage and Status Update Issues

## Issues Fixed

### 1. ✅ Storage Limit RPC Function Error
**Problem:** `get_user_storage_limit` RPC function was returning 404, causing storage checks to fail.

**Solution:**
- Added fallback logic to query `subscription_plans` directly if RPC function fails
- Improved error handling with detailed logging
- Defaults to 100 MB (free plan) if all methods fail

**Files Changed:**
- `lib/storageService.ts` - `checkStorageLimit()` and `getStorageUsage()` methods

---

### 2. ✅ Invalid UUID Error for `related_entity_id`
**Problem:** `related_entity_id` column expects a UUID, but was receiving string task IDs like `"parent-2026-quarterly-Q4-GST Filings"`, causing database errors.

**Solution:**
- Added UUID validation using regex pattern: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- Only sets `related_entity_id` if it's a valid UUID
- Sets to `null` if not a valid UUID (prevents database errors)
- Added warning logs when invalid UUID is detected

**Files Changed:**
- `lib/storageService.ts` - `trackFileUpload()` method

**Example:**
```typescript
// Before: Would try to insert "parent-2026-quarterly-Q4-GST Filings" → ❌ Error
// After: Validates UUID, sets to null if invalid → ✅ No error
```

---

### 3. ✅ Missing Required Fields for Status Update
**Problem:** `updateStatusToSubmitted()` was failing because required fields (`entity_identifier`, `entity_display_name`, `year`, `task_name`) were missing, preventing the upsert operation.

**Solution:**
- **Multi-source data fetching:** Now tries to get required fields from three sources in priority order:
  1. **Database (`compliance_checks` table)** - Most reliable, fetched first
  2. **Comprehensive rules (`getComplianceTasksForStartup`)** - Fetched if database doesn't have fields
  3. **Existing task data (parameter)** - Used as last resort
- **Fallback update:** If required fields are still missing but a record exists in the database, attempts to update status only (without creating new record)
- **Enhanced logging:** Added detailed logs to track which source provided the data

**Files Changed:**
- `lib/complianceRulesIntegrationService.ts` - `updateStatusToSubmitted()` method

**Flow:**
```
1. Try to fetch from compliance_checks table
   ↓ (if missing fields)
2. Try to fetch from comprehensive rules
   ↓ (if missing fields)
3. Try to use existingTaskData parameter
   ↓ (if still missing but record exists)
4. Try to update status only (without upsert)
   ↓ (if all fail)
5. Return error with detailed information
```

---

## Testing Checklist

### Storage Tracking
- [ ] Upload a compliance document → Storage should increase in Account Tab
- [ ] Upload a document with non-UUID `related_entity_id` → Should succeed (sets to null)
- [ ] Check storage limit for free user → Should show 100 MB
- [ ] Check storage limit for paid user → Should show plan limit

### Status Update
- [ ] Upload compliance document → Status should update to "Submitted"
- [ ] Upload document for existing task → Should update status correctly
- [ ] Upload document for new task → Should create record with all required fields
- [ ] Check console logs → Should show which data source was used

---

## Console Logs to Watch

### Storage Tracking
```
📊 [STORAGE] Checking storage limit for userId: <uuid> fileSizeMB: <size>
📊 [STORAGE] Storage check result: { allowed: true, current: X, limit: Y, remaining: Z }
⚠️ [STORAGE] related_entity_id is not a valid UUID, setting to null: <taskId>
✅ [STORAGE] Storage record inserted successfully
```

### Status Update
```
[STATUS UPDATE] Found existing task in database: {...}
[STATUS UPDATE] Using required fields from database
[STATUS UPDATE] ✅ SUCCESS - Status updated to Submitted for task: <taskId>
```

---

## Next Steps

1. **Test the fixes** by uploading a compliance document
2. **Check the Account Tab** to verify storage is increasing
3. **Check the Compliance Tab** to verify status is updating to "Submitted"
4. **Review console logs** to ensure all data sources are working correctly

---

## Notes

- The UUID validation ensures that only valid UUIDs are stored in `related_entity_id`, preventing database errors
- The multi-source data fetching ensures that status updates work even if task data is missing from one source
- The fallback update mechanism allows status updates even when required fields are missing (for existing records only)
