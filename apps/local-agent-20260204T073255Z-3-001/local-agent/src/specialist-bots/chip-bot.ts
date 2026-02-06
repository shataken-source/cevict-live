/**
 * Chip Bot
 * Specialist in microcontrollers, chip programming, and embedded systems
 */

import { BaseBot, BotConfig } from './base-bot.js';

const config: BotConfig = {
  name: 'Byte (Chip Specialist)',
  specialty: 'Microcontrollers, Chip Programming, Embedded Systems, EEPROM',
  systemPrompt: `You are Byte, an expert chip and embedded systems AI assistant specializing in:
- Microcontroller Programming (Arduino, ESP32, STM32, PIC)
- EEPROM Reading and Writing
- Chip Identification and Datasheets
- Flash Memory Programming
- Automotive ECU and Chip Tuning
- JTAG and SWD Debugging
- Serial Communication (I2C, SPI, UART)
- Firmware Development
- Bootloaders and OTA Updates
- Security and Encryption on MCUs
- PCB Design for Embedded Systems
- Sensor Integration
- Low Power Design
- Real-time Operating Systems (RTOS)

You help with chip programming, embedded development, and hardware hacking.
You stay current with microcontroller releases, tools, and techniques.
You emphasize proper techniques, safety, and legal considerations.`,
  learningTopics: [
    'New microcontroller releases',
    'ESP32 advanced features',
    'Automotive chip tuning legality',
    'EEPROM programming techniques',
    'Embedded security practices',
    'Low-power design strategies',
    'RTOS comparison and selection',
    'Debug tool innovations',
  ],
  dailyTasks: [
    'Review new microcontroller releases',
    'Check embedded development tools',
    'Monitor chip programming techniques',
    'Update firmware best practices',
  ],
};

export class ChipBot extends BaseBot {
  constructor() {
    super(config);
  }

  protected async executeTask(task: string): Promise<string> {
    switch (task) {
      case 'Review new microcontroller releases':
        return this.reviewMCUs();
      case 'Check embedded development tools':
        return this.checkTools();
      case 'Monitor chip programming techniques':
        return this.monitorTechniques();
      case 'Update firmware best practices':
        return this.updateFirmware();
      default:
        return this.ask(task);
    }
  }

  private async reviewMCUs(): Promise<string> {
    return this.ask(`What are the latest microcontroller releases?
Include:
1. New Arduino boards
2. ESP32 variants
3. STM32 updates
4. Raspberry Pi Pico ecosystem`);
  }

  private async checkTools(): Promise<string> {
    return this.ask(`What are current embedded development tools?
Cover:
1. IDEs and toolchains
2. Debug hardware
3. Programmers and flashers
4. Logic analyzers`);
  }

  private async monitorTechniques(): Promise<string> {
    return this.ask(`What are advanced chip programming techniques?
Include:
1. EEPROM reading methods
2. Flash programming
3. Chip identification
4. Security bypass (legal contexts)`);
  }

  private async updateFirmware(): Promise<string> {
    return this.ask(`What are firmware development best practices?
Cover:
1. Code organization
2. Power management
3. OTA update strategies
4. Testing approaches`);
  }

  /**
   * Select microcontroller
   */
  async selectMicrocontroller(application: string, requirements: string, experience: string): Promise<string> {
    return this.ask(`Select microcontroller:
Application: ${application}
Requirements: ${requirements}
Experience Level: ${experience}

Provide:
1. Top 3 MCU recommendations
2. Development board options
3. IDE and toolchain
4. Pros and cons of each
5. Learning resources
6. Total cost estimate`);
  }

  /**
   * EEPROM programming guide
   */
  async eepromGuide(chipType: string, operation: string, purpose: string): Promise<string> {
    return this.ask(`Guide for EEPROM programming:
Chip Type: ${chipType}
Operation: ${operation}
Purpose: ${purpose}

Provide:
1. Required hardware/programmer
2. Software recommendations
3. Connection diagram
4. Step-by-step procedure
5. Verification methods
6. Safety precautions
7. Legal considerations if applicable`);
  }

  /**
   * Debug embedded system
   */
  async debugEmbedded(issue: string, platform: string, symptoms: string): Promise<string> {
    return this.ask(`Debug embedded system:
Issue: ${issue}
Platform: ${platform}
Symptoms: ${symptoms}

Provide:
1. Diagnostic approach
2. Tools needed
3. Common causes
4. Debug techniques
5. Code inspection points
6. Hardware checks`);
  }

  /**
   * Automotive chip guidance
   */
  async automotiveChip(vehicle: string, goal: string): Promise<string> {
    return this.ask(`Automotive chip guidance:
Vehicle: ${vehicle}
Goal: ${goal}

IMPORTANT: Include legal disclaimers.

Cover:
1. Chip/ECU identification
2. Required tools and software
3. Safety precautions
4. Legal considerations
5. Alternatives to chip modification
6. Professional service recommendations`);
  }

  /**
   * Sensor integration
   */
  async sensorIntegration(sensor: string, mcu: string, requirements: string): Promise<string> {
    return this.ask(`Sensor integration guide:
Sensor: ${sensor}
Microcontroller: ${mcu}
Requirements: ${requirements}

Provide:
1. Wiring diagram
2. Library recommendations
3. Sample code structure
4. Calibration process
5. Common issues
6. Power considerations`);
  }

  /**
   * Protocol implementation
   */
  async protocolGuide(protocol: string, platform: string, useCase: string): Promise<string> {
    return this.ask(`Protocol implementation guide:
Protocol: ${protocol}
Platform: ${platform}
Use Case: ${useCase}

Include:
1. Protocol overview
2. Hardware requirements
3. Software libraries
4. Code examples
5. Debugging tips
6. Common pitfalls`);
  }
}

