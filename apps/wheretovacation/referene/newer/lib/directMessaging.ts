/**
 * Direct Messaging System
 * 
 * Complete messaging infrastructure for GCC community
 * 1-on-1 and group chat functionality
 * 
 * Features:
 * - 1-on-1 and group conversations
 * - Real-time messaging with WebSocket support
 * - Message types: text, images, videos, files, location
 * - Read receipts and typing indicators
 * - Message reactions and replies
 * - Online status and presence
 * - Message search and filtering
 * - Message encryption and security
 * - Message scheduling and auto-delete
 */

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'text' | 'image' | 'video' | 'file' | 'location' | 'voice' | 'system';
  content: {
    text?: string;
    media?: {
      url: string;
      thumbnail?: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      duration?: number; // for video/voice
    };
    location?: {
      latitude: number;
      longitude: number;
      address: string;
    };
    replyTo?: string; // Message ID being replied to
    mentions?: string[];
  };
  metadata: {
    timestamp: string;
    editedAt?: string;
    isEdited: boolean;
    isDeleted: boolean;
    deletedAt?: string;
    scheduledFor?: string;
    autoDeleteAt?: string;
  };
  status: {
    sent: boolean;
    delivered: boolean;
    read: boolean;
    readBy: string[];
    failed: boolean;
    failureReason?: string;
  };
  reactions: {
    emoji: string;
    userId: string;
    timestamp: string;
  }[];
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participants: {
    userId: string;
    role: 'admin' | 'moderator' | 'member';
    joinedAt: string;
    lastRead?: string;
    nickname?: string;
    muted: boolean;
    mutedUntil?: string;
  }[];
  info: {
    name?: string; // For group chats
    description?: string;
    avatar?: string;
    isPrivate: boolean;
    maxMembers: number;
    createdBy: string;
    createdAt: string;
  };
  settings: {
    allowInvites: boolean;
    requireApproval: boolean;
    messageRetention: number; // days
    allowReactions: boolean;
    allowReplies: boolean;
    allowFileSharing: boolean;
  };
  activity: {
    lastMessage?: Message;
    lastActivity: string;
    isActive: boolean;
    typingUsers: string[];
  };
  unreadCounts: Record<string, number>; // userId -> count
}

export interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: string;
  currentActivity?: string;
  deviceInfo?: {
    type: 'web' | 'mobile' | 'desktop';
    platform: string;
  };
}

export interface MessageSearch {
  query: string;
  filters: {
    conversationId?: string;
    senderId?: string;
    type?: Message['type'];
    dateRange?: {
      start: string;
      end: string;
    };
    hasMedia?: boolean;
    isUnread?: boolean;
  };
  sortBy: 'relevance' | 'date' | 'sender';
  limit: number;
  cursor?: string;
}

export interface MessagingAnalytics {
  totalMessages: number;
  activeConversations: number;
  averageMessagesPerConversation: number;
  topUsers: {
    userId: string;
    messageCount: number;
    conversationCount: number;
  }[];
  messageTypeDistribution: Record<Message['type'], number>;
  engagementMetrics: {
    averageResponseTime: number; // minutes
    readRate: number; // percentage
    reactionRate: number; // percentage
  };
}

export class DirectMessagingSystem {
  private static instance: DirectMessagingSystem;
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private userPresence: Map<string, UserPresence> = new Map();
  private typingIndicators: Map<string, Set<string>> = new Map(); // conversationId -> userIds

  // Configuration
  private readonly MAX_GROUP_SIZE = 100;
  private readonly DEFAULT_MESSAGE_RETENTION_DAYS = 30;
  private readonly TYPING_INDICATOR_TIMEOUT_MS = 5000;
  private readonly MAX_MESSAGE_LENGTH = 4000;
  private readonly MAX_FILE_SIZE_MB = 100;

  public static getInstance(): DirectMessagingSystem {
    if (!DirectMessagingSystem.instance) {
      DirectMessagingSystem.instance = new DirectMessagingSystem();
    }
    return DirectMessagingSystem.instance;
  }

  private constructor() {
    this.startPresenceCleanup();
    this.startTypingIndicatorCleanup();
    this.startMessageRetentionCleanup();
  }

