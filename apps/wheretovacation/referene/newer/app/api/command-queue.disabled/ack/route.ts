import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../_lib/supabase';

export const runtime = 'nodejs';

type AckBody = {
  id: string;
  ok: boolean;
  result?: Record<string, unknown>;
  error?: string;
};

export async function POST(req: NextRequest) {
  const agentToken = process.env.COMMAND_QUEUE_AGENT_TOKEN || '';
  const provided = req.headers.get('x-agent-token') || '';

  if (!agentToken || provided !== agentToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as AckBody | null;
  if (!body || typeof body.id !== 'string' || typeof body.ok !== 'boolean') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const status = body.ok ? 'completed' : 'failed';

  const { data, error } = await supabase
    .from('command_queue')
    .update({
      status,
      completed_at: new Date().toISOString(),
      result: body.result ?? null,
      error: body.ok ? null : body.error || 'Unknown error',
    })
    .eq('id', body.id)
    .select('id, status')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, command: data }, { status: 200 });
}
