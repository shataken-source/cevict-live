import { NextRequest, NextResponse } from 'next/server';
import { verifyHmacSignature } from '../_lib/auth';
import { getSupabaseAdmin } from '../_lib/supabase';

export const runtime = 'nodejs';

type ConfirmBody = {
  id: string;
};

export async function POST(req: NextRequest) {
  const bodyText = await req.text();

  const okSig = verifyHmacSignature({
    signatureHeader: req.headers.get('x-signature'),
    timestampHeader: req.headers.get('x-timestamp'),
    bodyText,
  });

  if (!okSig) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: ConfirmBody;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body?.id || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('command_queue')
    .update({ confirmed: true })
    .eq('id', body.id)
    .select('id, confirmed, requires_confirmation, status')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, command: data }, { status: 200 });
}
