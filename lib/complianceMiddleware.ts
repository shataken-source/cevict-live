/**
 * Compliance Middleware for Protected Routes
 * 
 * Implements multi-layer age verification and legal compliance
 * for tobacco/nicotine content per 2026 regulations
 */

import { NextRequest, NextResponse } from 'next/server';
import React, { useState, useMemo, useEffect } from 'react';
import { ageVerificationService } from './ageVerification';

export interface ComplianceConfig {
  requireAgeVerification: boolean;
  requireFullVerification: boolean; // For purchases/community
  allowedStates: string[];
  blockedCountries: string[];
  excludeCrawlers: boolean;
}

const DEFAULT_CONFIG: ComplianceConfig = {
  requireAgeVerification: true,
  requireFullVerification: false,
  allowedStates: ['AL', 'FL', 'MS', 'LA', 'TN', 'KY', 'AR', 'GA', 'WV', 'SC'],
  blockedCountries: ['XX'], // Add countries where tobacco is illegal
  excludeCrawlers: true
};

/**
 * Middleware to check age verification compliance
 */
export async function complianceMiddleware(
  request: NextRequest,
  config: Partial<ComplianceConfig> = {}
): Promise<NextResponse | null> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Extract user agent and IP
  const userAgent = request.headers.get('user-agent') || '';
  const clientIP = request.ip || 
                   request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || '';

  // Check if user agent is a crawler
  if (finalConfig.excludeCrawlers && isCrawler(userAgent)) {
    return null; // Allow crawlers through for SEO
  }

  // Check geolocation (basic IP-based check)
  const geoCheck = await checkGeolocation(clientIP);
  if (!geoCheck.allowed) {
    return NextResponse.redirect(new URL('/blocked', request.url));
  }

  // Check soft age gate
  if (finalConfig.requireAgeVerification) {
    const softGateCheck = await ageVerificationService.softAgeGate();
    
    if (!softGateCheck.allowed) {
      // Redirect to age verification page
      const returnUrl = encodeURIComponent(request.url);
      return NextResponse.redirect(
        new URL(`/age-verify?return=${returnUrl}`, request.url)
      );
    }

    // If full verification is required and not completed
    if (finalConfig.requireFullVerification && softGateCheck.requiresHardCheck) {
      const verificationStatus = ageVerificationService.getVerificationStatus();
      
      if (!verificationStatus.isVerified) {
        const returnUrl = encodeURIComponent(request.url);
        return NextResponse.redirect(
          new URL(`/age-verify/full?return=${returnUrl}`, request.url)
        );
      }
    }
  }

  return null; // Allow request to proceed
}

/**
 * Check if user agent is a crawler
 */
function isCrawler(userAgent: string): boolean {
  const crawlers = [
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
    'yandexbot', 'facebookexternalhit', 'twitterbot', 'rogerbot',
    'linkedinbot', 'embedly', 'quora link preview', 'showyoubot',
    'outbrain', 'pinterest', 'developers.google.com'
  ];
  
  return crawlers.some(crawler => 
    userAgent.toLowerCase().includes(crawler)
  );
}

/**
 * Basic geolocation check
 */
async function checkGeolocation(ip: string): Promise<{ allowed: boolean; country?: string; state?: string }> {
  try {
    // Use a geolocation service (implement with MaxMind or similar)
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await response.json();
    
    const country = data.country_code;
    const state = data.region_code;
    
    // Check if country is blocked
    const blockedCountries = ['XX']; // Add actual blocked countries
    if (blockedCountries.includes(country)) {
      return { allowed: false, country };
    }
    
    // For tobacco content, verify state is allowed
    const allowedStates = ['AL', 'FL', 'MS', 'LA', 'TN', 'KY', 'AR', 'GA', 'WV', 'SC'];
    if (!allowedStates.includes(state)) {
      return { allowed: false, country, state };
    }
    
    return { allowed: true, country, state };
    
  } catch (error) {
    console.error('Geolocation check failed:', error);
    // Fail open - allow access if geolocation fails
    return { allowed: true };
  }
}

