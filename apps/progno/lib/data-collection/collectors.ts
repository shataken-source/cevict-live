/**
 * Data Collection Infrastructure
 * Phases 1-4: Sentiment, Narrative, IAI, CSI
 * NOW WITH REAL API INTEGRATIONS
 */

import { TwitterCollector } from './twitter-collector';
import { FacebookCollector } from './facebook-collector';
import { WeatherCollector } from './weather-collector';
import { NewsCollector } from './news-collector';
import { LineMovementTracker } from './line-movement-tracker';
import { InjuryCollector } from './injury-collector';
import { loadDataFeedConfig, getStadiumLocation } from './config';

export interface DataCollectionConfig {
  phase1: {
    enabled: boolean;
    sources: {
      twitter: boolean;
      instagram: boolean;
      news: boolean;
      pressConferences: boolean;
    };
    refreshInterval: number; // minutes
  };
  phase2: {
    enabled: boolean;
    sources: {
      schedule: boolean;
      roster: boolean;
      news: boolean;
      social: boolean;
    };
    refreshInterval: number;
  };
  phase3: {
    enabled: boolean;
    sources: {
      oddsApi: boolean;
      lineMovement: boolean;
      betSplits: boolean;
    };
    refreshInterval: number;
  };
  phase4: {
    enabled: boolean;
    sources: {
      weather: boolean;
      injuries: boolean;
      referee: boolean;
      schedule: boolean;
    };
    refreshInterval: number;
  };
}

/**
 * Base Data Collector
 */
export abstract class BaseDataCollector {
  protected config: DataCollectionConfig;

  constructor(config: DataCollectionConfig) {
    this.config = config;
  }

  abstract collect(): Promise<any>;
  abstract validate(data: any): boolean;
  abstract store(data: any): Promise<void>;
}

/**
 * Phase 1: Sentiment Data Collector
 * NOW WITH REAL API INTEGRATIONS
 */
export class SentimentDataCollector extends BaseDataCollector {
  private twitterCollector: TwitterCollector;
  private facebookCollector: FacebookCollector;
  private newsCollector: NewsCollector;
  private feedConfig: ReturnType<typeof loadDataFeedConfig>;

  constructor(config: DataCollectionConfig) {
    super(config);
    this.feedConfig = loadDataFeedConfig();
    this.twitterCollector = new TwitterCollector(
      this.feedConfig.twitter.apiKey,
      this.feedConfig.twitter.apiSecret,
      this.feedConfig.twitter.bearerToken
    );
    this.facebookCollector = new FacebookCollector(
      this.feedConfig.facebook?.appId,
      this.feedConfig.facebook?.appSecret
    );
    this.newsCollector = new NewsCollector(this.feedConfig.news.apiKey);
  }

  async collect(teamName?: string): Promise<any> {
    const data: any = {
      social: [],
      press: [],
      news: [],
    };

    // Twitter/X collection
    if (this.config.phase1.sources.twitter && this.feedConfig.twitter.enabled && teamName) {
      try {
        const tweets = await this.twitterCollector.collectTweets(
          `${teamName} OR #${teamName.replace(/\s+/g, '')}`,
          50
        );
        data.social.push(...tweets.map(t => ({
          platform: 'twitter',
          content: t.text,
          author: t.author_username,
          verified: t.author_verified,
          timestamp: t.created_at,
          engagement: t.public_metrics,
        })));
      } catch (error) {
        console.warn('[Collector] Twitter collection failed:', error);
      }
    }

    // Facebook collection
    if (this.feedConfig.facebook?.enabled && teamName) {
      try {
        // Search for team pages/posts
        const fbPosts = await this.facebookCollector.searchPublicPosts(
          teamName,
          30
        );
        data.social.push(...fbPosts.map(p => ({
          platform: 'facebook',
          content: p.message,
          author: p.from?.name || 'unknown',
          timestamp: p.created_time,
          engagement: {
            likes: p.likes?.summary?.total_count || 0,
            comments: p.comments?.summary?.total_count || 0,
            shares: p.shares?.count || 0,
          },
        })));
      } catch (error) {
        console.warn('[Collector] Facebook collection failed:', error);
      }
    }

    // Instagram collection (Phase 2)
    if (this.config.phase1.sources.instagram && this.feedConfig.instagram.enabled) {
      // Would use Instagram Basic Display API
      console.log('[Collector] Instagram collection requires API setup');
    }

    // News collection
    if (this.config.phase1.sources.news && this.feedConfig.news.enabled && teamName) {
      try {
        const articles = await this.newsCollector.collectNews(teamName, 30);
        data.news.push(...articles.map(a => ({
          title: a.title,
          content: a.content,
          source: a.source,
          url: a.url,
          publishedAt: a.publishedAt,
        })));
      } catch (error) {
        console.warn('[Collector] News collection failed:', error);
      }
    }

    // Press conference collection (manual entry for Phase 1)
    if (this.config.phase1.sources.pressConferences && this.feedConfig.pressConferences.enabled) {
      // Would load from database or manual entry
      console.log('[Collector] Press conference data would come from database');
    }

    return data;
  }

