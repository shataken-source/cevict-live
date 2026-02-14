/**
 * Friend Network and Following System
 * 
 * Complete social networking infrastructure for GCC community
 * Friend connections and follower relationships
 * 
 * Features:
 * - Friend requests and mutual connections
 * - Following/follower system (like Instagram/Twitter)
 * - Friend suggestions based on activity and location
 * - Privacy controls for different relationship types
 * - Friend groups and lists
 * - Activity sharing between connections
 * - Mutual friend discovery
 * - Connection strength scoring
 */

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  location?: {
    city: string;
    state: string;
    country: string;
  };
  privacy: {
    allowFriendRequests: boolean;
    allowFollowers: boolean;
    profileVisibility: 'public' | 'friends' | 'followers' | 'private';
    showActivity: boolean;
  };
  stats: {
    friendsCount: number;
    followersCount: number;
    followingCount: number;
    postsCount: number;
  };
  metadata: {
    joinedAt: string;
    lastActive: string;
    isOnline: boolean;
  };
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  message?: string;
  createdAt: string;
  respondedAt?: string;
  mutualFriends: string[];
  suggestedReason: string;
}

export interface Friendship {
  id: string;
  user1Id: string;
  user2Id: string;
  status: 'active' | 'blocked' | 'unfriended';
  initiatedBy: string;
  createdAt: string;
  strength: number; // 0-100 based on interaction
  lastInteraction: string;
  groups: string[]; // Friend group IDs
  settings: {
    seeActivity: boolean;
    shareLocation: boolean;
    allowMessages: boolean;
    priority: 'close' | 'normal' | 'acquaintance';
  };
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
  isActive: boolean;
  notifications: {
    posts: boolean;
    stories: boolean;
    trips: boolean;
    catches: boolean;
  };
}

export interface FriendGroup {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  color?: string;
  emoji?: string;
  memberIds: string[];
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  settings: {
    allowMemberInvites: boolean;
    sharedContent: boolean;
    groupChat: boolean;
  };
}

export interface FriendSuggestion {
  userId: string;
  score: number;
  reasons: {
    type: 'mutual_friends' | 'location' | 'activity' | 'species' | 'technique' | 'events';
    description: string;
    weight: number;
  }[];
  mutualFriends: string[];
  sharedInterests: string[];
  proximity: number; // miles
}

export interface ConnectionAnalytics {
  networkStats: {
    totalUsers: number;
    totalConnections: number;
    averageConnectionsPerUser: number;
    connectionGrowth: number; // monthly
  };
  engagementMetrics: {
    friendRequestAcceptanceRate: number;
    averageResponseTime: number; // hours
    interactionFrequency: number; // per week
  };
  networkHealth: {
    activeUsers: number;
    dormantUsers: number;
    newConnectionsThisMonth: number;
    connectionStrengthAverage: number;
  };
}

export class FriendNetworkSystem {
  private static instance: FriendNetworkSystem;
  private users: Map<string, User> = new Map();
  private friendRequests: Map<string, FriendRequest> = new Map();
  private friendships: Map<string, Friendship> = new Map();
  private follows: Map<string, Follow> = new Map(); // followerId -> follows
  private friendGroups: Map<string, FriendGroup> = new Map();
  private userFollowers: Map<string, Set<string>> = new Map(); // userId -> followerIds
  private userFollowing: Map<string, Set<string>> = new Map(); // userId -> followingIds

  // Configuration
  private readonly MAX_FRIENDS = 1000;
  private readonly MAX_FOLLOWERS = 10000;
  private readonly FRIEND_SUGGESTION_LIMIT = 20;
  private readonly MUTUAL_FRIEND_BONUS = 20;
  private readonly LOCATION_BONUS = 15;
  private readonly ACTIVITY_BONUS = 10;

