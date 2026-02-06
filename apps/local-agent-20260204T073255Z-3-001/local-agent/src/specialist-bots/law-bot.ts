/**
 * Law Bot
 * Specialist in legal matters, compliance, contracts, and regulations
 */

import { BaseBot, BotConfig } from './base-bot.js';

const config: BotConfig = {
  name: 'Lexis (Legal)',
  specialty: 'Legal Compliance, Contracts, Regulations, Business Law',
  systemPrompt: `You are Lexis, an expert legal AI assistant specializing in:
- Business Law and Corporate Compliance
- Online Gambling and Sports Betting Regulations
- Terms of Service and Privacy Policies
- Contract Review and Drafting
- Intellectual Property
- Data Protection (GDPR, CCPA)
- AI and Technology Law
- Dispute Resolution

DISCLAIMER: You provide legal information, not legal advice. Users should consult a licensed attorney for specific legal matters.

You help understand legal requirements, draft documents, and ensure compliance.
You stay current with regulatory changes, especially in tech and gambling sectors.`,
  learningTopics: [
    'Online gambling regulations by state',
    'Sports betting legal updates',
    'AI regulation and compliance',
    'Data privacy law changes',
    'Terms of service best practices',
    'FTC guidelines for online businesses',
    'Cryptocurrency regulations',
    'Affiliate marketing legal requirements',
  ],
  dailyTasks: [
    'Check for new gambling regulations',
    'Review AI compliance requirements',
    'Monitor data privacy law changes',
    'Update on FTC guidelines',
  ],
};

export class LawBot extends BaseBot {
  constructor() {
    super(config);
  }

  protected async executeTask(task: string): Promise<string> {
    switch (task) {
      case 'Check for new gambling regulations':
        return this.checkGamblingRegs();
      case 'Review AI compliance requirements':
        return this.reviewAICompliance();
      case 'Monitor data privacy law changes':
        return this.checkPrivacyLaws();
      case 'Update on FTC guidelines':
        return this.checkFTCGuidelines();
      default:
        return this.ask(task);
    }
  }

  private async checkGamblingRegs(): Promise<string> {
    return this.ask(`What are the latest developments in US online gambling and sports betting regulations?
Focus on:
1. New state legalizations
2. Federal regulatory changes
3. Licensing requirements
4. Advertising restrictions
5. Responsible gambling requirements`);
  }

  private async reviewAICompliance(): Promise<string> {
    return this.ask(`Review current AI compliance requirements for businesses using AI for predictions.
Consider:
1. EU AI Act implications
2. US state AI regulations
3. Disclosure requirements
4. Algorithmic transparency
5. Consumer protection`);
  }

  private async checkPrivacyLaws(): Promise<string> {
    return this.ask(`What are the latest data privacy law changes affecting online businesses?
Include: GDPR updates, CCPA changes, new state laws, international developments`);
  }

  private async checkFTCGuidelines(): Promise<string> {
    return this.ask(`What are current FTC guidelines for:
1. Online advertising
2. Affiliate marketing
3. Endorsements and testimonials
4. AI-generated content
5. Subscription services`);
  }

  /**
   * Review terms of service
   */
  async reviewTermsOfService(content: string): Promise<string> {
    return this.ask(`Review these Terms of Service for compliance and best practices:

${content.slice(0, 5000)}

Check for:
1. Required disclosures
2. Liability limitations
3. User rights
4. Dispute resolution
5. Termination clauses
6. GDPR/CCPA compliance
Provide specific improvement recommendations.`);
  }

  /**
   * Generate privacy policy
   */
  async generatePrivacyPolicy(businessInfo: string): Promise<string> {
    return this.ask(`Generate a privacy policy for: ${businessInfo}
Include:
1. Data collection practices
2. Use of data
3. Third-party sharing
4. User rights
5. Cookie policy
6. Contact information
Make it GDPR and CCPA compliant.`);
  }

  /**
   * Check gambling compliance
   */
  async checkGamblingCompliance(state: string): Promise<string> {
    return this.ask(`What are the legal requirements for operating a sports betting prediction service in ${state}?
Include:
1. Licensing requirements
2. Advertising restrictions
3. Age verification requirements
4. Responsible gambling features
5. Required disclosures`);
  }

  /**
   * Review affiliate disclosure
   */
  async reviewAffiliateDisclosure(content: string): Promise<string> {
    return this.ask(`Review this affiliate disclosure for FTC compliance:

${content}

Check for:
1. Clear and conspicuous placement
2. Plain language
3. Material connection disclosure
4. Placement on relevant pages
Provide specific recommendations.`);
  }
}

