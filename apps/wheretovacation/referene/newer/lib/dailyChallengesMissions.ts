/**
 * Daily Challenges & Missions System
 * 
 * Drives daily engagement through gamified tasks and rewards users for
 * community participation and platform activities.
 * 
 * Daily Challenges (Resets at Midnight):
 * - Share your fishing forecast (+10 points)
 * - Comment on 3 fishing reports (+15 points)
 * - Vote on 5 catches (hot or not) (+10 points)
 * - Answer someone's fishing question (+20 points)
 * - Post a catch photo (+35 points)
 * - Complete ALL daily challenges (+100 BONUS)
 * 
 * Weekly Missions (Resets Every Monday):
 * - "Social Butterfly": Make 10 new connections (+150 pts)
 * - "Reporter": Post 5 fishing reports this week (+200 pts)
 * - "Helpful Hand": Get 10 helpful votes on your comments (+100 pts)
 * - "Explorer": Fish 3 different locations (+150 pts)
 * - "Species Hunter": Catch 5 different species (+250 pts)
 * 
 * Monthly Epic Missions:
 * - "Century Club": Catch 100 fish this month (+1000 pts + badge)
 * - "Grand Slam": Catch redfish, trout, and flounder in same month (+500 pts)
 * - "Community Leader": Get 100 total helpful votes (+750 pts)
 * - "Captain's Choice": Book a charter and post review (+300 pts + $10 credit)
 */

export interface Challenge {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  category: 'social' | 'content' | 'community' | 'exploration' | 'achievement';
  title: string;
  description: string;
  points: number;
  icon: string;
  requirements: ChallengeRequirement[];
  progress: ChallengeProgress;
  resetSchedule: 'daily' | 'weekly' | 'monthly';
  isActive: boolean;
  startDate: string;
  endDate: string;
}

export interface ChallengeRequirement {
  type: 'post' | 'comment' | 'vote' | 'connect' | 'catch' | 'location' | 'species' | 'booking' | 'review';
  target: number;
  current: number;
  description: string;
}

export interface ChallengeProgress {
  userId: string;
  challengeId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'expired';
  completedAt?: string;
  progress: number; // 0-100 percentage
  requirementsProgress: Record<string, number>;
  rewardsClaimed: boolean;
  claimedAt?: string;
}

export interface UserMissionStatus {
  userId: string;
  dailyChallenges: ChallengeProgress[];
  weeklyMissions: ChallengeProgress[];
  monthlyMissions: ChallengeProgress[];
  streakDays: number;
  totalCompleted: number;
  currentStreakBonus: number;
  nextBonusMilestone: number;
}

export interface ChallengeReward {
  type: 'points' | 'badge' | 'charter_credit' | 'gear' | 'experience';
  value: number | string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface ChallengeCompletion {
  userId: string;
  challengeId: string;
  completedAt: string;
  pointsEarned: number;
  rewards: ChallengeReward[];
  streakBonus: number;
  totalPoints: number;
  celebration: string;
}

export class DailyChallengesMissions {
  private static instance: DailyChallengesMissions;
  private challenges: Map<string, Challenge> = new Map();
  private userProgress: Map<string, UserMissionStatus> = new Map();
  private completions: ChallengeCompletion[] = [];

