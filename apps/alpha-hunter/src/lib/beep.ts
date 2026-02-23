/**
 * System Beep Utility
 * Plays system beep sound when trades are executed
 */

import { exec } from 'child_process';

export class Beeper {
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.BEEP_ON_TRADE === 'true';
  }

  /**
   * Play system beep sound
   * @param count Number of beeps (default 1)
   * @param interval Milliseconds between beeps (default 200)
   */
  async beep(count: number = 1, interval: number = 200): Promise<void> {
    if (!this.enabled) return;

    for (let i = 0; i < count; i++) {
      await this.playBeep();
      if (i < count - 1) {
        await this.sleep(interval);
      }
    }
  }

  /**
   * Play a single beep using PowerShell
   */
  private playBeep(): Promise<void> {
    return new Promise((resolve) => {
      // Use PowerShell to play system beep
      // Frequency: 800Hz, Duration: 200ms
      exec('powershell -c "[console]::beep(800,200)"', (error) => {
        if (error) {
          console.warn('[BEEP] Failed to play sound:', error.message);
        }
        resolve();
      });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Trade executed beep pattern (2 quick beeps)
   */
  async tradeExecuted(): Promise<void> {
    if (!this.enabled) return;
    console.log('🔔 BEEP! Trade executed');
    await this.beep(2, 150);
  }

  /**
   * Trade closed beep pattern
   * Win: 3 ascending beeps
   * Loss: 1 low beep
   */
  async tradeClosed(profit: number): Promise<void> {
    if (!this.enabled) return;

    if (profit >= 0) {
      console.log('🔔 BEEP! Trade closed - WIN');
      // Win: 3 quick beeps
      await this.beep(3, 100);
    } else {
      console.log('🔔 BEEP! Trade closed - LOSS');
      // Loss: 1 longer beep
      await new Promise((resolve) => {
        exec('powershell -c "[console]::beep(400,300)"', () => resolve(null));
      });
    }
  }

  /**
   * Error beep pattern (rapid beeps)
   */
  async error(): Promise<void> {
    if (!this.enabled) return;
    console.log('🔔 BEEP! Error occurred');
    await this.beep(5, 100);
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const beeper = new Beeper();
