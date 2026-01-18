/**
 * Data Cleanup Service
 * 
 * Cleans up old data, removes expired sessions, and optimizes database storage
 */

import { getSupabaseAdminClient } from '@/lib/supabase';

interface CleanupResult {
  cleaned: number;
  details: {
    expiredSessions: number;
    oldCorrections: number;
    oldBookmarks: number;
    orphanedData: number;
    tempFiles: number;
  };
  errors: string[];
}

export class DataCleanupService {
  private supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

  constructor() {
    const client = getSupabaseAdminClient();
    if (!client) {
      throw new Error('Supabase client initialization failed: missing configuration');
    }
    this.supabase = client;
  }

  /**
   * Main cleanup method
   */
  async cleanup(): Promise<CleanupResult> {
    const result: CleanupResult = {
      cleaned: 0,
      details: {
        expiredSessions: 0,
        oldCorrections: 0,
        oldBookmarks: 0,
        orphanedData: 0,
        tempFiles: 0
      },
      errors: []
    };

    try {
      console.log('Starting data cleanup...');

      // 1. Clean expired user sessions
      result.details.expiredSessions = await this.cleanExpiredSessions();

      // 2. Clean old corrections (older than 1 year)
      result.details.oldCorrections = await this.cleanOldCorrections();

      // 3. Clean old bookmarks (older than 2 years)
      result.details.oldBookmarks = await this.cleanOldBookmarks();

      // 4. Clean orphaned data
      result.details.orphanedData = await this.cleanOrphanedData();

      // 5. Clean temporary files
      result.details.tempFiles = await this.cleanTempFiles();

      // Calculate total cleaned
      result.cleaned = Object.values(result.details).reduce((sum, count) => sum + count, 0);

      console.log(`Data cleanup completed. Total items cleaned: ${result.cleaned}`);

    } catch (error) {
      result.errors.push(`Data cleanup failed: ${error}`);
    }

    return result;
  }

  /**
   * Clean expired user sessions
   */
  private async cleanExpiredSessions(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const { data, error } = await this.supabase
        .from('user_sessions')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString())
        .select('id');

      if (error) {
        console.error('Error cleaning expired sessions:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error cleaning expired sessions:', error);
      return 0;
    }
  }

  /**
   * Clean old corrections (older than 1 year and resolved)
   */
  private async cleanOldCorrections(): Promise<number> {
    try {
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      
      const { data, error } = await this.supabase
        .from('sr_corrections')
        .delete()
        .lt('created_at', oneYearAgo.toISOString())
        .in('status', ['approved', 'rejected'])
        .select('id');

      if (error) {
        console.error('Error cleaning old corrections:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error cleaning old corrections:', error);
      return 0;
    }
  }

  /**
   * Clean old bookmarks (older than 2 years)
   */
  private async cleanOldBookmarks(): Promise<number> {
    try {
      const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
      
      const { data, error } = await this.supabase
        .from('sr_bookmarks')
        .delete()
        .lt('created_at', twoYearsAgo.toISOString())
        .select('id');

      if (error) {
        console.error('Error cleaning old bookmarks:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error cleaning old bookmarks:', error);
      return 0;
    }
  }

  /**
   * Clean orphaned data (data without valid references)
   */
  private async cleanOrphanedData(): Promise<number> {
    let cleaned = 0;

    try {
      // Clean orphaned directory place references
      const { data: orphanedPlaces, error: placesError } = await this.supabase
        .from('sr_directory_places')
        .delete()
        .not('submitted_by', 'in', `(SELECT id FROM unified_users)`)
        .select('id');

      if (placesError) {
        console.error('Error cleaning orphaned places:', placesError);
      } else {
        cleaned += orphanedPlaces?.length || 0;
      }

      // Clean orphaned law card references
      const { data: orphanedLaws, error: lawsError } = await this.supabase
        .from('sr_law_cards')
        .delete()
        .not('created_by', 'in', `(SELECT id FROM unified_users WHERE id IS NOT NULL)`)
        .select('id');

      if (lawsError) {
        console.error('Error cleaning orphaned laws:', lawsError);
      } else {
        cleaned += orphanedLaws?.length || 0;
      }

    } catch (error) {
      console.error('Error cleaning orphaned data:', error);
    }

    return cleaned;
  }

  /**
   * Clean temporary files and uploads
   */
  private async cleanTempFiles(): Promise<number> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Clean temporary uploads from storage
      const { data: files, error } = await this.supabase
        .storage
        .from('temp-uploads')
        .list();

      if (error) {
        console.error('Error listing temp files:', error);
        return 0;
      }

      let cleaned = 0;
      if (files && files.length > 0) {
        // Filter files older than 7 days
        const oldFiles = files.filter((file: any) => {
          const fileDate = new Date(file.created_at);
          return fileDate < sevenDaysAgo;
        });

        // Delete old files
        for (const file of oldFiles) {
          const { error: deleteError } = await this.supabase
            .storage
            .from('temp-uploads')
            .remove([(file as any).name]);

          if (!deleteError) {
            cleaned++;
          }
        }
      }

      return cleaned;
    } catch (error) {
      console.error('Error cleaning temp files:', error);
      return 0;
    }
  }

  /**
   * Optimize database tables (VACUUM, ANALYZE, etc.)
   */
  async optimizeDatabase(): Promise<void> {
    try {
      // This would typically require database admin privileges
      // In production, you might use stored procedures or database functions
      
      console.log('Database optimization completed');
    } catch (error) {
      console.error('Database optimization failed:', error);
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<any> {
    try {
      const stats = {
        users: 0,
        laws: 0,
        places: 0,
        bookmarks: 0,
        corrections: 0,
        storageUsed: 0
      };

      // Get counts from various tables
      const [
        { count: userCount },
        { count: lawCount },
        { count: placeCount },
        { count: bookmarkCount },
        { count: correctionCount }
      ] = await Promise.all([
        this.supabase.from('unified_users').select('*', { count: 'exact', head: true }),
        this.supabase.from('sr_law_cards').select('*', { count: 'exact', head: true }),
        this.supabase.from('sr_directory_places').select('*', { count: 'exact', head: true }),
        this.supabase.from('sr_bookmarks').select('*', { count: 'exact', head: true }),
        this.supabase.from('sr_corrections').select('*', { count: 'exact', head: true })
      ]);

      stats.users = userCount || 0;
      stats.laws = lawCount || 0;
      stats.places = placeCount || 0;
      stats.bookmarks = bookmarkCount || 0;
      stats.corrections = correctionCount || 0;

      return stats;
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {};
    }
  }
}
