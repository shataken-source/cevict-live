/**
 * Architecture Bot
 * Specialist in building design, construction, and architectural planning
 */

import { BaseBot, BotConfig } from './base-bot.js';

const config: BotConfig = {
  name: 'Arch (Architecture)',
  specialty: 'Building Design, Construction Planning, Architectural Styles',
  systemPrompt: `You are Arch, an expert architecture and building design AI assistant specializing in:
- Residential Architecture
- Commercial Building Design
- Sustainable/Green Building
- Building Codes and Regulations
- Space Planning and Layout
- Structural Considerations
- Interior Design Integration
- Historic Preservation
- Tiny Houses and ADUs
- Renovation and Remodeling
- Construction Materials
- Cost Estimation
- Building Systems (HVAC, Plumbing, Electrical)
- Landscape Architecture

You help with building design, planning, and construction guidance.
You stay current with architectural trends, building codes, and sustainable practices.
You balance aesthetics, functionality, and budget considerations.`,
  learningTopics: [
    'Sustainable building innovations',
    'Tiny house and ADU regulations',
    'Smart home integration in architecture',
    'Passive house design principles',
    'Modular and prefab construction',
    'Building code updates',
    'Accessible design requirements',
    'Energy-efficient building envelope design',
  ],
  dailyTasks: [
    'Review architectural design trends',
    'Check building code updates',
    'Monitor sustainable building innovations',
    'Update construction cost estimates',
  ],
};

export class ArchitectureBot extends BaseBot {
  constructor() {
    super(config);
  }

  protected async executeTask(task: string): Promise<string> {
    switch (task) {
      case 'Review architectural design trends':
        return this.reviewTrends();
      case 'Check building code updates':
        return this.checkCodes();
      case 'Monitor sustainable building innovations':
        return this.monitorSustainable();
      case 'Update construction cost estimates':
        return this.updateCosts();
      default:
        return this.ask(task);
    }
  }

  private async reviewTrends(): Promise<string> {
    return this.ask(`What are current architectural design trends?
Include:
1. Residential design trends
2. Commercial trends
3. Material trends
4. Technology integration`);
  }

  private async checkCodes(): Promise<string> {
    return this.ask(`What are important building code considerations?
Cover:
1. Recent code changes
2. Energy code requirements
3. Accessibility requirements
4. Fire safety updates`);
  }

  private async monitorSustainable(): Promise<string> {
    return this.ask(`What are innovations in sustainable building?
Include:
1. Net-zero strategies
2. Renewable integration
3. Material sustainability
4. Water conservation`);
  }

  private async updateCosts(): Promise<string> {
    return this.ask(`What are current construction cost factors?
Cover:
1. Cost per square foot ranges
2. Material cost trends
3. Labor considerations
4. Regional variations`);
  }

  /**
   * Design home layout
   */
  async designHomeLayout(sqft: number, bedrooms: number, style: string, requirements: string): Promise<string> {
    return this.ask(`Design a home layout:
Square Footage: ${sqft}
Bedrooms: ${bedrooms}
Style: ${style}
Requirements: ${requirements}

Include:
1. Room layout recommendations
2. Flow and circulation
3. Natural light optimization
4. Storage solutions
5. Outdoor space integration
6. Rough room dimensions`);
  }

  /**
   * Estimate construction cost
   */
  async estimateCost(projectType: string, size: string, location: string, finishLevel: string): Promise<string> {
    return this.ask(`Estimate construction cost:
Project Type: ${projectType}
Size: ${size}
Location: ${location}
Finish Level: ${finishLevel}

Provide:
1. Cost per square foot range
2. Total cost estimate
3. Major cost categories
4. Contingency recommendations
5. Cost-saving opportunities`);
  }

  /**
   * Review renovation plans
   */
  async reviewRenovation(currentState: string, goals: string, budget: string): Promise<string> {
    return this.ask(`Review renovation plans:
Current State: ${currentState}
Goals: ${goals}
Budget: ${budget}

Provide:
1. Feasibility assessment
2. Structural considerations
3. Permit requirements
4. Phasing recommendations
5. ROI analysis
6. Potential challenges`);
  }

  /**
   * ADU/Tiny house guidance
   */
  async aduGuidance(lotSize: string, location: string, purpose: string): Promise<string> {
    return this.ask(`Provide ADU/Tiny house guidance:
Lot Size: ${lotSize}
Location Type: ${location}
Purpose: ${purpose}

Include:
1. Size limitations
2. Setback requirements
3. Design options
4. Utility connections
5. Permit process
6. Cost estimates`);
  }

  /**
   * Sustainable building advice
   */
  async sustainableBuilding(projectType: string, climate: string, goals: string): Promise<string> {
    return this.ask(`Provide sustainable building advice:
Project Type: ${projectType}
Climate Zone: ${climate}
Sustainability Goals: ${goals}

Include:
1. Passive design strategies
2. Material recommendations
3. Energy systems
4. Water conservation
5. Certification options (LEED, etc.)
6. ROI of green features`);
  }
}

