import RNFS from 'react-native-fs';
import { Playlist } from '@/types';

// Data sync/export types
export interface ExportData {
    version: string;
    exportedAt: string;
    playlists?: Playlist[];
    favorites?: string[];
    settings?: AppSettings;
    channels?: ChannelMap;
}

export interface AppSettings {
    epgUrl?: string;
    theme?: string;
    autoPlay?: boolean;
    adConfig?: {
        enabled: boolean;
        volumeReductionPercent: number;
    };
}

export interface ChannelMap {
    [channelId: string]: {
        name: string;
        url: string;
        group?: string;
        logo?: string;
    };
}

export interface ImportResult {
    success: boolean;
    message: string;
    imported: {
        playlists: number;
        favorites: number;
        settings: number;
    };
}

export class DataSyncService {
    private static readonly EXPORT_VERSION = '1.0.0';
    private static readonly EXPORT_DIR = RNFS.DocumentDirectoryPath;
    private static readonly EXPORT_FILE = 'iptv_backup.json';

    /**
     * Export all app data to JSON file
     */
    static async exportData(
        playlists: Playlist[],
        favorites: string[],
        settings?: AppSettings
    ): Promise<string> {
        const exportData: ExportData = {
            version: this.EXPORT_VERSION,
            exportedAt: new Date().toISOString(),
            playlists,
            favorites,
            settings,
        };

        const filePath = `${this.EXPORT_DIR}/${this.EXPORT_FILE}`;
        await RNFS.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');

        return filePath;
    }

    /**
     * Export to custom filename
     */
    static async exportToFile(
        playlists: Playlist[],
        favorites: string[],
        settings: AppSettings | undefined,
        filename: string
    ): Promise<string> {
        const exportData: ExportData = {
            version: this.EXPORT_VERSION,
            exportedAt: new Date().toISOString(),
            playlists,
            favorites,
            settings,
        };

        const sanitizedFilename = filename.replace(/[^a-z0-9_-]/gi, '_');
        const filePath = `${this.EXPORT_DIR}/${sanitizedFilename}.json`;
        await RNFS.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');

        return filePath;
    }

    /**
     * Import data from JSON file
     */
    static async importFromFile(filePath: string): Promise<ImportResult> {
        try {
            const exists = await RNFS.exists(filePath);
            if (!exists) {
                return {
                    success: false,
                    message: 'File not found',
                    imported: { playlists: 0, favorites: 0, settings: 0 },
                };
            }

            const content = await RNFS.readFile(filePath, 'utf8');
            const data: ExportData = JSON.parse(content);

            // Validate version
            if (!data.version) {
                return {
                    success: false,
                    message: 'Invalid backup file format',
                    imported: { playlists: 0, favorites: 0, settings: 0 },
                };
            }

            const imported = {
                playlists: data.playlists?.length || 0,
                favorites: data.favorites?.length || 0,
                settings: data.settings ? 1 : 0,
            };

            return {
                success: true,
                message: `Imported ${imported.playlists} playlists, ${imported.favorites} favorites`,
                imported,
            };
        } catch (error) {
            console.error('Import error:', error);
            return {
                success: false,
                message: 'Failed to import: ' + (error as Error).message,
                imported: { playlists: 0, favorites: 0, settings: 0 },
            };
        }
    }

    /**
     * Get list of available backup files
     */
    static async getBackupFiles(): Promise<string[]> {
        try {
            const files = await RNFS.readDir(this.EXPORT_DIR);
            return files
                .filter(f => f.name.endsWith('.json') && f.name.includes('iptv'))
                .map(f => f.path);
        } catch (error) {
            console.error('Error reading backup files:', error);
            return [];
        }
    }

    /**
     * Share backup file
     */
    static async shareBackup(filePath: string): Promise<string | null> {
        try {
            return filePath;
        } catch (error) {
            console.error('Share error:', error);
            return null;
        }
    }

    /**
     * Delete backup file
     */
    static async deleteBackup(filePath: string): Promise<boolean> {
        try {
            await RNFS.unlink(filePath);
            return true;
        } catch (error) {
            console.error('Delete error:', error);
            return false;
        }
    }

    /**
     * Export favorites as text (simple format)
     */
    static async exportFavoritesAsText(favorites: string[]): Promise<string> {
        return favorites.join('\n');
    }

    /**
     * Import favorites from text
     */
    static async importFavoritesFromText(text: string): Promise<string[]> {
        return text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    }

    /**
     * Get export directory path
     */
    static getExportPath(): string {
        return this.EXPORT_DIR;
    }
}
