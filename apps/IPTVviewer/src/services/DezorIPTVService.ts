/**
 * DezorIPTV Service
 * Handles M3U playlist download and authentication for DezorIPTV provider
 */

import { Playlist } from '@/types';
import { M3UParser } from './M3UParser';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DezorCredentials {
  username: string;
  password: string;
  server: string;
}

export class DezorIPTVService {
  private static readonly STORAGE_KEY = 'dezor_credentials';
  private static readonly DEFAULT_SERVER = 'http://cf.like-cdn.com';

  /**
   * Get M3U playlist URL for DezorIPTV
   */
  static getPlaylistUrl(credentials: DezorCredentials): string {
    const { username, password, server } = credentials;
    const baseServer = server || this.DEFAULT_SERVER;
    
    // DezorIPTV M3U URL format
    return `${baseServer}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=ts`;
  }

  /**
   * Get EPG URL for DezorIPTV
   */
  static getEPGUrl(credentials: DezorCredentials): string {
    const { username, password, server } = credentials;
    const baseServer = server || this.DEFAULT_SERVER;
    
    return `${baseServer}/xmltv.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  }

  /**
   * Download and parse M3U playlist from DezorIPTV
   */
  static async downloadPlaylist(credentials: DezorCredentials): Promise<Playlist> {
    const url = this.getPlaylistUrl(credentials);
    
    try {
      const playlist = await M3UParser.fetchAndParse(
        url,
        'dezor-iptv',
        `DezorIPTV - ${credentials.username}`
      );

      // Add expiration date if available (DezorIPTV typically provides this)
      // Most IPTV subscriptions are monthly
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      playlist.expiresAt = expiresAt;

      return playlist;
    } catch (error) {
      console.error('Error downloading DezorIPTV playlist:', error);
      throw new Error('Failed to download playlist. Check your credentials and server URL.');
    }
  }

  /**
   * Test credentials by attempting to download playlist
   */
  static async testCredentials(credentials: DezorCredentials): Promise<boolean> {
    try {
      const url = this.getPlaylistUrl(credentials);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, { 
        signal: controller.signal,
        method: 'HEAD' // Just check if URL is accessible
      });
      
      clearTimeout(timeout);
      return response.ok;
    } catch (error) {
      console.error('DezorIPTV credentials test failed:', error);
      return false;
    }
  }

  /**
   * Save credentials to storage
   */
  static async saveCredentials(credentials: DezorCredentials): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(credentials)
      );
    } catch (error) {
      console.error('Error saving DezorIPTV credentials:', error);
      throw error;
    }
  }

  /**
   * Load credentials from storage
   */
  static async loadCredentials(): Promise<DezorCredentials | null> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!data) return null;

      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading DezorIPTV credentials:', error);
      return null;
    }
  }

  /**
   * Clear saved credentials
   */
  static async clearCredentials(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing DezorIPTV credentials:', error);
    }
  }

  /**
   * Get account info from DezorIPTV API
   */
  static async getAccountInfo(credentials: DezorCredentials): Promise<{
    username: string;
    status: string;
    expiresAt?: Date;
    maxConnections?: number;
  } | null> {
    try {
      const { username, password, server } = credentials;
      const baseServer = server || this.DEFAULT_SERVER;
      
      // DezorIPTV account info endpoint
      const url = `${baseServer}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      return {
        username: data.user_info?.username || username,
        status: data.user_info?.status || 'unknown',
        expiresAt: data.user_info?.exp_date 
          ? new Date(parseInt(data.user_info.exp_date) * 1000) 
          : undefined,
        maxConnections: data.user_info?.max_connections || 1,
      };
    } catch (error) {
      console.error('Error fetching DezorIPTV account info:', error);
      return null;
    }
  }

  /**
   * Get available categories from DezorIPTV
   */
  static async getCategories(credentials: DezorCredentials): Promise<string[]> {
    try {
      const { username, password, server } = credentials;
      const baseServer = server || this.DEFAULT_SERVER;
      
      const url = `${baseServer}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_categories`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const categories = await response.json();
      return categories.map((cat: any) => cat.category_name);
    } catch (error) {
      console.error('Error fetching DezorIPTV categories:', error);
      return [];
    }
  }

  /**
   * Check if DezorIPTV supports catch-up
   */
  static supportsCatchUp(): boolean {
    // DezorIPTV typically supports catch-up/timeshift
    return true;
  }

  /**
   * Check if DezorIPTV supports recording
   */
  static supportsRecording(): boolean {
    // DezorIPTV supports recording via timeshift URLs
    return true;
  }

  /**
   * Get catch-up days available
   */
  static getCatchUpDays(): number {
    // DezorIPTV typically offers 7 days catch-up
    return 7;
  }
}
