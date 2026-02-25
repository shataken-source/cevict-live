/**
 * Avatar System API
 * GET  /api/avatar                          — get current user's avatar + inventory
 * GET  /api/avatar?action=shop              — browse shop items
 * POST /api/avatar  { action: 'update', ... }    — update avatar appearance
 * POST /api/avatar  { action: 'purchase', itemId } — buy shop item with points
 * POST /api/avatar  { action: 'equip', itemId, slot } — equip owned item
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

const VALID_SLOTS = ['hat', 'glasses', 'accessory', 'clothing', 'background'] as const;
const MAX_PURCHASES_PER_MINUTE = 10;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user, error: authError } = await getAuthedUser(req, res);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const admin = getSupabaseAdmin();
  const userId = user.id;

  // ── GET ──
  if (req.method === 'GET') {
    try {
      const action = String(req.query.action || 'profile').toLowerCase();

      if (action === 'shop') {
        const category = String(req.query.category || '').trim();
        let query = admin
          .from('avatar_shop_items')
          .select('id, name, description, category, subcategory, image_url, preview_url, price_points, rarity, is_seasonal, season')
          .eq('is_active', true)
          .order('display_order');

        if (category) query = query.eq('category', category);

        const { data: items, error } = await query;
        if (error) return res.status(500).json({ error: error.message });

        // Get user's owned items to mark as owned
        const { data: inventory } = await admin
          .from('user_avatar_inventory')
          .select('item_id')
          .eq('user_id', userId);
        const ownedSet = new Set((inventory || []).map(i => i.item_id));

        const itemsWithOwnership = (items || []).map(item => ({
          ...item,
          owned: ownedSet.has(item.id),
        }));

        // Log shop view
        await admin.from('avatar_analytics').insert({
          user_id: userId, event_type: 'shop_viewed', event_data: { category: category || 'all' },
        });

        res.setHeader('Cache-Control', 'private, s-maxage=300');
        return res.status(200).json({ success: true, items: itemsWithOwnership });
      }

      // Default: get user's avatar + inventory
      let { data: avatar } = await admin
        .from('user_avatars')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Auto-create avatar if none exists
      if (!avatar) {
        const { data: newAvatar } = await admin
          .from('user_avatars')
          .insert({ user_id: userId })
          .select()
          .single();
        avatar = newAvatar;
      }

      // Get inventory with item details
      const { data: inventory } = await admin
        .from('user_avatar_inventory')
        .select('id, item_id, is_equipped, purchased_at, avatar_shop_items(name, category, subcategory, image_url, rarity)')
        .eq('user_id', userId);

      // Get user's points from shared_users or loyalty system
      let points = 0;
      const { data: sharedUser } = await admin
        .from('shared_users')
        .select('total_points')
        .eq('id', userId)
        .maybeSingle();
      if (sharedUser) points = sharedUser.total_points || 0;

      return res.status(200).json({
        success: true,
        avatar,
        inventory: inventory || [],
        points,
      });
    } catch (e: any) {
      console.error('[Avatar] GET error:', e);
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  // ── POST ──
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action } = body;

      // ── Update avatar appearance ──
      if (action === 'update') {
        const allowedFields = ['sex', 'skin_color', 'hair_style', 'hair_color', 'body_type', 'background_color'];
        const updates: Record<string, any> = { updated_at: new Date().toISOString() };

        for (const field of allowedFields) {
          if (body[field] !== undefined && typeof body[field] === 'string') {
            updates[field] = body[field].slice(0, 50); // Limit length
          }
        }

        if (Object.keys(updates).length <= 1) {
          return res.status(400).json({ error: 'No valid fields to update' });
        }

        const { data, error } = await admin
          .from('user_avatars')
          .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });

        // Log analytics
        await admin.from('avatar_analytics').insert({
          user_id: userId, event_type: 'avatar_updated', event_data: updates,
        });

        return res.status(200).json({ success: true, avatar: data });
      }

      // ── Purchase item ──
      if (action === 'purchase') {
        const { itemId } = body;
        if (!itemId) return res.status(400).json({ error: 'itemId required' });

        // Rate limiting: check recent purchases
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
        const { count: recentCount } = await admin
          .from('avatar_purchase_log')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', oneMinuteAgo);

        if ((recentCount || 0) >= MAX_PURCHASES_PER_MINUTE) {
          return res.status(429).json({ error: 'Rate limit exceeded. Max 10 purchases per minute.' });
        }

        // Get item
        const { data: item } = await admin
          .from('avatar_shop_items')
          .select('id, name, price_points, category, is_active')
          .eq('id', itemId)
          .single();

        if (!item || !item.is_active) {
          return res.status(404).json({ error: 'Item not found or inactive' });
        }

        // Check if already owned
        const { data: existing } = await admin
          .from('user_avatar_inventory')
          .select('id')
          .eq('user_id', userId)
          .eq('item_id', itemId)
          .maybeSingle();

        if (existing) {
          return res.status(400).json({ error: 'You already own this item' });
        }

        // Check points balance
        const { data: sharedUser } = await admin
          .from('shared_users')
          .select('total_points')
          .eq('id', userId)
          .maybeSingle();

        const currentPoints = sharedUser?.total_points || 0;
        if (currentPoints < item.price_points) {
          return res.status(400).json({
            error: 'Insufficient points',
            required: item.price_points,
            current: currentPoints,
          });
        }

        // Deduct points
        const { error: pointsError } = await admin
          .from('shared_users')
          .update({ total_points: currentPoints - item.price_points })
          .eq('id', userId);

        if (pointsError) return res.status(500).json({ error: 'Failed to deduct points' });

        // Add to inventory
        const { error: invError } = await admin
          .from('user_avatar_inventory')
          .insert({ user_id: userId, item_id: itemId });

        if (invError) {
          // Refund points if inventory insert fails
          await admin.from('shared_users').update({ total_points: currentPoints }).eq('id', userId);
          return res.status(500).json({ error: 'Failed to add item to inventory' });
        }

        // Log purchase
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
        const ua = req.headers['user-agent'] || '';
        await admin.from('avatar_purchase_log').insert({
          user_id: userId,
          item_id: itemId,
          points_spent: item.price_points,
          ip_address: typeof ip === 'string' ? ip.split(',')[0].trim() : '',
          user_agent: typeof ua === 'string' ? ua.slice(0, 255) : '',
        });

        // Analytics
        await admin.from('avatar_analytics').insert({
          user_id: userId, event_type: 'item_purchased',
          event_data: { item_id: itemId, item_name: item.name, points_spent: item.price_points },
        });

        return res.status(200).json({
          success: true,
          item: item.name,
          pointsSpent: item.price_points,
          remainingPoints: currentPoints - item.price_points,
        });
      }

      // ── Equip item ──
      if (action === 'equip') {
        const { itemId } = body;
        if (!itemId) return res.status(400).json({ error: 'itemId required' });

        // Verify ownership
        const { data: invItem } = await admin
          .from('user_avatar_inventory')
          .select('id, item_id')
          .eq('user_id', userId)
          .eq('item_id', itemId)
          .maybeSingle();

        if (!invItem) return res.status(404).json({ error: 'Item not in your inventory' });

        // Get item category to determine slot
        const { data: shopItem } = await admin
          .from('avatar_shop_items')
          .select('category')
          .eq('id', itemId)
          .single();

        if (!shopItem) return res.status(404).json({ error: 'Shop item not found' });

        const slot = shopItem.category as typeof VALID_SLOTS[number];
        if (!VALID_SLOTS.includes(slot)) {
          return res.status(400).json({ error: 'Invalid item category for equipping' });
        }

        // Unequip current item in this slot only (not all slots)
        const slotField = `equipped_${slot}`;

        // Get all item IDs in this category to only unequip same-slot items
        const { data: sameSlotItems } = await admin
          .from('avatar_shop_items')
          .select('id')
          .eq('category', slot);
        const sameSlotIds = (sameSlotItems || []).map(i => i.id);

        if (sameSlotIds.length > 0) {
          await admin
            .from('user_avatar_inventory')
            .update({ is_equipped: false })
            .eq('user_id', userId)
            .eq('is_equipped', true)
            .in('item_id', sameSlotIds);
        }

        // Equip new item
        await admin
          .from('user_avatar_inventory')
          .update({ is_equipped: true })
          .eq('id', invItem.id);

        // Update avatar record
        await admin
          .from('user_avatars')
          .upsert({
            user_id: userId,
            [slotField]: itemId,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        // Analytics
        await admin.from('avatar_analytics').insert({
          user_id: userId, event_type: 'item_equipped',
          event_data: { item_id: itemId, slot },
        });

        return res.status(200).json({ success: true, equipped: { slot, itemId } });
      }

      return res.status(400).json({ error: 'Invalid action. Use: update, purchase, equip' });
    } catch (e: any) {
      console.error('[Avatar] POST error:', e);
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
