/**
 * SMS Notification Service using Sinch
 * 
 * Handles SMS notifications for user alerts, updates, and verification
 */

interface SMSConfig {
  accountSid: string;
  authToken: string;
  serviceId: string;
  fromNumber: string;
}

interface SMSMessage {
  to: string;
  body: string;
  priority?: 'low' | 'normal' | 'high';
  scheduledFor?: Date;
}

interface SMSResponse {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  dateCreated: Date;
  dateSent?: Date;
}

export class SMSService {
  private static instance: SMSService;
  private config: SMSConfig;

  constructor() {
    this.config = {
      accountSid: process.env.SINCH_ACCOUNT_SID!,
      authToken: process.env.SINCH_AUTH_TOKEN!,
      serviceId: process.env.SINCH_SERVICE_ID!,
      fromNumber: process.env.SINCH_FROM_NUMBER!,
    };

    if (!this.config.accountSid || !this.config.authToken) {
      console.warn('SMS service not configured - using mock implementation');
    }
  }

  static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  /**
   * Send an SMS message
   */
  async sendSMS(message: SMSMessage): Promise<SMSResponse> {
    // Mock implementation for development
    if (!this.config.accountSid) {
      console.log('Mock SMS sending:', message);
      return {
        sid: 'mock_' + Math.random().toString(36).substr(2, 9),
        status: 'sent',
        to: message.to,
        from: this.config.fromNumber || '+1234567890',
        body: message.body,
        dateCreated: new Date(),
        dateSent: new Date(),
      };
    }

    try {
      // Real Sinch implementation would go here
      const response = await this.sendSinchSMS(message);
      return response;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw new Error('Failed to send SMS');
    }
  }

  /**
   * Send verification code
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<SMSResponse> {
    const message = `Your SmokersRights verification code is: ${code}. This code will expire in 10 minutes.`;
    
    return this.sendSMS({
      to: phoneNumber,
      body: message,
      priority: 'high',
    });
  }

  /**
   * Send submission status update
   */
  async sendSubmissionUpdate(phoneNumber: string, status: string, itemType: string): Promise<SMSResponse> {
    const message = `SmokersRights: Your ${itemType} submission has been ${status}. Visit the platform for more details.`;
    
    return this.sendSMS({
      to: phoneNumber,
      body: message,
      priority: 'normal',
    });
  }

  /**
   * Send law change alert
   */
  async sendLawChangeAlert(phoneNumber: string, state: string, category: string): Promise<SMSResponse> {
    const message = `SmokersRights Alert: ${state} ${category} laws have been updated. Check the platform for details.`;
    
    return this.sendSMS({
      to: phoneNumber,
      body: message,
      priority: 'normal',
    });
  }

  /**
   * Send weekly digest
   */
  async sendWeeklyDigest(phoneNumber: string, stats: { newLaws: number; newPlaces: number; updates: number }): Promise<SMSResponse> {
    const message = `SmokersRights Weekly: ${stats.newLaws} new laws, ${stats.newPlaces} new places, ${stats.updates} updates. Visit for details!`;
    
    return this.sendSMS({
      to: phoneNumber,
      body: message,
      priority: 'low',
    });
  }

  /**
   * Schedule an SMS message
   */
  async scheduleSMS(message: SMSMessage, scheduledFor: Date): Promise<SMSResponse> {
    // For now, just send immediately
    // In production, this would integrate with a job queue
    return this.sendSMS({
      ...message,
      scheduledFor,
    });
  }

  /**
   * Get SMS delivery status
   */
  async getDeliveryStatus(messageSid: string): Promise<string> {
    // Mock implementation
    return 'delivered';
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Basic phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''));
  }

  /**
   * Format phone number to E.164 format
   */
  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if missing (assuming US)
    if (cleaned.length === 10) {
      cleaned = '1' + cleaned;
    }
    
    // Add + prefix
    return '+' + cleaned;
  }

  /**
   * Real Sinch SMS sending implementation
   */
  private async sendSinchSMS(message: SMSMessage): Promise<SMSResponse> {
    // This would be the actual Sinch API call
    // For now, returning mock response
    const url = `https://us.sms.api.sinch.com/xms/v1/${this.config.accountSid}/batches`;
    
    const payload = {
      from: this.config.fromNumber,
      to: [message.to],
      body: message.body,
      delivery_report: 'requested',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Sinch API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      sid: data.id,
      status: 'pending',
      to: message.to,
      from: this.config.fromNumber,
      body: message.body,
      dateCreated: new Date(),
    };
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkSMS(messages: SMSMessage[]): Promise<SMSResponse[]> {
    const responses: SMSResponse[] = [];
    
    for (const message of messages) {
      try {
        const response = await this.sendSMS(message);
        responses.push(response);
      } catch (error) {
        console.error('Failed to send bulk SMS:', error);
        // Continue with other messages
      }
    }
    
    return responses;
  }

  /**
   * Get SMS usage statistics
   */
  async getUsageStats(startDate: Date, endDate: Date): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    cost: number;
  }> {
    // Mock implementation
    return {
      totalSent: 100,
      totalDelivered: 95,
      totalFailed: 5,
      cost: 5.50,
    };
  }
}

export default SMSService;
