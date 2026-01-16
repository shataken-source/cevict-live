import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const data = (request.nextUrl.searchParams.get('data') || '').trim();
  if (!data) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

  // Avoid very large payloads
  if (data.length > 2000) return NextResponse.json({ error: 'Data too long' }, { status: 400 });

  try {
    const png = await QRCode.toBuffer(data, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 240,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
    // NextResponse body expects a web BodyInit type; convert Node Buffer -> Uint8Array
    const bytes = new Uint8Array(png);
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to generate QR' }, { status: 500 });
  }
}

