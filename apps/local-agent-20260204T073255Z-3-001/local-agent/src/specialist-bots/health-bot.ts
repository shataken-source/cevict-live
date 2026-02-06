/**
 * Health Bot
 * Specialist in health, wellness, nutrition, fitness, and preventive care
 */

import { BaseBot, BotConfig } from './base-bot.js';

const config: BotConfig = {
  name: 'Vita (Health)',
  specialty: 'Health, Wellness, Nutrition, Fitness, Preventive Care',
  systemPrompt: `You are Vita, an expert health and wellness AI assistant specializing in:
- Nutrition and Diet Planning
- Fitness and Exercise
- Mental Health and Stress Management
- Sleep Optimization
- Preventive Healthcare
- Supplement Science
- Longevity and Anti-aging
- First Aid and Emergency Response
- Chronic Disease Prevention
- Biohacking and Optimization

DISCLAIMER: You provide health information, not medical advice. Users should consult healthcare professionals for medical decisions.

You help with evidence-based health optimization, fitness planning, and wellness strategies.
You stay current with health research, nutrition science, and fitness trends.
You prioritize sustainable, safe practices over quick fixes.`,
  learningTopics: [
    'Latest nutrition research and diet trends',
    'Exercise science and workout optimization',
    'Sleep science and circadian rhythms',
    'Mental health and stress management techniques',
    'Longevity research and anti-aging science',
    'Supplement efficacy and safety',
    'Preventive health screenings',
    'Biohacking techniques and technologies',
  ],
  dailyTasks: [
    'Review latest health research',
    'Update fitness recommendations',
    'Check nutrition science updates',
    'Monitor supplement research',
  ],
};

export class HealthBot extends BaseBot {
  constructor() {
    super(config);
  }

  protected async executeTask(task: string): Promise<string> {
    switch (task) {
      case 'Review latest health research':
        return this.reviewHealthResearch();
      case 'Update fitness recommendations':
        return this.updateFitnessRecs();
      case 'Check nutrition science updates':
        return this.checkNutrition();
      case 'Monitor supplement research':
        return this.monitorSupplements();
      default:
        return this.ask(task);
    }
  }

  private async reviewHealthResearch(): Promise<string> {
    return this.ask(`What are the latest developments in health and longevity research?
Include:
1. Recent clinical trials and findings
2. Emerging health technologies
3. Updated guidelines
4. Breakthrough discoveries`);
  }

  private async updateFitnessRecs(): Promise<string> {
    return this.ask(`What are current evidence-based fitness recommendations?
Cover:
1. Optimal exercise frequency
2. Strength vs cardio balance
3. Recovery protocols
4. Age-specific modifications`);
  }

  private async checkNutrition(): Promise<string> {
    return this.ask(`What are the latest nutrition science updates?
Include:
1. Macronutrient research
2. Intermittent fasting studies
3. Gut health discoveries
4. Anti-inflammatory diets`);
  }

  private async monitorSupplements(): Promise<string> {
    return this.ask(`What supplements have recent research support?
Include:
1. Evidence-backed supplements
2. Dosage recommendations
3. Interaction warnings
4. Quality indicators`);
  }

  /**
   * Create personalized health plan
   */
  async createHealthPlan(profile: string, goals: string): Promise<string> {
    return this.ask(`Create a personalized health optimization plan:
Profile: ${profile}
Goals: ${goals}

Include:
1. Nutrition recommendations
2. Exercise protocol
3. Sleep optimization
4. Stress management
5. Supplement suggestions (if appropriate)
6. Health screenings to consider
7. Progress metrics`);
  }

  /**
   * Analyze diet
   */
  async analyzeDiet(currentDiet: string): Promise<string> {
    return this.ask(`Analyze this diet for nutritional completeness:
${currentDiet}

Provide:
1. Nutritional gaps
2. Improvement suggestions
3. Potential issues
4. Healthy swaps`);
  }

  /**
   * Create workout plan
   */
  async createWorkoutPlan(fitnessLevel: string, equipment: string, goals: string): Promise<string> {
    return this.ask(`Create a workout plan:
Fitness Level: ${fitnessLevel}
Equipment: ${equipment}
Goals: ${goals}

Include:
1. Weekly schedule
2. Exercise descriptions
3. Sets/reps/duration
4. Progression plan
5. Recovery recommendations`);
  }

  /**
   * First aid guidance
   */
  async firstAidGuidance(situation: string): Promise<string> {
    return this.ask(`Provide first aid guidance for: ${situation}

DISCLAIMER: This is informational only. Call emergency services for serious situations.

Include:
1. Immediate steps
2. What to avoid
3. When to seek medical help
4. Prevention tips`);
  }
}

