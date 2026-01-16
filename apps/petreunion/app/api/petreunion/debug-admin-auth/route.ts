import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminPasswordCandidates } from '@/lib/admin-password';
import { isAdminAuthed } from '@/lib/admin-auth';

function timingSafeEquals(a: string, b: string): boolean {
  // Best-effort constant-time compare when lengths match
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return a === b;
  try {
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return a === b;
  }
}

export async function GET(request: NextRequest) {
  const candidates = getAdminPasswordCandidates();
  const headerKey = (request.headers.get('x-admin-key') || '').trim();

  let headerMatched = false;
  if (headerKey) {
    headerMatched = candidates.some((c) => timingSafeEquals(headerKey, c));
  }

  const cookieToken = request.cookies.get('petreunion_admin')?.value || '';
  let cookieMatched = false;
  if (cookieToken) {
    cookieMatched = candidates.some((c) => {
      const expected = crypto.createHmac('sha256', c).update('petreunion-admin').digest('hex');
      return expected === cookieToken;
    });
  }

  return NextResponse.json({
    ok: true,
    received: {
      x_admin_key_present: Boolean(headerKey),
      x_admin_key_len: headerKey.length,
      cookie_present: Boolean(cookieToken),
      cookie_len: cookieToken.length,
    },
    matched: {
      header: headerMatched,
      cookie: cookieMatched,
    },
    isAdminAuthed: isAdminAuthed(request),
    configured: {
      candidate_count: candidates.length,
      candidate_lens: candidates.map((c) => c.length),
    },
  });
}

