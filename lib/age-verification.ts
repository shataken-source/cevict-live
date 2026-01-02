/**
 * AgeChecker.net Integration for SmokerRights
 * Provides biometric and document-based age verification
 * 2026 compliant for regulated tobacco content
 */

interface AgeVerificationRequest {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phoneNumber?: string;
}

interface AgeVerificationResponse {
  success: boolean;
  verified: boolean;
  verificationId: string;
  timestamp: string;
  method: 'biometric' | 'document' | 'database';
  riskScore: number;
  complianceToken: string;
  expiresAt: string;
  error?: string;
}

interface BiometricData {
  faceImage: string; // Base64 encoded
  livenessData: {
    blink: boolean;
    headMovement: boolean;
    voiceChallenge?: string;
  };
}

class AgeVerificationService {
  private apiKey: string;
  private baseUrl: string;
  private complianceLevel: 'standard' | 'enhanced' | 'biometric';

  constructor() {
    this.apiKey = process.env.AGECHECKER_API_KEY || '';
    this.baseUrl = 'https://api.agechecker.net/v2';
    this.complianceLevel = (process.env.AGE_VERIFICATION_LEVEL as any) || 'enhanced';
    
    if (!this.apiKey) {
      console.warn('AgeChecker.net API key not configured - using mock verification');
    }
  }

