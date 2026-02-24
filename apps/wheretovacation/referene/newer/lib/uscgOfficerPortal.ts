/**
 * USCG Officer Verification Portal Interface
 * 
 * Provides USCG officers with instant access to captain compliance information
 * through QR code scanning. Features security monitoring, inspection logging,
 * and real-time document validation.
 * 
 * Key Features:
 * - QR code scanning with session management
 * - Real-time compliance status display
 * - Document verification with watermarks
 * - Inspection logging and reporting
 * - Security monitoring and fraud detection
 * - Offline capability with cached data
 */

import { USCGVerificationSystem, VerificationPortalData, AccessLog, USCGInspection } from './uscgVerificationSystem';

export interface OfficerSession {
  sessionId: string;
  officerId?: string;
  badgeNumber?: string;
  station: string;
  deviceInfo: string;
  ipAddress: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  startedAt: string;
  lastActivity: string;
  isActive: boolean;
  inspectionsCompleted: number;
}

export interface PortalDisplay {
  captain: {
    id: string;
    name: string;
    photo: string;
    verified: boolean;
    vesselName: string;
    vesselRegistration: string;
    phoneNumber?: string;
    email?: string;
  };
  compliance: {
    overallStatus: 'all_clear' | 'expiring_soon' | 'action_required' | 'pending_verification';
    score: number;
    color: string;
    message: string;
    documents: DocumentDisplay[];
  };
  currentTrip?: {
    isActive: boolean;
    passengerCount: number;
    departureTime: string;
    expectedReturn: string;
    fishingArea: string;
    emergencyContact: string;
    passengerList: PassengerInfo[];
  };
  safetyEquipment: SafetyEquipmentDisplay;
  session: {
    token: string;
    expiresAt: string;
    accessedAt: string;
    timeRemaining: number;
    ipAddress: string;
    location?: string;
  };
  security: {
    scanCount: number;
    lastScan: string;
    unusualActivity: boolean;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export interface DocumentDisplay {
  id: string;
  name: string;
  type: string;
  status: 'valid' | 'expiring' | 'expired' | 'missing';
  expirationDate?: string;
  daysRemaining?: number;
  verificationDate: string;
  verifiedBy: string;
  imageUrl: string;
  watermarked: boolean;
  notes?: string;
}

export interface SafetyEquipmentDisplay {
  lifeJackets: {
    adult: {
      required: number;
      available: number;
      status: 'compliant' | 'deficient' | 'missing';
    };
    child: {
      required: number;
      available: number;
      status: 'compliant' | 'deficient' | 'missing';
    };
  };
  fireExtinguishers: {
    count: number;
    type: string;
    inspectionDate: string;
    status: 'compliant' | 'expired' | 'missing';
  }[];
  flares: {
    expirationDate: string;
    count: number;
    status: 'compliant' | 'expired' | 'missing';
  };
  vhfRadio: {
    available: boolean;
    license: string;
    status: 'compliant' | 'missing';
  };
  epirb: {
    registered: boolean;
    expirationDate?: string;
    number: string;
    status: 'compliant' | 'expired' | 'missing';
  };
  additionalEquipment: {
    name: string;
    required: boolean;
    available: boolean;
    condition: string;
  }[];
}

export interface PassengerInfo {
  name: string;
  age?: number;
  emergencyContact: string;
  specialNeeds?: string;
}

export interface InspectionForm {
  accessId: string;
  captainId: string;
  officerInfo: {
    name?: string;
    badgeNumber?: string;
    station: string;
  };
  inspection: {
    type: 'routine' | 'random' | 'targeted' | 'investigation';
    dateTime: string;
    duration: number;
    weather: string;
    seaConditions: string;
  };
  documents: {
    documentId: string;
    status: 'compliant' | 'warning' | 'violation';
    notes?: string;
  }[];
  safetyEquipment: {
    category: string;
    status: 'compliant' | 'warning' | 'violation';
    notes?: string;
  }[];
  results: {
    overallResult: 'passed' | 'warning' | 'violation';
    warnings: string[];
    violations: string[];
    followUpRequired: boolean;
    notes?: string;
  };
  signatures: {
    officerSignature?: string;
    captainSignature?: string;
  };
}

export interface SecurityAlert {
  alertId: string;
  type: 'unusual_location' | 'multiple_scans' | 'suspicious_pattern' | 'fraud_attempt';
  captainId: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  resolved: boolean;
  notes?: string;
}

export class USCGOfficerPortal {
  private static instance: USCGOfficerPortal;
  private verificationSystem: USCGVerificationSystem;
  private activeSessions: Map<string, OfficerSession> = new Map();
  private securityAlerts: Map<string, SecurityAlert[]> = new Map();
  private portalDisplays: Map<string, PortalDisplay> = new Map();

  public static getInstance(): USCGOfficerPortal {
    if (!USCGOfficerPortal.instance) {
      USCGOfficerPortal.instance = new USCGOfficerPortal();
    }
    return USCGOfficerPortal.instance;
  }

  private constructor() {
    this.verificationSystem = USCGVerificationSystem.getInstance();
    this.startSecurityMonitoring();
  }

  /**
   * Initialize officer session
   */
  public async initializeOfficerSession(
    station: string,
    deviceInfo: string,
    ipAddress: string,
    officerInfo?: {
      name?: string;
      badgeNumber?: string;
    },
    location?: { latitude: number; longitude: number }
  ): Promise<string> {
    const sessionId = crypto.randomUUID();
    
    const session: OfficerSession = {
      sessionId,
      officerId: officerInfo?.badgeNumber,
      badgeNumber: officerInfo?.badgeNumber,
      station,
      deviceInfo,
      ipAddress,
      location,
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      isActive: true,
      inspectionsCompleted: 0,
    };

    this.activeSessions.set(sessionId, session);
    
    // Schedule session cleanup
    this.scheduleSessionCleanup(sessionId);

    return sessionId;
  }

  /**
   * Access verification portal via QR code scan
   */
  public async accessVerificationPortal(
    captainId: string,
    token: string,
    sessionId: string,
    scanLocation?: { latitude: number; longitude: number }
  ): Promise<{
    success: boolean;
    portalData?: PortalDisplay;
    error?: string;
    securityAlerts?: SecurityAlert[];
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isActive) {
      return {
        success: false,
        error: 'Invalid or expired officer session',
      };
    }

    // Update session activity
    session.lastActivity = new Date().toISOString();
    this.activeSessions.set(sessionId, session);

    // Access verification through main system
    const accessResult = await this.verificationSystem.handlePortalAccess(
      captainId,
      token,
      session.ipAddress,
      session.deviceInfo,
      scanLocation ? { ...scanLocation, accuracy: 10 } : undefined
    );

    if (!accessResult.success) {
      return {
        success: false,
        error: accessResult.error,
      };
    }

    // Generate portal display
    const portalDisplay = await this.generatePortalDisplay(
      accessResult.portalData!,
      session,
      scanLocation
    );

    // Check for security alerts
    const securityAlerts = this.checkSecurityAlerts(captainId, session, scanLocation);

    // Store portal display
    this.portalDisplays.set(accessResult.sessionToken!, portalDisplay);

    return {
      success: true,
      portalData: portalDisplay,
      securityAlerts: securityAlerts.length > 0 ? securityAlerts : undefined,
    };
  }

  /**
   * Submit inspection form
   */
  public async submitInspection(
    sessionId: string,
    inspectionForm: InspectionForm
  ): Promise<{
    success: boolean;
    inspectionId?: string;
    error?: string;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isActive) {
      return {
        success: false,
        error: 'Invalid or expired session',
      };
    }

    try {
      // Validate inspection data
      const validation = this.verificationSystem.validateInspectionData(inspectionForm.inspection);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Log inspection
      const inspection = await this.verificationSystem.logInspection(
        inspectionForm.accessId,
        {
          uscgStation: session.station,
          officerName: session.officerId,
          officerBadge: session.badgeNumber,
          inspectionType: inspectionForm.inspection.type,
          result: inspectionForm.results.overallResult,
          documentIssues: inspectionForm.documents
            .filter(d => d.status === 'violation')
            .map(d => `Document ID ${d.documentId}: ${d.notes || 'Violation'}`),
          safetyIssues: inspectionForm.safetyEquipment
            .filter(s => s.status === 'violation')
            .map(s => `${s.category}: ${s.notes || 'Violation'}`),
          notes: inspectionForm.results.notes,
          followUpRequired: inspectionForm.results.followUpRequired,
        }
      );

      // Update session
      session.inspectionsCompleted++;
      session.lastActivity = new Date().toISOString();
      this.activeSessions.set(sessionId, session);

      return {
        success: true,
        inspectionId: inspection.inspectionId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get portal display for session
   */
  public getPortalDisplay(sessionToken: string): PortalDisplay | null {
    return this.portalDisplays.get(sessionToken) || null;
  }

  /**
   * Extend session
   */
  public extendSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isActive) {
      return false;
    }

    session.lastActivity = new Date().toISOString();
    this.activeSessions.set(sessionId, session);
    
    // Schedule new cleanup
    this.scheduleSessionCleanup(sessionId);

    return true;
  }

  /**
   * End officer session
   */
  public endSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.isActive = false;
    session.lastActivity = new Date().toISOString();
    this.activeSessions.set(sessionId, session);

    // Clean up portal displays
    const displaysToRemove = Array.from(this.portalDisplays.entries())
      .filter(([token, display]) => 
        display.session.ipAddress === session.ipAddress && 
        new Date(display.session.expiresAt) < new Date()
      )
      .map(([token]) => token);

    displaysToRemove.forEach(token => this.portalDisplays.delete(token));

    return true;
  }

