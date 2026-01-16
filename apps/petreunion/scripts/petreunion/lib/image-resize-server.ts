/**
 * SERVER-SIDE Image Resizing Utility for PetReunion
 * This file only contains server-side code (Node.js APIs)
 */

export interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
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

export async function resizeImageServer(
  imageBuffer: Buffer | string,
  options: ResizeOptions = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
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

      const format =
        opts.format === 'jpeg' ? 'jpeg' : opts.format === 'png' ? 'png' : 'webp';

      const outputOptions: any = { [format]: { quality: Math.round(opts.quality * 100) } };

      return await sharpInstance[format](outputOptions[format]).toBuffer();
    }

    console.warn('[IMAGE RESIZE] Sharp not available, returning original image');

    if (typeof imageBuffer === 'string') {
      return Buffer.from(imageBuffer);
    }

    return imageBuffer;
  } catch (error) {
    console.error('[IMAGE RESIZE] Error:', error);

    if (typeof imageBuffer === 'string') {
      return Buffer.from(imageBuffer);
    }

    return imageBuffer;
  }
}

export async function downloadAndResizeImage(
  imageUrl: string,
  options: ResizeOptions = {}
): Promise<Buffer> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return await resizeImageServer(buffer, options);
}
