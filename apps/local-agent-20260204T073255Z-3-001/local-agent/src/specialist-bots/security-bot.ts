/**
 * Security Bot
 * Specialist in cybersecurity, code security, and infrastructure protection
 */

import { BaseBot, BotConfig } from './base-bot.js';

const config: BotConfig = {
  name: 'Sentinel (Security)',
  specialty: 'Cybersecurity, Application Security, Infrastructure Protection',
  systemPrompt: `You are Sentinel, an expert security AI assistant specializing in:
- Application Security (OWASP Top 10)
- Infrastructure Security
- API Security
- Authentication and Authorization
- Data Encryption
- Security Auditing
- Penetration Testing Concepts
- Incident Response
- Compliance (SOC 2, PCI-DSS)
- Cloud Security (AWS, Vercel, Supabase)

You help identify vulnerabilities, recommend security measures, and ensure best practices.
You stay current with security threats, CVEs, and emerging attack vectors.
You prioritize security without sacrificing usability.`,
  learningTopics: [
    'Latest CVEs and vulnerabilities',
    'Next.js security best practices',
    'API security patterns',
    'Authentication security trends',
    'Cloud security updates',
    'OWASP updates',
    'Supabase security features',
    'Rate limiting and DDoS protection',
  ],
  dailyTasks: [
    'Check for new CVEs affecting our stack',
    'Review authentication security',
    'Audit API security patterns',
    'Check dependency vulnerabilities',
  ],
};

export class SecurityBot extends BaseBot {
  constructor() {
    super(config);
  }

  protected async executeTask(task: string): Promise<string> {
    switch (task) {
      case 'Check for new CVEs affecting our stack':
        return this.checkCVEs();
      case 'Review authentication security':
        return this.reviewAuth();
      case 'Audit API security patterns':
        return this.auditAPIs();
      case 'Check dependency vulnerabilities':
        return this.checkDependencies();
      default:
        return this.ask(task);
    }
  }

  private async checkCVEs(): Promise<string> {
    return this.ask(`Check for recent CVEs affecting:
- Next.js
- React
- Node.js
- Supabase/PostgreSQL
- Vercel
- Common npm packages

Provide:
1. Critical vulnerabilities
2. Affected versions
3. Remediation steps
4. Priority level`);
  }

  private async reviewAuth(): Promise<string> {
    return this.ask(`Review authentication security best practices for:
1. Session management
2. JWT handling
3. Password policies
4. 2FA implementation
5. OAuth security
6. API key management
Provide specific recommendations for a Next.js + Supabase stack.`);
  }

  private async auditAPIs(): Promise<string> {
    return this.ask(`Audit API security patterns for a Next.js API:
1. Input validation
2. Rate limiting
3. Authentication/Authorization
4. CORS configuration
5. Error handling (no data leakage)
6. SQL injection prevention
7. XSS prevention
Provide code examples for each.`);
  }

  private async checkDependencies(): Promise<string> {
    return this.ask(`How to check and fix npm dependency vulnerabilities?
Include:
1. npm audit commands
2. Interpreting results
3. Safe update strategies
4. Dealing with breaking changes
5. Alternative packages for vulnerable ones`);
  }

  /**
   * Review code for security
   */
  async reviewCodeSecurity(code: string, language: string): Promise<string> {
    return this.ask(`Review this ${language} code for security vulnerabilities:

\`\`\`${language}
${code}
\`\`\`

Check for:
1. Injection vulnerabilities
2. Authentication issues
3. Authorization flaws
4. Data exposure
5. Cryptographic issues
6. Error handling
Provide specific fixes.`);
  }

  /**
   * Generate security headers
   */
  async generateSecurityHeaders(platform: string): Promise<string> {
    return this.ask(`Generate recommended security headers for ${platform}.
Include:
1. Content-Security-Policy
2. X-Frame-Options
3. X-Content-Type-Options
4. Strict-Transport-Security
5. Referrer-Policy
6. Permissions-Policy
Provide the actual header values and explanations.`);
  }

  /**
   * Audit environment variables
   */
  async auditEnvSecurity(envExample: string): Promise<string> {
    return this.ask(`Review these environment variables for security:

${envExample}

Check for:
1. Sensitive data exposure risks
2. Proper naming conventions
3. Missing security variables
4. Recommendations for secret management`);
  }

  /**
   * Generate incident response plan
   */
  async generateIncidentPlan(): Promise<string> {
    return this.ask(`Generate an incident response plan for a small SaaS business.
Include:
1. Detection and identification
2. Containment steps
3. Eradication procedures
4. Recovery process
5. Post-incident review
6. Communication templates`);
  }
}

