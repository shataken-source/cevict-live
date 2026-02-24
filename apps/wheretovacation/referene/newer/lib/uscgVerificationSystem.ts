/**
 * USCG Digital Verification System
 * 
 * QR Code Compliance Portal for Charter Captains
 * Instant Document Verification at Sea - "Show your QR code - we handle the rest"
 * 
 * Features:
 * - Secure QR code generation with rotating 24-hour tokens
 * - USCG officer verification portal with 10-minute sessions
 * - Real-time document validation and compliance checking
 * - Access logging and security monitoring
 * - Offline capability with cached data
 * - Inspection logging and reporting
 */

import { CaptainDocumentManagement, CaptainDocument } from './captainDocumentManagement';

export interface VerificationCode {
  codeId: string;
  captainId: string;
  qrCodeData: string;
  secureToken: string;
  tokenExpiresAt: string;
  isActive: boolean;
  createdAt: string;
  lastScannedAt?: string;
  scanCount: number;
}

export interface AccessLog {
  accessId: string;
  codeId: string;
  captainId: string;
  accessedAt: string;
  ipAddress: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  userAgent: string;
  sessionToken: string;
  sessionExpiresAt: string;
  isExpired: boolean;
}

export interface USCGInspection {
  inspectionId: string;
  accessId: string;
  captainId: string;
  inspectionDate: string;
  uscgStation: string;
  officerName?: string;
  officerBadge?: string;
  inspectionType: 'routine' | 'random' | 'targeted' | 'investigation';
  result: 'passed' | 'warning' | 'violation';
  documentIssues: string[];
  safetyIssues: string[];
  notes?: string;
  followUpRequired: boolean;
  duration: number; // seconds
}

export interface CaptainVerificationStatus {
  captainId: string;
  compliance: {
    overallStatus: 'all_clear' | 'expiring_soon' | 'action_required' | 'pending_verification';
    documents: {
      total: number;
      valid: number;
      expiring: number;
      expired: number;
      missing: number;
    };
  };
  complianceScore: number; // 0-100
  lastUpdated: string;
  qrCode: {
    url: string;
    qrImage: string;
    expiresAt: string;
    isActive: boolean;
  };
  recentScans: AccessLog[];
  inspectionHistory: USCGInspection[];
}

export interface QRCodeDisplayOptions {
  type: 'mobile' | 'card' | 'placard';
  format: 'png' | 'svg' | 'pdf';
  size: 'small' | 'medium' | 'large';
  includeInfo: boolean;
}

export interface VerificationPortalData {
  captain: {
    id: string;
    name: string;
    photo: string;
    verified: boolean;
    vesselName: string;
    vesselRegistration: string;
  };
  compliance: {
    status: string;
    score: number;
    color: string;
    documents: {
      name: string;
      status: 'valid' | 'expiring' | 'expired' | 'missing';
      expirationDate?: string;
      daysRemaining?: number;
      verificationDate: string;
    }[];
  };
  currentTrip?: {
    passengerCount: number;
    departureTime: string;
    expectedReturn: string;
    fishingArea: string;
    passengerList: {
      name: string;
      emergencyContact: string;
    }[];
  };
  safetyEquipment: {
    lifeJackets: {
      adult: number;
      child: number;
    };
    fireExtinguishers: {
      type: string;
      inspectionDate: string;
    }[];
    flares: {
      expirationDate: string;
    };
    vhfRadio: boolean;
    epirb: {
      registered: boolean;
      expirationDate?: string;
    };
  };
  session: {
    token: string;
    expiresAt: string;
    accessedAt: string;
    ipAddress: string;
  };
}

export class USCGVerificationSystem {
  private static instance: USCGVerificationSystem;
  private verificationCodes: Map<string, VerificationCode> = new Map();
  private accessLogs: Map<string, AccessLog[]> = new Map();
  private inspections: Map<string, USCGInspection[]> = new Map();
  private documentManager: CaptainDocumentManagement;

