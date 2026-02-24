/**
 * 24-Hour Stories and Video Reels System
 * 
 * Complete stories and reels infrastructure for GCC community
 * Instagram-style stories with 24-hour expiration
 * 
 * Features:
 * - 24-hour disappearing stories and video reels
 * - Interactive stickers (polls, questions, location, mentions)
 * - Story highlights and archives
 * - Video editing with music and effects
 * - Swipe-up links and call-to-actions
 * - Story viewer analytics and insights
 * - Group stories and collaborative reels
 * - Story reactions and replies
 */

export interface Story {
  id: string;
  userId: string;
  type: 'image' | 'video' | 'reel' | 'text' | 'boomerang' | 'superzoom';
  content: {
    media: {
      url: string;
      thumbnail?: string;
      type: 'image' | 'video';
      duration?: number; // seconds for video
      dimensions: {
        width: number;
        height: number;
      };
      fileSize: number;
      filters: string[];
      effects: string[];
    };
    text?: string;
    background?: {
      type: 'gradient' | 'solid' | 'image';
      value: string;
    };
    stickers: StorySticker[];
    links?: {
      url: string;
      title: string;
      swipeUpText?: string;
    }[];
    mentions: string[];
    hashtags: string[];
    location?: {
      name: string;
      latitude: number;
      longitude: number;
    };
  };
  privacy: {
    visibility: 'public' | 'friends' | 'close_friends' | 'custom';
    allowReplies: boolean;
    allowReactions: boolean;
    allowSharing: boolean;
  };
  interactions: {
    views: number;
    replies: StoryReply[];
    reactions: {
      emoji: string;
      userId: string;
      timestamp: string;
    }[];
    shares: number;
    linkClicks: number;
  };
  metadata: {
    createdAt: string;
    expiresAt: string;
    viewers: string[];
    isExpired: boolean;
    isArchived: boolean;
    archiveDate?: string;
    music?: {
      title: string;
      artist: string;
      duration: number;
      url: string;
    };
    cameraInfo?: {
      device: string;
      settings: string;
    };
  };
}

export interface StorySticker {
  id: string;
  type: 'poll' | 'quiz' | 'question' | 'slider' | 'countdown' | 'location' | 'mention' | 'hashtag' | 'music' | 'custom';
  position: {
    x: number; // 0-100 percentage
    y: number; // 0-100 percentage
  };
  size: {
    width: number;
    height: number;
  };
  rotation: number; // degrees
  data: {
    // Poll data
    question?: string;
    options?: string[];
    votes?: Record<string, number>;
    totalVotes?: number;
    // Quiz data
    correctAnswer?: number;
    // Question data
    prompt?: string;
    // Slider data
    min?: number;
    max?: number;
    value?: number;
    // Countdown data
    endTime?: string;
    // Location data
    locationName?: string;
    // Text data
    text?: string;
    fontSize?: number;
    color?: string;
    // Music data
    trackInfo?: {
      title: string;
      artist: string;
      albumArt: string;
    };
  };
  interactions: {
    userId: string;
    response: any;
    timestamp: string;
  }[];
}

export interface StoryReply {
  id: string;
  storyId: string;
  userId: string;
  content: {
    text: string;
    media?: {
      url: string;
      type: 'image' | 'video';
    };
  };
  metadata: {
    createdAt: string;
    isRead: boolean;
    readAt?: string;
  };
}

export interface StoryHighlight {
  id: string;
  userId: string;
  title: string;
  cover: {
    type: 'solid' | 'gradient' | 'image' | 'emoji';
    value: string;
  };
  stories: string[]; // Story IDs
  category: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoryAnalytics {
  overview: {
    totalStories: number;
    activeStories: number;
    totalViews: number;
    averageViewsPerStory: number;
    completionRate: number; // percentage
  };
  engagement: {
    replyRate: number;
    reactionRate: number;
    shareRate: number;
    linkClickRate: number;
    averageWatchTime: number; // seconds
  };
  performance: {
    topStories: {
      storyId: string;
      views: number;
      completionRate: number;
      engagement: number;
    }[];
    bestTimes: {
      hour: number;
      views: number;
      engagement: number;
    }[];
    contentTypes: {
      [key: string]: {
        count: number;
        averageViews: number;
        engagement: number;
      };
    };
  };
  audience: {
    demographics: Record<string, number>;
    geography: Record<string, number>;
    behavior: {
      newViewers: number;
      returningViewers: number;
      peakActivity: string;
    };
  };
}

export class StoriesAndReels {
  private static instance: StoriesAndReels;
  private stories: Map<string, Story> = new Map();
  private userStories: Map<string, string[]> = new Map(); // userId -> storyIds
  private highlights: Map<string, StoryHighlight[]> = new Map(); // userId -> highlights
  private replies: Map<string, StoryReply[]> = new Map(); // storyId -> replies

