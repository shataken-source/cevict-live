import { NextRequest, NextResponse } from 'next/server';
import { verifyHmacSignature } from '../_lib/auth';
import { getSupabaseAdmin } from '../_lib/supabase';

export const runtime = 'nodejs';

type EnqueueBody = {
  action: 'restart_dev_server' | 'build_app' | 'scaffold_project';
  params?: Record<string, unknown>;
  requestedBy?: string;
  requiresConfirmation?: boolean;
};

function validate(body: any): { ok: boolean; error?: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid body' };
  if (typeof body.action !== 'string') return { ok: false, error: 'Missing action' };

  const allowed = ['restart_dev_server', 'build_app', 'scaffold_project'];
  if (!allowed.includes(body.action)) return { ok: false, error: 'Action not allowed' };

  if (body.params != null && typeof body.params !== 'object') {
    return { ok: false, error: 'params must be an object' };
  }

  if (body.requestedBy != null && typeof body.requestedBy !== 'string') {
    return { ok: false, error: 'requestedBy must be a string' };
  }

  if (body.requiresConfirmation != null && typeof body.requiresConfirmation !== 'boolean') {
    return { ok: false, error: 'requiresConfirmation must be a boolean' };
  }

  return { ok: true };
}

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

  let body: EnqueueBody;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = validate(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const requiresConfirmation = Boolean(body.requiresConfirmation);
  const confirmed = !requiresConfirmation;

  const { data, error } = await supabase
    .from('command_queue')
    .insert({
      action: body.action,
      params: body.params ?? null,
      status: 'queued',
      requested_by: body.requestedBy ?? null,
      requires_confirmation: requiresConfirmation,
      confirmed,
    })
    .select('id, status, requires_confirmation, confirmed')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, command: data }, { status: 200 });
}
