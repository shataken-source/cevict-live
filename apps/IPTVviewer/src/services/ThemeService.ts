export type ThemeName = 'dark' | 'light' | 'gaming' | 'sports' | 'cinema' | 'retro';

export interface Theme {
  name: ThemeName;
  displayName: string;
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    accent: string;
    accentDark: string;
    error: string;
    success: string;
    warning: string;
  };
  layout: {
    gridColumns: 2 | 3 | 4;
    cardRadius: number;
    spacing: number;
  };
}

export class ThemeService {
  static readonly THEMES: Record<ThemeName, Theme> = {
    dark: {
      name: 'dark',
      displayName: 'Dark Mode',
      colors: {
        background: '#1a1a1a',
        surface: '#2a2a2a',
        text: '#ffffff',
        textSecondary: '#999999',
        accent: '#007AFF',
        accentDark: '#0056B3',
        error: '#FF3B30',
        success: '#34C759',
        warning: '#FF9500',
      },
      layout: {
        gridColumns: 3,
        cardRadius: 8,
        spacing: 10,
      },
    },
    
    light: {
      name: 'light',
      displayName: 'Light Mode',
      colors: {
        background: '#ffffff',
        surface: '#f5f5f5',
        text: '#000000',
        textSecondary: '#666666',
        accent: '#007AFF',
        accentDark: '#0056B3',
        error: '#FF3B30',
        success: '#34C759',
        warning: '#FF9500',
      },
      layout: {
        gridColumns: 3,
        cardRadius: 8,
        spacing: 10,
      },
    },
    
    gaming: {
      name: 'gaming',
      displayName: 'Gaming (Matrix)',
      colors: {
        background: '#0d0d0d',
        surface: '#1a1a1a',
        text: '#00ff00',
        textSecondary: '#00aa00',
        accent: '#ff00ff',
        accentDark: '#cc00cc',
        error: '#ff0000',
        success: '#00ff00',
        warning: '#ffff00',
      },
      layout: {
        gridColumns: 4,
        cardRadius: 4,
        spacing: 5,
      },
    },
    
    sports: {
      name: 'sports',
      displayName: 'Sports Stadium',
      colors: {
        background: '#1a4d2e',
        surface: '#2e7d4e',
        text: '#ffffff',
        textSecondary: '#cccccc',
        accent: '#ffcc00',
        accentDark: '#cc9900',
        error: '#ff0000',
        success: '#00ff00',
        warning: '#ffaa00',
      },
      layout: {
        gridColumns: 3,
        cardRadius: 12,
        spacing: 15,
      },
    },
    
    cinema: {
      name: 'cinema',
      displayName: 'Cinema',
      colors: {
        background: '#000000',
        surface: '#1a1a1a',
        text: '#FFD700',
        textSecondary: '#B8860B',
        accent: '#DC143C',
        accentDark: '#A00028',
        error: '#FF0000',
        success: '#FFD700',
        warning: '#FFA500',
      },
      layout: {
        gridColumns: 2,
        cardRadius: 16,
        spacing: 20,
      },
    },
    
    retro: {
      name: 'retro',
      displayName: 'Retro (80s)',
      colors: {
        background: '#1a1a2e',
        surface: '#16213e',
        text: '#ff00ff',
        textSecondary: '#00ffff',
        accent: '#ff00ff',
        accentDark: '#cc00cc',
        error: '#ff0066',
        success: '#00ff99',
        warning: '#ffff00',
      },
      layout: {
        gridColumns: 3,
        cardRadius: 0,
        spacing: 8,
      },
    },
  };
  
  static getTheme(name: ThemeName): Theme {
    return this.THEMES[name];
  }
  
  static getAllThemes(): Theme[] {
    return Object.values(this.THEMES);
  }
}
