import { supabase } from './supabase';
import { featureAccessService } from './featureAccessService';

/**
 * Storage Service
 * Manages file storage tracking and quota enforcement
 */

export interface StorageUsage {
  used_mb: number;
  limit_mb: number;
  percentage: number;
  remaining_mb: number;
}

export interface StorageFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size_mb: number;
  storage_location: string;
  related_entity_type?: string;
  related_entity_id?: string;
  created_at: string;
}

export class StorageService {
  /**
   * Check if user can upload a file of given size
   * 
   * For free users (no subscription): 100 MB limit
   * For paid users (with subscription): Limit from subscription plan
   * 
   * @param userId - User ID
   * @param fileSizeMB - File size in MB
   * @returns Object with allowed status and current usage
   */
  async checkStorageLimit(
    userId: string,
    fileSizeMB: number
  ): Promise<{ allowed: boolean; current: number; limit: number; remaining: number }> {
    try {
      // Log the userId being used for debugging
      console.log('📊 [STORAGE] Checking storage limit for userId:', userId, 'fileSizeMB:', fileSizeMB);
      
      if (!userId) {
        console.warn('⚠️ WARNING: userId is null/undefined when checking storage limit.');
        // Default to not allowed if userId is missing to prevent unlimited uploads
        return { allowed: false, current: 0, limit: 100, remaining: 0 };
      }
      
      // Get user's storage limit from database function
      // This function returns 100 MB for free users (no subscription) and plan limit for paid users
      const { data: limit, error: limitError } = await supabase.rpc('get_user_storage_limit', {
        p_user_id: userId
      });

      if (limitError) {
        // If function doesn't exist (PGRST202), use fallback without logging error
        // This is expected if the function hasn't been created in the database yet
        const isFunctionNotFound = limitError.code === 'PGRST202' || 
                                   limitError.message?.includes('Could not find the function');
        
        if (!isFunctionNotFound) {
          // Only log non-"function not found" errors
          console.error('Error getting storage limit:', limitError);
        } else {
          console.log('ℹ️ [STORAGE] get_user_storage_limit function not found, using fallback method');
        }
        
        // If function doesn't exist, try to get limit from subscription directly
        // Otherwise default to 100 MB (free plan)
        const defaultLimit = 100;
        
        // Try to get limit from subscription_plans table directly as fallback
        try {
          const { data: subscriptionData } = await supabase
            .from('user_subscriptions')
            .select('plan_id, subscription_plans(storage_limit_mb)')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('current_period_start', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (subscriptionData && (subscriptionData as any).subscription_plans) {
            const planLimit = (subscriptionData as any).subscription_plans.storage_limit_mb;
            if (planLimit) {
              const storageLimit = planLimit;
              const { data: usage } = await supabase.rpc('get_user_storage_total', { p_user_id: userId });
              const currentUsage = usage || 0;
              const remaining = storageLimit - currentUsage;
              const allowed = (currentUsage + fileSizeMB) <= storageLimit;
              console.log('📊 [STORAGE] Storage check result (fallback):', { allowed, current: currentUsage, limit: storageLimit, remaining: Math.max(0, remaining - fileSizeMB) });
              return { allowed, current: currentUsage, limit: storageLimit, remaining: Math.max(0, remaining - fileSizeMB) };
            }
          }
        } catch (fallbackError) {
          console.warn('Fallback storage limit check failed:', fallbackError);
        }
        
        return {
          allowed: fileSizeMB <= defaultLimit,
          current: 0,
          limit: defaultLimit,
          remaining: Math.max(0, defaultLimit - fileSizeMB)
        };
      }

      const storageLimit = limit || 100; // Default to 100 MB if null

      // Get current storage usage
      // For free users: calculates from user_storage_usage table
      // For paid users: uses storage_used_mb from subscription (updated by trigger)
      const { data: usage, error: usageError } = await supabase.rpc('get_user_storage_total', {
        p_user_id: userId
      });

      const currentUsage = usage || 0;
      const remaining = storageLimit - currentUsage;
      
      // Check if upload would exceed limit
      const allowed = (currentUsage + fileSizeMB) <= storageLimit;
      
      console.log('📊 [STORAGE] Storage check result:', { allowed, current: currentUsage, limit: storageLimit, remaining: Math.max(0, remaining - fileSizeMB) });
      
      return {
        allowed,
        current: currentUsage,
        limit: storageLimit,
        remaining: Math.max(0, remaining - fileSizeMB)
      };
    } catch (error) {
      console.error('Error checking storage limit:', error);
      // Fail-safe: block upload if check fails
      return {
        allowed: false,
        current: 0,
        limit: 100,
        remaining: 0
      };
    }
  }

  /**
   * Track a file upload
   * @param userId - User ID
   * @param fileSizeMB - File size in MB
   * @param filePath - Storage path/URL
   * @param fileName - Original file name
   * @param fileType - File type (document, image, video, etc.)
   * @param metadata - Additional metadata (related entity, etc.)
   * @returns True if tracked successfully
   */
  async trackFileUpload(
    userId: string,
    fileSizeMB: number,
    filePath: string,
    fileName: string,
    fileType: string = 'document',
    metadata?: {
      related_entity_type?: string;
      related_entity_id?: string;
    }
  ): Promise<boolean> {
    try {
      if (!userId) {
        console.error('⚠️ [STORAGE] userId is null/undefined in trackFileUpload. Cannot track storage.');
        throw new Error('User ID is missing for storage tracking.');
      }
      
      // First check if upload is allowed
      const { allowed } = await this.checkStorageLimit(userId, fileSizeMB);
      
      if (!allowed) {
        throw new Error('Storage limit exceeded. Please upgrade your plan.');
      }

      // Validate UUID format for related_entity_id
      // Only set it if it's a valid UUID, otherwise set to null
      let relatedEntityId: string | null = null;
      if (metadata?.related_entity_id) {
        // Check if it's a valid UUID format (8-4-4-4-12 hex characters)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(metadata.related_entity_id)) {
          relatedEntityId = metadata.related_entity_id;
        } else {
          console.warn('⚠️ [STORAGE] related_entity_id is not a valid UUID, setting to null:', metadata.related_entity_id);
        }
      }

      // Record file usage
      console.log('📊 [STORAGE] Inserting storage record:', {
        user_id: userId,
        file_name: fileName,
        file_size_mb: fileSizeMB,
        storage_location: filePath,
        file_type: fileType,
        related_entity_type: metadata?.related_entity_type,
        related_entity_id: relatedEntityId
      });
      
      const { data, error } = await supabase
        .from('user_storage_usage')
        .insert({
          user_id: userId,
          file_type: fileType,
          file_name: fileName,
          file_size_mb: fileSizeMB,
          storage_location: filePath,
          related_entity_type: metadata?.related_entity_type,
          related_entity_id: relatedEntityId // Only set if valid UUID, otherwise null
        })
        .select();

      if (error) {
        console.error('❌ [STORAGE] Error tracking file upload:', error);
        console.error('❌ [STORAGE] Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('✅ [STORAGE] Storage record inserted successfully:', {
        userId,
        fileName,
        fileSizeMB
      });

      // Storage usage is automatically updated via database trigger
      return true;
    } catch (error) {
      console.error('Error in trackFileUpload:', error);
      throw error;
    }
  }

