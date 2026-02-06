import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({
        status: 'ok',
        statusCode: res.status,
        data,
      });
    } else {
      return NextResponse.json({
        status: 'error',
        statusCode: res.status,
        message: `HTTP ${res.status}`,
      });
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({
        status: 'error',
        message: 'Request timeout',
      });
    }
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Health check failed',
    });
  }
}

