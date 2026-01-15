/**
 * Backfill Storage Tracking for Existing Files
 * 
 * This service scans Supabase Storage buckets and creates
 * user_storage_usage records for files that were uploaded
 * before storage tracking was implemented.
 */

import { supabase } from './supabase';

export interface BackfillResult {
  success: boolean;
  filesProcessed: number;
  filesTracked: number;
  totalStorageMB: number;
  errors: number;
  details: {
    bucket: string;
    filesFound: number;
    filesTracked: number;
    storageMB: number;
  }[];
}

/**
 * Backfill storage tracking for a specific user
 * Scans all buckets and creates user_storage_usage records for existing files
 */
export async function backfillStorageForUser(
  userId: string,
  startupId?: number
): Promise<BackfillResult> {
  const result: BackfillResult = {
    success: true,
    filesProcessed: 0,
    filesTracked: 0,
    totalStorageMB: 0,
    errors: 0,
    details: []
  };

  try {
    // Get user's startups if startupId not provided
    let startupIds: number[] = [];
    if (startupId) {
      startupIds = [startupId];
    } else {
      const { data: startups } = await supabase
        .from('startups')
        .select('id')
        .eq('user_id', userId);
      
      if (startups) {
        startupIds = startups.map(s => s.id);
      }
    }

    // Get application IDs for user's startups
    let applicationIds: string[] = [];
    if (startupIds.length > 0) {
      const { data: applications } = await supabase
        .from('opportunity_applications')
        .select('id')
        .in('startup_id', startupIds);
      
      if (applications) {
        applicationIds = applications.map(a => a.id.toString());
      }
    }

    // All buckets to scan
    const buckets = [
      { name: 'startup-documents', type: 'document' },
      { name: 'compliance-documents', type: 'compliance' },
      { name: 'financial-attachments', type: 'financial' },
      { name: 'financial-documents', type: 'financial' },
      { name: 'company-documents', type: 'document' },
      { name: 'pitch-decks', type: 'pitch_deck' },
      { name: 'pitch-videos', type: 'video' },
      { name: 'employee-contracts', type: 'contract' },
      { name: 'verification-documents', type: 'verification' },
      { name: 'incubation-contracts', type: 'contract' },
      { name: 'cap-table-documents', type: 'document' },
      { name: 'business-plans', type: 'document' },
      { name: 'logos', type: 'image' }
    ];

    // Scan each bucket
    for (const bucketInfo of buckets) {
      try {
        const bucketResult = await backfillBucket(
          bucketInfo.name,
          bucketInfo.type,
          userId,
          startupIds,
          applicationIds
        );

        result.filesProcessed += bucketResult.filesFound;
        result.filesTracked += bucketResult.filesTracked;
        result.totalStorageMB += bucketResult.storageMB;
        result.details.push({
          bucket: bucketInfo.name,
          filesFound: bucketResult.filesFound,
          filesTracked: bucketResult.filesTracked,
          storageMB: bucketResult.storageMB
        });
      } catch (error: any) {
        console.error(`Error backfilling bucket ${bucketInfo.name}:`, error);
        result.errors++;
        result.details.push({
          bucket: bucketInfo.name,
          filesFound: 0,
          filesTracked: 0,
          storageMB: 0
        });
      }
    }

    // Update user_subscriptions.storage_used_mb if user has subscription
    if (result.filesTracked > 0) {
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (subscription) {
        // Use database function to recalculate storage
        await supabase.rpc('calculate_user_storage_from_tracking', {
          p_user_id: userId
        });
      }
    }

    return result;
  } catch (error: any) {
    console.error('Error in backfillStorageForUser:', error);
    result.success = false;
    return result;
  }
}

/**
 * Backfill a single bucket
 */
async function backfillBucket(
  bucket: string,
  fileType: string,
  userId: string,
  startupIds: number[],
  applicationIds: string[]
): Promise<{ filesFound: number; filesTracked: number; storageMB: number }> {
  let filesFound = 0;
  let filesTracked = 0;
  let totalStorageMB = 0;

  try {
    // List all files in bucket recursively
    const allFiles = await listFilesRecursive(bucket, '');

    for (const file of allFiles) {
      filesFound++;

      // Check if file belongs to user
      const belongsToUser = fileBelongsToUser(file, userId, startupIds, applicationIds);

      if (!belongsToUser) {
        continue; // Skip files that don't belong to this user
      }

      // Check if file is already tracked
      const storageLocation = `${bucket}/${file.path}`;
      const { data: existing } = await supabase
        .from('user_storage_usage')
        .select('id')
        .eq('user_id', userId)
        .eq('storage_location', storageLocation)
        .limit(1);

      if (existing && existing.length > 0) {
        continue; // Already tracked, skip
      }

      // Calculate file size in MB
      const fileSizeMB = (file.size || 0) / (1024 * 1024);

      // Insert tracking record
      const { error: insertError } = await supabase
        .from('user_storage_usage')
        .insert({
          user_id: userId,
          file_type: fileType,
          file_name: file.name,
          file_size_mb: Math.round(fileSizeMB * 100) / 100,
          storage_location: storageLocation,
          related_entity_type: getRelatedEntityType(bucket, file.path),
          related_entity_id: getRelatedEntityId(file.path, startupIds, applicationIds)
        });

      if (insertError) {
        console.error(`Error tracking file ${storageLocation}:`, insertError);
        continue;
      }

      filesTracked++;
      totalStorageMB += fileSizeMB;
    }
  } catch (error) {
    console.error(`Error scanning bucket ${bucket}:`, error);
  }

  return {
    filesFound,
    filesTracked,
    storageMB: Math.round(totalStorageMB * 100) / 100
  };
}

