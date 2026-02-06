/**
 * 3D Printer Bot
 * Specialist in 3D printing, modeling, materials, and maker projects
 */

import { BaseBot, BotConfig } from './base-bot.js';

const config: BotConfig = {
  name: 'Forge (3D Printing)',
  specialty: '3D Printing, CAD Modeling, Materials, Maker Projects',
  systemPrompt: `You are Forge, an expert 3D printing AI assistant specializing in:
- FDM and Resin Printing
- Printer Selection and Setup
- Slicing Software (Cura, PrusaSlicer, etc.)
- CAD Design (Fusion 360, TinkerCAD, Blender)
- Material Selection (PLA, PETG, ABS, TPU, Resin)
- Print Troubleshooting
- Post-Processing Techniques
- Multi-material and Multi-color Printing
- Functional Parts Design
- Printer Modifications and Upgrades
- Enclosures and Ventilation
- Business Applications of 3D Printing

You help with all aspects of 3D printing from design to finished product.
You stay current with printer technology, materials, and techniques.
You emphasize practical solutions and quality results.`,
  learningTopics: [
    'Latest 3D printer releases and reviews',
    'New filament and resin materials',
    'Advanced slicing techniques',
    'Print-in-place mechanisms',
    'Multi-material printing advances',
    'Resin printing innovations',
    'Large format printing solutions',
    'Functional mechanical parts design',
  ],
  dailyTasks: [
    'Review new printer releases',
    'Check material innovations',
    'Update troubleshooting guides',
    'Monitor printing technique advances',
  ],
};

export class Printer3DBot extends BaseBot {
  constructor() {
    super(config);
  }

  protected async executeTask(task: string): Promise<string> {
    switch (task) {
      case 'Review new printer releases':
        return this.reviewPrinters();
      case 'Check material innovations':
        return this.checkMaterials();
      case 'Update troubleshooting guides':
        return this.updateTroubleshooting();
      case 'Monitor printing technique advances':
        return this.monitorTechniques();
      default:
        return this.ask(task);
    }
  }

  private async reviewPrinters(): Promise<string> {
    return this.ask(`What are the latest 3D printer releases and innovations?
Include:
1. Best budget printers
2. Best prosumer printers
3. Resin printer updates
4. Notable features and improvements`);
  }

  private async checkMaterials(): Promise<string> {
    return this.ask(`What are new developments in 3D printing materials?
Cover:
1. New filament types
2. Engineering materials
3. Resin innovations
4. Specialty materials`);
  }

  private async updateTroubleshooting(): Promise<string> {
    return this.ask(`What are common 3D printing problems and solutions?
Include:
1. Bed adhesion issues
2. Layer adhesion problems
3. Stringing and oozing
4. Warping solutions`);
  }

  private async monitorTechniques(): Promise<string> {
    return this.ask(`What are advanced 3D printing techniques?
Cover:
1. Support strategies
2. Orientation optimization
3. Strength optimization
4. Surface finish techniques`);
  }

  /**
   * Recommend printer
   */
  async recommendPrinter(budget: string, useCase: string, experience: string): Promise<string> {
    return this.ask(`Recommend a 3D printer:
Budget: ${budget}
Use Case: ${useCase}
Experience Level: ${experience}

Include:
1. Top 3 recommendations
2. Pros and cons of each
3. Required accessories
4. Setup considerations
5. Total cost estimate`);
  }

  /**
   * Troubleshoot print issue
   */
  async troubleshootPrint(issue: string, printer: string, material: string): Promise<string> {
    return this.ask(`Troubleshoot 3D print issue:
Issue: ${issue}
Printer: ${printer}
Material: ${material}

Provide:
1. Likely causes
2. Step-by-step solutions
3. Slicer settings to check
4. Hardware checks
5. Prevention tips`);
  }

  /**
   * Optimize print settings
   */
  async optimizeSettings(model: string, material: string, goal: string): Promise<string> {
    return this.ask(`Optimize print settings:
Model Type: ${model}
Material: ${material}
Goal: ${goal}

Provide:
1. Layer height recommendation
2. Print speed settings
3. Temperature settings
4. Support settings
5. Infill recommendations
6. Special considerations`);
  }

  /**
   * Design guidance
   */
  async designGuidance(projectType: string, requirements: string): Promise<string> {
    return this.ask(`Provide 3D design guidance:
Project Type: ${projectType}
Requirements: ${requirements}

Include:
1. Design for printability tips
2. Wall thickness recommendations
3. Tolerance guidelines
4. Support considerations
5. Assembly tips if multi-part
6. Recommended CAD software`);
  }

  /**
   * Material selection
   */
  async selectMaterial(application: string, requirements: string): Promise<string> {
    return this.ask(`Recommend material for 3D printing:
Application: ${application}
Requirements: ${requirements}

Compare:
1. Best material options
2. Print difficulty
3. Post-processing needs
4. Cost comparison
5. Specific product recommendations`);
  }
}

