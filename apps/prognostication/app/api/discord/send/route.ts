import { NextRequest, NextResponse } from 'next/server';
import { sendToDiscord } from '@/lib/discord';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : undefined;

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'message is required' },
        { status: 400 }
      );
    }

    const result = await sendToDiscord(message, { title });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.includes('not configured') ? 503 : 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message ?? 'Internal error' },
      { status: 500 }
    );
  }
}
