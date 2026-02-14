/**
 * Enhanced Daily Check-In Rewards System
 * 
 * Transforms GCC from transactional booking platform into daily destination
 * through compelling streak-based rewards and gamification.
 * 
 * Streak Progression:
 * Day 1: +3 points (Base reward)
 * Day 7: +5 daily + 50 bonus (🔥 Fire badge)
 * Day 14: +7 daily + 100 bonus (Mystery lure unlock)
 * Day 30: +10 daily + 300 bonus ($10 charter credit)
 * Day 60: +15 daily + 500 bonus ($25 charter credit)
 * Day 100: +20 daily + 1000 bonus ($50 charter credit + 🏆 Centurion badge)
 * Day 365: +25 daily + 5000 bonus (FREE CHARTER + Year Legend badge)
 */

export interface CheckInStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastCheckIn: string;
  totalCheckIns: number;
  streakFreezesAvailable: number;
  milestones: MilestoneReward[];
  nextMilestone: MilestoneReward | null;
  protectedDays: number;
}

export interface MilestoneReward {
  day: number;
  dailyPoints: number;
  bonusPoints: number;
  reward: Reward;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface Reward {
  type: 'points' | 'badge' | 'charter_credit' | 'gear' | 'experience';
  value: number | string;
  description: string;
  imageUrl?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface CheckInResult {
  success: boolean;
  pointsEarned: number;
  streak: number;
  rewards: Reward[];
  milestones: MilestoneReward[];
  nextCheckIn: string;
  streakProtected: boolean;
  message: string;
}

export interface StreakFreeze {
  id: string;
  userId: string;
  appliedDate: string;
  expiresDate: string;
  reason: 'manual' | 'milestone';
  pointsCost: number;
}

export interface DailyCheckInStats {
  totalUsers: number;
  activeToday: number;
  averageStreak: number;
  longestCurrentStreak: number;
  streakDistribution: Record<string, number>;
  milestoneUnlocksToday: number;
  rewardsClaimedToday: number;
}

export class DailyCheckInRewards {
  private static instance: DailyCheckInRewards;
  private userStreaks: Map<string, CheckInStreak> = new Map();
  private streakFreezes: Map<string, StreakFreeze[]> = new Map();

  // Milestone rewards configuration
  private readonly MILESTONE_REWARDS: MilestoneReward[] = [
    {
      day: 1,
      dailyPoints: 3,
      bonusPoints: 0,
      reward: {
        type: 'points',
        value: 3,
        description: 'Daily check-in bonus',
        rarity: 'common',
      },
      unlocked: false,
    },
    {
      day: 7,
      dailyPoints: 5,
      bonusPoints: 50,
      reward: {
        type: 'badge',
        value: 'fire_streak',
        description: '🔥 Fire Badge - 7 day streak!',
        rarity: 'uncommon',
      },
      unlocked: false,
    },
    {
      day: 14,
      dailyPoints: 7,
      bonusPoints: 100,
      reward: {
        type: 'gear',
        value: 'mystery_lure',
        description: '🎣 Mystery lure unlock',
        rarity: 'rare',
      },
      unlocked: false,
    },
    {
      day: 30,
      dailyPoints: 10,
      bonusPoints: 300,
      reward: {
        type: 'charter_credit',
        value: 10,
        description: '$10 charter credit',
        rarity: 'epic',
      },
      unlocked: false,
    },
    {
      day: 60,
      dailyPoints: 15,
      bonusPoints: 500,
      reward: {
        type: 'charter_credit',
        value: 25,
        description: '$25 charter credit',
        rarity: 'epic',
      },
      unlocked: false,
    },
    {
      day: 100,
      dailyPoints: 20,
      bonusPoints: 1000,
      reward: {
        type: 'charter_credit',
        value: 50,
        description: '$50 charter credit',
        rarity: 'legendary',
      },
      unlocked: false,
    },
    {
      day: 365,
      dailyPoints: 25,
      bonusPoints: 5000,
      reward: {
        type: 'experience',
        value: 'free_charter',
        description: 'FREE CHARTER + Year Legend Badge',
        rarity: 'legendary',
      },
      unlocked: false,
    },
  ];

  public static getInstance(): DailyCheckInRewards {
    if (!DailyCheckInRewards.instance) {
      DailyCheckInRewards.instance = new DailyCheckInRewards();
    }
    return DailyCheckInRewards.instance;
  }

  private constructor() {
    this.initializeMilestones();
  }

  /**
   * Perform daily check-in for user
   */
  public async checkIn(userId: string): Promise<CheckInResult> {
    const userStreak = this.getUserStreak(userId);
    const today = new Date().toDateString();
    const lastCheckIn = new Date(userStreak.lastCheckIn).toDateString();

    // Check if already checked in today
    if (lastCheckIn === today) {
      return {
        success: false,
        pointsEarned: 0,
        streak: userStreak.currentStreak,
        rewards: [],
        milestones: [],
        nextCheckIn: this.getNextCheckInTime(),
        streakProtected: false,
        message: 'Already checked in today. Come back tomorrow!',
      };
    }

    // Check if streak is broken
    const daysSinceLastCheckIn = this.getDaysSince(userStreak.lastCheckIn);
    let streakProtected = false;

    if (daysSinceLastCheckIn > 1) {
      // Check if user has a streak freeze
      const hasFreeze = this.hasActiveStreakFreeze(userId);
      if (hasFreeze) {
        streakProtected = true;
        this.useStreakFreeze(userId);
      } else {
        // Streak broken, reset to 0
        userStreak.currentStreak = 0;
      }
    }

    // Increment streak
    userStreak.currentStreak++;
    userStreak.lastCheckIn = new Date().toISOString();
    userStreak.totalCheckIns++;

    // Calculate rewards
    const rewards: Reward[] = [];
    const milestones: MilestoneReward[] = [];
    let totalPoints = 0;

    // Get current milestone rewards
    const currentMilestone = this.getCurrentMilestone(userStreak.currentStreak);
    if (currentMilestone) {
      totalPoints += currentMilestone.dailyPoints;
      rewards.push(currentMilestone.reward);

      // Check for milestone bonus
      if (this.isMilestoneDay(userStreak.currentStreak)) {
        totalPoints += currentMilestone.bonusPoints;
        currentMilestone.unlocked = true;
        currentMilestone.unlockedAt = new Date().toISOString();
        milestones.push(currentMilestone);
        
        // Grant milestone protection days
        if (userStreak.currentStreak === 30) {
          userStreak.protectedDays = 1;
        } else if (userStreak.currentStreak === 100) {
          userStreak.protectedDays = 2;
        }
      }
    } else {
      // Default points for non-milestone days
      totalPoints += this.getDefaultPoints(userStreak.currentStreak);
    }

    // Update longest streak
    if (userStreak.currentStreak > userStreak.longestStreak) {
      userStreak.longestStreak = userStreak.currentStreak;
    }

    // Save streak data
    this.userStreaks.set(userId, userStreak);

    // Generate message
    const message = this.generateCheckInMessage(userStreak.currentStreak, rewards, milestones);

    return {
      success: true,
      pointsEarned: totalPoints,
      streak: userStreak.currentStreak,
      rewards,
      milestones,
      nextCheckIn: this.getNextCheckInTime(),
      streakProtected,
      message,
    };
  }

  /**
   * Purchase streak freeze
   */
  public async purchaseStreakFreeze(userId: string, points: number): Promise<boolean> {
    const FREEZE_COST = 50;
    
    if (points < FREEZE_COST) {
      throw new Error('Insufficient points for streak freeze');
    }

    const userStreak = this.getUserStreak(userId);
    
    // Only allow freeze if streak is at risk (missed yesterday)
    const daysSinceLastCheckIn = this.getDaysSince(userStreak.lastCheckIn);
    if (daysSinceLastCheckIn <= 1) {
      throw new Error('Streak freeze not needed - check in today to maintain streak');
    }

    const freeze: StreakFreeze = {
      id: crypto.randomUUID(),
      userId,
      appliedDate: new Date().toISOString(),
      expiresDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      reason: 'manual',
      pointsCost: FREEZE_COST,
    };

    if (!this.streakFreezes.has(userId)) {
      this.streakFreezes.set(userId, []);
    }
    this.streakFreezes.get(userId)!.push(freeze);

    return true;
  }

  /**
   * Get user's current streak information
   */
  public getUserStreak(userId: string): CheckInStreak {
    let streak = this.userStreaks.get(userId);
    
    if (!streak) {
      streak = {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastCheckIn: '',
        totalCheckIns: 0,
        streakFreezesAvailable: 0,
        milestones: [...this.MILESTONE_REWARDS],
        nextMilestone: this.MILESTONE_REWARDS[1], // Day 7 milestone
        protectedDays: 0,
      };
      this.userStreaks.set(userId, streak);
    }

    // Update next milestone
    streak.nextMilestone = this.getNextMilestone(streak.currentStreak);

    return streak;
  }

  /**
   * Get check-in status for user
   */
  public getCheckInStatus(userId: string): {
    canCheckIn: boolean;
    nextCheckIn: string;
    currentStreak: number;
    daysUntilNextMilestone: number;
    streakAtRisk: boolean;
    hasActiveFreeze: boolean;
  } {
    const streak = this.getUserStreak(userId);
    const today = new Date().toDateString();
    const lastCheckIn = new Date(streak.lastCheckIn).toDateString();
    
    const canCheckIn = lastCheckIn !== today;
    const streakAtRisk = this.getDaysSince(streak.lastCheckIn) === 1 && !canCheckIn;
    const hasActiveFreeze = this.hasActiveStreakFreeze(userId);
    
    const daysUntilNextMilestone = streak.nextMilestone 
      ? streak.nextMilestone.day - streak.currentStreak 
      : 0;

    return {
      canCheckIn,
      nextCheckIn: this.getNextCheckInTime(),
      currentStreak: streak.currentStreak,
      daysUntilNextMilestone,
      streakAtRisk,
      hasActiveFreeze,
    };
  }

  /**
   * Get leaderboard for streaks
   */
  public getStreakLeaderboard(limit: number = 50): {
    userId: string;
    currentStreak: number;
    longestStreak: number;
    totalCheckIns: number;
    rank: number;
  }[] {
    const streaks = Array.from(this.userStreaks.values())
      .sort((a, b) => b.currentStreak - a.currentStreak)
      .slice(0, limit);

    return streaks.map((streak, index) => ({
      userId: streak.userId,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalCheckIns: streak.totalCheckIns,
      rank: index + 1,
    }));
  }

  /**
   * Get system statistics
   */
  public getSystemStats(): DailyCheckInStats {
    const allStreaks = Array.from(this.userStreaks.values());
    const today = new Date().toDateString();
    
    const activeToday = allStreaks.filter(streak => 
      new Date(streak.lastCheckIn).toDateString() === today
    ).length;

    const averageStreak = allStreaks.length > 0 
      ? allStreaks.reduce((sum, streak) => sum + streak.currentStreak, 0) / allStreaks.length 
      : 0;

    const longestCurrentStreak = Math.max(...allStreaks.map(streak => streak.currentStreak), 0);

    // Streak distribution
    const streakDistribution: Record<string, number> = {
      '0': 0,
      '1-6': 0,
      '7-13': 0,
      '14-29': 0,
      '30-59': 0,
      '60-99': 0,
      '100+': 0,
    };

    allStreaks.forEach(streak => {
      if (streak.currentStreak === 0) streakDistribution['0']++;
      else if (streak.currentStreak <= 6) streakDistribution['1-6']++;
      else if (streak.currentStreak <= 13) streakDistribution['7-13']++;
      else if (streak.currentStreak <= 29) streakDistribution['14-29']++;
      else if (streak.currentStreak <= 59) streakDistribution['30-59']++;
      else if (streak.currentStreak <= 99) streakDistribution['60-99']++;
      else streakDistribution['100+']++;
    });

    return {
      totalUsers: allStreaks.length,
      activeToday,
      averageStreak: Math.round(averageStreak * 100) / 100,
      longestCurrentStreak,
      streakDistribution,
      milestoneUnlocksToday: 0, // Would need to track daily
      rewardsClaimedToday: activeToday,
    };
  }

  /**
   * Private helper methods
   */
  private initializeMilestones(): void {
    // Initialize milestone rewards for all users
    this.MILESTONE_REWARDS.forEach(milestone => {
      milestone.unlocked = false;
    });
  }

  private getCurrentMilestone(streak: number): MilestoneReward | null {
    return this.MILESTONE_REWARDS.find(m => m.day === streak) || null;
  }

  private isMilestoneDay(streak: number): boolean {
    return this.MILESTONE_REWARDS.some(m => m.day === streak);
  }

  private getDefaultPoints(streak: number): number {
    if (streak >= 365) return 25;
    if (streak >= 100) return 20;
    if (streak >= 60) return 15;
    if (streak >= 30) return 10;
    if (streak >= 14) return 7;
    if (streak >= 7) return 5;
    return 3;
  }

  private getNextMilestone(currentStreak: number): MilestoneReward | null {
    return this.MILESTONE_REWARDS.find(m => m.day > currentStreak) || null;
  }

  private getDaysSince(lastCheckIn: string): number {
    if (!lastCheckIn) return 999; // Never checked in
    
    const last = new Date(lastCheckIn);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    last.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - last.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  private getNextCheckInTime(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  }

  private hasActiveStreakFreeze(userId: string): boolean {
    const freezes = this.streakFreezes.get(userId) || [];
    const now = new Date();
    
    return freezes.some(freeze => {
      const expires = new Date(freeze.expiresDate);
      return expires > now;
    });
  }

  private useStreakFreeze(userId: string): void {
    const freezes = this.streakFreezes.get(userId) || [];
    const now = new Date();
    
    const activeFreeze = freezes.find(freeze => {
      const expires = new Date(freeze.expiresDate);
      return expires > now;
    });

    if (activeFreeze) {
      // Remove used freeze
      const index = freezes.indexOf(activeFreeze);
      freezes.splice(index, 1);
      this.streakFreezes.set(userId, freezes);
    }
  }

  private generateCheckInMessage(
    streak: number, 
    rewards: Reward[], 
    milestones: MilestoneReward[]
  ): string {
    let message = `🎉 Check-in complete! Current streak: ${streak} day${streak !== 1 ? 's' : ''}!`;
    
    if (milestones.length > 0) {
      const milestone = milestones[0];
      message += `\n\n🏆 MILESTONE ACHIEVED! ${milestone.reward.description}`;
      message += `\n🎁 Bonus: ${milestone.bonusPoints} points`;
    }
    
    if (rewards.length > 0) {
      const points = rewards.find(r => r.type === 'points');
      if (points) {
        message += `\n\n💰 Points earned: ${points.value}`;
      }
    }
    
    // Add encouragement for next milestone
    const nextMilestone = this.getNextMilestone(streak);
    if (nextMilestone) {
      const daysUntil = nextMilestone.day - streak;
      message += `\n\n🎯 ${daysUntil} day${daysUntil !== 1 ? 's' : ''} until next milestone: ${nextMilestone.reward.description}`;
    }
    
    return message;
  }

  /**
   * Get streak freeze options
   */
  public getStreakFreezeOptions(): {
    cost: number;
    description: string;
    duration: number; // hours
  }[] {
    return [
      {
        cost: 50,
        description: 'Protect your streak for 24 hours',
        duration: 24,
      },
    ];
  }

  /**
   * Check if user can claim streak protection
   */
  public canClaimStreakProtection(userId: string): boolean {
    const streak = this.getUserStreak(userId);
    return streak.protectedDays > 0 && this.getDaysSince(streak.lastCheckIn) === 1;
  }

  /**
   * Claim streak protection
   */
  public async claimStreakProtection(userId: string): Promise<boolean> {
    const streak = this.getUserStreak(userId);
    
    if (!this.canClaimStreakProtection(userId)) {
      throw new Error('Streak protection not available');
    }
    
    streak.protectedDays--;
    this.userStreaks.set(userId, streak);
    
    return true;
  }
}

export default DailyCheckInRewards;
