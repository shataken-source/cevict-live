/**
 * Captain Add-ons API (fuel, tackle, catering, etc.)
 * GET /api/captain/addons - List add-ons for authenticated captain
 * POST /api/captain/addons - Create add-on (body: name, description?, price, category?)
 * PUT /api/captain/addons - Update add-on (body: id, name?, description?, price?, category?, is_active?)
 * DELETE /api/captain/addons?id=... - Delete add-on
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
  const captainId = captainProfile.id;

  if (req.method === 'GET') {
    try {
      const { data, error } = await admin
        .from('captain_addons')
        .select('id, name, description, price, category, is_active, sort_order, created_at')
        .eq('captain_id', captainId)
        .order('sort_order')
        .order('name');

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, addons: data ?? [] });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { name, description, price, category } = body;
      if (!name || price == null) return res.status(400).json({ error: 'name and price required' });
      const cat = category || 'other';
      const validCategories = ['food', 'beverage', 'equipment', 'fuel', 'tackle', 'license', 'other'];
      const categoryVal = validCategories.includes(cat) ? cat : 'other';

      const { data, error } = await admin
        .from('captain_addons')
        .insert({
          captain_id: captainId,
          name: String(name).trim(),
          description: description != null ? String(description).trim() : null,
          price: Number(price),
          category: categoryVal,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ success: true, addon: data });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { id, name, description, price, category, is_active } = body;
      if (!id) return res.status(400).json({ error: 'id required' });
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (name !== undefined) updates.name = String(name).trim();
      if (description !== undefined) updates.description = description == null ? null : String(description).trim();
      if (price !== undefined) updates.price = Number(price);
      if (category !== undefined) {
        const valid = ['food', 'beverage', 'equipment', 'fuel', 'tackle', 'license', 'other'];
        updates.category = valid.includes(category) ? category : 'other';
      }
      if (is_active !== undefined) updates.is_active = Boolean(is_active);

      const { data, error } = await admin
        .from('captain_addons')
        .update(updates)
        .eq('id', id)
        .eq('captain_id', captainId)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, addon: data });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'id required' });
    try {
      const { error } = await admin
        .from('captain_addons')
        .delete()
        .eq('id', id)
        .eq('captain_id', captainId);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return res.status(405).json({ error: 'Method not allowed' });
}
