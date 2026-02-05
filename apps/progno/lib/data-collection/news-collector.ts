/**
 * News Data Collector for Phase 1 (Sentiment Field) and Phase 2 (Narrative Momentum)
 */

export interface NewsArticle {
  title: string;
  content: string;
  source: string;
  url: string;
  publishedAt: Date;
  sentiment_score?: number;
  related_teams?: string[];
  related_players?: string[];
}

export class NewsCollector {
  private apiKey: string;
  private useNewsAPI: boolean;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEWS_API_KEY || process.env.NEWSAPI_KEY || '';
    this.useNewsAPI = !!this.apiKey;
  }

  /**
   * Collect news articles for a team
   */
  async collectNews(
    teamName: string,
    maxResults: number = 50
  ): Promise<NewsArticle[]> {

    if (!this.useNewsAPI) {
      // Fallback: Use RSS feeds or web scraping
      return this.collectFromRSS(teamName, maxResults);
    }

    try {
      // NewsAPI.org
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(teamName)}&language=en&sortBy=publishedAt&pageSize=${maxResults}&apiKey=${this.apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.warn(`[News Collector] API error: ${response.status}`);
        return this.collectFromRSS(teamName, maxResults);
      }

      const data = await response.json();
      const articles: NewsArticle[] = [];

      if (data.articles) {
        for (const article of data.articles) {
          articles.push({
            title: article.title || '',
            content: article.description || article.content || '',
            source: article.source?.name || 'unknown',
            url: article.url || '',
            publishedAt: new Date(article.publishedAt || Date.now()),
            related_teams: [teamName],
          });
        }
      }

      return articles;
    } catch (error: any) {
      console.error('[News Collector] Error:', error.message);
      return this.collectFromRSS(teamName, maxResults);
    }
  }

  /**
   * Fallback: Collect from RSS feeds
   */
  private async collectFromRSS(
    teamName: string,
    maxResults: number
  ): Promise<NewsArticle[]> {

    // Common sports news RSS feeds
    const rssFeeds = [
      'https://www.espn.com/espn/rss/news',
      'https://www.cbssports.com/rss/headlines',
      'https://sports.yahoo.com/rss/',
    ];

    const articles: NewsArticle[] = [];

    for (const feedUrl of rssFeeds) {
      try {
        // Would need an RSS parser library
        // For now, return empty array
        console.log(`[News Collector] RSS feed parsing not yet implemented: ${feedUrl}`);
      } catch (error) {
        console.warn(`[News Collector] Failed to parse RSS: ${feedUrl}`);
      }
    }

    return articles;
  }

  /**
   * Search for specific narrative keywords
   */
  async searchNarratives(
    keywords: string[],
    maxResults: number = 30
  ): Promise<NewsArticle[]> {

    if (!this.useNewsAPI) {
      return [];
    }

    const query = keywords.join(' OR ');

    try {
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=relevancy&pageSize=${maxResults}&apiKey=${this.apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const articles: NewsArticle[] = [];

      if (data.articles) {
        for (const article of data.articles) {
          articles.push({
            title: article.title || '',
            content: article.description || article.content || '',
            source: article.source?.name || 'unknown',
            url: article.url || '',
            publishedAt: new Date(article.publishedAt || Date.now()),
          });
        }
      }

      return articles;
    } catch (error: any) {
      console.error('[News Collector] Narrative search error:', error.message);
      return [];
    }
  }
}