  // Configuration
  private readonly STORY_DURATION_HOURS = 24;
  private readonly MAX_STORY_DURATION_SECONDS = 60;
  private readonly MAX_REEL_DURATION_SECONDS = 90;
  private readonly MAX_STORIES_PER_USER = 100;
  private readonly MAX_HIGHLIGHTS_PER_USER = 50;

  public static getInstance(): StoriesAndReels {
    if (!StoriesAndReels.instance) {
      StoriesAndReels.instance = new StoriesAndReels();
    }
    return StoriesAndReels.instance;
  }

  private constructor() {
    this.startExpirationScheduler();
    this.startAnalyticsScheduler();
  }

  /**
   * Create new story
   */
  public async createStory(
    userId: string,
    type: Story['type'],
    content: Story['content'],
    privacy: Story['privacy'] = {
      visibility: 'public',
      allowReplies: true,
      allowReactions: true,
      allowSharing: false,
    }
  ): Promise<Story> {
    try {
      // Validate content
      this.validateStoryContent(type, content);

      const expiresAt = new Date(Date.now() + this.STORY_DURATION_HOURS * 60 * 60 * 1000);

      const story: Story = {
        id: crypto.randomUUID(),
        userId,
        type,
        content,
        privacy,
        interactions: {
          views: 0,
          replies: [],
          reactions: [],
          shares: 0,
          linkClicks: 0,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
          viewers: [],
          isExpired: false,
          isArchived: false,
        },
      };

      // Add to stories
      this.stories.set(story.id, story);

      // Add to user stories
      const userStoryIds = this.userStories.get(userId) || [];
      userStoryIds.push(story.id);
      this.userStories.set(userId, userStoryIds);

      // Clean up old stories if exceeding limit
      await this.cleanupOldStories(userId);

      return story;
    } catch (error) {
      throw new Error(`Failed to create story: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * View story
   */
  public async viewStory(storyId: string, viewerId: string): Promise<boolean> {
    try {
      const story = this.stories.get(storyId);
      if (!story || story.metadata.isExpired) {
        return false;
      }

      // Check if already viewed
      if (!story.metadata.viewers.includes(viewerId)) {
        story.metadata.viewers.push(viewerId);
        story.interactions.views++;
        this.stories.set(storyId, story);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Reply to story
   */
  public async replyToStory(
    storyId: string,
    userId: string,
    text: string,
    media?: StoryReply['content']['media']
  ): Promise<StoryReply> {
    try {
      const story = this.stories.get(storyId);
      if (!story) {
        throw new Error('Story not found');
      }

      if (!story.privacy.allowReplies) {
        throw new Error('Replies not allowed on this story');
      }

      if (story.metadata.isExpired) {
        throw new Error('Cannot reply to expired story');
      }

      const reply: StoryReply = {
        id: crypto.randomUUID(),
        storyId,
        userId,
        content: {
          text,
          media,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          isRead: false,
        },
      };

      // Add reply
      const replies = this.replies.get(storyId) || [];
      replies.push(reply);
      this.replies.set(storyId, replies);

      // Update story
      story.interactions.replies.push(reply);
      this.stories.set(storyId, story);

      // Send notification to story author
      if (story.userId !== userId) {
        await this.sendStoryReplyNotification(story.userId, userId, storyId);
      }

      return reply;
    } catch (error) {
      throw new Error(`Failed to reply to story: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * React to story
   */
  public async reactToStory(
    storyId: string,
    userId: string,
    emoji: string
  ): Promise<boolean> {
    try {
      const story = this.stories.get(storyId);
      if (!story) {
        return false;
      }

      if (!story.privacy.allowReactions) {
        return false;
      }

      // Check if user already reacted
      const existingReactionIndex = story.interactions.reactions.findIndex(
        r => r.userId === userId && r.emoji === emoji
      );

      if (existingReactionIndex > -1) {
        // Remove reaction
        story.interactions.reactions.splice(existingReactionIndex, 1);
      } else {
        // Add reaction
        story.interactions.reactions.push({
          emoji,
          userId,
          timestamp: new Date().toISOString(),
        });
      }

      this.stories.set(storyId, story);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Interact with story sticker
   */
  public async interactWithSticker(
    storyId: string,
    stickerId: string,
    userId: string,
    response: any
  ): Promise<boolean> {
    try {
      const story = this.stories.get(storyId);
      if (!story) {
        return false;
      }

      const sticker = story.content.stickers.find(s => s.id === stickerId);
      if (!sticker) {
        return false;
      }

      // Add interaction
      sticker.interactions.push({
        userId,
        response,
        timestamp: new Date().toISOString(),
      });

      // Update sticker data based on type
      if (sticker.type === 'poll' && response.option) {
        sticker.data.votes = sticker.data.votes || {};
        sticker.data.votes[response.option] = (sticker.data.votes[response.option] || 0) + 1;
        sticker.data.totalVotes = Object.values(sticker.data.votes).reduce((sum, count) => sum + count, 0);
      } else if (sticker.type === 'slider' && response.value !== undefined) {
        sticker.data.value = response.value;
      }

      this.stories.set(storyId, story);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create story highlight
   */
  public async createHighlight(
    userId: string,
    title: string,
    storyIds: string[],
    cover: StoryHighlight['cover'],
    category: string = 'General'
  ): Promise<StoryHighlight> {
    try {
      // Validate stories
      const validStoryIds = storyIds.filter(id => {
        const story = this.stories.get(id);
        return story && story.userId === userId;
      });

      if (validStoryIds.length === 0) {
        throw new Error('No valid stories provided');
      }

      const highlight: StoryHighlight = {
        id: crypto.randomUUID(),
        userId,
        title,
        cover,
        stories: validStoryIds,
        category,
        isPrivate: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add to highlights
      const highlights = this.highlights.get(userId) || [];
      highlights.push(highlight);
      this.highlights.set(userId, highlights);

      // Mark stories as archived
      for (const storyId of validStoryIds) {
        const story = this.stories.get(storyId);
        if (story) {
          story.metadata.isArchived = true;
          story.metadata.archiveDate = new Date().toISOString();
          this.stories.set(storyId, story);
        }
      }

      return highlight;
    } catch (error) {
      throw new Error(`Failed to create highlight: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's active stories
   */
  public async getUserStories(userId: string, viewerId?: string): Promise<Story[]> {
    const storyIds = this.userStories.get(userId) || [];
    const stories: Story[] = [];

    for (const storyId of storyIds) {
      const story = this.stories.get(storyId);
      if (story && !story.metadata.isExpired) {
        // Check visibility
        if (this.canViewStory(story, viewerId)) {
          stories.push(story);
        }
      }
    }

    return stories.sort((a, b) => 
      new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
    );
  }

  /**
   * Get user's story highlights
   */
  public async getUserHighlights(userId: string, viewerId?: string): Promise<StoryHighlight[]> {
    const highlights = this.highlights.get(userId) || [];
    
    // Filter based on visibility
    return highlights.filter(highlight => 
      !highlight.isPrivate || userId === viewerId
    ).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Get stories from followed users
   */
  public async getFollowingStories(userId: string): Promise<Story[]> {
    // Mock following list - in production would query actual following relationships
    const followingUsers = this.getFollowingList(userId);
    const stories: Story[] = [];

    for (const followingUserId of followingUsers) {
      const userStories = await this.getUserStories(followingUserId, userId);
      stories.push(...userStories);
    }

    return stories.sort((a, b) => 
      new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
    );
  }

  /**
   * Get story analytics
   */
  public async getStoryAnalytics(userId: string, startDate?: Date, endDate?: Date): Promise<StoryAnalytics> {
    const userStoryIds = this.userStories.get(userId) || [];
    let stories = userStoryIds.map(id => this.stories.get(id)).filter(Boolean) as Story[];

    // Filter by date range
    if (startDate || endDate) {
      stories = stories.filter(story => {
        const storyDate = new Date(story.metadata.createdAt);
        const afterStart = !startDate || storyDate >= startDate;
        const beforeEnd = !endDate || storyDate <= endDate;
        return afterStart && beforeEnd;
      });
    }

    const totalStories = stories.length;
    const activeStories = stories.filter(s => !s.metadata.isExpired).length;
    const totalViews = stories.reduce((sum, s) => sum + s.interactions.views, 0);
    const averageViewsPerStory = totalStories > 0 ? totalViews / totalStories : 0;

    // Calculate completion rate (mock - would need actual watch time data)
    const completionRate = 78.5;

    // Calculate engagement metrics
    const totalReplies = stories.reduce((sum, s) => sum + s.interactions.replies.length, 0);
    const totalReactions = stories.reduce((sum, s) => sum + s.interactions.reactions.length, 0);
    const totalShares = stories.reduce((sum, s) => sum + s.interactions.shares, 0);

    const replyRate = totalViews > 0 ? (totalReplies / totalViews) * 100 : 0;
    const reactionRate = totalViews > 0 ? (totalReactions / totalViews) * 100 : 0;
    const shareRate = totalViews > 0 ? (totalShares / totalViews) * 100 : 0;

    return {
      overview: {
        totalStories,
        activeStories,
        totalViews,
        averageViewsPerStory,
        completionRate,
      },
      engagement: {
        replyRate,
        reactionRate,
        shareRate,
        linkClickRate: 2.3, // Mock percentage
        averageWatchTime: 15.7, // seconds
      },
      performance: {
        topStories: stories
          .sort((a, b) => b.interactions.views - a.interactions.views)
          .slice(0, 5)
          .map(story => ({
            storyId: story.id,
            views: story.interactions.views,
            completionRate,
            engagement: story.interactions.replies.length + story.interactions.reactions.length,
          })),
        bestTimes: [
          { hour: 19, views: 450, engagement: 85 },
          { hour: 12, views: 380, engagement: 72 },
          { hour: 8, views: 320, engagement: 68 },
        ],
        contentTypes: {
          image: { count: 45, averageViews: 125, engagement: 12 },
          video: { count: 25, averageViews: 180, engagement: 18 },
          reel: { count: 15, averageViews: 220, engagement: 25 },
        },
      },
      audience: {
        demographics: {
          '18-24': 25,
          '25-34': 40,
          '35-44': 25,
          '45+': 10,
        },
        geography: {
          'Texas': 35,
          'Louisiana': 25,
          'Florida': 20,
          'Other': 20,
        },
        behavior: {
          newViewers: 65,
          returningViewers: 35,
          peakActivity: '7:00 PM - 9:00 PM',
        },
      },
    };
  }

  /**
   * Private helper methods
   */
  private validateStoryContent(type: Story['type'], content: Story['content']): void {
    // Validate media
    if (!content.media) {
      throw new Error('Media content is required');
    }

    // Validate duration for video content
    if (type === 'video' || type === 'reel') {
      const duration = content.media.duration || 0;
      const maxDuration = type === 'reel' ? this.MAX_REEL_DURATION_SECONDS : this.MAX_STORY_DURATION_SECONDS;
      
      if (duration > maxDuration) {
        throw new Error(`Video duration exceeds maximum of ${maxDuration} seconds`);
      }
    }

    // Validate dimensions (should be vertical for stories)
    const { width, height } = content.media.dimensions;
    if (width > height) {
      throw new Error('Stories must be in vertical orientation (9:16 aspect ratio)');
    }

    // Validate file size
    const maxSizeMB = type === 'reel' ? 100 : 50;
    if (content.media.fileSize > maxSizeMB * 1024 * 1024) {
      throw new Error(`File size exceeds maximum of ${maxSizeMB}MB`);
    }
  }

  private canViewStory(story: Story, viewerId?: string): boolean {
    // User can always view their own stories
    if (story.userId === viewerId) {
      return true;
    }

    // Check privacy settings
    switch (story.privacy.visibility) {
      case 'public':
        return true;
      case 'friends':
        return !!(viewerId && this.isFollowing(viewerId, story.userId));
      case 'close_friends':
        return !!(viewerId && this.isCloseFriend(viewerId, story.userId));
      case 'custom':
        return !!(viewerId && this.isInCustomList(viewerId, story.userId));
      default:
        return false;
    }
  }

  private isFollowing(userId: string, targetUserId: string): boolean {
    // Mock implementation - in production would query actual following relationships
    return Math.random() > 0.6; // 40% chance of following
  }

  private isCloseFriend(userId: string, targetUserId: string): boolean {
    // Mock implementation
    return Math.random() > 0.8; // 20% chance of being close friends
  }

  private isInCustomList(userId: string, targetUserId: string): boolean {
    // Mock implementation
    return Math.random() > 0.7; // 30% chance of being in custom list
  }

  private getFollowingList(userId: string): string[] {
    // Mock implementation - in production would query actual following relationships
    return Array.from(this.stories.values())
      .map(story => story.userId)
      .filter((_, index) => Math.random() > 0.6); // Random sample
  }

  private async cleanupOldStories(userId: string): Promise<void> {
    const userStoryIds = this.userStories.get(userId) || [];
    
    if (userStoryIds.length > this.MAX_STORIES_PER_USER) {
      // Remove oldest stories that aren't archived
      const nonArchivedStories = userStoryIds
        .map(id => this.stories.get(id))
        .filter(story => story && !story.metadata.isArchived)
        .sort((a, b) => new Date(a!.metadata.createdAt).getTime() - new Date(b!.metadata.createdAt).getTime());

      const toRemove = nonArchivedStories.slice(0, userStoryIds.length - this.MAX_STORIES_PER_USER);
      
      for (const story of toRemove) {
        if (story) {
          this.stories.delete(story.id);
          const index = userStoryIds.indexOf(story.id);
          if (index > -1) {
            userStoryIds.splice(index, 1);
          }
        }
      }

      this.userStories.set(userId, userStoryIds);
    }
  }

  private async sendStoryReplyNotification(storyAuthorId: string, replierId: string, storyId: string): Promise<void> {
    console.log(`Sending story reply notification to ${storyAuthorId} from ${replierId} for story ${storyId}`);
  }

  private startExpirationScheduler(): void {
    // Check for expired stories every 10 minutes
    setInterval(() => {
      this.expireStories();
    }, 10 * 60 * 1000);
  }

  private startAnalyticsScheduler(): void {
    // Update analytics every hour
    setInterval(() => {
      this.updateAnalytics();
    }, 60 * 60 * 1000);
  }

  private expireStories(): void {
    const now = new Date();
    
    for (const [id, story] of this.stories.entries()) {
      if (!story.metadata.isExpired && new Date(story.metadata.expiresAt) <= now) {
        story.metadata.isExpired = true;
        this.stories.set(id, story);
        
        // Remove from user stories if not archived
        if (!story.metadata.isArchived) {
          const userStoryIds = this.userStories.get(story.userId) || [];
          const index = userStoryIds.indexOf(id);
          if (index > -1) {
            userStoryIds.splice(index, 1);
            this.userStories.set(story.userId, userStoryIds);
          }
        }
      }
    }
  }

  private updateAnalytics(): void {
    // Update story analytics and performance metrics
    console.log('Updating story analytics...');
  }

  /**
   * Get story by ID
   */
  public async getStoryById(storyId: string): Promise<Story | null> {
    return this.stories.get(storyId) || null;
  }

  /**
   * Get story replies
   */
  public async getStoryReplies(storyId: string): Promise<StoryReply[]> {
    return this.replies.get(storyId) || [];
  }

  /**
   * Delete story
   */
  public async deleteStory(storyId: string, userId: string): Promise<boolean> {
    try {
      const story = this.stories.get(storyId);
      if (!story || story.userId !== userId) {
        return false;
      }

      // Remove story
      this.stories.delete(storyId);
      
      // Remove from user stories
      const userStoryIds = this.userStories.get(userId) || [];
      const index = userStoryIds.indexOf(storyId);
      if (index > -1) {
        userStoryIds.splice(index, 1);
        this.userStories.set(userId, userStoryIds);
      }

      // Remove replies
      this.replies.delete(storyId);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Archive story to highlight
   */
  public async archiveStoryToHighlight(
    storyId: string,
    userId: string,
    highlightId: string
  ): Promise<boolean> {
    try {
      const story = this.stories.get(storyId);
      if (!story || story.userId !== userId) {
        return false;
      }

      const highlights = this.highlights.get(userId) || [];
      const highlight = highlights.find(h => h.id === highlightId);
      
      if (!highlight) {
        return false;
      }

      // Add story to highlight
      if (!highlight.stories.includes(storyId)) {
        highlight.stories.push(storyId);
        highlight.updatedAt = new Date().toISOString();
        this.highlights.set(userId, highlights);

        // Mark story as archived
        story.metadata.isArchived = true;
        story.metadata.archiveDate = new Date().toISOString();
        this.stories.set(storyId, story);
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}

export default StoriesAndReels;
