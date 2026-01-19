/**
 * Twitter/X Data Collector for Phase 1 (Sentiment Field)
 */

export interface TwitterPost {
  id: string;
  text: string;
  author_id: string;
  author_username: string;
  author_verified: boolean;
  created_at: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
  };
  sentiment_score?: number;
}

export class TwitterCollector {
  private apiKey: string;
  private apiSecret: string;
  private bearerToken?: string;

  constructor(apiKey?: string, apiSecret?: string, bearerToken?: string) {
    this.apiKey = apiKey || process.env.TWITTER_API_KEY || '';
    this.apiSecret = apiSecret || process.env.TWITTER_API_SECRET || '';
    this.bearerToken = bearerToken || process.env.TWITTER_BEARER_TOKEN || '';
  }

  /**
   * Collect tweets for a team/player
   */
  async collectTweets(
    query: string,
    maxResults: number = 100
  ): Promise<TwitterPost[]> {

    if (!this.bearerToken && (!this.apiKey || !this.apiSecret)) {
      console.warn('[Twitter Collector] No API credentials configured');
      return [];
    }

    try {
      // Use Twitter API v2
      const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${maxResults}&tweet.fields=created_at,public_metrics,author_id&user.fields=verified,username`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.bearerToken) {
        headers['Authorization'] = `Bearer ${this.bearerToken}`;
      } else {
        // Would need OAuth 1.0a for API key/secret
        console.warn('[Twitter Collector] Bearer token required for API v2');
        return [];
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        console.warn(`[Twitter Collector] API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const tweets: TwitterPost[] = [];

      if (data.data) {
        for (const tweet of data.data) {
          const user = data.includes?.users?.find((u: any) => u.id === tweet.author_id);
          tweets.push({
            id: tweet.id,
            text: tweet.text,
            author_id: tweet.author_id,
            author_username: user?.username || 'unknown',
            author_verified: user?.verified || false,
            created_at: tweet.created_at,
            public_metrics: tweet.public_metrics || {
              like_count: 0,
              retweet_count: 0,
              reply_count: 0,
              quote_count: 0,
            },
          });
        }
      }

      return tweets;
    } catch (error: any) {
      console.error('[Twitter Collector] Error:', error.message);
      return [];
    }
  }

  /**
   * Collect tweets from specific users (players, coaches, beat reporters)
   */
  async collectUserTweets(
    userIds: string[],
    maxResults: number = 50
  ): Promise<TwitterPost[]> {

    if (!this.bearerToken) {
      return [];
    }

    const allTweets: TwitterPost[] = [];

    for (const userId of userIds) {
      try {
        const url = `https://api.twitter.com/2/users/${userId}/tweets?max_results=${maxResults}&tweet.fields=created_at,public_metrics&user.fields=verified,username`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            for (const tweet of data.data) {
              allTweets.push({
                id: tweet.id,
                text: tweet.text,
                author_id: userId,
                author_username: 'unknown',
                author_verified: false,
                created_at: tweet.created_at,
                public_metrics: tweet.public_metrics || {
                  like_count: 0,
                  retweet_count: 0,
                  reply_count: 0,
                  quote_count: 0,
                },
              });
            }
          }
        }
      } catch (error) {
        console.warn(`[Twitter Collector] Failed to fetch tweets for user ${userId}:`, error);
      }
    }

    return allTweets;
  }
}

