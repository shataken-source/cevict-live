import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    { ok: false, error: 'Calmcast engine is unavailable in this deployment.' },
    { status: 501 }
  );
}
