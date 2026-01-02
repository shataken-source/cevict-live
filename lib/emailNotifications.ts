/**
 * Email Notifications System for SmokersRights
 * 
 * Handles sending email notifications for:
 * - Submission status updates
 * - Correction approvals
 * - New laws in user's state
 * - Welcome emails
 * - Weekly digests
 */

import { createClient } from './supabase';

export interface EmailNotification {
  id: string;
  user_id: string;
  type: 'submission_status' | 'correction_approved' | 'new_law' | 'welcome' | 'weekly_digest';
  subject: string;
  template: string;
  data: Record<string, any>;
  sent_at?: Date;
  created_at: Date;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailNotificationService {
  private supabase = createClient();

  /**
   * Send notification when submission status changes
   */
  async sendSubmissionStatusNotification(
    userId: string,
    submissionType: 'place' | 'correction',
    submissionId: string,
    newStatus: string,
    submissionData: any
  ): Promise<void> {
    const user = await this.getUserEmail(userId);
    if (!user) return;

    const template = this.getSubmissionStatusTemplate(submissionType, newStatus, submissionData);
    
    await this.sendEmail(user.email, template.subject, template.html, template.text);
    
    // Track notification
    await this.trackNotification(userId, 'submission_status', template.subject, {
      submissionType,
      submissionId,
      newStatus
    });
  }

  /**
   * Send notification when correction is approved
   */
  async sendCorrectionApprovedNotification(
    userId: string,
    correctionId: string,
    pointsAwarded: number,
    correctionData: any
  ): Promise<void> {
    const user = await this.getUserEmail(userId);
    if (!user) return;

    const template = this.getCorrectionApprovedTemplate(pointsAwarded, correctionData);
    
    await this.sendEmail(user.email, template.subject, template.html, template.text);
    
    // Track notification
    await this.trackNotification(userId, 'correction_approved', template.subject, {
      correctionId,
      pointsAwarded
    });
  }

  /**
   * Send notification about new laws in user's state
   */
  async sendNewLawNotification(
    userId: string,
    stateCode: string,
    newLaws: any[]
  ): Promise<void> {
    const user = await this.getUserEmail(userId);
    if (!user) return;

    const template = this.getNewLawTemplate(stateCode, newLaws);
    
    await this.sendEmail(user.email, template.subject, template.html, template.text);
    
    // Track notification
    await this.trackNotification(userId, 'new_law', template.subject, {
      stateCode,
      lawCount: newLaws.length
    });
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeNotification(userId: string): Promise<void> {
    const user = await this.getUserEmail(userId);
    if (!user) return;

    const template = this.getWelcomeTemplate(user);
    
    await this.sendEmail(user.email, template.subject, template.html, template.text);
    
    // Track notification
    await this.trackNotification(userId, 'welcome', template.subject, {});
  }

  /**
   * Send weekly digest of updates
   */
  async sendWeeklyDigest(userId: string): Promise<void> {
    const user = await this.getUserEmail(userId);
    if (!user) return;

    const digestData = await this.getWeeklyDigestData(userId);
    const template = this.getWeeklyDigestTemplate(digestData);
    
    await this.sendEmail(user.email, template.subject, template.html, template.text);
    
    // Track notification
    await this.trackNotification(userId, 'weekly_digest', template.subject, digestData);
  }

  /**
   * Get user email from unified users table
   */
  private async getUserEmail(userId: string): Promise<{ email: string; name?: string } | null> {
    try {
      const { data, error } = await this.supabase
        .from('unified_users')
        .select('email, first_name, last_name')
        .eq('id', userId)
        .single();

      if (error || !data) return null;

      return {
        email: data.email,
        name: data.first_name && data.last_name ? `${data.first_name} ${data.last_name}` : undefined
      };
    } catch (error) {
      console.error('Error fetching user email:', error);
      return null;
    }
  }

  /**
   * Send email using Resend (or other email service)
   */
  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    text: string
  ): Promise<void> {
    try {
      // In production, integrate with Resend, SendGrid, or similar
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          html,
          text,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Track notification in database
   */
  private async trackNotification(
    userId: string,
    type: EmailNotification['type'],
    subject: string,
    data: Record<string, any>
  ): Promise<void> {
    try {
      await this.supabase
        .from('email_notifications')
        .insert({
          user_id: userId,
          type,
          subject,
          data,
          sent_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error tracking notification:', error);
    }
  }

  /**
   * Template for submission status changes
   */
  private getSubmissionStatusTemplate(
    submissionType: string,
    status: string,
    data: any
  ): EmailTemplate {
    const statusMessages = {
      verified: 'Your submission has been verified and is now live!',
      rejected: 'Your submission was not approved',
      needs_more_info: 'Your submission needs more information',
      duplicate: 'Your submission appears to be a duplicate',
    };

    const subject = `SmokersRights - Submission ${status.replace('_', ' ').toUpperCase()}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e293b; color: white; padding: 20px; text-align: center;">
          <h1>SmokersRights</h1>
          <p>Civil Liberties & Harm Reduction</p>
        </div>
        
        <div style="padding: 20px;">
          <h2>Update on Your ${submissionType} Submission</h2>
          <p>${statusMessages[status as keyof typeof statusMessages] || 'Your submission status has been updated'}</p>
          
          ${data.admin_notes ? `
            <div style="background: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h3>Admin Notes:</h3>
              <p>${data.admin_notes}</p>
            </div>
          ` : ''}
          
          ${status === 'needs_more_info' ? `
            <p>Please update your submission with the requested information.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/submit-${submissionType}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Update Submission
            </a>
          ` : ''}
          
          ${status === 'verified' ? `
            <p>Thank you for contributing to the SmokersRights community!</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Your Contribution
            </a>
          ` : ''}
        </div>
        
        <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
          <p>© 2024 SmokersRights. All rights reserved.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe">Unsubscribe</a></p>
        </div>
      </div>
    `;

    const text = `
      SmokersRights - Submission ${status.replace('_', ' ').toUpperCase()}
      
      Your ${submissionType} submission has been ${status}.
      
      ${statusMessages[status as keyof typeof statusMessages] || 'Your submission status has been updated'}
      
      ${data.admin_notes ? `Admin Notes: ${data.admin_notes}` : ''}
      
      ${process.env.NEXT_PUBLIC_APP_URL}
    `;

    return { subject, html, text };
  }

  /**
   * Template for correction approval
   */
  private getCorrectionApprovedTemplate(pointsAwarded: number, data: any): EmailTemplate {
    const subject = 'SmokersRights - Your Correction Has Been Approved!';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e293b; color: white; padding: 20px; text-align: center;">
          <h1>SmokersRights</h1>
          <p>Civil Liberties & Harm Reduction</p>
        </div>
        
        <div style="padding: 20px;">
          <h2>🎉 Correction Approved!</h2>
          <p>Congratulations! Your correction has been reviewed and approved by our moderation team.</p>
          
          <div style="background: #dcfce7; padding: 15px; margin: 20px 0; border-radius: 5px; text-align: center;">
            <h3>You've earned ${pointsAwarded} points!</h3>
            <p>Your contribution helps keep SmokersRights accurate and up-to-date.</p>
          </div>
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Your Profile
          </a>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
          <p>© 2024 SmokersRights. All rights reserved.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe">Unsubscribe</a></p>
        </div>
      </div>
    `;

    const text = `
      SmokersRights - Your Correction Has Been Approved!
      
      Congratulations! Your correction has been reviewed and approved.
      
      You've earned ${pointsAwarded} points!
      
      View your profile: ${process.env.NEXT_PUBLIC_APP_URL}/profile
    `;

    return { subject, html, text };
  }

  /**
   * Template for new laws in user's state
   */
  private getNewLawTemplate(stateCode: string, newLaws: any[]): EmailTemplate {
    const stateName = this.getStateName(stateCode);
    const subject = `SmokersRights - New Laws in ${stateName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e293b; color: white; padding: 20px; text-align: center;">
          <h1>SmokersRights</h1>
          <p>Civil Liberties & Harm Reduction</p>
        </div>
        
        <div style="padding: 20px;">
          <h2>📋 New Laws in ${stateName}</h2>
          <p>We've updated our database with ${newLaws.length} new law${newLaws.length > 1 ? 's' : ''} in your state.</p>
          
          ${newLaws.map(law => `
            <div style="background: #f8fafc; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #3b82f6;">
              <h3>${law.category}</h3>
              <p>${law.summary}</p>
              <small style="color: #64748b;">Updated: ${new Date(law.last_updated_at).toLocaleDateString()}</small>
            </div>
          `).join('')}
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View All Laws
          </a>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
          <p>© 2024 SmokersRights. All rights reserved.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe">Unsubscribe</a></p>
        </div>
      </div>
    `;

    const text = `
      SmokersRights - New Laws in ${stateName}
      
      We've updated our database with ${newLaws.length} new law${newLaws.length > 1 ? 's' : ''} in your state.
      
      ${newLaws.map(law => `
        ${law.category}: ${law.summary}
      `).join('\n')}
      
      View all laws: ${process.env.NEXT_PUBLIC_APP_URL}
    `;

    return { subject, html, text };
  }

  /**
   * Template for welcome email
   */
  private getWelcomeTemplate(user: { email: string; name?: string }): EmailTemplate {
    const subject = 'Welcome to SmokersRights!';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e293b; color: white; padding: 20px; text-align: center;">
          <h1>SmokersRights</h1>
          <p>Civil Liberties & Harm Reduction</p>
        </div>
        
        <div style="padding: 20px;">
          <h2>Welcome${user.name ? `, ${user.name}` : ''}! 👋</h2>
          <p>Thank you for joining SmokersRights! We're your comprehensive resource for smoking and vaping laws across the Southeast United States.</p>
          
          <h3>What can you do with SmokersRights?</h3>
          <ul>
            <li>📋 Browse state laws by category</li>
            <li>🗺️ Find smoker-friendly places on our interactive map</li>
            <li>📍 Submit new places and corrections</li>
            <li>🏆 Earn points and badges for your contributions</li>
            <li>⚖️ Compare laws between states</li>
          </ul>
          
          <div style="display: flex; gap: 10px; margin: 20px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Explore Laws
            </a>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/map" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Map
            </a>
          </div>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
          <p>© 2024 SmokersRights. All rights reserved.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe">Unsubscribe</a></p>
        </div>
      </div>
    `;

    const text = `
      Welcome to SmokersRights!
      
      Thank you for joining SmokersRights! We're your comprehensive resource for smoking and vaping laws across the Southeast United States.
      
      What can you do with SmokersRights?
      - Browse state laws by category
      - Find smoker-friendly places on our interactive map
      - Submit new places and corrections
      - Earn points and badges for your contributions
      - Compare laws between states
      
      Explore now: ${process.env.NEXT_PUBLIC_APP_URL}
    `;

    return { subject, html, text };
  }

  /**
   * Template for weekly digest
   */
  private getWeeklyDigestTemplate(data: any): EmailTemplate {
    const subject = 'SmokersRights - Weekly Digest';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e293b; color: white; padding: 20px; text-align: center;">
          <h1>SmokersRights</h1>
          <p>Weekly Digest</p>
        </div>
        
        <div style="padding: 20px;">
          <h2>📅 This Week's Updates</h2>
          
          ${data.newPlaces > 0 ? `
            <div style="background: #dcfce7; padding: 15px; margin: 10px 0; border-radius: 5px;">
              <h3>📍 New Places Added</h3>
              <p>${data.newPlaces} new smoker-friendly places added this week</p>
            </div>
          ` : ''}
          
          ${data.newLaws > 0 ? `
            <div style="background: #dbeafe; padding: 15px; margin: 10px 0; border-radius: 5px;">
              <h3>📋 Laws Updated</h3>
              <p>${data.newLaws} laws updated this week</p>
            </div>
          ` : ''}
          
          ${data.topContributors.length > 0 ? `
            <div style="background: #fef3c7; padding: 15px; margin: 10px 0; border-radius: 5px;">
              <h3>🏆 Top Contributors</h3>
              <ul>
                ${data.topContributors.map((contributor: any) => `
                  <li>${contributor.name} - ${contributor.points} points</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Latest Updates
          </a>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
          <p>© 2024 SmokersRights. All rights reserved.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe">Unsubscribe</a></p>
        </div>
      </div>
    `;

    const text = `
      SmokersRights - Weekly Digest
      
      This Week's Updates:
      ${data.newPlaces > 0 ? `- ${data.newPlaces} new places added` : ''}
      ${data.newLaws > 0 ? `- ${data.newLaws} laws updated` : ''}
      
      View latest updates: ${process.env.NEXT_PUBLIC_APP_URL}
    `;

    return { subject, html, text };
  }

  /**
   * Get weekly digest data
   */
  private async getWeeklyDigestData(userId: string): Promise<any> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Get new places
    const { count: newPlaces } = await this.supabase
      .from('sr_directory_places')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneWeekAgo.toISOString())
      .eq('status', 'verified');

    // Get new laws
    const { count: newLaws } = await this.supabase
      .from('sr_law_cards')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneWeekAgo.toISOString());

    // Get top contributors
    const { data: topContributors } = await this.supabase
      .from('unified_user_stats')
      .select('points')
      .gt('points', 0)
      .order('points', { ascending: false })
      .limit(5);

    return {
      newPlaces: newPlaces || 0,
      newLaws: newLaws || 0,
      topContributors: topContributors || []
    };
  }

  /**
   * Get state name from code
   */
  private getStateName(code: string): string {
    const states: Record<string, string> = {
      AL: 'Alabama',
      FL: 'Florida',
      MS: 'Mississippi',
      LA: 'Louisiana',
      TN: 'Tennessee',
      KY: 'Kentucky',
      AR: 'Arkansas',
      GA: 'Georgia',
      WV: 'West Virginia',
      SC: 'South Carolina',
    };
    return states[code] || code;
  }
}

export default EmailNotificationService;
