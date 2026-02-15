/**
 * Bookmarks and Favorites System for SmokersRights
 * 
 * Allows users to save laws, places, and comparisons for quick access
 */

import { createClient } from '@/lib/supabase';

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
  private supabase = createClient();

  async addBookmark(
    userId: string,
    itemType: Bookmark['item_type'],
    itemId: string,
    title: string,
    description: string,
    metadata: Record<string, any> = {}
  ): Promise<Bookmark> {
    const { data: existing } = await this.supabase
      .from('sr_bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .single();

    if (existing) throw new Error('Already bookmarked');

    const { data, error } = await this.supabase
      .from('sr_bookmarks')
      .insert({ user_id: userId, item_type: itemType, item_id: itemId, title, description, metadata })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async removeBookmark(userId: string, bookmarkId: string): Promise<void> {
    const { error } = await this.supabase
      .from('sr_bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('id', bookmarkId);
    if (error) throw error;
  }

  async getUserBookmarks(userId: string, itemType?: Bookmark['item_type'], limit = 50): Promise<Bookmark[]> {
    let query = this.supabase.from('sr_bookmarks').select('*').eq('user_id', userId);
    if (itemType) query = query.eq('item_type', itemType);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  }

  async isBookmarked(userId: string, itemType: Bookmark['item_type'], itemId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('sr_bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .single();
    return !!data;
  }

  async createFolder(userId: string, name: string, description?: string, color = '#3b82f6', isPublic = false): Promise<BookmarkFolder> {
    const { data, error } = await this.supabase
      .from('sr_bookmark_folders')
      .insert({ user_id: userId, name, description, color, is_public: isPublic })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getUserFolders(userId: string): Promise<BookmarkFolder[]> {
    const { data, error } = await this.supabase
      .from('sr_bookmark_folders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
}

export default BookmarkService;
