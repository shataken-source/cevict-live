import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { user } = await getAuthedUser(req, res);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('profiles').select('id, role').eq('user_id', user.id).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data?.id) return res.status(404).json({ error: 'Profile not found' });

  return res.status(200).json({ profileId: data.id, role: data.role || 'user' });
}

