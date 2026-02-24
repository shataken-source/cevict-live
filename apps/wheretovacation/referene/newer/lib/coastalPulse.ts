/**
 * Unified "Coastal Pulse" Message Board System
 *
 * Creates a single backend for GCC and WTV with channel-based organization.
 * Enables cross-pollination of content and shared community engagement.
 *
 * Features:
 * - Unified message board with channel system
 * - Cross-site content distribution and filtering
 * - Shared trust levels and badges across domains
 * - Real-time WebSocket communication
 * - Content moderation and approval workflows
 * - Analytics and engagement tracking
 * - Cross-site favorites and trip planning
 */

import { EventEmitter } from 'events';

export interface CoastalPulsePost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userTrustLevel: 'new' | 'verified' | 'veteran' | 'elite';
  userBadges: string[];
  
  // Content
  title: string;
  content: string;
  postType: 'discussion' | 'catch_report' | 'local_tip' | 'safety_alert' | 'deal' | 'photo_share';
  channel: string;
  tags: string[];
  
  // Cross-Site
  sites: string[]; // ['gcc', 'wtv']
  primarySite: 'gcc' | 'wtv';
  
  // Engagement
  likes: number;
  replies: number;
  views: number;
  isLiked: boolean;
  
  // Media
  attachments: Attachment[];
  
  // Location
  location?: {
    lat: number;
    lng: number;
    name: string;
  };
  
  // Moderation
  isApproved: boolean;
  isPinned: boolean;
  moderatedBy?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActivity?: Date;
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'document';
  url: string;
  thumbnail?: string;
  size: number;
  name: string;
}

export interface CoastalPulseReply {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userTrustLevel: string;
  userBadges: string[];
  
  content: string;
  attachments: Attachment[];
  likes: number;
  isLiked: boolean;
  
  // Cross-Site
  sites: string[];
  primarySite: 'gcc' | 'wtv';
  
  createdAt: Date;
  updatedAt: Date;
}

export interface Channel {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  sites: string[]; // Which sites can access this channel
  isDefault: boolean;
  postTypes: string[];
  requiresTrustLevel?: string;
}

export interface CoastalPulseConfig {
  site: 'gcc' | 'wtv';
  userId: string;
  channels: string[];
  showCrossSiteContent: boolean;
  trustLevel: string;
  badges: string[];
}

class CoastalPulse extends EventEmitter {
  private config: CoastalPulseConfig;
  private posts: Map<string, CoastalPulsePost> = new Map();
  private replies: Map<string, CoastalPulseReply[]> = new Map();
  private channels: Map<string, Channel> = new Map();
  private websocket: WebSocket | null = null;
  private filters: {
    channels: string[];
    postTypes: string[];
    sites: string[];
    trustLevel: string;
  } = {
    channels: [],
    postTypes: [],
    sites: ['gcc', 'wtv'],
    trustLevel: 'new'
  };

  constructor(config: CoastalPulseConfig) {
    super();
    this.config = config;
    this.initializeChannels();
    this.connectWebSocket();
  }

