import { NextResponse } from 'next/server';

type ApiErrorBody = {
  error: string;
  code: string;
  retryAfterSeconds?: number;
};

function normalizeMessage(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function toServiceUnavailableResponse(input: unknown) {
  const message = normalizeMessage((input as any)?.message ?? input).toLowerCase();

  const retryAfterSeconds = 300;

  const isQuota =
    message.includes('quota') ||
    message.includes('credits') ||
    message.includes('exceeded') ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('resource is limited') ||
    message.includes('billing');

  const isTimeout =
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('etimedout') ||
    message.includes('fetch failed') ||
    message.includes('network');

  if (!isQuota && !isTimeout) return null;

  const body: ApiErrorBody = {
    error: isQuota
      ? 'Service temporarily unavailable (quota/credits exceeded). Please try again later.'
      : 'Service temporarily unavailable. Please try again later.',
    code: isQuota ? 'SERVICE_QUOTA_EXCEEDED' : 'SERVICE_UNAVAILABLE',
    retryAfterSeconds,
  };

  return NextResponse.json(body, {
    status: isQuota ? 429 : 503,
    headers: {
      'Retry-After': String(retryAfterSeconds),
    },
  });
}

export function toDatabaseNotConfiguredResponse() {
  return NextResponse.json(
    {
      error: 'Database not configured',
      code: 'DB_NOT_CONFIGURED',
    },
    { status: 500 }
  );
}
