// Anonymous preference persistence using localStorage and cookies
// No login required - stores preferences locally for personalization

import * as React from 'react';

export interface UserPreferences {
  // Travel preferences
  budget: 'low' | 'medium' | 'high';
  travelStyle: 'relax' | 'adventure' | 'family' | 'nightlife' | 'culture' | 'eco-tourism';
  weatherPreference: 'warm' | 'cold' | 'moderate';
  tripDuration: 'short' | 'medium' | 'long'; // 3-5 days, 1-2 weeks, 2+ weeks
  
  // Search behavior
  lastSearchDate: string;
  searchedDestinations: string[];
  viewedDestinations: string[];
  comparedDestinations: string[];
  
  // Activity preferences
  preferredActivities: string[];
  avoidedActivities: string[];
  
  // UI preferences
  favoriteDestinations: string[];
  defaultSortBy: 'recommended' | 'price-low' | 'price-high' | 'rating' | 'seasonality';
  
  // Personalization settings
  enablePersonalization: boolean;
  lastVisitDate: string;
  visitCount: number;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  budget: 'medium',
  travelStyle: 'relax',
  weatherPreference: 'moderate',
  tripDuration: 'medium',
  lastSearchDate: '',
  searchedDestinations: [],
  viewedDestinations: [],
  comparedDestinations: [],
  preferredActivities: [],
  avoidedActivities: [],
  favoriteDestinations: [],
  defaultSortBy: 'recommended',
  enablePersonalization: true,
  lastVisitDate: '',
  visitCount: 0,
};

const PREFERENCES_KEY = 'wtv_preferences';
const PREFERENCES_VERSION = '1.0';

// Client-side preference management
export class PreferenceManager {
  private static instance: PreferenceManager;
  private preferences: UserPreferences;
  private listeners: Array<(prefs: UserPreferences) => void> = [];

  private constructor() {
    this.preferences = this.loadPreferences();
    this.trackVisit();
  }

  static getInstance(): PreferenceManager {
    if (!PreferenceManager.instance) {
      PreferenceManager.instance = new PreferenceManager();
    }
    return PreferenceManager.instance;
  }

  private loadPreferences(): UserPreferences {
    if (typeof window === 'undefined') {
      return DEFAULT_PREFERENCES;
    }

    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (!stored) return DEFAULT_PREFERENCES;

      const parsed = JSON.parse(stored);
      
      // Version migration - add new fields with defaults
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        version: PREFERENCES_VERSION,
      };
    } catch (error) {
      console.warn('Failed to load preferences:', error);
      return DEFAULT_PREFERENCES;
    }
  }

  private savePreferences(): void {
    if (typeof window === 'undefined') return;

    try {
      const toSave = {
        ...this.preferences,
        version: PREFERENCES_VERSION,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.warn('Failed to save preferences:', error);
    }
  }

  private trackVisit(): void {
    if (typeof window === 'undefined') return;

    const now = new Date().toISOString();
    this.preferences.lastVisitDate = now;
    this.preferences.visitCount += 1;
    this.savePreferences();
  }

  // Public API
  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  updatePreferences(updates: Partial<UserPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    this.savePreferences();
    this.notifyListeners();
  }

  // Travel preference methods
  setBudget(budget: UserPreferences['budget']): void {
    this.updatePreferences({ budget });
  }

  setTravelStyle(style: UserPreferences['travelStyle']): void {
    this.updatePreferences({ travelStyle: style });
  }

  setWeatherPreference(weather: UserPreferences['weatherPreference']): void {
    this.updatePreferences({ weatherPreference: weather });
  }

  setTripDuration(duration: UserPreferences['tripDuration']): void {
    this.updatePreferences({ tripDuration: duration });
  }

  // Search tracking methods
  trackSearch(destinationId: string): void {
    const searched = new Set(this.preferences.searchedDestinations);
    searched.add(destinationId);
    this.updatePreferences({
      searchedDestinations: Array.from(searched),
      lastSearchDate: new Date().toISOString(),
    });
  }

  trackView(destinationId: string): void {
    const viewed = new Set(this.preferences.viewedDestinations);
    viewed.add(destinationId);
    this.updatePreferences({ viewedDestinations: Array.from(viewed) });
  }

  trackComparison(destinationIds: string[]): void {
    this.updatePreferences({ comparedDestinations: destinationIds });
  }

  // Activity preference methods
  addPreferredActivity(activity: string): void {
    const preferred = new Set(this.preferences.preferredActivities);
    preferred.add(activity);
    this.updatePreferences({ preferredActivities: Array.from(preferred) });
  }

  removePreferredActivity(activity: string): void {
    const preferred = new Set(this.preferences.preferredActivities);
    preferred.delete(activity);
    this.updatePreferences({ preferredActivities: Array.from(preferred) });
  }

  addAvoidedActivity(activity: string): void {
    const avoided = new Set(this.preferences.avoidedActivities);
    avoided.add(activity);
    this.updatePreferences({ avoidedActivities: Array.from(avoided) });
  }

  // Favorites management
  toggleFavorite(destinationId: string): void {
    const favorites = new Set(this.preferences.favoriteDestinations);
    if (favorites.has(destinationId)) {
      favorites.delete(destinationId);
    } else {
      favorites.add(destinationId);
    }
    this.updatePreferences({ favoriteDestinations: Array.from(favorites) });
  }

  isFavorite(destinationId: string): boolean {
    return this.preferences.favoriteDestinations.includes(destinationId);
  }

  // Personalization settings
  enablePersonalization(enabled: boolean): void {
    this.updatePreferences({ enablePersonalization: enabled });
  }

  setDefaultSort(sort: UserPreferences['defaultSortBy']): void {
    this.updatePreferences({ defaultSortBy: sort });
  }

  // Analytics and insights
  getSearchInsights(): {
    mostSearched: string[];
    recentlyViewed: string[];
    favoriteTypes: string[];
    budgetPreference: string;
    travelStylePreference: string;
  } {
    const { searchedDestinations, viewedDestinations, preferredActivities, budget, travelStyle } = this.preferences;
    
    return {
      mostSearched: searchedDestinations.slice(-5).reverse(),
      recentlyViewed: viewedDestinations.slice(-3).reverse(),
      favoriteTypes: preferredActivities,
      budgetPreference: budget,
      travelStylePreference: travelStyle,
    };
  }

  // Event listeners
  subscribe(listener: (prefs: UserPreferences) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.preferences));
  }

  // Reset preferences
  reset(): void {
    this.preferences = DEFAULT_PREFERENCES;
    this.savePreferences();
    this.notifyListeners();
  }

  // Export/Import for backup
  export(): string {
    return JSON.stringify(this.preferences);
  }

  import(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      this.preferences = { ...DEFAULT_PREFERENCES, ...parsed };
      this.savePreferences();
      this.notifyListeners();
      return true;
    } catch {
      return false;
    }
  }
}

