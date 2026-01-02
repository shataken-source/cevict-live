/**
 * Age Verification Service - AgeChecker.net Integration
 * 
 * Critical compliance requirement for 2026 tobacco/nicotine regulations
 * Implements biometric and database verification methods
 */

export interface AgeVerificationRequest {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  dateOfBirth: string; // YYYY-MM-DD format
  email?: string;
  phoneNumber?: string;
}

export interface AgeVerificationResponse {
  success: boolean;
  verificationId: string;
  status: 'approved' | 'pending' | 'rejected' | 'manual_review';
  message: string;
  requiresManualReview: boolean;
  verifiedAt: string;
  age: number;
}

export interface JenkinsActReport {
  customerId: string;
  customerName: string;
  customerAddress: string;
  customerCity: string;
  customerState: string;
  customerZip: string;
  productType: 'cigars' | 'smokeless_tobacco' | 'vaping' | 'hemp';
  tobaccoWeight: number; // in ounces
  orderDate: string;
  orderTotal: number;
  shippingAddress: string;
}

class AgeVerificationService {
  private apiKey: string;
  private baseUrl: string;
  private isTestMode: boolean;

  constructor() {
    this.apiKey = process.env.AGECHECKER_API_KEY || '';
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://api.agechecker.net/v1' 
      : 'https://sandbox.agechecker.net/v1';
    this.isTestMode = process.env.NODE_ENV !== 'production';
  }

  /**
   * Layer 1: Soft Age Gate (Landing Page)
   * Sets cookie for 7 days, blocks crawlers from gate
   */
  async softAgeGate(): Promise<{ allowed: boolean; requiresHardCheck: boolean }> {
    // Check if user agent is a crawler
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';
    const isCrawler = /bot|crawler|spider|crawling/i.test(userAgent);
    
    if (isCrawler) {
      return { allowed: true, requiresHardCheck: false };
    }

    // Check for existing verification cookie
    if (typeof document !== 'undefined') {
      const cookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('pref_age_verified='));
      
      if (cookie) {
        const timestamp = parseInt(cookie.split('=')[1]);
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        if (timestamp > sevenDaysAgo) {
          return { allowed: true, requiresHardCheck: false };
        }
      }
    }

