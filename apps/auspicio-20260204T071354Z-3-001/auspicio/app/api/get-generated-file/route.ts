import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    
    if (!filePath) {
      return NextResponse.json({
        error: 'File path is required'
      }, { status: 400 });
    }

    // Security check - only allow files from generated-code directory
    if (!filePath.includes('generated-code')) {
      return NextResponse.json({
        error: 'Access denied - only generated files can be accessed'
      }, { status: 403 });
    }

    const fullPath = join(process.cwd(), filePath);
    
    if (!existsSync(fullPath)) {
      return NextResponse.json({
        error: 'File not found',
        path: filePath
      }, { status: 404 });
    }

    try {
      const fileContent = readFileSync(fullPath, 'utf8');
      
      return NextResponse.json({
        success: true,
        content: fileContent,
        path: filePath,
        size: fileContent.length
      });
      
    } catch (readError) {
      console.error('Error reading file:', readError);
      return NextResponse.json({
        error: 'Error reading file content'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
