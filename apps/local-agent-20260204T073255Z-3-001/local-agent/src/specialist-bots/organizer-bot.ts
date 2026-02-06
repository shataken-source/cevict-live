/**
 * Organizer Bot
 * Specialist in project organization, task management, and productivity
 */

import { BaseBot, BotConfig } from './base-bot.js';

const config: BotConfig = {
  name: 'Orion (Organizer)',
  specialty: 'Project Organization, Task Management, Productivity',
  systemPrompt: `You are Orion, an expert organization AI assistant specializing in:
- Project Management
- Task Prioritization
- Code Organization
- File Structure Optimization
- Workflow Automation
- Time Management
- Resource Allocation
- Process Improvement
- Technical Debt Management
- Sprint Planning

You help organize projects, prioritize tasks, and improve productivity.
You suggest efficient workflows and help maintain clean codebases.
You balance short-term needs with long-term maintainability.`,
  learningTopics: [
    'Agile and Scrum best practices',
    'Monorepo organization patterns',
    'Code architecture patterns',
    'Productivity techniques',
    'Project management tools',
    'Technical debt strategies',
    'CI/CD optimization',
    'Team collaboration tools',
  ],
  dailyTasks: [
    'Review and prioritize pending tasks',
    'Identify technical debt items',
    'Suggest workflow improvements',
    'Organize project backlog',
  ],
};

export class OrganizerBot extends BaseBot {
  constructor() {
    super(config);
  }

  protected async executeTask(task: string): Promise<string> {
    switch (task) {
      case 'Review and prioritize pending tasks':
        return this.prioritizeTasks();
      case 'Identify technical debt items':
        return this.identifyTechDebt();
      case 'Suggest workflow improvements':
        return this.suggestWorkflow();
      case 'Organize project backlog':
        return this.organizeBacklog();
      default:
        return this.ask(task);
    }
  }

  private async prioritizeTasks(): Promise<string> {
    return this.ask(`How to effectively prioritize tasks in a software project?
Use frameworks:
1. Eisenhower Matrix
2. MoSCoW Method
3. Value vs Effort
4. RICE Scoring
Provide practical examples.`);
  }

  private async identifyTechDebt(): Promise<string> {
    return this.ask(`How to identify and categorize technical debt?
Include:
1. Code smells to look for
2. Architecture issues
3. Documentation gaps
4. Testing gaps
5. Dependency issues
6. Prioritization criteria`);
  }

  private async suggestWorkflow(): Promise<string> {
    return this.ask(`Suggest workflow improvements for a solo developer managing multiple projects.
Consider:
1. Time blocking
2. Automation opportunities
3. Context switching reduction
4. Documentation habits
5. Code review alternatives`);
  }

  private async organizeBacklog(): Promise<string> {
    return this.ask(`Best practices for organizing a project backlog:
1. Epic and story structure
2. Labeling systems
3. Priority levels
4. Estimation techniques
5. Grooming frequency`);
  }

  /**
   * Analyze project structure
   */
  async analyzeProjectStructure(structure: string): Promise<string> {
    return this.ask(`Analyze this project structure and suggest improvements:

${structure}

Consider:
1. Logical organization
2. Scalability
3. Code discoverability
4. Separation of concerns
5. Best practices for this type of project`);
  }

  /**
   * Create sprint plan
   */
  async createSprintPlan(goals: string, capacity: string): Promise<string> {
    return this.ask(`Create a sprint plan with:
Goals: ${goals}
Capacity: ${capacity}

Include:
1. Sprint goal
2. Task breakdown
3. Story point estimates
4. Dependencies
5. Risks and mitigations`);
  }

  /**
   * Suggest file organization
   */
  async suggestFileOrganization(fileList: string, projectType: string): Promise<string> {
    return this.ask(`Suggest better file organization for a ${projectType} project:

Current files:
${fileList}

Provide:
1. Recommended structure
2. Naming conventions
3. Grouping strategies
4. Index file usage`);
  }

  /**
   * Generate TODO list
   */
  async generateTodoList(project: string, timeframe: string): Promise<string> {
    return this.ask(`Generate a prioritized TODO list for: ${project}
Timeframe: ${timeframe}

Format as:
- [ ] High Priority
- [ ] Medium Priority
- [ ] Low Priority
- [ ] Nice to Have`);
  }

  /**
   * Analyze and reduce complexity
   */
  async analyzeComplexity(description: string): Promise<string> {
    return this.ask(`Analyze complexity and suggest simplifications:

${description}

Consider:
1. Unnecessary complexity
2. Over-engineering signs
3. Simplification opportunities
4. Trade-offs
5. Incremental improvements`);
  }
}

