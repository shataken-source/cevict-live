/**
 * Emergency Stop System
 * Hard kill switch that stops all trading if limits are exceeded
 */

import fs from 'fs';
import path from 'path';
import { smsAlerter } from './sms-alerter';

interface EmergencyState {
  stopped: boolean;
  reason?: string;
  timestamp?: string;
  totalSpent?: number;
}

export class EmergencyStop {
  private stateFile: string;
  private state: EmergencyState;
  private hardSpendingLimit: number;
  private spendingWarningLogged = false;

  constructor() {
    // Use __dirname so path is stable regardless of where process is started
    const alphaRoot = path.resolve(__dirname, '..', '..');
    this.stateFile = path.join(alphaRoot, 'data', 'emergency-stop.json');
    this.hardSpendingLimit = parseFloat(process.env.MAX_DAILY_LOSS || '50');
    this.state = this.loadState();
  }

  /**
   * Load emergency stop state from file
   */
  private loadState(): EmergencyState {
    try {
      const dataDir = path.dirname(this.stateFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.stateFile)) {
        const raw = fs.readFileSync(this.stateFile, 'utf-8');
        return JSON.parse(raw) as EmergencyState;
      }

      return { stopped: false };
    } catch (error) {
      console.error('[EMERGENCY-STOP] Error loading state:', error);
      return { stopped: false };
    }
  }

  /**
   * Save emergency stop state to file
   */
  private saveState(): void {
    try {
      fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (error) {
      console.error('[EMERGENCY-STOP] Error saving state:', error);
    }
  }

  /**
   * Check if trading is allowed
   */
  canTrade(): { allowed: boolean; reason?: string } {
    if (this.state.stopped) {
      return {
        allowed: false,
        reason: this.state.reason || 'Emergency stop is active',
      };
    }

    return { allowed: true };
  }

  /**
   * Trigger emergency stop
   */
  async trigger(reason: string, totalSpent?: number): Promise<void> {
    console.error('🛑🛑🛑 EMERGENCY STOP TRIGGERED 🛑🛑🛑');
    console.error(`Reason: ${reason}`);
    if (totalSpent !== undefined) {
      console.error(`Total spent: $${totalSpent.toFixed(2)}`);
    }

    this.state = {
      stopped: true,
      reason,
      timestamp: new Date().toISOString(),
      totalSpent,
    };

    this.saveState();

    // Send SMS alert
    await smsAlerter.emergencyStop(reason, totalSpent || 0);

    // Log to file
    const logFile = path.join(path.resolve(__dirname, '..', '..'), 'data', 'emergency-stops.log');
    const logEntry = `${new Date().toISOString()} - ${reason} - $${(totalSpent || 0).toFixed(2)}\n`;
    fs.appendFileSync(logFile, logEntry, 'utf-8');
  }

  /**
   * Check if spending limit would be exceeded
   */
  async checkSpendingLimit(currentSpent: number, proposedTrade: number): Promise<boolean> {
    const totalAfterTrade = currentSpent + proposedTrade;

    if (totalAfterTrade > this.hardSpendingLimit) {
      await this.trigger(
        `Hard spending limit exceeded: $${totalAfterTrade.toFixed(2)} > $${this.hardSpendingLimit}`,
        totalAfterTrade
      );
      return false;
    }

    // Warning at 80% of limit (log once per session, not every call)
    if (totalAfterTrade > this.hardSpendingLimit * 0.8 && !this.state.stopped && !this.spendingWarningLogged) {
      console.warn(`⚠️ WARNING: Approaching spending limit (${((totalAfterTrade / this.hardSpendingLimit) * 100).toFixed(1)}%)`);
      this.spendingWarningLogged = true;
    }

    return true;
  }

  /**
   * Reset emergency stop (manual override)
   */
  reset(): void {
    console.log('[EMERGENCY-STOP] Resetting emergency stop state');
    this.state = { stopped: false };
    this.saveState();
  }

  /**
   * Get current state
   */
  getState(): EmergencyState {
    return { ...this.state };
  }

  /**
   * Check if stopped
   */
  isStopped(): boolean {
    return this.state.stopped;
  }
}

// Singleton instance
export const emergencyStop = new EmergencyStop();
