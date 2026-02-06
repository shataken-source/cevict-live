/**
 * points-rewards-system
 *
 * Minimal implementation to match frontend usage:
 * - get_leaderboard (period: week|month|all)
 * - get_user_rank (userId)
 * - award_points (userId, actionType)
 * - get_rewards / redeem_reward
 * - get_achievements
 *
 * Uses service role when available to bypass RLS for aggregates.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function rankForPoints(points: number) {
  if (points >= 7000) return 'Platinum';
  if (points >= 3000) return 'Gold';
  if (points >= 1000) return 'Silver';
  return 'Bronze';
}

function nextRank(rank: string) {
  if (rank === 'Bronze') return 'Silver';
  if (rank === 'Silver') return 'Gold';
  if (rank === 'Gold') return 'Platinum';
  return null;
}

function thresholdForRank(rank: string) {
  if (rank === 'Silver') return 1000;
  if (rank === 'Gold') return 3000;
  if (rank === 'Platinum') return 7000;
  return 0;
}

function periodFilter(period: string) {
  const now = new Date();
  if (period === 'week') {
    const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d.toISOString();
  }
  if (period === 'month') {
    const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString();
  }
  return null;
}

function getAdminClient(req: Request) {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  // Prefer service role for leaderboard aggregates.
  const key = serviceRole || anon;
  return createClient(url, key, {
    global: {
      headers: {
        Authorization: req.headers.get('Authorization') ?? '',
      },
    },
    auth: { persistSession: false },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = getAdminClient(req);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');

    // ---------------------------
    // Leaderboard
    // ---------------------------
    if (action === 'get_leaderboard') {
      const period = String(body.period || 'week');
      const since = periodFilter(period);

      // Aggregate from point_transactions + join profiles (PII-light: name + avatar only)
      let query = supabase
        .from('point_transactions')
        .select('user_id,points,created_at,profiles:profiles!point_transactions_user_id_fkey(full_name,avatar_url)');

      if (since) query = query.gte('created_at', since);

      const { data, error } = await query.limit(5000);
      if (error) throw error;

      const totals = new Map<string, { points: number; full_name: string | null; avatar_url: string | null }>();
      for (const row of data ?? []) {
        const userId = String((row as any).user_id);
        const pts = Number((row as any).points || 0) || 0;
        const prof = (row as any).profiles || null;
        const prev = totals.get(userId) || { points: 0, full_name: prof?.full_name ?? null, avatar_url: prof?.avatar_url ?? null };
        totals.set(userId, {
          points: prev.points + pts,
          full_name: prev.full_name ?? prof?.full_name ?? null,
          avatar_url: prev.avatar_url ?? prof?.avatar_url ?? null,
        });
      }

      const leaderboard = Array.from(totals.entries())
        .map(([userId, v]) => {
          const rank = rankForPoints(v.points);
          return {
            userId,
            username: v.full_name || 'Angler',
            avatar: v.avatar_url || null,
            points: v.points,
            rank,
          };
        })
        .sort((a, b) => b.points - a.points)
        .slice(0, 20);

      return new Response(JSON.stringify({ leaderboard }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---------------------------
    // User rank
    // ---------------------------
    if (action === 'get_user_rank') {
      const userId = String(body.userId || '');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Missing userId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase.rpc('get_user_points', { user_uuid: userId });
      if (error) throw error;
      const points = Number(data || 0) || 0;
      const rank = rankForPoints(points);
      const n = nextRank(rank);
      const nextThreshold = n ? thresholdForRank(n) : null;
      const currentThreshold = thresholdForRank(rank);
      const pointsToNext = nextThreshold ? Math.max(nextThreshold - points, 0) : 0;
      const progress = nextThreshold ? Math.min(((points - currentThreshold) / Math.max(nextThreshold - currentThreshold, 1)) * 100, 100) : 100;

      return new Response(
        JSON.stringify({
          rank,
          nextRank: n,
          pointsToNext,
          progress,
          totalPoints: points,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---------------------------
    // Achievements (static definitions for now)
    // ---------------------------
    if (action === 'get_achievements') {
      const achievements = [
        // Core achievements
        { id: 'first_voyage', name: 'First Voyage', requirement: { type: 'booking', count: 1 }, rewardPoints: 100 },
        { id: 'critic', name: 'Critic', requirement: { type: 'review', count: 10 }, rewardPoints: 500 },
        { id: 'rising_star', name: 'Rising Star', requirement: { type: 'points', count: 1000 }, rewardPoints: 150 },
        { id: 'legend', name: 'Legend', requirement: { type: 'points', count: 5000 }, rewardPoints: 500 },
        { id: 'ambassador', name: 'Ambassador', requirement: { type: 'referral', count: 5 }, rewardPoints: 250 },
        { id: 'photographer', name: 'Photographer', requirement: { type: 'photo_upload', count: 25 }, rewardPoints: 200 },
        { id: 'social_butterfly', name: 'Social Butterfly', requirement: { type: 'message', count: 50 }, rewardPoints: 150 },
        { id: 'seasoned_sailor', name: 'Seasoned Sailor', requirement: { type: 'booking', count: 10 }, rewardPoints: 300 },
        { id: 'reward_hunter', name: 'Reward Hunter', requirement: { type: 'redeem', count: 1 }, rewardPoints: 100 },
        
        // Avatar achievements
        { id: 'avatar_enthusiast', name: 'Avatar Enthusiast', requirement: { type: 'avatar_purchase', count: 10 }, rewardPoints: 200 },
        { id: 'fashion_forward', name: 'Fashion Forward', requirement: { type: 'avatar_purchase', count: 25 }, rewardPoints: 500 },
        
        // Marketplace achievements
        { id: 'marketplace_seller', name: 'Marketplace Seller', requirement: { type: 'marketplace_listing', count: 5 }, rewardPoints: 150 },
        { id: 'top_seller', name: 'Top Seller', requirement: { type: 'marketplace_sale', count: 10 }, rewardPoints: 500 },
        { id: 'trusted_buyer', name: 'Trusted Buyer', requirement: { type: 'marketplace_purchase', count: 5 }, rewardPoints: 300 },
        
        // AI & Catching achievements
        { id: 'angler', name: 'Angler', requirement: { type: 'catch_logged', count: 10 }, rewardPoints: 200 },
        { id: 'master_angler', name: 'Master Angler', requirement: { type: 'catch_logged', count: 50 }, rewardPoints: 500 },
        { id: 'ai_helper', name: 'AI Helper', requirement: { type: 'ai_correction', count: 10 }, rewardPoints: 150 },
        { id: 'species_collector', name: 'Species Collector', requirement: { type: 'catch_species', count: 10 }, rewardPoints: 300 },
        
        // Training achievements
        { id: 'student', name: 'Student', requirement: { type: 'course_complete', count: 1 }, rewardPoints: 150 },
        { id: 'scholar', name: 'Scholar', requirement: { type: 'course_complete', count: 3 }, rewardPoints: 300 },
        { id: 'expert', name: 'Expert', requirement: { type: 'course_complete', count: 8 }, rewardPoints: 1000 },
        
        // License achievements
        { id: 'licensed_angler', name: 'Licensed Angler', requirement: { type: 'license_purchase', count: 1 }, rewardPoints: 100 },
        { id: 'multi_state', name: 'Multi-State Angler', requirement: { type: 'license_purchase', count: 3 }, rewardPoints: 200 },
      ];
      return new Response(JSON.stringify({ achievements }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---------------------------
    // Rewards catalog (static)
    // ---------------------------
    if (action === 'get_rewards') {
      const rewards = [
        // Shape matches existing UI components: { type, points, reward }
        { type: 'discount_10', points: 500, reward: '10% discount on next booking' },
        { type: 'membership_1m', points: 1000, reward: 'Free 1-month membership' },
        { type: 'ads_50', points: 2000, reward: '50% off advertising' },
        { type: 'membership_3m', points: 3500, reward: 'Free 3-month membership' },
        { type: 'membership_12m', points: 5000, reward: 'Free annual membership' },
      ];
      return new Response(JSON.stringify({ rewards }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'redeem_reward') {
      const userId = String(body.userId || '');
      const rewardType = String(body.rewardType || body.rewardId || '');
      if (!userId || !rewardType) {
        return new Response(JSON.stringify({ error: 'Missing userId/rewardType' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const catalog: Record<string, { cost: number; title: string }> = {
        discount_10: { cost: 500, title: '10% discount on next booking' },
        membership_1m: { cost: 1000, title: 'Free 1-month membership' },
        ads_50: { cost: 2000, title: '50% off advertising' },
        membership_3m: { cost: 3500, title: 'Free 3-month membership' },
        membership_12m: { cost: 5000, title: 'Free annual membership' },
      };

      const reward = catalog[rewardType];
      if (!reward) {
        return new Response(JSON.stringify({ error: 'Unknown reward' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: points, error: ptsErr } = await supabase.rpc('get_user_points', { user_uuid: userId });
      if (ptsErr) throw ptsErr;
      const balance = Number(points || 0) || 0;
      if (balance < reward.cost) {
        return new Response(JSON.stringify({ success: false, error: 'Insufficient points', balance }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: awardErr } = await supabase.rpc('award_points', {
        user_uuid: userId,
        points_amount: -reward.cost,
        trans_type: 'redeem_reward',
        reference_id: null,
        description: `Redeemed reward: ${reward.title}`,
      });
      if (awardErr) throw awardErr;

      const { data: newBalance } = await supabase.rpc('get_user_points', { user_uuid: userId });
      return new Response(
        JSON.stringify({
          success: true,
          rewardType,
          balance: Number(newBalance || 0) || 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ---------------------------
    // Award points (simple mapping)
    // ---------------------------
    if (action === 'award_points') {
      const userId = String(body.userId || '');
      const actionType = String(body.actionType || '');
      const customAmount = body.amount ? Number(body.amount) : null;
      
      if (!userId || !actionType) {
        return new Response(JSON.stringify({ error: 'Missing userId/actionType' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const pointsByAction: Record<string, number> = {
        // Core actions
        booking: 100,
        review: 50,
        photo_upload: 25,
        message: 10,
        message_post: 10,
        thread: 10,
        referral: 200,
        profile_complete: 75,
        video_upload: 50,
        event_attend: 30,
        daily_login: 5,
        streak_bonus: 0, // Calculated dynamically based on streak
        achievement_unlock: 150,
        quest_complete: 0, // Set by quest system
        
        // Avatar System
        avatar_created: 15,
        avatar_customized: 10,
        avatar_first_purchase: 25,
        
        // Marketplace
        marketplace_listing: 20,
        marketplace_sale: 50,
        marketplace_purchase: 30,
        marketplace_review: 10,
        marketplace_offer_accepted: 15,
        
        // Affiliate
        affiliate_code_generated: 10,
        affiliate_tier_upgrade: 100,
        
        // AI Fish Recognition
        ai_recognition_use: 5,
        catch_logged: 25,
        ai_correction: 10,
        
        // Training Academy
        lesson_complete: 10,
        quiz_passed: 20,
        course_complete: 100,
        certification_earned: 150,
        
        // Fishing License
        license_purchase: 15,
        license_verification: 5,
        license_annual: 25, // Bonus for annual licenses
      };
      
      // Use custom amount if provided, otherwise use mapping
      let amount = customAmount !== null ? customAmount : (pointsByAction[actionType] ?? 0);
      
      // Calculate streak bonus for daily_login
      if (actionType === 'daily_login') {
        const { data: checkInData } = await supabase
          .from('daily_check_ins')
          .select('current_streak')
          .eq('user_id', userId)
          .single();
        
        const streak = checkInData?.current_streak || 0;
        const streakBonus = Math.min(streak * 2, 50); // Max 50 bonus points
        amount = amount + streakBonus;
      }
      
      if (amount <= 0 && customAmount === null) {
        return new Response(JSON.stringify({ success: false, error: 'Unknown actionType or invalid amount' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase.rpc('award_points', {
        user_uuid: userId,
        points_amount: amount,
        trans_type: actionType,
        reference_id: body.referenceId || null,
        description: body.description || null,
      });
      if (error) throw error;

      const { data: balance } = await supabase.rpc('get_user_points', { user_uuid: userId });
      return new Response(JSON.stringify({ success: true, points: amount, actionType, balance: Number(balance || 0) || 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---------------------------
    // Get daily check-in status
    // ---------------------------
    if (action === 'get_daily_checkin') {
      const userId = String(body.userId || '');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Missing userId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: checkIn, error } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Return default if no record exists
        return new Response(JSON.stringify({
          currentStreak: 0,
          longestStreak: 0,
          totalCheckIns: 0,
          todayCheckedIn: false,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      const lastCheckIn = checkIn?.last_check_in 
        ? new Date(checkIn.last_check_in).toISOString().split('T')[0]
        : null;

      return new Response(JSON.stringify({
        currentStreak: checkIn?.current_streak || 0,
        longestStreak: checkIn?.longest_streak || 0,
        totalCheckIns: checkIn?.total_check_ins || 0,
        todayCheckedIn: lastCheckIn === todayStr,
        lastCheckIn: lastCheckIn,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Internal error', details: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

