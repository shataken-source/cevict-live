import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'Alpha Hunter Trading Bot API',
    version: '1.0.0',
    endpoints: [
      '/api/health',
      '/api/status',
      '/api/learning-loop'
    ],
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({
    message: 'Alpha Hunter API - Use specific endpoints for trading operations'
  }, { status: 200 });
}
