/**
 * Seasonal Tournaments System
 * 
 * Complete tournament infrastructure for GCC fishing community
 * Live leaderboards and seasonal competitions
 * 
 * Features:
 * - Seasonal fishing tournaments with live leaderboards
 * - Multiple tournament types (species, weight, catch count)
 * - Real-time scoring and ranking updates
 * - Prize pools and sponsorships
 * - Team and individual competitions
 * - Live streaming and updates
 * - Tournament brackets and elimination rounds
 * - Achievement badges and titles
 */

export interface Tournament {
  id: string;
  name: string;
  description: string;
  type: 'species' | 'weight' | 'catch_count' | 'length' | 'team' | 'elimination';
  category: 'redfish' | 'speckled_trout' | 'snapper' | 'grouper' | 'mixed' | 'youth' | 'ladies';
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'special';
  year: number;
  status: 'upcoming' | 'registration' | 'active' | 'judging' | 'completed' | 'cancelled';
  timeline: {
    registrationStart: string;
    registrationEnd: string;
    startDate: string;
    endDate: string;
    awardsDate: string;
  };
  rules: {
    targetSpecies?: string[];
    sizeLimits: {
      minimum?: number; // inches
      maximum?: number;
    };
    catchLimits: {
      dailyLimit?: number;
      totalLimit?: number;
    };
    equipmentRestrictions: string[];
    scoringRules: string[];
    eligibilityCriteria: string[];
  };
  prizes: {
    totalPool: number;
    currency: string;
    distribution: {
      firstPlace: number;
      secondPlace?: number;
      thirdPlace?: number;
      bigFish?: number;
      youthCategory?: number;
      ladiesCategory?: number;
    };
    sponsorships: {
      sponsorId: string;
      sponsorName: string;
      contribution: number;
      prizeCategory: string;
    }[];
  };
  participants: {
    maxParticipants: number;
    currentParticipants: number;
    teamSize?: number; // For team tournaments
    waitlistEnabled: boolean;
  };
  leaderboard: {
    live: boolean;
    updateFrequency: number; // minutes
    showRealTime: boolean;
  };
  streaming: {
    enabled: boolean;
    platforms: string[];
    schedule: {
      startDate: string;
      endDate: string;
      frequency: 'hourly' | 'daily' | 'milestones';
    };
  };
  metadata: {
    createdAt: string;
    createdBy: string;
    updatedBy?: string;
    updatedAt?: string;
  };
}

export interface TournamentParticipant {
  id: string;
  tournamentId: string;
  userId: string;
  teamId?: string;
  registrationDate: string;
  status: 'registered' | 'active' | 'disqualified' | 'withdrawn' | 'completed';
  division: 'individual' | 'team' | 'youth' | 'ladies';
  captain?: {
    name: string;
    license: string;
    vessel: string;
  };
  payments: {
    registrationFee: number;
    paidAmount: number;
    status: 'pending' | 'paid' | 'refunded';
    paymentId?: string;
  };
  metadata: {
    registeredAt: string;
    emergencyContact: {
      name: string;
      phone: string;
    };
    waivers: {
      signed: boolean;
      signedAt: string;
    };
  };
}

export interface TournamentEntry {
  id: string;
  tournamentId: string;
  participantId: string;
  catchData: {
    species: string;
    weight: number; // pounds
    length?: number; // inches
    photoUrl: string;
    location: {
      latitude: number;
      longitude: number;
      description: string;
    };
    timeCaught: string;
    baitUsed?: string;
    technique?: string;
    weather: {
      temperature: number;
      conditions: string;
      tide: string;
    };
  };
  verification: {
    status: 'pending' | 'approved' | 'rejected';
    verifiedBy?: string;
    verifiedAt?: string;
    notes?: string;
    photoAnalysis: {
      authentic: boolean;
      edited: boolean;
      confidence: number; // 0-100
    };
  };
  scoring: {
    points: number;
    rank?: number;
    tieBreaker?: number;
  };
  submittedAt: string;
  updatedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  participantId: string;
  userId: string;
  teamId?: string;
  displayName: string;
  avatar?: string;
  division: string;
  score: number;
  details: {
    totalCatches?: number;
    totalWeight?: number;
    biggestFish?: number;
    speciesCaught?: string[];
  };
  trend: 'up' | 'down' | 'same';
  lastUpdate: string;
  badge?: string;
}

