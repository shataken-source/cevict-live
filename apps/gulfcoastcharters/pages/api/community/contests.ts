/**
 * Photo Contests & Tournaments API
 * GET  /api/community/contests                                  — list active contests + tournaments
 * GET  /api/community/contests?contestId=...                    — contest detail with entries
 * GET  /api/community/contests?tournamentId=...                 — tournament detail with leaderboard
 * POST /api/community/contests { action: 'enterContest', contestId, feedId }
 * POST /api/community/contests { action: 'voteContest', entryId }
 * POST /api/community/contests { action: 'registerTournament', tournamentId }
 * POST /api/community/contests { action: 'submitCatch', tournamentId, species, size, weight, photoUrl, locationData }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthedUser, getSupabaseAdmin } from '../_lib/supabase';

const POINTS_FOR_CONTEST_ENTRY = 15;
const POINTS_FOR_TOURNAMENT_REG = 10;
const POINTS_FOR_TOURNAMENT_SUBMIT = 5;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = getSupabaseAdmin();

  // ── GET ──
  if (req.method === 'GET') {
    try {
      const contestId = String(req.query.contestId || '').trim();
      const tournamentId = String(req.query.tournamentId || '').trim();

      // ── Contest detail ──
      if (contestId) {
        const { data: contest, error } = await admin
          .from('photo_contests')
          .select('*')
          .eq('contest_id', contestId)
          .single();

        if (error || !contest) return res.status(404).json({ error: 'Contest not found' });

        // Get entries with vote counts
        const { data: entries } = await admin
          .from('contest_entries')
          .select('entry_id, contest_id, user_id, feed_id, votes_count, final_rank, prize_awarded, submitted_at')
          .eq('contest_id', contestId)
          .order('votes_count', { ascending: false });

        // Get user info for entries
        const entryUserIds = [...new Set((entries || []).map(e => e.user_id))];
        let userMap = new Map<string, any>();
        if (entryUserIds.length > 0) {
          const { data: users } = await admin
            .from('shared_users')
            .select('id, display_name, avatar_url')
            .in('id', entryUserIds);
          userMap = new Map((users || []).map(u => [u.id, u]));
        }

        // Get feed post data for entries (photos)
        const feedIds = (entries || []).map(e => e.feed_id).filter(Boolean);
        let feedMap = new Map<string, any>();
        if (feedIds.length > 0) {
          const { data: feeds } = await admin
            .from('activity_feed')
            .select('feed_id, title, content, media_urls')
            .in('feed_id', feedIds);
          feedMap = new Map((feeds || []).map(f => [f.feed_id, f]));
        }

        // Check user's vote if authenticated
        let userVotedEntries = new Set<string>();
        let contestUser: any = null;
        try { const result = await getAuthedUser(req, res); contestUser = result.user; } catch { /* not logged in */ }
        if (contestUser && entries && entries.length > 0) {
          const { data: votes } = await admin
            .from('contest_votes')
            .select('entry_id')
            .eq('contest_id', contestId)
            .eq('user_id', contestUser.id);
          userVotedEntries = new Set((votes || []).map(v => v.entry_id));
        }

        const enrichedEntries = (entries || []).map(e => {
          const u = userMap.get(e.user_id);
          const feed = feedMap.get(e.feed_id);
          return {
            ...e,
            author: {
              userId: e.user_id,
              displayName: u?.display_name || `Angler ${e.user_id.slice(0, 6)}`,
              avatarUrl: u?.avatar_url || null,
            },
            photo: feed ? {
              title: feed.title,
              content: feed.content,
              mediaUrls: feed.media_urls,
            } : null,
            userVoted: userVotedEntries.has(e.entry_id),
          };
        });

        return res.status(200).json({
          success: true,
          contest,
          entries: enrichedEntries,
          totalEntries: enrichedEntries.length,
        });
      }

      // ── Tournament detail ──
      if (tournamentId) {
        const { data: tournament, error } = await admin
          .from('tournaments')
          .select('*')
          .eq('tournament_id', tournamentId)
          .single();

        if (error || !tournament) return res.status(404).json({ error: 'Tournament not found' });

        // Leaderboard
        const { data: entries } = await admin
          .from('tournament_entries')
          .select('entry_id, tournament_id, user_id, total_score, final_rank, prize_awarded, registered_at')
          .eq('tournament_id', tournamentId)
          .order('total_score', { ascending: false })
          .limit(100);

        const entryUserIds = [...new Set((entries || []).map(e => e.user_id))];
        let userMap = new Map<string, any>();
        if (entryUserIds.length > 0) {
          const { data: users } = await admin
            .from('shared_users')
            .select('id, display_name, avatar_url')
            .in('id', entryUserIds);
          userMap = new Map((users || []).map(u => [u.id, u]));
        }

        const leaderboard = (entries || []).map((e, i) => {
          const u = userMap.get(e.user_id);
          return {
            rank: i + 1,
            ...e,
            displayName: u?.display_name || `Angler ${e.user_id.slice(0, 6)}`,
            avatarUrl: u?.avatar_url || null,
          };
        });

        // Check if user is registered
        let userEntry = null;
        let tournamentUser: any = null;
        try { const result = await getAuthedUser(req, res); tournamentUser = result.user; } catch { /* not logged in */ }
        if (tournamentUser) {
          const { data: entry } = await admin
            .from('tournament_entries')
            .select('entry_id, total_score, final_rank')
            .eq('tournament_id', tournamentId)
            .eq('user_id', tournamentUser.id)
            .maybeSingle();
          userEntry = entry;
        }

        return res.status(200).json({
          success: true,
          tournament,
          leaderboard,
          totalParticipants: leaderboard.length,
          userEntry,
        });
      }

      // ── List active contests + tournaments ──
      const { data: contests } = await admin
        .from('photo_contests')
        .select('contest_id, title, category, description, status, submission_start, submission_end, voting_start, voting_end')
        .in('status', ['announced', 'open', 'voting', 'winners_announced'])
        .order('submission_start', { ascending: false })
        .limit(20);

      const { data: tournaments } = await admin
        .from('tournaments')
        .select('tournament_id, title, tournament_type, description, status, target_species, registration_start, registration_end, tournament_start, tournament_end, entry_fee, prize_structure')
        .in('status', ['announced', 'registration_open', 'active', 'winners_announced'])
        .order('tournament_start', { ascending: false })
        .limit(20);

      // Get entry counts
      for (const c of (contests || [])) {
        const { count } = await admin
          .from('contest_entries')
          .select('entry_id', { count: 'exact', head: true })
          .eq('contest_id', c.contest_id);
        (c as any).entryCount = count || 0;
      }

      for (const t of (tournaments || [])) {
        const { count } = await admin
          .from('tournament_entries')
          .select('entry_id', { count: 'exact', head: true })
          .eq('tournament_id', t.tournament_id);
        (t as any).participantCount = count || 0;
      }

      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
      return res.status(200).json({
        success: true,
        contests: contests || [],
        tournaments: tournaments || [],
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  // ── POST ──
  if (req.method === 'POST') {
    const { user, error: authError } = await getAuthedUser(req, res);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { action } = body;

      // ── Enter photo contest ──
      if (action === 'enterContest') {
        const { contestId, feedId } = body;
        if (!contestId) return res.status(400).json({ error: 'contestId required' });
        if (!feedId) return res.status(400).json({ error: 'feedId required (link to your feed post with photo)' });

        const { data: contest } = await admin
          .from('photo_contests')
          .select('contest_id, status, submission_end')
          .eq('contest_id', contestId)
          .single();

        if (!contest) return res.status(404).json({ error: 'Contest not found' });
        if (contest.status !== 'open') return res.status(400).json({ error: 'Contest is not accepting submissions' });

        const { data: entry, error: entryError } = await admin
          .from('contest_entries')
          .insert({
            contest_id: contestId,
            user_id: user.id,
            feed_id: feedId,
          })
          .select()
          .single();

        if (entryError) {
          if (entryError.code === '23505') return res.status(400).json({ error: 'You already entered this contest' });
          return res.status(500).json({ error: entryError.message });
        }

        // Award points
        try {
          const { data: su } = await admin.from('shared_users').select('total_points').eq('id', user.id).maybeSingle();
          if (su) {
            await admin.from('shared_users').update({ total_points: (su.total_points || 0) + POINTS_FOR_CONTEST_ENTRY }).eq('id', user.id);
          }
          await admin.from('loyalty_transactions').insert({
            user_id: user.id, points: POINTS_FOR_CONTEST_ENTRY, type: 'earned',
            description: 'Photo contest entry',
          });
        } catch { /* best-effort */ }

        return res.status(201).json({ success: true, entry, pointsEarned: POINTS_FOR_CONTEST_ENTRY });
      }

      // ── Vote on contest entry ──
      if (action === 'voteContest') {
        const { entryId } = body;
        if (!entryId) return res.status(400).json({ error: 'entryId required' });

        // Get entry to find contest
        const { data: entry } = await admin
          .from('contest_entries')
          .select('entry_id, contest_id, votes_count')
          .eq('entry_id', entryId)
          .single();

        if (!entry) return res.status(404).json({ error: 'Entry not found' });

        // Verify contest is in voting phase
        const { data: contest } = await admin
          .from('photo_contests')
          .select('status')
          .eq('contest_id', entry.contest_id)
          .single();

        if (!contest || contest.status !== 'voting') {
          return res.status(400).json({ error: 'Voting is not open for this contest' });
        }

        // Toggle vote
        const { data: existingVote } = await admin
          .from('contest_votes')
          .select('vote_id')
          .eq('entry_id', entryId)
          .eq('user_id', user.id)
          .eq('contest_id', entry.contest_id)
          .maybeSingle();

        if (existingVote) {
          await admin.from('contest_votes').delete().eq('vote_id', existingVote.vote_id);
        } else {
          await admin.from('contest_votes').insert({
            contest_id: entry.contest_id,
            entry_id: entryId,
            user_id: user.id,
          });
        }

        // Update vote count
        const { count } = await admin
          .from('contest_votes')
          .select('vote_id', { count: 'exact', head: true })
          .eq('entry_id', entryId);

        await admin.from('contest_entries').update({ votes_count: count || 0 }).eq('entry_id', entryId);

        return res.status(200).json({ success: true, voted: !existingVote, votesCount: count || 0 });
      }

      // ── Register for tournament ──
      if (action === 'registerTournament') {
        const { tournamentId } = body;
        if (!tournamentId) return res.status(400).json({ error: 'tournamentId required' });

        const { data: tournament } = await admin
          .from('tournaments')
          .select('tournament_id, title, status, entry_fee')
          .eq('tournament_id', tournamentId)
          .single();

        if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
        if (tournament.status !== 'registration_open') {
          return res.status(400).json({ error: 'Registration is not open' });
        }

        const { data: entry, error: entryError } = await admin
          .from('tournament_entries')
          .insert({
            tournament_id: tournamentId,
            user_id: user.id,
            entry_fee_paid: tournament.entry_fee || 0,
            payment_status: tournament.entry_fee > 0 ? 'pending' : 'paid',
          })
          .select()
          .single();

        if (entryError) {
          if (entryError.code === '23505') return res.status(400).json({ error: 'Already registered' });
          return res.status(500).json({ error: entryError.message });
        }

        try {
          const { data: su } = await admin.from('shared_users').select('total_points').eq('id', user.id).maybeSingle();
          if (su) {
            await admin.from('shared_users').update({ total_points: (su.total_points || 0) + POINTS_FOR_TOURNAMENT_REG }).eq('id', user.id);
          }
          await admin.from('loyalty_transactions').insert({
            user_id: user.id, points: POINTS_FOR_TOURNAMENT_REG, type: 'earned',
            description: `Tournament registration: ${tournament.title}`,
          });
        } catch { /* best-effort */ }

        return res.status(201).json({
          success: true,
          entry,
          pointsEarned: POINTS_FOR_TOURNAMENT_REG,
          message: `Registered for "${tournament.title}"!`,
        });
      }

      // ── Submit catch to tournament ──
      if (action === 'submitCatch') {
        const { tournamentId, species, size, weight, photoUrl, locationData } = body;
        if (!tournamentId) return res.status(400).json({ error: 'tournamentId required' });

        // Verify registration and tournament is active
        const { data: entry } = await admin
          .from('tournament_entries')
          .select('entry_id, total_score')
          .eq('tournament_id', tournamentId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!entry) return res.status(400).json({ error: 'Not registered for this tournament' });

        const { data: tournament } = await admin
          .from('tournaments')
          .select('status')
          .eq('tournament_id', tournamentId)
          .single();

        if (!tournament || tournament.status !== 'active') {
          return res.status(400).json({ error: 'Tournament is not active' });
        }

        // Calculate score (simple: weight * 10 + size)
        const score = ((weight || 0) * 10) + (size || 0);

        const { data: submission, error: subError } = await admin
          .from('tournament_submissions')
          .insert({
            tournament_id: tournamentId,
            entry_id: entry.entry_id,
            user_id: user.id,
            species: species || null,
            size: size || null,
            weight: weight || null,
            photo_url: photoUrl || null,
            location_data: locationData || null,
            score,
          })
          .select()
          .single();

        if (subError) return res.status(500).json({ error: subError.message });

        // Update total score on entry
        await admin
          .from('tournament_entries')
          .update({ total_score: (entry.total_score || 0) + score })
          .eq('entry_id', entry.entry_id);

        try {
          const { data: su } = await admin.from('shared_users').select('total_points').eq('id', user.id).maybeSingle();
          if (su) {
            await admin.from('shared_users').update({ total_points: (su.total_points || 0) + POINTS_FOR_TOURNAMENT_SUBMIT }).eq('id', user.id);
          }
          await admin.from('loyalty_transactions').insert({
            user_id: user.id, points: POINTS_FOR_TOURNAMENT_SUBMIT, type: 'earned',
            description: 'Tournament catch submission',
          });
        } catch { /* best-effort */ }

        return res.status(201).json({
          success: true,
          submission,
          score,
          newTotalScore: (entry.total_score || 0) + score,
          pointsEarned: POINTS_FOR_TOURNAMENT_SUBMIT,
        });
      }

      return res.status(400).json({ error: 'Invalid action. Use: enterContest, voteContest, registerTournament, submitCatch' });
    } catch (e: any) {
      console.error('[Contests] Error:', e);
      return res.status(500).json({ error: e.message || 'Internal server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
