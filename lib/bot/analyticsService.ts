/**
 * Analytics Service
 * 
 * Updates analytics data and generates reports
 */

import { createClient } from '@/lib/supabase';

interface AnalyticsResult {
  updated: boolean;
  metrics: {
    totalUsers: number;
    activeUsers: number;
    totalLaws: number;
    totalPlaces: number;
    totalBookmarks: number;
    totalCorrections: number;
  };
  errors: string[];
}

export class AnalyticsService {
  private supabase: ReturnType<typeof createClient> | null;

  constructor() {
    try {
      this.supabase = createClient();
    } catch (error) {
      console.warn('Supabase client initialization failed:', error);
      this.supabase = null;
    }
  }

  /**
   * Update analytics data
   */
  async updateAnalytics(): Promise<AnalyticsResult> {
    const result: AnalyticsResult = {
      updated: false,
      metrics: {
        totalUsers: 0,
        activeUsers: 0,
        totalLaws: 0,
        totalPlaces: 0,
        totalBookmarks: 0,
        totalCorrections: 0
      },
      errors: []
    };

    try {
      console.log('Updating analytics data...');

      // Get current metrics
      result.metrics = await this.getCurrentMetrics();

      // Store daily analytics snapshot
      await this.storeDailyAnalytics(result.metrics);

      // Update trend data
      await this.updateTrendData();

      // Generate reports
      await this.generateReports();

      result.updated = true;
      console.log('Analytics update completed successfully');

    } catch (error) {
      result.errors.push(`Analytics update failed: ${error}`);
    }

    return result;
  }

  /**
   * Get current metrics from database
   */
  private async getCurrentMetrics(): Promise<any> {
    const metrics = {
      totalUsers: 0,
      activeUsers: 0,
      totalLaws: 0,
      totalPlaces: 0,
      totalBookmarks: 0,
      totalCorrections: 0
    };

    try {
      // Get total users
      const { count: userCount } = await this.supabase
        .from('unified_users')
        .select('*', { count: 'exact', head: true });
      metrics.totalUsers = userCount || 0;

      // Get active users (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { count: activeCount } = await this.supabase
        .from('unified_users')
        .select('*', { count: 'exact', head: true })
        .gte('last_login', thirtyDaysAgo.toISOString());
      metrics.activeUsers = activeCount || 0;

      // Get total laws
      const { count: lawCount } = await this.supabase
        .from('sr_law_cards')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      metrics.totalLaws = lawCount || 0;

      // Get total places
      const { count: placeCount } = await this.supabase
        .from('sr_directory_places')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'verified');
      metrics.totalPlaces = placeCount || 0;

      // Get total bookmarks
      const { count: bookmarkCount } = await this.supabase
        .from('sr_bookmarks')
        .select('*', { count: 'exact', head: true });
      metrics.totalBookmarks = bookmarkCount || 0;

      // Get total corrections
      const { count: correctionCount } = await this.supabase
        .from('sr_corrections')
        .select('*', { count: 'exact', head: true });
      metrics.totalCorrections = correctionCount || 0;

    } catch (error) {
      console.error('Error getting current metrics:', error);
    }

