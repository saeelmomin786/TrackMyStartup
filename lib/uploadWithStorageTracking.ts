import { supabase } from './supabase';
import { storageService } from './storageService';

/**
 * Upload File with Automatic Storage Tracking
 * 
 * This helper function uploads files to Supabase Storage AND automatically
 * tracks the storage usage in the user_storage_usage table.
 */

export interface UploadOptions {
  bucket: string;
  path: string;
  file: File;
  cacheControl?: string;
  upsert?: boolean;
  userId: string;
  fileType?: string; // 'document', 'image', 'video', 'pitch_deck', 'compliance', etc.
  relatedEntityType?: string; // 'startup', 'fundraising', 'grant', 'compliance', etc.
  relatedEntityId?: string;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
  fileSizeMB?: number;
}

/**
 * Upload file to Supabase Storage and track storage usage
 */
export async function uploadFileWithTracking(options: UploadOptions): Promise<UploadResult> {
  const {
    bucket,
    path,
    file,
    cacheControl = '3600',
    upsert = false,
    userId,
    fileType = 'document',
    relatedEntityType,
    relatedEntityId
  } = options;

  try {
    // Calculate file size in MB
    const fileSizeMB = file.size / (1024 * 1024);

    // Check storage limit before uploading
    const storageCheck = await storageService.checkStorageLimit(userId, fileSizeMB);
    
    if (!storageCheck.allowed) {
      return {
        success: false,
        error: `Storage limit exceeded. You have ${storageCheck.remaining.toFixed(2)} MB remaining, but need ${fileSizeMB.toFixed(2)} MB. Please upgrade your plan.`,
        fileSizeMB
      };
    }

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl,
        upsert
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`,
        fileSizeMB
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    const publicUrl = urlData.publicUrl;

    // Track storage usage in database
    try {
      await storageService.trackFileUpload(
        userId,
        fileSizeMB,
        path, // Use path as storage_location
        file.name,
        fileType,
        {
          related_entity_type: relatedEntityType,
          related_entity_id: relatedEntityId
        }
      );

      console.log('✅ File uploaded and storage tracked:', {
        fileName: file.name,
        fileSizeMB: fileSizeMB.toFixed(2),
        path,
        userId
      });
      // Database trigger automatically updates user_subscriptions.storage_used_mb
      // No need to call backend API - trigger handles it instantly!
    } catch (trackError) {
      // If tracking fails, log but don't fail the upload
      console.error('⚠️ Failed to track storage usage (upload succeeded):', trackError);
      // Optionally, you could delete the uploaded file here if tracking is critical
    }

    return {
      success: true,
      url: publicUrl,
      path: uploadData.path,
      fileSizeMB
    };
  } catch (error: any) {
    console.error('Error in uploadFileWithTracking:', error);
    return {
      success: false,
      error: error.message || 'Upload failed',
      fileSizeMB: file.size / (1024 * 1024)
    };
  }
}

/**
 * Delete file from Supabase Storage and remove storage tracking
 */
export async function deleteFileWithTracking(
  bucket: string,
  path: string,
  userId: string,
  fileId?: string // Optional: if you have the user_storage_usage record ID
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (deleteError) {
      console.error('Storage delete error:', deleteError);
      return {
        success: false,
        error: `Delete failed: ${deleteError.message}`
      };
    }

    // Remove storage tracking record
    if (fileId) {
      // If we have the record ID, delete by ID
      await storageService.deleteFileRecord(userId, fileId);
    } else {
      // Otherwise, delete by storage_location
      const { error: deleteRecordError } = await supabase
        .from('user_storage_usage')
        .delete()
        .eq('user_id', userId)
        .eq('storage_location', path);

      if (deleteRecordError) {
        console.error('Error deleting storage record:', deleteRecordError);
        // Don't fail if record deletion fails
      }
    }

    console.log('✅ File deleted and storage tracking removed:', { path, userId });

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteFileWithTracking:', error);
    return {
      success: false,
      error: error.message || 'Delete failed'
    };
  }
}

/**
 * Helper to determine file type from file name or MIME type
 */
export function getFileType(fileName: string, mimeType?: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Check MIME type first
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('pdf')) return 'document';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet';
  }
  
  // Fallback to extension
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv'];
  const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
  const spreadsheetExts = ['xls', 'xlsx', 'csv'];
  
  if (imageExts.includes(extension)) return 'image';
  if (videoExts.includes(extension)) return 'video';
  if (docExts.includes(extension)) return 'document';
  if (spreadsheetExts.includes(extension)) return 'spreadsheet';
  
  return 'document'; // Default
}
