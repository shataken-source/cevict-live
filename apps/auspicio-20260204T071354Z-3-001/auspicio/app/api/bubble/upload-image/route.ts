// API Route for Image Upload in Bubbles
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bubbleId = formData.get('bubbleId') as string;
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }
    
    console.log('📤 Processing image upload:', { 
      fileName: file.name, 
      fileSize: file.size, 
      bubbleId 
    });
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'
      }, { status: 400 });
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({
        success: false,
        error: 'File too large. Maximum size is 5MB.'
      }, { status: 400 });
    }
    
    // Mock image processing and URL generation
    // In a real app, you'd upload to cloud storage (AWS S3, Cloudinary, etc.)
    const mockImageUrl = `https://mock-cdn.example.com/images/${bubbleId}/${Date.now()}-${file.name}`;
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const result = {
      success: true,
      url: mockImageUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadedAt: new Date().toISOString(),
      bubbleId
    };
    
    console.log('✅ Image upload completed:', { 
      url: result.url, 
      fileName: result.fileName 
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ Image upload failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to upload image',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'GET method not allowed for image upload'
  }, { status: 405 });
}
