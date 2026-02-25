/**
 * Fishing Buddy Matching API
 * GET  /api/community/buddies                              — get own buddy profile + matches
 * GET  /api/community/buddies?action=search&species=redfish&level=intermediate  — search buddies
 * GET  /api/community/buddies?action=matches               — view pending/accepted matches
 * POST /api/community/buddies { action: 'createProfile', experienceLevel, targetSpecies, fishingStyle, ... }
 * POST /api/community/buddies { action: 'updateProfile', ... }
 * POST /api/community/buddies { action: 'respondMatch', matchId, response: 'accepted'|'rejected' }
 * POST /api/community/buddies { action: 'rate', ratedUserId, tripId, rating, comment }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

const POINTS_FOR_PROFILE = 20;
const POINTS_FOR_MATCH_ACCEPTED = 10;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { user, error: authError } = await getAuthedUser(req, res);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const admin = getSupabaseAdmin();
  const userId = user.id;

  // ── GET ──
  if (req.method === 'GET') {
    try {
      const action = String(req.query.action || 'profile').toLowerCase();

      // ── Search buddies ──
      if (action === 'search') {
        const species = String(req.query.species || '').trim().toLowerCase();
        const level = String(req.query.level || '').trim().toLowerCase();
        const style = String(req.query.style || '').trim().toLowerCase();
        const boat = String(req.query.boat || '').trim().toLowerCase();
        const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

        let query = admin
          .from('buddy_profiles')
          .select('profile_id, user_id, experience_level, target_species, fishing_style, home_waters, boat_ownership, bio, verified, rating_average, total_ratings, created_at')
          .neq('user_id', userId)
          .limit(limit);

        if (level && ['beginner', 'intermediate', 'advanced', 'expert'].includes(level)) {
          query = query.eq('experience_level', level);
        }
        if (boat && ['have_boat', 'need_ride', 'either'].includes(boat)) {
          query = query.eq('boat_ownership', boat);
        }

        const { data: profiles, error } = await query;
        if (error) return res.status(500).json({ error: error.message });

        // Filter by species/style in JS since they're arrays
        let filtered = profiles || [];
        if (species) {
          filtered = filtered.filter(p =>
            (p.target_species || []).some((s: string) => s.toLowerCase().includes(species))
          );
        }
        if (style) {
          filtered = filtered.filter(p =>
            (p.fishing_style || []).some((s: string) => s.toLowerCase().includes(style))
          );
        }

        // Get display names
        const profileUserIds = filtered.map(p => p.user_id);
        let userMap = new Map<string, any>();
        if (profileUserIds.length > 0) {
          const { data: users } = await admin
            .from('shared_users')
            .select('id, display_name, avatar_url')
            .in('id', profileUserIds);
          userMap = new Map((users || []).map(u => [u.id, u]));
        }

        // Check existing connections/matches
        const { data: existingMatches } = await admin
          .from('buddy_matches')
          .select('matched_user_id, status')
          .eq('user_id', userId);
        const matchStatusMap = new Map((existingMatches || []).map(m => [m.matched_user_id, m.status]));

        const enriched = filtered.map(p => {
          const u = userMap.get(p.user_id);
          return {
            ...p,
            displayName: u?.display_name || `Angler ${p.user_id.slice(0, 6)}`,
            avatarUrl: u?.avatar_url || null,
            matchStatus: matchStatusMap.get(p.user_id) || null,
          };
        });

        return res.status(200).json({ success: true, buddies: enriched });
      }

      // ── View matches ──
      if (action === 'matches') {
        const { data: outgoing } = await admin
          .from('buddy_matches')
          .select('match_id, matched_user_id, match_score, match_reasons, status, created_at')
          .eq('user_id', userId);

        const { data: incoming } = await admin
          .from('buddy_matches')
          .select('match_id, user_id, match_score, match_reasons, status, created_at')
          .eq('matched_user_id', userId);

        const allUserIds = new Set([
          ...(outgoing || []).map(m => m.matched_user_id),
          ...(incoming || []).map(m => m.user_id),
        ]);

        let userMap = new Map<string, any>();
        if (allUserIds.size > 0) {
          const { data: users } = await admin
            .from('shared_users')
            .select('id, display_name, avatar_url')
            .in('id', [...allUserIds]);
          userMap = new Map((users || []).map(u => [u.id, u]));
        }

        const enrichUser = (id: string) => {
          const u = userMap.get(id);
          return { userId: id, displayName: u?.display_name || `Angler ${id.slice(0, 6)}`, avatarUrl: u?.avatar_url || null };
        };

        const pendingReceived = (incoming || [])
          .filter(m => m.status === 'pending')
          .map(m => ({ matchId: m.match_id, user: enrichUser(m.user_id), matchScore: m.match_score, matchReasons: m.match_reasons, since: m.created_at }));

        const pendingSent = (outgoing || [])
          .filter(m => m.status === 'pending')
          .map(m => ({ matchId: m.match_id, user: enrichUser(m.matched_user_id), matchScore: m.match_score, since: m.created_at }));

        const accepted = [
          ...(outgoing || []).filter(m => m.status === 'accepted').map(m => ({ matchId: m.match_id, user: enrichUser(m.matched_user_id), since: m.created_at })),
          ...(incoming || []).filter(m => m.status === 'accepted').map(m => ({ matchId: m.match_id, user: enrichUser(m.user_id), since: m.created_at })),
        ];

        return res.status(200).json({
          success: true,
          pendingReceived,
          pendingSent,
          accepted,
          stats: { pendingCount: pendingReceived.length, buddyCount: accepted.length },
        });
      }

      // ── Get own profile ──
      const { data: profile } = await admin
        .from('buddy_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profile) {
        return res.status(200).json({
          success: true,
          profile: null,
          message: 'No buddy profile yet. Create one to start matching!',
        });
      }

      return res.status(200).json({ success: true, profile });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  // ── POST ──
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action } = body;

      // ── Create buddy profile ──
      if (action === 'createProfile') {
        const { experienceLevel, targetSpecies, fishingStyle, homeWaters, availabilityCalendar, boatOwnership, bio } = body;

        if (!experienceLevel || !['beginner', 'intermediate', 'advanced', 'expert'].includes(experienceLevel)) {
          return res.status(400).json({ error: 'experienceLevel must be: beginner, intermediate, advanced, expert' });
        }
        if (!fishingStyle || !Array.isArray(fishingStyle) || fishingStyle.length === 0) {
          return res.status(400).json({ error: 'fishingStyle array required (e.g. ["shore", "boat"])' });
        }

        // Check if profile already exists
        const { data: existing } = await admin
          .from('buddy_profiles')
          .select('profile_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existing) return res.status(400).json({ error: 'Buddy profile already exists. Use updateProfile instead.' });

        const { data: profile, error: profileError } = await admin
          .from('buddy_profiles')
          .insert({
            user_id: userId,
            experience_level: experienceLevel,
            target_species: Array.isArray(targetSpecies) ? targetSpecies.slice(0, 20) : null,
            fishing_style: fishingStyle.slice(0, 10),
            home_waters: homeWaters || null,
            availability_calendar: availabilityCalendar || null,
            boat_ownership: boatOwnership || 'either',
            bio: bio ? String(bio).slice(0, 500) : null,
          })
          .select()
          .single();

        if (profileError) return res.status(500).json({ error: profileError.message });

        // Award points
        try {
          const { data: su } = await admin.from('shared_users').select('total_points').eq('id', userId).maybeSingle();
          if (su) {
            await admin.from('shared_users').update({ total_points: (su.total_points || 0) + POINTS_FOR_PROFILE }).eq('id', userId);
          }
          await admin.from('loyalty_transactions').insert({
            user_id: userId, points: POINTS_FOR_PROFILE, type: 'earned',
            description: 'Created buddy profile',
          });
        } catch { /* best-effort */ }

        return res.status(201).json({
          success: true,
          profile,
          pointsEarned: POINTS_FOR_PROFILE,
          message: 'Buddy profile created! You\'ll now appear in search results.',
        });
      }

      // ── Update buddy profile ──
      if (action === 'updateProfile') {
        const allowedFields: Record<string, string> = {
          experienceLevel: 'experience_level',
          targetSpecies: 'target_species',
          fishingStyle: 'fishing_style',
          homeWaters: 'home_waters',
          availabilityCalendar: 'availability_calendar',
          boatOwnership: 'boat_ownership',
          bio: 'bio',
        };

        const updates: Record<string, any> = { updated_at: new Date().toISOString() };
        for (const [jsKey, dbKey] of Object.entries(allowedFields)) {
          if (body[jsKey] !== undefined) {
            if (dbKey === 'bio') {
              updates[dbKey] = String(body[jsKey]).slice(0, 500);
            } else {
              updates[dbKey] = body[jsKey];
            }
          }
        }

        if (Object.keys(updates).length <= 1) {
          return res.status(400).json({ error: 'No valid fields to update' });
        }

        const { error } = await admin
          .from('buddy_profiles')
          .update(updates)
          .eq('user_id', userId);

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true, message: 'Profile updated' });
      }

      // ── Send match request ──
      if (action === 'requestMatch') {
        const { targetUserId } = body;
        if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' });
        if (targetUserId === userId) return res.status(400).json({ error: 'Cannot match with yourself' });

        // Check existing match in either direction
        const { data: existing } = await admin
          .from('buddy_matches')
          .select('match_id, status')
          .or(`and(user_id.eq.${userId},matched_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},matched_user_id.eq.${userId})`)
          .maybeSingle();

        if (existing) {
          return res.status(200).json({ success: true, existingStatus: existing.status, matchId: existing.match_id });
        }

        // Calculate basic compatibility score
        const { data: myProfile } = await admin.from('buddy_profiles').select('*').eq('user_id', userId).maybeSingle();
        const { data: theirProfile } = await admin.from('buddy_profiles').select('*').eq('user_id', targetUserId).maybeSingle();

        let matchScore = 50;
        const matchReasons: string[] = [];

        if (myProfile && theirProfile) {
          // Species overlap
          const mySpecies = new Set((myProfile.target_species || []).map((s: string) => s.toLowerCase()));
          const sharedSpecies = (theirProfile.target_species || []).filter((s: string) => mySpecies.has(s.toLowerCase()));
          if (sharedSpecies.length > 0) {
            matchScore += sharedSpecies.length * 10;
            matchReasons.push(`${sharedSpecies.length} shared target species`);
          }

          // Style overlap
          const myStyle = new Set((myProfile.fishing_style || []).map((s: string) => s.toLowerCase()));
          const sharedStyle = (theirProfile.fishing_style || []).filter((s: string) => myStyle.has(s.toLowerCase()));
          if (sharedStyle.length > 0) {
            matchScore += sharedStyle.length * 5;
            matchReasons.push(`${sharedStyle.length} shared fishing styles`);
          }

          // Boat compatibility
          if (myProfile.boat_ownership === 'have_boat' && theirProfile.boat_ownership === 'need_ride') {
            matchScore += 15;
            matchReasons.push('You have a boat, they need a ride');
          } else if (myProfile.boat_ownership === 'need_ride' && theirProfile.boat_ownership === 'have_boat') {
            matchScore += 15;
            matchReasons.push('They have a boat');
          }
        }

        matchScore = Math.min(matchScore, 100);

        const { data: match, error: matchError } = await admin
          .from('buddy_matches')
          .insert({
            user_id: userId,
            matched_user_id: targetUserId,
            match_score: matchScore,
            match_reasons: matchReasons.length > 0 ? matchReasons : ['Manual match request'],
            status: 'pending',
          })
          .select()
          .single();

        if (matchError) return res.status(500).json({ error: matchError.message });

        return res.status(201).json({
          success: true,
          match,
          message: 'Buddy request sent!',
        });
      }

      // ── Respond to match ──
      if (action === 'respondMatch') {
        const { matchId, response } = body;
        if (!matchId) return res.status(400).json({ error: 'matchId required' });
        if (!response || !['accepted', 'rejected'].includes(response)) {
          return res.status(400).json({ error: 'response must be: accepted, rejected' });
        }

        const { error } = await admin
          .from('buddy_matches')
          .update({ status: response })
          .eq('match_id', matchId)
          .eq('matched_user_id', userId)
          .eq('status', 'pending');

        if (error) return res.status(500).json({ error: error.message });

        // Award points if accepted
        if (response === 'accepted') {
          try {
            const { data: su } = await admin.from('shared_users').select('total_points').eq('id', userId).maybeSingle();
            if (su) {
              await admin.from('shared_users').update({ total_points: (su.total_points || 0) + POINTS_FOR_MATCH_ACCEPTED }).eq('id', userId);
            }
            await admin.from('loyalty_transactions').insert({
              user_id: userId, points: POINTS_FOR_MATCH_ACCEPTED, type: 'earned',
              description: 'Buddy match accepted',
            });
          } catch { /* best-effort */ }
        }

        return res.status(200).json({
          success: true,
          message: response === 'accepted' ? 'Buddy request accepted! You\'re now fishing buddies.' : 'Match declined.',
          pointsEarned: response === 'accepted' ? POINTS_FOR_MATCH_ACCEPTED : 0,
        });
      }

      // ── Rate a buddy ──
      if (action === 'rate') {
        const { ratedUserId, tripId, rating, comment } = body;
        if (!ratedUserId) return res.status(400).json({ error: 'ratedUserId required' });
        if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
          return res.status(400).json({ error: 'rating must be 1-5' });
        }
        if (ratedUserId === userId) return res.status(400).json({ error: 'Cannot rate yourself' });

        const { data: ratingRecord, error: ratingError } = await admin
          .from('buddy_ratings')
          .insert({
            rater_id: userId,
            rated_user_id: ratedUserId,
            trip_id: tripId || null,
            rating,
            comment: comment ? String(comment).slice(0, 500) : null,
          })
          .select()
          .single();

        if (ratingError) {
          if (ratingError.code === '23505') {
            return res.status(400).json({ error: 'You have already rated this buddy for this trip' });
          }
          return res.status(500).json({ error: ratingError.message });
        }

        // Recalculate average rating
        const { data: allRatings } = await admin
          .from('buddy_ratings')
          .select('rating')
          .eq('rated_user_id', ratedUserId);

        const ratings = (allRatings || []).map(r => r.rating);
        const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

        await admin
          .from('buddy_profiles')
          .update({
            rating_average: Math.round(avgRating * 100) / 100,
            total_ratings: ratings.length,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', ratedUserId);

        return res.status(201).json({
          success: true,
          rating: ratingRecord,
          newAverage: Math.round(avgRating * 100) / 100,
        });
      }

      return res.status(400).json({ error: 'Invalid action. Use: createProfile, updateProfile, requestMatch, respondMatch, rate' });
    } catch (e: any) {
      console.error('[Buddies] Error:', e);
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