    return { allowed: false, requiresHardCheck: true };
  }

  /**
   * Layer 2: Hard Legal Verification (Checkout/Community)
   * Calls AgeChecker.net API for database verification
   */
  async verifyAge(request: AgeVerificationRequest): Promise<AgeVerificationResponse> {
    try {
      // Validate required fields
      this.validateRequest(request);

      // Call AgeChecker.net API
      const response = await fetch(`${this.baseUrl}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Test-Mode': this.isTestMode.toString()
        },
        body: JSON.stringify({
          customer: {
            first_name: request.firstName,
            last_name: request.lastName,
            address: request.address,
            city: request.city,
            state: request.state,
            zip: request.zipCode,
            dob: request.dateOfBirth,
            email: request.email,
            phone: request.phoneNumber
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Age verification API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform response to our interface
      const result: AgeVerificationResponse = {
        success: data.status === 'approved',
        verificationId: data.verification_id,
        status: data.status,
        message: data.message || 'Verification processed',
        requiresManualReview: data.status === 'manual_review',
        verifiedAt: new Date().toISOString(),
        age: this.calculateAge(request.dateOfBirth)
      };

      // Set verification cookie if successful
      if (result.success && typeof document !== 'undefined') {
        document.cookie = `age_verified=${data.verification_id}; path=/; max-age=${60 * 60 * 24 * 30}; secure; samesite=strict`;
      }

      return result;

    } catch (error) {
      console.error('Age verification failed:', error);
      
      // In case of API failure, require manual review for safety
      return {
        success: false,
        verificationId: '',
        status: 'manual_review',
        message: 'Verification service unavailable. Manual review required.',
        requiresManualReview: true,
        verifiedAt: new Date().toISOString(),
        age: 0
      };
    }
  }

  /**
   * Upload ID for manual review (fallback method)
   */
  async uploadIdForManualReview(
    verificationId: string, 
    idImage: File, 
    selfieImage?: File
  ): Promise<{ success: boolean; reviewId: string }> {
    try {
      const formData = new FormData();
      formData.append('verification_id', verificationId);
      formData.append('id_image', idImage);
      
      if (selfieImage) {
        formData.append('selfie_image', selfieImage);
      }

      const response = await fetch(`${this.baseUrl}/manual-review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Test-Mode': this.isTestMode.toString()
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Manual review upload failed: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        reviewId: data.review_id
      };

    } catch (error) {
      console.error('Manual review upload failed:', error);
      return {
        success: false,
        reviewId: ''
      };
    }
  }

  /**
   * Check verification status
   */
  async checkVerificationStatus(verificationId: string): Promise<AgeVerificationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/status/${verificationId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Test-Mode': this.isTestMode.toString()
        }
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: data.status === 'approved',
        verificationId: data.verification_id,
        status: data.status,
        message: data.message || '',
        requiresManualReview: data.status === 'manual_review',
        verifiedAt: data.verified_at,
        age: data.age || 0
      };

    } catch (error) {
      console.error('Status check failed:', error);
      throw error;
    }
  }

  /**
   * Validate age verification request
   */
  private validateRequest(request: AgeVerificationRequest): void {
    const required = ['firstName', 'lastName', 'address', 'city', 'state', 'zipCode', 'dateOfBirth'];
    
    for (const field of required) {
      if (!request[field as keyof AgeVerificationRequest]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate date format and minimum age
    const age = this.calculateAge(request.dateOfBirth);
    if (age < 21) {
      throw new Error('User must be at least 21 years old');
    }

    // Validate state is in our service area
    const validStates = ['AL', 'FL', 'MS', 'LA', 'TN', 'KY', 'AR', 'GA', 'WV', 'SC'];
    if (!validStates.includes(request.state)) {
      throw new Error('State not supported for verification');
    }
  }

  /**
   * Calculate age from date string
   */
  private calculateAge(dateOfBirth: string): number {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Get verification status from cookie
   */
  getVerificationStatus(): { isVerified: boolean; verificationId?: string } {
    if (typeof document === 'undefined') {
      return { isVerified: false };
    }

    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('age_verified='));
    
    if (cookie) {
      const verificationId = cookie.split('=')[1];
      return { isVerified: true, verificationId };
    }

    return { isVerified: false };
  }

  /**
   * Clear verification cookies
   */
  clearVerification(): void {
    if (typeof document !== 'undefined') {
      document.cookie = 'age_verified=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
      document.cookie = 'pref_age_verified=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    }
  }
}

// Singleton instance
export const ageVerificationService = new AgeVerificationService();

// Jenkins Act Reporting Service
export class JenkinsActService {
  private generateCSV(reports: JenkinsActReport[]): string {
    const headers = [
      'Customer ID',
      'Customer Name',
      'Customer Address',
      'Customer City',
      'Customer State',
      'Customer ZIP',
      'Product Type',
      'Tobacco Weight (oz)',
      'Order Date',
      'Order Total',
      'Shipping Address'
    ];

    const rows = reports.map(report => [
      report.customerId,
      report.customerName,
      report.customerAddress,
      report.customerCity,
      report.customerState,
      report.customerZip,
      report.productType,
      report.tobaccoWeight.toString(),
      report.orderDate,
      report.orderTotal.toString(),
      report.shippingAddress
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  async generateMonthlyReport(year: number, month: number): Promise<string> {
    // This would query the database for orders in the specified month
    // For now, return empty CSV template
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    // TODO: Implement database query
    const reports: JenkinsActReport[] = [];
    
    return this.generateCSV(reports);
  }
}

export const jenkinsActService = new JenkinsActService();
