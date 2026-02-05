/**
 * Facebook Data Collector for Phase 1 (Sentiment Field)
 * Uses Facebook Graph API
 */

export interface FacebookPost {
  id: string;
  message: string;
  created_time: string;
  from?: {
    name: string;
    id: string;
  };
  likes?: {
    summary: {
      total_count: number;
    };
  };
  comments?: {
    summary: {
      total_count: number;
    };
  };
  shares?: {
    count: number;
  };
  sentiment_score?: number;
}

export class FacebookCollector {
  private appId: string;
  private appSecret: string;
  private accessToken?: string;

  constructor(appId?: string, appSecret?: string, accessToken?: string) {
    this.appId = appId || process.env.FACEBOOK_APP_ID || '';
    this.appSecret = appSecret || process.env.FACEBOOK_APP_SECRET || '';
    this.accessToken = accessToken || process.env.FACEBOOK_ACCESS_TOKEN;
  }

  /**
   * Get app access token using App ID and Secret
   */
  private async getAppAccessToken(): Promise<string | null> {
    if (this.accessToken) {
      return this.accessToken;
    }

    if (!this.appId || !this.appSecret) {
      console.warn('[Facebook Collector] No App ID/Secret configured');
      return null;
    }

    try {
      const url = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${this.appId}&client_secret=${this.appSecret}&grant_type=client_credentials`;
      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`[Facebook Collector] Failed to get app token: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data.access_token || null;
    } catch (error: any) {
      console.error('[Facebook Collector] Error getting app token:', error.message);
      return null;
    }
  }

  /**
   * Collect posts from a Facebook page
   */
  async collectPagePosts(
    pageId: string,
    maxResults: number = 50
  ): Promise<FacebookPost[]> {

    const token = await this.getAppAccessToken();
    if (!token) {
      return [];
    }

    try {
      const url = `https://graph.facebook.com/v18.0/${pageId}/posts?fields=id,message,created_time,from,likes.summary(true),comments.summary(true),shares&limit=${maxResults}&access_token=${token}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`[Facebook Collector] API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const posts: FacebookPost[] = [];

      if (data.data) {
        for (const post of data.data) {
          posts.push({
            id: post.id,
            message: post.message || '',
            created_time: post.created_time,
            from: post.from,
            likes: post.likes,
            comments: post.comments,
            shares: post.shares,
          });
        }
      }

      return posts;
    } catch (error: any) {
      console.error('[Facebook Collector] Error:', error.message);
      return [];
    }
  }

  /**
   * Search for public posts
   */
  async searchPublicPosts(
    query: string,
    maxResults: number = 50
  ): Promise<FacebookPost[]> {

    const token = await this.getAppAccessToken();
    if (!token) {
      return [];
    }

    try {
      // Note: Facebook Graph API search is limited
      // This would search public pages/posts
      const url = `https://graph.facebook.com/v18.0/search?q=${encodeURIComponent(query)}&type=post&limit=${maxResults}&access_token=${token}`;

      const response = await fetch(url);

      if (!response.ok) {
        // Search may require user token or be unavailable
        console.warn(`[Facebook Collector] Search API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const posts: FacebookPost[] = [];

      if (data.data) {
        for (const post of data.data) {
          posts.push({
            id: post.id,
            message: post.message || '',
            created_time: post.created_time,
            from: post.from,
            likes: post.likes,
            comments: post.comments,
            shares: post.shares,
          });
        }
      }

      return posts;
    } catch (error: any) {
      console.error('[Facebook Collector] Search error:', error.message);
      return [];
    }
  }
}

