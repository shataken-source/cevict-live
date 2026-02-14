/**
 * Rain Check System with Rebooking
 * 
 * Complete rain check infrastructure for GCC
 * Automatic rebooking when trips are cancelled due to weather
 * 
 * Features:
 * - Automatic rain check generation for weather cancellations
 * - Flexible redemption (same captain, different dates, transfer)
 * - 1-year validity with automatic reminders
 * - Split rain checks for multiple trips
 * - Real-time availability checking
 * - Email/SMS notifications
 */

export interface RainCheck {
  id: string;
  code: string;
  originalBookingId: string;
  customerId: string;
  captainId: string;
  originalTripDate: string;
  originalAmount: number;
  currency: string;
  remainingValue: number;
  status: 'active' | 'partially_used' | 'fully_used' | 'expired' | 'cancelled';
  issueReason: 'weather_cancellation' | 'captain_cancellation' | 'customer_cancellation' | 'platform_issue';
  issuedBy: string; // admin ID or system
  issuedAt: string;
  expiresAt: string;
  redemptionHistory: RainCheckRedemption[];
  restrictions: {
    sameCaptainOnly: boolean;
    minAdvanceBooking: number; // days
    blackoutDates: string[];
    validTripTypes: string[];
  };
  notifications: {
    emailSent: boolean;
    smsSent: boolean;
    reminderCount: number;
    lastReminderAt?: string;
  };
  metadata: Record<string, string>;
}

export interface RainCheckRedemption {
  id: string;
  rainCheckId: string;
  bookingId: string;
  amountUsed: number;
  remainingValue: number;
  redeemedAt: string;
  redeemedBy: string;
  notes?: string;
}

export interface RainCheckTemplate {
  id: string;
  name: string;
  conditions: {
    cancellationReasons: string[];
    minimumNoticeHours: number;
    weatherConditions: string[];
    autoIssue: boolean;
  };
  validity: {
    duration: number; // months
    extensions: {
      enabled: boolean;
      maxExtensions: number;
      extensionDuration: number; // months
    };
  };
  restrictions: {
    sameCaptainOnly: boolean;
    transferable: boolean;
    splitable: boolean;
    minAdvanceBooking: number;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    reminderSchedule: number[]; // days before expiration
  };
}

export interface RainCheckAnalytics {
  totalIssued: number;
  totalValue: number;
  redemptionRate: number;
  averageRedemptionTime: number; // days
  expiringSoon: number;
  expired: number;
  topCancellationReasons: { reason: string; count: number }[];
  monthlyIssuance: { month: string; issued: number; redeemed: number }[];
}

export class RainCheckSystem {
  private static instance: RainCheckSystem;
  private rainChecks: Map<string, RainCheck> = new Map();
  private templates: Map<string, RainCheckTemplate> = new Map();
  private redemptionHistory: Map<string, RainCheckRedemption[]> = new Map();

  // Default validity period (1 year)
  private readonly DEFAULT_VALIDITY_MONTHS = 12;
  private readonly REMINDER_SCHEDULE = [90, 60, 30, 14, 7, 3, 1]; // days before expiration

  public static getInstance(): RainCheckSystem {
    if (!RainCheckSystem.instance) {
      RainCheckSystem.instance = new RainCheckSystem();
    }
    return RainCheckSystem.instance;
  }

  private constructor() {
    this.initializeTemplates();
    this.startExpirationScheduler();
    this.startReminderScheduler();
  }

