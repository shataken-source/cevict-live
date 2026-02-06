/**
 * Badge System
 * Defines badges and checks if users qualify
 */

import { createClient } from '@supabase/supabase-js';
import { getOrCreateSharedUser } from './shared-users';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  condition: (stats: any) => boolean;
}

export const BADGES: Record<string, Badge> = {
  BREAKING_THE_ICE: {
    id: 'breaking_ice',
    name: '🎣 Breaking the Ice',
    description: 'Posted your first message',
    icon: '🎣',
    points: 25,
    condition: (stats) => (stats.posts_count || 0) >= 1,
  },
  STORYTELLER: {
    id: 'storyteller',
    name: '📖 Storyteller',
    description: 'Posted 10 messages',
    icon: '📖',
    points: 50,
    condition: (stats) => (stats.total_posts || 0) >= 10,
  },
  CHRONICLER: {
    id: 'chronicler',
    name: '📚 Chronicler',
    description: 'Posted 50 messages',
    icon: '📚',
    points: 100,
    condition: (stats) => (stats.total_posts || 0) >= 50,
  },
  LEGEND: {
    id: 'legend',
    name: '🏆 Legend',
    description: 'Posted 200 messages',
    icon: '🏆',
    points: 500,
    condition: (stats) => (stats.total_posts || 0) >= 200,
  },
  CONVERSATIONALIST: {
    id: 'conversationalist',
    name: '💬 Conversationalist',
    description: 'Made 50 replies',
    icon: '💬',
    points: 30,
    condition: (stats) => (stats.replies_count || 0) >= 50,
  },
  HELPER: {
    id: 'helper',
    name: '🤝 Helper',
    description: 'Received 25 helpful votes',
    icon: '🤝',
    points: 75,
    condition: (stats) => (stats.helpful_votes_received || 0) >= 25,
  },
  MENTOR: {
    id: 'mentor',
    name: '🎓 Mentor',
    description: 'Received 100 helpful votes',
    icon: '🎓',
    points: 200,
    condition: (stats) => (stats.helpful_votes_received || 0) >= 100,
  },
  WEEK_WARRIOR: {
    id: 'week_warrior',
    name: '🔥 Week Warrior',
    description: 'Maintained a 7-day streak',
    icon: '🔥',
    points: 50,
    condition: (stats) => (stats.current_streak || 0) >= 7,
  },
  MONTHLY_MASTER: {
    id: 'monthly_master',
    name: '📅 Monthly Master',
    description: 'Maintained a 30-day streak',
    icon: '📅',
    points: 200,
    condition: (stats) => (stats.current_streak || 0) >= 30,
  },
  CENTURY_CLUB: {
    id: 'century_club',
    name: '💯 Century Club',
    description: 'Maintained a 100-day streak',
    icon: '💯',
    points: 500,
    condition: (stats) => (stats.current_streak || 0) >= 100,
  },
};

/**
 * Check and award badges for a user
 */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  if (!supabaseAdmin) return [];

  try {
    // Ensure shared user exists
    await getOrCreateSharedUser(userId, '');

    // Get user stats
    const { data: stats } = await supabaseAdmin
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!stats) return [];

    // Get existing badges
    const { data: existingBadges } = await supabaseAdmin
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId);

    const existingBadgeIds = existingBadges?.map(b => b.badge_id) || [];
    const newBadges: string[] = [];

    // Check each badge
    for (const [key, badge] of Object.entries(BADGES)) {
      if (!existingBadgeIds.includes(badge.id)) {
        if (badge.condition(stats)) {
          // Award badge
          const { data, error } = await supabaseAdmin.rpc('award_badge', {
            p_user_id: userId,
            p_badge_id: badge.id,
            p_badge_name: badge.name,
            p_badge_description: badge.description,
            p_badge_icon: badge.icon,
            p_points_awarded: badge.points,
          });

          if (!error && data) {
            newBadges.push(badge.name);
          }
        }
      }
    }

    return newBadges;
  } catch (error) {
    console.error('Error checking badges:', error);
    return [];
  }
}

/**
 * Get user's badges
 */
export async function getUserBadges(userId: string): Promise<any[]> {
  if (!supabaseAdmin) return [];

  try {
    const { data, error } = await supabaseAdmin
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) {
      console.error('Error fetching badges:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserBadges:', error);
    return [];
  }
}
