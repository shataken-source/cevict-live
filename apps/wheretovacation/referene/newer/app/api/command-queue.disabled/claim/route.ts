import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../_lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const agentToken = process.env.COMMAND_QUEUE_AGENT_TOKEN || '';
  const provided = req.headers.get('x-agent-token') || '';
  const agentId = req.headers.get('x-agent-id') || 'agent';

  if (!agentToken || provided !== agentToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const limit = typeof body?.limit === 'number' && body.limit > 0 && body.limit <= 5 ? body.limit : 1;

  const { data: rows, error: selectError } = await supabase
    .from('command_queue')
    .select('id, action, params, requires_confirmation, confirmed')
    .eq('status', 'queued')
    .eq('confirmed', true)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ success: true, commands: [] }, { status: 200 });
  }

  const claimed: any[] = [];

  for (const row of rows) {
    const { data, error } = await supabase
      .from('command_queue')
      .update({ status: 'claimed', claimed_by: agentId, claimed_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('status', 'queued')
      .select('id, action, params, status')
      .single();

    if (!error && data) {
      claimed.push(data);
    }
  }

  return NextResponse.json({ success: true, commands: claimed }, { status: 200 });
}
