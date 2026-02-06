/**
 * Solar Bot
 * Specialist in home and RV solar systems, renewable energy
 */

import { BaseBot, BotConfig } from './base-bot.js';

const config: BotConfig = {
  name: 'Sol (Solar)',
  specialty: 'Home Solar, RV Solar, Battery Systems, Renewable Energy',
  systemPrompt: `You are Sol, an expert solar and renewable energy AI assistant specializing in:
- Residential Solar Systems
- RV and Mobile Solar
- Battery Storage (LiFePO4, Lead-acid, etc.)
- Grid-Tied vs Off-Grid Systems
- Charge Controllers (MPPT, PWM)
- Inverters and Power Management
- Solar Panel Selection
- System Sizing and Design
- DIY Solar Installation
- Cost Analysis and ROI
- Maintenance and Troubleshooting
- Portable Solar Solutions

You help design efficient, cost-effective solar systems.
You stay current with solar technology, battery advancements, and energy regulations.
You emphasize safety, proper sizing, and quality components.`,
  learningTopics: [
    'Latest solar panel technologies',
    'Battery technology advancements (LiFePO4, solid-state)',
    'Smart inverter features',
    'Solar incentives and tax credits',
    'RV solar system innovations',
    'Home battery backup systems',
    'Solar monitoring and optimization',
    'DIY solar installation techniques',
  ],
  dailyTasks: [
    'Review solar technology updates',
    'Check battery technology news',
    'Monitor solar incentive changes',
    'Update system design recommendations',
  ],
};

export class SolarBot extends BaseBot {
  constructor() {
    super(config);
  }

  protected async executeTask(task: string): Promise<string> {
    switch (task) {
      case 'Review solar technology updates':
        return this.reviewSolarTech();
      case 'Check battery technology news':
        return this.checkBatteryTech();
      case 'Monitor solar incentive changes':
        return this.monitorIncentives();
      case 'Update system design recommendations':
        return this.updateDesignRecs();
      default:
        return this.ask(task);
    }
  }

  private async reviewSolarTech(): Promise<string> {
    return this.ask(`What are the latest solar panel technology updates?
Include:
1. Panel efficiency improvements
2. New panel types
3. Price trends
4. Best value panels currently`);
  }

  private async checkBatteryTech(): Promise<string> {
    return this.ask(`What's new in battery storage technology?
Cover:
1. LiFePO4 advancements
2. Solid-state battery progress
3. Home battery options
4. RV battery recommendations`);
  }

  private async monitorIncentives(): Promise<string> {
    return this.ask(`What are current solar incentives and tax credits?
Include:
1. Federal tax credit status
2. State-specific incentives
3. Utility rebates
4. Net metering policies`);
  }

  private async updateDesignRecs(): Promise<string> {
    return this.ask(`What are current best practices for solar system design?
Cover:
1. Optimal panel configurations
2. Battery sizing guidelines
3. Inverter selection
4. Charge controller recommendations`);
  }

  /**
   * Design home solar system
   */
  async designHomeSolar(monthlyKwh: number, roofDetails: string, budget: string, goals: string): Promise<string> {
    return this.ask(`Design a home solar system:
Monthly kWh Usage: ${monthlyKwh}
Roof Details: ${roofDetails}
Budget: ${budget}
Goals: ${goals}

Include:
1. System size recommendation (kW)
2. Panel count and type
3. Inverter recommendation
4. Battery storage (if applicable)
5. Estimated production
6. ROI calculation
7. Installation considerations
8. Component recommendations with prices`);
  }

  /**
   * Design RV solar system
   */
  async designRVSolar(dailyWh: number, rvType: string, budget: string, boondocking: boolean): Promise<string> {
    return this.ask(`Design an RV solar system:
Daily Wh Consumption: ${dailyWh}
RV Type: ${rvType}
Budget: ${budget}
Extended Boondocking: ${boondocking}

Include:
1. Panel wattage and count
2. Battery bank size (Ah)
3. Battery type recommendation
4. Charge controller sizing
5. Inverter needs
6. Mounting options
7. Wiring requirements
8. Component list with prices
9. Installation tips`);
  }

  /**
   * Calculate solar needs
   */
  async calculateSolarNeeds(appliances: string): Promise<string> {
    return this.ask(`Calculate solar system needs:
Appliances and Usage:
${appliances}

Provide:
1. Daily Wh consumption
2. Peak watt requirements
3. Recommended panel wattage
4. Battery capacity needed
5. Inverter size needed
6. System type recommendation`);
  }

  /**
   * Troubleshoot solar system
   */
  async troubleshootSolar(issue: string, systemDetails: string): Promise<string> {
    return this.ask(`Troubleshoot solar system issue:
Issue: ${issue}
System Details: ${systemDetails}

Provide:
1. Possible causes
2. Diagnostic steps
3. Solutions
4. When to call a professional
5. Prevention tips`);
  }

  /**
   * Battery comparison
   */
  async compareBatteries(useCase: string, budget: string): Promise<string> {
    return this.ask(`Compare battery options:
Use Case: ${useCase}
Budget: ${budget}

Compare:
1. LiFePO4 vs Lead-acid vs AGM
2. Capacity and cycles
3. Temperature performance
4. Specific product recommendations
5. Total cost of ownership`);
  }
}

