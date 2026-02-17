import { Platform } from 'react-native';

// Analytics and Crash Reporting Service for Switchback TV
// Configure with your analytics provider (Firebase, Sentry, Crashlytics, etc.)

export interface AnalyticsEvent {
  name: string;
  params?: Record<string, any>;
  timestamp?: number;
}

export interface CrashReport {
  message: string;
  stack?: string;
  userId?: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

class AnalyticsService {
  private initialized: boolean = false;
  private userId: string | null = null;
  private events: AnalyticsEvent[] = [];
  private crashes: CrashReport[] = [];

  // Initialize analytics (call in App.tsx useEffect)
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // TODO: Initialize your analytics provider here
      // Example for Firebase Analytics:
      // if (!firebase.apps.length) {
      //   await firebase.initializeApp(firebaseConfig);
      // }

      // Example for Sentry:
      // await Sentry.init({
      //   dsn: 'YOUR_SENTRY_DSN',
      //   environment: __DEV__ ? 'development' : 'production',
      // });

      this.initialized = true;
      console.log('[Analytics] Initialized for Switchback TV');
    } catch (error) {
      console.error('[Analytics] Failed to initialize:', error);
    }
  }

  // Set user ID for tracking
  setUserId(userId: string): void {
    this.userId = userId;
    // TODO: Set user ID in analytics provider
    // analytics.setUserId(userId);
  }

  // Track custom events
  trackEvent(name: string, params?: Record<string, any>): void {
    const event: AnalyticsEvent = {
      name,
      params,
      timestamp: Date.now(),
    };

    this.events.push(event);

    // TODO: Send to analytics provider
    // analytics.logEvent(name, params);
    console.log('[Analytics] Event tracked:', name, params);
  }

  // Track screen views
  trackScreenView(screenName: string): void {
    this.trackEvent('screen_view', {
      screen_name: screenName,
      platform: Platform.OS,
      app_version: '1.0.0',
    });
  }

  // Track channel changes
  trackChannelChange(channelId: string, channelName: string, fromChannelId?: string): void {
    this.trackEvent('channel_change', {
      channel_id: channelId,
      channel_name: channelName,
      from_channel_id: fromChannelId,
      platform: Platform.OS,
    });
  }

  // Track playlist operations
  trackPlaylistOperation(operation: 'add' | 'remove' | 'refresh', playlistId: string): void {
    this.trackEvent('playlist_operation', {
      operation,
      playlist_id: playlistId,
    });
  }

  // Track feature usage
  trackFeatureUsed(featureName: string): void {
    this.trackEvent('feature_used', {
      feature_name: featureName,
    });
  }

  // Track errors
  trackError(message: string, stack?: string, metadata?: Record<string, any>): void {
    const crash: CrashReport = {
      message,
      stack,
      userId: this.userId || undefined,
      metadata,
      timestamp: Date.now(),
    };

    this.crashes.push(crash);

    // TODO: Send to crash reporting
    // Sentry.captureException(new Error(message), { extra: metadata });
    console.error('[Analytics] Error tracked:', message);
  }

  // Track JS errors
  trackJSError(error: Error, metadata?: Record<string, any>): void {
    this.trackError(error.message, error.stack, {
      ...metadata,
      error_type: 'javascript',
    });
  }

  // Track native errors
  trackNativeError(errorCode: string, message: string, metadata?: Record<string, any>): void {
    this.trackError(`Native Error ${errorCode}: ${message}`, undefined, {
      ...metadata,
      error_type: 'native',
      error_code: errorCode,
    });
  }

  // Get stored events (for debugging)
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  // Get stored crashes (for debugging)
  getCrashes(): CrashReport[] {
    return [...this.crashes];
  }

  // Clear stored data (for testing/privacy)
  clearData(): void {
    this.events = [];
    this.crashes = [];
  }

  // Flush events to server (call on app background)
  async flush(): Promise<void> {
    // TODO: Flush pending events to server
    console.log('[Analytics] Events flushed');
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
