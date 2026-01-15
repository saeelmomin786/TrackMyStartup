import { supabase } from './supabase';

/**
 * Storage Usage Service
 * Handles storage tracking and limits
 */

export interface StorageUsage {
  used_mb: number;
  limit_mb: number;
  percentage: number;
  remaining_mb: number;
}

export interface StorageFile {
  id: string;
  user_id: string;
  file_type: string;
  file_name: string;
  file_size_mb: number;
  storage_location: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
}

export class StorageUsageService {
  /**
   * Get user's storage usage
   * 
   * For free users (no subscription): Calculates directly from user_storage_usage table
   * For paid users (with subscription): Uses storage_used_mb from user_subscriptions (updated by trigger)
   */
  async getStorageUsage(
    userId: string,
    planTier: 'free' | 'basic' | 'premium' = 'free'
  ): Promise<StorageUsage | null> {
    try {
      // Get storage limit based on plan tier
      const storageLimits = {
        free: 100,
        basic: 1024, // 1GB
        premium: 10240 // 10GB
      };

      const limit_mb = storageLimits[planTier];

      // Check if user has an active subscription
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('storage_used_mb')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let used_mb = 0;

      if (subscription && subscription.storage_used_mb !== null) {
        // User has paid subscription - use storage from subscription (updated by trigger)
        used_mb = parseFloat(subscription.storage_used_mb?.toString() || '0') || 0;
      } else {
        // User is on free plan (no subscription) - calculate directly from user_storage_usage
        // This is fast and doesn't require subscription records
        const { data, error } = await supabase
          .rpc('get_user_storage_total', { p_user_id: userId });

        if (error) {
          console.error('❌ Error fetching storage total from RPC:', error);
          console.error('   User ID:', userId);
          console.error('   Error details:', JSON.stringify(error, null, 2));
          // Fallback: calculate manually
          return await this.calculateStorageUsage(userId, limit_mb);
        }

        // Log the RPC response for debugging
        console.log('📊 Storage RPC Response:', {
          userId,
          data,
          dataType: typeof data,
          parsed: parseFloat(data?.toString() || '0')
        });

        used_mb = parseFloat(data?.toString() || '0') || 0;
        
        // If still 0, try direct query as fallback
        if (used_mb === 0) {
          console.log('⚠️ RPC returned 0, checking direct query...');
          const { data: directData, error: directError } = await supabase
            .from('user_storage_usage')
            .select('file_size_mb')
            .eq('user_id', userId);
          
          if (!directError && directData && directData.length > 0) {
            const directTotal = directData.reduce((sum, file) => sum + parseFloat(file.file_size_mb?.toString() || '0'), 0);
            console.log('📁 Direct query result:', {
              fileCount: directData.length,
              totalMB: directTotal
            });
            used_mb = directTotal;
          } else {
            console.log('📁 Direct query found no files or error:', directError);
          }
        }
      }

      const remaining_mb = Math.max(0, limit_mb - used_mb);
      const percentage = limit_mb > 0 ? (used_mb / limit_mb) * 100 : 0;

      return {
        used_mb: Math.round(used_mb * 100) / 100,
        limit_mb,
        percentage: Math.round(percentage * 100) / 100,
        remaining_mb: Math.round(remaining_mb * 100) / 100
      };
    } catch (error) {
      console.error('Error in getStorageUsage:', error);
      return null;
    }
  }

  /**
   * Calculate storage usage manually (fallback)
   */
  private async calculateStorageUsage(
    userId: string,
    limit_mb: number
  ): Promise<StorageUsage | null> {
    try {
      const { data, error } = await supabase
        .from('user_storage_usage')
        .select('file_size_mb')
        .eq('user_id', userId);

      if (error) {
        console.error('Error calculating storage:', error);
        return null;
      }

      const used_mb = (data || []).reduce((sum, file) => sum + (file.file_size_mb || 0), 0);
      const remaining_mb = Math.max(0, limit_mb - used_mb);
      const percentage = limit_mb > 0 ? (used_mb / limit_mb) * 100 : 0;

      return {
        used_mb: Math.round(used_mb * 100) / 100,
        limit_mb,
        percentage: Math.round(percentage * 100) / 100,
        remaining_mb: Math.round(remaining_mb * 100) / 100
      };
    } catch (error) {
      console.error('Error in calculateStorageUsage:', error);
      return null;
    }
  }

  /**
   * Get user's storage files
   */
  async getStorageFiles(
    userId: string,
    limit: number = 100
  ): Promise<StorageFile[]> {
    try {
      const { data, error } = await supabase
        .from('user_storage_usage')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching storage files:', error);
        return [];
      }

      return (data || []) as StorageFile[];
    } catch (error) {
      console.error('Error in getStorageFiles:', error);
      return [];
    }
  }

  /**
   * Record a file upload
   */
  async recordFileUpload(
    userId: string,
    fileType: string,
    fileName: string,
    fileSizeMb: number,
    storageLocation: string,
    relatedEntityType?: string,
    relatedEntityId?: string
  ): Promise<StorageFile | null> {
    try {
      const { data, error } = await supabase
        .from('user_storage_usage')
        .insert({
          user_id: userId,
          file_type: fileType,
          file_name: fileName,
          file_size_mb: fileSizeMb,
          storage_location: storageLocation,
          related_entity_type: relatedEntityType || null,
          related_entity_id: relatedEntityId || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error recording file upload:', error);
        return null;
      }

      return data as StorageFile;
    } catch (error) {
      console.error('Error in recordFileUpload:', error);
      return null;
    }
  }

  /**
   * Delete a storage file record
   */
  async deleteFileRecord(fileId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_storage_usage')
        .delete()
        .eq('id', fileId);

      if (error) {
        console.error('Error deleting file record:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteFileRecord:', error);
      return false;
    }
  }

  /**
   * Check if user has enough storage space
   */
  async hasEnoughStorage(
    userId: string,
    requiredMb: number,
    planTier: 'free' | 'basic' | 'premium' = 'free'
  ): Promise<boolean> {
    try {
      const usage = await this.getStorageUsage(userId, planTier);
      if (!usage) return false;

      return usage.remaining_mb >= requiredMb;
    } catch (error) {
      console.error('Error checking storage:', error);
      return false;
    }
  }
}

// Export singleton instance
export const storageUsageService = new StorageUsageService();
