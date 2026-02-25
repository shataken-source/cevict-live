/**
 * Fishing Journal API
 * GET  /api/community/journal                          — list user's journal entries
 *   ?page=1&limit=20                                   — pagination
 *   ?entryId=...                                       — single entry with catches
 *   ?action=stats                                      — personal fishing statistics
 * POST /api/community/journal { action: 'create', tripDate, locationName, ... }
 * POST /api/community/journal { action: 'addCatch', entryId, species, size, weight, ... }
 * POST /api/community/journal { action: 'update', entryId, ... }
 * POST /api/community/journal { action: 'delete', entryId }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

const POINTS_FOR_ENTRY = 15;
const POINTS_FOR_CATCH = 5;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user, error: authError } = await getAuthedUser(req, res);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const admin = getSupabaseAdmin();
  const userId = user.id;

  // ── GET ──
  if (req.method === 'GET') {
    try {
      const action = String(req.query.action || 'list').toLowerCase();
      const entryId = String(req.query.entryId || '').trim();

      // ── Single entry with catches ──
      if (entryId) {
        const { data: entry, error } = await admin
          .from('fishing_journal_entries')
          .select('*')
          .eq('entry_id', entryId)
          .eq('user_id', userId)
          .single();

        if (error || !entry) return res.status(404).json({ error: 'Entry not found' });

        const { data: catches } = await admin
          .from('journal_catches')
          .select('*')
          .eq('entry_id', entryId)
          .order('caught_at', { ascending: false });

        return res.status(200).json({
          success: true,
          entry: { ...entry, catches: catches || [] },
        });
      }

      // ── Personal stats ──
      if (action === 'stats') {
        const { data: entries } = await admin
          .from('fishing_journal_entries')
          .select('entry_id, trip_date, total_fish_caught, total_hours, location_name')
          .eq('user_id', userId);

        const entryIds = (entries || []).map(e => e.entry_id);
        let catches: any[] = [];
        if (entryIds.length > 0) {
          const { data } = await admin
            .from('journal_catches')
            .select('species, size, weight, released, personal_record')
            .in('entry_id', entryIds);
          catches = data || [];
        }

        // Aggregate stats
        const totalTrips = (entries || []).length;
        const totalFish = (entries || []).reduce((sum, e) => sum + (e.total_fish_caught || 0), 0);
        const totalHours = (entries || []).reduce((sum, e) => sum + (e.total_hours || 0), 0);

        // Species breakdown
        const speciesCounts = new Map<string, number>();
        let biggestCatch = { species: '', weight: 0 };
        let personalRecords = 0;
        let totalReleased = 0;

        for (const c of catches) {
          speciesCounts.set(c.species, (speciesCounts.get(c.species) || 0) + 1);
          if (c.weight && c.weight > biggestCatch.weight) {
            biggestCatch = { species: c.species, weight: c.weight };
          }
          if (c.personal_record) personalRecords++;
          if (c.released) totalReleased++;
        }

        const topSpecies = Array.from(speciesCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([species, count]) => ({ species, count }));

        // Favorite location
        const locationCounts = new Map<string, number>();
        for (const e of (entries || [])) {
          if (e.location_name) {
            locationCounts.set(e.location_name, (locationCounts.get(e.location_name) || 0) + 1);
          }
        }
        const favoriteLocation = Array.from(locationCounts.entries())
          .sort((a, b) => b[1] - a[1])[0];

        return res.status(200).json({
          success: true,
          stats: {
            totalTrips,
            totalFish,
            totalCatches: catches.length,
            totalHours: Math.round(totalHours * 10) / 10,
            avgFishPerTrip: totalTrips > 0 ? Math.round((totalFish / totalTrips) * 10) / 10 : 0,
            avgHoursPerTrip: totalTrips > 0 ? Math.round((totalHours / totalTrips) * 10) / 10 : 0,
            biggestCatch: biggestCatch.weight > 0 ? biggestCatch : null,
            personalRecords,
            totalReleased,
            releaseRate: catches.length > 0 ? Math.round((totalReleased / catches.length) * 100) : 0,
            topSpecies,
            favoriteLocation: favoriteLocation ? { name: favoriteLocation[0], trips: favoriteLocation[1] } : null,
            uniqueSpecies: speciesCounts.size,
          },
        });
      }

      // ── List entries ──
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
      const offset = (page - 1) * limit;

      const { data: entries, error: listError } = await admin
        .from('fishing_journal_entries')
        .select('entry_id, trip_date, location_name, location_gps, weather_data, tide_stage, moon_phase, total_fish_caught, total_hours, notes, created_at')
        .eq('user_id', userId)
        .order('trip_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (listError) return res.status(500).json({ error: listError.message });

      return res.status(200).json({
        success: true,
        entries: entries || [],
        page,
        limit,
        hasMore: (entries || []).length === limit,
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  // ── POST ──
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action } = body;

      // ── Create journal entry ──
      if (action === 'create') {
        const { tripDate, tripStartTime, tripEndTime, locationName, locationGps,
                weatherData, tideStage, tideTime, moonPhase, moonPercentage,
                waterConditions, baitUsed, notes, companions } = body;

        if (!tripDate) return res.status(400).json({ error: 'tripDate required' });

        // Calculate total hours if start/end provided
        let totalHours: number | null = null;
        if (tripStartTime && tripEndTime) {
          const start = new Date(tripStartTime).getTime();
          const end = new Date(tripEndTime).getTime();
          if (end > start) {
            totalHours = Math.round(((end - start) / 3600000) * 100) / 100;
          }
        }

        const { data: entry, error: insertError } = await admin
          .from('fishing_journal_entries')
          .insert({
            user_id: userId,
            trip_date: tripDate,
            trip_start_time: tripStartTime || null,
            trip_end_time: tripEndTime || null,
            location_name: locationName || null,
            location_gps: locationGps || null,
            weather_data: weatherData || null,
            tide_stage: tideStage || null,
            tide_time: tideTime || null,
            moon_phase: moonPhase || null,
            moon_percentage: moonPercentage || null,
            water_conditions: waterConditions || null,
            bait_used: Array.isArray(baitUsed) ? baitUsed : null,
            notes: notes ? String(notes).slice(0, 5000) : null,
            companions: companions || null,
            total_hours: totalHours,
          })
          .select()
          .single();

        if (insertError) return res.status(500).json({ error: insertError.message });

        // Award points
        try {
          const { data: su } = await admin.from('shared_users').select('total_points').eq('id', userId).maybeSingle();
          if (su) {
            await admin.from('shared_users').update({ total_points: (su.total_points || 0) + POINTS_FOR_ENTRY }).eq('id', userId);
          }
          await admin.from('loyalty_transactions').insert({
            user_id: userId, points: POINTS_FOR_ENTRY, type: 'earned',
            description: `Journal entry: ${locationName || tripDate}`,
          });
        } catch { /* best-effort */ }

        return res.status(201).json({
          success: true,
          entry,
          pointsEarned: POINTS_FOR_ENTRY,
          message: 'Journal entry created! Add catches to earn more points.',
        });
      }

      // ── Add catch to entry ──
      if (action === 'addCatch') {
        const { entryId, species, size, weight, photoUrl, baitUsed, released, caughtAt } = body;
        if (!entryId) return res.status(400).json({ error: 'entryId required' });
        if (!species) return res.status(400).json({ error: 'species required' });

        // Verify entry belongs to user
        const { data: entry } = await admin
          .from('fishing_journal_entries')
          .select('entry_id, total_fish_caught')
          .eq('entry_id', entryId)
          .eq('user_id', userId)
          .single();

        if (!entry) return res.status(404).json({ error: 'Journal entry not found' });

        // Check if this is a personal record for this species
        let isPersonalRecord = false;
        if (weight) {
          const { data: previousBest } = await admin
            .from('journal_catches')
            .select('weight')
            .eq('species', species)
            .in('entry_id',
              (await admin
                .from('fishing_journal_entries')
                .select('entry_id')
                .eq('user_id', userId)
              ).data?.map((e: any) => e.entry_id) || []
            )
            .order('weight', { ascending: false })
            .limit(1)
            .maybeSingle();

          isPersonalRecord = !previousBest || weight > (previousBest.weight || 0);
        }

        const { data: catchRecord, error: catchError } = await admin
          .from('journal_catches')
          .insert({
            entry_id: entryId,
            species,
            size: size || null,
            weight: weight || null,
            photo_url: photoUrl || null,
            bait_used: baitUsed || null,
            released: released || false,
            personal_record: isPersonalRecord,
            caught_at: caughtAt || new Date().toISOString(),
          })
          .select()
          .single();

        if (catchError) return res.status(500).json({ error: catchError.message });

        // Update total fish count on entry
        await admin
          .from('fishing_journal_entries')
          .update({ total_fish_caught: (entry.total_fish_caught || 0) + 1, updated_at: new Date().toISOString() })
          .eq('entry_id', entryId);

        // Award points
        const catchPoints = POINTS_FOR_CATCH + (isPersonalRecord ? 25 : 0);
        try {
          const { data: su } = await admin.from('shared_users').select('total_points').eq('id', userId).maybeSingle();
          if (su) {
            await admin.from('shared_users').update({ total_points: (su.total_points || 0) + catchPoints }).eq('id', userId);
          }
          await admin.from('loyalty_transactions').insert({
            user_id: userId, points: catchPoints, type: 'earned',
            description: `Catch logged: ${species}${isPersonalRecord ? ' (NEW PERSONAL RECORD!)' : ''}`,
          });
        } catch { /* best-effort */ }

        return res.status(201).json({
          success: true,
          catch: catchRecord,
          personalRecord: isPersonalRecord,
          pointsEarned: catchPoints,
          message: isPersonalRecord
            ? `🏆 NEW PERSONAL RECORD! ${weight} lb ${species}! +${catchPoints} points!`
            : `Catch logged: ${species}. +${catchPoints} points.`,
        });
      }

      // ── Update entry ──
      if (action === 'update') {
        const { entryId, ...updates } = body;
        if (!entryId) return res.status(400).json({ error: 'entryId required' });

        const allowedFields = ['trip_date', 'trip_start_time', 'trip_end_time', 'location_name',
          'location_gps', 'weather_data', 'tide_stage', 'tide_time', 'moon_phase',
          'moon_percentage', 'water_conditions', 'bait_used', 'notes', 'companions', 'total_hours'];

        const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
        for (const [key, value] of Object.entries(updates)) {
          // Convert camelCase to snake_case
          const snakeKey = key.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
          if (allowedFields.includes(snakeKey) && value !== undefined) {
            dbUpdates[snakeKey] = value;
          }
        }

        if (Object.keys(dbUpdates).length <= 1) {
          return res.status(400).json({ error: 'No valid fields to update' });
        }

        const { error } = await admin
          .from('fishing_journal_entries')
          .update(dbUpdates)
          .eq('entry_id', entryId)
          .eq('user_id', userId);

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, message: 'Entry updated' });
      }

      // ── Delete entry ──
      if (action === 'delete') {
        const { entryId } = body;
        if (!entryId) return res.status(400).json({ error: 'entryId required' });

        const { error } = await admin
          .from('fishing_journal_entries')
          .delete()
          .eq('entry_id', entryId)
          .eq('user_id', userId);

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, message: 'Entry deleted' });
      }

      return res.status(400).json({ error: 'Invalid action. Use: create, addCatch, update, delete' });
    } catch (e: any) {
      console.error('[Journal] Error:', e);
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
