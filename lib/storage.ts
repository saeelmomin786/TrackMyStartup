import { supabase } from './supabase';

export interface FileUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// File upload service
export const storageService = {
  // Upload a file to Supabase Storage
  async uploadFile(
    file: File, 
    bucket: string, 
    path: string
  ): Promise<FileUploadResult> {
    try {
      console.log(`Uploading file ${file.name} to ${bucket}/${path}`);
      console.log('File size:', file.size, 'bytes');
      console.log('File type:', file.type);
      
      // Skip bucket test for now and try direct upload
      console.log(`Attempting direct upload to ${bucket}...`);
      
      // Upload the file with a shorter timeout
      const uploadPromise = supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true // Allow overwriting
        });

      // Add timeout to prevent hanging (reduced to 15 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Upload timeout after 15 seconds')), 15000);
      });

      const { data, error } = await Promise.race([uploadPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Upload error:', error);
        
        // Handle specific error types
        if (error.message.includes('bucket') || error.message.includes('not found')) {
          return { success: false, error: `Storage bucket '${bucket}' does not exist. Please create it in Supabase Dashboard.` };
        }
        if (error.message.includes('permission') || error.message.includes('unauthorized') || error.message.includes('policy')) {
          return { success: false, error: 'Permission denied. Please create storage policies in Supabase Dashboard → Storage → Policies.' };
        }
        if (error.message.includes('timeout')) {
          return { success: false, error: 'Upload timed out. Please try again.' };
        }
        
        return { success: false, error: error.message };
      }

      console.log('File uploaded successfully, getting public URL...');

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      console.log('File uploaded successfully:', urlData.publicUrl);
      return { success: true, url: urlData.publicUrl };
    } catch (error) {
      console.error('Error uploading file:', error);
      if (error instanceof Error && error.message.includes('timeout')) {
        return { success: false, error: 'Upload timed out. Please try again.' };
      }
      return { success: false, error: 'Failed to upload file' };
    }
  },

  // Upload user verification documents
  async uploadVerificationDocument(
    file: File, 
    userIdOrEmail: string, 
    documentType: string
  ): Promise<FileUploadResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Check if userIdOrEmail is a UUID (user ID) or email
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdOrEmail);
    
    // Use consistent path format: always use email for consistency
    // This ensures registration and profile uploads go to the same location
    // Add a unique identifier to prevent duplicates
    const uniqueId = Math.random().toString(36).substring(2, 15);
    const fileName = `${userIdOrEmail}/${documentType}_${timestamp}_${uniqueId}_${file.name}`;
    
    return this.uploadFile(file, 'verification-documents', fileName);
  },

  // Upload startup documents
  async uploadStartupDocument(
    file: File, 
    startupId: string, 
    documentType: string
  ): Promise<FileUploadResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${startupId}/${documentType}_${timestamp}_${file.name}`;
    
    return this.uploadFile(file, 'startup-documents', fileName);
  },

  // Upload pitch deck
  async uploadPitchDeck(
    file: File, 
    startupId: string
  ): Promise<FileUploadResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${startupId}/pitch-deck_${timestamp}_${file.name}`;
    
    return this.uploadFile(file, 'pitch-decks', fileName);
  },

  // Upload pitch video
  async uploadPitchVideo(
    file: File, 
    startupId: string
  ): Promise<FileUploadResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${startupId}/pitch-video_${timestamp}_${file.name}`;
    
    return this.uploadFile(file, 'pitch-videos', fileName);
  },

  // Upload financial documents
  async uploadFinancialDocument(
    file: File, 
    startupId: string, 
    documentType: string
  ): Promise<FileUploadResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${startupId}/financial/${documentType}_${timestamp}_${file.name}`;
    
    return this.uploadFile(file, 'financial-documents', fileName);
  },

  // Upload employee contracts
  async uploadEmployeeContract(
    file: File, 
    startupId: string, 
    employeeId: string
  ): Promise<FileUploadResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${startupId}/employees/${employeeId}_contract_${timestamp}_${file.name}`;
    
    return this.uploadFile(file, 'employee-contracts', fileName);
  },

  // Delete a file from storage
  async deleteFile(bucket: string, path: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error('Delete error:', error);
        return { success: false, error: error.message };
      }

      console.log('File deleted successfully:', path);
      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      return { success: false, error: 'Failed to delete file' };
    }
  },

  // Test storage permissions
  async testStoragePermissions(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      console.log('Testing storage permissions...');
      
      // Try to list files in verification-documents bucket
      const { data: files, error } = await supabase.storage
        .from('verification-documents')
        .list('', { limit: 1 });
      
      if (error) {
        console.error('Storage permission test failed:', error);
        return { success: false, error: error.message, details: error };
      }
      
      console.log('Storage permissions test passed');
      return { success: true, details: { filesCount: files?.length || 0 } };
    } catch (error) {
      console.error('Storage test error:', error);
      return { success: false, error: 'Failed to test storage permissions' };
    }
  },

  // Test if a specific bucket exists (simple version)
  async testBucketExists(bucketName: string): Promise<boolean> {
    try {
      console.log(`Testing if bucket ${bucketName} exists...`);
      
      const testPromise = supabase.storage
        .from(bucketName)
        .list('', { limit: 1 });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Bucket test timeout')), 5000);
      });

      await Promise.race([testPromise, timeoutPromise]);
      console.log(`Bucket ${bucketName} exists and is accessible`);
      return true;
    } catch (error) {
      console.error(`Bucket ${bucketName} test failed:`, error);
      return false;
    }
  },

  // Test storage connectivity
  async testStorageConnection(): Promise<{ success: boolean; error?: string; buckets?: string[] }> {
    try {
      console.log('Testing storage connection...');
      
      // Add timeout to prevent hanging
      const testPromise = supabase.storage.listBuckets();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Storage test timeout after 10 seconds')), 10000);
      });

      const { data: buckets, error } = await Promise.race([testPromise, timeoutPromise]) as any;
      
      if (error) {
        console.error('Storage connection error:', error);
        return { success: false, error: error.message };
      }
      
      const bucketNames = buckets?.map(b => b.name) || [];
      console.log('Available buckets:', bucketNames);
      
      return { success: true, buckets: bucketNames };
    } catch (error) {
      console.error('Storage test error:', error);
      if (error instanceof Error && error.message.includes('timeout')) {
        return { success: false, error: 'Storage test timed out' };
      }
      return { success: false, error: 'Failed to test storage connection' };
    }
  },

  // Get file URL
  getFileUrl(bucket: string, path: string): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  },

  // Replace profile photo (delete old, upload new)
  async replaceProfilePhoto(
    file: File, 
    userId: string, 
    oldPhotoUrl?: string
  ): Promise<FileUploadResult> {
    try {
      // Delete old photo if it exists
      if (oldPhotoUrl) {
        try {
          // Extract path from URL
          const urlParts = oldPhotoUrl.split('/');
          const bucketIndex = urlParts.findIndex(part => part === 'storage');
          if (bucketIndex !== -1 && urlParts[bucketIndex + 1] === 'v1' && urlParts[bucketIndex + 2] === 'object') {
            const bucket = urlParts[bucketIndex + 3];
            const path = urlParts.slice(bucketIndex + 4).join('/');
            await this.deleteFile(bucket, path);
          }
        } catch (error) {
          console.warn('Could not delete old profile photo:', error);
        }
      }

      // Upload new photo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const uniqueId = Math.random().toString(36).substring(2, 15);
      const fileName = `${userId}/profile_photo_${timestamp}_${uniqueId}_${file.name}`;
      
      return this.uploadFile(file, 'verification-documents', fileName);
    } catch (error) {
      console.error('Error replacing profile photo:', error);
      return { success: false, error: 'Failed to replace profile photo' };
    }
  },

  // Replace verification document (delete old, upload new)
  async replaceVerificationDocument(
    file: File, 
    userId: string, 
    documentType: string,
    oldDocumentUrl?: string
  ): Promise<FileUploadResult> {
    try {
      // Delete old document if it exists
      if (oldDocumentUrl) {
        try {
          // Extract path from URL
          const urlParts = oldDocumentUrl.split('/');
          const bucketIndex = urlParts.findIndex(part => part === 'storage');
          if (bucketIndex !== -1 && urlParts[bucketIndex + 1] === 'v1' && urlParts[bucketIndex + 2] === 'object') {
            const bucket = urlParts[bucketIndex + 3];
            const path = urlParts.slice(bucketIndex + 4).join('/');
            await this.deleteFile(bucket, path);
          }
        } catch (error) {
          console.warn('Could not delete old document:', error);
        }
      }

      // Upload new document
      return this.uploadVerificationDocument(file, userId, documentType);
    } catch (error) {
      console.error('Error replacing verification document:', error);
      return { success: false, error: 'Failed to replace verification document' };
    }
  }
};
