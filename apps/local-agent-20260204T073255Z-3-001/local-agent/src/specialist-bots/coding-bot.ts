/**
 * Coding Bot - Autonomous Background Builder & Error Fixer
 * Specializes in building, compiling, and fixing errors across projects
 */

import { BaseBot, BotConfig } from './base-bot.js';

const config: BotConfig = {
  name: 'Coder (Autonomous Builder)',
  specialty: 'Building, Compiling, Error Fixing, Code Quality',
  systemPrompt: `You are Coder, an autonomous coding AI assistant specializing in:
- Building and Compiling Code (TypeScript, JavaScript, Python, React, Next.js)
- Detecting and Fixing Compilation Errors
- Linting and Code Quality
- Dependency Management
- Build System Optimization
- Error Pattern Recognition
- Type Safety Improvements
- Import/Export Fixing
- Package.json Management
- Tsconfig and Build Config
- CI/CD Pipeline Fixes
- Hot Module Replacement Issues
- Webpack/Vite/Turbo Build Optimization

You work on these 6 major projects:
1. PROGNO (Streamlit Python prediction engine)
2. PROGNO-MASSAGER (Streamlit data massager app)
3. LOCAL-AGENT (Node.js/Express autonomous helper)
4. ALPHA-HUNTER (Trading bot suite)
5. TRADING-DASHBOARD (Next.js monitoring GUI)
6. CEVICT-AI (AI orchestration)

You run continuously in the background:
- Monitor for errors
- Attempt automatic fixes
- Build and test
- Report results

CRITICAL: You provide EXACT code fixes, not explanations. When fixing an error, provide the complete corrected code ready to apply.`,
  learningTopics: [
    'TypeScript compilation errors',
    'Next.js build optimization',
    'Python Streamlit debugging',
    'Node.js module resolution',
    'React component errors',
    'Import/export issues',
    'Type definition problems',
    'Build configuration',
    'Dependency conflicts',
    'Monorepo build strategies',
    'Error pattern recognition',
    'Automated testing strategies',
  ],
  dailyTasks: [
    'Scan projects for errors',
    'Build all projects',
    'Fix compilation errors',
    'Update dependencies',
  ],
};

export class CodingBot extends BaseBot {
  constructor() {
    super(config);
  }

  protected async executeTask(task: string): Promise<string> {
    switch (task) {
      case 'Scan projects for errors':
        return this.scanForErrors();
      case 'Build all projects':
        return this.buildAllProjects();
      case 'Fix compilation errors':
        return this.fixErrors();
      case 'Update dependencies':
        return this.updateDependencies();
      default:
        return this.ask(task);
    }
  }

  private async scanForErrors(): Promise<string> {
    return this.ask(`Scan these 6 projects for errors:
1. apps/progno (Python Streamlit)
2. apps/progno-massager (Python Streamlit)
3. apps/local-agent (Node.js/Express)
4. apps/alpha-hunter (Node.js trading bots)
5. apps/trading-dashboard (Next.js)
6. apps/cevict-ai (Node.js AI)

What are the most common error patterns to look for?`);
  }

  private async buildAllProjects(): Promise<string> {
    return this.ask(`What's the optimal build order for these 6 projects in a Turborepo monorepo?
Include:
1. Dependency order
2. Build commands
3. Parallel vs sequential
4. Error handling
5. Build caching`);
  }

  private async fixErrors(): Promise<string> {
    return this.ask(`What are the top 10 most common compilation errors in:
- TypeScript projects
- Next.js apps
- Node.js services
- Python Streamlit apps

For each, provide the fix pattern.`);
  }

  private async updateDependencies(): Promise<string> {
    return this.ask(`Best practices for updating dependencies in a Turborepo monorepo:
1. When to update
2. How to test after updates
3. Handling breaking changes
4. Version pinning strategy
5. pnpm workspace management`);
  }

  /**
   * Fix a specific error
   */
  async fixError(error: string, filePath: string, codeContext: string): Promise<string> {
    return this.ask(`FIX THIS ERROR:
File: ${filePath}
Error: ${error}

Code Context:
${codeContext}

Provide ONLY the corrected code, ready to replace the error. No explanations.`);
  }

  /**
   * Analyze build output
   */
  async analyzeBuildOutput(output: string, project: string): Promise<string> {
    return this.ask(`Analyze this build output from ${project}:

${output}

Provide:
1. Error summary
2. Root cause
3. Exact fix (code or command)
4. Priority (critical/high/medium/low)`);
  }

  /**
   * Suggest build optimization
   */
  async optimizeBuild(project: string, buildTime: number): Promise<string> {
    return this.ask(`Optimize build for ${project}:
Current build time: ${buildTime}ms

Suggest:
1. Build config improvements
2. Cache strategies
3. Dependency optimizations
4. Parallelization opportunities`);
  }

  /**
   * Fix import errors
   */
  async fixImportError(importStatement: string, error: string): Promise<string> {
    return this.ask(`Fix this import error:
Import: ${importStatement}
Error: ${error}

Provide the corrected import statement only.`);
  }
}

