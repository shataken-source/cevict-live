import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getGccBaseUrl(): string | null {
  const v =
    process.env.GCC_BASE_URL ||
    process.env.NEXT_PUBLIC_GCC_BASE_URL ||
    process.env.GULFCOASTCHARTERS_BASE_URL ||
    '';
  const s = String(v).trim().replace(/\/+$/, '');
  return s ? s : null;
}

/**
 * Proxy the public GCC listings feed.
 * - Keeps WTV from hard-coding GCC domains in client code
 * - Lets us later add caching, filtering, and auth in one place
 */
export async function GET(request: NextRequest) {
  const gccBase = getGccBaseUrl();
  if (!gccBase) {
    return NextResponse.json(
      {
        error: 'Missing GCC base URL',
        details:
          'Set GCC_BASE_URL (server) or NEXT_PUBLIC_GCC_BASE_URL (public) to your GulfCoastCharters deployment URL.',
      },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const available = url.searchParams.get('available') || 'true';
  const limit = url.searchParams.get('limit') || '50';

  const upstream = `${gccBase}/api/boats?available=${encodeURIComponent(available)}&limit=${encodeURIComponent(limit)}`;

  try {
    const res = await fetch(upstream, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      // Next.js caching control for route handlers
      cache: 'no-store',
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Upstream GCC request failed', status: res.status, body: text.slice(0, 2000) },
        { status: 502 }
      );
    }

    // Upstream returns JSON array; forward it as-is.
    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // Cache at the edge briefly; upstream already uses s-maxage=60.
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Failed to reach GCC', details: e?.message || String(e) },
      { status: 502 }
    );
  }
}