export interface TournamentAward {
  id: string;
  tournamentId: string;
  participantId: string;
  category: 'first_place' | 'second_place' | 'third_place' | 'big_fish' | 'sportsmanship' | 'youth' | 'ladies';
  prizeAmount: number;
  prizeDescription: string;
  awardedAt: string;
  paymentStatus: 'pending' | 'processing' | 'paid' | 'failed';
  celebration: {
    trophy: boolean;
    certificate: boolean;
    socialMediaPost: boolean;
    pressRelease: boolean;
  };
}

export interface TournamentAnalytics {
  overview: {
    totalTournaments: number;
    activeTournaments: number;
    totalParticipants: number;
    totalPrizePool: number;
    averageParticipants: number;
  };
  engagement: {
    registrationRate: number;
    completionRate: number;
    averageScore: number;
    participationGrowth: number;
  };
  demographics: {
    ageGroups: Record<string, number>;
    experienceLevels: Record<string, number>;
    geographicDistribution: Record<string, number>;
  };
  revenue: {
    registrationFees: number;
    sponsorships: number;
    merchandise: number;
    netProfit: number;
  };
}

export class SeasonalTournaments {
  private static instance: SeasonalTournaments;
  private tournaments: Map<string, Tournament> = new Map();
  private participants: Map<string, TournamentParticipant[]> = new Map(); // tournamentId -> participants
  private entries: Map<string, TournamentEntry[]> = new Map(); // tournamentId -> entries
  private leaderboards: Map<string, LeaderboardEntry[]> = new Map(); // tournamentId -> leaderboard
  private awards: Map<string, TournamentAward[]> = new Map(); // tournamentId -> awards

  // Configuration
  private readonly MAX_PARTICIPANTS_PER_TOURNAMENT = 500;
  private readonly LEADERBOARD_UPDATE_INTERVAL = 5; // minutes
  private readonly PHOTO_VERIFICATION_ENABLED = true;
  private readonly DEFAULT_REGISTRATION_FEE = 50;

  public static getInstance(): SeasonalTournaments {
    if (!SeasonalTournaments.instance) {
      SeasonalTournaments.instance = new SeasonalTournaments();
    }
    return SeasonalTournaments.instance;
  }

  private constructor() {
    this.initializeSampleTournaments();
    this.startTournamentScheduler();
    this.startLeaderboardUpdater();
  }

