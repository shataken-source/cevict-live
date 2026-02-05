/**
 * Community Points & Gamification System
 * Complete implementation for fishing community engagement
 * Includes points, badges, streaks, leaderboards, and trust levels
 */

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Points configuration
export const POINT_ACTIONS = {
  // Content creation
  CREATE_FISHING_REPORT: 25,
  CREATE_FISHING_REPORT_WITH_PHOTO: 35,
  CREATE_FISHING_REPORT_WITH_VIDEO: 50,
  CREATE_FISHING_SPOT: 20,
  CREATE_TECHNIQUE_GUIDE: 40,
  CREATE_GEAR_REVIEW: 30,
  
  // Engagement
  DAILY_CHECK_IN: 3,
  COMMENT_ON_POST: 5,
  HELPFUL_COMMENT: 10,
  BEST_ANSWER: 50,
  SHARE_POST: 8,
  
  // Achievements
  FIRST_POST: 50,
  STREAK_7_DAYS: 50,
  STREAK_30_DAYS: 200,
  STREAK_100_DAYS: 500,
  
  // Community building
  REFER_NEW_USER: 100,
  ORGANIZE_TOURNAMENT: 200,
  MENTOR_NEW_MEMBER: 75,
  
  // Verification
  VERIFY_EMAIL: 20,
  COMPLETE_PROFILE: 30,
  CONNECT_SOCIAL: 15,
  
  // Captain specific
  CAPTAIN_TRIP_REPORT: 40,
  CAPTAIN_SAFETY_TIP: 35,
  CAPTAIN_WEATHER_UPDATE: 25,
}

