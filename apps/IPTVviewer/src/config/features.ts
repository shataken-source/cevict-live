// Feature Flag System for Switchback TV
// Allows enabling/disabling features at runtime

export interface FeatureConfig {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'advanced' | 'experimental';
  enabled: boolean;
  requiresPermissions?: string[];
  dependencies?: string[]; // Other feature IDs this depends on
}

export const FEATURES: Record<string, FeatureConfig> = {
  // ===== BASIC FEATURES (Always Available) =====
  PLAYLIST_LOADING: {
    id: 'PLAYLIST_LOADING',
    name: 'M3U Playlist Loading',
    description: 'Load IPTV playlists from URLs',
    category: 'basic',
    enabled: true,
  },
  
  CHANNEL_PLAYBACK: {
    id: 'CHANNEL_PLAYBACK',
    name: 'Live Stream Playback',
    description: 'Watch live TV channels',
    category: 'basic',
    enabled: true,
  },
  
  FAVORITES: {
    id: 'FAVORITES',
    name: 'Favorite Channels',
    description: 'Mark and organize favorite channels',
    category: 'basic',
    enabled: true,
  },
  
  HISTORY: {
    id: 'HISTORY',
    name: 'Watch History',
    description: 'Track recently watched channels',
    category: 'basic',
    enabled: true,
  },
  
  EPG_BASIC: {
    id: 'EPG_BASIC',
    name: 'Electronic Program Guide',
    description: 'Show current and upcoming programs',
    category: 'basic',
    enabled: true,
  },
  
  CONFIG_IMPORT: {
    id: 'CONFIG_IMPORT',
    name: 'Config File Import',
    description: 'Import provider configuration files',
    category: 'basic',
    enabled: true,
  },

  // ===== ADVANCED FEATURES (User Can Toggle) =====
  QR_SETUP: {
    id: 'QR_SETUP',
    name: 'QR Code Setup',
    description: 'Scan QR codes for instant configuration',
    category: 'advanced',
    enabled: true,
    requiresPermissions: ['CAMERA'],
  },
  
  AD_DETECTION: {
    id: 'AD_DETECTION',
    name: 'Ad Detection & Muting',
    description: 'Automatically detect and mute commercials',
    category: 'advanced',
    enabled: false,
  },
  
  CHROMECAST: {
    id: 'CHROMECAST',
    name: 'Chromecast Support',
    description: 'Cast streams to other devices',
    category: 'advanced',
    enabled: false,
  },
  
  DVR_RECORDING: {
    id: 'DVR_RECORDING',
    name: 'DVR Recording',
    description: 'Record live streams for later viewing',
    category: 'advanced',
    enabled: false,
    requiresPermissions: ['WRITE_EXTERNAL_STORAGE'],
  },
  
  TIME_SHIFT: {
    id: 'TIME_SHIFT',
    name: 'Time Shifting',
    description: 'Pause and rewind live TV',
    category: 'advanced',
    enabled: false,
  },
  
  SLEEP_TIMER: {
    id: 'SLEEP_TIMER',
    name: 'Sleep Timer',
    description: 'Auto-stop playback after set time',
    category: 'advanced',
    enabled: true,
  },
  
  PARENTAL_CONTROLS: {
    id: 'PARENTAL_CONTROLS',
    name: 'Parental Controls',
    description: 'PIN-protect certain channels',
    category: 'advanced',
    enabled: false,
  },
  
  MULTI_AUDIO: {
    id: 'MULTI_AUDIO',
    name: 'Multi-Audio Tracks',
    description: 'Switch between audio languages',
    category: 'advanced',
    enabled: true,
  },
  
  SUBTITLES: {
    id: 'SUBTITLES',
    name: 'Subtitle Support',
    description: 'Display closed captions',
    category: 'advanced',
    enabled: true,
  },

  // ===== EXPERIMENTAL FEATURES (Beta/Testing) =====
  VOICE_CONTROL: {
    id: 'VOICE_CONTROL',
    name: 'Voice Commands',
    description: 'Control app with voice',
    category: 'experimental',
    enabled: false,
    requiresPermissions: ['RECORD_AUDIO'],
  },
  
  VPN_INTEGRATION: {
    id: 'VPN_INTEGRATION',
    name: 'VPN Integration',
    description: 'Built-in VPN support',
    category: 'experimental',
    enabled: false,
  },
  
  WEATHER_OVERLAY: {
    id: 'WEATHER_OVERLAY',
    name: 'Weather Overlay',
    description: 'Show weather info on screen',
    category: 'experimental',
    enabled: false,
  },
  
  NEWS_TICKER: {
    id: 'NEWS_TICKER',
    name: 'News Ticker',
    description: 'Scrolling news headlines',
    category: 'experimental',
    enabled: false,
  },
  
  GESTURE_CONTROLS: {
    id: 'GESTURE_CONTROLS',
    name: 'Gesture Navigation',
    description: 'Swipe gestures for channel surfing',
    category: 'experimental',
    enabled: false,
  },
  
  AI_RECOMMENDATIONS: {
    id: 'AI_RECOMMENDATIONS',
    name: 'AI Recommendations',
    description: 'Smart channel suggestions',
    category: 'experimental',
    enabled: false,
  },
  
  PICTURE_IN_PICTURE: {
    id: 'PICTURE_IN_PICTURE',
    name: 'Picture-in-Picture',
    description: 'Watch while using other apps',
    category: 'experimental',
    enabled: false,
  },
  
  MULTI_VIEW: {
    id: 'MULTI_VIEW',
    name: 'Multi-View Mode',
    description: 'Watch multiple channels simultaneously',
    category: 'experimental',
    enabled: false,
  },
};

