/**
 * News Scanner
 * Scans breaking news and events for profit opportunities
 */

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
  { name: 'Polymarket News', url: 'https://polymarket.com/rss', category: 'predictions' },
];

// Keywords that indicate profit opportunities
const PROFIT_KEYWORDS = {
  sports: ['injured', 'suspended', 'trade', 'breaking', 'upset', 'underdog', 'line movement', 'odds shift'],
  crypto: ['surge', 'crash', 'rally', 'dump', 'whale', 'etf', 'sec', 'regulation', 'halving'],
  markets: ['earnings', 'beat', 'miss', 'guidance', 'merger', 'acquisition', 'ipo'],
  events: ['election', 'vote', 'poll', 'announcement', 'decision', 'ruling'],
};

export class NewsScanner {
  private apiKey?: string;

  constructor() {
    this.apiKey = process.env.NEWS_API_KEY;
  }

  async scanAllSources(): Promise<NewsItem[]> {
    const allNews: NewsItem[] = [];

    // Scan RSS feeds
    for (const feed of NEWS_FEEDS) {
      try {
        const news = await this.scanRSSFeed(feed);
        allNews.push(...news);
      } catch (error) {
        console.error(`Error scanning ${feed.name}:`, error);
      }
    }

    // Scan Twitter/X for breaking news
    const twitterNews = await this.scanTwitter();
    allNews.push(...twitterNews);

    // Scan Reddit for sentiment
    const redditNews = await this.scanReddit();
    allNews.push(...redditNews);

    // Filter for profit-relevant news
    return this.filterProfitOpportunities(allNews);
  }

  private async scanRSSFeed(feed: RSSFeed): Promise<NewsItem[]> {
    try {
      // In production, use rss-parser
      // For now, return sample data based on feed type
      return this.getSampleNews(feed.category);
    } catch (error) {
      console.error(`RSS scan error for ${feed.name}:`, error);
      return [];
    }
  }

  private async scanTwitter(): Promise<NewsItem[]> {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) return [];

    try {
      // Scan for breaking sports news, crypto alerts, market moves
      // In production, use Twitter API v2
      return [];
    } catch (error) {
      console.error('Twitter scan error:', error);
      return [];
    }
  }

  private async scanReddit(): Promise<NewsItem[]> {
    try {
      // Scan r/wallstreetbets, r/sportsbook, r/cryptocurrency
      // In production, use Reddit API
      return [];
    } catch (error) {
      console.error('Reddit scan error:', error);
      return [];
    }
  }

  private filterProfitOpportunities(news: NewsItem[]): NewsItem[] {
    return news.filter(item => {
      const text = `${item.title} ${item.summary}`.toLowerCase();
      
      // Check for profit-related keywords
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
      // Analyze sentiment and relevance
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
    // Higher relevance for:
    // - Breaking news (recent)
    // - Sports injuries/trades (affects lines)
    // - Market-moving events
    // - Prediction market catalysts
    
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

  private getSampleNews(category: string): NewsItem[] {
    const now = new Date().toISOString();
    
    const sampleNews: Record<string, NewsItem[]> = {
      sports: [
        {
          title: 'BREAKING: Star QB ruled out for Sunday game',
          source: 'ESPN',
          url: 'https://espn.com/breaking',
          summary: 'The starting quarterback has been ruled out with an ankle injury, backup to start.',
          sentiment: 'bearish',
          relevantTo: ['NFL', 'sports_betting'],
          publishedAt: now,
        },
        {
          title: 'Line Movement Alert: Heavy action on underdog',
          source: 'Action Network',
          url: 'https://actionnetwork.com',
          summary: 'Sharp money coming in on +7.5 underdog, line moving from +10 to +7.5',
          sentiment: 'neutral',
          relevantTo: ['NFL', 'sharp_action'],
          publishedAt: now,
        },
      ],
      crypto: [
        {
          title: 'Bitcoin ETF sees record inflows',
          source: 'CoinDesk',
          url: 'https://coindesk.com',
          summary: 'Institutional investors pour $500M into spot Bitcoin ETFs in single day',
          sentiment: 'bullish',
          relevantTo: ['BTC', 'crypto'],
          publishedAt: now,
        },
      ],
      business: [
        {
          title: 'Tech giant beats earnings estimates',
          source: 'Reuters',
          url: 'https://reuters.com',
          summary: 'Company reports 20% revenue growth, raises guidance',
          sentiment: 'bullish',
          relevantTo: ['stocks', 'tech'],
          publishedAt: now,
        },
      ],
      predictions: [
        {
          title: 'New prediction market opens on Fed rate decision',
          source: 'Kalshi',
          url: 'https://kalshi.com',
          summary: 'Markets pricing in 75% chance of rate cut, economists at 60%',
          sentiment: 'neutral',
          relevantTo: ['fed', 'rates', 'prediction_market'],
          publishedAt: now,
        },
      ],
    };

    return sampleNews[category] || [];
  }
}

