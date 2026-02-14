/**
 * Community Activity Feed System
 * 
 * Instagram-style activity feed for GCC fishing community
 * Real-time social engagement with photos, videos, and stories
 * 
 * Features:
 * - Instagram-style activity feed with photos and videos
 * - Real-time updates and notifications
 * - Likes, comments, shares, and saves
 * - Hashtag system and trending topics
 * - Photo and video uploads with filters
 * - Story system (24-hour expiration)
 * - User mentions and tagging
 * - Location tagging for catches
 * - Algorithmic feed ranking
 */

export interface ActivityPost {
  id: string;
  userId: string;
  type: 'photo' | 'video' | 'text' | 'catch_report' | 'trip_album' | 'story';
  content: {
    text?: string;
    media?: {
      url: string;
      thumbnail?: string;
      duration?: number; // for videos
      type: 'image' | 'video';
      filters: string[];
    }[];
    location?: {
      name: string;
      latitude: number;
      longitude: number;
    };
    tags: string[];
    mentions: string[];
    hashtags: string[];
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    views: number;
  };
  interactions: {
    likedBy: string[];
    savedBy: string[];
    sharedBy: string[];
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    lastActivity: string;
    isEdited: boolean;
    editedAt?: string;
    visibility: 'public' | 'friends' | 'private';
    allowComments: boolean;
    allowSharing: boolean;
  };
  algorithm: {
    score: number;
    trending: boolean;
    featured: boolean;
    priority: number;
  };
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: {
    text: string;
    mentions?: string[];
    replyTo?: string; // Comment ID being replied to
  };
  engagement: {
    likes: number;
    replies: number;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    isEdited: boolean;
    editedAt?: string;
  };
}

export interface Story {
  id: string;
  userId: string;
  type: 'image' | 'video' | 'text';
  content: {
    media: {
      url: string;
      type: 'image' | 'video';
      duration?: number;
      filters: string[];
    };
    text?: string;
    background?: string;
    stickers?: {
      type: 'location' | 'hashtag' | 'mention' | 'custom';
      content: string;
      position: { x: number; y: number };
    }[];
  };
  interactions: {
    views: number;
    replies: number;
    reactions: {
      emoji: string;
      userId: string;
      timestamp: string;
    }[];
  };
  metadata: {
    createdAt: string;
    expiresAt: string;
    viewers: string[];
    isExpired: boolean;
  };
}

export interface Hashtag {
  tag: string;
  count: number;
  trending: boolean;
  category: 'general' | 'species' | 'location' | 'technique' | 'gear' | 'event';
  description?: string;
  createdAt: string;
}

export interface FeedFilter {
  type?: 'all' | 'photos' | 'videos' | 'catch_reports' | 'stories';
  timeRange?: 'hour' | 'day' | 'week' | 'month' | 'year';
  location?: string;
  hashtags?: string[];
  mentions?: string[];
  sortBy?: 'recent' | 'trending' | 'popular' | 'following';
}

export interface FeedAnalytics {
  totalPosts: number;
  activeUsers: number;
  engagementRate: number;
  topHashtags: Hashtag[];
  trendingTopics: { topic: string; posts: number; growth: number }[];
  userActivity: {
    posts: number;
    comments: number;
    likes: number;
    shares: number;
  };
  contentTypes: {
    photos: number;
    videos: number;
    text: number;
    stories: number;
  };
}

export class CommunityActivityFeed {
  private static instance: CommunityActivityFeed;
  private posts: Map<string, ActivityPost> = new Map();
  private comments: Map<string, Comment[]> = new Map();
  private stories: Map<string, Story> = new Map();
  private hashtags: Map<string, Hashtag> = new Map();
  private userFeeds: Map<string, string[]> = new Map(); // userId -> postIds

  // Feed configuration
  private readonly STORY_DURATION_HOURS = 24;
  private readonly TRENDING_THRESHOLD = 10;
  private readonly MAX_POSTS_PER_LOAD = 20;
  private readonly HASHTAG_REGEX = /#[\w]+/g;
  private readonly MENTION_REGEX = /@[\w]+/g;

