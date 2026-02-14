import crypto from 'crypto';

export function getCommandQueueSecret(): string {
  return process.env.COMMAND_QUEUE_SECRET || '';
}

export function verifyHmacSignature(params: {
  signatureHeader: string | null;
  timestampHeader: string | null;
  bodyText: string;
}): boolean {
  const secret = getCommandQueueSecret();
  if (!secret) return false;

  const sig = params.signatureHeader || '';
  const ts = params.timestampHeader || '';
  if (!sig || !ts) return false;

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return false;

  const now = Date.now();
  const ageMs = Math.abs(now - tsNum);
  if (ageMs > 5 * 60 * 1000) return false;

  const payload = `${ts}.${params.bodyText}`;
  const digest = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');

  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(digest, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
