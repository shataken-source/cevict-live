import { downloadAndResizeImage } from '@/lib/image-resize-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, maxWidth = 800, maxHeight = 800, quality = 0.85, format = 'jpeg' } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    const resizedBuffer = await downloadAndResizeImage(imageUrl, {
      maxWidth,
      maxHeight,
      quality,
      format: format as 'jpeg' | 'png' | 'webp',
      maintainAspectRatio: true,
    });

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
    return NextResponse.json({ error: error.message || 'Failed to resize image' }, { status: 500 });
  }
}