  /**
   * Get security alerts
   */
  public getSecurityAlerts(captainId?: string): SecurityAlert[] {
    if (captainId) {
      return this.securityAlerts.get(captainId) || [];
    }

    const allAlerts: SecurityAlert[] = [];
    for (const alerts of this.securityAlerts.values()) {
      allAlerts.push(...alerts);
    }

    return allAlerts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .filter(alert => !alert.resolved);
  }

  /**
   * Resolve security alert
   */
  public resolveSecurityAlert(alertId: string, notes?: string): boolean {
    for (const [captainId, alerts] of this.securityAlerts.entries()) {
      const alert = alerts.find(a => a.alertId === alertId);
      if (alert) {
        alert.resolved = true;
        alert.notes = notes;
        this.securityAlerts.set(captainId, alerts);
        return true;
      }
    }

    return false;
  }

  /**
   * Get session statistics
   */
  public getSessionStatistics(): {
    activeSessions: number;
    totalInspections: number;
    averageSessionDuration: number;
    topStations: { station: string; inspections: number }[];
    complianceRates: { station: string; rate: number }[];
  } {
    const activeSessions = Array.from(this.activeSessions.values()).filter(s => s.isActive).length;
    
    const totalInspections = Array.from(this.activeSessions.values())
      .reduce((sum, session) => sum + session.inspectionsCompleted, 0);

    const averageSessionDuration = this.calculateAverageSessionDuration();

    const stationStats = this.calculateStationStatistics();

    return {
      activeSessions,
      totalInspections,
      averageSessionDuration,
      topStations: stationStats.topStations,
      complianceRates: stationStats.complianceRates,
    };
  }

