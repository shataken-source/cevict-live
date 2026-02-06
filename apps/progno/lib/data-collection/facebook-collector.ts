/**
 * Facebook Data Collector for Phase 1 (Sentiment Field)
 * Hardened with timeouts, retries, token refresh, validation, and graceful fallbacks
 */

export interface FacebookPost {
  id: string;
  message: string;
  created_time: string;
  from?: {
    name: string;
    id: string;
  };
  likes?: { summary: { total_count: number } };
  comments?: { summary: { total_count: number } };
  shares?: { count: number };
  sentiment_score?: number;
}

export class FacebookCollector {
  private appId: string;
  private appSecret: string;
  private accessToken: string | null = null;
  private lastTokenRefresh = 0;
  private readonly TOKEN_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

  constructor(appId?: string, appSecret?: string) {
    this.appId = appId || process.env.FACEBOOK_APP_ID || '';
    this.appSecret = appSecret || process.env.FACEBOOK_APP_SECRET || '';
  }

  private async getAppAccessToken(forceRefresh = false): Promise<string | null> {
    if (this.accessToken && !forceRefresh && Date.now() - this.lastTokenRefresh < this.TOKEN_REFRESH_INTERVAL) {
      return this.accessToken;
    }

    if (!this.appId || !this.appSecret) {
      console.warn('[FacebookCollector] Missing App ID or Secret');
      return null;
    }

    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const url = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${this.appId}&client_secret=${this.appSecret}&grant_type=client_credentials`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        this.accessToken = data.access_token || null;
        this.lastTokenRefresh = Date.now();
        return this.accessToken;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (attempt === 2) {
          console.error(`[FacebookCollector] Failed to get token: ${err.message}`);
          return null;
        }
        await new Promise(r => setTimeout(r, 1500 * attempt));
      }
    }
    return null;
  }

  async collectPagePosts(pageId: string, maxResults = 50): Promise<FacebookPost[]> {
    if (!pageId) return [];

    const token = await this.getAppAccessToken();
    if (!token) return [];

    return this.fetchWithRetry(() => this.callPagePostsAPI(pageId, maxResults, token), 10000, 2);
  }

  async searchPublicPosts(query: string, maxResults = 50): Promise<FacebookPost[]> {
    if (!query) return [];

    const token = await this.getAppAccessToken();
    if (!token) return [];

    return this.fetchWithRetry(() => this.callSearchAPI(query, maxResults, token), 8000, 2);
  }

  private async fetchWithRetry<T>(fn: () => Promise<T>, timeoutMs: number, maxRetries: number): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const result = await fn();
        clearTimeout(timeoutId);
        return result;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (attempt > maxRetries) {
          console.warn(`[FacebookCollector] Failed after ${maxRetries} attempts: ${err.message}`);
          return [] as any;
        }
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
    return [] as any;
  }

  private async callPagePostsAPI(pageId: string, maxResults: number, token: string): Promise<FacebookPost[]> {
    const url = `https://graph.facebook.com/v18.0/${pageId}/posts?fields=id,message,created_time,from,likes.summary(true),comments.summary(true),shares&limit=${maxResults}&access_token=${token}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    return (data.data || []).map((p: any) => ({
      id: p.id,
      message: p.message || '',
      created_time: p.created_time,
      from: p.from,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
    }));
  }

  private async callSearchAPI(query: string, maxResults: number, token: string): Promise<FacebookPost[]> {
    console.warn('[FacebookCollector] Public search is heavily restricted by Facebook API policy');
    return [];
  }
}