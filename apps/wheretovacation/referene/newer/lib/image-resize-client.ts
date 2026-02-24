/**
 * CLIENT-SIDE Image Resizing Utility for PetReunion
 * This file only contains client-side code (browser APIs)
 * Server-side code is in image-resize-server.ts
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
 * Resize an image from a URL or base64 string (CLIENT-SIDE ONLY)
 * Returns a base64 data URL of the resized image
 */
export async function resizeImage(
  imageSource: string,
  options: ResizeOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // Calculate new dimensions
        let { width, height } = img;
        const aspectRatio = width / height;

        if (opts.maintainAspectRatio) {
          if (width > opts.maxWidth || height > opts.maxHeight) {
            if (width > height) {
              width = opts.maxWidth;
              height = width / aspectRatio;
              if (height > opts.maxHeight) {
                height = opts.maxHeight;
                width = height * aspectRatio;
              }
            } else {
              height = opts.maxHeight;
              width = height * aspectRatio;
              if (width > opts.maxWidth) {
                width = opts.maxWidth;
                height = width / aspectRatio;
              }
            }
          }
        } else {
          width = opts.maxWidth;
          height = opts.maxHeight;
        }

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Draw and resize
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob/data URL
        const mimeType = `image/${opts.format}`;
        const dataUrl = canvas.toDataURL(mimeType, opts.quality);

        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Handle base64 or URL
    if (imageSource.startsWith('data:')) {
      img.src = imageSource;
    } else {
      img.src = imageSource;
    }
  });
}

/**
 * Resize an image from a File object (CLIENT-SIDE ONLY)
 * Returns a base64 data URL of the resized image
 */
export async function resizeImageFromFile(
  file: File,
  options: ResizeOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const dataUrl = e.target?.result as string;
        const resized = await resizeImage(dataUrl, options);
        resolve(resized);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Convert base64 data URL to Blob (CLIENT-SIDE ONLY)
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

