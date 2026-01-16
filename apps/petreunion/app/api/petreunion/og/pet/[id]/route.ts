import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSiteUrl(request: NextRequest): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  if (env) return env.replace(/\/+$/, '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3007';
  const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`.replace(/\/+$/, '');
}

function dataUrlToBuffer(dataUrl: string): { mime: string; buf: Buffer } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1] || 'image/jpeg';
  const b64 = m[2] || '';
  try {
    return { mime, buf: Buffer.from(b64, 'base64') };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const siteUrl = getSiteUrl(request);
  const fallback = NextResponse.redirect(`${siteUrl}/og-image.jpg`, 302);

  try {
    if (!supabaseUrl || !supabaseKey) return fallback;

    const { id } = await props.params;
    if (!id) return fallback;

    const qs = new URLSearchParams();
    qs.set('select', 'id,photo_url');
    qs.set('id', `eq.${id}`);
    qs.set('limit', '1');

    const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/lost_pets?${qs.toString()}`;
    const res = await fetch(url, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      cache: 'no-store',
    });
    if (!res.ok) return fallback;

    const rows = (await res.json().catch(() => [])) as any[];
    const pet = Array.isArray(rows) && rows.length ? rows[0] : null;
    const photoUrl = String(pet?.photo_url || '').trim();
    if (!photoUrl) return fallback;

    // data: URL -> serve bytes directly (best for crawlers)
    if (photoUrl.startsWith('data:')) {
      const parsed = dataUrlToBuffer(photoUrl);
      if (!parsed) return fallback;
      return new NextResponse(new Uint8Array(parsed.buf), {
        status: 200,
        headers: {
          'content-type': parsed.mime,
          'cache-control': 'public, max-age=3600, s-maxage=3600',
        },
      });
    }

    // Remote URL -> fetch and proxy bytes (keeps OG image stable)
    if (/^https?:\/\//i.test(photoUrl)) {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 7000);
      try {
        const imgRes = await fetch(photoUrl, { signal: controller.signal, cache: 'no-store' });
        if (!imgRes.ok) return fallback;
        const ct = imgRes.headers.get('content-type') || 'image/jpeg';
        const bytes = new Uint8Array(await imgRes.arrayBuffer());
        return new NextResponse(bytes, {
          status: 200,
          headers: {
            'content-type': ct,
            'cache-control': 'public, max-age=3600, s-maxage=3600',
          },
        });
      } finally {
        clearTimeout(t);
      }
    }

    return fallback;
  } catch {
    return fallback;
  }
}

