/**
 * Meshtastic Bot
 * Specialist in Meshtastic, LoRa mesh networking, and off-grid communication
 */

import { BaseBot, BotConfig } from './base-bot.js';

const config: BotConfig = {
  name: 'Mesh (Meshtastic)',
  specialty: 'Meshtastic, LoRa, Mesh Networking, Off-Grid Communication',
  systemPrompt: `You are Mesh, an expert Meshtastic and LoRa mesh networking AI assistant specializing in:
- Meshtastic Device Setup and Configuration
- LoRa Radio Technology
- Mesh Network Topology
- Channel Configuration and Encryption
- Range Optimization
- Solar-Powered Nodes
- MQTT Integration
- Position Tracking and Mapping
- Emergency Communication Networks
- Hardware Selection (T-Beam, T-Echo, RAK, Heltec)
- Antenna Selection and Placement
- Firmware Updates and Customization
- Private vs Public Mesh Networks
- Integration with Home Assistant

You help build resilient, off-grid communication networks.
You stay current with Meshtastic releases, hardware, and community projects.
You emphasize reliability, range, and practical deployment.`,
  learningTopics: [
    'Meshtastic firmware updates',
    'LoRa modulation optimization',
    'Solar node design for Meshtastic',
    'Mesh network topology strategies',
    'Long-range antenna designs',
    'MQTT bridge configuration',
    'Emergency mesh networks',
    'Meshtastic hardware comparison',
  ],
  dailyTasks: [
    'Check Meshtastic firmware releases',
    'Review LoRa hardware updates',
    'Monitor mesh networking techniques',
    'Update deployment guides',
  ],
};

export class MeshtasticBot extends BaseBot {
  constructor() {
    super(config);
  }

  protected async executeTask(task: string): Promise<string> {
    switch (task) {
      case 'Check Meshtastic firmware releases':
        return this.checkFirmware();
      case 'Review LoRa hardware updates':
        return this.reviewHardware();
      case 'Monitor mesh networking techniques':
        return this.monitorMesh();
      case 'Update deployment guides':
        return this.updateGuides();
      default:
        return this.ask(task);
    }
  }

  private async checkFirmware(): Promise<string> {
    return this.ask(`What are the latest Meshtastic firmware updates and features?`);
  }

  private async reviewHardware(): Promise<string> {
    return this.ask(`What are the best Meshtastic hardware options currently?
Compare: T-Beam, T-Echo, RAK, Heltec, DIY options`);
  }

  private async monitorMesh(): Promise<string> {
    return this.ask(`What are effective mesh network deployment strategies?`);
  }

  private async updateGuides(): Promise<string> {
    return this.ask(`Best practices for Meshtastic node deployment?`);
  }

  async selectHardware(useCase: string, budget: string, environment: string): Promise<string> {
    return this.ask(`Recommend Meshtastic hardware:
Use Case: ${useCase}
Budget: ${budget}
Environment: ${environment}
Include: Device, antenna, power solution, accessories`);
  }

  async designMeshNetwork(area: string, nodes: number, purpose: string): Promise<string> {
    return this.ask(`Design Meshtastic mesh network:
Coverage Area: ${area}
Number of Nodes: ${nodes}
Purpose: ${purpose}
Include: Node placement, channels, power, range optimization`);
  }

  async configureNode(device: string, role: string): Promise<string> {
    return this.ask(`Configure Meshtastic node:
Device: ${device}
Role: ${role} (router/client/repeater)
Include: Settings, channels, encryption, GPS`);
  }

  async optimizeRange(currentRange: string, terrain: string): Promise<string> {
    return this.ask(`Optimize Meshtastic range:
Current Range: ${currentRange}
Terrain: ${terrain}
Include: Antenna, height, settings, LoRa parameters`);
  }

  async setupSolarNode(location: string, powerNeeds: string): Promise<string> {
    return this.ask(`Design solar-powered Meshtastic node:
Location: ${location}
Power Needs: ${powerNeeds}
Include: Panel size, battery, charge controller, enclosure`);
  }
}

