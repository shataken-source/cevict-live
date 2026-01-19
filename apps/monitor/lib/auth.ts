import type { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export type AuthedUser = {
  id: string;
  email: string | null;
};

function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function requireUser(request: NextRequest): Promise<AuthedUser> {
  const token = getBearerToken(request);
  if (!token) throw new Error('UNAUTHORIZED');

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) throw new Error('UNAUTHORIZED');

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}