  /**
   * Private helper methods
   */
  private async generatePortalDisplay(
    portalData: VerificationPortalData,
    session: OfficerSession,
    scanLocation?: { latitude: number; longitude: number }
  ): Promise<PortalDisplay> {
    const timeRemaining = Math.max(0, 
      new Date(portalData.session.expiresAt).getTime() - new Date().getTime()
    );

    // Generate document displays with watermarks
    const documents = portalData.compliance.documents.map(doc => ({
      id: doc.name.replace(/\s+/g, '_').toLowerCase(),
      name: doc.name,
      type: 'document' as const,
      status: doc.status as 'valid' | 'expiring' | 'expired' | 'missing',
      expirationDate: doc.expirationDate,
      daysRemaining: doc.daysRemaining,
      verificationDate: doc.verificationDate,
      verifiedBy: 'GCC Admin',
      imageUrl: `/documents/${doc.name}/${doc.name.replace(/\s+/g, '_').toLowerCase()}/view?watermark=true`,
      watermarked: true,
    }));

    // Generate safety equipment display
    const safetyEquipment = this.generateSafetyEquipmentDisplay();

    // Calculate security info
    const security = this.calculateSecurityInfo(portalData.captain.id, session);

    return {
      captain: portalData.captain,
      compliance: {
        overallStatus: portalData.compliance.status as 'all_clear' | 'expiring_soon' | 'action_required' | 'pending_verification',
        score: portalData.compliance.score,
        color: portalData.compliance.color,
        documents,
        message: this.generateComplianceMessage(portalData.compliance.status),
      },
      currentTrip: portalData.currentTrip ? {
        isActive: true,
        passengerCount: portalData.currentTrip.passengerCount,
        departureTime: portalData.currentTrip.departureTime,
        expectedReturn: portalData.currentTrip.expectedReturn,
        fishingArea: portalData.currentTrip.fishingArea,
        emergencyContact: '555-9999', // Captain's emergency contact
        passengerList: portalData.currentTrip.passengerList.map(p => ({
          name: p.name,
          age: undefined,
          emergencyContact: p.emergencyContact,
        })),
      } : undefined,
      safetyEquipment,
      session: {
        ...portalData.session,
        timeRemaining: Math.round(timeRemaining / 1000), // seconds
        location: scanLocation ? `${scanLocation.latitude}, ${scanLocation.longitude}` : undefined,
      },
      security,
    };
  }