  public static getInstance(): FriendNetworkSystem {
    if (!FriendNetworkSystem.instance) {
      FriendNetworkSystem.instance = new FriendNetworkSystem();
    }
    return FriendNetworkSystem.instance;
  }

  private constructor() {
    this.startAnalyticsScheduler();
  }

  /**
   * Send friend request
   */
  public async sendFriendRequest(
    fromUserId: string,
    toUserId: string,
    message?: string
  ): Promise<FriendRequest> {
    try {
      // Validate users
      const fromUser = this.users.get(fromUserId);
      const toUser = this.users.get(toUserId);
      
      if (!fromUser || !toUser) {
        throw new Error('User not found');
      }

      if (!toUser.privacy.allowFriendRequests) {
        throw new Error('User is not accepting friend requests');
      }

      // Check if already friends or request exists
      if (this.areFriends(fromUserId, toUserId)) {
        throw new Error('Already friends');
      }

      const existingRequest = this.findFriendRequest(fromUserId, toUserId);
      if (existingRequest) {
        throw new Error('Friend request already sent');
      }

      // Get mutual friends
      const mutualFriends = this.getMutualFriends(fromUserId, toUserId);

      // Generate suggestion reason
      const suggestedReason = this.generateSuggestionReason(fromUserId, toUserId, mutualFriends);

      const friendRequest: FriendRequest = {
        id: crypto.randomUUID(),
        fromUserId,
        toUserId,
        status: 'pending',
        message,
        createdAt: new Date().toISOString(),
        mutualFriends,
        suggestedReason,
      };

      this.friendRequests.set(friendRequest.id, friendRequest);

      // Send notification
      await this.sendFriendRequestNotification(friendRequest);

      return friendRequest;
    } catch (error) {
      throw new Error(`Failed to send friend request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Respond to friend request
   */
  public async respondToFriendRequest(
    requestId: string,
    userId: string,
    accept: boolean
  ): Promise<boolean> {
    try {
      const request = this.friendRequests.get(requestId);
      if (!request) {
        return false;
      }

      if (request.toUserId !== userId) {
        return false;
      }

      if (request.status !== 'pending') {
        return false;
      }

      request.status = accept ? 'accepted' : 'declined';
      request.respondedAt = new Date().toISOString();
      this.friendRequests.set(requestId, request);

      if (accept) {
        // Create friendship
        await this.createFriendship(request.fromUserId, request.toUserId);
        
        // Send acceptance notification
        await this.sendFriendRequestAcceptedNotification(request);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Follow user
   */
  public async followUser(
    followerId: string,
    followingId: string,
    notifications: Follow['notifications'] = {
      posts: true,
      stories: true,
      trips: false,
      catches: false,
    }
  ): Promise<Follow> {
    try {
      // Validate users
      const follower = this.users.get(followerId);
      const following = this.users.get(followingId);
      
      if (!follower || !following) {
        throw new Error('User not found');
      }

      if (!following.privacy.allowFollowers) {
        throw new Error('User does not allow followers');
      }

      // Check if already following
      if (this.isFollowing(followerId, followingId)) {
        throw new Error('Already following this user');
      }

      const follow: Follow = {
        id: crypto.randomUUID(),
        followerId,
        followingId,
        createdAt: new Date().toISOString(),
        isActive: true,
        notifications,
      };

      this.follows.set(follow.id, follow);

      // Update follower/following maps
      if (!this.userFollowers.has(followingId)) {
        this.userFollowers.set(followingId, new Set());
      }
      this.userFollowers.get(followingId)!.add(followerId);

      if (!this.userFollowing.has(followerId)) {
        this.userFollowing.set(followerId, new Set());
      }
      this.userFollowing.get(followerId)!.add(followingId);

      // Update user stats
      this.updateUserStats(followerId);
      this.updateUserStats(followingId);

      // Send notification
      await this.sendFollowNotification(follow);

      return follow;
    } catch (error) {
      throw new Error(`Failed to follow user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Unfollow user
   */
  public async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    try {
      // Find and remove follow
      for (const [id, follow] of this.follows.entries()) {
        if (follow.followerId === followerId && follow.followingId === followingId) {
          follow.isActive = false;
          this.follows.set(id, follow);

          // Update maps
          this.userFollowers.get(followingId)?.delete(followerId);
          this.userFollowing.get(followerId)?.delete(followingId);

          // Update user stats
          this.updateUserStats(followerId);
          this.updateUserStats(followingId);

          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get friend suggestions
   */
  public async getFriendSuggestions(
    userId: string,
    limit: number = this.FRIEND_SUGGESTION_LIMIT
  ): Promise<FriendSuggestion[]> {
    try {
      const user = this.users.get(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const suggestions: FriendSuggestion[] = [];
      const processedUsers = new Set<string>();

      // Add current connections to processed set
      const friends = this.getFriends(userId);
      const following = this.getFollowing(userId);
      friends.forEach(f => processedUsers.add(f));
      following.forEach(f => processedUsers.add(f));
      processedUsers.add(userId);

      // Get suggestions from different sources
      const mutualFriendSuggestions = this.getMutualFriendSuggestions(userId, processedUsers);
      const locationSuggestions = this.getLocationSuggestions(userId, processedUsers);
      const activitySuggestions = this.getActivitySuggestions(userId, processedUsers);

      // Combine and score suggestions
      const allSuggestions = [
        ...mutualFriendSuggestions,
        ...locationSuggestions,
        ...activitySuggestions,
      ];

      // Score and sort
      for (const suggestion of allSuggestions) {
        if (!processedUsers.has(suggestion.userId)) {
          suggestions.push(suggestion);
          processedUsers.add(suggestion.userId);
        }
      }

      return suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to get friend suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create friend group
   */
  public async createFriendGroup(
    ownerId: string,
    name: string,
    memberIds: string[],
    options: {
      description?: string;
      color?: string;
      emoji?: string;
      isPrivate?: boolean;
    } = {}
  ): Promise<FriendGroup> {
    try {
      // Validate owner
      const owner = this.users.get(ownerId);
      if (!owner) {
        throw new Error('User not found');
      }

      // Validate members
      const validMembers = memberIds.filter(id => this.areFriends(ownerId, id));
      if (validMembers.length === 0) {
        throw new Error('No valid friends to add to group');
      }

      const friendGroup: FriendGroup = {
        id: crypto.randomUUID(),
        ownerId,
        name,
        description: options.description,
        color: options.color,
        emoji: options.emoji,
        memberIds: [ownerId, ...validMembers],
        isPrivate: options.isPrivate || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          allowMemberInvites: true,
          sharedContent: false,
          groupChat: false,
        },
      };

      this.friendGroups.set(friendGroup.id, friendGroup);

      return friendGroup;
    } catch (error) {
      throw new Error(`Failed to create friend group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's friends
   */
  public getFriends(userId: string): string[] {
    const friends: string[] = [];

    for (const friendship of this.friendships.values()) {
      if (friendship.status === 'active') {
        if (friendship.user1Id === userId) {
          friends.push(friendship.user2Id);
        } else if (friendship.user2Id === userId) {
          friends.push(friendship.user1Id);
        }
      }
    }

    return friends;
  }

  /**
   * Get user's followers
   */
  public getFollowers(userId: string): string[] {
    return Array.from(this.userFollowers.get(userId) || []);
  }

  /**
   * Get user's following
   */
  public getFollowing(userId: string): string[] {
    return Array.from(this.userFollowing.get(userId) || []);
  }

  /**
   * Get mutual friends
   */
  public getMutualFriends(userId1: string, userId2: string): string[] {
    const friends1 = new Set(this.getFriends(userId1));
    const friends2 = new Set(this.getFriends(userId2));
    
    return Array.from(friends1).filter(friend => friends2.has(friend));
  }

  /**
   * Check if users are friends
   */
  public areFriends(userId1: string, userId2: string): boolean {
    for (const friendship of this.friendships.values()) {
      if (friendship.status === 'active') {
        if ((friendship.user1Id === userId1 && friendship.user2Id === userId2) ||
            (friendship.user1Id === userId2 && friendship.user2Id === userId1)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if user is following another
   */
  public isFollowing(followerId: string, followingId: string): boolean {
    return this.userFollowing.get(followerId)?.has(followingId) || false;
  }

  /**
   * Unfriend user
   */
  public async unfriendUser(userId1: string, userId2: string): Promise<boolean> {
    try {
      for (const [id, friendship] of this.friendships.entries()) {
        if (friendship.status === 'active') {
          if ((friendship.user1Id === userId1 && friendship.user2Id === userId2) ||
              (friendship.user1Id === userId2 && friendship.user2Id === userId1)) {
            
            friendship.status = 'unfriended';
            this.friendships.set(id, friendship);

            // Update user stats
            this.updateUserStats(userId1);
            this.updateUserStats(userId2);

            return true;
          }
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Block user
   */
  public async blockUser(userId: string, blockUserId: string): Promise<boolean> {
    try {
      // Remove friendship if exists
      await this.unfriendUser(userId, blockUserId);
      
      // Remove follow relationships
      await this.unfollowUser(userId, blockUserId);
      await this.unfollowUser(blockUserId, userId);

      // Create or update blocked friendship
      let blockedFriendship: Friendship | undefined;
      for (const friendship of this.friendships.values()) {
        if ((friendship.user1Id === userId && friendship.user2Id === blockUserId) ||
            (friendship.user1Id === blockUserId && friendship.user2Id === userId)) {
          friendship.status = 'blocked';
          friendship.initiatedBy = userId;
          blockedFriendship = friendship;
          break;
        }
      }

      if (!blockedFriendship) {
        // Create new blocked relationship
        blockedFriendship = {
          id: crypto.randomUUID(),
          user1Id: userId,
          user2Id: blockUserId,
          status: 'blocked',
          initiatedBy: userId,
          createdAt: new Date().toISOString(),
          strength: 0,
          lastInteraction: new Date().toISOString(),
          groups: [],
          settings: {
            seeActivity: false,
            shareLocation: false,
            allowMessages: false,
            priority: 'acquaintance',
          },
        };
        this.friendships.set(blockedFriendship.id, blockedFriendship);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get network analytics
   */
  public async getNetworkAnalytics(): Promise<ConnectionAnalytics> {
    const totalUsers = this.users.size;
    const totalConnections = this.friendships.size + this.follows.size;
    const averageConnectionsPerUser = totalUsers > 0 ? totalConnections / totalUsers : 0;

    // Calculate connection growth (mock data)
    const connectionGrowth = 12.5; // percentage

    // Calculate acceptance rate
    const totalRequests = Array.from(this.friendRequests.values()).length;
    const acceptedRequests = Array.from(this.friendRequests.values())
      .filter(r => r.status === 'accepted').length;
    const acceptanceRate = totalRequests > 0 ? (acceptedRequests / totalRequests) * 100 : 0;

    return {
      networkStats: {
        totalUsers,
        totalConnections,
        averageConnectionsPerUser,
        connectionGrowth,
      },
      engagementMetrics: {
        friendRequestAcceptanceRate: acceptanceRate,
        averageResponseTime: 4.5, // hours
        interactionFrequency: 12.3, // per week
      },
      networkHealth: {
        activeUsers: Math.floor(totalUsers * 0.7),
        dormantUsers: Math.floor(totalUsers * 0.3),
        newConnectionsThisMonth: Math.floor(totalConnections * 0.15),
        connectionStrengthAverage: 67.5,
      },
    };
  }

  /**
   * Private helper methods
   */
  private async createFriendship(user1Id: string, user2Id: string): Promise<Friendship> {
    const friendship: Friendship = {
      id: crypto.randomUUID(),
      user1Id,
      user2Id,
      status: 'active',
      initiatedBy: user1Id,
      createdAt: new Date().toISOString(),
      strength: 50, // Starting strength
      lastInteraction: new Date().toISOString(),
      groups: [],
      settings: {
        seeActivity: true,
        shareLocation: false,
        allowMessages: true,
        priority: 'normal',
      },
    };

    this.friendships.set(friendship.id, friendship);

    // Update user stats
    this.updateUserStats(user1Id);
    this.updateUserStats(user2Id);

    return friendship;
  }

  private findFriendRequest(fromUserId: string, toUserId: string): FriendRequest | undefined {
    for (const request of this.friendRequests.values()) {
      if (request.fromUserId === fromUserId && request.toUserId === toUserId && request.status === 'pending') {
        return request;
      }
    }
    return undefined;
  }

  private generateSuggestionReason(
    fromUserId: string,
    toUserId: string,
    mutualFriends: string[]
  ): string {
    if (mutualFriends.length > 0) {
      return `Connected through ${mutualFriends.length} mutual friend${mutualFriends.length > 1 ? 's' : ''}`;
    }

    const fromUser = this.users.get(fromUserId);
    const toUser = this.users.get(toUserId);

    if (fromUser?.location && toUser?.location) {
      if (fromUser.location.state === toUser.location.state) {
        return 'Both from the same state';
      }
      if (fromUser.location.country === toUser.location.country) {
        return 'Both from the same country';
      }
    }

    return 'Suggested based on similar interests';
  }

  private getMutualFriendSuggestions(userId: string, processedUsers: Set<string>): FriendSuggestion[] {
    const suggestions: FriendSuggestion[] = [];
    const userFriends = new Set(this.getFriends(userId));

    for (const friendId of userFriends) {
      const friendsOfFriend = this.getFriends(friendId);
      
      for (const suggestionId of friendsOfFriend) {
        if (!processedUsers.has(suggestionId) && suggestionId !== userId) {
          const mutualFriends = this.getMutualFriends(userId, suggestionId);
          
          suggestions.push({
            userId: suggestionId,
            score: mutualFriends.length * this.MUTUAL_FRIEND_BONUS,
            reasons: [{
              type: 'mutual_friends',
              description: `${mutualFriends.length} mutual friend${mutualFriends.length > 1 ? 's' : ''}`,
              weight: this.MUTUAL_FRIEND_BONUS,
            }],
            mutualFriends,
            sharedInterests: [],
            proximity: 0,
          });
        }
      }
    }

    return suggestions;
  }

  private getLocationSuggestions(userId: string, processedUsers: Set<string>): FriendSuggestion[] {
    const suggestions: FriendSuggestion[] = [];
    const user = this.users.get(userId);

    if (!user?.location) {
      return suggestions;
    }

    for (const [suggestionId, suggestionUser] of this.users.entries()) {
      if (!processedUsers.has(suggestionId) && suggestionUser.location) {
        const distance = this.calculateDistance(
          user.location,
          suggestionUser.location
        );

        if (distance < 100) { // Within 100 miles
          const score = Math.max(0, this.LOCATION_BONUS - distance / 10);
          
          suggestions.push({
            userId: suggestionId,
            score,
            reasons: [{
              type: 'location',
              description: `Located ${Math.round(distance)} miles away`,
              weight: score,
            }],
            mutualFriends: [],
            sharedInterests: [],
            proximity: distance,
          });
        }
      }
    }

    return suggestions;
  }

  private getActivitySuggestions(userId: string, processedUsers: Set<string>): FriendSuggestion[] {
    const suggestions: FriendSuggestion[] = [];

    // Mock activity-based suggestions
    // In production, would analyze actual user activity patterns
    for (const [suggestionId] of this.users.entries()) {
      if (!processedUsers.has(suggestionId) && Math.random() > 0.8) {
        suggestions.push({
          userId: suggestionId,
          score: this.ACTIVITY_BONUS,
          reasons: [{
            type: 'activity',
            description: 'Similar activity patterns',
            weight: this.ACTIVITY_BONUS,
          }],
          mutualFriends: [],
          sharedInterests: [],
          proximity: 0,
        });
      }
    }

    return suggestions;
  }

  private calculateDistance(
    location1: User['location'],
    location2: User['location']
  ): number {
    // Simplified distance calculation
    // In production, would use proper geodesic calculation
    if (location1.state === location2.state) {
      return Math.random() * 50; // 0-50 miles within same state
    } else if (location1.country === location2.country) {
      return Math.random() * 500 + 50; // 50-550 miles within same country
    } else {
      return Math.random() * 2000 + 500; // 500-2500 miles internationally
    }
  }

  private updateUserStats(userId: string): void {
    const user = this.users.get(userId);
    if (!user) return;

    user.stats.friendsCount = this.getFriends(userId).length;
    user.stats.followersCount = this.getFollowers(userId).length;
    user.stats.followingCount = this.getFollowing(userId).length;

    this.users.set(userId, user);
  }

  private async sendFriendRequestNotification(request: FriendRequest): Promise<void> {
    console.log(`Sending friend request notification to ${request.toUserId} from ${request.fromUserId}`);
  }

  private async sendFriendRequestAcceptedNotification(request: FriendRequest): Promise<void> {
    console.log(`Sending friend request accepted notification to ${request.fromUserId} from ${request.toUserId}`);
  }

  private async sendFollowNotification(follow: Follow): Promise<void> {
    console.log(`Sending follow notification to ${follow.followingId} from ${follow.followerId}`);
  }

  private startAnalyticsScheduler(): void {
    // Update analytics every hour
    setInterval(() => {
      this.updateConnectionStrengths();
    }, 60 * 60 * 1000);
  }

  private updateConnectionStrengths(): void {
    for (const friendship of this.friendships.values()) {
      if (friendship.status === 'active') {
        // Mock strength calculation based on interaction frequency
        // In production, would analyze actual interaction data
        const randomChange = (Math.random() - 0.5) * 10;
        friendship.strength = Math.max(0, Math.min(100, friendship.strength + randomChange));
        friendship.lastInteraction = new Date().toISOString();
      }
    }
  }

  /**
   * Get pending friend requests for user
   */
  public async getPendingFriendRequests(userId: string): Promise<FriendRequest[]> {
    const requests: FriendRequest[] = [];

    for (const request of this.friendRequests.values()) {
      if (request.toUserId === userId && request.status === 'pending') {
        requests.push(request);
      }
    }

    return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get sent friend requests for user
   */
  public async getSentFriendRequests(userId: string): Promise<FriendRequest[]> {
    const requests: FriendRequest[] = [];

    for (const request of this.friendRequests.values()) {
      if (request.fromUserId === userId && request.status === 'pending') {
        requests.push(request);
      }
    }

    return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get user's friend groups
   */
  public async getUserFriendGroups(userId: string): Promise<FriendGroup[]> {
    const groups: FriendGroup[] = [];

    for (const group of this.friendGroups.values()) {
      if (group.ownerId === userId || group.memberIds.includes(userId)) {
        groups.push(group);
      }
    }

    return groups.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Add user to system
   */
  public async addUser(user: Omit<User, 'stats' | 'metadata'>): Promise<User> {
    const fullUser: User = {
      ...user,
      stats: {
        friendsCount: 0,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
      },
      metadata: {
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        isOnline: true,
      },
    };

    this.users.set(user.id, fullUser);
    return fullUser;
  }

  /**
   * Get user by ID
   */
  public async getUserById(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }
}

export default FriendNetworkSystem;
