# Test Storage Scan from Supabase

## ✅ YES - It's Possible!

Supabase Storage API **DOES support**:
1. ✅ Listing files in buckets
2. ✅ Getting file metadata (including size)
3. ✅ Filtering by path prefix
4. ✅ Recursive folder scanning

## How to Test

### Step 1: Test the Storage Scan Function

Create a test component or run this in browser console:

```typescript
import { scanStorageFromSupabase } from './lib/storageSyncFromSupabase';

// Test for a user
const result = await scanStorageFromSupabase('user-id-here');

console.log('Total Storage:', result.totalMB, 'MB');
console.log('File Count:', result.fileCount);
console.log('By Bucket:', result.buckets);
```

### Step 2: Verify File Organization

Check how your files are organized in Supabase Storage:

**Current Structure (from code):**
- `startup-documents/contracts/{applicationId}/file.pdf`
- `startup-documents/agreements/{applicationId}/file.pdf`
- `company-documents/{startupId}/file.pdf`
- `compliance-documents/{startupId}/{taskId}/file.pdf`

**We need to identify:**
- Which path pattern contains `userId`?
- Which path pattern contains `startupId`?

### Step 3: Update Path Matching

The `fileBelongsToUser()` function needs to match your actual file structure.

**If files are organized like:**
```
startup-documents/
  ├── {userId}/
  │   └── {startupId}/
  │       └── file.pdf
```

**Or like:**
```
startup-documents/
  ├── {startupId}/
  │   └── file.pdf
```

We need to adjust the path matching logic accordingly.

## Implementation Status

✅ **Created:** `lib/storageSyncFromSupabase.ts`
- `scanStorageFromSupabase()` - Scans all buckets
- `getStorageFilesFromSupabase()` - Gets file list
- `syncStorageToDatabase()` - Updates database

## Next Steps

1. **Test the scan function** with a real userId
2. **Verify file paths** match your structure
3. **Update path matching** if needed
4. **Integrate into Account Tab** for manual sync
5. **Add automatic sync** on file upload/delete

## Benefits

✅ **Accurate** - Counts ALL files in storage
✅ **Automatic** - No manual tracking needed
✅ **Reliable** - Source of truth is Supabase Storage
✅ **Complete** - Catches files uploaded outside our system

## Limitations

⚠️ **Performance** - Scanning all buckets can be slow for many files
⚠️ **API Limits** - Supabase has rate limits on storage API
⚠️ **Path Structure** - Must match your file organization

## Recommendation

**Use Hybrid Approach:**
1. **Manual tracking** (current) - Fast, immediate updates
2. **Periodic sync** - Daily/weekly scan from Supabase
3. **Manual sync button** - Let users trigger sync in Account Tab

This gives best of both worlds:
- Fast updates on upload
- Accurate totals from Supabase
- Catches any untracked files
