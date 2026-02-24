/**
 * Weekly Photo Contests System
 * 
 * Complete photo contest infrastructure for GCC community
 * Weekly contests with cash prizes and voting
 * 
 * Features:
 * - Weekly themed photo contests ($25-100 prizes)
 * - Community voting system (1 vote per user)
 * - Judge panel for final decisions
 * - Photo upload and validation
 * - Contest themes and categories
 * - Prize distribution and winner announcements
 * - Photo gallery and archives
 * - Leaderboard and hall of fame
 */

export interface PhotoContest {
  id: string;
  title: string;
  description: string;
  theme: string;
  category: 'catch_of_the_week' | 'scenic' | 'action_shot' | 'funny_moment' | 'wildlife' | 'boat_life';
  status: 'upcoming' | 'active' | 'voting' | 'judging' | 'completed';
  timeline: {
    submissionStart: string;
    submissionEnd: string;
    votingStart: string;
    votingEnd: string;
    winnerAnnounced: string;
  };
  prizes: {
    firstPlace: number;
    secondPlace?: number;
    thirdPlace?: number;
    currency: string;
  };
  rules: {
    maxSubmissions: number;
    photoRequirements: string[];
    eligibilityCriteria: string[];
    contentGuidelines: string[];
  };
  judges: {
    userId: string;
    role: 'lead' | 'assistant';
    weight: number; // 1.0 for lead, 0.5 for assistants
  }[];
  sponsorship?: {
    sponsorId: string;
    sponsorName: string;
    logoUrl: string;
    prizeContribution: number;
  };
  metadata: {
    createdAt: string;
    createdBy: string;
    updatedBy?: string;
    updatedAt?: string;
  };
}

export interface ContestSubmission {
  id: string;
  contestId: string;
  userId: string;
  photo: {
    url: string;
    thumbnail: string;
    originalUrl: string;
    fileName: string;
    fileSize: number;
    dimensions: {
      width: number;
      height: number;
    };
    metadata: {
      camera?: string;
      location?: {
        latitude: number;
        longitude: number;
        address: string;
      };
      dateTaken?: string;
      species?: string[];
      technique?: string;
    };
  };
  caption: string;
  story?: string;
  tags: string[];
  status: 'submitted' | 'approved' | 'rejected' | 'withdrawn' | 'winner';
  moderation: {
    reviewed: boolean;
    reviewedBy?: string;
    reviewedAt?: string;
    rejectionReason?: string;
  };
  voting: {
    communityVotes: number;
    judgeScores: {
      judgeId: string;
      score: number; // 1-10
      comments?: string;
    }[];
    totalScore: number;
    rank?: number;
  };
  submittedAt: string;
  updatedAt: string;
}

export interface ContestVote {
  id: string;
  contestId: string;
  submissionId: string;
  userId: string;
  type: 'community' | 'judge';
  score?: number; // 1-10 for judges, null for community
  createdAt: string;
  ipAddress: string; // For fraud prevention
}

export interface ContestWinner {
  id: string;
  contestId: string;
  submissionId: string;
  userId: string;
  rank: 1 | 2 | 3;
  prizeAmount: number;
  announcedAt: string;
  paymentStatus: 'pending' | 'processing' | 'paid' | 'failed';
  paymentId?: string;
  celebration: {
    featuredInFeed: boolean;
    emailSent: boolean;
    socialMediaPost: boolean;
    badgeAwarded: boolean;
  };
}

export interface ContestAnalytics {
  overview: {
    totalContests: number;
    activeContests: number;
    totalSubmissions: number;
    totalParticipants: number;
    totalPrizesAwarded: number;
  };
  engagement: {
    averageSubmissionsPerContest: number;
    averageVotersPerContest: number;
    votingParticipationRate: number;
    photoQualityScore: number;
  };
  trends: {
    popularThemes: { theme: string; count: number }[];
    topPhotographers: { userId: string; submissions: number; wins: number }[];
    seasonalPatterns: { month: string; submissions: number; engagement: number }[];
  };
  revenue: {
    prizeExpenses: number;
    sponsorshipRevenue: number;
    netCost: number;
    roi: number;
  };
}