  /**
   * Get user's storage usage
   * @param userId - User ID
   * @returns Storage usage details
   */
  async getStorageUsage(userId: string): Promise<StorageUsage> {
    try {
      // Try to get limit from RPC function, fallback to 100 MB if it fails
      let storageLimit = 100;
      const { data: limit, error: limitError } = await supabase.rpc('get_user_storage_limit', {
        p_user_id: userId
      });

      if (limitError) {
        // If function doesn't exist (PGRST202), use fallback without logging warning
        const isFunctionNotFound = limitError.code === 'PGRST202' || 
                                   limitError.message?.includes('Could not find the function');
        
        if (!isFunctionNotFound) {
          // Only log non-"function not found" errors
          console.warn('⚠️ Error getting storage limit from RPC, using default 100 MB:', limitError);
        }
        
        // Try fallback: get from subscription directly
        try {
          const { data: subscriptionData } = await supabase
            .from('user_subscriptions')
            .select('plan_id, subscription_plans(storage_limit_mb)')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('current_period_start', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (subscriptionData && (subscriptionData as any).subscription_plans) {
            const planLimit = (subscriptionData as any).subscription_plans.storage_limit_mb;
            if (planLimit) {
              storageLimit = planLimit;
            }
          }
        } catch (fallbackError) {
          console.warn('Fallback storage limit check failed:', fallbackError);
        }
      } else {
        storageLimit = limit || 100;
      }

      const { data: usage, error: usageError } = await supabase.rpc('get_user_storage_total', {
        p_user_id: userId
      });

      if (usageError) {
        console.error('Error getting storage usage:', usageError);
        return {
          used_mb: 0,
          limit_mb: storageLimit,
          percentage: 0,
          remaining_mb: storageLimit
        };
      }

      const used = usage || 0;
      const percentage = storageLimit > 0 ? (used / storageLimit) * 100 : 0;
      const remaining_mb = Math.max(0, storageLimit - used);

      return {
        used_mb: used,
        limit_mb: storageLimit,
        percentage: Math.round(percentage * 100) / 100,
        remaining_mb
      };
    } catch (error) {
      console.error('Error in getStorageUsage:', error);
      return {
        used_mb: 0,
        limit_mb: 100,
        percentage: 0,
        remaining_mb: 100
      };
    }
  }

  /**
   * Get user's file list
   * @param userId - User ID
   * @param limit - Maximum number of files to return
   * @returns Array of file records
   */
  async getUserFiles(userId: string, limit: number = 100): Promise<StorageFile[]> {
    try {
      const { data, error } = await supabase
        .from('user_storage_usage')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting user files:', error);
        return [];
      }

      return (data || []).map(file => ({
        id: file.id,
        file_name: file.file_name,
        file_type: file.file_type,
        file_size_mb: file.file_size_mb,
        storage_location: file.storage_location,
        related_entity_type: file.related_entity_type,
        related_entity_id: file.related_entity_id,
        created_at: file.created_at
      }));
    } catch (error) {
      console.error('Error in getUserFiles:', error);
      return [];
    }
  }

