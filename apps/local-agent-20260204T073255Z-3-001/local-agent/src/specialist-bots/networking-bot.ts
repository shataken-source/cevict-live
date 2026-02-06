/**
 * Networking Bot
 * Specialist in computer networking, protocols, and infrastructure
 */

import { BaseBot, BotConfig } from './base-bot.js';

const config: BotConfig = {
  name: 'NetOps (Networking)',
  specialty: 'Computer Networking, Protocols, Infrastructure, Troubleshooting',
  systemPrompt: `You are NetOps, an expert networking AI assistant specializing in:
- TCP/IP and OSI Model
- Routing and Switching
- DNS, DHCP, NAT
- VLANs and Subnetting
- Firewall Configuration
- VPN Setup and Management
- Load Balancing
- Network Monitoring (Wireshark, tcpdump)
- SDN and Network Automation
- Cloud Networking (AWS VPC, Azure VNet)
- Home and Enterprise Networks
- Network Troubleshooting
- QoS and Traffic Shaping
- IPv6 Migration

You help design, configure, and troubleshoot networks of all sizes.
You stay current with networking standards, best practices, and tools.
You provide practical solutions with security in mind.`,
  learningTopics: [
    'Software-defined networking advances',
    'Zero trust network architecture',
    'Network automation with Ansible',
    'Cloud networking best practices',
    'IPv6 deployment strategies',
    'Network observability tools',
    'Container networking (CNI)',
    'Service mesh technologies',
  ],
  dailyTasks: [
    'Review networking technology updates',
    'Check cloud networking innovations',
    'Monitor network security threats',
    'Update troubleshooting guides',
  ],
};

export class NetworkingBot extends BaseBot {
  constructor() {
    super(config);
  }

  protected async executeTask(task: string): Promise<string> {
    switch (task) {
      case 'Review networking technology updates':
        return this.reviewTech();
      case 'Check cloud networking innovations':
        return this.checkCloud();
      case 'Monitor network security threats':
        return this.monitorThreats();
      case 'Update troubleshooting guides':
        return this.updateGuides();
      default:
        return this.ask(task);
    }
  }

  private async reviewTech(): Promise<string> {
    return this.ask(`What are the latest networking technology updates?
Include: SDN, automation, protocols, hardware`);
  }

  private async checkCloud(): Promise<string> {
    return this.ask(`What are cloud networking innovations?
Cover: AWS, Azure, GCP networking features`);
  }

  private async monitorThreats(): Promise<string> {
    return this.ask(`What are current network security threats?
Include: Attack vectors, vulnerabilities, mitigations`);
  }

  private async updateGuides(): Promise<string> {
    return this.ask(`Common network troubleshooting techniques?
Cover: Connectivity, DNS, routing, performance`);
  }

  async designNetwork(requirements: string, scale: string): Promise<string> {
    return this.ask(`Design a network:
Requirements: ${requirements}
Scale: ${scale}
Include: Topology, addressing, security, redundancy`);
  }

  async troubleshootNetwork(issue: string, environment: string): Promise<string> {
    return this.ask(`Troubleshoot network issue:
Issue: ${issue}
Environment: ${environment}
Provide: Diagnostic steps, commands, solutions`);
  }

  async configureFirewall(platform: string, requirements: string): Promise<string> {
    return this.ask(`Configure firewall:
Platform: ${platform}
Requirements: ${requirements}
Include: Rules, zones, logging`);
  }

  async setupVPN(type: string, endpoints: string): Promise<string> {
    return this.ask(`Setup VPN:
Type: ${type}
Endpoints: ${endpoints}
Include: Configuration, security, troubleshooting`);
  }
}

