/**
 * SMS Notifier
 * Sends daily suggestions and alerts via Sinch SMS
 */

interface SMSConfig {
  servicePlanId: string;
  apiToken: string;
  fromNumber: string;
  toNumber: string;
}

interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class SMSNotifier {
  private config: SMSConfig;
  private enabled: boolean;

  constructor() {
    this.config = {
      servicePlanId: process.env.SINCH_SERVICE_PLAN_ID || '',
      apiToken: process.env.SINCH_API_TOKEN || '',
      fromNumber: process.env.SINCH_FROM || '',
      toNumber: process.env.MY_PERSONAL_NUMBER || '',
    };

    this.enabled = !!(
      this.config.servicePlanId &&
      this.config.apiToken &&
      this.config.fromNumber &&
      this.config.toNumber
    );

    if (!this.enabled) {
      console.warn('⚠️ SMS notifications disabled: Missing Sinch configuration');
    }
  }

  async sendDailySuggestion(suggestion: string): Promise<NotificationResult> {
    if (!this.enabled) {
      console.log('📱 [SMS DISABLED] Would send:\n', suggestion);
      return { success: true, messageId: 'disabled' };
    }

    return this.sendSMS(suggestion);
  }

  async sendAlert(title: string, message: string): Promise<NotificationResult> {
    const alertText = `🚨 ${title}\n\n${message}`;

    if (!this.enabled) {
      console.log('📱 [SMS DISABLED] Alert:\n', alertText);
      return { success: true, messageId: 'disabled' };
    }

    return this.sendSMS(alertText);
  }

  async sendTradeExecuted(
    opportunityTitle: string,
    amount: number,
    platform: string
  ): Promise<NotificationResult> {
    const message = `🎯 TRADE EXECUTED\n\n` +
      `${opportunityTitle}\n` +
      `💰 Amount: $${amount.toFixed(2)}\n` +
      `📍 Platform: ${platform}\n` +
      `⏰ ${new Date().toLocaleTimeString()}`;

    return this.sendAlert('Trade Executed', message);
  }

  async sendTradeResult(
    opportunityTitle: string,
    profit: number,
    isWin: boolean
  ): Promise<NotificationResult> {
    const emoji = isWin ? '✅' : '❌';
    const message = `${emoji} TRADE ${isWin ? 'WON' : 'LOST'}\n\n` +
      `${opportunityTitle}\n` +
      `${isWin ? '🎉 Profit' : '📉 Loss'}: ${profit > 0 ? '+' : ''}$${profit.toFixed(2)}`;

    return this.sendAlert(isWin ? 'Trade Won!' : 'Trade Lost', message);
  }

  async sendDailySummary(
    tradesExecuted: number,
    wins: number,
    losses: number,
    profit: number,
    balance: number
  ): Promise<NotificationResult> {
    const winRate = tradesExecuted > 0 ? (wins / tradesExecuted * 100).toFixed(1) : '0';

    const message = `📊 DAILY SUMMARY\n\n` +
      `📈 Trades: ${tradesExecuted} (${wins}W/${losses}L)\n` +
      `🎯 Win Rate: ${winRate}%\n` +
      `${profit >= 0 ? '💰' : '📉'} P&L: ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}\n` +
      `💵 Balance: $${balance.toFixed(2)}\n\n` +
      `${profit >= 250 ? '🔥 TARGET HIT!' : profit >= 100 ? '📈 Good day!' : profit > 0 ? '✅ Profitable' : '⏳ Tomorrow is another day'}`;

    return this.sendSMS(message);
  }

  async sendOpportunityAlert(
    title: string,
    confidence: number,
    expectedValue: number,
    action: string
  ): Promise<NotificationResult> {
    const message = `🎯 OPPORTUNITY ALERT\n\n` +
      `${title}\n` +
      `📊 Confidence: ${confidence}%\n` +
      `📈 EV: +${expectedValue.toFixed(1)}%\n\n` +
      `🎬 ${action}`;

    return this.sendSMS(message);
  }

  private async sendSMS(message: string): Promise<NotificationResult> {
    try {
      // Sinch REST SMS API
      const url = `https://us.sms.api.sinch.com/xms/v1/${this.config.servicePlanId}/batches`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiToken}`,
        },
        body: JSON.stringify({
          from: this.config.fromNumber,
          to: [this.config.toNumber],
          body: this.truncateMessage(message),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('SMS send error:', error);
        return { success: false, error };
      }

      const data = await response.json();
      console.log(`📱 SMS sent: ${data.id}`);
      return { success: true, messageId: data.id };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('SMS error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  private truncateMessage(message: string, maxLength: number = 1600): string {
    // SMS can be up to 1600 chars (10 segments)
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength - 3) + '...';
  }

  isConfigured(): boolean {
    return this.enabled;
  }
}