  // Challenge definitions
  private readonly DAILY_CHALLENGES: Omit<Challenge, 'id' | 'progress' | 'isActive' | 'startDate' | 'endDate'>[] = [
    {
      type: 'daily',
      category: 'social',
      title: 'Share Your Forecast',
      description: 'Share today\'s fishing forecast with your network',
      points: 10,
      icon: '📊',
      requirements: [
        {
          type: 'post',
          target: 1,
          current: 0,
          description: 'Share fishing forecast',
        },
      ],
      resetSchedule: 'daily',
    },
    {
      type: 'daily',
      category: 'community',
      title: 'Community Commenter',
      description: 'Comment on 3 fishing reports from other anglers',
      points: 15,
      icon: '💬',
      requirements: [
        {
          type: 'comment',
          target: 3,
          current: 0,
          description: 'Comments on reports',
        },
      ],
      resetSchedule: 'daily',
    },
    {
      type: 'daily',
      category: 'social',
      title: 'Hot or Not',
      description: 'Vote on 5 catch photos (hot or not)',
      points: 10,
      icon: '🔥',
      requirements: [
        {
          type: 'vote',
          target: 5,
          current: 0,
          description: 'Votes on catches',
        },
      ],
      resetSchedule: 'daily',
    },
    {
      type: 'daily',
      category: 'community',
      title: 'Helpful Angler',
      description: 'Answer someone\'s fishing question in the forums',
      points: 20,
      icon: '🤝',
      requirements: [
        {
          type: 'comment',
          target: 1,
          current: 0,
          description: 'Helpful answers',
        },
      ],
      resetSchedule: 'daily',
    },
    {
      type: 'daily',
      category: 'content',
      title: 'Catch of the Day',
      description: 'Post a photo of your catch',
      points: 35,
      icon: '🎣',
      requirements: [
        {
          type: 'post',
          target: 1,
          current: 0,
          description: 'Catch photos posted',
        },
      ],
      resetSchedule: 'daily',
    },
  ];

  private readonly WEEKLY_MISSIONS: Omit<Challenge, 'id' | 'progress' | 'isActive' | 'startDate' | 'endDate'>[] = [
    {
      type: 'weekly',
      category: 'social',
      title: 'Social Butterfly',
      description: 'Make 10 new connections with other anglers',
      points: 150,
      icon: '🦋',
      requirements: [
        {
          type: 'connect',
          target: 10,
          current: 0,
          description: 'New connections',
        },
      ],
      resetSchedule: 'weekly',
    },
    {
      type: 'weekly',
      category: 'content',
      title: 'Field Reporter',
      description: 'Post 5 detailed fishing reports this week',
      points: 200,
      icon: '📝',
      requirements: [
        {
          type: 'post',
          target: 5,
          current: 0,
          description: 'Fishing reports',
        },
      ],
      resetSchedule: 'weekly',
    },
    {
      type: 'weekly',
      category: 'community',
      title: 'Helpful Hand',
      description: 'Get 10 helpful votes on your comments and answers',
      points: 100,
      icon: '👍',
      requirements: [
        {
          type: 'comment',
          target: 10,
          current: 0,
          description: 'Helpful votes received',
        },
      ],
      resetSchedule: 'weekly',
    },
    {
      type: 'weekly',
      category: 'exploration',
      title: 'Explorer',
      description: 'Fish at 3 different locations this week',
      points: 150,
      icon: '🗺️',
      requirements: [
        {
          type: 'location',
          target: 3,
          current: 0,
          description: 'Different locations fished',
        },
      ],
      resetSchedule: 'weekly',
    },
    {
      type: 'weekly',
      category: 'achievement',
      title: 'Species Hunter',
      description: 'Catch 5 different species of fish this week',
      points: 250,
      icon: '🐟',
      requirements: [
        {
          type: 'species',
          target: 5,
          current: 0,
          description: 'Different species caught',
        },
      ],
      resetSchedule: 'weekly',
    },
  ];

  private readonly MONTHLY_MISSIONS: Omit<Challenge, 'id' | 'progress' | 'isActive' | 'startDate' | 'endDate'>[] = [
    {
      type: 'monthly',
      category: 'achievement',
      title: 'Century Club',
      description: 'Catch 100 fish this month',
      points: 1000,
      icon: '💯',
      requirements: [
        {
          type: 'catch',
          target: 100,
          current: 0,
          description: 'Total fish caught',
        },
      ],
      resetSchedule: 'monthly',
    },
    {
      type: 'monthly',
      category: 'achievement',
      title: 'Grand Slam',
      description: 'Catch redfish, speckled trout, and flounder in the same month',
      points: 500,
      icon: '🏆',
      requirements: [
        {
          type: 'species',
          target: 3,
          current: 0,
          description: 'Target species caught',
        },
      ],
      resetSchedule: 'monthly',
    },
    {
      type: 'monthly',
      category: 'community',
      title: 'Community Leader',
      description: 'Get 100 total helpful votes on your contributions',
      points: 750,
      icon: '👑',
      requirements: [
        {
          type: 'comment',
          target: 100,
          current: 0,
          description: 'Helpful votes received',
        },
      ],
      resetSchedule: 'monthly',
    },
    {
      type: 'monthly',
      category: 'achievement',
      title: 'Captain\'s Choice',
      description: 'Book a charter through GCC and post a review',
      points: 300,
      icon: '⚓',
      requirements: [
        {
          type: 'booking',
          target: 1,
          current: 0,
          description: 'Charter bookings',
        },
        {
          type: 'review',
          target: 1,
          current: 0,
          description: 'Charter reviews posted',
        },
      ],
      resetSchedule: 'monthly',
    },
  ];