  validate(data: any): boolean {
    return data && typeof data === 'object';
  }

  async store(data: any): Promise<void> {
    // TODO: Store in database
    console.log('[Collector] Sentiment data storage not yet implemented');
  }
}

/**
 * Phase 2: Narrative Data Collector
 */
export class NarrativeDataCollector extends BaseDataCollector {
  async collect(): Promise<any> {
    const data: any = {
      schedule: null,
      roster: null,
      news: [],
      social: [],
    };

    // Schedule-based narratives
    if (this.config.phase2.sources.schedule) {
      // TODO: Load from schedule database
      console.log('[Collector] Schedule-based narrative collection not yet implemented');
    }

    // Roster-based narratives
    if (this.config.phase2.sources.roster) {
      // TODO: Load from roster database
      console.log('[Collector] Roster-based narrative collection not yet implemented');
    }

    return data;
  }

  validate(data: any): boolean {
    return data && typeof data === 'object';
  }

  async store(data: any): Promise<void> {
    // TODO: Store in database
    console.log('[Collector] Narrative data storage not yet implemented');
  }
}

/**
 * Phase 3: IAI Data Collector
 * NOW WITH REAL API INTEGRATIONS
 */
export class IAIDataCollector extends BaseDataCollector {
  private lineTracker: LineMovementTracker;
  private feedConfig: ReturnType<typeof loadDataFeedConfig>;

  constructor(config: DataCollectionConfig) {
    super(config);
    this.feedConfig = loadDataFeedConfig();
    this.lineTracker = new LineMovementTracker();
  }

  async collect(gameId?: string, currentLine?: number, openingLine?: number, betSplits?: any): Promise<any> {
    const data: any = {
      lineMovement: [],
      betSplits: null,
      odds: null,
    };

    // Odds API integration (already have this)
    if (this.config.phase3.sources.oddsApi && this.feedConfig.oddsAPI.enabled) {
      // Odds API is already integrated in weekly-page.helpers.ts
      data.odds = { available: true };
    }

    // Line movement tracking
    if (this.config.phase3.sources.lineMovement && gameId && currentLine !== undefined) {
      try {
        const movement = this.lineTracker.trackMovement(
          gameId,
          currentLine,
          openingLine,
          betSplits?.publicTicketPct,
          betSplits?.publicHandlePct
        );
        data.lineMovement = [movement];
        data.sharpIndicator = movement.sharpIndicator;
      } catch (error) {
        console.warn('[Collector] Line movement tracking failed:', error);
      }
    }

    // Bet splits
    if (this.config.phase3.sources.betSplits && betSplits) {
      data.betSplits = betSplits;
    }

    return data;
  }

  validate(data: any): boolean {
    return data && typeof data === 'object';
  }

  async store(data: any): Promise<void> {
    // TODO: Store in database
    console.log('[Collector] IAI data storage not yet implemented');
  }
}

