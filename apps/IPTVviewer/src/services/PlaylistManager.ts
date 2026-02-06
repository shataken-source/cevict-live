import RNFS from 'react-native-fs';
import {Playlist} from '@/types';

export class PlaylistManager {
  private static readonly PLAYLISTS_FILE = `${RNFS.DocumentDirectoryPath}/playlists.json`;
  private static readonly FAVORITES_FILE = `${RNFS.DocumentDirectoryPath}/favorites.json`;
  
  static async savePlaylists(playlists: Playlist[]): Promise<void> {
    try {
      await RNFS.writeFile(this.PLAYLISTS_FILE, JSON.stringify(playlists), 'utf8');
    } catch (error) {
      console.error('Error saving playlists:', error);
      throw error;
    }
  }
  
  static async loadPlaylists(): Promise<Playlist[]> {
    try {
      const exists = await RNFS.exists(this.PLAYLISTS_FILE);
      if (!exists) return [];
      
      const content = await RNFS.readFile(this.PLAYLISTS_FILE, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error loading playlists:', error);
      return [];
    }
  }
  
  static async saveFavorites(favorites: string[]): Promise<void> {
    try {
      await RNFS.writeFile(this.FAVORITES_FILE, JSON.stringify(favorites), 'utf8');
    } catch (error) {
      console.error('Error saving favorites:', error);
      throw error;
    }
  }
  
  static async loadFavorites(): Promise<string[]> {
    try {
      const exists = await RNFS.exists(this.FAVORITES_FILE);
      if (!exists) return [];
      
      const content = await RNFS.readFile(this.FAVORITES_FILE, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error loading favorites:', error);
      return [];
    }
  }
}