  // USCG Stations for Gulf Coast
  private readonly USCG_STATIONS = [
    'Sector Mobile',
    'Station Gulfport',
    'Station Pascagoula',
    'Station Panama City',
    'Station Destin',
    'Station Pensacola',
    'Station Grand Isle',
    'Station Galveston',
    'Station Freeport',
    'Station Port Arthur',
  ];

  public static getInstance(): USCGVerificationSystem {
    if (!USCGVerificationSystem.instance) {
      USCGVerificationSystem.instance = new USCGVerificationSystem();
    }
    return USCGVerificationSystem.instance;
  }

  private constructor() {
    this.documentManager = CaptainDocumentManagement.getInstance();
    this.startTokenRefreshScheduler();
  }

  /**
   * Generate QR code for captain
   */
  public async generateVerificationCode(captainId: string): Promise<{
    url: string;
    qrImage: string;
    expiresAt: string;
  }> {
    // Generate secure token
    const secureToken = this.generateSecureToken();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create verification URL
    const verificationUrl = `https://gulfcoastcharters.com/verify/${captainId}?token=${secureToken}`;

    // Store verification code
    const verificationCode: VerificationCode = {
      codeId: crypto.randomUUID(),
      captainId,
      qrCodeData: verificationUrl,
      secureToken,
      tokenExpiresAt: tokenExpiresAt.toISOString(),
      isActive: true,
      createdAt: new Date().toISOString(),
      scanCount: 0,
    };

    this.verificationCodes.set(verificationCode.codeId, verificationCode);

    // Generate QR code image
    const qrImage = await this.generateQRCodeImage(verificationUrl);

    return {
      url: verificationUrl,
      qrImage,
      expiresAt: tokenExpiresAt.toISOString(),
    };
  }