// Trust levels configuration
export const TRUST_LEVELS = {
  NEW_MEMBER: {
    level: 0,
    minPoints: 0,
    name: 'New Member',
    permissions: ['read', 'limited_post'],
    postApprovalRequired: true,
    dailyPostLimit: 2,
    uploadSizeLimit: 5, // MB
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
}

// Badge definitions
export const BADGES = {
  // Posting badges
  BREAKING_THE_ICE: {
    id: 'breaking_ice',
    name: '🎣 Breaking the Ice',
    description: 'Posted your first fishing report',
    condition: 'posts_count >= 1',
    points: 25,
    icon: '🎣',
  },
  STORYTELLER: {
    id: 'storyteller',
    name: '📖 Storyteller',
    description: 'Posted 10 fishing reports',
    condition: 'posts_count >= 10',
    points: 50,
    icon: '📖',
  },
  CHRONICLER: {
    id: 'chronicler',
    name: '📚 Chronicler',
    description: 'Posted 50 fishing reports',
    condition: 'posts_count >= 50',
    points: 100,
    icon: '📚',
  },
  LEGEND: {
    id: 'legend',
    name: '🏆 Legend',
    description: 'Posted 200 fishing reports',
    condition: 'posts_count >= 200',
    points: 500,
    icon: '🏆',
  },
  
  // Engagement badges
  CONVERSATIONALIST: {
    id: 'conversationalist',
    name: '💬 Conversationalist',
    description: 'Made 50 comments',
    condition: 'comments_count >= 50',
    points: 30,
    icon: '💬',
  },
  HELPER: {
    id: 'helper',
    name: '🤝 Helper',
    description: 'Received 25 helpful votes',
    condition: 'helpful_votes >= 25',
    points: 75,
    icon: '🤝',
  },
  MENTOR: {
    id: 'mentor',
    name: '🎓 Mentor',
    description: 'Received 100 helpful votes',
    condition: 'helpful_votes >= 100',
    points: 200,
    icon: '🎓',
  },
  
  // Streak badges
  WEEK_WARRIOR: {
    id: 'week_warrior',
    name: '🔥 Week Warrior',
    description: 'Maintained a 7-day streak',
    condition: 'current_streak >= 7',
    points: 50,
    icon: '🔥',
  },
  MONTHLY_MASTER: {
    id: 'monthly_master',
    name: '📅 Monthly Master',
    description: 'Maintained a 30-day streak',
    condition: 'current_streak >= 30',
    points: 200,
    icon: '📅',
  },
  CENTURY_CLUB: {
    id: 'century_club',
    name: '💯 Century Club',
    description: 'Maintained a 100-day streak',
    condition: 'current_streak >= 100',
    points: 500,
    icon: '💯',
  },
  
  // Activity badges
  EARLY_BIRD: {
    id: 'early_bird',
    name: '🌅 Early Bird',
    description: 'Active member for 30 days',
    condition: 'days_active >= 30',
    points: 40,
    icon: '🌅',
  },
  REGULAR_FIXTURE: {
    id: 'regular_fixture',
    name: '⭐ Regular Fixture',
    description: 'Active member for 90 days',
    condition: 'days_active >= 90',
    points: 100,
    icon: '⭐',
  },
  COMMUNITY_VETERAN: {
    id: 'community_veteran',
    name: '👑 Community Veteran',
    description: 'Active member for 180 days',
    condition: 'days_active >= 180',
    points: 250,
    icon: '👑',
  },
  
  // Special badges
  PHOTOGRAPHER: {
    id: 'photographer',
    name: '📸 Photographer',
    description: 'Shared 50 photos',
    condition: 'photos_count >= 50',
    points: 60,
    icon: '📸',
  },
  VIDEOGRAPHER: {
    id: 'videographer',
    name: '🎥 Videographer',
    description: 'Shared 20 videos',
    condition: 'videos_count >= 20',
    points: 100,
    icon: '🎥',
  },
  TOURNAMENT_CHAMPION: {
    id: 'tournament_champion',
    name: '🥇 Tournament Champion',
    description: 'Won a community tournament',
    condition: 'tournaments_won >= 1',
    points: 300,
    icon: '🥇',
  },
  WEATHER_WATCHER: {
    id: 'weather_watcher',
    name: '🌦️ Weather Watcher',
    description: 'Shared 25 weather updates',
    condition: 'weather_updates >= 25',
    points: 50,
    icon: '🌦️',
  },
  SPOT_EXPLORER: {
    id: 'spot_explorer',
    name: '📍 Spot Explorer',
    description: 'Shared 10 fishing spots',
    condition: 'spots_shared >= 10',
    points: 80,
    icon: '📍',
  },
  GEAR_GURU: {
    id: 'gear_guru',
    name: '🎣 Gear Guru',
    description: 'Posted 15 gear reviews',
    condition: 'gear_reviews >= 15',
    points: 90,
    icon: '🎣',
  },
  CAPTAIN: {
    id: 'captain',
    name: '⚓ Captain',
    description: 'Verified charter captain',
    condition: 'is_captain === true',
    points: 200,
    icon: '⚓',
  },
}

/**
 * Main points management class
 */
export class PointsManager {
  constructor(userId) {
    this.userId = userId
    this.userStats = null
  }

  /**
   * Award points for an action
   */
  async awardPoints(action, metadata = {}) {
    try {
      // Validate action
      if (!POINT_ACTIONS[action]) {
        throw new Error(`Invalid action: ${action}`)
      }

      const pointsToAward = POINT_ACTIONS[action]
      
      // Start transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('points_transactions')
        .insert({
          user_id: this.userId,
          action,
          points: pointsToAward,
          metadata,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (transactionError) throw transactionError

      // Update user stats
      const { data: updatedStats, error: statsError } = await supabase
        .rpc('update_user_points', {
          p_user_id: this.userId,
          p_points_to_add: pointsToAward,
          p_action: action
        })

      if (statsError) throw statsError

      // Check for new badges
      const newBadges = await this.checkAndAwardBadges()

      // Check for trust level upgrade
      const trustLevelChange = await this.checkTrustLevel(updatedStats.total_points)

      // Create notifications for achievements
      const notifications = []
      
      if (newBadges.length > 0) {
        for (const badge of newBadges) {
          notifications.push({
            user_id: this.userId,
            type: 'badge_earned',
            title: 'New Badge Earned!',
            message: `You've earned the ${badge.name} badge!`,
            metadata: { badge_id: badge.id }
          })
        }
      }

      if (trustLevelChange) {
        notifications.push({
          user_id: this.userId,
          type: 'trust_level_upgrade',
          title: 'Trust Level Upgraded!',
          message: `Congratulations! You've reached ${trustLevelChange.name} status!`,
          metadata: { new_level: trustLevelChange.level }
        })
      }

      // Send notifications
      if (notifications.length > 0) {
        await supabase
          .from('notifications')
          .insert(notifications)
      }

      return {
        success: true,
        pointsEarned: pointsToAward,
        totalPoints: updatedStats.total_points,
        newBadges,
        trustLevelChange,
        transaction
      }

    } catch (error) {
      console.error('Error awarding points:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Check and award badges based on user stats
   */
  async checkAndAwardBadges() {
    try {
      // Get current user stats
      const { data: stats, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', this.userId)
        .single()

      if (statsError) throw statsError

      // Get user's existing badges
      const { data: existingBadges, error: badgesError } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', this.userId)

      if (badgesError) throw badgesError

      const existingBadgeIds = existingBadges.map(b => b.badge_id)
      const newBadges = []

      // Check each badge condition
      for (const [key, badge] of Object.entries(BADGES)) {
        if (!existingBadgeIds.includes(badge.id)) {
          // Evaluate condition
          const conditionMet = this.evaluateBadgeCondition(badge.condition, stats)
          
          if (conditionMet) {
            // Award badge
            const { error: awardError } = await supabase
              .from('user_badges')
              .insert({
                user_id: this.userId,
                badge_id: badge.id,
                badge_name: badge.name,
                badge_description: badge.description,
                badge_icon: badge.icon,
                earned_at: new Date().toISOString()
              })

            if (!awardError) {
              newBadges.push(badge)
              
              // Award bonus points for badge
              await this.awardBonusPoints(badge.points, `Badge earned: ${badge.name}`)
            }
          }
        }
      }

      return newBadges

    } catch (error) {
      console.error('Error checking badges:', error)
      return []
    }
  }

  /**
   * Evaluate badge condition
   */
  evaluateBadgeCondition(condition, stats) {
    try {
      // Simple evaluation - in production, use a safe evaluator
      // This is a simplified example
      const parts = condition.split(' ')
      const field = parts[0]
      const operator = parts[1]
      const value = parseInt(parts[2])

      const statValue = stats[field] || 0

      switch (operator) {
        case '>=':
          return statValue >= value
        case '>':
          return statValue > value
        case '===':
          return statValue === value
        case '==':
          return statValue == value
        default:
          return false
      }
    } catch (error) {
      console.error('Error evaluating condition:', error)
      return false
    }
  }

  /**
   * Check and update trust level
   */
  async checkTrustLevel(totalPoints) {
    try {
      const currentLevel = this.getTrustLevelByPoints(totalPoints)
      
      // Get user's current trust level
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('trust_level')
        .eq('id', this.userId)
        .single()

      if (userError) throw userError

      // Check if trust level should be upgraded
      if (currentLevel.level > (userData.trust_level || 0)) {
        // Update user's trust level
        const { error: updateError } = await supabase
          .from('users')
          .update({
            trust_level: currentLevel.level,
            trust_level_name: currentLevel.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', this.userId)

        if (updateError) throw updateError

        return currentLevel
      }

      return null

    } catch (error) {
      console.error('Error checking trust level:', error)
      return null
    }
  }

  /**
   * Get trust level by points
   */
  getTrustLevelByPoints(points) {
    let currentLevel = TRUST_LEVELS.NEW_MEMBER

    for (const [key, level] of Object.entries(TRUST_LEVELS)) {
      if (points >= level.minPoints) {
        currentLevel = level
      }
    }

    return currentLevel
  }

  /**
   * Award bonus points (for badges, etc)
   */
  async awardBonusPoints(points, reason) {
    try {
      await supabase
        .from('points_transactions')
        .insert({
          user_id: this.userId,
          action: 'BONUS',
          points,
          metadata: { reason },
          created_at: new Date().toISOString()
        })

      await supabase
        .rpc('update_user_points', {
          p_user_id: this.userId,
          p_points_to_add: points,
          p_action: 'BONUS'
        })

    } catch (error) {
      console.error('Error awarding bonus points:', error)
    }
  }

  /**
   * Handle daily check-in
   */
  async handleDailyCheckIn() {
    try {
      // Check if already checked in today
      const today = new Date().toISOString().split('T')[0]
      
      const { data: existingCheckIn, error: checkError } = await supabase
        .from('daily_check_ins')
        .select('*')
        .eq('user_id', this.userId)
        .eq('check_in_date', today)
        .single()

      if (existingCheckIn) {
        return {
          success: false,
          message: 'Already checked in today'
        }
      }

      // Get yesterday's check-in for streak
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      const { data: yesterdayCheckIn } = await supabase
        .from('daily_check_ins')
        .select('streak_count')
        .eq('user_id', this.userId)
        .eq('check_in_date', yesterdayStr)
        .single()

      const currentStreak = yesterdayCheckIn ? yesterdayCheckIn.streak_count + 1 : 1

      // Record check-in
      const { error: insertError } = await supabase
        .from('daily_check_ins')
        .insert({
          user_id: this.userId,
          check_in_date: today,
          streak_count: currentStreak,
          created_at: new Date().toISOString()
        })

      if (insertError) throw insertError

      // Award points for check-in
      const checkInResult = await this.awardPoints('DAILY_CHECK_IN')

      // Check for streak bonuses
      const streakBonuses = []
      if (currentStreak === 7) {
        await this.awardPoints('STREAK_7_DAYS')
        streakBonuses.push('7-day streak bonus!')
      } else if (currentStreak === 30) {
        await this.awardPoints('STREAK_30_DAYS')
        streakBonuses.push('30-day streak bonus!')
      } else if (currentStreak === 100) {
        await this.awardPoints('STREAK_100_DAYS')
        streakBonuses.push('100-day streak bonus!')
      }

      // Update user stats
      await supabase
        .from('user_stats')
        .update({
          current_streak: currentStreak,
          longest_streak: supabase.sql`GREATEST(longest_streak, ${currentStreak})`,
          last_check_in: today
        })
        .eq('user_id', this.userId)

      return {
        success: true,
        currentStreak,
        pointsEarned: checkInResult.pointsEarned,
        streakBonuses,
        totalPoints: checkInResult.totalPoints
      }

    } catch (error) {
      console.error('Error handling check-in:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Get leaderboard
   */
  static async getLeaderboard(period = 'week', limit = 10) {
    try {
      let dateFilter = new Date()
      
      switch (period) {
        case 'day':
          dateFilter.setDate(dateFilter.getDate() - 1)
          break
        case 'week':
          dateFilter.setDate(dateFilter.getDate() - 7)
          break
        case 'month':
          dateFilter.setMonth(dateFilter.getMonth() - 1)
          break
        case 'all':
          dateFilter = new Date('2020-01-01')
          break
      }

      const { data: leaderboard, error } = await supabase
        .from('points_transactions')
        .select(`
          user_id,
          users (
            username,
            avatar_url,
            trust_level_name,
            is_captain
          )
        `)
        .gte('created_at', dateFilter.toISOString())
        .order('points', { ascending: false })
        .limit(limit)

      if (error) throw error

      // Aggregate points by user
      const userPoints = {}
      
      for (const transaction of leaderboard) {
        if (!userPoints[transaction.user_id]) {
          userPoints[transaction.user_id] = {
            user_id: transaction.user_id,
            ...transaction.users,
            points: 0
          }
        }
        userPoints[transaction.user_id].points += transaction.points
      }

      // Sort and return top users
      const sortedLeaderboard = Object.values(userPoints)
        .sort((a, b) => b.points - a.points)
        .slice(0, limit)
        .map((user, index) => ({
          ...user,
          rank: index + 1
        }))

      return sortedLeaderboard

    } catch (error) {
      console.error('Error getting leaderboard:', error)
      return []
    }
  }
}

/**
 * Community moderation functions
 */
export class CommunityModeration {
  /**
   * Check if post requires approval
   */
  static async requiresApproval(userId) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('trust_level')
        .eq('id', userId)
        .single()

      if (error) throw error

      const trustLevel = Object.values(TRUST_LEVELS).find(
        level => level.level === (user.trust_level || 0)
      )

      return trustLevel.postApprovalRequired

    } catch (error) {
      console.error('Error checking approval requirement:', error)
      return true // Default to requiring approval
    }
  }

  /**
   * Check daily post limit
   */
  static async checkDailyPostLimit(userId) {
    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('trust_level')
        .eq('id', userId)
        .single()

      if (userError) throw userError

      const trustLevel = Object.values(TRUST_LEVELS).find(
        level => level.level === (user.trust_level || 0)
      )

      if (trustLevel.dailyPostLimit === -1) {
        return { allowed: true, remaining: -1 }
      }

      // Count today's posts
      const today = new Date().toISOString().split('T')[0]
      
      const { count, error: countError } = await supabase
        .from('fishing_reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', `${today}T00:00:00`)

      if (countError) throw countError

      return {
        allowed: count < trustLevel.dailyPostLimit,
        remaining: trustLevel.dailyPostLimit - count
      }

    } catch (error) {
      console.error('Error checking post limit:', error)
      return { allowed: false, remaining: 0 }
    }
  }

  /**
   * Check if user can moderate
   */
  static async canModerate(userId) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('trust_level')
        .eq('id', userId)
        .single()

      if (error) throw error

      const trustLevel = Object.values(TRUST_LEVELS).find(
        level => level.level === (user.trust_level || 0)
      )

      return trustLevel.permissions.includes('moderate')

    } catch (error) {
      console.error('Error checking moderation permission:', error)
      return false
    }
  }
}

/**
 * API endpoints for the points system
 */
export async function handleCommunityAPI(req, res) {
  const { action, userId, ...params } = req.body

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' })
  }

  const pointsManager = new PointsManager(userId)

  switch (action) {
    case 'awardPoints':
      const pointsResult = await pointsManager.awardPoints(
        params.pointsAction,
        params.metadata
      )
      return res.json(pointsResult)

    case 'dailyCheckIn':
      const checkInResult = await pointsManager.handleDailyCheckIn()
      return res.json(checkInResult)

    case 'getLeaderboard':
      const leaderboard = await PointsManager.getLeaderboard(
        params.period || 'week',
        params.limit || 10
      )
      return res.json(leaderboard)

    case 'getUserStats':
      const { data: stats, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      return res.json(stats || {})

    case 'getUserBadges':
      const { data: badges, error: badgesError } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })
      
      return res.json(badges || [])

    default:
      return res.status(400).json({ error: 'Invalid action' })
  }
}

/**
 * React hooks for community features
 */
export function usePoints(userId) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    const fetchStats = async () => {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single()

      setStats(data)
      setLoading(false)
    }

    fetchStats()

    // Subscribe to changes
    const subscription = supabase
      .channel(`user_stats:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_stats',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        setStats(payload.new)
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId])

  return { stats, loading }
}

export function useLeaderboard(period = 'week') {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const data = await PointsManager.getLeaderboard(period)
      setLeaderboard(data)
      setLoading(false)
    }

    fetchLeaderboard()

    // Refresh every minute
    const interval = setInterval(fetchLeaderboard, 60000)

    return () => clearInterval(interval)
  }, [period])

  return { leaderboard, loading }
}

// Export everything
export default {
  PointsManager,
  CommunityModeration,
  handleCommunityAPI,
  usePoints,
  useLeaderboard,
  POINT_ACTIONS,
  TRUST_LEVELS,
  BADGES
}
