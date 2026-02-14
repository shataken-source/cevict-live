/**
 * Captain Documents API
 * GET /api/captain/documents - List documents for authenticated captain
 * POST /api/captain/documents - Add document record (body: type, name, url, expiryDate?, status?)
 * DELETE /api/captain/documents?id=... - Delete document record
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../../_lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { user, error: authError } = await getAuthedUser(req, res);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const admin = getSupabaseAdmin();
  const { data: captainProfile } = await admin
    .from('captain_profiles')
    .select('id, user_id')
    .eq('user_id', user.id)
    .single();
  if (!captainProfile) return res.status(403).json({ error: 'User is not a captain' });

  const captainId = user.id; // captain_documents.captain_id is auth user id in existing code

  if (req.method === 'GET') {
    try {
      const { data, error } = await admin
        .from('captain_documents')
        .select('id, type, name, url, status, expiry_date, uploaded_at, last_reminder_sent_at')
        .eq('captain_id', captainId)
        .order('uploaded_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, documents: data ?? [] });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { type, name, url, expiryDate, status } = body;
      if (!type || !name || !url) return res.status(400).json({ error: 'type, name, url required' });

      const { data, error } = await admin
        .from('captain_documents')
        .insert({
          captain_id: captainId,
          type,
          name,
          url,
          expiry_date: expiryDate || null,
          status: status || 'pending',
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ success: true, document: data });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'id required' });
    try {
      const { error } = await admin
        .from('captain_documents')
        .delete()
        .eq('id', id)
        .eq('captain_id', captainId);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ error: 'Method not allowed' });
}
