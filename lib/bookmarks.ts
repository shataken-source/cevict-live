/**
 * Bookmarks and Favorites System for SmokersRights
 * 
 * Allows users to save laws, places, and comparisons for quick access
 */

import { createClient } from './supabase';

export interface Bookmark {
  id: string;
  user_id: string;
  item_type: 'law' | 'place' | 'comparison';
  item_id: string;
  title: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BookmarkFolder {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export class BookmarkService {
  private supabase = createClient()!;

  /**
   * Add a bookmark
   */
  async addBookmark(
    userId: string,
    itemType: Bookmark['item_type'],
    itemId: string,
    title: string,
    description: string,
    metadata: Record<string, any> = {}
  ): Promise<Bookmark> {
    try {
      // Check if already bookmarked
      const { data: existing } = await this.supabase
        .from('sr_bookmarks')
        .select('id')
        .eq('user_id', userId)
        .eq('item_type', itemType)
        .eq('item_id', itemId)
        .single();

      if (existing) {
        throw new Error('Already bookmarked');
      }

      const { data, error } = await this.supabase
        .from('sr_bookmarks')
        .insert({
          user_id: userId,
          item_type: itemType,
          item_id: itemId,
          title,
          description,
          metadata
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding bookmark:', error);
      throw error;
    }
  }

  /**
   * Remove a bookmark
   */
  async removeBookmark(userId: string, bookmarkId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('sr_bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('id', bookmarkId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing bookmark:', error);
      throw error;
    }
  }

  /**
   * Get user's bookmarks
   */
  async getUserBookmarks(
    userId: string,
    itemType?: Bookmark['item_type'],
    folderId?: string,
    limit = 50,
    offset = 0
  ): Promise<Bookmark[]> {
    try {
      let query = this.supabase
        .from('sr_bookmarks')
        .select('*')
        .eq('user_id', userId);

      if (itemType) {
        query = query.eq('item_type', itemType);
      }

      if (folderId) {
        query = query.eq('folder_id', folderId);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      return [];
    }
  }

  /**
   * Check if item is bookmarked
   */
  async isBookmarked(
    userId: string,
    itemType: Bookmark['item_type'],
    itemId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('sr_bookmarks')
        .select('id')
        .eq('user_id', userId)
        .eq('item_type', itemType)
        .eq('item_id', itemId)
        .single();

      return !error && !!data;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a bookmark folder
   */
  async createFolder(
    userId: string,
    name: string,
    description?: string,
    color = '#3b82f6',
    isPublic = false
  ): Promise<BookmarkFolder> {
    try {
      const { data, error } = await this.supabase
        .from('sr_bookmark_folders')
        .insert({
          user_id: userId,
          name,
          description,
          color,
          isPublic
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  /**
   * Get user's bookmark folders
   */
  async getUserFolders(userId: string): Promise<BookmarkFolder[]> {
    try {
      const { data, error } = await this.supabase
        .from('sr_bookmark_folders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching folders:', error);
      return [];
    }
  }

  /**
   * Move bookmark to folder
   */
  async moveToFolder(userId: string, bookmarkId: string, folderId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('sr_bookmarks')
        .update({ folder_id: folderId })
        .eq('user_id', userId)
        .eq('id', bookmarkId);

      if (error) throw error;
    } catch (error) {
      console.error('Error moving bookmark:', error);
      throw error;
    }
  }

  /**
   * Get bookmark statistics
   */
  async getBookmarkStats(userId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    byFolder: Record<string, number>;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('sr_bookmarks')
        .select('item_type, folder_id')
        .eq('user_id', userId);

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        byType: {} as Record<string, number>,
        byFolder: {} as Record<string, number>
      };

      data?.forEach((bookmark: any) => {
        stats.byType[bookmark.item_type] = (stats.byType[bookmark.item_type] || 0) + 1;
        if (bookmark.folder_id) {
          stats.byFolder[bookmark.folder_id] = (stats.byFolder[bookmark.folder_id] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error fetching bookmark stats:', error);
      return { total: 0, byType: {}, byFolder: {} };
    }
  }

  /**
   * Export bookmarks
   */
  async exportBookmarks(userId: string, format = 'json'): Promise<string> {
    try {
      const bookmarks = await this.getUserBookmarks(userId, undefined, undefined, 1000);
      
      if (format === 'csv') {
        const headers = ['Title', 'Type', 'Description', 'Created', 'Metadata'];
        const rows = bookmarks.map(bookmark => [
          bookmark.title,
          bookmark.item_type,
          bookmark.description,
          bookmark.created_at,
          JSON.stringify(bookmark.metadata)
        ]);
        
        return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
      }
      
      return JSON.stringify(bookmarks, null, 2);
    } catch (error) {
      console.error('Error exporting bookmarks:', error);
      throw error;
    }
  }

  /**
   * Import bookmarks
   */
  async importBookmarks(userId: string, bookmarks: any[]): Promise<number> {
    try {
      let imported = 0;
      
      for (const bookmark of bookmarks) {
        try {
          await this.addBookmark(
            userId,
            bookmark.item_type,
            bookmark.item_id,
            bookmark.title,
            bookmark.description,
            bookmark.metadata || {}
          );
          imported++;
        } catch (error) {
          // Skip duplicates and continue
          console.warn('Skipping bookmark:', error);
        }
      }
      
      return imported;
    } catch (error) {
      console.error('Error importing bookmarks:', error);
      throw error;
    }
  }

  /**
   * Search bookmarks
   */
  async searchBookmarks(
    userId: string,
    query: string,
    itemType?: Bookmark['item_type']
  ): Promise<Bookmark[]> {
    try {
      let dbQuery = this.supabase
        .from('sr_bookmarks')
        .select('*')
        .eq('user_id', userId);

      if (itemType) {
        dbQuery = dbQuery.eq('item_type', itemType);
      }

      if (query) {
        dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
      }

      const { data, error } = await dbQuery
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching bookmarks:', error);
      return [];
    }
  }

  /**
   * Get recently bookmarked items
   */
  async getRecentBookmarks(userId: string, limit = 10): Promise<Bookmark[]> {
    try {
      const { data, error } = await this.supabase
        .from('sr_bookmarks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent bookmarks:', error);
      return [];
    }
  }

  /**
   * Get popular bookmarks (public folders)
   */
  async getPopularBookmarks(limit = 20): Promise<Bookmark[]> {
    try {
      const { data, error } = await this.supabase
        .from('sr_bookmarks')
        .select(`
          *,
          sr_bookmark_folders!inner(
            is_public,
            name
          )
        `)
        .eq('sr_bookmark_folders.is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching popular bookmarks:', error);
      return [];
    }
  }
}

export default BookmarkService;