  /**
   * Initialize default channels
   */
  private initializeChannels(): void {
    const defaultChannels: Channel[] = [
      // Cross-Site Channels
      {
        id: 'general',
        name: 'general',
        displayName: 'General Discussion',
        description: 'General conversation for the entire community',
        icon: '💬',
        color: '#3B82F6',
        sites: ['gcc', 'wtv'],
        isDefault: true,
        postTypes: ['discussion', 'photo_share']
      },
      {
        id: 'ask_local',
        name: 'ask_local',
        displayName: 'Ask a Local',
        description: 'Get advice from locals who know the area best',
        icon: '❓',
        color: '#10B981',
        sites: ['gcc', 'wtv'],
        isDefault: true,
        postTypes: ['discussion']
      },
      {
        id: 'safety',
        name: 'safety',
        displayName: 'Safety & Prep',
        description: 'Safety tips, weather alerts, and preparation advice',
        icon: '⚠️',
        color: '#EF4444',
        sites: ['gcc', 'wtv'],
        isDefault: true,
        postTypes: ['safety_alert', 'discussion']
      },
      {
        id: 'deals',
        name: 'deals',
        displayName: 'Local Deals',
        description: 'Exclusive deals for trusted community members',
        icon: '🎉',
        color: '#F59E0B',
        sites: ['gcc', 'wtv'],
        isDefault: false,
        postTypes: ['deal'],
        requiresTrustLevel: 'verified'
      },
      
      // GCC-Specific Channels
      {
        id: 'gcc_catches',
        name: 'gcc_catches',
        displayName: 'Live Catch Reports',
        description: 'Real-time catch reports and fishing updates',
        icon: '🐟',
        color: '#059669',
        sites: ['gcc'],
        isDefault: true,
        postTypes: ['catch_report', 'photo_share']
      },
      {
        id: 'gcc_techniques',
        name: 'gcc_techniques',
        displayName: 'Fishing Techniques',
        description: 'Tips, tricks, and techniques for better fishing',
        icon: '🎣',
        color: '#0891B2',
        sites: ['gcc'],
        isDefault: false,
        postTypes: ['discussion', 'local_tip']
      },
      
      // WTV-Specific Channels
      {
        id: 'wtv_local',
        name: 'wtv_local',
        displayName: 'Local Vibes',
        description: 'What\'s happening around town',
        icon: '🏖️',
        color: '#7C3AED',
        sites: ['wtv'],
        isDefault: true,
        postTypes: ['discussion', 'photo_share', 'local_tip']
      },
      {
        id: 'wtv_food',
        name: 'wtv_food',
        displayName: 'Food & Dining',
        description: 'Restaurant reviews and local food scene',
        icon: '🍽️',
        color: '#DC2626',
        sites: ['wtv'],
        isDefault: false,
        postTypes: ['discussion', 'local_tip']
      }
    ];

    defaultChannels.forEach(channel => {
      this.channels.set(channel.id, channel);
    });
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  private connectWebSocket(): void {
    try {
      const wsUrl = process.env.NEXT_PUBLIC_COASTAL_PULSE_WS || 'ws://localhost:8080/coastal-pulse';
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('Coastal Pulse WebSocket connected');
        this.joinChannels();
        this.emit('connected');
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRealtimeUpdate(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.websocket.onclose = () => {
        console.log('Coastal Pulse WebSocket disconnected');
        this.emit('disconnected');
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }

  /**
   * Join appropriate channels based on user site and permissions
   */
  private joinChannels(): void {
    const availableChannels = Array.from(this.channels.values())
      .filter(channel => 
        channel.sites.includes(this.config.site) &&
        (!channel.requiresTrustLevel || this.checkTrustLevel(channel.requiresTrustLevel))
      );

    if (this.websocket) {
      this.websocket.send(JSON.stringify({
        type: 'join_channels',
        channels: availableChannels.map(c => c.id),
        userId: this.config.userId,
        site: this.config.site
      }));
    }
  }

  /**
   * Check if user meets trust level requirement
   */
  private checkTrustLevel(requiredLevel: string): boolean {
    const levels = { 'new': 0, 'verified': 1, 'veteran': 2, 'elite': 3 };
    const userLevel = levels[this.config.trustLevel as keyof typeof levels] || 0;
    const required = levels[requiredLevel as keyof typeof levels] || 0;
    return userLevel >= required;
  }

  /**
   * Create a new post
   */
  public async createPost(postData: {
    title: string;
    content: string;
    postType: string;
    channel: string;
    tags?: string[];
    attachments?: Attachment[];
    location?: any;
  }): Promise<CoastalPulsePost> {
    try {
      // Validate channel access
      const channel = this.channels.get(postData.channel);
      if (!channel || !channel.sites.includes(this.config.site)) {
        throw new Error('Channel not accessible');
      }

      if (channel.requiresTrustLevel && !this.checkTrustLevel(channel.requiresTrustLevel)) {
        throw new Error('Insufficient trust level for this channel');
      }

      // Determine cross-site visibility
      const sites = this.determinePostVisibility(postData.channel, postData.postType);

      const post: CoastalPulsePost = {
        id: `post-${Date.now()}`,
        userId: this.config.userId,
        userName: 'Current User', // Would come from user profile
        userAvatar: '',
        userTrustLevel: this.config.trustLevel as any,
        userBadges: this.config.badges,
        title: postData.title,
        content: postData.content,
        postType: postData.postType as any,
        channel: postData.channel,
        tags: postData.tags || [],
        sites,
        primarySite: this.config.site,
        likes: 0,
        replies: 0,
        views: 0,
        isLiked: false,
        attachments: postData.attachments || [],
        location: postData.location,
        isApproved: true,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save post
      this.posts.set(post.id, post);
      this.replies.set(post.id, []);

      // Broadcast to WebSocket
      if (this.websocket) {
        this.websocket.send(JSON.stringify({
          type: 'new_post',
          post: this.filterPostForSite(post, this.config.site)
        }));
      }

      // Update analytics
      this.updateAnalytics('post_created', post);

      this.emit('post_created', post);
      return post;

    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  /**
   * Get posts with filtering and pagination
   */
  public async getPosts(options: {
    channel?: string;
    postType?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'recent' | 'popular' | 'trending';
  } = {}): Promise<CoastalPulsePost[]> {
    try {
      let posts = Array.from(this.posts.values());

      // Filter by site access
      posts = posts.filter(post => 
        post.sites.includes(this.config.site) &&
        post.isApproved
      );

      // Apply filters
      if (options.channel) {
        posts = posts.filter(post => post.channel === options.channel);
      }

      if (options.postType) {
        posts = posts.filter(post => post.postType === options.postType);
      }

      // Sort
      switch (options.sortBy) {
        case 'popular':
          posts.sort((a, b) => (b.likes + b.replies) - (a.likes + a.replies));
          break;
        case 'trending':
          posts.sort((a, b) => {
            const aScore = this.calculateTrendingScore(a);
            const bScore = this.calculateTrendingScore(b);
            return bScore - aScore;
          });
          break;
        default: // recent
          posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }

      // Apply pagination
      const limit = options.limit || 20;
      const offset = options.offset || 0;
      posts = posts.slice(offset, offset + limit);

      // Filter sensitive data for current site
      return posts.map(post => this.filterPostForSite(post, this.config.site));

    } catch (error) {
      console.error('Error getting posts:', error);
      return [];
    }
  }

  /**
   * Get replies for a post
   */
  public async getReplies(postId: string): Promise<CoastalPulseReply[]> {
    try {
      const replies = this.replies.get(postId) || [];
      
      // Filter by site access
      return replies
        .filter(reply => reply.sites.includes(this.config.site))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    } catch (error) {
      console.error('Error getting replies:', error);
      return [];
    }
  }

  /**
   * Create a reply
   */
  public async createReply(postId: string, content: string, attachments?: Attachment[]): Promise<CoastalPulseReply> {
    try {
      const post = this.posts.get(postId);
      if (!post) {
        throw new Error('Post not found');
      }

      if (!post.sites.includes(this.config.site)) {
        throw new Error('Cannot reply to this post');
      }

      const reply: CoastalPulseReply = {
        id: `reply-${Date.now()}`,
        postId,
        userId: this.config.userId,
        userName: 'Current User',
        userAvatar: '',
        userTrustLevel: this.config.trustLevel,
        userBadges: this.config.badges,
        content,
        attachments: attachments || [],
        likes: 0,
        isLiked: false,
        sites: post.sites,
        primarySite: this.config.site,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save reply
      const replies = this.replies.get(postId) || [];
      replies.push(reply);
      this.replies.set(postId, replies);

      // Update post reply count and last activity
      post.replies = replies.length;
      post.lastActivity = new Date();

      // Broadcast reply
      if (this.websocket) {
        this.websocket.send(JSON.stringify({
          type: 'new_reply',
          postId,
          reply: this.filterReplyForSite(reply, this.config.site)
        }));
      }

      this.emit('reply_created', reply);
      return reply;

    } catch (error) {
      console.error('Error creating reply:', error);
      throw error;
    }
  }

  /**
   * Like/unlike a post or reply
   */
  public async toggleLike(itemId: string, itemType: 'post' | 'reply'): Promise<boolean> {
    try {
      let item: CoastalPulsePost | CoastalPulseReply | undefined;

      if (itemType === 'post') {
        item = this.posts.get(itemId);
      } else {
        // Find reply across all posts
        for (const replies of this.replies.values()) {
          const reply = replies.find(r => r.id === itemId);
          if (reply) {
            item = reply;
            break;
          }
        }
      }

      if (!item) {
        throw new Error('Item not found');
      }

      // Toggle like (in real implementation, would check database)
      item.isLiked = !item.isLiked;
      item.likes += item.isLiked ? 1 : -1;

      // Broadcast like update
      if (this.websocket) {
        this.websocket.send(JSON.stringify({
          type: 'like_updated',
          itemId,
          itemType,
          likes: item.likes,
          isLiked: item.isLiked
        }));
      }

      this.emit('like_updated', { itemId, itemType, likes: item.likes, isLiked: item.isLiked });
      return item.isLiked;

    } catch (error) {
      console.error('Error toggling like:', error);
      return false;
    }
  }

  /**
   * Determine post visibility across sites
   */
  private determinePostVisibility(channel: string, postType: string): string[] {
    const visibilityMap: Record<string, string[]> = {
      'gcc_catches': ['gcc'],
      'wtv_local': ['wtv'],
      'wtv_food': ['wtv'],
      'gcc_techniques': ['gcc'],
      'general': ['gcc', 'wtv'],
      'ask_local': ['gcc', 'wtv'],
      'safety': ['gcc', 'wtv'],
      'deals': ['gcc', 'wtv']
    };

    return visibilityMap[channel] || [this.config.site];
  }

  /**
   * Filter post data for specific site
   */
  private filterPostForSite(post: CoastalPulsePost, site: string): CoastalPulsePost {
    return {
      ...post,
      // Only show posts visible to this site
      sites: post.sites.includes(site) ? post.sites : []
    };
  }

  /**
   * Filter reply data for specific site
   */
  private filterReplyForSite(reply: CoastalPulseReply, site: string): CoastalPulseReply {
    return {
      ...reply,
      // Only show replies visible to this site
      sites: reply.sites.includes(site) ? reply.sites : []
    };
  }

  /**
   * Calculate trending score for posts
   */
  private calculateTrendingScore(post: CoastalPulsePost): number {
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - post.createdAt.getTime()) / (1000 * 60 * 60);
    
    // Recent posts get higher scores
    const recencyFactor = Math.max(1, 24 - hoursSinceCreation);
    
    // Engagement factors
    const engagementScore = post.likes + (post.replies * 2);
    
    return Math.round(engagementScore * recencyFactor);
  }

  /**
   * Handle real-time updates from WebSocket
   */
  private handleRealtimeUpdate(data: any): void {
    switch (data.type) {
      case 'new_post':
        this.posts.set(data.post.id, data.post);
        this.emit('new_post', data.post);
        break;
      case 'new_reply':
        const replies = this.replies.get(data.postId) || [];
        replies.push(data.reply);
        this.replies.set(data.postId, replies);
        this.emit('new_reply', data.reply);
        break;
      case 'like_updated':
        this.emit('like_updated', data);
        break;
    }
  }

  /**
   * Update analytics
   */
  private updateAnalytics(event: string, data: any): void {
    // In real implementation, would send to analytics service
    console.log('Analytics event:', event, data);
  }

  /**
   * Get available channels for current user
   */
  public getAvailableChannels(): Channel[] {
    return Array.from(this.channels.values())
      .filter(channel => 
        channel.sites.includes(this.config.site) &&
        (!channel.requiresTrustLevel || this.checkTrustLevel(channel.requiresTrustLevel))
      );
  }

  /**
   * Update filters
   */
  public updateFilters(newFilters: Partial<typeof this.filters>): void {
    this.filters = { ...this.filters, ...newFilters };
    this.emit('filters_updated', this.filters);
  }

  /**
   * Get current filters
   */
  public getFilters(): typeof this.filters {
    return { ...this.filters };
  }

  /**
   * Destroy connection
   */
  public destroy(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.removeAllListeners();
  }
}

export default CoastalPulse;