  public static getInstance(): DailyChallengesMissions {
    if (!DailyChallengesMissions.instance) {
      DailyChallengesMissions.instance = new DailyChallengesMissions();
    }
    return DailyChallengesMissions.instance;
  }

  private constructor() {
    this.initializeChallenges();
    this.startResetScheduler();
  }

  /**
   * Get available challenges for user
   */
  public getAvailableChallenges(userId: string): {
    daily: Challenge[];
    weekly: Challenge[];
    monthly: Challenge[];
  } {
    const userStatus = this.getUserMissionStatus(userId);
    const now = new Date();

    // Filter active challenges
    const daily = this.getActiveChallenges('daily', now);
    const weekly = this.getActiveChallenges('weekly', now);
    const monthly = this.getActiveChallenges('monthly', now);

    // Merge with user progress
    return {
      daily: this.mergeWithProgress(daily, userStatus.dailyChallenges),
      weekly: this.mergeWithProgress(weekly, userStatus.weeklyMissions),
      monthly: this.mergeWithProgress(monthly, userStatus.monthlyMissions),
    };
  }

  /**
   * Update user progress on challenge
   */
  public updateProgress(
    userId: string,
    actionType: string,
    count: number = 1
  ): ChallengeCompletion[] {
    const userStatus = this.getUserMissionStatus(userId);
    const completions: ChallengeCompletion[] = [];

    // Update all relevant challenges
    const allChallenges = [
      ...userStatus.dailyChallenges,
      ...userStatus.weeklyMissions,
      ...userStatus.monthlyMissions,
    ];

    for (const progress of allChallenges) {
      if (progress.status === 'completed') continue;

      const challenge = this.challenges.get(progress.challengeId);
      if (!challenge) continue;

      // Check if this action affects this challenge
      let updated = false;
      for (const requirement of challenge.requirements) {
        if (requirement.type === actionType) {
          requirement.current = Math.min(requirement.target, requirement.current + count);
          updated = true;
        }
      }

      if (updated) {
        // Calculate new progress percentage
        const totalRequirements = challenge.requirements.length;
        const completedRequirements = challenge.requirements.filter(r => r.current >= r.target).length;
        progress.progress = Math.round((completedRequirements / totalRequirements) * 100);

        // Check if challenge is completed
        if (progress.progress === 100 && (progress.status === 'not_started' || progress.status === 'in_progress' || progress.status === 'expired')) {
          progress.status = 'completed';
          progress.completedAt = new Date().toISOString();

          // Generate completion
          const completion = this.generateCompletion(userId, challenge, userStatus.streakDays);
          completions.push(completion);

          // Update streak
          this.updateStreak(userId, challenge.type);
        }

        // Update status
        if (progress.progress > 0 && progress.status === 'not_started') {
          progress.status = 'in_progress';
        }
      }
    }

    // Check for daily completion bonus
    if (this.isAllDailyCompleted(userStatus.dailyChallenges)) {
      const dailyBonus = this.generateDailyBonus(userId);
      completions.push(dailyBonus);
    }

    this.userProgress.set(userId, userStatus);
    return completions;
  }

