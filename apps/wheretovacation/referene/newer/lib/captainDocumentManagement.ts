/**
 * Captain Document Management System
 * 
 * Centralized repository for captain licenses, insurance certificates, boat documentation, 
 * safety certifications, and business permits with automatic expiration tracking.
 * 
 * Document Categories:
 * - Captain License: USCG Captain License (6-pack, Master)
 * - Vessel Documentation: USCG vessel documentation or state registration
 * - Insurance: Liability insurance certificate ($1M minimum)
 * - Safety Certifications: CPR, First Aid, Safety at Sea
 * - Business Permits: Business license, tax ID
 * - Fishing Permits: For-hire permits, reef permits
 */

export interface CaptainDocument {
  id: string;
  captainId: string;
  documentType: DocumentType;
  documentNumber: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  issueDate: string;
  expirationDate: string;
  verificationStatus: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  notes?: string;
  uploadedAt: string;
  updatedAt: string;
  reminderSent: {
    days90: boolean;
    days60: boolean;
    days30: boolean;
    atExpiration: boolean;
  };
}

export type DocumentType = 
  | 'captain_license'
  | 'vessel_documentation'
  | 'insurance_certificate'
  | 'cpr_certification'
  | 'first_aid_certification'
  | 'safety_at_sea'
  | 'business_license'
  | 'tax_id'
  | 'for_hire_permit'
  | 'reef_permit'
  | 'drug_test'
  | 'background_check';

export type VerificationStatus = 
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'expired'
  | 'suspended';

export interface DocumentRequirement {
  documentType: DocumentType;
  required: boolean;
  description: string;
  minimumCoverage?: number; // For insurance
  validFor?: number; // Days until expires
  renewalWindow?: number; // Days before expiration to renew
}

export interface ExpirationAlert {
  documentId: string;
  captainId: string;
  documentType: DocumentType;
  alertType: '90_days' | '60_days' | '30_days' | 'expired';
  message: string;
  actionRequired: string;
  listingSuspended: boolean;
  sentAt: string;
}

export interface DocumentUploadResponse {
  success: boolean;
  document?: CaptainDocument;
  error?: string;
  validationErrors?: string[];
}

export interface CaptainComplianceStatus {
  captainId: string;
  overallStatus: 'compliant' | 'warning' | 'non_compliant' | 'suspended';
  requiredDocuments: {
    total: number;
    verified: number;
    pending: number;
    expired: number;
    missing: number;
  };
  upcomingExpirations: {
    within30Days: number;
    within60Days: number;
    within90Days: number;
  };
  canAcceptBookings: boolean;
  lastChecked: string;
}

export class CaptainDocumentManagement {
  private static instance: CaptainDocumentManagement;
  private documents: Map<string, CaptainDocument> = new Map();
  private alerts: Map<string, ExpirationAlert[]> = new Map();
  private requirements: Map<DocumentType, DocumentRequirement> = new Map();

  // Document requirements configuration
  private readonly DOCUMENT_REQUIREMENTS: DocumentRequirement[] = [
    {
      documentType: 'captain_license',
      required: true,
      description: 'USCG Captain License (6-pack, Master, or higher)',
      validFor: 365 * 5, // 5 years
      renewalWindow: 90,
    },
    {
      documentType: 'vessel_documentation',
      required: true,
      description: 'USCG vessel documentation or state registration',
      validFor: 365, // 1 year for state, 5 years for federal
      renewalWindow: 60,
    },
    {
      documentType: 'insurance_certificate',
      required: true,
      description: 'Liability insurance certificate (minimum $1M coverage)',
      minimumCoverage: 1000000,
      validFor: 365,
      renewalWindow: 90,
    },
    {
      documentType: 'cpr_certification',
      required: true,
      description: 'CPR certification',
      validFor: 365 * 2, // 2 years
      renewalWindow: 60,
    },
    {
      documentType: 'first_aid_certification',
      required: true,
      description: 'First Aid certification',
      validFor: 365 * 3, // 3 years
      renewalWindow: 90,
    },
    {
      documentType: 'business_license',
      required: true,
      description: 'Business license',
      validFor: 365,
      renewalWindow: 30,
    },
    {
      documentType: 'for_hire_permit',
      required: true,
      description: 'For-hire fishing permit',
      validFor: 365,
      renewalWindow: 60,
    },
    {
      documentType: 'drug_test',
      required: false,
      description: 'DOT drug test (for certain operations)',
      validFor: 180, // 6 months
      renewalWindow: 30,
    },
    {
      documentType: 'background_check',
      required: false,
      description: 'Background check clearance',
      validFor: 365 * 2, // 2 years
      renewalWindow: 60,
    },
  ];

