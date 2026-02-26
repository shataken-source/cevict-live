/**
 * SMS Alerter - Send text alerts when trades execute
 * Uses Sinch API for SMS delivery
 */

interface SinchConfig {
  apiToken: string;
  servicePlanId: string;
  from: string;
  to: string;
}

export class SMSAlerter {
  private config: SinchConfig;
  private enabled: boolean;

  constructor() {
    this.config = {
      apiToken: process.env.SINCH_API_TOKEN || '',
      servicePlanId: process.env.SINCH_SERVICE_PLAN_ID || '',
      from: (process.env.SINCH_FROM || '').replace(/[^\d]/g, ''),
      to: (process.env.MY_PERSONAL_NUMBER || '').replace(/[^\d]/g, ''),
    };

    this.enabled = !!(
      this.config.apiToken &&
      this.config.servicePlanId &&
      this.config.from &&
      this.config.to
    );

    if (!this.enabled) {
      console.warn('[SMS-ALERTER] SMS alerts disabled - missing Sinch configuration');
    }
  }

  /**
   * Send SMS via Sinch API
   */
  private async sendSMS(message: string): Promise<boolean> {
    if (!this.enabled) {
      console.log('[SMS-ALERTER] Would send SMS:', message);
      return false;
    }

    try {
      const url = `https://us.sms.api.sinch.com/xms/v1/${this.config.servicePlanId}/batches`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiToken}`,
        },
        body: JSON.stringify({
          from: this.config.from,
          to: [this.config.to],
          body: message,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[SMS-ALERTER] Failed to send SMS:', error);
        return false;
      }

      console.log('[SMS-ALERTER] ✅ SMS sent successfully');
      return true;
    } catch (error) {
      console.error('[SMS-ALERTER] Error sending SMS:', error);
      return false;
    }
  }

  /**
   * Alert when trade is executed
   */
  async tradeExecuted(
    symbol: string,
    amount: number,
    type: 'BUY' | 'SELL',
    platform: 'Coinbase' | 'Kalshi' | 'Polymarket'
  ): Promise<void> {
    const message = `🚨 ALPHA HUNTER TRADE\n${type} ${symbol}\nAmount: $${amount.toFixed(2)}\nPlatform: ${platform}\nTime: ${new Date().toLocaleTimeString()}`;

    console.log('[SMS-ALERTER] 📱 Sending trade alert...');
    await this.sendSMS(message);
  }

  /**
   * Alert when daily limit is reached
   */
  async dailyLimitReached(tradeCount: number, totalSpent: number): Promise<void> {
    const message = `⚠️ ALPHA HUNTER LIMIT\nDaily trade limit reached!\nTrades: ${tradeCount}\nSpent: $${totalSpent.toFixed(2)}\nBot stopped trading.`;

    console.log('[SMS-ALERTER] 📱 Sending limit alert...');
    await this.sendSMS(message);
  }

  /**
   * Alert when emergency stop is triggered
   */
  async emergencyStop(reason: string, totalSpent: number): Promise<void> {
    const message = `🛑 ALPHA HUNTER EMERGENCY STOP\nReason: ${reason}\nTotal spent: $${totalSpent.toFixed(2)}\nBot has been stopped!`;

    console.log('[SMS-ALERTER] 📱 Sending emergency alert...');
    await this.sendSMS(message);
  }

  /**
   * Alert when bot starts
   */
  async botStarted(): Promise<void> {
    const message = `✅ ALPHA HUNTER STARTED\nBot is now active and monitoring markets.\nTime: ${new Date().toLocaleTimeString()}`;

    console.log('[SMS-ALERTER] 📱 Sending startup alert...');
    await this.sendSMS(message);
  }

  /**
   * Alert when bot stops
   */
  async botStopped(reason?: string): Promise<void> {
    const message = `⏹️ ALPHA HUNTER STOPPED\n${reason ? `Reason: ${reason}\n` : ''}Time: ${new Date().toLocaleTimeString()}`;

    console.log('[SMS-ALERTER] 📱 Sending shutdown alert...');
    await this.sendSMS(message);
  }

  /**
   * Test SMS functionality
   */
  async test(): Promise<boolean> {
    const message = `🧪 ALPHA HUNTER TEST\nSMS alerts are working correctly!\nTime: ${new Date().toLocaleTimeString()}`;

    console.log('[SMS-ALERTER] 📱 Sending test message...');
    return await this.sendSMS(message);
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const smsAlerter = new SMSAlerter();