  /**
   * Claim challenge rewards
   */
  public claimRewards(userId: string, challengeId: string): ChallengeReward[] {
    const userStatus = this.getUserMissionStatus(userId);
    const progress = this.findProgress(userStatus, challengeId);
    
    if (!progress) {
      throw new Error('Challenge not found');
    }

    if (progress.status !== 'completed') {
      throw new Error('Challenge not completed');
    }

    if (progress.rewardsClaimed) {
      throw new Error('Rewards already claimed');
    }

    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    const rewards = this.generateRewards(challenge);
    
    progress.rewardsClaimed = true;
    progress.claimedAt = new Date().toISOString();
    
    this.userProgress.set(userId, userStatus);
    
    return rewards;
  }

  /**
   * Get user mission status
   */
  public getUserMissionStatus(userId: string): UserMissionStatus {
    let status = this.userProgress.get(userId);
    
    if (!status) {
      status = {
        userId,
        dailyChallenges: this.initializeProgress('daily'),
        weeklyMissions: this.initializeProgress('weekly'),
        monthlyMissions: this.initializeProgress('monthly'),
        streakDays: 0,
        totalCompleted: 0,
        currentStreakBonus: 0,
        nextBonusMilestone: 7,
      };
      this.userProgress.set(userId, status);
    }

    return status;
  }

  /**
   * Get challenge leaderboard
   */
  public getLeaderboard(type: 'daily' | 'weekly' | 'monthly', limit: number = 50): {
    userId: string;
    completed: number;
    points: number;
    rank: number;
  }[] {
    const leaderboard: {
      userId: string;
      completed: number;
      points: number;
    }[] = [];

    for (const [userId, status] of this.userProgress.entries()) {
      let completed = 0;
      let points = 0;

      const challenges = type === 'daily' ? status.dailyChallenges :
                       type === 'weekly' ? status.weeklyMissions :
                       status.monthlyMissions;

      for (const progress of challenges) {
        if (progress.status === 'completed') {
          completed++;
          const challenge = this.challenges.get(progress.challengeId);
          if (challenge) {
            points += challenge.points;
          }
        }
      }

      if (completed > 0) {
        leaderboard.push({ userId, completed, points });
      }
    }

    return leaderboard
      .sort((a, b) => b.points - a.points)
      .slice(0, limit)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  /**
   * Get system statistics
   */
  public getSystemStats(): {
    totalUsers: number;
    activeToday: number;
    dailyCompletionRate: number;
    weeklyCompletionRate: number;
    monthlyCompletionRate: number;
    totalCompletions: number;
    pointsAwarded: number;
  } {
    const totalUsers = this.userProgress.size;
    const now = new Date();
    const today = now.toDateString();

    let activeToday = 0;
    let dailyCompleted = 0;
    let weeklyCompleted = 0;
    let monthlyCompleted = 0;
    let totalCompletions = 0;
    let pointsAwarded = 0;

    for (const status of this.userProgress.values()) {
      // Check if active today
      const hasActivity = status.dailyChallenges.some(p => p.status === 'in_progress') ||
                         status.dailyChallenges.some(p => p.status === 'completed');
      if (hasActivity) activeToday++;

      // Calculate completion rates
      const dailyComplete = status.dailyChallenges.filter(p => p.status === 'completed').length;
      const weeklyComplete = status.weeklyMissions.filter(p => p.status === 'completed').length;
      const monthlyComplete = status.monthlyMissions.filter(p => p.status === 'completed').length;

      if (status.dailyChallenges.length > 0) {
        dailyCompleted += (dailyComplete / status.dailyChallenges.length) * 100;
      }
      if (status.weeklyMissions.length > 0) {
        weeklyCompleted += (weeklyComplete / status.weeklyMissions.length) * 100;
      }
      if (status.monthlyMissions.length > 0) {
        monthlyCompleted += (monthlyComplete / status.monthlyMissions.length) * 100;
      }

      totalCompletions += dailyComplete + weeklyComplete + monthlyComplete;

      // Calculate points
      for (const progress of [...status.dailyChallenges, ...status.weeklyMissions, ...status.monthlyMissions]) {
        if (progress.status === 'completed') {
          const challenge = this.challenges.get(progress.challengeId);
          if (challenge) {
            pointsAwarded += challenge.points;
          }
        }
      }
    }

    return {
      totalUsers,
      activeToday,
      dailyCompletionRate: totalUsers > 0 ? Math.round(dailyCompleted / totalUsers) : 0,
      weeklyCompletionRate: totalUsers > 0 ? Math.round(weeklyCompleted / totalUsers) : 0,
      monthlyCompletionRate: totalUsers > 0 ? Math.round(monthlyCompleted / totalUsers) : 0,
      totalCompletions,
      pointsAwarded,
    };
  }

  /**
   * Private helper methods
   */
  private initializeChallenges(): void {
    const now = new Date();
    
    // Initialize daily challenges
    this.DAILY_CHALLENGES.forEach((template, index) => {
      const challenge: Challenge = {
        ...template,
        id: `daily_${index}`,
        progress: {} as ChallengeProgress,
        isActive: true,
        startDate: this.getResetDate('daily', now).toISOString(),
        endDate: this.getResetDate('daily', new Date(now.getTime() + 24 * 60 * 60 * 1000)).toISOString(),
      };
      this.challenges.set(challenge.id, challenge);
    });

    // Initialize weekly missions
    this.WEEKLY_MISSIONS.forEach((template, index) => {
      const challenge: Challenge = {
        ...template,
        id: `weekly_${index}`,
        progress: {} as ChallengeProgress,
        isActive: true,
        startDate: this.getResetDate('weekly', now).toISOString(),
        endDate: this.getResetDate('weekly', new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)).toISOString(),
      };
      this.challenges.set(challenge.id, challenge);
    });

    // Initialize monthly missions
    this.MONTHLY_MISSIONS.forEach((template, index) => {
      const challenge: Challenge = {
        ...template,
        id: `monthly_${index}`,
        progress: {} as ChallengeProgress,
        isActive: true,
        startDate: this.getResetDate('monthly', now).toISOString(),
        endDate: this.getResetDate('monthly', new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)).toISOString(),
      };
      this.challenges.set(challenge.id, challenge);
    });
  }

