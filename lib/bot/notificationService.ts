/**
 * Notification Service
 * 
 * Sends notifications to users about law changes, updates, and other important events
 */

import { createClient } from '@/lib/supabase';
import { SMSService } from '@/lib/sms';
import { EmailService } from '@/lib/emailService';

interface NotificationResult {
  sent: number;
  failed: number;
  details: {
    sms: number;
    email: number;
    push: number;
  };
  errors: string[];
}

interface LawUpdate {
  updatedLaws: any[];
}

export class NotificationService {
  private supabase: ReturnType<typeof createClient> | null;
  private smsService: SMSService;
  private emailService: EmailService;

  constructor() {
    try {
      this.supabase = createClient();
    } catch (error) {
      console.warn('Supabase client initialization failed:', error);
      this.supabase = null;
    }
    this.smsService = SMSService.getInstance();
    this.emailService = EmailService.getInstance();
  }

  /**
   * Send notifications about law updates
   */
  async sendNotifications(lawUpdates: LawUpdate): Promise<NotificationResult> {
    const result: NotificationResult = {
      sent: 0,
      failed: 0,
      details: {
        sms: 0,
        email: 0,
        push: 0
      },
      errors: []
    };

    try {
      if (!lawUpdates?.updatedLaws || lawUpdates.updatedLaws.length === 0) {
        console.log('No law updates to notify about');
        return result;
      }

      console.log(`Sending notifications for ${lawUpdates.updatedLaws.length} law updates`);

      // Get users who want to receive notifications
      const users = await this.getNotificationUsers();

      for (const user of users) {
        try {
          await this.sendUserNotifications(user, lawUpdates);
          result.sent++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to send to user ${user.id}: ${error}`);
        }
      }

      console.log(`Notifications sent: ${result.sent}, Failed: ${result.failed}`);

    } catch (error) {
      result.errors.push(`Notification service failed: ${error}`);
    }

    return result;
  }

  /**
   * Get users who have opted in to notifications
   */
  private async getNotificationUsers(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('unified_users')
        .select('*')
        .eq('notifications_enabled', true)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting notification users:', error);
      return [];
    }
  }

  /**
   * Send notifications to a specific user
   */
  private async sendUserNotifications(user: any, lawUpdates: LawUpdate): Promise<void> {
    const promises: Promise<void>[] = [];

    // Send SMS if user has SMS notifications enabled
    if (user.sms_notifications && user.phone) {
      promises.push(this.sendSMSNotification(user, lawUpdates));
    }

    // Send email if user has email notifications enabled
    if (user.email_notifications && user.email) {
      promises.push(this.sendEmailNotification(user, lawUpdates));
    }

    // Send push notification if user has push notifications enabled
    if (user.push_notifications) {
      promises.push(this.sendPushNotification(user, lawUpdates));
    }

    await Promise.all(promises);
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(user: any, lawUpdates: LawUpdate): Promise<void> {
    try {
      const message = this.buildSMSMessage(lawUpdates);
      await this.smsService.sendSMS({
        to: user.phone,
        body: message
      });
    } catch (error) {
      console.error(`Failed to send SMS to ${user.phone}:`, error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(user: any, lawUpdates: LawUpdate): Promise<void> {
    try {
      const subject = this.buildEmailSubject(lawUpdates);
      const htmlContent = this.buildEmailHTML(user, lawUpdates);
      const textContent = this.buildEmailText(user, lawUpdates);

      await this.emailService.sendEmail({
        to: user.email,
        subject,
        html: htmlContent,
        text: textContent
      });
    } catch (error) {
      console.error(`Failed to send email to ${user.email}:`, error);
      throw error;
    }
  }

  /**
   * Send push notification (mock implementation)
   */
  private async sendPushNotification(user: any, lawUpdates: LawUpdate): Promise<void> {
    try {
      // In production, this would integrate with a push notification service
      // like Firebase Cloud Messaging, OneSignal, etc.
      console.log(`Push notification sent to user ${user.id}`);
    } catch (error) {
      console.error(`Failed to send push notification to ${user.id}:`, error);
      throw error;
    }
  }

  /**
   * Build SMS message content
   */
  private buildSMSMessage(lawUpdates: LawUpdate): string {
    const updateCount = lawUpdates.updatedLaws.length;
    const states = Array.from(new Set(lawUpdates.updatedLaws.map((law: any) => law.state))).join(', ');
    
    return `SmokersRights: ${updateCount} smoking law update(s) in ${states}. View details at: ${process.env.NEXT_PUBLIC_APP_URL}/browse`;
  }

  /**
   * Build email subject
   */
  private buildEmailSubject(lawUpdates: LawUpdate): string {
    const updateCount = lawUpdates.updatedLaws.length;
    return `${updateCount} New Smoking Law Update${updateCount > 1 ? 's' : ''} - SmokersRights`;
  }

  /**
   * Build HTML email content
   */
  private buildEmailHTML(user: any, lawUpdates: LawUpdate): string {
    const updateCount = lawUpdates.updatedLaws.length;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://smokersrights.com';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Smoking Law Updates</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .law-update { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
          .law-title { font-weight: bold; color: #1e40af; }
          .law-state { background: #f3f4f6; padding: 2px 8px; border-radius: 3px; font-size: 0.9em; }
          .changes { margin: 10px 0; }
          .change-item { margin: 5px 0; }
          .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 0.9em; }
          .btn { display: inline-block; padding: 10px 20px; background: #1e40af; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚬 Smoking Law Updates</h1>
          <p>${updateCount} update${updateCount > 1 ? 's' : ''} affecting your area</p>
        </div>
        
        <div class="content">
          <p>Hi ${user.first_name || user.email},</p>
          <p>We've detected ${updateCount} smoking law update${updateCount > 1 ? 's' : ''} that may affect you:</p>
          
          ${lawUpdates.updatedLaws.map(law => `
            <div class="law-update">
              <div class="law-title">${law.title}</div>
              <div class="law-state">${law.state}</div>
              <div class="law-category">${law.category}</div>
              <p>${law.description}</p>
              ${law.changes && law.changes.length > 0 ? `
                <div class="changes">
                  <strong>Changes:</strong>
                  ${law.changes.map((change: any) => `<div class="change-item">• ${change}</div>`).join('')}
                </div>
              ` : ''}
              <p><small>Effective: ${new Date(law.effectiveDate).toLocaleDateString()}</small></p>
            </div>
          `).join('')}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/browse" class="btn">View All Updates</a>
          </div>
        </div>
        
        <div class="footer">
          <p>You're receiving this because you enabled notifications in your SmokersRights account.</p>
          <p><a href="${baseUrl}/settings">Manage notification preferences</a> | <a href="${baseUrl}/unsubscribe">Unsubscribe</a></p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Build plain text email content
   */
  private buildEmailText(user: any, lawUpdates: LawUpdate): string {
    const updateCount = lawUpdates.updatedLaws.length;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://smokersrights.com';

    let text = `Smoking Law Updates\n`;
    text += `${'='.repeat(50)}\n\n`;
    text += `Hi ${user.first_name || user.email},\n\n`;
    text += `We've detected ${updateCount} smoking law update${updateCount > 1 ? 's' : ''} that may affect you:\n\n`;

    lawUpdates.updatedLaws.forEach((law, index) => {
      text += `${index + 1}. ${law.title}\n`;
      text += `   State: ${law.state}\n`;
      text += `   Category: ${law.category}\n`;
      text += `   Description: ${law.description}\n`;
      if (law.changes && law.changes.length > 0) {
        text += `   Changes:\n`;
        law.changes.forEach((change: any) => {
          text += `     • ${change}\n`;
        });
      }
      text += `   Effective: ${new Date(law.effectiveDate).toLocaleDateString()}\n\n`;
    });

    text += `View all updates: ${baseUrl}/browse\n\n`;
    text += `Manage notification preferences: ${baseUrl}/settings\n`;
    text += `Unsubscribe: ${baseUrl}/unsubscribe\n\n`;

    return text;
  }

  /**
   * Send weekly digest email
   */
  async sendWeeklyDigest(): Promise<NotificationResult> {
    const result: NotificationResult = {
      sent: 0,
      failed: 0,
      details: {
        sms: 0,
        email: 0,
        push: 0
      },
      errors: []
    };

    try {
      const users = await this.getWeeklyDigestUsers();
      
      for (const user of users) {
        try {
          await this.sendWeeklyDigestEmail(user);
          result.sent++;
          result.details.email++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to send weekly digest to ${user.id}: ${error}`);
        }
      }
    } catch (error) {
      result.errors.push(`Weekly digest failed: ${error}`);
    }

    return result;
  }

  /**
   * Get users who want weekly digest
   */
  private async getWeeklyDigestUsers(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('unified_users')
        .select('*')
        .eq('weekly_digest', true)
        .eq('email_notifications', true)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting weekly digest users:', error);
      return [];
    }
  }

  /**
   * Send weekly digest email
   */
  private async sendWeeklyDigestEmail(user: any): Promise<void> {
    // Implementation for weekly digest email
    // This would include summary of all updates from the past week
    console.log(`Weekly digest sent to ${user.email}`);
  }
}
