import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HEALTH_ALLOWED_ORIGINS = [
  'http://localhost:3001',
  'http://localhost:3010',
  'https://cevict.ai',
  'https://www.cevict.ai',
];

function isAllowedHealthUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    const origin = `${u.protocol}//${u.host}`;
    return HEALTH_ALLOWED_ORIGINS.some(
      (allowed) => origin === allowed || origin === allowed.replace(/\/$/, '')
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
  }

  if (!isAllowedHealthUrl(url)) {
    return NextResponse.json(
      { error: 'URL not allowed. Use localhost or cevict.ai.' },
      { status: 403 }
    );
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ status: 'ok', statusCode: res.status, data });
    }
    return NextResponse.json({
      status: 'error',
      statusCode: res.status,
      message: `HTTP ${res.status}`,
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ status: 'error', message: 'Request timeout' });
    }
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Health check failed',
    });
  }
}