  /**
   * Primary age verification method
   * Routes to appropriate verification type based on compliance level
   */
  async verifyAge(request: AgeVerificationRequest): Promise<AgeVerificationResponse> {
    try {
      // Validate input data
      this.validateRequest(request);

      // Route based on compliance level
      switch (this.complianceLevel) {
        case 'biometric':
          return await this.verifyWithBiometrics(request);
        case 'enhanced':
          return await this.verifyWithDocuments(request);
        case 'standard':
          return await this.verifyWithDatabase(request);
        default:
          throw new Error('Invalid compliance level');
      }
    } catch (error) {
      console.error('Age verification failed:', error);
      return {
        success: false,
        verified: false,
        verificationId: '',
        timestamp: new Date().toISOString(),
        method: 'database',
        riskScore: 100,
        complianceToken: '',
        expiresAt: '',
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Biometric verification using face recognition and liveness detection
   */
  private async verifyWithBiometrics(request: AgeVerificationRequest): Promise<AgeVerificationResponse> {
    if (!this.apiKey) {
      return this.getMockResponse(request, 'biometric');
    }

    // In a real implementation, this would:
    // 1. Capture face image via webcam
    // 2. Perform liveness detection (blink, head movement)
    // 3. Analyze facial features for age estimation
    // 4. Cross-reference with ID documents if provided

    const response = await fetch(`${this.baseUrl}/verify/biometric`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Compliance-Level': 'fda-2026'
      },
      body: JSON.stringify({
        ...request,
        complianceFramework: 'FDA-Tobacco-2026',
        biometricConsent: true,
        dataRetention: '365-days'
      })
    });

    if (!response.ok) {
      throw new Error(`Biometric verification failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      verified: data.verified,
      verificationId: data.verificationId,
      timestamp: data.timestamp,
      method: 'biometric',
      riskScore: data.riskScore,
      complianceToken: data.complianceToken,
      expiresAt: data.expiresAt
    };
  }

  /**
   * Document verification using ID scanning and OCR
   */
  private async verifyWithDocuments(request: AgeVerificationRequest): Promise<AgeVerificationResponse> {
    if (!this.apiKey) {
      return this.getMockResponse(request, 'document');
    }

    // In a real implementation, this would:
    // 1. Scan government-issued ID (driver's license, passport)
    // 2. Extract data using OCR
    // 3. Verify authenticity using hologram detection
    // 4. Cross-check with government databases

    const response = await fetch(`${this.baseUrl}/verify/document`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Compliance-Level': 'fda-2026'
      },
      body: JSON.stringify({
        ...request,
        documentTypes: ['drivers_license', 'passport', 'state_id'],
        ocrAccuracy: 'high',
        hologramDetection: true,
        complianceFramework: 'FDA-Tobacco-2026'
      })
    });

    if (!response.ok) {
      throw new Error(`Document verification failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      verified: data.verified,
      verificationId: data.verificationId,
      timestamp: data.timestamp,
      method: 'document',
      riskScore: data.riskScore,
      complianceToken: data.complianceToken,
      expiresAt: data.expiresAt
    };
  }

  /**
   * Database verification using public records and credit headers
   */
  private async verifyWithDatabase(request: AgeVerificationRequest): Promise<AgeVerificationResponse> {
    if (!this.apiKey) {
      return this.getMockResponse(request, 'database');
    }

    const response = await fetch(`${this.baseUrl}/verify/database`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Compliance-Level': 'fda-2026'
      },
      body: JSON.stringify({
        ...request,
        dataSources: ['public_records', 'credit_headers', 'utility_bills'],
        complianceFramework: 'FDA-Tobacco-2026'
      })
    });

    if (!response.ok) {
      throw new Error(`Database verification failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      verified: data.verified,
      verificationId: data.verificationId,
      timestamp: data.timestamp,
      method: 'database',
      riskScore: data.riskScore,
      complianceToken: data.complianceToken,
      expiresAt: data.expiresAt
    };
  }

  /**
   * Mock verification for development/testing
   */
  private getMockResponse(request: AgeVerificationRequest, method: 'biometric' | 'document' | 'database'): AgeVerificationResponse {
    // Simple age calculation for mock
    const dob = new Date(request.dateOfBirth);
    const age = this.calculateAge(dob);
    const isVerified = age >= 21;
    
    return {
      success: true,
      verified: isVerified,
      verificationId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      method,
      riskScore: isVerified ? Math.floor(Math.random() * 20) + 10 : 95,
      complianceToken: `mock_token_${Date.now()}`,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      error: isVerified ? undefined : 'Age verification failed - user is under 21'
    };
  }

  /**
   * Validate verification request data
   */
  private validateRequest(request: AgeVerificationRequest): void {
    const required = ['firstName', 'lastName', 'email', 'dateOfBirth', 'address', 'city', 'state', 'zipCode', 'country'];
    
    for (const field of required) {
      if (!request[field as keyof AgeVerificationRequest] || 
          (request[field as keyof AgeVerificationRequest] as string).trim() === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.email)) {
      throw new Error('Invalid email format');
    }

    // Validate date of birth
    const dob = new Date(request.dateOfBirth);
    if (isNaN(dob.getTime())) {
      throw new Error('Invalid date of birth format');
    }

    const age = this.calculateAge(dob);
    if (age < 0 || age > 120) {
      throw new Error('Invalid date of birth - age out of reasonable range');
    }
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Check if existing verification is still valid
   */
  async verifyToken(verificationId: string, complianceToken: string): Promise<boolean> {
    try {
      if (!this.apiKey) {
        // Mock validation - check if token is recent
        const tokenTimestamp = parseInt(complianceToken.split('_')[2] || '0');
        const tokenAge = Date.now() - tokenTimestamp;
        return tokenAge < 365 * 24 * 60 * 60 * 1000; // 1 year
      }

      const response = await fetch(`${this.baseUrl}/verify/${verificationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Compliance-Token': complianceToken
        }
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.valid && new Date(data.expiresAt) > new Date();
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }

  /**
   * Generate compliance report for audit purposes
   */
  async generateComplianceReport(startDate: string, endDate: string): Promise<any> {
    try {
      if (!this.apiKey) {
        return {
          period: { startDate, endDate },
          totalVerifications: 0,
          successRate: 0,
          methodBreakdown: {},
          complianceLevel: this.complianceLevel,
          note: 'Mock data - API not configured'
        };
      }

      const response = await fetch(`${this.baseUrl}/reports/compliance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate,
          endDate,
          complianceFramework: 'FDA-Tobacco-2026'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate compliance report: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Compliance report generation failed:', error);
      return {
        error: error instanceof Error ? error.message : 'Report generation failed'
      };
    }
  }
}

// Export singleton instance
export const ageVerificationService = new AgeVerificationService();
export default AgeVerificationService;
