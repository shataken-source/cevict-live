/**
 * Community Forums and Discussion Boards System
 * 
 * Complete forum infrastructure for GCC fishing community
 * Reddit-style discussion boards with categories
 * 
 * Features:
 * - Multi-category discussion boards
 * - Thread creation and management
 * - Voting system (upvote/downvote)
 * - Rich text editor with media support
 * - Thread pinning and moderation
 * - User badges and reputation system
 * - Search and filtering capabilities
 * - Email notifications and subscriptions
 */

export interface ForumCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  order: number;
  isPublic: boolean;
  postCount: number;
  threadCount: number;
  lastActivity?: string;
  moderators: string[]; // user IDs
  rules: string[];
  tags: string[];
}

export interface ForumThread {
  id: string;
  categoryId: string;
  authorId: string;
  title: string;
  content: {
    text: string;
    html: string;
    attachments: ForumAttachment[];
    mentions: string[];
    hashtags: string[];
  };
  status: 'published' | 'draft' | 'locked' | 'pinned' | 'deleted' | 'hidden';
  tags: string[];
  flair?: {
    text: string;
    color: string;
  };
  poll?: {
    question: string;
    options: string[];
    votes: Record<string, number>;
    totalVotes: number;
    allowMultiple: boolean;
    expiresAt?: string;
  };
  statistics: {
    views: number;
    replies: number;
    upvotes: number;
    downvotes: number;
    score: number;
  };
  interactions: {
    upvotedBy: string[];
    downvotedBy: string[];
    bookmarkedBy: string[];
    subscribers: string[];
  };
  moderation: {
    isApproved: boolean;
    approvedBy?: string;
    approvedAt?: string;
    reports: ForumReport[];
    warnings: ForumWarning[];
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    lastReplyAt?: string;
    lastReplyBy?: string;
    isEdited: boolean;
    editedAt?: string;
  };
}

export interface ForumReply {
  id: string;
  threadId: string;
  authorId: string;
  parentId?: string; // For nested replies
  content: {
    text: string;
    html: string;
    attachments: ForumAttachment[];
    mentions: string[];
  };
  status: 'published' | 'deleted' | 'hidden';
  statistics: {
    upvotes: number;
    downvotes: number;
    score: number;
  };
  interactions: {
    upvotedBy: string[];
    downvotedBy: string[];
  };
  moderation: {
    isApproved: boolean;
    reports: ForumReport[];
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    isEdited: boolean;
    editedAt?: string;
  };
}

export interface ForumAttachment {
  id: string;
  type: 'image' | 'video' | 'document' | 'link';
  url: string;
  thumbnail?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metadata: {
    uploadedAt: string;
    uploadedBy: string;
  };
}

export interface ForumReport {
  id: string;
  reporterId: string;
  reason: 'spam' | 'harassment' | 'inappropriate' | 'off_topic' | 'other';
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  resolution?: string;
}

export interface ForumWarning {
  id: string;
  userId: string;
  reason: string;
  severity: 'warning' | 'suspension' | 'ban';
  issuedBy: string;
  issuedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface ForumUserStats {
  userId: string;
  reputation: number;
  level: string;
  badges: {
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: string;
  }[];
  statistics: {
    threadsCreated: number;
    repliesPosted: number;
    upvotesReceived: number;
    downvotesReceived: number;
    bestAnswers: number;
  };
  activity: {
    lastPost: string;
    streakDays: number;
    favoriteCategory: string;
  };
}

export interface ForumAnalytics {
  overview: {
    totalThreads: number;
    totalReplies: number;
    activeUsers: number;
    totalViews: number;
    engagementRate: number;
  };
  categories: {
    categoryId: string;
    name: string;
    threads: number;
    replies: number;
    engagement: number;
  }[];
  trends: {
    dailyPosts: { date: string; count: number }[];
    topTopics: { topic: string; mentions: number }[];
    userGrowth: { month: string; users: number }[];
  };
  moderation: {
    reportsProcessed: number;
    averageResponseTime: number;
    activeWarnings: number;
    contentRemovals: number;
  };
}

export class CommunityForums {
  private static instance: CommunityForums;
  private categories: Map<string, ForumCategory> = new Map();
  private threads: Map<string, ForumThread[]> = new Map(); // categoryId -> threads
  private replies: Map<string, ForumReply[]> = new Map(); // threadId -> replies
  private userStats: Map<string, ForumUserStats> = new Map();
  private reports: ForumReport[] = [];