  public static getInstance(): CommunityActivityFeed {
    if (!CommunityActivityFeed.instance) {
      CommunityActivityFeed.instance = new CommunityActivityFeed();
    }
    return CommunityActivityFeed.instance;
  }

  private constructor() {
    this.initializePopularHashtags();
    this.startStoryExpirationScheduler();
    this.startTrendingUpdateScheduler();
  }

  /**
   * Create new activity post
   */
  public async createPost(
    userId: string,
    type: ActivityPost['type'],
    content: ActivityPost['content'],
    visibility: ActivityPost['metadata']['visibility'] = 'public'
  ): Promise<ActivityPost> {
    try {
      // Process content for hashtags and mentions
      const processedContent = this.processPostContent(content);

      const post: ActivityPost = {
        id: crypto.randomUUID(),
        userId,
        type,
        content: processedContent,
        engagement: {
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          views: 0,
        },
        interactions: {
          likedBy: [],
          savedBy: [],
          sharedBy: [],
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          isEdited: false,
          visibility,
          allowComments: true,
          allowSharing: true,
        },
        algorithm: {
          score: this.calculateInitialScore(userId, type, processedContent),
          trending: false,
          featured: false,
          priority: 1,
        },
      };

      this.posts.set(post.id, post);
      this.comments.set(post.id, []);

      // Update hashtags
      this.updateHashtags(processedContent.hashtags);

      // Add to user feeds
      this.addToUserFeeds(post);

      // Update trending status
      this.updateTrendingStatus(post);

      return post;
    } catch (error) {
      throw new Error(`Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get activity feed
   */
  public async getFeed(
    userId: string,
    filters: FeedFilter = {},
    cursor?: string,
    limit: number = this.MAX_POSTS_PER_LOAD
  ): Promise<{
    posts: ActivityPost[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    try {
      let postIds: string[] = [];

      // Get posts based on filter type
      if (filters.sortBy === 'following') {
        postIds = this.getFollowingFeed(userId);
      } else if (filters.sortBy === 'trending') {
        postIds = this.getTrendingFeed();
      } else if (filters.sortBy === 'popular') {
        postIds = this.getPopularFeed();
      } else {
        postIds = this.getRecentFeed();
      }

      // Apply filters
      postIds = this.applyFilters(postIds, filters);

      // Apply cursor pagination
      const startIndex = cursor ? postIds.indexOf(cursor) + 1 : 0;
      const endIndex = startIndex + limit;
      const paginatedIds = postIds.slice(startIndex, endIndex);

      // Get posts
      const posts = paginatedIds.map(id => this.posts.get(id)).filter(Boolean) as ActivityPost[];

      // Update view counts
      posts.forEach(post => {
        post.engagement.views++;
        post.metadata.lastActivity = new Date().toISOString();
      });

      const hasMore = endIndex < postIds.length;
      const nextCursor = hasMore ? paginatedIds[paginatedIds.length - 1] : undefined;

      return {
        posts,
        nextCursor,
        hasMore,
      };
    } catch (error) {
      throw new Error(`Failed to get feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Like post
   */
  public async likePost(postId: string, userId: string): Promise<boolean> {
    try {
      const post = this.posts.get(postId);
      if (!post) {
        return false;
      }

      // Toggle like
      const likeIndex = post.interactions.likedBy.indexOf(userId);
      if (likeIndex > -1) {
        // Unlike
        post.interactions.likedBy.splice(likeIndex, 1);
        post.engagement.likes--;
      } else {
        // Like
        post.interactions.likedBy.push(userId);
        post.engagement.likes++;
        post.algorithm.score += 1;
      }

      post.metadata.lastActivity = new Date().toISOString();
      this.posts.set(postId, post);

      // Send notification if liking someone else's post
      if (post.userId !== userId && likeIndex === -1) {
        await this.sendLikeNotification(post.userId, userId, postId);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Add comment to post
   */
  public async addComment(
    postId: string,
    userId: string,
    text: string,
    replyTo?: string
  ): Promise<Comment> {
    try {
      const post = this.posts.get(postId);
      if (!post) {
        throw new Error('Post not found');
      }

      if (!post.metadata.allowComments) {
        throw new Error('Comments not allowed on this post');
      }

      // Process comment content
      const mentions = text.match(this.MENTION_REGEX) || [];

      const comment: Comment = {
        id: crypto.randomUUID(),
        postId,
        userId,
        content: {
          text,
          mentions: mentions.map(m => m.substring(1)),
          replyTo,
        },
        engagement: {
          likes: 0,
          replies: 0,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isEdited: false,
        },
      };

      // Add comment
      const comments = this.comments.get(postId) || [];
      comments.push(comment);
      this.comments.set(postId, comments);

      // Update post engagement
      post.engagement.comments++;
      post.algorithm.score += 2;
      post.metadata.lastActivity = new Date().toISOString();
      this.posts.set(postId, post);

      // Send notifications
      if (post.userId !== userId) {
        await this.sendCommentNotification(post.userId, userId, postId, comment.id);
      }

      // Send mention notifications
      for (const mention of mentions) {
        await this.sendMentionNotification(mention.substring(1), userId, postId, comment.id);
      }

      return comment;
    } catch (error) {
      throw new Error(`Failed to add comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get comments for post
   */
  public async getComments(
    postId: string,
    limit: number = 50,
    cursor?: string
  ): Promise<{
    comments: Comment[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    try {
      const comments = this.comments.get(postId) || [];
      
      // Sort by creation date
      const sortedComments = comments.sort((a, b) => 
        new Date(a.metadata.createdAt).getTime() - new Date(b.metadata.createdAt).getTime()
      );

      // Apply pagination
      const startIndex = cursor ? comments.findIndex(c => c.id === cursor) + 1 : 0;
      const endIndex = startIndex + limit;
      const paginatedComments = sortedComments.slice(startIndex, endIndex);

      const hasMore = endIndex < sortedComments.length;
      const nextCursor = hasMore ? paginatedComments[paginatedComments.length - 1]?.id : undefined;

      return {
        comments: paginatedComments,
        nextCursor,
        hasMore,
      };
    } catch (error) {
      throw new Error(`Failed to get comments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create story
   */
  public async createStory(
    userId: string,
    type: Story['type'],
    content: Story['content']
  ): Promise<Story> {
    try {
      const expiresAt = new Date(Date.now() + this.STORY_DURATION_HOURS * 60 * 60 * 1000);

      const story: Story = {
        id: crypto.randomUUID(),
        userId,
        type,
        content,
        interactions: {
          views: 0,
          replies: 0,
          reactions: [],
        },
        metadata: {
          createdAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
          viewers: [],
          isExpired: false,
        },
      };

      this.stories.set(story.id, story);

      return story;
    } catch (error) {
      throw new Error(`Failed to create story: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get active stories
   */
  public async getStories(userId?: string): Promise<Story[]> {
    const now = new Date();
    const activeStories: Story[] = [];

    for (const story of this.stories.values()) {
      if (!story.metadata.isExpired && new Date(story.metadata.expiresAt) > now) {
        if (!userId || story.userId === userId || this.isFollowing(userId, story.userId)) {
          activeStories.push(story);
        }
      }
    }

    // Sort by creation date (newest first)
    return activeStories.sort((a, b) => 
      new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
    );
  }

  /**
   * View story
   */
  public async viewStory(storyId: string, userId: string): Promise<boolean> {
    try {
      const story = this.stories.get(storyId);
      if (!story || story.metadata.isExpired) {
        return false;
      }

      // Add to viewers if not already viewed
      if (!story.metadata.viewers.includes(userId)) {
        story.metadata.viewers.push(userId);
        story.interactions.views++;
        this.stories.set(storyId, story);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get trending hashtags
   */
  public async getTrendingHashtags(limit: number = 20): Promise<Hashtag[]> {
    const trending = Array.from(this.hashtags.values())
      .filter(tag => tag.trending)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return trending;
  }

  /**
   * Search posts
   */
  public async searchPosts(
    query: string,
    filters: FeedFilter = {},
    limit: number = 20
  ): Promise<ActivityPost[]> {
    try {
      const searchTerms = query.toLowerCase().split(' ');
      const matchingPosts: ActivityPost[] = [];

      for (const post of this.posts.values()) {
        if (post.metadata.visibility === 'private') continue;

        let matches = false;

        // Search in text content
        if (post.content.text) {
          const textLower = post.content.text.toLowerCase();
          matches = searchTerms.some(term => textLower.includes(term));
        }

        // Search in hashtags
        if (!matches && post.content.hashtags) {
          matches = post.content.hashtags.some(tag => 
            tag.toLowerCase().includes(query.toLowerCase())
          );
        }

        // Search in location
        if (!matches && post.content.location) {
          matches = post.content.location.name.toLowerCase().includes(query.toLowerCase());
        }

        if (matches) {
          matchingPosts.push(post);
        }
      }

      // Apply additional filters
      const filteredPosts = this.applyFilters(
        matchingPosts.map(p => p.id),
        filters
      ).map(id => this.posts.get(id)).filter(Boolean) as ActivityPost[];

      return filteredPosts.slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to search posts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get feed analytics
   */
  public async getFeedAnalytics(): Promise<FeedAnalytics> {
    const totalPosts = this.posts.size;
    const activeUsers = new Set(Array.from(this.posts.values()).map(p => p.userId)).size;

    // Calculate engagement rate
    const totalLikes = Array.from(this.posts.values()).reduce((sum, p) => sum + p.engagement.likes, 0);
    const totalComments = Array.from(this.posts.values()).reduce((sum, p) => sum + p.engagement.comments, 0);
    const totalEngagements = totalLikes + totalComments;
    const engagementRate = totalPosts > 0 ? (totalEngagements / totalPosts) : 0;

    // Get top hashtags
    const topHashtags = Array.from(this.hashtags.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Content type distribution
    const contentTypes = {
      photos: 0,
      videos: 0,
      text: 0,
      stories: 0,
    };

    for (const post of this.posts.values()) {
      contentTypes[post.type] = (contentTypes[post.type] || 0) + 1;
    }

    return {
      totalPosts,
      activeUsers,
      engagementRate,
      topHashtags,
      trendingTopics: [], // Would calculate from hashtag growth
      userActivity: {
        posts: totalPosts,
        comments: totalComments,
        likes: totalLikes,
        shares: Array.from(this.posts.values()).reduce((sum, p) => sum + p.engagement.shares, 0),
      },
      contentTypes,
    };
  }

  /**
   * Private helper methods
   */
  private processPostContent(content: ActivityPost['content']): ActivityPost['content'] {
    const processed = { ...content };

    // Extract hashtags from text
    if (content.text) {
      const hashtagMatches = content.text.match(this.HASHTAG_REGEX) || [];
      processed.hashtags = hashtagMatches.map(tag => tag.substring(1));
    }

    // Extract mentions from text
    if (content.text) {
      const mentionMatches = content.text.match(this.MENTION_REGEX) || [];
      processed.mentions = mentionMatches.map(mention => mention.substring(1));
    }

    return processed;
  }

  private calculateInitialScore(
    userId: string,
    type: ActivityPost['type'],
    content: ActivityPost['content']
  ): number {
    let score = 10; // Base score

    // Type scoring
    switch (type) {
      case 'video':
        score += 15;
        break;
      case 'photo':
        score += 10;
        break;
      case 'catch_report':
        score += 20;
        break;
      case 'trip_album':
        score += 25;
        break;
      case 'story':
        score += 5;
        break;
    }

    // Content scoring
    if (content.text && content.text.length > 50) {
      score += 5;
    }

    if (content.media && content.media.length > 0) {
      score += content.media.length * 3;
    }

    if (content.location) {
      score += 8;
    }

    if (content.hashtags && content.hashtags.length > 0) {
      score += content.hashtags.length * 2;
    }

    return score;
  }

  private updateHashtags(hashtags: string[]): void {
    for (const tag of hashtags) {
      const existing = this.hashtags.get(tag);
      if (existing) {
        existing.count++;
        this.hashtags.set(tag, existing);
      } else {
        this.hashtags.set(tag, {
          tag,
          count: 1,
          trending: false,
          category: 'general',
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  private addToUserFeeds(post: ActivityPost): void {
    // Add to author's feed
    const authorFeed = this.userFeeds.get(post.userId) || [];
    authorFeed.unshift(post.id);
    this.userFeeds.set(post.userId, authorFeed);

    // Add to followers' feeds (mock implementation)
    // In production, this would query the following relationships
    for (const [userId] of this.userFeeds.entries()) {
      if (this.isFollowing(userId, post.userId)) {
        const followerFeed = this.userFeeds.get(userId) || [];
        followerFeed.unshift(post.id);
        this.userFeeds.set(userId, followerFeed);
      }
    }
  }

  private updateTrendingStatus(post: ActivityPost): void {
    const trendingThreshold = this.TRENDING_THRESHOLD;
    
    if (post.engagement.likes >= trendingThreshold || 
        post.engagement.comments >= trendingThreshold ||
        post.engagement.shares >= trendingThreshold) {
      post.algorithm.trending = true;
      post.algorithm.score += 50;
      this.posts.set(post.id, post);
    }
  }

  private getRecentFeed(): string[] {
    return Array.from(this.posts.values())
      .filter(post => post.metadata.visibility === 'public')
      .sort((a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime())
      .map(post => post.id);
  }

  private getTrendingFeed(): string[] {
    return Array.from(this.posts.values())
      .filter(post => post.metadata.visibility === 'public' && post.algorithm.trending)
      .sort((a, b) => b.algorithm.score - a.algorithm.score)
      .map(post => post.id);
  }

  private getPopularFeed(): string[] {
    return Array.from(this.posts.values())
      .filter(post => post.metadata.visibility === 'public')
      .sort((a, b) => {
        const scoreA = a.engagement.likes + a.engagement.comments * 2 + a.engagement.shares * 3;
        const scoreB = b.engagement.likes + b.engagement.comments * 2 + b.engagement.shares * 3;
        return scoreB - scoreA;
      })
      .map(post => post.id);
  }

  private getFollowingFeed(userId: string): string[] {
    const following = this.getFollowingList(userId);
    const followingPosts = Array.from(this.posts.values())
      .filter(post => following.includes(post.userId) && post.metadata.visibility !== 'private')
      .sort((a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime());
    
    return followingPosts.map(post => post.id);
  }

  private applyFilters(postIds: string[], filters: FeedFilter): string[] {
    let filteredIds = [...postIds];

    // Type filter
    if (filters.type && filters.type !== 'all') {
      filteredIds = filteredIds.filter(id => {
        const post = this.posts.get(id);
        return post && post.type === filters.type;
      });
    }

    // Time range filter
    if (filters.timeRange) {
      const now = new Date();
      let cutoffDate: Date;

      switch (filters.timeRange) {
        case 'hour':
          cutoffDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'day':
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(0);
      }

      filteredIds = filteredIds.filter(id => {
        const post = this.posts.get(id);
        return post && new Date(post.metadata.createdAt) >= cutoffDate;
      });
    }

    // Hashtag filter
    if (filters.hashtags && filters.hashtags.length > 0) {
      filteredIds = filteredIds.filter(id => {
        const post = this.posts.get(id);
        return post && filters.hashtags!.some(tag => post.content.hashtags.includes(tag));
      });
    }

    // Location filter
    if (filters.location) {
      filteredIds = filteredIds.filter(id => {
        const post = this.posts.get(id);
        return post && post.content.location?.name.toLowerCase().includes(filters.location!.toLowerCase());
      });
    }

    return filteredIds;
  }

  private isFollowing(userId: string, targetUserId: string): boolean {
    // Mock implementation - in production, query following relationships
    return Math.random() > 0.7; // 30% chance of following
  }

  private getFollowingList(userId: string): string[] {
    // Mock implementation - in production, query following relationships
    return Array.from(this.posts.values())
      .map(post => post.userId)
      .filter((_, index) => Math.random() > 0.7); // Random sample
  }

  private async sendLikeNotification(postUserId: string, likerUserId: string, postId: string): Promise<void> {
    console.log(`Sending like notification to ${postUserId} from ${likerUserId} for post ${postId}`);
  }

  private async sendCommentNotification(
    postUserId: string,
    commenterUserId: string,
    postId: string,
    commentId: string
  ): Promise<void> {
    console.log(`Sending comment notification to ${postUserId} from ${commenterUserId} for post ${postId}`);
  }

  private async sendMentionNotification(
    mentionedUserId: string,
    mentionerUserId: string,
    postId: string,
    commentId: string
  ): Promise<void> {
    console.log(`Sending mention notification to ${mentionedUserId} from ${mentionerUserId}`);
  }

  private initializePopularHashtags(): void {
    const popularHashtags: Hashtag[] = [
      { tag: 'fishing', count: 1000, trending: true, category: 'general', createdAt: new Date().toISOString() },
      { tag: 'catchoftheday', count: 850, trending: true, category: 'general', createdAt: new Date().toISOString() },
      { tag: 'redfish', count: 600, trending: false, category: 'species', createdAt: new Date().toISOString() },
      { tag: 'speckledtrout', count: 550, trending: false, category: 'species', createdAt: new Date().toISOString() },
      { tag: 'gulfcoast', count: 750, trending: true, category: 'location', createdAt: new Date().toISOString() },
      { tag: 'deepsea', count: 400, trending: false, category: 'technique', createdAt: new Date().toISOString() },
      { tag: 'offshore', count: 450, trending: false, category: 'technique', createdAt: new Date().toISOString() },
      { tag: 'inshore', count: 500, trending: false, category: 'technique', createdAt: new Date().toISOString() },
    ];

    popularHashtags.forEach(hashtag => {
      this.hashtags.set(hashtag.tag, hashtag);
    });
  }

  private startStoryExpirationScheduler(): void {
    // Check for expired stories every hour
    setInterval(() => {
      this.expireStories();
    }, 60 * 60 * 1000);
  }

  private startTrendingUpdateScheduler(): void {
    // Update trending status every 30 minutes
    setInterval(() => {
      this.updateTrendingHashtags();
    }, 30 * 60 * 1000);
  }

  private expireStories(): void {
    const now = new Date();
    
    for (const [id, story] of this.stories.entries()) {
      if (!story.metadata.isExpired && new Date(story.metadata.expiresAt) <= now) {
        story.metadata.isExpired = true;
        this.stories.set(id, story);
      }
    }
  }

  private updateTrendingHashtags(): void {
    for (const [tag, hashtag] of this.hashtags.entries()) {
      const wasTrending = hashtag.trending;
      const isTrending = hashtag.count >= this.TRENDING_THRESHOLD;
      
      if (wasTrending !== isTrending) {
        hashtag.trending = isTrending;
        this.hashtags.set(tag, hashtag);
      }
    }
  }

  /**
   * Get post by ID
   */
  public async getPostById(postId: string): Promise<ActivityPost | null> {
    return this.posts.get(postId) || null;
  }

  /**
   * Delete post
   */
  public async deletePost(postId: string, userId: string): Promise<boolean> {
    try {
      const post = this.posts.get(postId);
      if (!post || post.userId !== userId) {
        return false;
      }

      this.posts.delete(postId);
      this.comments.delete(postId);

      // Remove from user feeds
      for (const [feedUserId, feed] of this.userFeeds.entries()) {
        const index = feed.indexOf(postId);
        if (index > -1) {
          feed.splice(index, 1);
          this.userFeeds.set(feedUserId, feed);
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}

export default CommunityActivityFeed;
