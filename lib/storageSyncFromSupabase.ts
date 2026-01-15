import { supabase } from './supabase';

/**
 * Storage Sync from Supabase Storage
 * 
 * This service scans Supabase Storage buckets directly to calculate
 * actual storage usage per user/startup. This is more accurate than
 * manual tracking because it counts ALL files in storage, not just
 * ones tracked in the database.
 */

export interface StorageScanResult {
  totalBytes: number;
  totalMB: number;
  fileCount: number;
  buckets: {
    bucket: string;
    bytes: number;
    mb: number;
    fileCount: number;
  }[];
}

export interface StorageFileInfo {
  name: string;
  size: number;
  sizeMB: number;
  bucket: string;
  path: string;
  created_at: string;
  updated_at: string;
}

/**
 * Scan all files in Supabase Storage buckets for a user/startup
 * 
 * @param userId - User ID to filter files
 * @param startupId - Optional startup ID to filter files
 * @returns Storage scan result with total size and file count
 */
export async function scanStorageFromSupabase(
  userId: string,
  startupId?: number
): Promise<StorageScanResult> {
  // All buckets that might contain user/startup files
  const buckets = [
    'startup-documents',
    'compliance-documents',
    'financial-attachments',
    'financial-documents',
    'company-documents',
    'pitch-decks',
    'pitch-videos',
    'employee-contracts',
    'verification-documents',
    'incubation-contracts',
  ];

  const result: StorageScanResult = {
    totalBytes: 0,
    totalMB: 0,
    fileCount: 0,
    buckets: []
  };

  for (const bucket of buckets) {
    try {
      const bucketResult = await scanBucket(bucket, userId, startupId);
      
      result.totalBytes += bucketResult.bytes;
      result.totalMB += bucketResult.mb;
      result.fileCount += bucketResult.fileCount;
      result.buckets.push({
        bucket,
        bytes: bucketResult.bytes,
        mb: bucketResult.mb,
        fileCount: bucketResult.fileCount
      });
    } catch (error) {
      console.error(`Error scanning bucket ${bucket}:`, error);
      // Continue with other buckets even if one fails
    }
  }

  // Round to 2 decimal places
  result.totalMB = Math.round(result.totalMB * 100) / 100;

  return result;
}

/**
 * Scan a single bucket for files belonging to user/startup
 * 
 * Strategy: Scan Supabase Storage directly and match files by path patterns
 */
async function scanBucket(
  bucket: string,
  userId: string,
  startupId?: number
): Promise<{ bytes: number; mb: number; fileCount: number }> {
  let totalBytes = 0;
  let fileCount = 0;

  try {
    // Get all startups for this user (to match files by startupId)
    let userStartupIds: number[] = [];
    if (!startupId) {
      // If no specific startupId, get all startups for this user
      const { data: startups } = await supabase
        .from('startups')
        .select('id')
        .eq('user_id', userId);
      
      if (startups) {
        userStartupIds = startups.map(s => s.id);
      }
    } else {
      userStartupIds = [startupId];
    }

    // Get application IDs for this user's startups (for contracts/agreements)
    let applicationIds: string[] = [];
    if (userStartupIds.length > 0) {
      const { data: applications } = await supabase
        .from('opportunity_applications')
        .select('id')
        .in('startup_id', userStartupIds);
      
      if (applications) {
        applicationIds = applications.map(a => a.id.toString());
      }
    }

    // Get tracked files from database for this bucket (for fallback matching)
    const { data: trackedFiles } = await supabase
      .from('user_storage_usage')
      .select('storage_location')
      .eq('user_id', userId)
      .like('storage_location', `${bucket}%`);
    
    const trackedPaths = new Set(
      (trackedFiles || []).map(f => f.storage_location.replace(`${bucket}/`, '').toLowerCase())
    );

    // Scan all files in bucket
    const allFiles = await listFilesRecursive(bucket, '');
    
    for (const file of allFiles) {
      let belongsToUser = false;
      const path = file.path.toLowerCase();

      // Pattern 1: Direct startupId in path
      if (userStartupIds.some(id => path.includes(`/${id}/`) || path.startsWith(`${id}/`))) {
        belongsToUser = true;
      }
      
      // Pattern 2: ApplicationId in path (contracts, agreements)
      if (applicationIds.some(appId => path.includes(`/${appId}/`) || path.includes(`/${appId}-`))) {
        belongsToUser = true;
      }
      
      // Pattern 3: userId in path
      if (path.includes(userId.toLowerCase())) {
        belongsToUser = true;
      }

      // Pattern 4: Check database tracking as fallback
      if (!belongsToUser && trackedPaths.has(path)) {
        belongsToUser = true;
      }

      if (belongsToUser) {
        totalBytes += file.size || 0;
        fileCount++;
      }
    }
  } catch (error) {
    console.error(`Error scanning bucket ${bucket}:`, error);
    // Return zero if bucket doesn't exist or access denied
  }

  return {
    bytes: totalBytes,
    mb: totalBytes / (1024 * 1024),
    fileCount
  };
}