/**
 * List files recursively from a bucket
 */
async function listFilesRecursive(
  bucket: string,
  path: string,
  allFiles: any[] = []
): Promise<any[]> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
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

      if (item.id && item.metadata) {
        // This is a file
        const fileSize = item.metadata.size || 0;
        allFiles.push({
          name: item.name,
          size: fileSize,
          path: fullPath,
          created_at: item.created_at || '',
          updated_at: item.updated_at || item.created_at || ''
        });
      } else if (!item.id) {
        // This is a folder - recurse
        await listFilesRecursive(bucket, fullPath, allFiles);
      }
    }
  } catch (error) {
    console.error(`Error in listFilesRecursive for ${bucket}/${path}:`, error);
  }

  return allFiles;
}

/**
 * Check if file belongs to user
 */
function fileBelongsToUser(
  file: any,
  userId: string,
  startupIds: number[],
  applicationIds: string[]
): boolean {
  const path = file.path.toLowerCase();
  const lowerUserId = userId.toLowerCase();

  // Pattern 1: Path contains startupId
  if (startupIds.some(id => path.includes(`/${id}/`) || path.startsWith(`${id}/`))) {
    return true;
  }

  // Pattern 2: Path contains applicationId
  if (applicationIds.some(appId => path.includes(`/${appId}/`) || path.includes(`/${appId}-`))) {
    return true;
  }

  // Pattern 3: Path contains userId
  if (path.includes(lowerUserId)) {
    return true;
  }

  // Pattern 4: Check specific bucket patterns
  // compliance-documents/{startupId}/{taskId}/...
  // financial-attachments/{startupId}/...
  // employee-contracts/{startupId}/...
  // etc.

  return false;
}

/**
 * Get related entity type from bucket and path
 */
function getRelatedEntityType(bucket: string, path: string): string | null {
  if (bucket === 'compliance-documents') return 'compliance_task';
  if (bucket === 'financial-attachments' || bucket === 'financial-documents') return 'financial_record';
  if (bucket === 'employee-contracts') return 'employee';
  if (bucket === 'startup-documents') {
    if (path.includes('contracts/')) return 'opportunity_application';
    if (path.includes('agreements/')) return 'opportunity_application';
  }
  if (bucket === 'cap-table-documents') return 'investment';
  return 'startup';
}

/**
 * Get related entity ID from path
 */
function getRelatedEntityId(
  path: string,
  startupIds: number[],
  applicationIds: string[]
): string | null {
  // Try to extract ID from path
  const parts = path.split('/');
  
  // Check for application ID in path
  for (const appId of applicationIds) {
    if (path.includes(appId)) {
      return appId;
    }
  }

  // Check for startup ID in path
  for (const startupId of startupIds) {
    if (path.includes(`/${startupId}/`) || path.startsWith(`${startupId}/`)) {
      return startupId.toString();
    }
  }

  return null;
}

/**
 * Backfill storage for all users (admin function)
 */
export async function backfillStorageForAllUsers(): Promise<{
  success: boolean;
  usersProcessed: number;
  totalFilesTracked: number;
  errors: number;
}> {
  try {
    // Get all users with startups
    const { data: startups } = await supabase
      .from('startups')
      .select('user_id')
      .not('user_id', 'is', null);

    if (!startups || startups.length === 0) {
      return { success: true, usersProcessed: 0, totalFilesTracked: 0, errors: 0 };
    }

    const uniqueUserIds = [...new Set(startups.map(s => s.user_id))];
    let usersProcessed = 0;
    let totalFilesTracked = 0;
    let errors = 0;

    // Process users in batches
    for (const userId of uniqueUserIds) {
      try {
        const result = await backfillStorageForUser(userId);
        usersProcessed++;
        totalFilesTracked += result.filesTracked;
        
        console.log(`✅ Backfilled storage for user ${userId}: ${result.filesTracked} files, ${result.totalStorageMB.toFixed(2)} MB`);
      } catch (error) {
        console.error(`❌ Error backfilling user ${userId}:`, error);
        errors++;
      }
    }

    return {
      success: true,
      usersProcessed,
      totalFilesTracked,
      errors
    };
  } catch (error) {
    console.error('Error in backfillStorageForAllUsers:', error);
    return { success: false, usersProcessed: 0, totalFilesTracked: 0, errors: 0 };
  }
}