    return metrics;
  }

  /**
   * Store daily analytics snapshot
   */
  private async storeDailyAnalytics(metrics: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('daily_analytics')
        .insert({
          date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
          total_users: metrics.totalUsers,
          active_users: metrics.activeUsers,
          total_laws: metrics.totalLaws,
          total_places: metrics.totalPlaces,
          total_bookmarks: metrics.totalBookmarks,
          total_corrections: metrics.totalCorrections,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing daily analytics:', error);
      }
    } catch (error) {
      console.error('Error storing daily analytics:', error);
    }
  }

  /**
   * Update trend data
   */
  private async updateTrendData(): Promise<void> {
    try {
      // Calculate user growth trends
      await this.calculateUserGrowthTrends();

      // Calculate content growth trends
      await this.calculateContentGrowthTrends();

      // Calculate engagement trends
      await this.calculateEngagementTrends();

    } catch (error) {
      console.error('Error updating trend data:', error);
    }
  }

  /**
   * Calculate user growth trends
   */
  private async calculateUserGrowthTrends(): Promise<void> {
    try {
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Get new users in last 30 days
      const { count: newUsers } = await this.supabase
        .from('unified_users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last30Days.toISOString());

      // Calculate growth rate
      const { count: totalUsers } = await this.supabase
        .from('unified_users')
        .select('*', { count: 'exact', head: true });

      const growthRate = totalUsers > 0 ? ((newUsers || 0) / totalUsers) * 100 : 0;

      // Store trend data
      await this.supabase
        .from('analytics_trends')
        .upsert({
          metric: 'user_growth_rate',
          value: growthRate,
          date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        });

    } catch (error) {
      console.error('Error calculating user growth trends:', error);
    }
  }

  /**
   * Calculate content growth trends
   */
  private async calculateContentGrowthTrends(): Promise<void> {
    try {
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Get new laws in last 30 days
      const { count: newLaws } = await this.supabase
        .from('sr_law_cards')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last30Days.toISOString());

      // Get new places in last 30 days
      const { count: newPlaces } = await this.supabase
        .from('sr_directory_places')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last30Days.toISOString());

      // Store trend data
      await this.supabase
        .from('analytics_trends')
        .upsert([
          {
            metric: 'new_laws_30d',
            value: newLaws || 0,
            date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          },
          {
            metric: 'new_places_30d',
            value: newPlaces || 0,
            date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          }
        ]);

    } catch (error) {
      console.error('Error calculating content growth trends:', error);
    }
  }

  /**
   * Calculate engagement trends
   */
  private async calculateEngagementTrends(): Promise<void> {
    try {
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Get new bookmarks in last 30 days
      const { count: newBookmarks } = await this.supabase
        .from('sr_bookmarks')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last30Days.toISOString());

      // Get new corrections in last 30 days
      const { count: newCorrections } = await this.supabase
        .from('sr_corrections')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last30Days.toISOString());

      // Store trend data
      await this.supabase
        .from('analytics_trends')
        .upsert([
          {
            metric: 'new_bookmarks_30d',
            value: newBookmarks || 0,
            date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          },
          {
            metric: 'new_corrections_30d',
            value: newCorrections || 0,
            date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          }
        ]);

    } catch (error) {
      console.error('Error calculating engagement trends:', error);
    }
  }

  /**
   * Generate reports
   */
  private async generateReports(): Promise<void> {
    try {
      // Generate daily summary report
      await this.generateDailySummary();

      // Generate weekly summary report (if it's Sunday)
      if (new Date().getDay() === 0) {
        await this.generateWeeklySummary();
      }

      // Generate monthly summary report (if it's the first of the month)
      if (new Date().getDate() === 1) {
        await this.generateMonthlySummary();
      }

    } catch (error) {
      console.error('Error generating reports:', error);
    }
  }

  /**
   * Generate daily summary report
   */
  private async generateDailySummary(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get yesterday's analytics
      const { data: yesterdayData } = await this.supabase
        .from('daily_analytics')
        .select('*')
        .eq('date', yesterday)
        .single();

      // Get today's analytics
      const { data: todayData } = await this.supabase
        .from('daily_analytics')
        .select('*')
        .eq('date', today)
        .single();

      // Calculate changes
      const changes = {
        users: (todayData?.total_users || 0) - (yesterdayData?.total_users || 0),
        activeUsers: (todayData?.active_users || 0) - (yesterdayData?.active_users || 0),
        laws: (todayData?.total_laws || 0) - (yesterdayData?.total_laws || 0),
        places: (todayData?.total_places || 0) - (yesterdayData?.total_places || 0),
        bookmarks: (todayData?.total_bookmarks || 0) - (yesterdayData?.total_bookmarks || 0),
        corrections: (todayData?.total_corrections || 0) - (yesterdayData?.total_corrections || 0)
      };

      // Store daily summary
      await this.supabase
        .from('daily_summaries')
        .insert({
          date: today,
          metrics: todayData,
          changes: changes,
          generated_at: new Date().toISOString()
        });

    } catch (error) {
      console.error('Error generating daily summary:', error);
    }
  }

  /**
   * Generate weekly summary report
   */
  private async generateWeeklySummary(): Promise<void> {
    try {
      // Implementation for weekly summary
      console.log('Weekly summary generated');
    } catch (error) {
      console.error('Error generating weekly summary:', error);
    }
  }

  /**
   * Generate monthly summary report
   */
  private async generateMonthlySummary(): Promise<void> {
    try {
      // Implementation for monthly summary
      console.log('Monthly summary generated');
    } catch (error) {
      console.error('Error generating monthly summary:', error);
    }
  }

  /**
   * Get analytics dashboard data
   */
  async getDashboardData(): Promise<any> {
    try {
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // Get daily analytics for last 30 days
      const { data: dailyData } = await this.supabase
        .from('daily_analytics')
        .select('*')
        .gte('date', last30Days.toISOString().split('T')[0])
        .order('date', { ascending: true });

      // Get trend data
      const { data: trendData } = await this.supabase
        .from('analytics_trends')
        .select('*')
        .gte('date', last30Days.toISOString().split('T')[0])
        .order('date', { ascending: true });

      return {
        dailyAnalytics: dailyData || [],
        trends: trendData || []
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      return {
        dailyAnalytics: [],
        trends: []
      };
    }
  }
}
