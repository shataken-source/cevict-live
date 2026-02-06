/**
 * Camping Bot
 * Specialist in camping, outdoor recreation, and adventure planning
 */

import { BaseBot, BotConfig } from './base-bot.js';

const config: BotConfig = {
  name: 'Scout (Camping)',
  specialty: 'Camping, Outdoor Recreation, Hiking, Adventure Planning',
  systemPrompt: `You are Scout, an expert camping and outdoor recreation AI assistant specializing in:
- Tent and Hammock Camping
- RV and Car Camping
- Backpacking and Thru-hiking
- Camp Cooking and Meal Planning
- Outdoor Gear Selection
- Campsite Selection and Setup
- Leave No Trace Principles
- Wildlife Safety
- Weather Preparedness
- Family Camping
- Winter Camping
- National and State Parks

You help plan memorable outdoor adventures.
You stay current with camping gear, techniques, and outdoor recreation trends.
You emphasize safety, environmental stewardship, and enjoyment.`,
  learningTopics: [
    'Latest camping gear and innovations',
    'National park updates and reservations',
    'Camp cooking techniques and recipes',
    'Backpacking ultralight strategies',
    'RV camping tips and destinations',
    'Wildlife safety protocols',
    'Winter camping techniques',
    'Sustainable camping practices',
  ],
  dailyTasks: [
    'Review camping gear releases',
    'Update campsite recommendations',
    'Check park and trail conditions',
    'Monitor camping safety updates',
  ],
};

export class CampingBot extends BaseBot {
  constructor() {
    super(config);
  }

  protected async executeTask(task: string): Promise<string> {
    switch (task) {
      case 'Review camping gear releases':
        return this.reviewGear();
      case 'Update campsite recommendations':
        return this.updateCampsites();
      case 'Check park and trail conditions':
        return this.checkConditions();
      case 'Monitor camping safety updates':
        return this.monitorSafety();
      default:
        return this.ask(task);
    }
  }

  private async reviewGear(): Promise<string> {
    return this.ask(`What are the latest camping gear innovations?
Include:
1. Tents and shelters
2. Sleep systems
3. Cooking gear
4. Lighting and power
5. Best value options`);
  }

  private async updateCampsites(): Promise<string> {
    return this.ask(`What makes a great campsite?
Cover:
1. Site selection criteria
2. Popular destinations
3. Hidden gems
4. Reservation tips`);
  }

  private async checkConditions(): Promise<string> {
    return this.ask(`How to check and prepare for trail/park conditions?
Include:
1. Weather considerations
2. Trail condition resources
3. Seasonal factors
4. Permit requirements`);
  }

  private async monitorSafety(): Promise<string> {
    return this.ask(`What are current camping safety best practices?
Cover:
1. Wildlife safety
2. Fire safety
3. Weather preparedness
4. First aid priorities`);
  }

  /**
   * Plan camping trip
   */
  async planCampingTrip(destination: string, duration: string, style: string, groupSize: number): Promise<string> {
    return this.ask(`Plan a camping trip:
Destination/Region: ${destination}
Duration: ${duration}
Style: ${style}
Group Size: ${groupSize}

Include:
1. Destination recommendations
2. Campsite suggestions
3. Gear checklist
4. Meal plan
5. Activity recommendations
6. Safety considerations
7. Reservation tips
8. Estimated costs`);
  }

  /**
   * Create gear list
   */
  async createGearList(tripType: string, season: string, budget: string): Promise<string> {
    return this.ask(`Create a camping gear list:
Trip Type: ${tripType}
Season: ${season}
Budget: ${budget}

Include:
1. Shelter and sleep
2. Cooking and food storage
3. Clothing layers
4. Navigation and safety
5. Comfort items
6. Specific product recommendations
7. Weight considerations`);
  }

  /**
   * Camp cooking guide
   */
  async campCooking(cookingMethod: string, duration: string, dietaryNeeds: string): Promise<string> {
    return this.ask(`Create a camp cooking guide:
Cooking Method: ${cookingMethod}
Trip Duration: ${duration}
Dietary Needs: ${dietaryNeeds}

Include:
1. Meal plan with recipes
2. Ingredient list
3. Prep-ahead tips
4. Cooking techniques
5. Food storage
6. Cleanup methods`);
  }

  /**
   * Backpacking guide
   */
  async backpackingGuide(trail: string, fitnessLevel: string, experience: string): Promise<string> {
    return this.ask(`Create a backpacking guide:
Trail/Area: ${trail}
Fitness Level: ${fitnessLevel}
Experience: ${experience}

Include:
1. Trail overview
2. Daily mileage plan
3. Ultralight gear tips
4. Resupply points
5. Water sources
6. Challenging sections
7. Training recommendations`);
  }
}

