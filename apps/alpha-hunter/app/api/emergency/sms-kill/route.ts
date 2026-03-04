/**
 * SMS Kill Switch — POST /api/emergency/sms-kill
 *
 * Receives inbound SMS from Sinch webhook. Parses the message body for
 * commands like STOP, KILL, PAUSE, RESUME, STATUS.
 *
 * Flips a flag in Supabase `alpha_hunter_kill_switch` table.
 * The trade-cycle cron checks this flag before every execution.
 *
 * Sinch inbound webhook format (MO SMS):
 *   POST with JSON body: { from, to, body, ... }
 *   or form-encoded depending on Sinch config.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// ── Sinch MO (Mobile-Originated) SMS payload ────────────────────────────────
interface SinchInboundSMS {
  from?: string;
  to?: string;
  body?: string;
  // Sinch REST API v1 format
  type?: string;
  id?: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** Only accept commands from the owner's phone number */
function isOwnerPhone(from: string | undefined): boolean {
  if (!from) return false;
  const ownerNum = (process.env.MY_PERSONAL_NUMBER || '').replace(/[^\d]/g, '');
  const senderNum = from.replace(/[^\d]/g, '');
  if (!ownerNum || !senderNum) return false;
  // Match last 10 digits (ignore country code differences)
  return ownerNum.slice(-10) === senderNum.slice(-10);
}

type Command = 'stop' | 'resume' | 'status' | 'unknown';

function parseCommand(body: string): Command {
  const msg = (body || '').trim().toLowerCase();
  if (/^(stop|kill|halt|freeze|pause|emergency|shut\s*down)/.test(msg)) return 'stop';
  if (/^(resume|start|go|unpause|unfreeze|enable|restart)/.test(msg)) return 'resume';
  if (/^(status|state|check|ping|alive|health)/.test(msg)) return 'status';
  return 'unknown';
}

/** Send SMS reply via Sinch */
async function sendReply(to: string, message: string): Promise<void> {
  const apiToken = process.env.SINCH_API_TOKEN;
  const planId = process.env.SINCH_SERVICE_PLAN_ID;
  const from = (process.env.SINCH_FROM || '').replace(/[^\d]/g, '');
  if (!apiToken || !planId || !from) return;

  try {
    await fetch(`https://us.sms.api.sinch.com/xms/v1/${planId}/batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        from,
        to: [to.replace(/[^\d]/g, '')],
        body: message,
      }),
    });
  } catch (err) {
    console.error('[SMS-KILL] Failed to send reply:', err);
  }
}

// ── Supabase kill switch operations ─────────────────────────────────────────

async function setKillSwitch(active: boolean, reason: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const row = {
    id: 'alpha-hunter',
    active,
    reason,
    updated_at: new Date().toISOString(),
  };

  // Upsert: create or update
  const { error } = await sb
    .from('kill_switch')
    .upsert(row, { onConflict: 'id' });

  if (error) {
    console.error('[SMS-KILL] Supabase upsert error:', error.message);
    return false;
  }
  console.log(`[SMS-KILL] Kill switch ${active ? 'ACTIVATED' : 'DEACTIVATED'}: ${reason}`);
  return true;
}

async function getKillSwitchState(): Promise<{ active: boolean; reason?: string; updated_at?: string } | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from('kill_switch')
    .select('active, reason, updated_at')
    .eq('id', 'alpha-hunter')
    .single();

  if (error || !data) return null;
  return data;
}

// ── POST handler (Sinch inbound webhook) ────────────────────────────────────

export async function POST(req: NextRequest) {
  let payload: SinchInboundSMS;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const from = payload.from;
  const body = payload.body || '';

  console.log(`[SMS-KILL] Inbound SMS from ${from}: "${body}"`);

  // Verify sender is the owner
  if (!isOwnerPhone(from)) {
    console.warn(`[SMS-KILL] REJECTED — unknown sender: ${from}`);
    return NextResponse.json({ ok: true, ignored: true });
  }

  const command = parseCommand(body);

  switch (command) {
    case 'stop': {
      const ok = await setKillSwitch(true, `SMS kill: "${body}" at ${new Date().toISOString()}`);
      const reply = ok
        ? '🛑 ALPHA HUNTER STOPPED. All trading halted. Reply RESUME to restart.'
        : '❌ Failed to activate kill switch. Check Supabase.';
      await sendReply(from!, reply);
      return NextResponse.json({ ok, command: 'stop' });
    }

    case 'resume': {
      const ok = await setKillSwitch(false, `SMS resume: "${body}" at ${new Date().toISOString()}`);
      const reply = ok
        ? '✅ ALPHA HUNTER RESUMED. Trading re-enabled.'
        : '❌ Failed to deactivate kill switch. Check Supabase.';
      await sendReply(from!, reply);
      return NextResponse.json({ ok, command: 'resume' });
    }

    case 'status': {
      const state = await getKillSwitchState();
      const reply = state
        ? `📊 Alpha Hunter: ${state.active ? '🛑 STOPPED' : '✅ RUNNING'}\nReason: ${state.reason || 'none'}\nSince: ${state.updated_at || 'unknown'}`
        : '📊 Alpha Hunter: ✅ RUNNING (no kill switch record)';
      await sendReply(from!, reply);
      return NextResponse.json({ ok: true, command: 'status', state });
    }

    default: {
      await sendReply(from!, '❓ Unknown command. Reply: STOP, RESUME, or STATUS');
      return NextResponse.json({ ok: true, command: 'unknown' });
    }
  }
}

// ── GET handler (manual trigger / health check) ─────────────────────────────

export async function GET(req: NextRequest) {
  // Allow manual trigger with auth: GET /api/emergency/sms-kill?action=stop
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const cronSecret = process.env.CRON_SECRET;
  const adminPwd = process.env.ADMIN_PASSWORD;
  const authorized = !!(token && ((cronSecret && token === cronSecret) || (adminPwd && token === adminPwd)));

  if (!authorized) {
    // Unauthenticated: just return status
    const state = await getKillSwitchState();
    return NextResponse.json({
      status: state?.active ? 'stopped' : 'running',
      reason: state?.reason,
      updated_at: state?.updated_at,
    });
  }

  // Authenticated: allow action parameter
  const action = req.nextUrl.searchParams.get('action');
  if (action === 'stop') {
    const ok = await setKillSwitch(true, `Manual GET stop at ${new Date().toISOString()}`);
    return NextResponse.json({ ok, action: 'stop' });
  }
  if (action === 'resume') {
    const ok = await setKillSwitch(false, `Manual GET resume at ${new Date().toISOString()}`);
    return NextResponse.json({ ok, action: 'resume' });
  }

  const state = await getKillSwitchState();
  return NextResponse.json({
    status: state?.active ? 'stopped' : 'running',
    reason: state?.reason,
    updated_at: state?.updated_at,
    hint: 'Add ?action=stop or ?action=resume with Bearer auth to control',
  });
}
