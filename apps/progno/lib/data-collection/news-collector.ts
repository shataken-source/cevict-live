/**
 * News Data Collector for Phase 1 (Sentiment Field) and Phase 2 (Narrative Momentum)
 * Hardened with timeouts, retries, validation, and graceful fallbacks
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

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEWS_API_KEY || process.env.NEWSAPI_KEY || '';
  }

  async collectNews(teamName: string, maxResults = 30): Promise<NewsArticle[]> {
    if (!teamName) return [];

    // Prefer API if available
    if (this.apiKey) {
      return this.fetchFromNewsAPIWithRetry(teamName, maxResults);
    }

    // Fallback to RSS (placeholder - implement real parser if needed)
    console.warn('[NewsCollector] API key missing → RSS fallback not implemented');
    return [];
  }

  async searchNarratives(keywords: string[], maxResults = 30): Promise<NewsArticle[]> {
    if (!this.apiKey || keywords.length === 0) return [];

    const query = keywords.join(' OR ');
    return this.fetchFromNewsAPIWithRetry(query, maxResults);
  }

  private async fetchFromNewsAPIWithRetry(query: string, maxResults: number): Promise<NewsArticle[]> {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      try {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=${maxResults}&apiKey=${this.apiKey}`;

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        if (!data.articles || !Array.isArray(data.articles)) return [];

        return data.articles.map((a: any) => ({
          title: a.title || '',
          content: a.description || a.content || '',
          source: a.source?.name || 'unknown',
          url: a.url || '',
          publishedAt: a.publishedAt ? new Date(a.publishedAt) : new Date(),
          related_teams: [],
        }));
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (attempt === 2) {
          console.warn(`[NewsCollector] Failed after 2 attempts: ${err.message}`);
          return [];
        }
        await new Promise(r => setTimeout(r, 1200 * attempt));
      }
    }
    return [];
  }
}