import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { getAdminPasswordCandidates } from '@/lib/admin-password';

const COOKIE_NAME = 'petreunion_admin';

export function isAdminAuthed(request: NextRequest): boolean {
  const candidates = getAdminPasswordCandidates();
  if (!candidates.length) return false;

  // Allow server-to-server / CLI calls (PowerShell, cron) to authenticate without cookies.
  const headerKey = (request.headers.get('x-admin-key') || '').trim();
  if (headerKey) {
    for (const candidate of candidates) {
      // Best-effort constant-time compare
      const a = Buffer.from(headerKey);
      const b = Buffer.from(candidate);
      if (a.length === b.length) {
        try {
          if (crypto.timingSafeEqual(a, b)) return true;
        } catch {
          // ignore
        }
      } else {
        // Fallback for different lengths
        if (headerKey === candidate) return true;
      }
    }
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;

  for (const candidate of candidates) {
    const expected = crypto.createHmac('sha256', candidate).update('petreunion-admin').digest('hex');
    if (token === expected) return true;
  }
  return false;
}