  /**
   * Issue rain check for cancelled booking
   */
  public async issueRainCheck(
    originalBookingId: string,
    customerId: string,
    captainId: string,
    originalTripDate: string,
    originalAmount: number,
    issueReason: RainCheck['issueReason'],
    issuedBy: string,
    customRestrictions?: Partial<RainCheck['restrictions']>
  ): Promise<RainCheck> {
    try {
      const template = this.getTemplateForReason(issueReason);
      const expiresAt = new Date(Date.now() + template.validity.duration * 30 * 24 * 60 * 60 * 1000);

      const rainCheck: RainCheck = {
        id: crypto.randomUUID(),
        code: this.generateRainCheckCode(),
        originalBookingId,
        customerId,
        captainId,
        originalTripDate,
        originalAmount,
        currency: 'usd',
        remainingValue: originalAmount,
        status: 'active',
        issueReason,
        issuedBy,
        issuedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        redemptionHistory: [],
        restrictions: {
          sameCaptainOnly: template.restrictions.sameCaptainOnly,
          minAdvanceBooking: template.restrictions.minAdvanceBooking,
          blackoutDates: [],
          validTripTypes: [],
          ...customRestrictions,
        },
        notifications: {
          emailSent: false,
          smsSent: false,
          reminderCount: 0,
        },
        metadata: {
          templateId: template.id,
          platform: 'gulfcoastcharters',
        },
      };

      this.rainChecks.set(rainCheck.id, rainCheck);

      // Send notifications
      await this.sendRainCheckNotifications(rainCheck);

      return rainCheck;
    } catch (error) {
      throw new Error(`Failed to issue rain check: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Redeem rain check for new booking
   */
  public async redeemRainCheck(
    rainCheckId: string,
    newBookingId: string,
    amountToUse: number,
    redeemedBy: string,
    notes?: string
  ): Promise<RainCheckRedemption> {
    try {
      const rainCheck = this.rainChecks.get(rainCheckId);
      if (!rainCheck) {
        throw new Error('Rain check not found');
      }

      if (rainCheck.status !== 'active' && rainCheck.status !== 'partially_used') {
        throw new Error(`Rain check is ${rainCheck.status}`);
      }

      if (rainCheck.remainingValue < amountToUse) {
        throw new Error('Insufficient rain check value');
      }

      if (new Date(rainCheck.expiresAt) < new Date()) {
        rainCheck.status = 'expired';
        this.rainChecks.set(rainCheckId, rainCheck);
        throw new Error('Rain check has expired');
      }

      // Validate booking restrictions
      await this.validateBookingRestrictions(rainCheck, newBookingId);

      // Create redemption record
      const redemption: RainCheckRedemption = {
        id: crypto.randomUUID(),
        rainCheckId,
        bookingId: newBookingId,
        amountUsed: amountToUse,
        remainingValue: rainCheck.remainingValue - amountToUse,
        redeemedAt: new Date().toISOString(),
        redeemedBy,
        notes,
      };

      // Update rain check
      rainCheck.remainingValue -= amountToUse;
      rainCheck.redemptionHistory.push(redemption);

      if (rainCheck.remainingValue <= 0) {
        rainCheck.status = 'fully_used';
      } else {
        rainCheck.status = 'partially_used';
      }

      this.rainChecks.set(rainCheckId, rainCheck);

      // Store redemption history
      if (!this.redemptionHistory.has(rainCheckId)) {
        this.redemptionHistory.set(rainCheckId, []);
      }
      this.redemptionHistory.get(rainCheckId)!.push(redemption);

      return redemption;
    } catch (error) {
      throw new Error(`Failed to redeem rain check: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Split rain check into multiple checks
   */
  public async splitRainCheck(
    rainCheckId: string,
    splitAmounts: number[],
    splitReason: string,
    splitBy: string
  ): Promise<RainCheck[]> {
    try {
      const originalRainCheck = this.rainChecks.get(rainCheckId);
      if (!originalRainCheck) {
        throw new Error('Rain check not found');
      }

      if (originalRainCheck.status !== 'active') {
        throw new Error(`Cannot split rain check in ${originalRainCheck.status} status`);
      }

      const totalSplitAmount = splitAmounts.reduce((sum, amount) => sum + amount, 0);
      if (totalSplitAmount > originalRainCheck.remainingValue) {
        throw new Error('Split amounts exceed rain check value');
      }

      const newRainChecks: RainCheck[] = [];

      for (const amount of splitAmounts) {
        const newRainCheck = await this.issueRainCheck(
          originalRainCheck.originalBookingId,
          originalRainCheck.customerId,
          originalRainCheck.captainId,
          originalRainCheck.originalTripDate,
          amount,
          'platform_issue', // Split rain checks are platform-initiated
          splitBy,
          originalRainCheck.restrictions
        );

        // Update metadata to indicate split
        newRainCheck.metadata = {
          ...newRainCheck.metadata,
          splitFrom: rainCheckId,
          splitReason,
          originalIssueDate: originalRainCheck.issuedAt,
        };

        newRainChecks.push(newRainCheck);
      }

      // Update original rain check
      originalRainCheck.remainingValue -= totalSplitAmount;
      if (originalRainCheck.remainingValue <= 0) {
        originalRainCheck.status = 'fully_used';
      } else {
        originalRainCheck.status = 'partially_used';
      }

      this.rainChecks.set(rainCheckId, originalRainCheck);

      return newRainChecks;
    } catch (error) {
      throw new Error(`Failed to split rain check: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transfer rain check to another customer
   */
  public async transferRainCheck(
    rainCheckId: string,
    newCustomerId: string,
    transferReason: string,
    transferredBy: string
  ): Promise<boolean> {
    try {
      const rainCheck = this.rainChecks.get(rainCheckId);
      if (!rainCheck) {
        return false;
      }

      if (rainCheck.status !== 'active') {
        return false;
      }

      if (rainCheck.restrictions.sameCaptainOnly && rainCheck.captainId) {
        // Cannot transfer if restricted to same captain
        return false;
      }

      // Create transfer record
      const transferRecord = {
        originalCustomerId: rainCheck.customerId,
        newCustomerId,
        transferReason,
        transferredBy,
        transferredAt: new Date().toISOString(),
      };

      // Update rain check
      rainCheck.customerId = newCustomerId;
      rainCheck.metadata = {
        ...rainCheck.metadata,
        transferred: 'true',
        transferRecord: JSON.stringify(transferRecord),
      };

      this.rainChecks.set(rainCheckId, rainCheck);

      // Send notifications
      await this.sendTransferNotifications(rainCheck, transferRecord);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extend rain check validity
   */
  public async extendRainCheck(
    rainCheckId: string,
    extensionMonths: number,
    reason: string,
    extendedBy: string
  ): Promise<boolean> {
    try {
      const rainCheck = this.rainChecks.get(rainCheckId);
      if (!rainCheck) {
        return false;
      }

      if (rainCheck.status !== 'active' && rainCheck.status !== 'partially_used') {
        return false;
      }

      const template = this.templates.get(rainCheck.metadata.templateId);
      if (!template || !template.validity.extensions.enabled) {
        return false;
      }

      // Check extension limit
      const extensionCount = parseInt(rainCheck.metadata.extensionCount || '0');
      if (extensionCount >= template.validity.extensions.maxExtensions) {
        return false;
      }

      // Extend expiration date
      const currentExpiry = new Date(rainCheck.expiresAt);
      const newExpiry = new Date(currentExpiry.getTime() + extensionMonths * 30 * 24 * 60 * 60 * 1000);
      
      rainCheck.expiresAt = newExpiry.toISOString();
      rainCheck.metadata = {
        ...rainCheck.metadata,
        extensionCount: (extensionCount + 1).toString(),
        lastExtensionReason: reason,
        lastExtendedBy: extendedBy,
        lastExtendedAt: new Date().toISOString(),
      };

      this.rainChecks.set(rainCheckId, rainCheck);

      // Send notification
      await this.sendExtensionNotification(rainCheck, extensionMonths, reason);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get customer's rain checks
   */
  public async getCustomerRainChecks(
    customerId: string,
    status?: RainCheck['status'],
    includeExpired: boolean = false
  ): Promise<RainCheck[]> {
    const customerChecks: RainCheck[] = [];
    
    for (const rainCheck of this.rainChecks.values()) {
      if (rainCheck.customerId === customerId) {
        if (status && rainCheck.status !== status) {
          continue;
        }
        if (!includeExpired && rainCheck.status === 'expired') {
          continue;
        }
        customerChecks.push(rainCheck);
      }
    }

    return customerChecks.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
  }

  /**
   * Check rain check availability
   */
  public async checkRainCheckAvailability(
    rainCheckId: string,
    requestedDate: string,
    captainId?: string
  ): Promise<{
    available: boolean;
    restrictions: string[];
    alternativeDates?: string[];
  }> {
    try {
      const rainCheck = this.rainChecks.get(rainCheckId);
      if (!rainCheck) {
        return { available: false, restrictions: ['Rain check not found'] };
      }

      const restrictions: string[] = [];

      // Check status
      if (rainCheck.status !== 'active' && rainCheck.status !== 'partially_used') {
        restrictions.push(`Rain check is ${rainCheck.status}`);
      }

      // Check expiration
      if (new Date(rainCheck.expiresAt) < new Date()) {
        restrictions.push('Rain check has expired');
      }

      // Check captain restriction
      if (rainCheck.restrictions.sameCaptainOnly && captainId && captainId !== rainCheck.captainId) {
        restrictions.push('Rain check is restricted to original captain');
      }

      // Check advance booking requirement
      const daysUntilTrip = Math.ceil((new Date(requestedDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      if (daysUntilTrip < rainCheck.restrictions.minAdvanceBooking) {
        restrictions.push(`Booking must be made at least ${rainCheck.restrictions.minAdvanceBooking} days in advance`);
      }

      // Check blackout dates
      const requestedDateStr = new Date(requestedDate).toDateString();
      for (const blackoutDate of rainCheck.restrictions.blackoutDates) {
        if (new Date(blackoutDate).toDateString() === requestedDateStr) {
          restrictions.push('Requested date is a blackout date');
          break;
        }
      }

      // Get alternative dates if restrictions apply
      let alternativeDates: string[] | undefined;
      if (restrictions.length > 0) {
        alternativeDates = await this.getAlternativeDates(rainCheck, requestedDate);
      }

      return {
        available: restrictions.length === 0,
        restrictions,
        alternativeDates,
      };
    } catch (error) {
      return { available: false, restrictions: ['Error checking availability'] };
    }
  }

  /**
   * Get rain check analytics
   */
  public async getRainCheckAnalytics(startDate?: Date, endDate?: Date): Promise<RainCheckAnalytics> {
    const allChecks = Array.from(this.rainChecks.values());
    
    let filteredChecks = allChecks;
    if (startDate || endDate) {
      filteredChecks = allChecks.filter(check => {
        const checkDate = new Date(check.issuedAt);
        const afterStart = !startDate || checkDate >= startDate;
        const beforeEnd = !endDate || checkDate <= endDate;
        return afterStart && beforeEnd;
      });
    }

    const totalIssued = filteredChecks.length;
    const totalValue = filteredChecks.reduce((sum, check) => sum + check.originalAmount, 0);
    const redeemedChecks = filteredChecks.filter(check => 
      check.status === 'fully_used' || check.status === 'partially_used'
    );
    const redemptionRate = totalIssued > 0 ? (redeemedChecks.length / totalIssued) * 100 : 0;

    // Calculate average redemption time
    const redemptionTimes = redeemedChecks.map(check => {
      if (check.redemptionHistory.length > 0) {
        const firstRedemption = check.redemptionHistory[0];
        const daysToRedeem = Math.ceil(
          (new Date(firstRedemption.redeemedAt).getTime() - new Date(check.issuedAt).getTime()) / (24 * 60 * 60 * 1000)
        );
        return daysToRedeem;
      }
      return 0;
    }).filter(time => time > 0);
    
    const averageRedemptionTime = redemptionTimes.length > 0 
      ? redemptionTimes.reduce((sum, time) => sum + time, 0) / redemptionTimes.length 
      : 0;

    const expiringSoon = filteredChecks.filter(check => {
      const daysUntilExpiry = Math.ceil((new Date(check.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0 && check.status === 'active';
    }).length;

    const expired = filteredChecks.filter(check => check.status === 'expired').length;

    // Calculate top cancellation reasons
    const reasonCounts: Record<string, number> = {};
    filteredChecks.forEach(check => {
      reasonCounts[check.issueReason] = (reasonCounts[check.issueReason] || 0) + 1;
    });

    const topCancellationReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate monthly issuance
    const monthlyData: Record<string, { issued: number; redeemed: number }> = {};
    filteredChecks.forEach(check => {
      const month = new Date(check.issuedAt).toISOString().slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { issued: 0, redeemed: 0 };
      }
      monthlyData[month].issued += 1;
      
      if (check.status === 'fully_used' || check.status === 'partially_used') {
        monthlyData[month].redeemed += 1;
      }
    });

    const monthlyIssuance = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      issued: data.issued,
      redeemed: data.redeemed,
    }));

    return {
      totalIssued,
      totalValue,
      redemptionRate,
      averageRedemptionTime,
      expiringSoon,
      expired,
      topCancellationReasons,
      monthlyIssuance,
    };
  }

  /**
   * Cancel rain check
   */
  public async cancelRainCheck(rainCheckId: string, reason: string, cancelledBy: string): Promise<boolean> {
    try {
      const rainCheck = this.rainChecks.get(rainCheckId);
      if (!rainCheck) {
        return false;
      }

      if (rainCheck.status !== 'active' && rainCheck.status !== 'partially_used') {
        return false;
      }

      rainCheck.status = 'cancelled';
      rainCheck.metadata = {
        ...rainCheck.metadata,
        cancellationReason: reason,
        cancelledBy,
        cancelledAt: new Date().toISOString(),
      };

      this.rainChecks.set(rainCheckId, rainCheck);

      // Send cancellation notification
      await this.sendCancellationNotification(rainCheck, reason);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Private helper methods
   */
  private generateRainCheckCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'RAIN-';
    for (let i = 0; i < 10; i++) {
      if (i > 0 && i % 3 === 0) code += '-';
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  private getTemplateForReason(reason: RainCheck['issueReason']): RainCheckTemplate {
    const templateId = reason === 'weather_cancellation' ? 'weather' : 'standard';
    return this.templates.get(templateId) || this.templates.get('standard')!;
  }

  private async validateBookingRestrictions(rainCheck: RainCheck, bookingId: string): Promise<void> {
    // In production, this would validate against the actual booking
    // For now, just check basic restrictions
    console.log(`Validating booking ${bookingId} against rain check restrictions`);
  }

  private async sendRainCheckNotifications(rainCheck: RainCheck): Promise<void> {
    // Send email and SMS notifications
    console.log(`Sending rain check notifications for ${rainCheck.code}`);
    rainCheck.notifications.emailSent = true;
    rainCheck.notifications.smsSent = true;
    this.rainChecks.set(rainCheck.id, rainCheck);
  }

  private async sendTransferNotifications(rainCheck: RainCheck, transferRecord: any): Promise<void> {
    console.log(`Sending transfer notifications for rain check ${rainCheck.code}`);
  }

  private async sendExtensionNotification(rainCheck: RainCheck, extensionMonths: number, reason: string): Promise<void> {
    console.log(`Sending extension notification for rain check ${rainCheck.code}`);
  }

  private async sendCancellationNotification(rainCheck: RainCheck, reason: string): Promise<void> {
    console.log(`Sending cancellation notification for rain check ${rainCheck.code}`);
  }

  private async getAlternativeDates(rainCheck: RainCheck, requestedDate: string): Promise<string[]> {
    // Generate alternative dates around the requested date
    const alternatives: string[] = [];
    const requestDate = new Date(requestedDate);
    
    for (let i = 1; i <= 7; i++) {
      const beforeDate = new Date(requestDate.getTime() - i * 24 * 60 * 60 * 1000);
      const afterDate = new Date(requestDate.getTime() + i * 24 * 60 * 60 * 1000);
      
      alternatives.push(beforeDate.toISOString().split('T')[0]);
      alternatives.push(afterDate.toISOString().split('T')[0]);
    }

    return alternatives.slice(0, 5); // Return top 5 alternatives
  }

  private initializeTemplates(): void {
    // Weather cancellation template
    this.templates.set('weather', {
      id: 'weather',
      name: 'Weather Cancellation Rain Check',
      conditions: {
        cancellationReasons: ['weather_cancellation'],
        minimumNoticeHours: 2,
        weatherConditions: ['storm', 'high_winds', 'heavy_rain', 'rough_seas'],
        autoIssue: true,
      },
      validity: {
        duration: 12,
        extensions: {
          enabled: true,
          maxExtensions: 2,
          extensionDuration: 3,
        },
      },
      restrictions: {
        sameCaptainOnly: false,
        transferable: true,
        splitable: true,
        minAdvanceBooking: 24,
      },
      notifications: {
        email: true,
        sms: true,
        reminderSchedule: this.REMINDER_SCHEDULE,
      },
    });

    // Standard template
    this.templates.set('standard', {
      id: 'standard',
      name: 'Standard Rain Check',
      conditions: {
        cancellationReasons: ['captain_cancellation', 'platform_issue'],
        minimumNoticeHours: 24,
        weatherConditions: [],
        autoIssue: false,
      },
      validity: {
        duration: 12,
        extensions: {
          enabled: true,
          maxExtensions: 1,
          extensionDuration: 3,
        },
      },
      restrictions: {
        sameCaptainOnly: true,
        transferable: false,
        splitable: false,
        minAdvanceBooking: 48,
      },
      notifications: {
        email: true,
        sms: false,
        reminderSchedule: this.REMINDER_SCHEDULE,
      },
    });
  }

  private startExpirationScheduler(): void {
    // Check for expired rain checks daily
    setInterval(() => {
      this.checkExpiredRainChecks();
    }, 24 * 60 * 60 * 1000);
  }

  private startReminderScheduler(): void {
    // Send expiration reminders daily
    setInterval(() => {
      this.sendExpirationReminders();
    }, 24 * 60 * 60 * 1000);
  }

  private checkExpiredRainChecks(): void {
    const now = new Date();
    
    for (const [id, rainCheck] of this.rainChecks.entries()) {
      if (rainCheck.status === 'active' && new Date(rainCheck.expiresAt) < now) {
        rainCheck.status = 'expired';
        this.rainChecks.set(id, rainCheck);
        
        console.log(`Rain check ${rainCheck.code} has expired`);
      }
    }
  }

  private sendExpirationReminders(): void {
    const now = new Date();
    
    for (const [id, rainCheck] of this.rainChecks.entries()) {
      if (rainCheck.status !== 'active') continue;

      const daysUntilExpiry = Math.ceil((new Date(rainCheck.expiresAt).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      
      if (this.REMINDER_SCHEDULE.includes(daysUntilExpiry)) {
        console.log(`Sending expiration reminder for rain check ${rainCheck.code} (${daysUntilExpiry} days remaining)`);
        rainCheck.notifications.reminderCount++;
        rainCheck.notifications.lastReminderAt = now.toISOString();
        this.rainChecks.set(id, rainCheck);
      }
    }
  }

  /**
   * Get rain check by code
   */
  public async getRainCheckByCode(code: string): Promise<RainCheck | null> {
    for (const rainCheck of this.rainChecks.values()) {
      if (rainCheck.code === code) {
        return rainCheck;
      }
    }
    return null;
  }
}

export default RainCheckSystem;