  /**
   * Delete a file record (doesn't delete the actual file, just the record)
   * @param userId - User ID
   * @param fileId - File record ID
   * @returns True if deleted successfully
   */
  async deleteFileRecord(userId: string, fileId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_storage_usage')
        .delete()
        .eq('id', fileId)
        .eq('user_id', userId); // Ensure user can only delete their own files

      if (error) {
        console.error('Error deleting file record:', error);
        return false;
      }

      // Database trigger automatically updates user_subscriptions.storage_used_mb
      // No need to call backend API - trigger handles it instantly!
      return true;
    } catch (error) {
      console.error('Error in deleteFileRecord:', error);
      return false;
    }
  }

  /**
   * Get storage usage by file type
   * @param userId - User ID
   * @returns Object with file type as key and total size as value
   */
  async getStorageByType(userId: string): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('user_storage_usage')
        .select('file_type, file_size_mb')
        .eq('user_id', userId);

      if (error) {
        console.error('Error getting storage by type:', error);
        return {};
      }

      const byType: Record<string, number> = {};
      
      (data || []).forEach(file => {
        const type = file.file_type || 'other';
        byType[type] = (byType[type] || 0) + file.file_size_mb;
      });

      return byType;
    } catch (error) {
      console.error('Error in getStorageByType:', error);
      return {};
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
