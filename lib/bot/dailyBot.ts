/**
 * Daily Bot Service for SmokersRights
 * 
 * Automatically updates laws, regulations, and other data that needs to stay current
 * Runs daily via cron job or scheduled task
 */

import { createClient } from '@/lib/supabase';
import { LawUpdateService } from './lawUpdateService';
import { DataCleanupService } from './dataCleanupService';
import { NotificationService } from './notificationService';
import { AnalyticsService } from './analyticsService';

interface BotConfig {
  enableLawUpdates: boolean;
  enableDataCleanup: boolean;
  enableNotifications: boolean;
  enableAnalytics: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

interface BotRunResult {
  success: boolean;
  timestamp: Date;
  results: {
    lawUpdates?: any;
    dataCleanup?: any;
    notifications?: any;
    analytics?: any;
  };
  errors: string[];
  duration: number;
}

export class DailyBot {
  private supabase: ReturnType<typeof createClient> | null;
  private lawUpdateService: LawUpdateService;
  private dataCleanupService: DataCleanupService;
  private notificationService: NotificationService;
  private analyticsService: AnalyticsService;
  private config: BotConfig;

  constructor(config: Partial<BotConfig> = {}) {
    this.config = {
      enableLawUpdates: true,
      enableDataCleanup: true,
      enableNotifications: true,
      enableAnalytics: true,
      logLevel: 'info',
      ...config
    };

    // Initialize Supabase client safely
    try {
      this.supabase = createClient();
    } catch (error) {
      console.warn('Supabase client initialization failed:', error);
      this.supabase = null;
    }

    this.lawUpdateService = new LawUpdateService();
    this.dataCleanupService = new DataCleanupService();
    this.notificationService = new NotificationService();
    this.analyticsService = new AnalyticsService();
  }

  /**
   * Main bot execution method
   */
  async runDaily(): Promise<BotRunResult> {
    const startTime = Date.now();
    const result: BotRunResult = {
      success: true,
      timestamp: new Date(),
      results: {},
      errors: [],
      duration: 0
    };

    try {
      this.log('info', 'Starting daily bot execution');

      // 1. Update laws and regulations
      if (this.config.enableLawUpdates) {
        try {
          this.log('info', 'Running law updates');
          result.results.lawUpdates = await this.lawUpdateService.updateLaws();
          this.log('info', `Law updates completed: ${result.results.lawUpdates.updated} laws updated`);
        } catch (error) {
          const errorMsg = `Law updates failed: ${error}`;
          this.log('error', errorMsg);
          result.errors.push(errorMsg);
          result.success = false;
        }
      }

      // 2. Clean up old data
      if (this.config.enableDataCleanup) {
        try {
          this.log('info', 'Running data cleanup');
          result.results.dataCleanup = await this.dataCleanupService.cleanup();
          this.log('info', `Data cleanup completed: ${result.results.dataCleanup.cleaned} records removed`);
        } catch (error) {
          const errorMsg = `Data cleanup failed: ${error}`;
          this.log('error', errorMsg);
          result.errors.push(errorMsg);
          result.success = false;
        }
      }

      // 3. Send notifications for changes
      if (this.config.enableNotifications) {
        try {
          this.log('info', 'Sending notifications');
          result.results.notifications = await this.notificationService.sendNotifications(result.results.lawUpdates);
          this.log('info', `Notifications sent: ${result.results.notifications.sent} notifications`);
        } catch (error) {
          const errorMsg = `Notifications failed: ${error}`;
          this.log('error', errorMsg);
          result.errors.push(errorMsg);
          result.success = false;
        }
      }

      // 4. Update analytics
      if (this.config.enableAnalytics) {
        try {
          this.log('info', 'Updating analytics');
          result.results.analytics = await this.analyticsService.updateAnalytics();
          this.log('info', 'Analytics updated successfully');
        } catch (error) {
          const errorMsg = `Analytics update failed: ${error}`;
          this.log('error', errorMsg);
          result.errors.push(errorMsg);
          result.success = false;
        }
      }

      // Log bot run to database
      await this.logBotRun(result);

    } catch (error) {
      const errorMsg = `Bot execution failed: ${error}`;
      this.log('error', errorMsg);
      result.errors.push(errorMsg);
      result.success = false;
    }

    result.duration = Date.now() - startTime;
    this.log('info', `Daily bot execution completed in ${result.duration}ms`);

    return result;
  }

  /**
   * Log bot run to database for monitoring
   */
  private async logBotRun(result: BotRunResult): Promise<void> {
    if (!this.supabase) {
      this.log('warn', 'Supabase not available, skipping bot run log');
      return;
    }

    try {
      const { error } = await this.supabase
        .from('bot_run_logs')
        .insert({
          run_date: result.timestamp,
          success: result.success,
          duration_ms: result.duration,
          results: result.results,
          errors: result.errors,
          config: this.config
        });

      if (error) {
        this.log('error', `Failed to log bot run: ${error}`);
      }
    } catch (error) {
      this.log('error', `Failed to log bot run: ${error}`);
    }
  }

  /**
   * Simple logging method
   */
  private log(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] DailyBot: ${message}`;
    
    console.log(logMessage);

    // In production, you might want to send logs to a service like Sentry, LogRocket, etc.
    if (this.config.logLevel === 'debug' || 
        (this.config.logLevel === 'info' && level !== 'debug') ||
        (this.config.logLevel === 'warn' && ['error', 'warn'].includes(level)) ||
        (this.config.logLevel === 'error' && level === 'error')) {
      // Log to external service here if needed
    }
  }

  /**
   * Get bot status and recent runs
   */
  async getStatus(): Promise<any> {
    if (!this.supabase) {
      return {
        status: 'inactive',
        error: 'Supabase not configured',
        config: this.config,
        recentRuns: [],
        lastRun: null
      };
    }

    try {
      const { data: recentRuns, error } = await this.supabase
        .from('bot_run_logs')
        .select('*')
        .order('run_date', { ascending: false })
        .limit(10);

      if (error) throw error;

      return {
        status: 'active',
        config: this.config,
        recentRuns: recentRuns || [],
        lastRun: recentRuns?.[0] || null
      };
    } catch (error) {
      this.log('error', `Failed to get bot status: ${error}`);
      return {
        status: 'error',
        error: error,
        config: this.config,
        recentRuns: [],
        lastRun: null
      };
    }
  }
}
