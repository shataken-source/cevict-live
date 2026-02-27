/**
 * News Scanner
 * Scans breaking news via RSS feeds for profit opportunities.
 * Uses `rss-parser` (already in package.json) for real feed parsing.
 */

import RSSParser from 'rss-parser';
import { NewsItem, DataPoint } from '../types';

interface RSSFeed {
  name: string;
  url: string;
  category: string;
}

const NEWS_FEEDS: RSSFeed[] = [
  { name: 'Reuters Business', url: 'https://feeds.reuters.com/reuters/businessNews', category: 'business' },
  { name: 'ESPN', url: 'https://www.espn.com/espn/rss/news', category: 'sports' },
  { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', category: 'crypto' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'tech' },
];

// Keywords that indicate profit opportunities
const PROFIT_KEYWORDS = {
  sports: ['injured', 'suspended', 'trade', 'breaking', 'upset', 'underdog', 'line movement', 'odds shift'],
  crypto: ['surge', 'crash', 'rally', 'dump', 'whale', 'etf', 'sec', 'regulation', 'halving'],
  markets: ['earnings', 'beat', 'miss', 'guidance', 'merger', 'acquisition', 'ipo'],
  events: ['election', 'vote', 'poll', 'announcement', 'decision', 'ruling'],
};

const RSS_TIMEOUT_MS = 10_000; // 10 seconds per feed

export class NewsScanner {
  private parser: RSSParser;

  constructor() {
    this.parser = new RSSParser({
      timeout: RSS_TIMEOUT_MS,
      headers: { 'User-Agent': 'AlphaHunter/1.0 (+https://github.com)' },
    });
  }

  async scanAllSources(): Promise<NewsItem[]> {
    const allNews: NewsItem[] = [];

    // Scan all RSS feeds concurrently
    const feedResults = await Promise.allSettled(
      NEWS_FEEDS.map(feed => this.scanRSSFeed(feed))
    );

    for (const result of feedResults) {
      if (result.status === 'fulfilled') {
        allNews.push(...result.value);
      }
    }

    // Filter for profit-relevant news
    return this.filterProfitOpportunities(allNews);
  }

  private async scanRSSFeed(feed: RSSFeed): Promise<NewsItem[]> {
    try {
      const parsed = await this.parser.parseURL(feed.url);
      const items: NewsItem[] = [];

      for (const entry of (parsed.items || []).slice(0, 15)) {
        const title = (entry.title || '').trim();
        if (!title) continue;

        items.push({
          title,
          source: feed.name,
          url: entry.link || '',
          summary: (entry.contentSnippet || entry.content || '').substring(0, 500),
          sentiment: 'neutral',
          relevantTo: [feed.category],
          publishedAt: entry.isoDate || entry.pubDate || new Date().toISOString(),
        });
      }

      if (items.length > 0) {
        console.log(`   📰 ${feed.name}: ${items.length} articles`);
      }
      return items;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`   ⚠️ RSS error (${feed.name}): ${msg}`);
      return [];
    }
  }

  private filterProfitOpportunities(news: NewsItem[]): NewsItem[] {
    return news.filter(item => {
      const text = `${item.title} ${item.summary}`.toLowerCase();

      for (const category of Object.values(PROFIT_KEYWORDS)) {
        for (const keyword of category) {
          if (text.includes(keyword.toLowerCase())) {
            return true;
          }
        }
      }

      return false;
    });
  }

  async analyzeNewsForOpportunities(news: NewsItem[]): Promise<DataPoint[]> {
    const dataPoints: DataPoint[] = [];

    for (const item of news) {
      const sentiment = this.analyzeSentiment(item);
      const relevance = this.calculateRelevance(item);

      dataPoints.push({
        source: item.source,
        metric: item.title,
        value: sentiment,
        relevance,
        timestamp: item.publishedAt,
      });
    }

    return dataPoints;
  }

  private analyzeSentiment(news: NewsItem): string {
    const text = `${news.title} ${news.summary}`.toLowerCase();

    const bullishWords = ['surge', 'rally', 'beat', 'win', 'breakthrough', 'success', 'record'];
    const bearishWords = ['crash', 'fall', 'miss', 'lose', 'fail', 'decline', 'drop'];

    let score = 0;
    bullishWords.forEach(word => { if (text.includes(word)) score++; });
    bearishWords.forEach(word => { if (text.includes(word)) score--; });

    return score > 0 ? 'bullish' : score < 0 ? 'bearish' : 'neutral';
  }

  private calculateRelevance(news: NewsItem): number {
    let relevance = 50;

    const ageHours = (Date.now() - new Date(news.publishedAt).getTime()) / 3600000;
    if (ageHours < 1) relevance += 30;
    else if (ageHours < 6) relevance += 20;
    else if (ageHours < 24) relevance += 10;

    const text = news.title.toLowerCase();
    if (text.includes('breaking')) relevance += 20;
    if (text.includes('injury') || text.includes('injured')) relevance += 25;
    if (text.includes('trade')) relevance += 15;
    if (text.includes('upset')) relevance += 20;

    return Math.min(relevance, 100);
  }
}