  public static getInstance(): CaptainDocumentManagement {
    if (!CaptainDocumentManagement.instance) {
      CaptainDocumentManagement.instance = new CaptainDocumentManagement();
    }
    return CaptainDocumentManagement.instance;
  }

  private constructor() {
    this.initializeRequirements();
    this.startExpirationMonitoring();
  }

  /**
   * Upload and validate document
   */
  public async uploadDocument(
    captainId: string,
    documentType: DocumentType,
    file: File,
    documentNumber: string,
    issueDate: string,
    expirationDate: string
  ): Promise<DocumentUploadResponse> {
    try {
      // Validate file
      const validationErrors = this.validateFile(file);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: 'File validation failed',
          validationErrors,
        };
      }

      // Validate document data
      const dataValidationErrors = this.validateDocumentData(
        documentType,
        documentNumber,
        issueDate,
        expirationDate
      );
      if (dataValidationErrors.length > 0) {
        return {
          success: false,
          error: 'Document data validation failed',
          validationErrors: dataValidationErrors,
        };
      }

      // Upload file to storage
      const fileUrl = await this.uploadFileToStorage(captainId, file);

      // Create document record
      const document: CaptainDocument = {
        id: crypto.randomUUID(),
        captainId,
        documentType,
        documentNumber,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        issueDate,
        expirationDate,
        verificationStatus: 'pending',
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reminderSent: {
          days90: false,
          days60: false,
          days30: false,
          atExpiration: false,
        },
      };

      // Store document
      this.documents.set(document.id, document);

      // Trigger verification process
      await this.initiateVerification(document.id);

      return {
        success: true,
        document,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get all documents for a captain
   */
  public getCaptainDocuments(captainId: string): CaptainDocument[] {
    return Array.from(this.documents.values()).filter(
      doc => doc.captainId === captainId
    );
  }

  /**
   * Get document by ID
   */
  public getDocument(documentId: string): CaptainDocument | null {
    return this.documents.get(documentId) || null;
  }

  /**
   * Verify document (admin action)
   */
  public async verifyDocument(
    documentId: string,
    adminId: string,
    approved: boolean,
    notes?: string
  ): Promise<boolean> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    document.verificationStatus = approved ? 'verified' : 'rejected';
    document.verifiedBy = adminId;
    document.verifiedAt = new Date().toISOString();
    document.notes = notes;
    document.updatedAt = new Date().toISOString();

    if (!approved && notes) {
      document.rejectionReason = notes;
    }

    this.documents.set(documentId, document);

    // Update captain compliance status
    await this.updateComplianceStatus(document.captainId);

    return true;
  }

  /**
   * Get captain compliance status
   */
  public getComplianceStatus(captainId: string): CaptainComplianceStatus {
    const captainDocs = this.getCaptainDocuments(captainId);
    const requiredDocs = this.DOCUMENT_REQUIREMENTS.filter(req => req.required);

    const stats = {
      total: requiredDocs.length,
      verified: 0,
      pending: 0,
      expired: 0,
      missing: 0,
    };

    const today = new Date();
    const upcomingExpirations = {
      within30Days: 0,
      within60Days: 0,
      within90Days: 0,
    };

    // Check each required document
    requiredDocs.forEach(req => {
      const doc = captainDocs.find(d => d.documentType === req.documentType);
      
      if (!doc) {
        stats.missing++;
      } else {
        switch (doc.verificationStatus) {
          case 'verified':
            stats.verified++;
            // Check upcoming expirations
            const daysUntilExpiration = this.getDaysUntil(doc.expirationDate);
            if (daysUntilExpiration <= 30) upcomingExpirations.within30Days++;
            else if (daysUntilExpiration <= 60) upcomingExpirations.within60Days++;
            else if (daysUntilExpiration <= 90) upcomingExpirations.within90Days++;
            break;
          case 'pending':
            stats.pending++;
            break;
          case 'expired':
          case 'suspended':
            stats.expired++;
            break;
        }
      }
    });

    // Determine overall status
    let overallStatus: 'compliant' | 'warning' | 'non_compliant' | 'suspended';
    let canAcceptBookings: boolean;

    if (stats.expired > 0 || stats.missing > 0) {
      overallStatus = 'non_compliant';
      canAcceptBookings = false;
    } else if (stats.pending > 0 || upcomingExpirations.within30Days > 0) {
      overallStatus = 'warning';
      canAcceptBookings = true;
    } else if (upcomingExpirations.within60Days > 0) {
      overallStatus = 'warning';
      canAcceptBookings = true;
    } else {
      overallStatus = 'compliant';
      canAcceptBookings = true;
    }

    return {
      captainId,
      overallStatus,
      requiredDocuments: stats,
      upcomingExpirations,
      canAcceptBookings,
      lastChecked: new Date().toISOString(),
    };
  }