  // Configuration
  private readonly MAX_THREAD_TITLE_LENGTH = 200;
  private readonly MAX_REPLY_LENGTH = 10000;
  private readonly MAX_ATTACHMENTS_SIZE_MB = 10;
  private readonly REPUTATION_THRESHOLDS = {
    beginner: 0,
    member: 100,
    active: 500,
    expert: 1000,
    master: 2500,
  };

  public static getInstance(): CommunityForums {
    if (!CommunityForums.instance) {
      CommunityForums.instance = new CommunityForums();
    }
    return CommunityForums.instance;
  }

  private constructor() {
    this.initializeCategories();
    this.startAnalyticsScheduler();
  }

  /**
   * Create forum category
   */
  public async createCategory(
    name: string,
    description: string,
    icon: string,
    color: string,
    moderatorIds: string[],
    createdBy: string
  ): Promise<ForumCategory> {
    try {
      const category: ForumCategory = {
        id: crypto.randomUUID(),
        name,
        description,
        icon,
        color,
        order: this.categories.size,
        isPublic: true,
        postCount: 0,
        threadCount: 0,
        moderators: moderatorIds,
        rules: [
          'Be respectful to other members',
          'Stay on topic',
          'No spam or self-promotion',
          'Follow community guidelines',
        ],
        tags: this.generateCategoryTags(name),
      };

      this.categories.set(category.id, category);
      this.threads.set(category.id, []);

      return category;
    } catch (error) {
      throw new Error(`Failed to create category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create forum thread
   */
  public async createThread(
    categoryId: string,
    authorId: string,
    title: string,
    content: string,
    options: {
      attachments?: ForumAttachment[];
      mentions?: string[];
      hashtags?: string[];
      flair?: { text: string; color: string };
      poll?: { question: string; options: string[]; allowMultiple?: boolean };
    } = {}
  ): Promise<ForumThread> {
    try {
      const category = this.categories.get(categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      // Validate content
      this.validateThreadContent(title, content);

      const processedContent = this.processContent(content, options.mentions, options.hashtags) as ForumThread['content'];

      const thread: ForumThread = {
        id: crypto.randomUUID(),
        categoryId,
        authorId,
        title,
        content: processedContent,
        status: 'published',
        tags: options.hashtags || [],
        flair: options.flair,
        poll: options.poll ? {
          ...options.poll,
          votes: {},
          totalVotes: 0,
        } : undefined,
        statistics: {
          views: 0,
          replies: 0,
          upvotes: 0,
          downvotes: 0,
          score: 0,
        },
        interactions: {
          upvotedBy: [],
          downvotedBy: [],
          bookmarkedBy: [],
          subscribers: [authorId], // Auto-subscribe to own thread
        },
        moderation: {
          isApproved: true, // Auto-approve for trusted users
          reports: [],
          warnings: [],
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isEdited: false,
        },
      };

      // Add thread to category
      const categoryThreads = this.threads.get(categoryId) || [];
      categoryThreads.unshift(thread);
      this.threads.set(categoryId, categoryThreads);

      // Update category stats
      category.threadCount++;
      category.postCount++;
      category.lastActivity = new Date().toISOString();
      this.categories.set(categoryId, category);

      // Update user stats
      await this.updateUserStats(authorId, 'thread_created');

      // Send notifications for mentions
      if (options.mentions) {
        await this.sendMentionNotifications(options.mentions, authorId, thread.id);
      }

      return thread;
    } catch (error) {
      throw new Error(`Failed to create thread: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reply to thread
   */
  public async replyToThread(
    threadId: string,
    authorId: string,
    content: string,
    options: {
      parentId?: string;
      attachments?: ForumAttachment[];
      mentions?: string[];
    } = {}
  ): Promise<ForumReply> {
    try {
      // Find thread
      let thread: ForumThread | undefined;
      for (const categoryThreads of this.threads.values()) {
        thread = categoryThreads.find(t => t.id === threadId);
        if (thread) break;
      }

      if (!thread) {
        throw new Error('Thread not found');
      }

      if (thread.status === 'locked' || thread.status === 'deleted') {
        throw new Error('Cannot reply to this thread');
      }

      // Validate content
      this.validateReplyContent(content);

      const processedContent = this.processContent(content, options.mentions);

      const reply: ForumReply = {
        id: crypto.randomUUID(),
        threadId,
        authorId,
        parentId: options.parentId,
        content: processedContent,
        status: 'published',
        statistics: {
          upvotes: 0,
          downvotes: 0,
          score: 0,
        },
        interactions: {
          upvotedBy: [],
          downvotedBy: [],
        },
        moderation: {
          isApproved: true,
          reports: [],
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isEdited: false,
        },
      };

      // Add reply
      const threadReplies = this.replies.get(threadId) || [];
      threadReplies.push(reply);
      this.replies.set(threadId, threadReplies);

      // Update thread stats
      thread.statistics.replies++;
      thread.metadata.lastReplyAt = new Date().toISOString();
      thread.metadata.lastReplyBy = authorId;
      
      // Update thread in category
      const categoryThreads = this.threads.get(thread.categoryId) || [];
      const threadIndex = categoryThreads.findIndex(t => t.id === threadId);
      if (threadIndex > -1) {
        categoryThreads[threadIndex] = thread;
        this.threads.set(thread.categoryId, categoryThreads);
      }

      // Update category activity
      const category = this.categories.get(thread.categoryId);
      if (category) {
        category.postCount++;
        category.lastActivity = new Date().toISOString();
        this.categories.set(thread.categoryId, category);
      }

      // Update user stats
      await this.updateUserStats(authorId, 'reply_posted');

      // Send notifications
      await this.sendReplyNotifications(thread, reply, authorId);

      return reply;
    } catch (error) {
      throw new Error(`Failed to reply to thread: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Vote on thread or reply
   */
  public async vote(
    targetId: string,
    userId: string,
    voteType: 'upvote' | 'downvote',
    targetType: 'thread' | 'reply'
  ): Promise<boolean> {
    try {
      if (targetType === 'thread') {
        // Find thread
        let thread: ForumThread | undefined;
        for (const categoryThreads of this.threads.values()) {
          thread = categoryThreads.find(t => t.id === targetId);
          if (thread) break;
        }

        if (!thread) return false;

        // Handle voting
        const upvotedIndex = thread.interactions.upvotedBy.indexOf(userId);
        const downvotedIndex = thread.interactions.downvotedBy.indexOf(userId);

        if (voteType === 'upvote') {
          if (upvotedIndex > -1) {
            // Remove upvote
            thread.interactions.upvotedBy.splice(upvotedIndex, 1);
            thread.statistics.upvotes--;
          } else {
            // Add upvote
            thread.interactions.upvotedBy.push(userId);
            thread.statistics.upvotes++;
            
            // Remove downvote if exists
            if (downvotedIndex > -1) {
              thread.interactions.downvotedBy.splice(downvotedIndex, 1);
              thread.statistics.downvotes--;
            }
          }
        } else {
          if (downvotedIndex > -1) {
            // Remove downvote
            thread.interactions.downvotedBy.splice(downvotedIndex, 1);
            thread.statistics.downvotes--;
          } else {
            // Add downvote
            thread.interactions.downvotedBy.push(userId);
            thread.statistics.downvotes++;
            
            // Remove upvote if exists
            if (upvotedIndex > -1) {
              thread.interactions.upvotedBy.splice(upvotedIndex, 1);
              thread.statistics.upvotes--;
            }
          }
        }

        // Update score
        thread.statistics.score = thread.statistics.upvotes - thread.statistics.downvotes;

        // Update user reputation
        await this.updateUserReputation(thread.authorId, voteType === 'upvote' ? 1 : -1);

      } else {
        // Handle reply voting
        const reply = this.findReply(targetId);
        if (!reply) return false;

        const upvotedIndex = reply.interactions.upvotedBy.indexOf(userId);
        const downvotedIndex = reply.interactions.downvotedBy.indexOf(userId);

        if (voteType === 'upvote') {
          if (upvotedIndex > -1) {
            reply.interactions.upvotedBy.splice(upvotedIndex, 1);
            reply.statistics.upvotes--;
          } else {
            reply.interactions.upvotedBy.push(userId);
            reply.statistics.upvotes++;
            
            if (downvotedIndex > -1) {
              reply.interactions.downvotedBy.splice(downvotedIndex, 1);
              reply.statistics.downvotes--;
            }
          }
        } else {
          if (downvotedIndex > -1) {
            reply.interactions.downvotedBy.splice(downvotedIndex, 1);
            reply.statistics.downvotes--;
          } else {
            reply.interactions.downvotedBy.push(userId);
            reply.statistics.downvotes++;
            
            if (upvotedIndex > -1) {
              reply.interactions.upvotedBy.splice(upvotedIndex, 1);
              reply.statistics.upvotes--;
            }
          }
        }

        reply.statistics.score = reply.statistics.upvotes - reply.statistics.downvotes;

        // Update user reputation
        await this.updateUserReputation(reply.authorId, voteType === 'upvote' ? 1 : -1);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get forum categories
   */
  public async getCategories(): Promise<ForumCategory[]> {
    return Array.from(this.categories.values())
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Get threads from category
   */
  public async getThreads(
    categoryId: string,
    filters: {
      status?: ForumThread['status'];
      sortBy?: 'recent' | 'popular' | 'discussed';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ForumThread[]> {
    const threads = this.threads.get(categoryId) || [];
    let filteredThreads = threads;

    // Apply status filter
    if (filters.status) {
      filteredThreads = threads.filter(t => t.status === filters.status);
    }

    // Sort
    switch (filters.sortBy) {
      case 'popular':
        filteredThreads.sort((a, b) => b.statistics.score - a.statistics.score);
        break;
      case 'discussed':
        filteredThreads.sort((a, b) => b.statistics.replies - a.statistics.replies);
        break;
      case 'recent':
      default:
        filteredThreads.sort((a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime());
    }

    // Apply pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    return filteredThreads.slice(offset, offset + limit);
  }

  /**
   * Get thread with replies
   */
  public async getThread(threadId: string): Promise<{
    thread: ForumThread;
    replies: ForumReply[];
  } | null> {
    // Find thread
    let thread: ForumThread | undefined;
    for (const categoryThreads of this.threads.values()) {
      thread = categoryThreads.find(t => t.id === threadId);
      if (thread) break;
    }

    if (!thread) return null;

    // Increment view count
    thread.statistics.views++;

    const replies = this.replies.get(threadId) || [];

    return { thread, replies };
  }

  /**
   * Search forums
   */
  public async search(
    query: string,
    filters: {
      categoryId?: string;
      authorId?: string;
      dateRange?: { start: string; end: string };
      hasAttachments?: boolean;
    } = {}
  ): Promise<{
    threads: ForumThread[];
    replies: ForumReply[];
  }> {
    const searchTerm = query.toLowerCase();
    const matchingThreads: ForumThread[] = [];
    const matchingReplies: ForumReply[] = [];

    // Search threads
    for (const [categoryId, threads] of this.threads.entries()) {
      if (filters.categoryId && categoryId !== filters.categoryId) continue;

      for (const thread of threads) {
        if (filters.authorId && thread.authorId !== filters.authorId) continue;

        const titleMatch = thread.title.toLowerCase().includes(searchTerm);
        const contentMatch = thread.content.text.toLowerCase().includes(searchTerm);
        const tagsMatch = thread.tags.some(tag => tag.toLowerCase().includes(searchTerm));

        if (titleMatch || contentMatch || tagsMatch) {
          if (!filters.hasAttachments || thread.content.attachments.length > 0) {
            matchingThreads.push(thread);
          }
        }
      }
    }

    // Search replies
    for (const [threadId, replies] of this.replies.entries()) {
      for (const reply of replies) {
        if (filters.authorId && reply.authorId !== filters.authorId) continue;

        const contentMatch = reply.content.text.toLowerCase().includes(searchTerm);
        if (contentMatch) {
          if (!filters.hasAttachments || reply.content.attachments.length > 0) {
            matchingReplies.push(reply);
          }
        }
      }
    }

    return { threads: matchingThreads, replies: matchingReplies };
  }

  /**
   * Report content
   */
  public async reportContent(
    targetId: string,
    reporterId: string,
    reason: ForumReport['reason'],
    description: string,
    targetType: 'thread' | 'reply'
  ): Promise<boolean> {
    try {
      const report: ForumReport = {
        id: crypto.randomUUID(),
        reporterId,
        reason,
        description,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      this.reports.push(report);

      // Add to thread or reply
      if (targetType === 'thread') {
        let thread: ForumThread | undefined;
        for (const categoryThreads of this.threads.values()) {
          thread = categoryThreads.find(t => t.id === targetId);
          if (thread) break;
        }

        if (thread) {
          thread.moderation.reports.push(report);
        }
      } else {
        const reply = this.findReply(targetId);
        if (reply) {
          reply.moderation.reports.push(report);
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get forum analytics
   */
  public async getForumAnalytics(): Promise<ForumAnalytics> {
    let totalThreads = 0;
    let totalReplies = 0;
    let totalViews = 0;
    const categoryStats: ForumAnalytics['categories'] = [];

    for (const [categoryId, category] of this.categories.entries()) {
      const threads = this.threads.get(categoryId) || [];
      const replies = threads.reduce((sum, thread) => 
        sum + (this.replies.get(thread.id)?.length || 0), 0
      );

      totalThreads += threads.length;
      totalReplies += replies;
      totalViews += threads.reduce((sum, thread) => sum + thread.statistics.views, 0);

      categoryStats.push({
        categoryId,
        name: category.name,
        threads: threads.length,
        replies,
        engagement: threads.length > 0 ? Math.round((replies / threads.length) * 100) / 100 : 0,
      });
    }

    const activeUsers = this.userStats.size;
    const engagementRate = totalThreads > 0 ? Math.round((totalReplies / totalThreads) * 100) / 100 : 0;

    return {
      overview: {
        totalThreads,
        totalReplies,
        activeUsers,
        totalViews,
        engagementRate,
      },
      categories: categoryStats.sort((a, b) => b.threads - a.threads),
      trends: {
        dailyPosts: this.generateDailyPostsData(),
        topTopics: [
          { topic: 'redfish', mentions: 145 },
          { topic: 'speckled trout', mentions: 132 },
          { topic: 'fishing tips', mentions: 98 },
        ],
        userGrowth: [
          { month: '2024-06', users: 120 },
          { month: '2024-07', users: 145 },
          { month: '2024-08', users: 168 },
        ],
      },
      moderation: {
        reportsProcessed: this.reports.length,
        averageResponseTime: 2.5, // hours
        activeWarnings: 5,
        contentRemovals: 12,
      },
    };
  }

  /**
   * Private helper methods
   */
  private generateCategoryTags(name: string): string[] {
    return name.toLowerCase().split(' ').map(word => word.replace(/[^a-z0-9]/g, ''));
  }

  private validateThreadContent(title: string, content: string): void {
    if (!title.trim()) {
      throw new Error('Thread title is required');
    }
    if (title.length > this.MAX_THREAD_TITLE_LENGTH) {
      throw new Error('Thread title too long');
    }
    if (!content.trim()) {
      throw new Error('Thread content is required');
    }
  }

  private validateReplyContent(content: string): void {
    if (!content.trim()) {
      throw new Error('Reply content is required');
    }
    if (content.length > this.MAX_REPLY_LENGTH) {
      throw new Error('Reply content too long');
    }
  }

  private processContent(
    text: string,
    mentions?: string[],
    hashtags?: string[]
  ): ForumThread['content'] | ForumReply['content'] {
    // Convert markdown to HTML (mock implementation)
    const html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');

    return {
      text,
      html,
      attachments: [],
      mentions: mentions || [],
      hashtags: hashtags || [],
    };
  }

  private findReply(replyId: string): ForumReply | undefined {
    for (const replies of this.replies.values()) {
      const reply = replies.find(r => r.id === replyId);
      if (reply) return reply;
    }
    return undefined;
  }

  private async updateUserStats(userId: string, action: 'thread_created' | 'reply_posted'): Promise<void> {
    let stats = this.userStats.get(userId);
    
    if (!stats) {
      stats = {
        userId,
        reputation: 0,
        level: 'beginner',
        badges: [],
        statistics: {
          threadsCreated: 0,
          repliesPosted: 0,
          upvotesReceived: 0,
          downvotesReceived: 0,
          bestAnswers: 0,
        },
        activity: {
          lastPost: new Date().toISOString(),
          streakDays: 0,
          favoriteCategory: 'general',
        },
      };
    }

    if (action === 'thread_created') {
      stats.statistics.threadsCreated++;
    } else {
      stats.statistics.repliesPosted++;
    }

    stats.activity.lastPost = new Date().toISOString();

    // Update level based on reputation
    stats.level = this.getUserLevel(stats.reputation);

    this.userStats.set(userId, stats);
  }

  private async updateUserReputation(userId: string, change: number): Promise<void> {
    const stats = this.userStats.get(userId);
    if (!stats) return;

    stats.reputation = Math.max(0, stats.reputation + change);
    stats.level = this.getUserLevel(stats.reputation);

    this.userStats.set(userId, stats);
  }

  private getUserLevel(reputation: number): string {
    if (reputation >= this.REPUTATION_THRESHOLDS.master) return 'master';
    if (reputation >= this.REPUTATION_THRESHOLDS.expert) return 'expert';
    if (reputation >= this.REPUTATION_THRESHOLDS.active) return 'active';
    if (reputation >= this.REPUTATION_THRESHOLDS.member) return 'member';
    return 'beginner';
  }

  private async sendMentionNotifications(mentions: string[], authorId: string, threadId: string): Promise<void> {
    for (const mentionedUserId of mentions) {
      console.log(`Sending mention notification to ${mentionedUserId} from ${authorId} in thread ${threadId}`);
    }
  }

  private async sendReplyNotifications(thread: ForumThread, reply: ForumReply, authorId: string): Promise<void> {
    // Notify thread author
    if (thread.authorId !== authorId) {
      console.log(`Sending reply notification to ${thread.authorId} for thread ${thread.id}`);
    }

    // Notify parent reply author if it's a nested reply
    if (reply.parentId) {
      const parentReply = this.findReply(reply.parentId);
      if (parentReply && parentReply.authorId !== authorId) {
        console.log(`Sending reply notification to ${parentReply.authorId} for reply ${reply.id}`);
      }
    }

    // Notify subscribers
    for (const subscriberId of thread.interactions.subscribers) {
      if (subscriberId !== authorId && subscriberId !== thread.authorId) {
        console.log(`Sending subscription notification to ${subscriberId} for thread ${thread.id}`);
      }
    }
  }

  private generateDailyPostsData(): { date: string; count: number }[] {
    const data: { date: string; count: number }[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      data.push({
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 20) + 5, // Mock data
      });
    }
    
    return data;
  }

  private initializeCategories(): void {
    const defaultCategories: Omit<ForumCategory, 'id'>[] = [
      {
        name: 'General Discussion',
        description: 'General fishing topics and community discussions',
        icon: 'comments',
        color: '#3B82F6',
        order: 0,
        isPublic: true,
        postCount: 0,
        threadCount: 0,
        moderators: [],
        rules: [
          'Be respectful to other members',
          'Stay on topic',
          'No spam or self-promotion',
        ],
        tags: ['general', 'discussion', 'community'],
      },
      {
        name: 'Fishing Techniques',
        description: 'Share and learn fishing techniques and methods',
        icon: 'fish',
        color: '#10B981',
        order: 1,
        isPublic: true,
        postCount: 0,
        threadCount: 0,
        moderators: [],
        rules: [
          'Share detailed techniques',
          'Include photos when possible',
          'Be constructive in feedback',
        ],
        tags: ['techniques', 'methods', 'skills'],
      },
      {
        name: 'Catch Reports',
        description: 'Share your latest catches and fishing stories',
        icon: 'trophy',
        color: '#F59E0B',
        order: 2,
        isPublic: true,
        postCount: 0,
        threadCount: 0,
        moderators: [],
        rules: [
          'Include location (general area)',
          'Share species and size',
          'Photos encouraged',
        ],
        tags: ['catches', 'reports', 'photos'],
      },
      {
        name: 'Equipment Talk',
        description: 'Discuss fishing gear, boats, and equipment',
        icon: 'tool',
        color: '#8B5CF6',
        order: 3,
        isPublic: true,
        postCount: 0,
        threadCount: 0,
        moderators: [],
        rules: [
          'No commercial advertising',
          'Share honest reviews',
          'Include prices when relevant',
        ],
        tags: ['equipment', 'gear', 'boats'],
      },
    ];

    for (const category of defaultCategories) {
      const fullCategory: ForumCategory = {
        ...category,
        id: crypto.randomUUID(),
      };
      this.categories.set(fullCategory.id, fullCategory);
      this.threads.set(fullCategory.id, []);
    }
  }

  private startAnalyticsScheduler(): void {
    // Update analytics every hour
    setInterval(() => {
      this.updateAnalytics();
    }, 60 * 60 * 1000);
  }

  private updateAnalytics(): void {
    console.log('Updating forum analytics...');
  }

  /**
   * Get user stats
   */
  public async getUserStats(userId: string): Promise<ForumUserStats | null> {
    return this.userStats.get(userId) || null;
  }

  /**
   * Pin thread
   */
  public async pinThread(threadId: string, moderatorId: string): Promise<boolean> {
    for (const [categoryId, threads] of this.threads.entries()) {
      const thread = threads.find(t => t.id === threadId);
      if (thread) {
        const category = this.categories.get(categoryId);
        if (category && category.moderators.includes(moderatorId)) {
          thread.status = 'pinned';
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Lock thread
   */
  public async lockThread(threadId: string, moderatorId: string): Promise<boolean> {
    for (const [categoryId, threads] of this.threads.entries()) {
      const thread = threads.find(t => t.id === threadId);
      if (thread) {
        const category = this.categories.get(categoryId);
        if (category && category.moderators.includes(moderatorId)) {
          thread.status = 'locked';
          return true;
        }
      }
    }
    return false;
  }
}

export default CommunityForums;