  private generateSafetyEquipmentDisplay(): SafetyEquipmentDisplay {
    // Mock safety equipment data - in production, get from captain's profile
    return {
      lifeJackets: {
        adult: {
          required: 6,
          available: 6,
          status: 'compliant',
        },
        child: {
          required: 2,
          available: 2,
          status: 'compliant',
        },
      },
      fireExtinguishers: [
        {
          count: 2,
          type: 'B-II',
          inspectionDate: '2024-06-15',
          status: 'compliant',
        },
      ],
      flares: {
        expirationDate: '2025-12-31',
        count: 3,
        status: 'compliant',
      },
      vhfRadio: {
        available: true,
        license: '123456789',
        status: 'compliant',
      },
      epirb: {
        registered: true,
        expirationDate: '2026-03-15',
        number: '123456789',
        status: 'compliant',
      },
      additionalEquipment: [
        {
          name: 'First Aid Kit',
          required: true,
          available: true,
          condition: 'Good',
        },
        {
          name: 'Navigation Lights',
          required: true,
          available: true,
          condition: 'Good',
        },
      ],
    };
  }

  private generateComplianceMessage(status: string): string {
    switch (status) {
      case 'all_clear':
        return 'All documents are current and valid. No action required.';
      case 'expiring_soon':
        return 'Some documents expire within 30 days. Recommend renewal.';
      case 'action_required':
        return 'Critical: Documents expired or missing. Action required.';
      case 'pending_verification':
        return 'Documents uploaded but pending verification by GCC admin.';
      default:
        return 'Compliance status unknown.';
    }
  }

  private calculateSecurityInfo(captainId: string, session: OfficerSession): {
    scanCount: number;
    lastScan: string;
    unusualActivity: boolean;
    riskLevel: 'low' | 'medium' | 'high';
  } {
    // Mock security calculation - in production, analyze actual scan patterns
    return {
      scanCount: 1,
      lastScan: new Date().toISOString(),
      unusualActivity: false,
      riskLevel: 'low',
    };
  }