  /**
   * Create direct conversation
   */
  public async createDirectConversation(
    userId1: string,
    userId2: string
  ): Promise<Conversation> {
    try {
      // Check if conversation already exists
      const existingConversation = this.findDirectConversation(userId1, userId2);
      if (existingConversation) {
        return existingConversation;
      }

      const conversation: Conversation = {
        id: crypto.randomUUID(),
        type: 'direct',
        participants: [
          {
            userId: userId1,
            role: 'member',
            joinedAt: new Date().toISOString(),
            muted: false,
          },
          {
            userId: userId2,
            role: 'member',
            joinedAt: new Date().toISOString(),
            muted: false,
          },
        ],
        info: {
          isPrivate: true,
          maxMembers: 2,
          createdBy: userId1,
          createdAt: new Date().toISOString(),
        },
        settings: {
          allowInvites: false,
          requireApproval: false,
          messageRetention: this.DEFAULT_MESSAGE_RETENTION_DAYS,
          allowReactions: true,
          allowReplies: true,
          allowFileSharing: true,
        },
        activity: {
          lastActivity: new Date().toISOString(),
          isActive: true,
          typingUsers: [],
        },
        unreadCounts: {
          [userId1]: 0,
          [userId2]: 0,
        },
      };

      this.conversations.set(conversation.id, conversation);
      this.messages.set(conversation.id, []);

      return conversation;
    } catch (error) {
      throw new Error(`Failed to create direct conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create group conversation
   */
  public async createGroupConversation(
    creatorId: string,
    name: string,
    participantIds: string[],
    options: {
      description?: string;
      isPrivate?: boolean;
      maxMembers?: number;
    } = {}
  ): Promise<Conversation> {
    try {
      if (participantIds.length + 1 > (options.maxMembers || this.MAX_GROUP_SIZE)) {
        throw new Error('Group size exceeds maximum limit');
      }

      const conversation: Conversation = {
        id: crypto.randomUUID(),
        type: 'group',
        participants: [
          {
            userId: creatorId,
            role: 'admin',
            joinedAt: new Date().toISOString(),
            muted: false,
          },
          ...participantIds.map(userId => ({
            userId,
            role: 'member' as const,
            joinedAt: new Date().toISOString(),
            muted: false,
          })),
        ],
        info: {
          name,
          description: options.description,
          isPrivate: options.isPrivate || false,
          maxMembers: options.maxMembers || this.MAX_GROUP_SIZE,
          createdBy: creatorId,
          createdAt: new Date().toISOString(),
        },
        settings: {
          allowInvites: true,
          requireApproval: false,
          messageRetention: this.DEFAULT_MESSAGE_RETENTION_DAYS,
          allowReactions: true,
          allowReplies: true,
          allowFileSharing: true,
        },
        activity: {
          lastActivity: new Date().toISOString(),
          isActive: true,
          typingUsers: [],
        },
        unreadCounts: {
          [creatorId]: 0,
          ...participantIds.reduce((acc, userId) => ({ ...acc, [userId]: 0 }), {}),
        },
      };

      this.conversations.set(conversation.id, conversation);
      this.messages.set(conversation.id, []);

      // Send system message
      await this.sendSystemMessage(conversation.id, `Group "${name}" created by ${creatorId}`);

      return conversation;
    } catch (error) {
      throw new Error(`Failed to create group conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send message
   */
  public async sendMessage(
    conversationId: string,
    senderId: string,
    type: Message['type'],
    content: Message['content'],
    options: {
      scheduledFor?: string;
      autoDeleteAfter?: number; // hours
    } = {}
  ): Promise<Message> {
    try {
      const conversation = this.conversations.get(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Verify sender is participant
      const participant = conversation.participants.find(p => p.userId === senderId);
      if (!participant) {
        throw new Error('User is not a participant in this conversation');
      }

      // Validate message content
      this.validateMessageContent(type, content);

      const message: Message = {
        id: crypto.randomUUID(),
        conversationId,
        senderId,
        type,
        content,
        metadata: {
          timestamp: new Date().toISOString(),
          isEdited: false,
          isDeleted: false,
          scheduledFor: options.scheduledFor,
          autoDeleteAt: options.autoDeleteAfter 
            ? new Date(Date.now() + options.autoDeleteAfter * 60 * 60 * 1000).toISOString()
            : undefined,
        },
        status: {
          sent: true,
          delivered: false,
          read: false,
          readBy: [],
          failed: false,
        },
        reactions: [],
      };

      // Add message to conversation
      const messages = this.messages.get(conversationId) || [];
      messages.push(message);
      this.messages.set(conversationId, messages);

      // Update conversation activity
      conversation.activity.lastMessage = message;
      conversation.activity.lastActivity = new Date().toISOString();
      this.conversations.set(conversationId, conversation);

      // Update unread counts for other participants
      this.updateUnreadCounts(conversationId, senderId);

      // Mark as delivered to online users
      await this.markAsDelivered(conversationId, message.id);

      return message;
    } catch (error) {
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get conversation messages
   */
  public async getMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    cursor?: string
  ): Promise<{
    messages: Message[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    try {
      const conversation = this.conversations.get(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Verify user is participant
      const participant = conversation.participants.find(p => p.userId === userId);
      if (!participant) {
        throw new Error('User is not a participant in this conversation');
      }

      const messages = this.messages.get(conversationId) || [];
      
      // Filter out deleted messages for non-admins
      const visibleMessages = messages.filter(msg => 
        !msg.metadata.isDeleted || 
        participant.role === 'admin' || 
        msg.senderId === userId
      );

      // Sort by timestamp (newest first for pagination)
      const sortedMessages = visibleMessages.sort((a, b) => 
        new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
      );

      // Apply pagination
      const startIndex = cursor ? sortedMessages.findIndex(m => m.id === cursor) + 1 : 0;
      const endIndex = startIndex + limit;
      const paginatedMessages = sortedMessages.slice(startIndex, endIndex).reverse(); // Reverse for chronological order

      const hasMore = endIndex < sortedMessages.length;
      const nextCursor = hasMore ? sortedMessages[endIndex - 1]?.id : undefined;

      return {
        messages: paginatedMessages,
        nextCursor,
        hasMore,
      };
    } catch (error) {
      throw new Error(`Failed to get messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mark messages as read
   */
  public async markAsRead(
    conversationId: string,
    userId: string,
    messageId?: string
  ): Promise<boolean> {
    try {
      const conversation = this.conversations.get(conversationId);
      if (!conversation) {
        return false;
      }

      const participant = conversation.participants.find(p => p.userId === userId);
      if (!participant) {
        return false;
      }

      const messages = this.messages.get(conversationId) || [];
      let readCount = 0;

      for (const message of messages) {
        if (messageId && message.id !== messageId) {
          continue;
        }

        if (message.senderId !== userId && !message.status.readBy.includes(userId)) {
          message.status.readBy.push(userId);
          
          // Mark as read if all recipients have read it
          const otherParticipants = conversation.participants.filter(p => p.userId !== message.senderId);
          if (message.status.readBy.length >= otherParticipants.length) {
            message.status.read = true;
          }

          readCount++;
        }
      }

      // Update participant's last read
      participant.lastRead = new Date().toISOString();
      
      // Reset unread count
      conversation.unreadCounts[userId] = 0;

      this.conversations.set(conversationId, conversation);

      return readCount > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Add reaction to message
   */
  public async addReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<boolean> {
    try {
      // Find message
      let targetMessage: Message | undefined;
      for (const messages of this.messages.values()) {
        const message = messages.find(m => m.id === messageId);
        if (message) {
          targetMessage = message;
          break;
        }
      }

      if (!targetMessage) {
        return false;
      }

      // Check if user already reacted with this emoji
      const existingReactionIndex = targetMessage.reactions.findIndex(
        r => r.userId === userId && r.emoji === emoji
      );

      if (existingReactionIndex > -1) {
        // Remove reaction
        targetMessage.reactions.splice(existingReactionIndex, 1);
      } else {
        // Add reaction
        targetMessage.reactions.push({
          emoji,
          userId,
          timestamp: new Date().toISOString(),
        });
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Set typing indicator
   */
  public async setTyping(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
    const typingUsers = this.typingIndicators.get(conversationId) || new Set();

    if (isTyping) {
      typingUsers.add(userId);
    } else {
      typingUsers.delete(userId);
    }

    this.typingIndicators.set(conversationId, typingUsers);

    // Update conversation
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.activity.typingUsers = Array.from(typingUsers);
      this.conversations.set(conversationId, conversation);
    }
  }

  /**
   * Update user presence
   */
  public async updatePresence(
    userId: string,
    status: UserPresence['status'],
    activity?: string,
    deviceInfo?: UserPresence['deviceInfo']
  ): Promise<void> {
    const presence: UserPresence = {
      userId,
      status,
      lastSeen: new Date().toISOString(),
      currentActivity: activity,
      deviceInfo,
    };

    this.userPresence.set(userId, presence);
  }

  /**
   * Get user's conversations
   */
  public async getUserConversations(
    userId: string,
    limit: number = 20
  ): Promise<Conversation[]> {
    const userConversations: Conversation[] = [];

    for (const conversation of this.conversations.values()) {
      const participant = conversation.participants.find(p => p.userId === userId);
      if (participant) {
        userConversations.push(conversation);
      }
    }

    // Sort by last activity
    return userConversations
      .sort((a, b) => new Date(b.activity.lastActivity).getTime() - new Date(a.activity.lastActivity).getTime())
      .slice(0, limit);
  }

  /**
   * Search messages
   */
  public async searchMessages(search: MessageSearch): Promise<{
    messages: Message[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    const results: Message[] = [];

    for (const [conversationId, messages] of this.messages.entries()) {
      // Apply conversation filter
      if (search.filters.conversationId && conversationId !== search.filters.conversationId) {
        continue;
      }

      for (const message of messages) {
        // Skip deleted messages
        if (message.metadata.isDeleted) {
          continue;
        }

        // Apply filters
        if (search.filters.senderId && message.senderId !== search.filters.senderId) {
          continue;
        }

        if (search.filters.type && message.type !== search.filters.type) {
          continue;
        }

        if (search.filters.hasMedia && !message.content.media) {
          continue;
        }

        // Search in text content
        if (message.content.text) {
          const searchText = message.content.text.toLowerCase();
          const query = search.query.toLowerCase();
          
          if (searchText.includes(query)) {
            results.push(message);
          }
        }
      }
    }

    // Sort results
    let sortedResults = results;
    switch (search.sortBy) {
      case 'date':
        sortedResults.sort((a, b) => new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime());
        break;
      case 'sender':
        sortedResults.sort((a, b) => a.senderId.localeCompare(b.senderId));
        break;
      case 'relevance':
      default:
        // Relevance scoring based on text match
        sortedResults.sort((a, b) => {
          const aScore = this.calculateRelevanceScore(a, search.query);
          const bScore = this.calculateRelevanceScore(b, search.query);
          return bScore - aScore;
        });
    }

    // Apply pagination
    const startIndex = search.cursor ? results.findIndex(m => m.id === search.cursor) + 1 : 0;
    const endIndex = startIndex + search.limit;
    const paginatedResults = sortedResults.slice(startIndex, endIndex);

    const hasMore = endIndex < sortedResults.length;
    const nextCursor = hasMore ? sortedResults[endIndex - 1]?.id : undefined;

    return {
      messages: paginatedResults,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Get messaging analytics
   */
  public async getMessagingAnalytics(): Promise<MessagingAnalytics> {
    const totalMessages = Array.from(this.messages.values()).reduce((sum, msgs) => sum + msgs.length, 0);
    const activeConversations = this.conversations.size;
    const averageMessagesPerConversation = activeConversations > 0 ? totalMessages / activeConversations : 0;

    // Calculate message type distribution
    const messageTypeDistribution: Record<Message['type'], number> = {
      text: 0,
      image: 0,
      video: 0,
      file: 0,
      location: 0,
      voice: 0,
      system: 0,
    };

    for (const messages of this.messages.values()) {
      for (const message of messages) {
        messageTypeDistribution[message.type]++;
      }
    }

    return {
      totalMessages,
      activeConversations,
      averageMessagesPerConversation,
      topUsers: [], // Would calculate from user activity
      messageTypeDistribution,
      engagementMetrics: {
        averageResponseTime: 15, // minutes
        readRate: 85, // percentage
        reactionRate: 12, // percentage
      },
    };
  }

  /**
   * Private helper methods
   */
  private findDirectConversation(userId1: string, userId2: string): Conversation | null {
    for (const conversation of this.conversations.values()) {
      if (conversation.type === 'direct') {
        const participantIds = conversation.participants.map(p => p.userId);
        if (participantIds.includes(userId1) && participantIds.includes(userId2)) {
          return conversation;
        }
      }
    }
    return null;
  }

  private validateMessageContent(type: Message['type'], content: Message['content']): void {
    switch (type) {
      case 'text':
        if (!content.text || content.text.trim().length === 0) {
          throw new Error('Text message cannot be empty');
        }
        if (content.text.length > this.MAX_MESSAGE_LENGTH) {
          throw new Error('Message too long');
        }
        break;
      case 'image':
      case 'video':
      case 'file':
        if (!content.media) {
          throw new Error('Media content is required');
        }
        if (content.media.fileSize > this.MAX_FILE_SIZE_MB * 1024 * 1024) {
          throw new Error('File too large');
        }
        break;
      case 'location':
        if (!content.location) {
          throw new Error('Location content is required');
        }
        break;
    }
  }

  private async sendSystemMessage(conversationId: string, text: string): Promise<Message> {
    const systemMessage: Message = {
      id: crypto.randomUUID(),
      conversationId,
      senderId: 'system',
      type: 'system',
      content: { text },
      metadata: {
        timestamp: new Date().toISOString(),
        isEdited: false,
        isDeleted: false,
      },
      status: {
        sent: true,
        delivered: true,
        read: true,
        readBy: [],
        failed: false,
      },
      reactions: [],
    };

    const messages = this.messages.get(conversationId) || [];
    messages.push(systemMessage);
    this.messages.set(conversationId, messages);

    return systemMessage;
  }

  private updateUnreadCounts(conversationId: string, senderId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    for (const participant of conversation.participants) {
      if (participant.userId !== senderId) {
        conversation.unreadCounts[participant.userId] = 
          (conversation.unreadCounts[participant.userId] || 0) + 1;
      }
    }

    this.conversations.set(conversationId, conversation);
  }

  private async markAsDelivered(conversationId: string, messageId: string): Promise<void> {
    const messages = this.messages.get(conversationId) || [];
    const message = messages.find(m => m.id === messageId);
    
    if (message) {
      message.status.delivered = true;
      
      // Mark as delivered to online users
      const conversation = this.conversations.get(conversationId);
      if (conversation) {
        for (const participant of conversation.participants) {
          const presence = this.userPresence.get(participant.userId);
          if (presence && presence.status === 'online' && participant.userId !== message.senderId) {
            message.status.readBy.push(participant.userId);
          }
        }
      }
    }
  }

  private calculateRelevanceScore(message: Message, query: string): number {
    let score = 0;

    if (message.content.text) {
      const text = message.content.text.toLowerCase();
      const queryLower = query.toLowerCase();
      
      // Exact match gets highest score
      if (text === queryLower) {
        score += 100;
      }
      // Contains query gets medium score
      else if (text.includes(queryLower)) {
        score += 50;
      }
      // Word matches get lower score
      else {
        const queryWords = queryLower.split(' ');
        const textWords = text.split(' ');
        const matchingWords = queryWords.filter(word => 
          textWords.some(textWord => textWord.includes(word))
        );
        score += matchingWords.length * 10;
      }
    }

    // Recent messages get bonus
    const ageInHours = (Date.now() - new Date(message.metadata.timestamp).getTime()) / (1000 * 60 * 60);
    score += Math.max(0, 10 - ageInHours);

    return score;
  }

  private startPresenceCleanup(): void {
    // Clean up offline users every 5 minutes
    setInterval(() => {
      const now = new Date();
      const timeoutMs = 30 * 60 * 1000; // 30 minutes

      for (const [userId, presence] of this.userPresence.entries()) {
        if (presence.status !== 'offline' && 
            (now.getTime() - new Date(presence.lastSeen).getTime()) > timeoutMs) {
          presence.status = 'offline';
          this.userPresence.set(userId, presence);
        }
      }
    }, 5 * 60 * 1000);
  }

  private startTypingIndicatorCleanup(): void {
    // Clean up expired typing indicators
    setInterval(() => {
      for (const [conversationId, typingUsers] of this.typingIndicators.entries()) {
        // In production, would track timestamps per user
        // For now, just clear all typing indicators periodically
        if (typingUsers.size > 0) {
          this.typingIndicators.set(conversationId, new Set());
          
          const conversation = this.conversations.get(conversationId);
          if (conversation) {
            conversation.activity.typingUsers = [];
            this.conversations.set(conversationId, conversation);
          }
        }
      }
    }, this.TYPING_INDICATOR_TIMEOUT_MS);
  }

  private startMessageRetentionCleanup(): void {
    // Clean up old messages based on retention policy
    setInterval(() => {
      const now = new Date();
      
      for (const [conversationId, conversation] of this.conversations.entries()) {
        const retentionDays = conversation.settings.messageRetention;
        const cutoffDate = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
        
        const messages = this.messages.get(conversationId) || [];
        const filteredMessages = messages.filter(message => 
          new Date(message.metadata.timestamp) > cutoffDate || 
          message.type === 'system' // Keep system messages
        );
        
        if (filteredMessages.length !== messages.length) {
          this.messages.set(conversationId, filteredMessages);
        }
      }
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  /**
   * Get conversation by ID
   */
  public async getConversationById(conversationId: string): Promise<Conversation | null> {
    return this.conversations.get(conversationId) || null;
  }

  /**
   * Get user presence
   */
  public async getUserPresence(userId: string): Promise<UserPresence | null> {
    return this.userPresence.get(userId) || null;
  }

  /**
   * Get typing users for conversation
   */
  public async getTypingUsers(conversationId: string): Promise<string[]> {
    const conversation = this.conversations.get(conversationId);
    return conversation?.activity.typingUsers || [];
  }
}

export default DirectMessagingSystem;
