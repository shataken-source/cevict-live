/**
 * Inspection Signature Handler
 * 
 * Handles uploading signatures to Supabase Storage instead of database.
 * CRITICAL FIX: Reduces database bloat from 200KB per signature to ~50 bytes.
 * 
 * Features:
 * - Upload to Supabase Storage bucket
 * - Automatic image compression
 * - Secure URL generation
 * - Cleanup on deletion
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface SignatureUploadResult {
  url: string;
  path: string;
  fileSize: number;
  success: boolean;
  error?: string;
}

export class InspectionSignatureHandler {
  private supabase: SupabaseClient;
  private bucketName = 'inspection-signatures';
  
  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }
  
  /**
   * Upload signature to storage bucket
   * 
   * @param base64Data - Base64 encoded signature image
   * @param inspectionId - ID of the inspection
   * @param signatureType - Type of signature (inspector, captain, customer)
   * @param userId - ID of the user signing
   * @returns Upload result with URL
   */
  async uploadSignature(
    base64Data: string,
    inspectionId: string,
    signatureType: 'inspector' | 'captain' | 'customer',
    userId: string
  ): Promise<SignatureUploadResult> {
    try {
      // Remove data URL prefix if present
      const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
      
      // Convert base64 to blob
      const blob = this.base64ToBlob(base64Clean, 'image/png');
      
      // Compress the image
      const compressedBlob = await this.compressImage(blob);
      
      // Generate file path: userId/inspectionId/signatureType.png
      const filePath = `${userId}/${inspectionId}/${signatureType}.png`;
      
      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, compressedBlob, {
          cacheControl: '3600',
          upsert: true, // Overwrite if exists
          contentType: 'image/png'
        });
      
      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }
      
      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);
      
      // Save signature metadata to database
      await this.saveSignatureMetadata(
        inspectionId,
        urlData.publicUrl,
        signatureType,
        userId,
        compressedBlob.size
      );
      
      return {
        url: urlData.publicUrl,
        path: filePath,
        fileSize: compressedBlob.size,
        success: true
      };
      
    } catch (error: any) {
      console.error('Signature upload failed:', error);
      return {
        url: '',
        path: '',
        fileSize: 0,
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Convert base64 string to Blob
   */
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
  
  /**
   * Compress image to reduce file size
   * Target: < 50KB for signatures
   */
  private async compressImage(blob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      img.onload = () => {
        // Resize to reasonable dimensions for signatures
        const maxWidth = 600;
        const maxHeight = 300;
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions maintaining aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with compression
        canvas.toBlob(
          (compressedBlob) => {
            if (compressedBlob) {
              console.log(`Compressed signature: ${blob.size} -> ${compressedBlob.size} bytes`);
              resolve(compressedBlob);
            } else {
              reject(new Error('Compression failed'));
            }
          },
          'image/png',
          0.8 // Quality (0-1)
        );
      };
      
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = URL.createObjectURL(blob);
    });
  }
  
  /**
   * Save signature metadata to database
   */
  private async saveSignatureMetadata(
    inspectionId: string,
    signatureUrl: string,
    signatureType: 'inspector' | 'captain' | 'customer',
    signedBy: string,
    fileSize: number
  ): Promise<void> {
    const { error } = await this.supabase
      .from('inspection_signatures')
      .upsert({
        inspection_id: inspectionId,
        signature_url: signatureUrl,
        signature_type: signatureType,
        signed_by: signedBy,
        file_size: fileSize,
        mime_type: 'image/png',
        signed_at: new Date().toISOString()
      });
    
    if (error) {
      throw new Error(`Failed to save signature metadata: ${error.message}`);
    }
  }
  
  /**
   * Get signature URL from database
   */
  async getSignature(
    inspectionId: string,
    signatureType: 'inspector' | 'captain' | 'customer'
  ): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('inspection_signatures')
      .select('signature_url')
      .eq('inspection_id', inspectionId)
      .eq('signature_type', signatureType)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data.signature_url;
  }
  
  /**
   * Get all signatures for an inspection
   */
  async getAllSignatures(inspectionId: string): Promise<{
    inspector?: string;
    captain?: string;
    customer?: string;
  }> {
    const { data, error } = await this.supabase
      .from('inspection_signatures')
      .select('signature_type, signature_url')
      .eq('inspection_id', inspectionId);
    
    if (error || !data) {
      return {};
    }
    
    const signatures: any = {};
    data.forEach(sig => {
      signatures[sig.signature_type] = sig.signature_url;
    });
    
    return signatures;
  }
  
  /**
   * Delete signature from storage and database
   */
  async deleteSignature(
    inspectionId: string,
    signatureType: 'inspector' | 'captain' | 'customer',
    userId: string
  ): Promise<boolean> {
    try {
      // Get file path
      const filePath = `${userId}/${inspectionId}/${signatureType}.png`;
      
      // Delete from storage
      const { error: storageError } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath]);
      
      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }
      
      // Delete from database
      const { error: dbError } = await this.supabase
        .from('inspection_signatures')
        .delete()
        .eq('inspection_id', inspectionId)
        .eq('signature_type', signatureType);
      
      if (dbError) {
        throw new Error(`Database deletion failed: ${dbError.message}`);
      }
      
      return true;
      
    } catch (error: any) {
      console.error('Signature deletion failed:', error);
      return false;
    }
  }
  
  /**
   * Delete all signatures for an inspection
   */
  async deleteAllSignatures(inspectionId: string, userId: string): Promise<void> {
    const types: Array<'inspector' | 'captain' | 'customer'> = ['inspector', 'captain', 'customer'];
    
    for (const type of types) {
      await this.deleteSignature(inspectionId, type, userId);
    }
  }
  
  /**
   * Verify signature exists and is accessible
   */
  async verifySignature(signatureUrl: string): Promise<boolean> {
    try {
      const response = await fetch(signatureUrl, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  /**
   * Get storage bucket statistics
   */
  async getStorageStats(): Promise<{
    totalSignatures: number;
    totalSize: number;
    averageSize: number;
  }> {
    const { data, error } = await this.supabase
      .from('inspection_signatures')
      .select('file_size');
    
    if (error || !data) {
      return { totalSignatures: 0, totalSize: 0, averageSize: 0 };
    }
    
    const totalSignatures = data.length;
    const totalSize = data.reduce((sum, sig) => sum + (sig.file_size || 0), 0);
    const averageSize = totalSignatures > 0 ? totalSize / totalSignatures : 0;
    
    return {
      totalSignatures,
      totalSize,
      averageSize
    };
  }
}

/**
 * Helper function to initialize the storage bucket
 * Run this once during setup
 */
export async function initializeSignatureStorage(supabase: SupabaseClient): Promise<void> {
  // Check if bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  
  const bucketExists = buckets?.some(b => b.name === 'inspection-signatures');
  
  if (!bucketExists) {
    // Create bucket
    const { error } = await supabase.storage.createBucket('inspection-signatures', {
      public: false, // Private bucket, use signed URLs
      fileSizeLimit: 1024 * 1024, // 1MB limit
      allowedMimeTypes: ['image/png', 'image/jpeg']
    });
    
    if (error) {
      throw new Error(`Failed to create bucket: ${error.message}`);
    }
    
    console.log('Signature storage bucket created successfully');
  }
}
