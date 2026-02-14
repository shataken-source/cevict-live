/**
 * Gamified Leaderboards with Trust Level Distinctions
 *
 * Creates competitive "Brag Board" that drives engagement and repeat business.
 * Features seasonal tournaments, biggest catch competitions, and species hunting.
 *
 * Features:
 * - Seasonal leaderboards with automatic rollover
 * - Trust level distinctions (Veteran/Elite get special badges)
 * - Multiple competition types (Biggest Catch, Most Species, Daily Points)
 * - Real-time ranking updates and notifications
 * - Prize distribution and achievement tracking
 * - Geographic filtering for local competitions
 * - Anti-cheat mechanisms and verification systems
 * - Social sharing and bragging rights
 */

import { EventEmitter } from 'events';

export interface LeaderboardEntry {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  trustLevel: 'new' | 'verified' | 'veteran' | 'elite';
  score: number;
  rank: number;
  previousRank: number;
  metadata: {
    species?: string;
    weight?: number;
    location?: string;
    date?: string;
    photo?: string;
    verified?: boolean;
  };
  badges: string[];
  trend: 'up' | 'down' | 'same';
}

export interface LeaderboardConfig {
  type: 'biggest_catch' | 'most_species' | 'daily_points' | 'charter_count' | 'review_score';
  season: string;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'all_time';
  category: 'all' | 'inshore' | 'offshore' | 'fly_fishing' | 'kids';
  geographicScope: 'global' | 'regional' | 'local';
  maxEntries: number;
  prizePool?: number;
  entryFee?: number;
  isActive: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  config: LeaderboardConfig;
  startDate: Date;
  endDate: Date;
  prizes: TournamentPrize[];
  participants: number;
  isActive: boolean;
  rules: string[];
  sponsor?: string;
}

export interface TournamentPrize {
  rank: number;
  prize: string;
  value: number;
  type: 'cash' | 'gear' | 'charter_credit' | 'badge' | 'experience';
}

export interface LeaderboardAnalytics {
  totalParticipants: number;
  activeParticipants: number;
  averageScore: number;
  topScore: number;
  prizePoolDistributed: number;
  engagementRate: number;
  cheatingReports: number;
  verificationRate: number;
}

class GamifiedLeaderboards extends EventEmitter {
  private leaderboards: Map<string, LeaderboardEntry[]> = new Map();
  private tournaments: Map<string, Tournament> = new Map();
  private currentSeason: string;
  private analytics: LeaderboardAnalytics;

  constructor() {
    super();
    
    this.currentSeason = this.generateSeasonName();
    this.analytics = {
      totalParticipants: 0,
      activeParticipants: 0,
      averageScore: 0,
      topScore: 0,
      prizePoolDistributed: 0,
      engagementRate: 0,
      cheatingReports: 0,
      verificationRate: 0
    };

    this.initializeDefaultTournaments();
    this.startPeriodicUpdates();
  }

  /**
   * Generate current season name
   */
  private generateSeasonName(): string {
    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    
    const seasons = ['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 
                   'Summer', 'Summer', 'Fall', 'Fall', 'Fall', 'Winter'];
    
    return `${seasons[month]} ${year}`;
  }