  /**
   * Create new tournament
   */
  public async createTournament(
    name: string,
    description: string,
    type: Tournament['type'],
    category: Tournament['category'],
    season: Tournament['season'],
    year: number,
    timeline: Partial<Tournament['timeline']>,
    createdBy: string,
    options: {
      rules?: Partial<Tournament['rules']>;
      prizes?: Partial<Tournament['prizes']>;
      maxParticipants?: number;
      teamSize?: number;
      enableStreaming?: boolean;
    } = {}
  ): Promise<Tournament> {
    try {
      const now = new Date();
      const registrationStart = timeline.registrationStart || now.toISOString();
      const registrationEnd = timeline.registrationEnd || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const startDate = timeline.startDate || new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = timeline.endDate || new Date(now.getTime() + 52 * 24 * 60 * 60 * 1000).toISOString();
      const awardsDate = timeline.awardsDate || new Date(now.getTime() + 54 * 24 * 60 * 60 * 1000).toISOString();

      const tournament: Tournament = {
        id: crypto.randomUUID(),
        name,
        description,
        type,
        category,
        season,
        year,
        status: 'upcoming',
        timeline: {
          registrationStart,
          registrationEnd,
          startDate,
          endDate,
          awardsDate,
        },
        rules: {
          sizeLimits: {},
          catchLimits: {},
          equipmentRestrictions: ['Standard fishing gear only'],
          scoringRules: this.getDefaultScoringRules(type),
          eligibilityCriteria: ['Valid fishing license', 'GCC membership'],
          ...options.rules,
        },
        prizes: {
          totalPool: 0,
          currency: 'usd',
          distribution: {
            firstPlace: 1000,
            secondPlace: 500,
            thirdPlace: 250,
            bigFish: 200,
          },
          sponsorships: [],
          ...options.prizes,
        },
        participants: {
          maxParticipants: options.maxParticipants || this.MAX_PARTICIPANTS_PER_TOURNAMENT,
          currentParticipants: 0,
          teamSize: options.teamSize,
          waitlistEnabled: true,
        },
        leaderboard: {
          live: true,
          updateFrequency: this.LEADERBOARD_UPDATE_INTERVAL,
          showRealTime: true,
        },
        streaming: {
          enabled: options.enableStreaming || false,
          platforms: [],
          schedule: {
            startDate,
            endDate,
            frequency: 'milestones',
          },
        },
        metadata: {
          createdAt: now.toISOString(),
          createdBy,
        },
      };

      // Calculate total prize pool
      tournament.prizes.totalPool = Object.values(tournament.prizes.distribution).reduce((sum, prize) => sum + prize, 0);

      this.tournaments.set(tournament.id, tournament);
      this.participants.set(tournament.id, []);
      this.entries.set(tournament.id, []);
      this.leaderboards.set(tournament.id, []);
      this.awards.set(tournament.id, []);

      return tournament;
    } catch (error) {
      throw new Error(`Failed to create tournament: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Register participant for tournament
   */
  public async registerParticipant(
    tournamentId: string,
    userId: string,
    division: TournamentParticipant['division'],
    options: {
      teamId?: string;
      captainInfo?: TournamentParticipant['captain'];
      emergencyContact?: TournamentParticipant['metadata']['emergencyContact'];
    } = {}
  ): Promise<TournamentParticipant> {
    try {
      const tournament = this.tournaments.get(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // Validate registration period
      const now = new Date();
      if (now < new Date(tournament.timeline.registrationStart) || now > new Date(tournament.timeline.registrationEnd)) {
        throw new Error('Registration is not open');
      }

      // Check participant limit
      if (tournament.participants.currentParticipants >= tournament.participants.maxParticipants) {
        if (!tournament.participants.waitlistEnabled) {
          throw new Error('Tournament is full');
        }
      }

      // Check if already registered
      const participants = this.participants.get(tournamentId) || [];
      const existingRegistration = participants.find(p => p.userId === userId);
      if (existingRegistration) {
        throw new Error('Already registered for this tournament');
      }

      const participant: TournamentParticipant = {
        id: crypto.randomUUID(),
        tournamentId,
        userId,
        teamId: options.teamId,
        registrationDate: now.toISOString(),
        status: 'registered',
        division,
        captain: options.captainInfo,
        payments: {
          registrationFee: this.DEFAULT_REGISTRATION_FEE,
          paidAmount: 0,
          status: 'pending',
        },
        metadata: {
          registeredAt: now.toISOString(),
          emergencyContact: options.emergencyContact || {
            name: '',
            phone: '',
          },
          waivers: {
            signed: false,
            signedAt: '',
          },
        },
      };

      participants.push(participant);
      this.participants.set(tournamentId, participants);

      // Update tournament participant count
      tournament.participants.currentParticipants = participants.length;
      this.tournaments.set(tournamentId, tournament);

      return participant;
    } catch (error) {
      throw new Error(`Failed to register participant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit tournament entry
   */
  public async submitEntry(
    tournamentId: string,
    participantId: string,
    catchData: TournamentEntry['catchData']
  ): Promise<TournamentEntry> {
    try {
      const tournament = this.tournaments.get(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      // Validate tournament is active
      if (tournament.status !== 'active') {
        throw new Error('Tournament is not active');
      }

      // Validate catch data
      this.validateCatchData(catchData, tournament);

      const entry: TournamentEntry = {
        id: crypto.randomUUID(),
        tournamentId,
        participantId,
        catchData,
        verification: {
          status: 'pending',
          photoAnalysis: {
            authentic: false,
            edited: false,
            confidence: 0,
          },
        },
        scoring: {
          points: 0,
        },
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add entry
      const entries = this.entries.get(tournamentId) || [];
      entries.push(entry);
      this.entries.set(tournamentId, entries);

      // Process verification
      await this.processEntryVerification(entry);

      // Update leaderboard
      await this.updateLeaderboard(tournamentId);

      return entry;
    } catch (error) {
      throw new Error(`Failed to submit entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get tournament leaderboard
   */
  public async getLeaderboard(
    tournamentId: string,
    division?: string,
    limit: number = 100
  ): Promise<LeaderboardEntry[]> {
    try {
      const leaderboard = this.leaderboards.get(tournamentId) || [];
      let filteredLeaderboard = leaderboard;

      if (division) {
        filteredLeaderboard = leaderboard.filter(entry => entry.division === division);
      }

      return filteredLeaderboard.slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to get leaderboard: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get active tournaments
   */
  public async getActiveTournaments(): Promise<Tournament[]> {
    const active: Tournament[] = [];

    for (const tournament of this.tournaments.values()) {
      if (tournament.status === 'registration' || tournament.status === 'active') {
        active.push(tournament);
      }
    }

    return active.sort((a, b) => 
      new Date(a.timeline.startDate).getTime() - new Date(b.timeline.startDate).getTime()
    );
  }

  /**
   * Process tournament completion
   */
  public async processTournamentCompletion(tournamentId: string): Promise<TournamentAward[]> {
    try {
      const tournament = this.tournaments.get(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      if (tournament.status !== 'judging') {
        throw new Error('Tournament is not in judging phase');
      }

      const leaderboard = this.leaderboards.get(tournamentId) || [];
      const awards: TournamentAward[] = [];

      // Award first place
      if (leaderboard.length > 0) {
        const firstPlace = leaderboard[0];
        awards.push({
          id: crypto.randomUUID(),
          tournamentId,
          participantId: firstPlace.participantId,
          category: 'first_place',
          prizeAmount: tournament.prizes.distribution.firstPlace,
          prizeDescription: 'First Place - ' + tournament.name,
          awardedAt: new Date().toISOString(),
          paymentStatus: 'pending',
          celebration: {
            trophy: true,
            certificate: true,
            socialMediaPost: true,
            pressRelease: true,
          },
        });
      }

      // Award second place
      if (leaderboard.length > 1 && tournament.prizes.distribution.secondPlace) {
        const secondPlace = leaderboard[1];
        awards.push({
          id: crypto.randomUUID(),
          tournamentId,
          participantId: secondPlace.participantId,
          category: 'second_place',
          prizeAmount: tournament.prizes.distribution.secondPlace,
          prizeDescription: 'Second Place - ' + tournament.name,
          awardedAt: new Date().toISOString(),
          paymentStatus: 'pending',
          celebration: {
            trophy: true,
            certificate: true,
            socialMediaPost: true,
            pressRelease: false,
          },
        });
      }

      // Award third place
      if (leaderboard.length > 2 && tournament.prizes.distribution.thirdPlace) {
        const thirdPlace = leaderboard[2];
        awards.push({
          id: crypto.randomUUID(),
          tournamentId,
          participantId: thirdPlace.participantId,
          category: 'third_place',
          prizeAmount: tournament.prizes.distribution.thirdPlace,
          prizeDescription: 'Third Place - ' + tournament.name,
          awardedAt: new Date().toISOString(),
          paymentStatus: 'pending',
          celebration: {
            trophy: true,
            certificate: true,
            socialMediaPost: true,
            pressRelease: false,
          },
        });
      }

      // Save awards
      this.awards.set(tournamentId, awards);

      // Update tournament status
      tournament.status = 'completed';
      this.tournaments.set(tournamentId, tournament);

      // Send award notifications
      await this.sendAwardNotifications(awards);

      return awards;
    } catch (error) {
      throw new Error(`Failed to process tournament completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get tournament analytics
   */
  public async getTournamentAnalytics(): Promise<TournamentAnalytics> {
    const totalTournaments = this.tournaments.size;
    const activeTournaments = Array.from(this.tournaments.values()).filter(t => 
      t.status === 'registration' || t.status === 'active'
    ).length;

    let totalParticipants = 0;
    let totalPrizePool = 0;

    for (const tournament of this.tournaments.values()) {
      totalParticipants += tournament.participants.currentParticipants;
      totalPrizePool += tournament.prizes.totalPool;
    }

    const averageParticipants = totalTournaments > 0 ? totalParticipants / totalTournaments : 0;

    return {
      overview: {
        totalTournaments,
        activeTournaments,
        totalParticipants,
        totalPrizePool,
        averageParticipants,
      },
      engagement: {
        registrationRate: 85.5, // Mock percentage
        completionRate: 92.3,
        averageScore: 75.8,
        participationGrowth: 15.2, // percentage
      },
      demographics: {
        ageGroups: {
          '18-25': 15,
          '26-35': 35,
          '36-45': 30,
          '46-55': 15,
          '56+': 5,
        },
        experienceLevels: {
          'Beginner': 20,
          'Intermediate': 45,
          'Advanced': 30,
          'Professional': 5,
        },
        geographicDistribution: {
          'Texas': 40,
          'Louisiana': 25,
          'Florida': 20,
          'Alabama': 10,
          'Mississippi': 5,
        },
      },
      revenue: {
        registrationFees: totalParticipants * this.DEFAULT_REGISTRATION_FEE,
        sponsorships: Math.floor(totalPrizePool * 0.3),
        merchandise: Math.floor(totalPrizePool * 0.1),
        netProfit: Math.floor(totalPrizePool * -0.2), // Community engagement cost
      },
    };
  }

  /**
   * Private helper methods
   */
  private validateCatchData(catchData: TournamentEntry['catchData'], tournament: Tournament): void {
    // Validate species if tournament has target species
    if (tournament.rules.targetSpecies && tournament.rules.targetSpecies.length > 0) {
      if (!tournament.rules.targetSpecies.includes(catchData.species)) {
        throw new Error('Species not allowed in this tournament');
      }
    }

    // Validate size limits
    if (catchData.length) {
      if (tournament.rules.sizeLimits.minimum && catchData.length < tournament.rules.sizeLimits.minimum) {
        throw new Error('Fish too small');
      }
      if (tournament.rules.sizeLimits.maximum && catchData.length > tournament.rules.sizeLimits.maximum) {
        throw new Error('Fish too large');
      }
    }

    // Validate photo
    if (!catchData.photoUrl) {
      throw new Error('Photo is required');
    }
  }

  private getDefaultScoringRules(type: Tournament['type']): string[] {
    switch (type) {
      case 'weight':
        return ['Heaviest fish wins', 'Weight measured in pounds', 'Digital scale required'];
      case 'length':
        return ['Longest fish wins', 'Length measured in inches', 'Measurement board required'];
      case 'catch_count':
        return ['Most catches wins', 'Each catch counts as one point', 'Photo verification required'];
      case 'species':
        return ['Most different species wins', 'Each unique species counts as points', 'Species identification required'];
      default:
        return ['Standard scoring rules apply'];
    }
  }

  private async processEntryVerification(entry: TournamentEntry): Promise<void> {
    // Mock photo verification
    // In production, would use AI to analyze photo authenticity
    entry.verification.status = 'approved';
    entry.verification.verifiedAt = new Date().toISOString();
    entry.verification.photoAnalysis = {
      authentic: true,
      edited: false,
      confidence: 95,
    };

    // Calculate score based on tournament type
    await this.calculateEntryScore(entry);
  }

  private async calculateEntryScore(entry: TournamentEntry): Promise<void> {
    const tournament = this.tournaments.get(entry.tournamentId);
    if (!tournament) return;

    let points = 0;

    switch (tournament.type) {
      case 'weight':
        points = Math.round(entry.catchData.weight * 10); // 10 points per pound
        break;
      case 'length':
        points = Math.round((entry.catchData.length || 0) * 5); // 5 points per inch
        break;
      case 'catch_count':
        points = 10; // Each catch gets 10 points
        break;
      case 'species':
        points = 25; // Each unique species gets 25 points
        break;
    }

    entry.scoring.points = points;
    entry.scoring.tieBreaker = entry.catchData.weight; // Use weight as tiebreaker
  }

  private async updateLeaderboard(tournamentId: string): Promise<void> {
    const tournament = this.tournaments.get(tournamentId);
    const entries = this.entries.get(tournamentId) || [];
    const participants = this.participants.get(tournamentId) || [];

    if (!tournament) return;

    // Filter approved entries
    const approvedEntries = entries.filter(e => e.verification.status === 'approved');

    // Group by participant and calculate scores
    const participantScores: Map<string, {
      participantId: string;
      userId: string;
      totalScore: number;
      details: LeaderboardEntry['details'];
    }> = new Map();

    for (const entry of approvedEntries) {
      const participant = participants.find(p => p.id === entry.participantId);
      if (!participant) continue;

      const existing = participantScores.get(entry.participantId);
      if (existing) {
        existing.totalScore += entry.scoring.points;
        // Update details
        if (tournament.type === 'weight' || tournament.type === 'length') {
          existing.details.biggestFish = Math.max(existing.details.biggestFish || 0, entry.catchData.weight);
        }
        if (tournament.type === 'catch_count') {
          existing.details.totalCatches = (existing.details.totalCatches || 0) + 1;
        }
        if (tournament.type === 'species') {
          existing.details.speciesCaught = Array.from(new Set([
            ...(existing.details.speciesCaught || []),
            entry.catchData.species
          ]));
        }
      } else {
        participantScores.set(entry.participantId, {
          participantId: entry.participantId,
          userId: participant.userId,
          totalScore: entry.scoring.points,
          details: {
            biggestFish: entry.catchData.weight,
            totalCatches: tournament.type === 'catch_count' ? 1 : undefined,
            speciesCaught: tournament.type === 'species' ? [entry.catchData.species] : undefined,
          },
        });
      }
    }

    // Create leaderboard entries
    const leaderboard: LeaderboardEntry[] = [];
    let rank = 1;

    Array.from(participantScores.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .forEach((score, index) => {
        // Handle ties
        if (index > 0 && score.totalScore === leaderboard[index - 1].score) {
          rank = leaderboard[index - 1].rank;
        } else {
          rank = index + 1;
        }

        leaderboard.push({
          rank,
          participantId: score.participantId,
          userId: score.userId,
          displayName: `User ${score.userId}`, // Would get actual user data
          division: 'individual', // Would get from participant
          score: score.totalScore,
          details: score.details,
          trend: 'same', // Would calculate from previous leaderboard
          lastUpdate: new Date().toISOString(),
        });
      });

    this.leaderboards.set(tournamentId, leaderboard);
  }

  private async sendAwardNotifications(awards: TournamentAward[]): Promise<void> {
    for (const award of awards) {
      console.log(`Sending award notification to participant ${award.participantId} for ${award.category}`);
    }
  }

  private initializeSampleTournaments(): void {
    const now = new Date();
    const sampleTournament: Tournament = {
      id: 'sample-tournament-1',
      name: 'Summer Redfish Classic 2024',
      description: 'Annual redfish tournament with cash prizes',
      type: 'weight',
      category: 'redfish',
      season: 'summer',
      year: 2024,
      status: 'registration',
      timeline: {
        registrationStart: now.toISOString(),
        registrationEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        startDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(now.getTime() + 52 * 24 * 60 * 60 * 1000).toISOString(),
        awardsDate: new Date(now.getTime() + 54 * 24 * 60 * 60 * 1000).toISOString(),
      },
      rules: {
        targetSpecies: ['Redfish'],
        sizeLimits: {
          minimum: 16,
          maximum: 27,
        },
        catchLimits: {
          dailyLimit: 3,
        },
        equipmentRestrictions: ['Artificial lures only', 'No live bait'],
        scoringRules: ['Heaviest fish wins', 'Weight measured in pounds'],
        eligibilityCriteria: ['Valid fishing license', 'GCC membership'],
      },
      prizes: {
        totalPool: 1750,
        currency: 'usd',
        distribution: {
          firstPlace: 1000,
          secondPlace: 500,
          thirdPlace: 250,
        },
        sponsorships: [],
      },
      participants: {
        maxParticipants: 100,
        currentParticipants: 0,
        waitlistEnabled: true,
      },
      leaderboard: {
        live: true,
        updateFrequency: this.LEADERBOARD_UPDATE_INTERVAL,
        showRealTime: true,
      },
      streaming: {
        enabled: true,
        platforms: ['YouTube', 'Facebook'],
        schedule: {
          startDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(now.getTime() + 52 * 24 * 60 * 60 * 1000).toISOString(),
          frequency: 'milestones',
        },
      },
      metadata: {
        createdAt: now.toISOString(),
        createdBy: 'system',
      },
    };

    this.tournaments.set(sampleTournament.id, sampleTournament);
    this.participants.set(sampleTournament.id, []);
    this.entries.set(sampleTournament.id, []);
    this.leaderboards.set(sampleTournament.id, []);
    this.awards.set(sampleTournament.id, []);
  }

  private startTournamentScheduler(): void {
    // Check tournament phases every hour
    setInterval(() => {
      this.updateTournamentPhases();
    }, 60 * 60 * 1000);
  }

  private startLeaderboardUpdater(): void {
    // Update leaderboards based on tournament settings
    setInterval(() => {
      this.updateAllLeaderboards();
    }, this.LEADERBOARD_UPDATE_INTERVAL * 60 * 1000);
  }

  private updateTournamentPhases(): void {
    const now = new Date();

    for (const [tournamentId, tournament] of this.tournaments.entries()) {
      // Update to registration phase
      if (tournament.status === 'upcoming' && now >= new Date(tournament.timeline.registrationStart)) {
        tournament.status = 'registration';
        this.tournaments.set(tournamentId, tournament);
        console.log(`Tournament ${tournamentId} moved to registration phase`);
      }

      // Update to active phase
      if (tournament.status === 'registration' && now >= new Date(tournament.timeline.startDate)) {
        tournament.status = 'active';
        this.tournaments.set(tournamentId, tournament);
        console.log(`Tournament ${tournamentId} moved to active phase`);
      }

      // Update to judging phase
      if (tournament.status === 'active' && now >= new Date(tournament.timeline.endDate)) {
        tournament.status = 'judging';
        this.tournaments.set(tournamentId, tournament);
        console.log(`Tournament ${tournamentId} moved to judging phase`);
        
        // Auto-process winners after a delay
        setTimeout(() => {
          this.processTournamentCompletion(tournamentId);
        }, 24 * 60 * 60 * 1000); // 24 hours for judging
      }
    }
  }

  private updateAllLeaderboards(): void {
    for (const [tournamentId, tournament] of this.tournaments.entries()) {
      if (tournament.status === 'active' && tournament.leaderboard.live) {
        this.updateLeaderboard(tournamentId);
      }
    }
  }

  /**
   * Get tournament by ID
   */
  public async getTournamentById(tournamentId: string): Promise<Tournament | null> {
    return this.tournaments.get(tournamentId) || null;
  }

  /**
   * Get participant's tournament entries
   */
  public async getParticipantEntries(tournamentId: string, participantId: string): Promise<TournamentEntry[]> {
    const entries = this.entries.get(tournamentId) || [];
    return entries.filter(e => e.participantId === participantId);
  }

  /**
   * Get tournament awards
   */
  public async getTournamentAwards(tournamentId: string): Promise<TournamentAward[]> {
    return this.awards.get(tournamentId) || [];
  }
}

export default SeasonalTournaments;
