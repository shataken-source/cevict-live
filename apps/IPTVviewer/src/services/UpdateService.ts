// Auto-Update Service for Switchback TV
// Checks for new versions and notifies users

export interface VersionInfo {
  version: string;
  versionCode: number;
  downloadUrl: string;
  releaseNotes: string;
  releaseDate: string;
  minAndroidVersion: number;
  fileSize: number;
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: VersionInfo;
  error?: string;
}

export class UpdateService {
  private static UPDATE_CHECK_URL = 'https://switchback.tv/api/version.json';
  private static CURRENT_VERSION: string = require('../../app.json').expo.version;
  private static CURRENT_VERSION_CODE: number = require('../../app.json').expo.android?.versionCode ?? 1;

  /**
   * Check for available updates
   */
  static async checkForUpdates(): Promise<UpdateCheckResult> {
    try {
      const response = await fetch(this.UPDATE_CHECK_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-cache',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const latestVersion: VersionInfo = await response.json();

      // Compare version codes (more reliable than string comparison)
      const updateAvailable = latestVersion.versionCode > this.CURRENT_VERSION_CODE;

      return {
        updateAvailable,
        currentVersion: this.CURRENT_VERSION,
        latestVersion: updateAvailable ? latestVersion : undefined,
      };
    } catch (error) {
      return {
        updateAvailable: false,
        currentVersion: this.CURRENT_VERSION,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get current app version
   */
  static getCurrentVersion(): string {
    return this.CURRENT_VERSION;
  }

  /**
   * Get current version code
   */
  static getCurrentVersionCode(): number {
    return this.CURRENT_VERSION_CODE;
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Compare version strings (semantic versioning)
   */
  static compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0;
      const num2 = parts2[i] || 0;

      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }

    return 0;
  }

  /**
   * Download APK update
   * Note: On Android TV, this will open the download URL in the browser
   * User will need to manually install the APK
   */
  static async downloadUpdate(downloadUrl: string): Promise<void> {
    // On React Native, we can use Linking to open the download URL
    const { Linking } = await import('react-native');

    const canOpen = await Linking.canOpenURL(downloadUrl);
    if (canOpen) {
      await Linking.openURL(downloadUrl);
    } else {
      throw new Error('Cannot open download URL');
    }
  }

  /**
   * Get last update check timestamp from storage
   */
  static async getLastUpdateCheck(): Promise<number | null> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const timestamp = await AsyncStorage.getItem('last_update_check');
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch {
      return null;
    }
  }

  /**
   * Save last update check timestamp
   */
  static async saveLastUpdateCheck(): Promise<void> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem('last_update_check', Date.now().toString());
    } catch {
      // Ignore errors
    }
  }

  /**
   * Check if auto-update check is enabled
   */
  static async isAutoUpdateEnabled(): Promise<boolean> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const enabled = await AsyncStorage.getItem('auto_update_enabled');
      return enabled !== 'false'; // Default to true
    } catch {
      return true;
    }
  }

  /**
   * Set auto-update check preference
   */
  static async setAutoUpdateEnabled(enabled: boolean): Promise<void> {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem('auto_update_enabled', enabled.toString());
    } catch {
      // Ignore errors
    }
  }

  /**
   * Should check for updates (based on last check time)
   * Returns true if last check was more than 24 hours ago
   */
  static async shouldCheckForUpdates(): Promise<boolean> {
    const autoUpdateEnabled = await this.isAutoUpdateEnabled();
    if (!autoUpdateEnabled) return false;

    const lastCheck = await this.getLastUpdateCheck();
    if (!lastCheck) return true;

    const hoursSinceLastCheck = (Date.now() - lastCheck) / (1000 * 60 * 60);
    return hoursSinceLastCheck >= 24;
  }
}
