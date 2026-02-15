import { Channel } from '@/types';

export interface GestureAction {
  type: 'swipe' | 'tap' | 'longPress' | 'doubleTap' | 'pinch';
  direction?: 'left' | 'right' | 'up' | 'down';
  action: () => void;
  hapticFeedback?: boolean;
}

export class GestureService {
  private static readonly SWIPE_THRESHOLD = 50;
  private static readonly LONG_PRESS_DURATION = 500;
  private lastTap: number = 0;

  // Swipe gestures for player
  handlePlayerSwipe(direction: 'left' | 'right' | 'up' | 'down', callback: (direction: string) => void) {
    if (direction === 'left') {
      callback('next-channel');
    } else if (direction === 'right') {
      callback('previous-channel');
    } else if (direction === 'up') {
      callback('volume-up');
    } else if (direction === 'down') {
      callback('volume-down');
    }
  }

  // Double tap detection
  detectDoubleTap(callback: () => void) {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - this.lastTap < DOUBLE_TAP_DELAY) {
      callback();
      this.lastTap = 0;
    } else {
      this.lastTap = now;
    }
  }

  // Long press for context menu
  handleLongPress(channel: Channel, callback: (channel: Channel) => void) {
    callback(channel);
  }

  // Haptic feedback
  triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
    // Will use react-native-haptic-feedback
    console.log(`Haptic: ${type}`);
  }

  // Shake to randomize
  detectShake(_callback: () => void) {
    // Use accelerometer to detect shake
    // When detected, call callback (randomize channel)
  }

  // Pinch to zoom (for mini player)
  handlePinch(scale: number, callback: (scale: number) => void) {
    callback(scale);
  }
}
