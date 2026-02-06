/**
 * Password Finder Bot
 * Specialist in password recovery, credential management, and security
 * ETHICAL USE ONLY - For recovering YOUR OWN passwords
 */

import { BaseBot, BotConfig } from './base-bot.js';

const config: BotConfig = {
  name: 'Vault (Password)',
  specialty: 'Password Recovery, Credential Management, Security',
  systemPrompt: `You are Vault, an expert password and credential management AI assistant specializing in:
- Browser Password Recovery (Chrome, Firefox, Edge)
- Windows Credential Manager
- WiFi Password Recovery
- Password Manager Migration
- Secure Password Generation
- Password Policy Best Practices
- Multi-Factor Authentication Setup
- Passkey and Passwordless Auth
- Credential Storage Security
- Password Audit and Hygiene
- Recovery Key Management
- Emergency Access Setup

IMPORTANT ETHICAL GUIDELINES:
- Only assist with recovering passwords for accounts the user OWNS
- Never help bypass security on others' accounts
- Encourage proper password management practices
- Recommend secure alternatives when possible

You help manage and recover credentials securely.
You stay current with password security research and best practices.
You emphasize security, proper storage, and authentication best practices.`,
  learningTopics: [
    'Passwordless authentication advances',
    'Passkey implementation',
    'Password manager security comparison',
    'Credential stuffing defense',
    'Browser password storage security',
    'Enterprise password management',
    'Biometric authentication security',
    'Zero-knowledge password managers',
  ],
  dailyTasks: [
    'Review password security research',
    'Check password manager updates',
    'Monitor credential breach news',
    'Update recovery techniques',
  ],
};

export class PasswordFinderBot extends BaseBot {
  constructor() {
    super(config);
  }

  protected async executeTask(task: string): Promise<string> {
    switch (task) {
      case 'Review password security research':
        return this.reviewResearch();
      case 'Check password manager updates':
        return this.checkManagers();
      case 'Monitor credential breach news':
        return this.monitorBreaches();
      case 'Update recovery techniques':
        return this.updateRecovery();
      default:
        return this.ask(task);
    }
  }

  private async reviewResearch(): Promise<string> {
    return this.ask(`What's new in password security research?`);
  }

  private async checkManagers(): Promise<string> {
    return this.ask(`What are the latest password manager updates and features?`);
  }

  private async monitorBreaches(): Promise<string> {
    return this.ask(`What are recent credential breaches and lessons learned?`);
  }

  private async updateRecovery(): Promise<string> {
    return this.ask(`Current best practices for password recovery?`);
  }

  async recoverBrowserPasswords(browser: string): Promise<string> {
    return this.ask(`How to recover saved passwords from ${browser}?
Include:
1. Built-in export feature steps
2. Location of password database
3. Third-party recovery tools (for your own passwords)
4. Security considerations
DISCLAIMER: Only for recovering YOUR OWN passwords`);
  }

  async recoverWiFiPasswords(): Promise<string> {
    return this.ask(`How to recover saved WiFi passwords on Windows/Mac/Linux?
Include:
1. Command-line methods
2. GUI methods
3. Export options
4. Backup recommendations`);
  }

  async auditPasswords(passwordList: string): Promise<string> {
    return this.ask(`Audit these passwords for security (DO NOT include actual passwords, just patterns):
Patterns observed: ${passwordList}
Provide:
1. Strength assessment
2. Common weaknesses
3. Improvement recommendations
4. Password policy suggestions`);
  }

  async migratePasswordManager(from: string, to: string): Promise<string> {
    return this.ask(`Migrate passwords from ${from} to ${to}:
Include:
1. Export process
2. Import process
3. Verification steps
4. Cleanup of old manager`);
  }

  async setupMFA(service: string): Promise<string> {
    return this.ask(`Set up multi-factor authentication for ${service}:
Include:
1. Available MFA options
2. Recommended method
3. Backup codes importance
4. Recovery options`);
  }

  async generateSecurePassword(requirements: string): Promise<string> {
    return this.ask(`Generate secure password strategy for: ${requirements}
Include:
1. Password formula/pattern
2. Length and complexity recommendations
3. Memorable techniques
4. Storage recommendations`);
  }

  async emergencyAccess(scenario: string): Promise<string> {
    return this.ask(`Set up emergency access for: ${scenario}
Include:
1. Password manager emergency access features
2. Trusted contacts setup
3. Recovery key management
4. Dead man's switch options`);
  }
}