  private initializeProgress(type: 'daily' | 'weekly' | 'monthly'): ChallengeProgress[] {
    const challenges = Array.from(this.challenges.values()).filter(c => c.type === type);
    
    return challenges.map(challenge => ({
      userId: '',
      challengeId: challenge.id,
      status: 'not_started' as const,
      progress: 0,
      requirementsProgress: {},
      rewardsClaimed: false,
    }));
  }

  private getActiveChallenges(type: 'daily' | 'weekly' | 'monthly', now: Date): Challenge[] {
    return Array.from(this.challenges.values()).filter(c => 
      c.type === type && 
      c.isActive && 
      new Date(c.startDate) <= now && 
      new Date(c.endDate) > now
    );
  }

  private mergeWithProgress(challenges: Challenge[], progressList: ChallengeProgress[]): Challenge[] {
    return challenges.map(challenge => {
      const progress = progressList.find(p => p.challengeId === challenge.id);
      if (progress) {
        // Merge requirements progress
        const updatedRequirements = challenge.requirements.map(req => ({
          ...req,
          current: progress.requirementsProgress[req.type] || 0,
        }));
        
        return {
          ...challenge,
          progress,
          requirements: updatedRequirements,
        };
      }
      return challenge;
    });
  }

  private findProgress(status: UserMissionStatus, challengeId: string): ChallengeProgress | null {
    const allProgress = [...status.dailyChallenges, ...status.weeklyMissions, ...status.monthlyMissions];
    return allProgress.find(p => p.challengeId === challengeId) || null;
  }

  private generateCompletion(userId: string, challenge: Challenge, streakDays: number): ChallengeCompletion {
    const streakBonus = this.calculateStreakBonus(challenge.type, streakDays);
    const totalPoints = challenge.points + streakBonus;
    
    const completion: ChallengeCompletion = {
      userId,
      challengeId: challenge.id,
      completedAt: new Date().toISOString(),
      pointsEarned: challenge.points,
      rewards: this.generateRewards(challenge),
      streakBonus,
      totalPoints,
      celebration: this.generateCelebration(challenge, totalPoints),
    };

    this.completions.push(completion);
    return completion;
  }

