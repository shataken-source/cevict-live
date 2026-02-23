// Bluetooth Remote Control Service for Switchback TV
// Handles Bluetooth remote/keyboard input for Android TV

import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

export interface BluetoothKeyEvent {
  eventType: 'up' | 'down' | 'left' | 'right' | 'select' | 'back' | 'menu' | 'playPause' | 'fastForward' | 'rewind';
  keyCode?: number;
}

export type BluetoothKeyHandler = (event: BluetoothKeyEvent) => void;

export class BluetoothService {
  private static keyHandlers: Map<string, BluetoothKeyHandler> = new Map();
  private static backHandlerSubscription: any = null;

  /**
   * Initialize Bluetooth/TV remote event handling
   * Note: For Android TV, remote control events are handled via hardware back button
   * and focus navigation. Full TV remote support requires react-native-tvos package.
   */
  static initialize(): void {
    if (this.backHandlerSubscription) {
      return; // Already initialized
    }

    // Handle hardware back button (works on Android TV remotes)
    this.backHandlerSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const event: BluetoothKeyEvent = {
        eventType: 'back',
      };

      // Notify all registered handlers
      let handled = false;
      this.keyHandlers.forEach(handler => {
        handler(event);
        handled = true;
      });

      return handled; // Return true to prevent default back behavior
    });
  }

  /**
   * Clean up event handlers
   */
  static cleanup(): void {
    if (this.backHandlerSubscription) {
      this.backHandlerSubscription.remove();
      this.backHandlerSubscription = null;
    }
    this.keyHandlers.clear();
  }

  /**
   * Register a key event handler
   */
  static registerHandler(id: string, handler: BluetoothKeyHandler): void {
    this.keyHandlers.set(id, handler);
  }

  /**
   * Unregister a key event handler
   */
  static unregisterHandler(id: string): void {
    this.keyHandlers.delete(id);
  }

  /**
   * Map TV event types to our standard event types
   */
  private static mapEventType(eventType: string): BluetoothKeyEvent['eventType'] {
    switch (eventType) {
      case 'up':
        return 'up';
      case 'down':
        return 'down';
      case 'left':
        return 'left';
      case 'right':
        return 'right';
      case 'select':
      case 'enter':
        return 'select';
      case 'back':
        return 'back';
      case 'menu':
        return 'menu';
      case 'playPause':
        return 'playPause';
      case 'fastForward':
        return 'fastForward';
      case 'rewind':
        return 'rewind';
      default:
        return 'select';
    }
  }

  /**
   * Check if running on Android TV
   */
  static isAndroidTV(): boolean {
    // Check if running on Android platform
    // Note: Full Android TV detection requires react-native-device-info package
    return Platform.OS === 'android';
  }

  /**
   * Handle back button press (for Android devices)
   */
  static handleBackButton(callback: () => boolean): () => void {
    const subscription = BackHandler.addEventListener('hardwareBackPress', callback);
    return () => subscription.remove();
  }
}

/**
 * React Hook for Bluetooth/TV remote control
 */
export function useBluetoothRemote(
  onKeyPress: BluetoothKeyHandler,
  dependencies: any[] = []
): void {
  useEffect(() => {
    const handlerId = `handler-${Date.now()}`;

    BluetoothService.initialize();
    BluetoothService.registerHandler(handlerId, onKeyPress);

    return () => {
      BluetoothService.unregisterHandler(handlerId);
    };
  }, dependencies);
}

/**
 * Predefined key mappings for common actions
 */
export const BluetoothKeyMappings = {
  CHANNEL_UP: 'up',
  CHANNEL_DOWN: 'down',
  VOLUME_UP: 'right',
  VOLUME_DOWN: 'left',
  PLAY_PAUSE: 'playPause',
  BACK: 'back',
  SELECT: 'select',
  MENU: 'menu',
  FAST_FORWARD: 'fastForward',
  REWIND: 'rewind',
} as const;

/**
 * Bluetooth Remote Configuration
 */
export interface BluetoothConfig {
  enabled: boolean;
  channelUpKey: string;
  channelDownKey: string;
  volumeUpKey: string;
  volumeDownKey: string;
  playPauseKey: string;
  backKey: string;
}

export const DEFAULT_BLUETOOTH_CONFIG: BluetoothConfig = {
  enabled: true,
  channelUpKey: 'up',
  channelDownKey: 'down',
  volumeUpKey: 'right',
  volumeDownKey: 'left',
  playPauseKey: 'playPause',
  backKey: 'back',
};
