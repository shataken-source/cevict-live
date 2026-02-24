import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'Calmcast render is unavailable in this deployment.' },
    { status: 501 }
  );
}

export async function POST() {
  return NextResponse.json(
    { ok: false, error: 'Calmcast render is unavailable in this deployment.' },
    { status: 501 }
  );
}