export class WeeklyPhotoContests {
  private static instance: WeeklyPhotoContests;
  private contests: Map<string, PhotoContest> = new Map();
  private submissions: Map<string, ContestSubmission[]> = new Map();
  private votes: Map<string, ContestVote[]> = new Map(); // contestId -> votes
  private winners: Map<string, ContestWinner[]> = new Map(); // contestId -> winners

  // Configuration
  private readonly MAX_PHOTO_SIZE_MB = 50;
  private readonly MAX_SUBMISSIONS_PER_USER = 3;
  private readonly COMMUNITY_VOTE_WEIGHT = 0.3;
  private readonly JUDGE_VOTE_WEIGHT = 0.7;
  private readonly DEFAULT_PRIZES = { first: 100, second: 50, third: 25 };
  private readonly CONTEST_DURATION_DAYS = 7;

  public static getInstance(): WeeklyPhotoContests {
    if (!WeeklyPhotoContests.instance) {
      WeeklyPhotoContests.instance = new WeeklyPhotoContests();
    }
    return WeeklyPhotoContests.instance;
  }

  private constructor() {
    this.initializeSampleContests();
    this.startContestScheduler();
  }

  /**
   * Create new photo contest
   */
  public async createContest(
    title: string,
    description: string,
    theme: string,
    category: PhotoContest['category'],
    timeline: Partial<PhotoContest['timeline']>,
    createdBy: string,
    options: {
      prizes?: Partial<PhotoContest['prizes']>;
      judges?: PhotoContest['judges'];
      sponsorship?: PhotoContest['sponsorship'];
    } = {}
  ): Promise<PhotoContest> {
    try {
      const now = new Date();
      const submissionStart = timeline.submissionStart || now.toISOString();
      const submissionEnd = timeline.submissionEnd || new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();
      const votingStart = timeline.votingStart || submissionEnd;
      const votingEnd = timeline.votingEnd || new Date(new Date(votingStart).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const winnerAnnounced = timeline.winnerAnnounced || votingEnd;

      const contest: PhotoContest = {
        id: crypto.randomUUID(),
        title,
        description,
        theme,
        category,
        status: 'upcoming',
        timeline: {
          submissionStart,
          submissionEnd,
          votingStart,
          votingEnd,
          winnerAnnounced,
        },
        prizes: {
          firstPlace: options.prizes?.firstPlace || this.DEFAULT_PRIZES.first,
          secondPlace: options.prizes?.secondPlace || this.DEFAULT_PRIZES.second,
          thirdPlace: options.prizes?.thirdPlace || this.DEFAULT_PRIZES.third,
          currency: 'usd',
        },
        rules: {
          maxSubmissions: this.MAX_SUBMISSIONS_PER_USER,
          photoRequirements: [
            'Minimum resolution: 1920x1080',
            'File size limit: 50MB',
            'Must be original work',
            'No watermarks (except small signature)',
          ],
          eligibilityCriteria: [
            'Must be GCC member',
            'Photo must be fishing-related',
            'Must have been taken in the last 12 months',
          ],
          contentGuidelines: [
            'No inappropriate content',
            'Must follow community guidelines',
            'Fish should be handled ethically',
          ],
        },
        judges: options.judges || [],
        sponsorship: options.sponsorship,
        metadata: {
          createdAt: now.toISOString(),
          createdBy,
        },
      };

      this.contests.set(contest.id, contest);
      this.submissions.set(contest.id, []);
      this.votes.set(contest.id, []);
      this.winners.set(contest.id, []);

      return contest;
    } catch (error) {
      throw new Error(`Failed to create contest: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit photo to contest
   */
  public async submitPhoto(
    contestId: string,
    userId: string,
    photo: ContestSubmission['photo'],
    caption: string,
    story?: string,
    tags: string[] = []
  ): Promise<ContestSubmission> {
    try {
      const contest = this.contests.get(contestId);
      if (!contest) {
        throw new Error('Contest not found');
      }

      // Validate contest status
      if (contest.status !== 'active') {
        throw new Error('Contest is not accepting submissions');
      }

      // Check submission period
      const now = new Date();
      if (now < new Date(contest.timeline.submissionStart) || now > new Date(contest.timeline.submissionEnd)) {
        throw new Error('Submissions are not currently open');
      }

      // Validate photo
      this.validatePhoto(photo);

      // Check user submission limit
      const userSubmissions = this.getUserSubmissions(contestId, userId);
      if (userSubmissions.length >= contest.rules.maxSubmissions) {
        throw new Error(`Maximum ${contest.rules.maxSubmissions} submissions allowed per user`);
      }

      const submission: ContestSubmission = {
        id: crypto.randomUUID(),
        contestId,
        userId,
        photo,
        caption,
        story,
        tags,
        status: 'submitted',
        moderation: {
          reviewed: false,
        },
        voting: {
          communityVotes: 0,
          judgeScores: [],
          totalScore: 0,
        },
        submittedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      // Add submission
      const submissions = this.submissions.get(contestId) || [];
      submissions.push(submission);
      this.submissions.set(contestId, submissions);

      // Auto-approve for trusted users or send for moderation
      await this.processSubmission(submission);

      return submission;
    } catch (error) {
      throw new Error(`Failed to submit photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Vote for submission
   */
  public async voteForSubmission(
    contestId: string,
    submissionId: string,
    userId: string,
    type: 'community' | 'judge' = 'community',
    score?: number
  ): Promise<boolean> {
    try {
      const contest = this.contests.get(contestId);
      if (!contest) {
        return false;
      }

      // Validate voting period
      const now = new Date();
      if (now < new Date(contest.timeline.votingStart) || now > new Date(contest.timeline.votingEnd)) {
        return false;
      }

      // Check if user already voted (community votes limited to 1 per user)
      if (type === 'community') {
        const existingVote = this.votes.get(contestId)?.find(
          v => v.userId === userId && v.type === 'community'
        );
        if (existingVote) {
          return false;
        }
      }

      // Validate judge vote
      if (type === 'judge') {
        const isJudge = contest.judges.some(j => j.userId === userId);
        if (!isJudge) {
          return false;
        }
        if (!score || score < 1 || score > 10) {
          return false;
        }
      }

      const vote: ContestVote = {
        id: crypto.randomUUID(),
        contestId,
        submissionId,
        userId,
        type,
        score,
        createdAt: now.toISOString(),
        ipAddress: '127.0.0.1', // Would get actual IP
      };

      // Add vote
      const votes = this.votes.get(contestId) || [];
      votes.push(vote);
      this.votes.set(contestId, votes);

      // Update submission score
      await this.updateSubmissionScores(contestId, submissionId);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get active contests
   */
  public async getActiveContests(): Promise<PhotoContest[]> {
    const active: PhotoContest[] = [];

    for (const contest of this.contests.values()) {
      if (contest.status === 'active' || contest.status === 'voting') {
        active.push(contest);
      }
    }

    return active.sort((a, b) => 
      new Date(a.timeline.submissionStart).getTime() - new Date(b.timeline.submissionStart).getTime()
    );
  }

  /**
   * Get contest submissions
   */
  public async getContestSubmissions(
    contestId: string,
    status?: ContestSubmission['status'],
    sortBy: 'newest' | 'popular' | 'score' = 'newest'
  ): Promise<ContestSubmission[]> {
    const submissions = this.submissions.get(contestId) || [];
    let filtered = submissions;

    if (status) {
      filtered = submissions.filter(s => s.status === status);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        break;
      case 'popular':
        filtered.sort((a, b) => b.voting.communityVotes - a.voting.communityVotes);
        break;
      case 'score':
        filtered.sort((a, b) => b.voting.totalScore - a.voting.totalScore);
        break;
    }

    return filtered;
  }

  /**
   * Process contest winners
   */
  public async processContestWinners(contestId: string): Promise<ContestWinner[]> {
    try {
      const contest = this.contests.get(contestId);
      if (!contest) {
        throw new Error('Contest not found');
      }

      if (contest.status !== 'judging') {
        throw new Error('Contest is not in judging phase');
      }

      const submissions = this.submissions.get(contestId) || [];
      const approvedSubmissions = submissions.filter(s => s.status === 'approved');

      if (approvedSubmissions.length === 0) {
        throw new Error('No approved submissions found');
      }

      // Sort by total score
      const sortedSubmissions = approvedSubmissions.sort((a, b) => b.voting.totalScore - a.voting.totalScore);

      const winners: ContestWinner[] = [];

      // Award prizes
      if (sortedSubmissions.length > 0) {
        winners.push({
          id: crypto.randomUUID(),
          contestId,
          submissionId: sortedSubmissions[0].id,
          userId: sortedSubmissions[0].userId,
          rank: 1,
          prizeAmount: contest.prizes.firstPlace,
          announcedAt: new Date().toISOString(),
          paymentStatus: 'pending',
          celebration: {
            featuredInFeed: false,
            emailSent: false,
            socialMediaPost: false,
            badgeAwarded: false,
          },
        });

        // Update submission status
        sortedSubmissions[0].status = 'winner';
        sortedSubmissions[0].voting.rank = 1;
      }

      if (sortedSubmissions.length > 1 && contest.prizes.secondPlace) {
        winners.push({
          id: crypto.randomUUID(),
          contestId,
          submissionId: sortedSubmissions[1].id,
          userId: sortedSubmissions[1].userId,
          rank: 2,
          prizeAmount: contest.prizes.secondPlace,
          announcedAt: new Date().toISOString(),
          paymentStatus: 'pending',
          celebration: {
            featuredInFeed: false,
            emailSent: false,
            socialMediaPost: false,
            badgeAwarded: false,
          },
        });

        sortedSubmissions[1].status = 'winner';
        sortedSubmissions[1].voting.rank = 2;
      }

      if (sortedSubmissions.length > 2 && contest.prizes.thirdPlace) {
        winners.push({
          id: crypto.randomUUID(),
          contestId,
          submissionId: sortedSubmissions[2].id,
          userId: sortedSubmissions[2].userId,
          rank: 3,
          prizeAmount: contest.prizes.thirdPlace,
          announcedAt: new Date().toISOString(),
          paymentStatus: 'pending',
          celebration: {
            featuredInFeed: false,
            emailSent: false,
            socialMediaPost: false,
            badgeAwarded: false,
          },
        });

        sortedSubmissions[2].status = 'winner';
        sortedSubmissions[2].voting.rank = 3;
      }

      // Save winners
      this.winners.set(contestId, winners);

      // Update contest status
      contest.status = 'completed';
      this.contests.set(contestId, contest);

      // Send winner notifications
      await this.sendWinnerNotifications(winners);

      return winners;
    } catch (error) {
      throw new Error(`Failed to process contest winners: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get contest analytics
   */
  public async getContestAnalytics(): Promise<ContestAnalytics> {
    const totalContests = this.contests.size;
    const activeContests = Array.from(this.contests.values()).filter(c => 
      c.status === 'active' || c.status === 'voting'
    ).length;

    let totalSubmissions = 0;
    const participants = new Set<string>();
    let totalPrizes = 0;

    for (const submissions of this.submissions.values()) {
      totalSubmissions += submissions.length;
      submissions.forEach(s => participants.add(s.userId));
    }

    for (const contest of this.contests.values()) {
      totalPrizes += contest.prizes.firstPlace + (contest.prizes.secondPlace || 0) + (contest.prizes.thirdPlace || 0);
    }

    // Calculate engagement metrics
    const averageSubmissions = totalContests > 0 ? totalSubmissions / totalContests : 0;
    const averageVoters = this.calculateAverageVoters();
    const votingParticipationRate = this.calculateVotingParticipationRate();

    return {
      overview: {
        totalContests,
        activeContests,
        totalSubmissions,
        totalParticipants: participants.size,
        totalPrizesAwarded: totalPrizes,
      },
      engagement: {
        averageSubmissionsPerContest: averageSubmissions,
        averageVotersPerContest: averageVoters,
        votingParticipationRate,
        photoQualityScore: 8.2, // Mock score
      },
      trends: {
        popularThemes: [
          { theme: 'Catch of the Day', count: 45 },
          { theme: 'Sunset Fishing', count: 38 },
          { theme: 'Family Fishing', count: 32 },
        ],
        topPhotographers: [
          { userId: 'user1', submissions: 12, wins: 3 },
          { userId: 'user2', submissions: 10, wins: 2 },
          { userId: 'user3', submissions: 8, wins: 2 },
        ],
        seasonalPatterns: [
          { month: '2024-06', submissions: 120, engagement: 85 },
          { month: '2024-07', submissions: 145, engagement: 92 },
          { month: '2024-08', submissions: 138, engagement: 88 },
        ],
      },
      revenue: {
        prizeExpenses: totalPrizes,
        sponsorshipRevenue: Math.floor(totalPrizes * 0.3), // 30% sponsorship
        netCost: Math.floor(totalPrizes * 0.7),
        roi: -70, // Community engagement feature
      },
    };
  }

  /**
   * Private helper methods
   */
  private validatePhoto(photo: ContestSubmission['photo']): void {
    if (photo.fileSize > this.MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      throw new Error(`Photo size exceeds ${this.MAX_PHOTO_SIZE_MB}MB limit`);
    }

    if (photo.dimensions.width < 1920 || photo.dimensions.height < 1080) {
      throw new Error('Photo resolution too low (minimum 1920x1080)');
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(photo.metadata.mimeType || '')) {
      throw new Error('Invalid photo format (JPEG, PNG, or WebP required)');
    }
  }

  private getUserSubmissions(contestId: string, userId: string): ContestSubmission[] {
    const submissions = this.submissions.get(contestId) || [];
    return submissions.filter(s => s.userId === userId && s.status !== 'withdrawn');
  }

  private async processSubmission(submission: ContestSubmission): Promise<void> {
    // Auto-approve for trusted users or send for moderation
    // For now, auto-approve all submissions
    submission.status = 'approved';
    submission.moderation.reviewed = true;
    submission.moderation.reviewedAt = new Date().toISOString();
  }

  private async updateSubmissionScores(contestId: string, submissionId: string): Promise<void> {
    const submissions = this.submissions.get(contestId) || [];
    const submission = submissions.find(s => s.id === submissionId);
    
    if (!submission) return;

    const votes = this.votes.get(contestId) || [];
    const submissionVotes = votes.filter(v => v.submissionId === submissionId);

    // Calculate community votes
    const communityVotes = submissionVotes.filter(v => v.type === 'community').length;

    // Calculate judge scores
    const judgeScores = submissionVotes
      .filter(v => v.type === 'judge')
      .map(v => ({ judgeId: v.userId, score: v.score!, comments: undefined }));

    const averageJudgeScore = judgeScores.length > 0 
      ? judgeScores.reduce((sum, s) => sum + s.score, 0) / judgeScores.length 
      : 0;

    // Calculate total score (weighted)
    const totalScore = (communityVotes * this.COMMUNITY_VOTE_WEIGHT) + (averageJudgeScore * this.JUDGE_VOTE_WEIGHT * 10);

    submission.voting.communityVotes = communityVotes;
    submission.voting.judgeScores = judgeScores;
    submission.voting.totalScore = totalScore;
  }

  private async sendWinnerNotifications(winners: ContestWinner[]): Promise<void> {
    for (const winner of winners) {
      console.log(`Sending winner notification to ${winner.userId} for ${winner.rank} place prize of $${winner.prizeAmount}`);
    }
  }

  private calculateAverageVoters(): number {
    let totalVoters = 0;
    let contestsWithVoting = 0;

    for (const [contestId, votes] of this.votes.entries()) {
      const communityVotes = votes.filter(v => v.type === 'community');
      if (communityVotes.length > 0) {
        totalVoters += communityVotes.length;
        contestsWithVoting++;
      }
    }

    return contestsWithVoting > 0 ? totalVoters / contestsWithVoting : 0;
  }

  private calculateVotingParticipationRate(): number {
    // Mock calculation - would need actual user data
    return 67.5; // percentage
  }

  private initializeSampleContests(): void {
    const sampleContest: PhotoContest = {
      id: 'sample-contest-1',
      title: 'Summer Catch of the Week',
      description: 'Show off your best summer fishing catch!',
      theme: 'Summer Fishing',
      category: 'catch_of_the_week',
      status: 'active',
      timeline: {
        submissionStart: new Date().toISOString(),
        submissionEnd: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        votingStart: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        votingEnd: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        winnerAnnounced: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      },
      prizes: {
        firstPlace: 100,
        secondPlace: 50,
        thirdPlace: 25,
        currency: 'usd',
      },
      rules: {
        maxSubmissions: 3,
        photoRequirements: [
          'Minimum resolution: 1920x1080',
          'File size limit: 50MB',
          'Must be original work',
        ],
        eligibilityCriteria: [
          'Must be GCC member',
          'Photo must be fishing-related',
        ],
        contentGuidelines: [
          'No inappropriate content',
          'Fish should be handled ethically',
        ],
      },
      judges: [],
      metadata: {
        createdAt: new Date().toISOString(),
        createdBy: 'system',
      },
    };

    this.contests.set(sampleContest.id, sampleContest);
    this.submissions.set(sampleContest.id, []);
    this.votes.set(sampleContest.id, []);
    this.winners.set(sampleContest.id, []);
  }

  private startContestScheduler(): void {
    // Check contest phases every hour
    setInterval(() => {
      this.updateContestPhases();
    }, 60 * 60 * 1000);
  }

  private updateContestPhases(): void {
    const now = new Date();

    for (const [contestId, contest] of this.contests.entries()) {
      // Update to voting phase
      if (contest.status === 'active' && now >= new Date(contest.timeline.submissionEnd)) {
        contest.status = 'voting';
        this.contests.set(contestId, contest);
        console.log(`Contest ${contestId} moved to voting phase`);
      }

      // Update to judging phase
      if (contest.status === 'voting' && now >= new Date(contest.timeline.votingEnd)) {
        contest.status = 'judging';
        this.contests.set(contestId, contest);
        console.log(`Contest ${contestId} moved to judging phase`);
        
        // Auto-process winners after a delay
        setTimeout(() => {
          this.processContestWinners(contestId);
        }, 60 * 60 * 1000); // 1 hour for judging
      }
    }
  }

  /**
   * Get contest by ID
   */
  public async getContestById(contestId: string): Promise<PhotoContest | null> {
    return this.contests.get(contestId) || null;
  }

  /**
   * Get submission by ID
   */
  public async getSubmissionById(submissionId: string): Promise<ContestSubmission | null> {
    for (const submissions of this.submissions.values()) {
      const submission = submissions.find(s => s.id === submissionId);
      if (submission) {
        return submission;
      }
    }
    return null;
  }

  /**
   * Get user's submissions
   */
  public async getUserSubmissionsHistory(userId: string): Promise<ContestSubmission[]> {
    const userSubmissions: ContestSubmission[] = [];

    for (const submissions of this.submissions.values()) {
      const userContestSubmissions = submissions.filter(s => s.userId === userId);
      userSubmissions.push(...userContestSubmissions);
    }

    return userSubmissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  /**
   * Get contest winners
   */
  public async getContestWinners(contestId: string): Promise<ContestWinner[]> {
    return this.winners.get(contestId) || [];
  }

  /**
   * Withdraw submission
   */
  public async withdrawSubmission(submissionId: string, userId: string): Promise<boolean> {
    try {
      for (const submissions of this.submissions.values()) {
        const submission = submissions.find(s => s.id === submissionId);
        if (submission && submission.userId === userId) {
          if (submission.status === 'winner') {
            return false; // Can't withdraw winning submissions
          }
          
          submission.status = 'withdrawn';
          submission.updatedAt = new Date().toISOString();
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }
}

export default WeeklyPhotoContests;