/**
 * List files recursively from a bucket path
 */
async function listFilesRecursive(
  bucket: string,
  path: string,
  allFiles: StorageFileInfo[] = []
): Promise<StorageFileInfo[]> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      // Bucket might not exist or no access - that's okay
      if (error.message.includes('not found') || error.message.includes('Bucket')) {
        return allFiles;
      }
      console.error(`Error listing ${bucket}/${path}:`, error);
      return allFiles;
    }

    if (!data || data.length === 0) {
      return allFiles;
    }

    for (const item of data) {
      const fullPath = path ? `${path}/${item.name}` : item.name;

      // Check if it's a file (has id) or folder (no id)
      // Files have metadata with size, folders don't
      if (item.id && item.metadata) {
        // This is a file
        const fileSize = item.metadata.size || 0;
        allFiles.push({
          name: item.name,
          size: fileSize,
          sizeMB: fileSize / (1024 * 1024),
          bucket,
          path: fullPath,
          created_at: item.created_at || '',
          updated_at: item.updated_at || item.created_at || ''
        });
      } else if (!item.id) {
        // This is a folder - recurse into it
        await listFilesRecursive(bucket, fullPath, allFiles);
      }
    }
  } catch (error) {
    console.error(`Error in listFilesRecursive for ${bucket}/${path}:`, error);
  }

  return allFiles;
}

/**
 * Check if a file belongs to the user/startup
 * 
 * This is a fallback method when database tracking is not available.
 * It tries to match files by path patterns.
 */
function fileBelongsToUser(
  file: StorageFileInfo,
  userId: string,
  startupId?: number
): boolean {
  const path = file.path.toLowerCase();
  const lowerUserId = userId.toLowerCase();
  const lowerStartupId = startupId?.toString().toLowerCase() || '';

  // Pattern 1: Path contains startupId directly
  // Example: "123/task/file.pdf" or "company-documents/123/file.pdf"
  if (startupId && path.includes(lowerStartupId)) {
    return true;
  }

  // Pattern 2: Path contains userId
  // Example: "user-id-123/startup/file.pdf"
  if (path.includes(lowerUserId)) {
    return true;
  }

  // Pattern 3: Check if path matches known patterns
  // contracts/{applicationId}/ - need to check application belongs to user
  // agreements/{applicationId}/ - need to check application belongs to user
  // These require database lookup, so return false for now
  // (We'll handle these in scanBucket using database tracking)

  return false;
}

/**
 * Get detailed file list for a user/startup
 */
export async function getStorageFilesFromSupabase(
  userId: string,
  startupId?: number
): Promise<StorageFileInfo[]> {
  const buckets = [
    'startup-documents',
    'compliance-documents',
    'financial-attachments',
    'financial-documents',
    'company-documents',
    'pitch-decks',
    'pitch-videos',
    'employee-contracts',
    'verification-documents',
    'incubation-contracts',
  ];

  const allFiles: StorageFileInfo[] = [];

  for (const bucket of buckets) {
    try {
      const files = await listFilesRecursive(bucket, '');
      
      for (const file of files) {
        if (fileBelongsToUser(file, userId, startupId)) {
          allFiles.push(file);
        }
      }
    } catch (error) {
      console.error(`Error getting files from ${bucket}:`, error);
    }
  }

  // Sort by created_at descending
  allFiles.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return allFiles;
}

/**
 * Sync storage from Supabase to database
 * Updates user_subscriptions.storage_used_mb with actual storage from buckets
 */
export async function syncStorageToDatabase(
  userId: string,
  startupId?: number
): Promise<{ success: boolean; storageMB: number; error?: string }> {
  try {
    // Scan actual storage
    const scanResult = await scanStorageFromSupabase(userId, startupId);

    // Update database
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ 
        storage_used_mb: scanResult.totalMB,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating storage in database:', error);
      return {
        success: false,
        storageMB: scanResult.totalMB,
        error: error.message
      };
    }

    return {
      success: true,
      storageMB: scanResult.totalMB
    };
  } catch (error: any) {
    console.error('Error syncing storage:', error);
    return {
      success: false,
      storageMB: 0,
      error: error.message || 'Unknown error'
    };
  }
}
