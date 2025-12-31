/**
 * SMS Notification Service using Sinch
 * For sending daily picks and last-minute alerts to Pro and Elite subscribers
 */

interface SMSConfig {
  servicePlanId: string;
  apiToken: string;
  fromNumber: string;
}

export class PrognosticationSMSService {
  private static instance: PrognosticationSMSService | null = null;
  private config: SMSConfig | null = null;

  private constructor() {
    // Private constructor - use getInstance()
  }

  private initialize() {
    if (this.config !== null) return; // Already initialized
    
    const servicePlanId = process.env.SINCH_SERVICE_PLAN_ID;
    const apiToken = process.env.SINCH_API_TOKEN;
    const fromNumber = process.env.SINCH_FROM_NUMBER || process.env.SINCH_FROM;

    if (servicePlanId && apiToken && fromNumber) {
      this.config = {
        servicePlanId,
        apiToken,
        fromNumber,
      };
    } else {
      // Don't warn during build - env vars may not be available
      if (typeof window !== 'undefined' || process.env.NODE_ENV === 'development') {
        console.warn('SMS service not fully configured - SMS alerts will not be sent');
      }
    }
  }

  static getInstance(): PrognosticationSMSService {
    if (!PrognosticationSMSService.instance) {
      PrognosticationSMSService.instance = new PrognosticationSMSService();
    }
    PrognosticationSMSService.instance.initialize();
    return PrognosticationSMSService.instance;
  }

  /**
   * Send SMS via Sinch API
   */
  async sendSMS(to: string, message: string): Promise<{ success: boolean; error?: string }> {
    if (!this.config) {
      return { success: false, error: 'SMS service not configured' };
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
          from: this.config.fromNumber,
          to: [to],
          body: message,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Sinch SMS API error:', error);
        return { success: false, error: `SMS API error: ${response.status}` };
      }

      const data = await response.json();
      return { success: true };
    } catch (error: any) {
      console.error('Failed to send SMS:', error);
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }

  /**
   * Send daily picks alert to subscriber
   */
  async sendDailyPicksAlert(phoneNumber: string, picks: Array<{ game: string; pick: string; confidence: number }>, tier: 'pro' | 'elite'): Promise<{ success: boolean; error?: string }> {
    const tierLabel = tier === 'elite' ? 'Elite' : 'Pro';
    let message = `🏈 ${tierLabel} Daily Picks:\n\n`;

    picks.slice(0, tier === 'elite' ? 5 : 3).forEach((pick, i) => {
      message += `${i + 1}. ${pick.game}\n   Pick: ${pick.pick}\n   Confidence: ${pick.confidence}%\n\n`;
    });

    message += `View all picks: https://prognostication.com/picks`;

    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send last-minute alert (weather, injury, etc.)
   */
  async sendLastMinuteAlert(phoneNumber: string, alert: { game: string; reason: string; impact: string }): Promise<{ success: boolean; error?: string }> {
    const message = `⚠️ Last-Minute Alert:\n\n${alert.game}\n\nReason: ${alert.reason}\nImpact: ${alert.impact}\n\nView updated picks: https://prognostication.com/picks`;

    return this.sendSMS(phoneNumber, message);
  }
}

// Lazy initialization - don't create instance at module load time
export function getSmsService() {
  return PrognosticationSMSService.getInstance();
}