  /**
   * Get captain's verification status
   */
  public async getCaptainVerificationStatus(captainId: string): Promise<CaptainVerificationStatus> {
    const documents = this.documentManager.getCaptainDocuments(captainId);
    const compliance = this.documentManager.getComplianceStatus(captainId);
    const recentScans = this.getRecentScans(captainId, 10);
    const inspectionHistory = this.getInspectionHistory(captainId, 5);

    // Get current QR code
    const currentCode = this.getCurrentVerificationCode(captainId);
    let qrCode = {
      url: '',
      qrImage: '',
      expiresAt: '',
      isActive: false,
    };

    if (currentCode) {
      const qrData = await this.generateVerificationCode(captainId);
      qrCode = {
        url: qrData.url,
        qrImage: qrData.qrImage,
        expiresAt: qrData.expiresAt,
        isActive: currentCode.isActive && new Date(currentCode.tokenExpiresAt) > new Date(),
      };
    }

    // Determine overall status
    let overallStatus: 'all_clear' | 'expiring_soon' | 'action_required' | 'pending_verification';
    if (compliance.overallStatus === 'compliant') {
      overallStatus = 'all_clear';
    } else if (compliance.overallStatus === 'warning') {
      overallStatus = 'expiring_soon';
    } else if (compliance.overallStatus === 'non_compliant') {
      overallStatus = 'action_required';
    } else {
      overallStatus = 'pending_verification';
    }

    return {
      captainId,
      compliance: {
        overallStatus,
        documents: {
          total: documents.length,
          valid: documents.filter(d => d.verificationStatus === 'verified').length,
          expiring: documents.filter(d => {
            if (!d.expirationDate) return false;
            const daysUntil = Math.ceil((new Date(d.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return daysUntil > 0 && daysUntil <= 30;
          }).length,
          expired: documents.filter(d => {
            if (!d.expirationDate) return false;
            return new Date(d.expirationDate) < new Date();
          }).length,
          missing: documents.filter(d => d.verificationStatus === 'pending').length,
        },
      },
      complianceScore: this.calculateComplianceScore(documents),
      lastUpdated: new Date().toISOString(),
      qrCode,
      recentScans,
      inspectionHistory,
    };
  }

  /**
   * Handle USCG verification portal access
   */
  public async handlePortalAccess(
    captainId: string,
    token: string,
    ipAddress: string,
    userAgent: string,
    location?: { latitude: number; longitude: number; accuracy: number }
  ): Promise<{
    success: boolean;
    sessionToken?: string;
    portalData?: VerificationPortalData;
    error?: string;
  }> {
    // Verify token is valid
    const verificationCode = this.findValidVerificationCode(captainId, token);
    if (!verificationCode) {
      return {
        success: false,
        error: 'Invalid or expired verification code',
      };
    }

    // Generate single-use session token
    const sessionToken = this.generateSecureToken();
    const sessionExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Log access
    const accessLog: AccessLog = {
      accessId: crypto.randomUUID(),
      codeId: verificationCode.codeId,
      captainId,
      accessedAt: new Date().toISOString(),
      ipAddress,
      location,
      userAgent,
      sessionToken,
      sessionExpiresAt: sessionExpiry.toISOString(),
      isExpired: false,
    };

    if (!this.accessLogs.has(captainId)) {
      this.accessLogs.set(captainId, []);
    }
    this.accessLogs.get(captainId)!.push(accessLog);

    // Update verification code
    verificationCode.lastScannedAt = new Date().toISOString();
    verificationCode.scanCount++;
    this.verificationCodes.set(verificationCode.codeId, verificationCode);

    // Send notification to captain
    await this.sendScanNotification(captainId, accessLog);

    // Get portal data
    const portalData = await this.generatePortalData(captainId, accessLog);

    // Schedule session expiration
    this.scheduleSessionExpiration(accessLog.accessId);

    return {
      success: true,
      sessionToken,
      portalData,
    };
  }

  /**
   * Log USCG inspection
   */
  public async logInspection(
    accessId: string,
    inspectionData: Omit<USCGInspection, 'inspectionId' | 'accessId' | 'captainId' | 'inspectionDate' | 'duration'>
  ): Promise<USCGInspection> {
    const accessLog = this.findAccessLog(accessId);
    if (!accessLog) {
      throw new Error('Invalid access session');
    }

    const inspection: USCGInspection = {
      inspectionId: crypto.randomUUID(),
      accessId,
      captainId: accessLog.captainId,
      inspectionDate: new Date().toISOString(),
      duration: 0, // Will be calculated when session ends
      ...inspectionData,
    };

    if (!this.inspections.has(accessLog.captainId)) {
      this.inspections.set(accessLog.captainId, []);
    }
    this.inspections.get(accessLog.captainId)!.push(inspection);

    // Send notification to captain
    await this.sendInspectionNotification(accessLog.captainId, inspection);

    return inspection;
  }

  /**
   * Generate QR code for display options
   */
  public async generateDisplayQR(
    captainId: string,
    options: QRCodeDisplayOptions
  ): Promise<{
    imageData: string;
    format: string;
    size: { width: number; height: number };
  }> {
    const verificationData = await this.generateVerificationCode(captainId);
    
    let size = { width: 300, height: 300 };
    if (options.size === 'small') size = { width: 200, height: 200 };
    if (options.size === 'large') size = { width: 500, height: 500 };

    const qrImage = await this.generateQRCodeImage(
      verificationData.url,
      options.format,
      size
    );

    return {
      imageData: qrImage,
      format: options.format,
      size,
    };
  }

  /**
   * Disable QR code (if lost/stolen)
   */
  public async disableVerificationCode(captainId: string): Promise<boolean> {
    const codes = Array.from(this.verificationCodes.values()).filter(
      code => code.captainId === captainId && code.isActive
    );

    for (const code of codes) {
      code.isActive = false;
      this.verificationCodes.set(code.codeId, code);
    }

    return codes.length > 0;
  }

  /**
   * Get system statistics
   */
  public getSystemStats(): {
    totalCaptains: number;
    activeCodes: number;
    totalScans: number;
    scansToday: number;
    inspectionsThisMonth: number;
    averageComplianceScore: number;
    topStations: { station: string; inspections: number }[];
  } {
    const now = new Date();
    const today = now.toDateString();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalScans = 0;
    let scansToday = 0;
    let inspectionsThisMonth = 0;
    let totalComplianceScore = 0;
    let captainCount = 0;

    const stationCounts: Record<string, number> = {};

    for (const [captainId, scans] of this.accessLogs.entries()) {
      totalScans += scans.length;
      scansToday += scans.filter(s => new Date(s.accessedAt).toDateString() === today).length;

      const inspections = this.inspections.get(captainId) || [];
      inspectionsThisMonth += inspections.filter(i => new Date(i.inspectionDate) >= thisMonth).length;

      inspections.forEach(inspection => {
        stationCounts[inspection.uscgStation] = (stationCounts[inspection.uscgStation] || 0) + 1;
      });

      captainCount++;
    }

    const topStations = Object.entries(stationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([station, inspections]) => ({ station, inspections }));

    const activeCodes = Array.from(this.verificationCodes.values()).filter(
      code => code.isActive && new Date(code.tokenExpiresAt) > now
    ).length;

    return {
      totalCaptains: captainCount,
      activeCodes,
      totalScans,
      scansToday,
      inspectionsThisMonth,
      averageComplianceScore: captainCount > 0 ? totalComplianceScore / captainCount : 0,
      topStations,
    };
  }

  /**
   * Private helper methods
   */
  private generateSecureToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async generateQRCodeImage(
    data: string,
    format: string = 'png',
    size: { width: number; height: number } = { width: 300, height: 300 }
  ): Promise<string> {
    // Mock QR code generation - in production, use a library like qrcode
    const qrData = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
    return qrData;
  }

  private findValidVerificationCode(captainId: string, token: string): VerificationCode | null {
    const codes = Array.from(this.verificationCodes.values()).filter(
      code => 
        code.captainId === captainId &&
        code.secureToken === token &&
        code.isActive &&
        new Date(code.tokenExpiresAt) > new Date()
    );

    return codes.length > 0 ? codes[0] : null;
  }

  private getCurrentVerificationCode(captainId: string): VerificationCode | null {
    const codes = Array.from(this.verificationCodes.values()).filter(
      code => code.captainId === captainId && code.isActive
    );

    return codes.length > 0 ? codes[0] : null;
  }

  private getRecentScans(captainId: string, limit: number): AccessLog[] {
    const scans = this.accessLogs.get(captainId) || [];
    return scans
      .sort((a, b) => new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime())
      .slice(0, limit);
  }

  private getInspectionHistory(captainId: string, limit: number): USCGInspection[] {
    const inspections = this.inspections.get(captainId) || [];
    return inspections
      .sort((a, b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime())
      .slice(0, limit);
  }

  private calculateComplianceScore(documents: CaptainDocument[]): number {
    if (documents.length === 0) return 0;

    const validDocs = documents.filter(doc => doc.verificationStatus === 'verified').length;
    return Math.round((validDocs / documents.length) * 100);
  }

  private findAccessLog(accessId: string): AccessLog | null {
    for (const logs of this.accessLogs.values()) {
      const log = logs.find(l => l.accessId === accessId);
      if (log) return log;
    }
    return null;
  }

  private async generatePortalData(captainId: string, accessLog: AccessLog): Promise<VerificationPortalData> {
    // Mock portal data generation
    return {
      captain: {
        id: captainId,
        name: 'Captain John Smith',
        photo: '/captains/photo.jpg',
        verified: true,
        vesselName: 'The Reel Deal',
        vesselRegistration: 'FL1234AB',
      },
      compliance: {
        status: 'All Clear',
        score: 95,
        color: '#10b981',
        documents: [
          {
            name: 'USCG Captain License',
            status: 'valid',
            expirationDate: '2027-08-15',
            daysRemaining: 600,
            verificationDate: '2024-01-15',
          },
          {
            name: 'Vessel Documentation',
            status: 'valid',
            expirationDate: '2026-06-30',
            daysRemaining: 450,
            verificationDate: '2024-01-15',
          },
        ],
      },
      currentTrip: {
        passengerCount: 4,
        departureTime: '2024-12-19T06:00:00Z',
        expectedReturn: '2024-12-19T14:00:00Z',
        fishingArea: 'Orange Beach',
        passengerList: [
          { name: 'John Doe', emergencyContact: '555-1234' },
          { name: 'Jane Smith', emergencyContact: '555-5678' },
        ],
      },
      safetyEquipment: {
        lifeJackets: { adult: 6, child: 2 },
        fireExtinguishers: [{ type: 'B-II', inspectionDate: '2024-06-15' }],
        flares: { expirationDate: '2025-12-31' },
        vhfRadio: true,
        epirb: { registered: true, expirationDate: '2026-03-15' },
      },
      session: {
        token: accessLog.sessionToken,
        expiresAt: accessLog.sessionExpiresAt,
        accessedAt: accessLog.accessedAt,
        ipAddress: accessLog.ipAddress,
      },
    };
  }

  private async sendScanNotification(captainId: string, accessLog: AccessLog): Promise<void> {
    // Mock notification sending
    console.log(`USCG scan notification sent to captain ${captainId} at ${accessLog.accessedAt}`);
  }

  private async sendInspectionNotification(captainId: string, inspection: USCGInspection): Promise<void> {
    // Mock notification sending
    console.log(`USCG inspection notification sent to captain ${captainId}: ${inspection.result}`);
  }

  private scheduleSessionExpiration(accessId: string): void {
    setTimeout(() => {
      const accessLog = this.findAccessLog(accessId);
      if (accessLog) {
        accessLog.isExpired = true;
      }
    }, 10 * 60 * 1000); // 10 minutes
  }

  private startTokenRefreshScheduler(): void {
    // Refresh tokens every 23 hours to prevent expiration
    setInterval(() => {
      this.refreshExpiringTokens();
    }, 23 * 60 * 60 * 1000);
  }

  private refreshExpiringTokens(): void {
    const now = new Date();
    const refreshThreshold = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour from now

    for (const code of this.verificationCodes.values()) {
      if (code.isActive && new Date(code.tokenExpiresAt) <= refreshThreshold) {
        // Generate new token
        code.secureToken = this.generateSecureToken();
        code.tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        this.verificationCodes.set(code.codeId, code);
      }
    }
  }

  /**
   * Get USCG stations list
   */
  public getUSCGStations(): string[] {
    return [...this.USCG_STATIONS];
  }

  /**
   * Validate inspection data
   */
  public validateInspectionData(data: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.uscgStation || !this.USCG_STATIONS.includes(data.uscgStation)) {
      errors.push('Invalid USCG station');
    }

    if (!data.inspectionType || !['routine', 'random', 'targeted', 'investigation'].includes(data.inspectionType)) {
      errors.push('Invalid inspection type');
    }

    if (!data.result || !['passed', 'warning', 'violation'].includes(data.result)) {
      errors.push('Invalid inspection result');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get captain's QR code display settings
   */
  public getQRDisplaySettings(captainId: string): {
    preferredType: 'mobile' | 'card' | 'placard';
    autoBrightness: boolean;
    showComplianceStatus: boolean;
    offlineEnabled: boolean;
  } {
    // Mock settings - in production, store in database
    return {
      preferredType: 'mobile',
      autoBrightness: true,
      showComplianceStatus: true,
      offlineEnabled: true,
    };
  }

  /**
   * Update QR display settings
   */
  public updateQRDisplaySettings(captainId: string, settings: Partial<{
    preferredType: 'mobile' | 'card' | 'placard';
    autoBrightness: boolean;
    showComplianceStatus: boolean;
    offlineEnabled: boolean;
  }>): void {
    // Mock settings update - in production, store in database
    console.log(`Updated QR display settings for captain ${captainId}:`, settings);
  }
}

export default USCGVerificationSystem;
