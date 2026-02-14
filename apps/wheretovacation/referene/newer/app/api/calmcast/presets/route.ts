import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'Calmcast presets are unavailable in this deployment.' },
    { status: 501 }
  );
}
