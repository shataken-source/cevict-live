/**
 * SERVER-SIDE Image Resizing Utility for PetReunion
 * This file only contains server-side code (Node.js APIs)
 * Client-side code is in image-resize-client.ts
 */

export interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1 for JPEG quality
  format?: 'jpeg' | 'png' | 'webp';
  maintainAspectRatio?: boolean;
}

const DEFAULT_OPTIONS: Required<ResizeOptions> = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.85,
  format: 'jpeg',
  maintainAspectRatio: true,
};

/**
 * Server-side image resizing using Node.js (for API routes only)
 * Uses sharp if available, otherwise falls back to basic processing
 */
export async function resizeImageServer(
  imageBuffer: Buffer | string,
  options: ResizeOptions = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Try to use sharp (faster, better quality)
    const sharp = await import('sharp').catch(() => null);
    
    if (sharp) {
      let sharpInstance = sharp.default(imageBuffer);

      if (opts.maintainAspectRatio) {
        sharpInstance = sharpInstance.resize(opts.maxWidth, opts.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      } else {
        sharpInstance = sharpInstance.resize(opts.maxWidth, opts.maxHeight, {
          fit: 'fill',
        });
      }

      const format = opts.format === 'jpeg' ? 'jpeg' : opts.format === 'png' ? 'png' : 'webp';
      const outputOptions: any = { [format]: { quality: Math.round(opts.quality * 100) } };

      return await sharpInstance[format](outputOptions[format]).toBuffer();
    }

    // Fallback: return original if sharp not available
    // In production, sharp should be installed
    console.warn('[IMAGE RESIZE] Sharp not available, returning original image');
    if (typeof imageBuffer === 'string') {
      return Buffer.from(imageBuffer);
    }
    return imageBuffer;
  } catch (error) {
    console.error('[IMAGE RESIZE] Error:', error);
    // Return original on error
    if (typeof imageBuffer === 'string') {
      return Buffer.from(imageBuffer);
    }
    return imageBuffer;
  }
}

/**
 * Download and resize an image from a URL (server-side only)
 */
export async function downloadAndResizeImage(
  imageUrl: string,
  options: ResizeOptions = {}
): Promise<Buffer> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return await resizeImageServer(buffer, options);
  } catch (error) {
    console.error('[DOWNLOAD & RESIZE] Error:', error);
    throw error;
  }
}