// Feature Flag Manager
export class FeatureManager {
  private static enabledFeatures: Set<string> = new Set(
    Object.values(FEATURES)
      .filter(f => f.enabled)
      .map(f => f.id)
  );

  static isEnabled(featureId: string): boolean {
    return this.enabledFeatures.has(featureId);
  }

  static enable(featureId: string): void {
    const feature = FEATURES[featureId];
    if (!feature) return;

    // Check dependencies
    if (feature.dependencies) {
      for (const depId of feature.dependencies) {
        if (!this.isEnabled(depId)) {
          throw new Error(`Feature ${featureId} requires ${depId} to be enabled first`);
        }
      }
    }

    this.enabledFeatures.add(featureId);
  }

  static disable(featureId: string): void {
    const feature = FEATURES[featureId];
    if (!feature || feature.category === 'basic') {
      // Can't disable basic features
      return;
    }

    // Check if other features depend on this
    const dependents = Object.values(FEATURES).filter(f =>
      f.dependencies?.includes(featureId) && this.isEnabled(f.id)
    );

    if (dependents.length > 0) {
      throw new Error(
        `Cannot disable ${featureId}. The following features depend on it: ${dependents.map(f => f.name).join(', ')}`
      );
    }

    this.enabledFeatures.delete(featureId);
  }

  static getEnabledFeatures(): FeatureConfig[] {
    return Array.from(this.enabledFeatures)
      .map(id => FEATURES[id])
      .filter(Boolean);
  }

  static getFeaturesByCategory(category: 'basic' | 'advanced' | 'experimental'): FeatureConfig[] {
    return Object.values(FEATURES).filter(f => f.category === category);
  }

  static loadFromStorage(savedFeatures: string[]): void {
    // Reset to defaults
    this.enabledFeatures.clear();
    
    // Load saved state
    for (const featureId of savedFeatures) {
      if (FEATURES[featureId]) {
        this.enabledFeatures.add(featureId);
      }
    }
    
    // Ensure basic features are always enabled
    this.getFeaturesByCategory('basic').forEach(f => {
      this.enabledFeatures.add(f.id);
    });
  }

  static saveToStorage(): string[] {
    return Array.from(this.enabledFeatures);
  }
}

// Preset configurations
export const FEATURE_PRESETS = {
  MINIMAL: {
    name: 'Minimal',
    description: 'Basic playback only',
    features: ['PLAYLIST_LOADING', 'CHANNEL_PLAYBACK', 'FAVORITES', 'HISTORY'],
  },
  
  STANDARD: {
    name: 'Standard',
    description: 'Recommended for most users',
    features: [
      'PLAYLIST_LOADING',
      'CHANNEL_PLAYBACK',
      'FAVORITES',
      'HISTORY',
      'EPG_BASIC',
      'CONFIG_IMPORT',
      'QR_SETUP',
      'SLEEP_TIMER',
      'MULTI_AUDIO',
      'SUBTITLES',
    ],
  },
  
  POWER_USER: {
    name: 'Power User',
    description: 'All stable features enabled',
    features: Object.values(FEATURES)
      .filter(f => f.category !== 'experimental')
      .map(f => f.id),
  },
  
  EVERYTHING: {
    name: 'Everything',
    description: 'All features including experimental',
    features: Object.keys(FEATURES),
  },
};