/**
 * Server-side wrapper for Next.js middleware
 */
export function createComplianceWrapper(config: Partial<ComplianceConfig> = {}) {
  return async function middleware(request: NextRequest) {
    const complianceResult = await complianceMiddleware(request, config);
    
    if (complianceResult) {
      return complianceResult;
    }
    
    // Continue to the requested route
    return NextResponse.next();
  };
}

/**
 * Client-side compliance checker for React components
 */
export class ClientComplianceChecker {
  private config: ComplianceConfig;
  
  constructor(config: Partial<ComplianceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if current user is compliant
   */
  async checkCompliance(): Promise<{
    compliant: boolean;
    requiresVerification: boolean;
    requiresFullVerification: boolean;
    blocked: boolean;
  }> {
    if (typeof window === 'undefined') {
      return { compliant: false, requiresVerification: true, requiresFullVerification: false, blocked: false };
    }

    // Check soft age gate
    if (this.config.requireAgeVerification) {
      const softGateCheck = await ageVerificationService.softAgeGate();
      
      if (!softGateCheck.allowed) {
        return {
          compliant: false,
          requiresVerification: true,
          requiresFullVerification: false,
          blocked: false
        };
      }

      // Check full verification if required
      if (this.config.requireFullVerification && softGateCheck.requiresHardCheck) {
        const verificationStatus = ageVerificationService.getVerificationStatus();
        
        if (!verificationStatus.isVerified) {
          return {
            compliant: false,
            requiresVerification: true,
            requiresFullVerification: true,
            blocked: false
          };
        }
      }
    }

    return {
      compliant: true,
      requiresVerification: false,
      requiresFullVerification: false,
      blocked: false
    };
  }

  /**
   * Redirect to appropriate verification page
   */
  redirectToVerification(returnUrl?: string): void {
    if (typeof window === 'undefined') return;
    
    const returnParam = returnUrl ? `?return=${encodeURIComponent(returnUrl)}` : '';
    
    this.checkCompliance().then((result: any) => {
      if (result.requiresFullVerification) {
        window.location.href = `/age-verify/full${returnParam}`;
      } else if (result.requiresVerification) {
        window.location.href = `/age-verify${returnParam}`;
      }
    });
  }

  /**
   * Wrap a function with compliance check
   */
  wrapWithCompliance<T extends any[], R>(
    fn: (...args: T) => R | Promise<R>
  ): (...args: T) => Promise<R | null> {
    return async (...args: T): Promise<R | null> => {
      const compliance = await this.checkCompliance();
      
      if (!compliance.compliant) {
        this.redirectToVerification();
        return null;
      }
      
      return await fn(...args);
    };
  }
}

/**
 * React HOC for compliance protection
 */
export function withCompliance<P extends object>(
  Component: React.ComponentType<P>,
  config: Partial<ComplianceConfig> = {}
) {
  return function ComplianceWrapper(props: P) {
    const [compliance, setCompliance] = useState<{
      compliant: boolean;
      loading: boolean;
    }>({ compliant: false, loading: true });

    const checker = useMemo(() => new ClientComplianceChecker(config), [config]);

    useEffect(() => {
      checker.checkCompliance().then((result: any) => {
        setCompliance({ compliant: result.compliant, loading: false });
        
        if (!result.compliant) {
          checker.redirectToVerification();
        }
      });
    }, [checker]);

    if (compliance.loading) {
      return React.createElement('div', {
        className: 'min-h-screen flex items-center justify-center'
      }, React.createElement('div', {
        className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'
      }));
    }

    if (!compliance.compliant) {
      return null; // Will redirect
    }

    return React.createElement(Component, props);
  };
}

// Export singleton instance
export const clientComplianceChecker = new ClientComplianceChecker();