  private generateRewards(challenge: Challenge): ChallengeReward[] {
    const rewards: ChallengeReward[] = [
      {
        type: 'points',
        value: challenge.points,
        description: `${challenge.points} points`,
        rarity: challenge.points >= 200 ? 'epic' : challenge.points >= 100 ? 'rare' : 'common',
      },
    ];

    // Add special rewards for epic challenges
    if (challenge.points >= 500) {
      rewards.push({
        type: 'badge',
        value: `${challenge.title.replace(/\s+/g, '_').toLowerCase()}_master`,
        description: `🏆 ${challenge.title} Master Badge`,
        rarity: 'legendary',
      });
    }

    return rewards;
  }

  private calculateStreakBonus(challengeType: string, streakDays: number): number {
    if (challengeType === 'daily') {
      if (streakDays >= 30) return 50;
      if (streakDays >= 14) return 25;
      if (streakDays >= 7) return 10;
    }
    return 0;
  }

  private generateCelebration(challenge: Challenge, totalPoints: number): string {
    const celebrations = [
      `🎉 Challenge completed! You earned ${totalPoints} points!`,
      `🔥 Great job! ${totalPoints} points added to your total!`,
      `⭐ Achievement unlocked! ${totalPoints} points earned!`,
      `🎯 Target hit! ${totalPoints} points rewarded!`,
      `💪 Challenge conquered! ${totalPoints} points secured!`,
    ];
    
    return celebrations[Math.floor(Math.random() * celebrations.length)];
  }

  private isAllDailyCompleted(dailyChallenges: ChallengeProgress[]): boolean {
    return dailyChallenges.length > 0 && dailyChallenges.every(p => p.status === 'completed');
  }

  private generateDailyBonus(userId: string): ChallengeCompletion {
    const bonusPoints = 100;
    
    return {
      userId,
      challengeId: 'daily_bonus',
      completedAt: new Date().toISOString(),
      pointsEarned: bonusPoints,
      rewards: [
        {
          type: 'points',
          value: bonusPoints,
          description: 'Daily completion bonus',
          rarity: 'uncommon',
        },
      ],
      streakBonus: 0,
      totalPoints: bonusPoints,
      celebration: '🎊 DAILY SWEEP! All challenges completed! +100 bonus points!',
    };
  }

  private updateStreak(userId: string, challengeType: string): void {
    if (challengeType === 'daily') {
      const status = this.getUserMissionStatus(userId);
      status.streakDays++;
      status.totalCompleted++;
      this.userProgress.set(userId, status);
    }
  }

  private getResetDate(type: 'daily' | 'weekly' | 'monthly', fromDate: Date): Date {
    const date = new Date(fromDate);
    
    if (type === 'daily') {
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + 1);
    } else if (type === 'weekly') {
      const daysUntilMonday = (8 - date.getDay()) % 7 || 7;
      date.setDate(date.getDate() + daysUntilMonday);
      date.setHours(0, 0, 0, 0);
    } else if (type === 'monthly') {
      date.setMonth(date.getMonth() + 1);
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
    }
    
    return date;
  }

  private startResetScheduler(): void {
    // Reset challenges at midnight
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.resetDailyChallenges();
      }
      
      // Reset weekly challenges on Monday
      if (now.getDay() === 1 && now.getHours() === 0 && now.getMinutes() === 0) {
        this.resetWeeklyChallenges();
      }
      
      // Reset monthly challenges on 1st
      if (now.getDate() === 1 && now.getHours() === 0 && now.getMinutes() === 0) {
        this.resetMonthlyChallenges();
      }
    }, 60 * 1000); // Check every minute
  }

  private resetDailyChallenges(): void {
    console.log('Resetting daily challenges...');
    // Implementation would reset all daily challenge progress
  }

  private resetWeeklyChallenges(): void {
    console.log('Resetting weekly missions...');
    // Implementation would reset all weekly mission progress
  }

  private resetMonthlyChallenges(): void {
    console.log('Resetting monthly missions...');
    // Implementation would reset all monthly mission progress
  }
}

export default DailyChallengesMissions;