/**
 * Phase 4: CSI Data Collector
 * NOW WITH REAL API INTEGRATIONS
 */
export class CSIDataCollector extends BaseDataCollector {
  private weatherCollector: WeatherCollector;
  private injuryCollector: InjuryCollector;
  private feedConfig: ReturnType<typeof loadDataFeedConfig>;

  constructor(config: DataCollectionConfig) {
    super(config);
    this.feedConfig = loadDataFeedConfig();
    this.weatherCollector = new WeatherCollector(this.feedConfig.weather.apiKey);
    this.injuryCollector = new InjuryCollector();
  }

  async collect(
    stadium?: { name: string; city: string; state: string },
    gameDate?: Date,
    teamId?: string,
    teamName?: string
  ): Promise<any> {
    const data: any = {
      weather: null,
      injuries: [],
      referee: null,
      schedule: null,
    };

    // Weather API integration
    if (this.config.phase4.sources.weather && this.feedConfig.weather.enabled && stadium) {
      try {
        const location = getStadiumLocation(stadium.name, stadium.city, stadium.state);
        if (location && gameDate) {
          const weather = await this.weatherCollector.getWeatherForStadium(location, gameDate);
          if (!weather && gameDate > new Date()) {
            // Try forecast for future games
            const forecast = await this.weatherCollector.getForecastForStadium(location, gameDate);
            data.weather = forecast;
          } else {
            data.weather = weather;
          }
        }
      } catch (error) {
        console.warn('[Collector] Weather collection failed:', error);
      }
    }

    // Injury reports
    if (this.config.phase4.sources.injuries && this.feedConfig.injuries.enabled && teamId && teamName) {
      try {
        const injuries = await this.injuryCollector.collectInjuries(teamId, teamName);
        data.injuries = injuries.injuries;
        data.clusterInjuries = injuries.clusterInjuries;
        data.totalImpact = injuries.totalImpact;
      } catch (error) {
        console.warn('[Collector] Injury collection failed:', error);
      }
    }

    // Referee crew data
    if (this.config.phase4.sources.referee && this.feedConfig.referee.enabled) {
      // Would load from database
      data.referee = { available: true };
    }

    return data;
  }

  validate(data: any): boolean {
    return data && typeof data === 'object';
  }

  async store(data: any): Promise<void> {
    // TODO: Store in database
    console.log('[Collector] CSI data storage not yet implemented');
  }
}

/**
 * Data Collection Manager
 */
export class DataCollectionManager {
  private collectors: Map<string, BaseDataCollector> = new Map();
  private config: DataCollectionConfig;

  constructor(config: DataCollectionConfig) {
    this.config = config;

    // Initialize collectors
    if (config.phase1.enabled) {
      this.collectors.set('sentiment', new SentimentDataCollector(config));
    }
    if (config.phase2.enabled) {
      this.collectors.set('narrative', new NarrativeDataCollector(config));
    }
    if (config.phase3.enabled) {
      this.collectors.set('iai', new IAIDataCollector(config));
    }
    if (config.phase4.enabled) {
      this.collectors.set('csi', new CSIDataCollector(config));
    }
  }

  async collectAll(): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    for (const [name, collector] of this.collectors.entries()) {
      try {
        const data = await collector.collect();
        if (collector.validate(data)) {
          results[name] = data;
          await collector.store(data);
        }
      } catch (error) {
        console.error(`[Data Collection] ${name} failed:`, error);
      }
    }

    return results;
  }

  async collectPhase(phase: 'phase1' | 'phase2' | 'phase3' | 'phase4'): Promise<any> {
    const phaseMap: Record<string, string> = {
      phase1: 'sentiment',
      phase2: 'narrative',
      phase3: 'iai',
      phase4: 'csi',
    };

    const collector = this.collectors.get(phaseMap[phase]);
    if (!collector) {
      throw new Error(`Phase ${phase} collector not initialized`);
    }

    const data = await collector.collect();
    if (collector.validate(data)) {
      await collector.store(data);
      return data;
    }

    throw new Error(`Phase ${phase} data validation failed`);
  }
}

