# Security Testing & Audit Suite

## Overview
Comprehensive automated security testing suite for Gulf Coast Charters that validates all security configurations and generates detailed audit reports.

## Test Categories

### 1. Row Level Security (RLS) Tests
**Location:** `tests/security/rls-policies.test.ts`

Tests verify:
- Users can only access their own profile data
- Captains cannot modify other captains' listings
- Bookings are only visible to involved parties
- Admin access is properly restricted

**Run:** `npm run test:security:rls`

### 2. Rate Limiting Tests
**Location:** `tests/security/rate-limiting.test.ts`

Tests verify:
- API endpoints limit requests (100/min)
- Login attempts are throttled (5 attempts)
- Edge functions have rate protection
- Burst traffic is handled properly

**Run:** `npm run test:security:rate-limit`

### 3. 2FA Enforcement Tests
**Location:** `tests/security/2fa-enforcement.test.ts`

Tests verify:
- All admin accounts have 2FA enabled
- Admin endpoints require 2FA verification
- 2FA bypass attempts are blocked

**Run:** `npm run test:security:2fa`

### 4. Penetration Tests
**Location:** `tests/security/penetration-tests.ts`

Tests include:
- SQL Injection attempts (4 payloads)
- XSS attack vectors (3 payloads)
- CSRF protection validation

**Run:** `npm run test:security:pentest`

## Security Audit Report

### Generate Full Audit
```bash
npm run test:security:audit
```

### Report Contents
- Overall security score (0-100)
- Detailed test results for all categories
- Failed test analysis
- Security recommendations
- Timestamp and environment info

### CI/CD Integration
Security tests run automatically on:
- Every push to main/develop
- All pull requests
- Daily scheduled runs (2 AM UTC)

**Deployment blocks if security score < 80%**

## NPM Scripts
Add to `package.json`:
```json
{
  "scripts": {
    "test:security:rls": "tsx tests/security/rls-policies.test.ts",
    "test:security:rate-limit": "tsx tests/security/rate-limiting.test.ts",
    "test:security:2fa": "tsx tests/security/2fa-enforcement.test.ts",
    "test:security:pentest": "tsx tests/security/penetration-tests.ts",
    "test:security:audit": "tsx tests/security/security-audit.ts"
  }
}
```
