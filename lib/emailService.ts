/**
 * Email Service using Nodemailer
 *
 * Handles email notifications for user updates, submissions, and platform communications
 */

import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailMessage {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

interface EmailResponse {
  messageId: string;
  status: string;
  to: string | string[];
  subject: string;
}

export class EmailService {
  private static instance: EmailService;
  // Using any here to avoid requiring full @types/nodemailer in the build.
  // At runtime this is the Nodemailer transporter instance created by createTransport.
  private transporter: any;
  private config: EmailConfig;

  constructor() {
    this.config = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASS!,
      },
    };

    if (!this.config.auth.user || !this.config.auth.pass) {
      console.warn('Email service not configured - using mock implementation');
    }

    this.transporter = nodemailer.createTransport(this.config);
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send an email
   */
  async sendEmail(message: EmailMessage): Promise<EmailResponse> {
    // Mock implementation for development
    if (!this.config.auth.user) {
      console.log('Mock email sending:', message);
      return {
        messageId: 'mock_' + Math.random().toString(36).substr(2, 9),
        status: 'sent',
        to: message.to,
        subject: message.subject,
      };
    }

    try {
      const mailOptions = {
        from: `"SmokersRights" <${this.config.auth.user}>`,
        to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments,
      };

      const response = await this.transporter.sendMail(mailOptions);

      return {
        messageId: response.messageId,
        status: 'sent',
        to: message.to,
        subject: message.subject,
      };
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to: string, firstName?: string): Promise<EmailResponse> {
    const subject = 'Welcome to SmokersRights!';
    const html = this.generateWelcomeEmailHTML(firstName);
    const text = this.generateWelcomeEmailText(firstName);

    return this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send submission confirmation
   */
  async sendSubmissionConfirmation(
    to: string,
    submissionType: string,
    trackingId: string
  ): Promise<EmailResponse> {
    const subject = `Your ${submissionType} submission has been received`;
    const html = this.generateSubmissionConfirmationHTML(submissionType, trackingId);
    const text = this.generateSubmissionConfirmationText(submissionType, trackingId);

    return this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send submission status update
   */
  async sendSubmissionStatusUpdate(
    to: string,
    submissionType: string,
    status: string,
    feedback?: string
  ): Promise<EmailResponse> {
    const subject = `Your ${submissionType} submission has been ${status}`;
    const html = this.generateStatusUpdateHTML(submissionType, status, feedback);
    const text = this.generateStatusUpdateText(submissionType, status, feedback);

    return this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send weekly digest
   */
  async sendWeeklyDigest(
    to: string,
    stats: {
      newLaws: number;
      newPlaces: number;
      popularStates: string[];
    }
  ): Promise<EmailResponse> {
    const subject = 'Your SmokersRights Weekly Digest';
    const html = this.generateWeeklyDigestHTML(stats);
    const text = this.generateWeeklyDigestText(stats);

    return this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send law change alert
   */
  async sendLawChangeAlert(
    to: string,
    state: string,
    category: string,
    changes: string[]
  ): Promise<EmailResponse> {
    const subject = `Law Update: ${state} ${category} Regulations Changed`;
    const html = this.generateLawChangeAlertHTML(state, category, changes);
    const text = this.generateLawChangeAlertText(state, category, changes);

    return this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(to: string, resetToken: string): Promise<EmailResponse> {
    const subject = 'Reset your SmokersRights password';
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`;
    const html = this.generatePasswordResetHTML(resetUrl);
    const text = this.generatePasswordResetText(resetUrl);

    return this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(to: string, verifyToken: string): Promise<EmailResponse> {
    const subject = 'Verify your SmokersRights email address';
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${verifyToken}`;
    const html = this.generateEmailVerificationHTML(verifyUrl);
    const text = this.generateEmailVerificationText(verifyUrl);

    return this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  // HTML Template Generators
  private generateWelcomeEmailHTML(firstName?: string): string {
    const greeting = firstName ? `Hi ${firstName},` : 'Hello,';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to SmokersRights</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e293b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to SmokersRights</h1>
          </div>
          <div class="content">
            <p>${greeting}</p>
            <p>Thank you for joining SmokersRights! Your platform for civil liberties and harm reduction information.</p>
            <p>Here's what you can do:</p>
            <ul>
              <li>Browse smoking and vaping laws by state</li>
              <li>Find smoker-friendly places near you</li>
              <li>Compare laws between different states</li>
              <li>Submit new places and corrections</li>
            </ul>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}" class="button">Get Started</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; 2024 SmokersRights. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateWelcomeEmailText(firstName?: string): string {
    const greeting = firstName ? `Hi ${firstName},` : 'Hello,';

    return `
${greeting}

Thank you for joining SmokersRights! Your platform for civil liberties and harm reduction information.

Here's what you can do:
- Browse smoking and vaping laws by state
- Find smoker-friendly places near you
- Compare laws between different states
- Submit new places and corrections

Get started: ${process.env.NEXT_PUBLIC_APP_URL}

© 2024 SmokersRights. All rights reserved.
    `;
  }

  private generateSubmissionConfirmationHTML(submissionType: string, trackingId: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Submission Received</h2>
        <p>Your ${submissionType} submission has been received and is now under review.</p>
        <p><strong>Tracking ID:</strong> ${trackingId}</p>
        <p>We'll notify you once our team has reviewed your submission.</p>
        <p>You can track the status of your submission in your profile.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px;">View Your Profile</a>
      </div>
    `;
  }

  private generateSubmissionConfirmationText(submissionType: string, trackingId: string): string {
    return `
Submission Received

Your ${submissionType} submission has been received and is now under review.

Tracking ID: ${trackingId}

We'll notify you once our team has reviewed your submission. You can track the status of your submission in your profile.

View your profile: ${process.env.NEXT_PUBLIC_APP_URL}/profile
    `;
  }

  private generateStatusUpdateHTML(submissionType: string, status: string, feedback?: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Submission Update</h2>
        <p>Your ${submissionType} submission has been <strong>${status}</strong>.</p>
        ${feedback ? `<p><strong>Feedback:</strong> ${feedback}</p>` : ''}
        <p>Thank you for contributing to the SmokersRights community!</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px;">Visit Platform</a>
      </div>
    `;
  }

  private generateStatusUpdateText(submissionType: string, status: string, feedback?: string): string {
    return `
Submission Update

Your ${submissionType} submission has been ${status}.
${feedback ? `Feedback: ${feedback}` : ''}

Thank you for contributing to the SmokersRights community!

Visit platform: ${process.env.NEXT_PUBLIC_APP_URL}
    `;
  }

  private generateWeeklyDigestHTML(stats: { newLaws: number; newPlaces: number; popularStates: string[] }): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Weekly Digest</h2>
        <p>Here's what's new on SmokersRights this week:</p>
        <ul>
          <li>${stats.newLaws} new laws added</li>
          <li>${stats.newPlaces} new places discovered</li>
          <li>Popular states: ${stats.popularStates.join(', ')}</li>
        </ul>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px;">Explore Updates</a>
      </div>
    `;
  }

  private generateWeeklyDigestText(stats: { newLaws: number; newPlaces: number; popularStates: string[] }): string {
    return `
Weekly Digest

Here's what's new on SmokersRights this week:
- ${stats.newLaws} new laws added
- ${stats.newPlaces} new places discovered
- Popular states: ${stats.popularStates.join(', ')}

Explore updates: ${process.env.NEXT_PUBLIC_APP_URL}
    `;
  }

  private generateLawChangeAlertHTML(state: string, category: string, changes: string[]): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Law Update Alert</h2>
        <p>${state} ${category} regulations have been updated:</p>
        <ul>
          ${changes.map(change => `<li>${change}</li>`).join('')}
        </ul>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px;">Learn More</a>
      </div>
    `;
  }

  private generateLawChangeAlertText(state: string, category: string, changes: string[]): string {
    return `
Law Update Alert

${state} ${category} regulations have been updated:
${changes.map(change => `- ${change}`).join('\n')}

Learn more: ${process.env.NEXT_PUBLIC_APP_URL}
    `;
  }

  private generatePasswordResetHTML(resetUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>Click the link below to reset your SmokersRights password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
      </div>
    `;
  }

  private generatePasswordResetText(resetUrl: string): string {
    return `
Reset Your Password

Click the link below to reset your SmokersRights password:
${resetUrl}

This link will expire in 1 hour.
    `;
  }

  private generateEmailVerificationHTML(verifyUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify Your Email</h2>
        <p>Click the link below to verify your SmokersRights email address:</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px;">Verify Email</a>
      </div>
    `;
  }

  private generateEmailVerificationText(verifyUrl: string): string {
    return `
Verify Your Email

Click the link below to verify your SmokersRights email address:
${verifyUrl}
    `;
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service connection test failed:', error);
      return false;
    }
  }
}

export default EmailService;