  /**
   * Get expiration alerts for a captain
   */
  public getExpirationAlerts(captainId: string): ExpirationAlert[] {
    return this.alerts.get(captainId) || [];
  }

  /**
   * Update document
   */
  public async updateDocument(
    documentId: string,
    updates: Partial<Pick<CaptainDocument, 'documentNumber' | 'issueDate' | 'expirationDate' | 'notes'>>
  ): Promise<boolean> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Validate updates
    if (updates.expirationDate) {
      const validationErrors = this.validateDocumentData(
        document.documentType,
        updates.documentNumber || document.documentNumber,
        updates.issueDate || document.issueDate,
        updates.expirationDate
      );
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }
    }

    // Apply updates
    Object.assign(document, updates);
    document.updatedAt = new Date().toISOString();

    // Reset verification status if critical fields changed
    if (updates.documentNumber || updates.expirationDate) {
      document.verificationStatus = 'pending';
      document.verifiedBy = undefined;
      document.verifiedAt = undefined;
    }

    this.documents.set(documentId, document);

    // Update compliance status
    await this.updateComplianceStatus(document.captainId);

    return true;
  }

  /**
   * Delete document
   */
  public async deleteDocument(documentId: string, adminId: string): Promise<boolean> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Delete file from storage
    await this.deleteFileFromStorage(document.fileUrl);

    // Remove document
    this.documents.delete(documentId);

    // Update compliance status
    await this.updateComplianceStatus(document.captainId);

    return true;
  }

  /**
   * Get documents requiring verification
   */
  public getPendingDocuments(): CaptainDocument[] {
    return Array.from(this.documents.values()).filter(
      doc => doc.verificationStatus === 'pending'
    );
  }

  /**
   * Get documents expiring soon
   */
  public getExpiringDocuments(days: number = 30): CaptainDocument[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    return Array.from(this.documents.values()).filter(
      doc => 
        doc.verificationStatus === 'verified' &&
        new Date(doc.expirationDate) <= cutoff
    );
  }

  /**
   * Get document requirements
   */
  public getDocumentRequirements(): DocumentRequirement[] {
    return [...this.DOCUMENT_REQUIREMENTS];
  }

  /**
   * Get requirement for specific document type
   */
  public getDocumentRequirement(documentType: DocumentType): DocumentRequirement | null {
    return this.requirements.get(documentType) || null;
  }

  /**
   * Private helper methods
   */
  private initializeRequirements(): void {
    this.DOCUMENT_REQUIREMENTS.forEach(req => {
      this.requirements.set(req.documentType, req);
    });
  }

  private validateFile(file: File): string[] {
    const errors: string[] = [];
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      errors.push('File type must be PDF, JPEG, or PNG');
    }

    if (file.size > maxSize) {
      errors.push('File size must be less than 10MB');
    }

    if (file.name.length > 255) {
      errors.push('File name must be less than 255 characters');
    }

    return errors;
  }

  private validateDocumentData(
    documentType: DocumentType,
    documentNumber: string,
    issueDate: string,
    expirationDate: string
  ): string[] {
    const errors: string[] = [];
    const requirement = this.requirements.get(documentType);

    if (!documentNumber || documentNumber.trim().length === 0) {
      errors.push('Document number is required');
    }

    if (!issueDate) {
      errors.push('Issue date is required');
    } else {
      const issue = new Date(issueDate);
      if (isNaN(issue.getTime()) || issue > new Date()) {
        errors.push('Invalid issue date');
      }
    }

    if (!expirationDate) {
      errors.push('Expiration date is required');
    } else {
      const expiration = new Date(expirationDate);
      if (isNaN(expiration.getTime()) || expiration <= new Date()) {
        errors.push('Expiration date must be in the future');
      }

      if (requirement?.validFor) {
        const issue = new Date(issueDate);
        const maxExpiration = new Date(issue.getTime() + requirement.validFor * 24 * 60 * 60 * 1000);
        if (expiration > maxExpiration) {
          errors.push(`Expiration date exceeds maximum validity period for ${documentType}`);
        }
      }
    }

    return errors;
  }

  private async uploadFileToStorage(captainId: string, file: File): Promise<string> {
    // In a real implementation, this would upload to Supabase Storage or S3
    // For now, return a mock URL
    const fileExtension = file.name.split('.').pop();
    const fileName = `${captainId}/${Date.now()}.${fileExtension}`;
    return `https://storage.gulfcoastcharters.com/documents/${fileName}`;
  }

  private async deleteFileFromStorage(fileUrl: string): Promise<void> {
    // In a real implementation, this would delete from storage
    console.log(`Deleting file: ${fileUrl}`);
  }

  private async initiateVerification(documentId: string): Promise<void> {
    // In a real implementation, this would trigger OCR and verification process
    console.log(`Initiating verification for document: ${documentId}`);
  }

  private async updateComplianceStatus(captainId: string): Promise<void> {
    // This would trigger business logic based on compliance status
    const status = this.getComplianceStatus(captainId);
    
    if (!status.canAcceptBookings) {
      // Suspend listings
      console.log(`Suspending listings for captain: ${captainId}`);
    }
  }

  private startExpirationMonitoring(): void {
    // Check for expiring documents daily
    setInterval(() => {
      this.checkExpiringDocuments();
    }, 24 * 60 * 60 * 1000); // Daily
  }

  private async checkExpiringDocuments(): Promise<void> {
    const today = new Date();
    
    for (const document of this.documents.values()) {
      if (document.verificationStatus !== 'verified') continue;

      const daysUntil = this.getDaysUntil(document.expirationDate);
      const captainId = document.captainId;

      // Check and send alerts
      if (daysUntil <= 90 && daysUntil > 60 && !document.reminderSent.days90) {
        await this.sendExpirationAlert(document, '90_days');
        document.reminderSent.days90 = true;
      } else if (daysUntil <= 60 && daysUntil > 30 && !document.reminderSent.days60) {
        await this.sendExpirationAlert(document, '60_days');
        document.reminderSent.days60 = true;
      } else if (daysUntil <= 30 && daysUntil > 0 && !document.reminderSent.days30) {
        await this.sendExpirationAlert(document, '30_days');
        document.reminderSent.days30 = true;
      } else if (daysUntil <= 0 && !document.reminderSent.atExpiration) {
        await this.sendExpirationAlert(document, 'expired');
        document.reminderSent.atExpiration = true;
        document.verificationStatus = 'expired';
      }
    }
  }

  private async sendExpirationAlert(
    document: CaptainDocument,
    alertType: '90_days' | '60_days' | '30_days' | 'expired'
  ): Promise<void> {
    const alert: ExpirationAlert = {
      documentId: document.id,
      captainId: document.captainId,
      documentType: document.documentType,
      alertType,
      message: this.getAlertMessage(document, alertType),
      actionRequired: this.getActionRequired(alertType),
      listingSuspended: alertType === 'expired',
      sentAt: new Date().toISOString(),
    };

    // Store alert
    if (!this.alerts.has(document.captainId)) {
      this.alerts.set(document.captainId, []);
    }
    this.alerts.get(document.captainId)!.push(alert);

    // Send notification (email, SMS, in-app)
    console.log(`Sending ${alertType} alert to captain ${document.captainId}: ${alert.message}`);
  }

  private getAlertMessage(document: CaptainDocument, alertType: string): string {
    const docName = this.requirements.get(document.documentType)?.description || document.documentType;
    const daysUntil = this.getDaysUntil(document.expirationDate);

    switch (alertType) {
      case '90_days':
        return `Your ${docName} will expire in ${daysUntil} days on ${new Date(document.expirationDate).toLocaleDateString()}. Please begin the renewal process.`;
      case '60_days':
        return `Reminder: Your ${docName} expires in ${daysUntil} days. Please renew soon to avoid interruption.`;
      case '30_days':
        return `URGENT: Your ${docName} expires in ${daysUntil} days. Renew immediately to maintain your active status.`;
      case 'expired':
        return `Your ${docName} has expired. Your listings have been suspended. Please renew and upload the new document to reactivate your account.`;
      default:
        return `Document expiration alert for ${docName}`;
    }
  }

  private getActionRequired(alertType: string): string {
    switch (alertType) {
      case '90_days':
        return 'Begin renewal process';
      case '60_days':
        return 'Submit renewal application';
      case '30_days':
        return 'Complete renewal immediately';
      case 'expired':
        return 'Renew and upload new document';
      default:
        return 'Contact support';
    }
  }

  private getDaysUntil(expirationDate: string): number {
    const today = new Date();
    const expiration = new Date(expirationDate);
    const diffTime = expiration.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get system statistics
   */
  public getSystemStats(): {
    totalDocuments: number;
    pendingVerifications: number;
    verifiedDocuments: number;
    expiredDocuments: number;
    alertsSent: number;
    compliantCaptains: number;
  } {
    const allDocs = Array.from(this.documents.values());
    const totalAlerts = Array.from(this.alerts.values()).reduce((sum, alerts) => sum + alerts.length, 0);

    return {
      totalDocuments: allDocs.length,
      pendingVerifications: allDocs.filter(d => d.verificationStatus === 'pending').length,
      verifiedDocuments: allDocs.filter(d => d.verificationStatus === 'verified').length,
      expiredDocuments: allDocs.filter(d => d.verificationStatus === 'expired').length,
      alertsSent: totalAlerts,
      compliantCaptains: 0, // Would need captain list to calculate
    };
  }
}

export default CaptainDocumentManagement;
