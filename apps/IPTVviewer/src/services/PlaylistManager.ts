import { Playlist } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppSettings {
  epgUrl: string;
}

export class PlaylistManager {
  private static readonly PLAYLISTS_KEY = '@playlists';
  private static readonly FAVORITES_KEY = '@favorites';
  private static readonly SETTINGS_KEY = '@settings';

  static async savePlaylists(playlists: Playlist[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.PLAYLISTS_KEY, JSON.stringify(playlists));
    } catch (error) {
      console.error('Error saving playlists:', error);
      throw error;
    }
  }

  static async loadPlaylists(): Promise<Playlist[]> {
    try {
      const data = await AsyncStorage.getItem(this.PLAYLISTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading playlists:', error);
      return [];
    }
  }

  static async saveFavorites(favorites: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.FAVORITES_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error('Error saving favorites:', error);
      throw error;
    }
  }

  static async loadFavorites(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(this.FAVORITES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading favorites:', error);
      return [];
    }
  }

  static async loadSettings(): Promise<AppSettings> {
    try {
      const data = await AsyncStorage.getItem(this.SETTINGS_KEY);
      if (!data) return { epgUrl: '' };
      const parsed = JSON.parse(data);
      return { epgUrl: parsed.epgUrl || '' };
    } catch (error) {
      console.error('Error loading settings:', error);
      return { epgUrl: '' };
    }
  }

  static async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }
}