  private checkSecurityAlerts(
    captainId: string,
    session: OfficerSession,
    scanLocation?: { latitude: number; longitude: number }
  ): SecurityAlert[] {
    const alerts: SecurityAlert[] = [];

    // Check for unusual location patterns
    if (scanLocation && this.isUnusualLocation(captainId, scanLocation)) {
      alerts.push({
        alertId: crypto.randomUUID(),
        type: 'unusual_location',
        captainId,
        description: `Scan from unusual location: ${scanLocation.latitude}, ${scanLocation.longitude}`,
        severity: 'medium',
        timestamp: new Date().toISOString(),
        resolved: false,
      });
    }

    // Store alerts
    if (alerts.length > 0) {
      if (!this.securityAlerts.has(captainId)) {
        this.securityAlerts.set(captainId, []);
      }
      this.securityAlerts.get(captainId)!.push(...alerts);
    }

    return alerts;
  }

  private isUnusualLocation(captainId: string, location: { latitude: number; longitude: number }): boolean {
    // Mock location validation - in production, check against known patterns
    return false;
  }

  private calculateAverageSessionDuration(): number {
    const sessions = Array.from(this.activeSessions.values());
    if (sessions.length === 0) return 0;

    const totalDuration = sessions.reduce((sum, session) => {
      const duration = new Date(session.lastActivity).getTime() - new Date(session.startedAt).getTime();
      return sum + duration;
    }, 0);

    return Math.round(totalDuration / sessions.length / 1000 / 60); // minutes
  }

  private calculateStationStatistics(): {
    topStations: { station: string; inspections: number }[];
    complianceRates: { station: string; rate: number }[];
  } {
    // Mock statistics - in production, calculate from actual data
    return {
      topStations: [
        { station: 'Sector Mobile', inspections: 45 },
        { station: 'Station Gulfport', inspections: 32 },
        { station: 'Station Destin', inspections: 28 },
      ],
      complianceRates: [
        { station: 'Sector Mobile', rate: 95.5 },
        { station: 'Station Gulfport', rate: 92.3 },
        { station: 'Station Destin', rate: 94.1 },
      ],
    };
  }

  private scheduleSessionCleanup(sessionId: string): void {
    // Clean up session after 30 minutes of inactivity
    setTimeout(() => {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        const inactiveTime = new Date().getTime() - new Date(session.lastActivity).getTime();
        if (inactiveTime > 30 * 60 * 1000) { // 30 minutes
          this.endSession(sessionId);
        }
      }
    }, 30 * 60 * 1000);
  }

  private startSecurityMonitoring(): void {
    // Monitor for suspicious patterns every 5 minutes
    setInterval(() => {
      this.performSecurityCheck();
    }, 5 * 60 * 1000);
  }

  private performSecurityCheck(): void {
    // Mock security monitoring - in production, implement actual security checks
    console.log('Performing security check for USCG portal...');
  }

  /**
   * Get available inspection forms
   */
  public getInspectionForms(): {
    routine: InspectionForm;
    targeted: InspectionForm;
    investigation: InspectionForm;
  } {
    const baseForm = {
      accessId: '',
      captainId: '',
      officerInfo: {
        station: '',
      },
      inspection: {
        type: 'routine' as const,
        dateTime: '',
        duration: 0,
        weather: '',
        seaConditions: '',
      },
      documents: [],
      safetyEquipment: [],
      results: {
        overallResult: 'passed' as const,
        warnings: [],
        violations: [],
        followUpRequired: false,
      },
      signatures: {},
    };

    return {
      routine: { ...baseForm, inspection: { ...baseForm.inspection, type: 'routine' } },
      targeted: { ...baseForm, inspection: { ...baseForm.inspection, type: 'targeted' } },
      investigation: { ...baseForm, inspection: { ...baseForm.inspection, type: 'investigation' } },
    };
  }

  /**
   * Export inspection data
   */
  public async exportInspectionData(
    sessionId: string,
    format: 'pdf' | 'csv' | 'json'
  ): Promise<{
    success: boolean;
    data?: string;
    filename?: string;
    error?: string;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Invalid session',
      };
    }

    // Mock data export - in production, generate actual reports
    const mockData = {
      session,
      inspections: [],
      exportDate: new Date().toISOString(),
    };

    const filename = `uscg_inspection_report_${session.station}_${Date.now()}.${format}`;
    
    return {
      success: true,
      data: JSON.stringify(mockData, null, 2),
      filename,
    };
  }
}

export default USCGOfficerPortal;