// React hook for easy usage
export function usePreferences() {
  const [preferences, setPreferences] = React.useState<UserPreferences>(() => 
    PreferenceManager.getInstance().getPreferences()
  );

  React.useEffect(() => {
    const manager = PreferenceManager.getInstance();
    return manager.subscribe((prefs) => setPreferences(prefs));
  }, []);

  const updatePreferences = React.useCallback((updates: Partial<UserPreferences>) => {
    PreferenceManager.getInstance().updatePreferences(updates);
  }, []);

  return {
    preferences,
    updatePreferences,
    // Convenience methods
    setBudget: (budget: UserPreferences['budget']) => 
      PreferenceManager.getInstance().setBudget(budget),
    setTravelStyle: (style: UserPreferences['travelStyle']) => 
      PreferenceManager.getInstance().setTravelStyle(style),
    setWeatherPreference: (weather: UserPreferences['weatherPreference']) => 
      PreferenceManager.getInstance().setWeatherPreference(weather),
    trackSearch: (destinationId: string) => 
      PreferenceManager.getInstance().trackSearch(destinationId),
    trackView: (destinationId: string) => 
      PreferenceManager.getInstance().trackView(destinationId),
    toggleFavorite: (destinationId: string) => 
      PreferenceManager.getInstance().toggleFavorite(destinationId),
    isFavorite: (destinationId: string) => 
      PreferenceManager.getInstance().isFavorite(destinationId),
    getInsights: () => PreferenceManager.getInstance().getSearchInsights(),
    reset: () => PreferenceManager.getInstance().reset(),
  };
}

// Server-side preference utilities (for SSR)
export function getPreferenceFromCookie(cookieHeader: string): Partial<UserPreferences> {
  try {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {} as Record<string, string>);

    const prefCookie = cookies[PREFERENCES_KEY];
    if (!prefCookie) return {};

    return JSON.parse(prefCookie);
  } catch {
    return {};
  }
}

export function setPreferenceCookie(prefs: Partial<UserPreferences>): string {
  const value = encodeURIComponent(JSON.stringify(prefs));
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1); // 1 year expiry

  return `${PREFERENCES_KEY}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}
