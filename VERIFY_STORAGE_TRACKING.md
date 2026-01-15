# ✅ Storage Tracking Verification

## Answer: YES, It's Possible!

**Supabase Storage API supports:**
- ✅ Listing files in buckets
- ✅ Getting file metadata (size, created_at, etc.)
- ✅ Filtering by path prefix
- ✅ Recursive folder scanning

## Implementation Created

**File:** `lib/storageSyncFromSupabase.ts`

### Functions:

1. **`scanStorageFromSupabase(userId, startupId?)`**
   - Scans ALL Supabase Storage buckets
   - Calculates total storage used
   - Returns breakdown by bucket

2. **`getStorageFilesFromSupabase(userId, startupId?)`**
   - Gets detailed file list
   - Includes file sizes, paths, dates

3. **`syncStorageToDatabase(userId, startupId?)`**
   - Scans Supabase Storage
   - Updates `user_subscriptions.storage_used_mb`
   - One-click sync

## How It Works

### Strategy 1: Database-First (Most Reliable)
1. Get files from `user_storage_usage` table (files we've tracked)
2. Verify they exist in Supabase Storage
3. Get actual file sizes from storage
4. Sum up total

### Strategy 2: Storage-First (Fallback)
1. Scan all files in Supabase Storage buckets
2. Match files by path patterns (startupId, userId)
3. Sum up matching files

### Strategy 3: Hybrid (Best)
- Use database tracking for fast updates
- Periodically sync from Supabase Storage for accuracy
- Catches any untracked files

## File Path Patterns Found

From codebase analysis:
- `contracts/{applicationId}/file.pdf` - Need DB lookup
- `agreements/{applicationId}/file.pdf` - Need DB lookup  
- `{startupId}/{taskId}/file.pdf` - Direct match ✅
- `company-documents/{startupId}/file.pdf` - Direct match ✅

## Testing

### Test in Browser Console:

```typescript
import { scanStorageFromSupabase } from './lib/storageSyncFromSupabase';

// Test scan
const result = await scanStorageFromSupabase('your-user-id', startupId);
console.log('Storage:', result.totalMB, 'MB');
console.log('Files:', result.fileCount);
console.log('By Bucket:', result.buckets);
```

### Test Sync:

```typescript
import { syncStorageToDatabase } from './lib/storageSyncFromSupabase';

const sync = await syncStorageToDatabase('your-user-id', startupId);
console.log('Sync success:', sync.success);
console.log('Storage MB:', sync.storageMB);
```

## Next Steps

1. ✅ **Created** storage sync service
2. ⏳ **Test** with real userId/startupId
3. ⏳ **Add sync button** to Account Tab
4. ⏳ **Add automatic sync** on file operations
5. ⏳ **Schedule periodic sync** (daily/weekly)

## Recommendation

**Use Frontend Approach** (what we created):
- ✅ Works with Supabase Storage API
- ✅ Can scan all buckets
- ✅ Gets actual file sizes
- ✅ Updates database
- ✅ Can be triggered manually or automatically

**Benefits:**
- Accurate (counts real storage)
- Flexible (can scan any bucket)
- Reliable (source of truth is Supabase)
- Complete (catches all files)

## Performance Notes

- **Fast**: If using database-first approach
- **Slower**: If scanning all files (for many files)
- **Solution**: Cache results, sync periodically

---

**Status:** ✅ Ready to test!  
**Next:** Test with real data and integrate into Account Tab
