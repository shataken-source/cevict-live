/**
 * Catch of the Day API
 * GET  /api/community/catch-of-the-day                — today's featured catch
 * POST /api/community/catch-of-the-day { action: 'submit', ... } — submit a catch
 * POST /api/community/catch-of-the-day { action: 'vote', catchDayId } — vote
 *
 * Auto-selects the biggest/best catch each day. Users earn points for submissions.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = getSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);

  // ── GET: today's featured catch ──
  if (req.method === 'GET') {
    try {
      const date = String(req.query.date || today).trim();

      // Get featured catch for the date
      const { data: featured } = await admin
        .from('catch_of_the_day')
        .select('id, featured_date, user_id, species, weight_lbs, photo_url, location, description, votes, shares')
        .eq('featured_date', date)
        .maybeSingle();

      // If no featured catch yet, auto-select from today's submissions
      if (!featured) {
        const { data: topSubmission } = await admin
          .from('catch_submissions')
          .select('*')
          .eq('submitted_date', date)
          .order('weight_lbs', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        if (topSubmission) {
          // Auto-feature this catch
          const { data: newFeatured } = await admin
            .from('catch_of_the_day')
            .upsert({
              featured_date: date,
              catch_id: topSubmission.id,
              user_id: topSubmission.user_id,
              species: topSubmission.species,
              weight_lbs: topSubmission.weight_lbs,
              photo_url: topSubmission.photo_url,
              location: topSubmission.location,
              description: topSubmission.notes,
            }, { onConflict: 'featured_date' })
            .select()
            .single();

          return res.status(200).json({ success: true, catchOfTheDay: newFeatured, source: 'auto_selected' });
        }

        return res.status(200).json({ success: true, catchOfTheDay: null, message: 'No catches submitted yet today. Be the first!' });
      }

      // Get recent submissions for the day (runners up)
      const { data: submissions } = await admin
        .from('catch_submissions')
        .select('id, user_id, species, weight_lbs, photo_url, location, created_at')
        .eq('submitted_date', date)
        .order('weight_lbs', { ascending: false, nullsFirst: false })
        .limit(5);

      return res.status(200).json({
        success: true,
        catchOfTheDay: featured,
        runnersUp: (submissions || []).filter(s => s.user_id !== featured.user_id).slice(0, 3),
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  // ── POST: submit catch or vote ──
  if (req.method === 'POST') {
    const { user, error: authError } = await getAuthedUser(req, res);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action } = body;

      // ── Submit a catch ──
      if (action === 'submit') {
        const { species, weightLbs, lengthInches, photoUrl, location, lat, lon, baitUsed, notes } = body;
        if (!species || !photoUrl) {
          return res.status(400).json({ error: 'species and photoUrl are required' });
        }

        const { data: submission, error: subError } = await admin
          .from('catch_submissions')
          .insert({
            user_id: user.id,
            species,
            weight_lbs: weightLbs || null,
            length_inches: lengthInches || null,
            photo_url: photoUrl,
            location: location || null,
            lat: lat || null,
            lon: lon || null,
            bait_used: baitUsed || null,
            notes: notes || null,
            submitted_date: today,
            points_awarded: 25,
          })
          .select()
          .single();

        if (subError) return res.status(500).json({ error: subError.message });

        // Award 25 points for catch submission
        try {
          const { data: su } = await admin.from('shared_users').select('total_points').eq('id', user.id).maybeSingle();
          if (su) {
            await admin.from('shared_users').update({ total_points: (su.total_points || 0) + 25 }).eq('id', user.id);
          }
          await admin.from('loyalty_transactions').insert({
            user_id: user.id, points: 25, type: 'earned', description: `Catch submission: ${species}`,
          });
        } catch { /* best-effort */ }

        return res.status(201).json({
          success: true,
          submission,
          pointsEarned: 25,
          message: `Catch submitted! +25 points. ${weightLbs ? `${weightLbs} lb ${species}` : species} is in the running for Catch of the Day!`,
        });
      }

      // ── Vote for catch of the day ──
      if (action === 'vote') {
        const { catchDayId } = body;
        if (!catchDayId) return res.status(400).json({ error: 'catchDayId required' });

        // Check not voting for own catch
        const { data: cotd } = await admin
          .from('catch_of_the_day')
          .select('user_id')
          .eq('id', catchDayId)
          .single();

        if (cotd?.user_id === user.id) {
          return res.status(400).json({ error: 'Cannot vote for your own catch' });
        }

        // Upsert vote (one per user per catch)
        const { error: voteError } = await admin
          .from('catch_of_the_day_votes')
          .upsert({ catch_day_id: catchDayId, user_id: user.id }, { onConflict: 'catch_day_id,user_id' });

        if (voteError) return res.status(500).json({ error: voteError.message });

        // Update vote count
        const { count } = await admin
          .from('catch_of_the_day_votes')
          .select('id', { count: 'exact', head: true })
          .eq('catch_day_id', catchDayId);

        await admin
          .from('catch_of_the_day')
          .update({ votes: count || 0 })
          .eq('id', catchDayId);

        return res.status(200).json({ success: true, votes: count || 0 });
      }

      return res.status(400).json({ error: 'Invalid action. Use: submit, vote' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
