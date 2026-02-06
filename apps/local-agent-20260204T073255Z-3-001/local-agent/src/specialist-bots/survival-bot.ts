/**
 * Survival Bot
 * Specialist in survival skills, emergency preparedness, and self-reliance
 */

import { BaseBot, BotConfig } from './base-bot.js';

const config: BotConfig = {
  name: 'Rex (Survival)',
  specialty: 'Survival Skills, Emergency Preparedness, Self-Reliance',
  systemPrompt: `You are Rex, an expert survival and emergency preparedness AI assistant specializing in:
- Wilderness Survival Skills
- Emergency Preparedness (SHTF)
- Food and Water Procurement
- Shelter Building
- Fire Starting and Management
- Navigation and Orienteering
- First Aid in Remote Situations
- Self-Defense and Security
- Bug Out Planning
- Long-term Sustainability
- Disaster Response
- Urban Survival

You provide practical, tested survival knowledge.
You stay current with survival techniques, gear reviews, and preparedness strategies.
You emphasize safety, practice, and proper training.`,
  learningTopics: [
    'Modern survival gear and technology',
    'Water purification methods',
    'Food preservation techniques',
    'Emergency communication systems',
    'Natural disaster preparedness',
    'Urban survival strategies',
    'Vehicle emergency preparedness',
    'Cold and hot weather survival',
  ],
  dailyTasks: [
    'Review survival gear innovations',
    'Update emergency preparedness checklists',
    'Check disaster preparedness guides',
    'Monitor survival technique updates',
  ],
};

export class SurvivalBot extends BaseBot {
  constructor() {
    super(config);
  }

  protected async executeTask(task: string): Promise<string> {
    switch (task) {
      case 'Review survival gear innovations':
        return this.reviewGear();
      case 'Update emergency preparedness checklists':
        return this.updateChecklists();
      case 'Check disaster preparedness guides':
        return this.checkDisasterPrep();
      case 'Monitor survival technique updates':
        return this.monitorTechniques();
      default:
        return this.ask(task);
    }
  }

  private async reviewGear(): Promise<string> {
    return this.ask(`What are the latest survival gear innovations?
Include:
1. New survival tools
2. Communication devices
3. Water filtration tech
4. Shelter solutions
5. Fire starting tools`);
  }

  private async updateChecklists(): Promise<string> {
    return this.ask(`Update emergency preparedness checklists for:
1. 72-hour bug out bag
2. Vehicle emergency kit
3. Home shelter-in-place supplies
4. First aid kit essentials`);
  }

  private async checkDisasterPrep(): Promise<string> {
    return this.ask(`What are current best practices for disaster preparedness?
Cover:
1. Natural disasters by region
2. Man-made disaster response
3. Communication plans
4. Evacuation procedures`);
  }

  private async monitorTechniques(): Promise<string> {
    return this.ask(`What survival techniques have been updated or improved?
Include:
1. Fire starting methods
2. Water procurement
3. Shelter construction
4. Navigation without GPS`);
  }

  /**
   * Create bug out bag list
   */
  async createBugOutBag(climate: string, duration: string, people: number): Promise<string> {
    return this.ask(`Create a comprehensive bug out bag list:
Climate: ${climate}
Duration: ${duration}
Number of People: ${people}

Include:
1. Shelter items
2. Water and filtration
3. Food and cooking
4. Fire starting
5. First aid
6. Tools and weapons
7. Communication
8. Navigation
9. Hygiene
10. Documents and money
Weight estimates for each category.`);
  }

  /**
   * Wilderness survival guide
   */
  async wildernessSurvival(environment: string, situation: string): Promise<string> {
    return this.ask(`Provide wilderness survival guidance:
Environment: ${environment}
Situation: ${situation}

Cover the survival priorities:
1. Immediate safety
2. Shelter
3. Water
4. Fire
5. Food
6. Signaling for rescue
7. Navigation to safety`);
  }

  /**
   * Disaster preparedness plan
   */
  async disasterPlan(disasterType: string, location: string): Promise<string> {
    return this.ask(`Create a disaster preparedness plan:
Disaster Type: ${disasterType}
Location Type: ${location}

Include:
1. Warning signs
2. Immediate actions
3. Shelter strategy
4. Supplies needed
5. Communication plan
6. Evacuation routes
7. Recovery steps`);
  }

  /**
   * Food procurement guide
   */
  async foodProcurement(environment: string, season: string): Promise<string> {
    return this.ask(`Guide for finding food in survival situation:
Environment: ${environment}
Season: ${season}

Include:
1. Edible plants (with cautions)
2. Trapping basics
3. Fishing techniques
4. Insects and alternatives
5. What to avoid
6. Calorie priorities`);
  }
}

