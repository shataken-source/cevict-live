/**
 * Trust Levels System
 * Manages user trust levels based on points and activity
 */

export interface TrustLevel {
  level: number;
  minPoints: number;
  name: string;
  permissions: string[];
  postApprovalRequired: boolean;
  dailyPostLimit: number;
  uploadSizeLimit: number; // MB
}

export const TRUST_LEVELS: Record<string, TrustLevel> = {
  NEW_MEMBER: {
    level: 0,
    minPoints: 0,
    name: 'New Member',
    permissions: ['read', 'limited_post'],
    postApprovalRequired: true,
    dailyPostLimit: 2,
    uploadSizeLimit: 5,
  },
  MEMBER: {
    level: 1,
    minPoints: 100,
    name: 'Member',
    permissions: ['read', 'post', 'comment', 'upload'],
    postApprovalRequired: false,
    dailyPostLimit: 10,
    uploadSizeLimit: 10,
  },
  REGULAR: {
    level: 2,
    minPoints: 500,
    name: 'Regular',
    permissions: ['read', 'post', 'comment', 'upload', 'edit_own', 'delete_own'],
    postApprovalRequired: false,
    dailyPostLimit: 25,
    uploadSizeLimit: 20,
  },
  TRUSTED: {
    level: 3,
    minPoints: 2000,
    name: 'Trusted Member',
    permissions: ['read', 'post', 'comment', 'upload', 'edit_own', 'delete_own', 'feature_posts', 'create_events'],
    postApprovalRequired: false,
    dailyPostLimit: -1, // unlimited
    uploadSizeLimit: 50,
  },
  VETERAN: {
    level: 4,
    minPoints: 5000,
    name: 'Community Veteran',
    permissions: ['read', 'post', 'comment', 'upload', 'edit_own', 'delete_own', 'feature_posts', 'create_events', 'moderate', 'ban_users'],
    postApprovalRequired: false,
    dailyPostLimit: -1,
    uploadSizeLimit: 100,
  },
};

/**
 * Get trust level by points
 */
export function getTrustLevelByPoints(points: number): TrustLevel {
  let currentLevel = TRUST_LEVELS.NEW_MEMBER;

  for (const [key, level] of Object.entries(TRUST_LEVELS)) {
    if (points >= level.minPoints) {
      currentLevel = level;
    }
  }

  return currentLevel;
}

/**
 * Check if user can post (based on trust level and daily limit)
 */
export async function canUserPost(
  userId: string,
  points: number,
  supabaseAdmin: any
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const trustLevel = getTrustLevelByPoints(points);

  // Check daily post limit
  if (trustLevel.dailyPostLimit !== -1) {
    const today = new Date().toISOString().split('T')[0];
    
    // Count today's posts from loyalty_transactions
    const { count } = await supabaseAdmin
      .from('loyalty_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('source_type', 'message_post')
      .gte('created_at', `${today}T00:00:00`);

    if (count && count >= trustLevel.dailyPostLimit) {
      return {
        allowed: false,
        reason: `Daily post limit reached (${trustLevel.dailyPostLimit} posts/day)`,
        remaining: 0,
      };
    }

    return {
      allowed: true,
      remaining: trustLevel.dailyPostLimit - (count || 0),
    };
  }

  return { allowed: true };
}