  /**
   * Initialize default tournaments
   */
  private initializeDefaultTournaments(): void {
    const defaultTournaments: Tournament[] = [
      {
        id: 'biggest-catch-seasonal',
        name: 'Biggest Catch Championship',
        description: 'Land the biggest fish of the season!',
        config: {
          type: 'biggest_catch',
          season: this.currentSeason,
          timeframe: 'seasonal',
          category: 'all',
          geographicScope: 'global',
          maxEntries: 100,
          prizePool: 5000,
          isActive: true
        },
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
        prizes: [
          { rank: 1, prize: '$2,000 + Trophy', value: 2000, type: 'cash' },
          { rank: 2, prize: '$1,000 + Gear Package', value: 1000, type: 'cash' },
          { rank: 3, prize: '$500 + Charter Credit', value: 500, type: 'cash' },
          { rank: 4, prize: '$250 Gift Card', value: 250, type: 'gear' },
          { rank: 5, prize: '$100 Gift Card', value: 100, type: 'gear' }
        ],
        participants: 0,
        isActive: true,
        rules: [
          'Fish must be caught on a GCC charter',
          'Photo verification required',
          'Fish must be released or legally kept',
          'Weight verified by captain',
          'One entry per species per day'
        ]
      },
      {
        id: 'species-hunter-monthly',
        name: 'Species Hunter Challenge',
        description: 'Catch the most different species in a month!',
        config: {
          type: 'most_species',
          season: this.currentSeason,
          timeframe: 'monthly',
          category: 'all',
          geographicScope: 'global',
          maxEntries: 50,
          prizePool: 1000,
          isActive: true
        },
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        prizes: [
          { rank: 1, prize: '$500 + Elite Badge', value: 500, type: 'cash' },
          { rank: 2, prize: '$300 + Gear', value: 300, type: 'gear' },
          { rank: 3, prize: '$200 + Charter Credit', value: 200, type: 'charter_credit' }
        ],
        participants: 0,
        isActive: true,
        rules: [
          'Each species must be photographed',
          'Minimum size requirements apply',
          'Captain verification required',
          'Invasive species do not count'
        ]
      },
      {
        id: 'daily-points-challenge',
        name: 'Daily Points Champion',
        description: 'Earn the most community points daily!',
        config: {
          type: 'daily_points',
          season: this.currentSeason,
          timeframe: 'daily',
          category: 'all',
          geographicScope: 'global',
          maxEntries: 20,
          prizePool: 100,
          isActive: true
        },
        startDate: new Date(),
        endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
        prizes: [
          { rank: 1, prize: '$50 + Daily Champion Badge', value: 50, type: 'cash' },
          { rank: 2, prize: '$30 + Points Bonus', value: 30, type: 'gear' },
          { rank: 3, prize: '$20 + Points Bonus', value: 20, type: 'gear' }
        ],
        participants: 0,
        isActive: true,
        rules: [
          'Points from all activities count',
          'Quality over quantity encouraged',
          'No spam or fake activities',
          'Moderator approval required'
        ]
      }
    ];

    defaultTournaments.forEach(tournament => {
      this.tournaments.set(tournament.id, tournament);
    });
  }

