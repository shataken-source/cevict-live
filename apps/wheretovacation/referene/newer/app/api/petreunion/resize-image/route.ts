import { NextRequest, NextResponse } from 'next/server';
import { downloadAndResizeImage } from '@/lib/image-resize-server';

/**
 * API endpoint to resize images from URLs
 * Used by scrapers and manual entry to ensure uniform image sizes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, maxWidth = 800, maxHeight = 800, quality = 0.85, format = 'jpeg' } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    // Download and resize the image
    const resizedBuffer = await downloadAndResizeImage(imageUrl, {
      maxWidth,
      maxHeight,
      quality,
      format: format as 'jpeg' | 'png' | 'webp',
      maintainAspectRatio: true,
    });

    // Convert to base64 for return
    const base64 = resizedBuffer.toString('base64');
    const mimeType = `image/${format}`;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      dataUrl,
      size: resizedBuffer.length,
    });

  } catch (error: any) {
    console.error('[RESIZE IMAGE API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resize image' },
      { status: 500 }
    );
  }
}