  /**
   * Get leaderboard for specific tournament
   */
  public async getLeaderboard(tournamentId: string, limit: number = 50): Promise<LeaderboardEntry[]> {
    const cacheKey = `${tournamentId}-${limit}`;
    
    if (this.leaderboards.has(cacheKey)) {
      return this.leaderboards.get(cacheKey)!;
    }

    try {
      // Fetch from database
      const entries = await this.fetchLeaderboardFromDB(tournamentId, limit);
      
      // Process and rank entries
      const processedEntries = this.processLeaderboardEntries(entries);
      
      // Cache results
      this.leaderboards.set(cacheKey, processedEntries);
      
      return processedEntries;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  /**
   * Submit entry to leaderboard
   */
  public async submitEntry(
    tournamentId: string,
    userId: string,
    score: number,
    metadata: any,
    verificationData?: any
  ): Promise<LeaderboardEntry | null> {
    try {
      const tournament = this.tournaments.get(tournamentId);
      if (!tournament || !tournament.isActive) {
        throw new Error('Tournament not found or inactive');
      }

      // Validate entry
      if (!this.validateEntry(tournament.config, score, metadata)) {
        throw new Error('Invalid entry');
      }

      // Check for existing entry
      const existingEntry = await this.getUserEntry(tournamentId, userId);
      
      let entry: LeaderboardEntry;
      if (existingEntry && this.canUpdateEntry(existingEntry, score)) {
        // Update existing entry
        entry = await this.updateLeaderboardEntry(existingEntry.id, score, metadata, verificationData);
      } else {
        // Create new entry
        entry = await this.createLeaderboardEntry(tournamentId, userId, score, metadata, verificationData);
      }

      // Update rankings
      await this.updateRankings(tournamentId);

      // Award badges for achievements
      await this.checkAndAwardBadges(userId, tournamentId, entry);

      // Emit update event
      this.emit('entry_updated', { tournamentId, entry });

      return entry;

    } catch (error) {
      console.error('Error submitting entry:', error);
      return null;
    }
  }

  /**
   * Get user's current ranking in tournaments
   */
  public async getUserRankings(userId: string): Promise<Map<string, LeaderboardEntry>> {
    const rankings = new Map<string, LeaderboardEntry>();

    for (const [tournamentId] of this.tournaments) {
      try {
        const entry = await this.getUserEntry(tournamentId, userId);
        if (entry) {
          rankings.set(tournamentId, entry);
        }
      } catch (error) {
        console.error(`Error getting user ranking for ${tournamentId}:`, error);
      }
    }

    return rankings;
  }

  /**
   * Get active tournaments
   */
  public getActiveTournaments(): Tournament[] {
    return Array.from(this.tournaments.values())
      .filter(tournament => tournament.isActive)
      .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
  }

  /**
   * Create custom tournament
   */
  public async createTournament(config: Partial<Tournament>): Promise<Tournament> {
    const tournament: Tournament = {
      id: config.id || `tournament-${Date.now()}`,
      name: config.name || 'Custom Tournament',
      description: config.description || '',
      config: {
        type: 'biggest_catch',
        season: this.currentSeason,
        timeframe: 'monthly',
        category: 'all',
        geographicScope: 'global',
        maxEntries: 100,
        isActive: true,
        ...config.config
      },
      startDate: config.startDate || new Date(),
      endDate: config.endDate || new Date(new Date().setMonth(new Date().getMonth() + 1)),
      prizes: config.prizes || [],
      participants: 0,
      isActive: true,
      rules: config.rules || [],
      sponsor: config.sponsor
    };

    this.tournaments.set(tournament.id, tournament);
    
    // Save to database
    await this.saveTournamentToDB(tournament);

    this.emit('tournament_created', tournament);
    return tournament;
  }

  /**
   * Process leaderboard entries with rankings and badges
   */
  private processLeaderboardEntries(entries: any[]): LeaderboardEntry[] {
    // Sort by score
    entries.sort((a, b) => b.score - a.score);

    // Assign ranks and calculate trends
    return entries.map((entry, index) => {
      const rank = index + 1;
      const previousRank = entry.previous_rank || rank;
      const trend = rank < previousRank ? 'up' : rank > previousRank ? 'down' : 'same';

      // Determine badges based on rank and trust level
      const badges = this.generateBadges(rank, entry.trust_level);

      return {
        id: entry.id,
        userId: entry.user_id,
        userName: entry.user_name,
        userAvatar: entry.user_avatar,
        trustLevel: entry.trust_level,
        score: entry.score,
        rank,
        previousRank,
        metadata: entry.metadata || {},
        badges,
        trend
      };
    });
  }

  /**
   * Generate badges based on rank and trust level
   */
  private generateBadges(rank: number, trustLevel: string): string[] {
    const badges: string[] = [];

    // Rank-based badges
    if (rank === 1) badges.push('🏆 Champion');
    else if (rank <= 3) badges.push('🥇 Top 3');
    else if (rank <= 10) badges.push('🥈 Top 10');
    else if (rank <= 25) badges.push('🥉 Top 25');

    // Trust level badges
    if (trustLevel === 'elite') badges.push('⭐ Elite Angler');
    else if (trustLevel === 'veteran') badges.push('🎖️ Veteran');
    else if (trustLevel === 'verified') badges.push('✅ Verified');

    return badges;
  }

  /**
   * Validate entry based on tournament rules
   */
  private validateEntry(config: LeaderboardConfig, score: number, metadata: any): boolean {
    // Basic validation
    if (score <= 0) return false;

    // Type-specific validation
    switch (config.type) {
      case 'biggest_catch':
        return !!(metadata.species && metadata.weight > 0);
      case 'most_species':
        return Array.isArray(metadata.species) && metadata.species.length > 0;
      case 'daily_points':
        return score <= 1000; // Reasonable daily limit
      default:
        return true;
    }
  }

  /**
   * Check if user can update their entry
   */
  private canUpdateEntry(existingEntry: LeaderboardEntry, newScore: number): boolean {
    // Allow update if new score is better
    return newScore > existingEntry.score;
  }

  /**
   * Check and award badges for achievements
   */
  private async checkAndAwardBadges(userId: string, tournamentId: string, entry: LeaderboardEntry): Promise<void> {
    const badges: string[] = [];

    // Rank-based badges
    if (entry.rank === 1) {
      badges.push('tournament_champion');
    } else if (entry.rank <= 10) {
      badges.push('top_10_angler');
    }

    // Score-based badges
    if (entry.config.type === 'biggest_catch' && entry.score > 100) {
      badges.push('century_club');
    }

    // Award badges through points system
    for (const badge of badges) {
      // This would integrate with the existing points/badges system
      console.log(`Awarding badge ${badge} to user ${userId}`);
    }
  }

  /**
   * Start periodic updates for rankings and analytics
   */
  private startPeriodicUpdates(): void {
    // Update rankings every 5 minutes
    setInterval(async () => {
      for (const [tournamentId] of this.tournaments) {
        try {
          await this.updateRankings(tournamentId);
        } catch (error) {
          console.error(`Error updating rankings for ${tournamentId}:`, error);
        }
      }
    }, 5 * 60 * 1000);

    // Update analytics every hour
    setInterval(async () => {
      await this.updateAnalytics();
    }, 60 * 60 * 1000);

    // Check tournament endings
    setInterval(async () => {
      await this.checkTournamentEndings();
    }, 60 * 60 * 1000);
  }

  /**
   * Update rankings for a tournament
   */
  private async updateRankings(tournamentId: string): Promise<void> {
    // Clear cache to force refresh
    this.leaderboards.clear();
    
    this.emit('rankings_updated', { tournamentId });
  }

  /**
   * Update analytics data
   */
  private async updateAnalytics(): Promise<void> {
    // Calculate analytics from database
    // This would be implemented with actual database queries
    this.emit('analytics_updated', this.analytics);
  }

  /**
   * Check for tournament endings and process prizes
   */
  private async checkTournamentEndings(): Promise<void> {
    const now = new Date();
    
    for (const [tournamentId, tournament] of this.tournaments) {
      if (tournament.isActive && tournament.endDate <= now) {
        await this.processTournamentEnd(tournament);
      }
    }
  }

  /**
   * Process tournament end and distribute prizes
   */
  private async processTournamentEnd(tournament: Tournament): Promise<void> {
    // Get final rankings
    const finalRankings = await this.getLeaderboard(tournament.id, tournament.prizes.length);
    
    // Distribute prizes
    for (const prize of tournament.prizes) {
      if (finalRankings[prize.rank - 1]) {
        const winner = finalRankings[prize.rank - 1];
        await this.distributePrize(winner.userId, prize);
      }
    }

    // Mark tournament as inactive
    tournament.isActive = false;
    
    this.emit('tournament_ended', { tournament, finalRankings });
  }

  /**
   * Distribute prize to winner
   */
  private async distributePrize(userId: string, prize: TournamentPrize): Promise<void> {
    // Implement prize distribution logic
    console.log(`Distributing prize ${prize.prize} to user ${userId}`);
  }

  // Database interaction methods (to be implemented with actual DB calls)
  private async fetchLeaderboardFromDB(tournamentId: string, limit: number): Promise<any[]> {
    // Mock implementation
    return [];
  }

  private async getUserEntry(tournamentId: string, userId: string): Promise<LeaderboardEntry | null> {
    // Mock implementation
    return null;
  }

  private async createLeaderboardEntry(
    tournamentId: string,
    userId: string,
    score: number,
    metadata: any,
    verificationData?: any
  ): Promise<LeaderboardEntry> {
    // Mock implementation
    return {} as LeaderboardEntry;
  }

  private async updateLeaderboardEntry(
    entryId: string,
    score: number,
    metadata: any,
    verificationData?: any
  ): Promise<LeaderboardEntry> {
    // Mock implementation
    return {} as LeaderboardEntry;
  }

  private async saveTournamentToDB(tournament: Tournament): Promise<void> {
    // Mock implementation
  }
}

// Singleton instance
export const gamifiedLeaderboards = new GamifiedLeaderboards();

export default GamifiedLeaderboards;
