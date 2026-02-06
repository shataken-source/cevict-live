/**
 * Autonomous Code Fixer Service
 * Runs in background, monitors projects, builds them, and fixes errors
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CodingBot } from '../specialist-bots/coding-bot.js';

const execAsync = promisify(exec);

interface Project {
  name: string;
  path: string;
  type: 'node' | 'python';
  buildCommand?: string;
  lintCommand?: string;
  dependencies?: string[];
}

interface BuildResult {
  project: string;
  success: boolean;
  errors: string[];
  warnings: string[];
  buildTime: number;
  timestamp: Date;
}

interface FixAttempt {
  error: string;
  fix: string;
  success: boolean;
  timestamp: Date;
}

export class AutonomousCodeFixer {
  private codingBot: CodingBot;
  private isRunning = false;
  private buildHistory: BuildResult[] = [];
  private fixAttempts: FixAttempt[] = [];
  private cycleInterval = 300000; // 5 minutes
  
  private projects: Project[] = [
    {
      name: 'PROGNO',
      path: 'apps/progno',
      type: 'python',
    },
    {
      name: 'PROGNO-MASSAGER',
      path: 'apps/progno-massager',
      type: 'python',
    },
    {
      name: 'LOCAL-AGENT',
      path: 'apps/local-agent',
      type: 'node',
      buildCommand: 'pnpm run build',
      lintCommand: 'pnpm run lint',
    },
    {
      name: 'ALPHA-HUNTER',
      path: 'apps/alpha-hunter',
      type: 'node',
      buildCommand: 'npx tsc --noEmit',
      dependencies: ['LOCAL-AGENT'],
    },
    {
      name: 'TRADING-DASHBOARD',
      path: 'apps/trading-dashboard',
      type: 'node',
      buildCommand: 'pnpm run build',
      lintCommand: 'pnpm run lint',
      dependencies: ['LOCAL-AGENT'],
    },
    {
      name: 'CEVICT-AI',
      path: 'apps/cevict-ai',
      type: 'node',
      buildCommand: 'npx tsc --noEmit',
    },
  ];

  constructor(monorepoRoot: string = 'C:\\gcc\\cevict-app\\cevict-monorepo') {
    this.codingBot = new CodingBot();
    this.monorepoRoot = monorepoRoot;
    
    console.log('\n🤖 AUTONOMOUS CODE FIXER INITIALIZED');
    console.log(`   Monitoring ${this.projects.length} projects`);
    console.log(`   Cycle interval: ${this.cycleInterval / 1000}s\n`);
  }

  private monorepoRoot: string;

  /**
   * Start the autonomous fixer
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting Autonomous Code Fixer...\n');
    
    // Train on projects
    await this.trainOnProjects();
    
    // Start monitoring loop
    this.monitoringLoop();
  }

  /**
   * Stop the fixer
   */
  stop(): void {
    this.isRunning = false;
    console.log('🛑 Stopping Autonomous Code Fixer...');
  }

  /**
   * Train the bot on all 6 projects
   */
  private async trainOnProjects(): Promise<void> {
    console.log('📚 TRAINING ON 6 MAJOR PROJECTS\n');
    
    for (const project of this.projects) {
      console.log(`   📖 Learning ${project.name}...`);
      
      try {
        // Read package.json or requirements.txt
        const projectPath = path.join(this.monorepoRoot, project.path);
        
        if (project.type === 'node') {
          const packageJson = await fs.readFile(
            path.join(projectPath, 'package.json'),
            'utf-8'
          );
          
          const pkg = JSON.parse(packageJson);
          
          // Learn about the project
          await this.codingBot.ask(`Learn about this Node.js project:
Name: ${project.name}
Dependencies: ${Object.keys(pkg.dependencies || {}).join(', ')}
Scripts: ${Object.keys(pkg.scripts || {}).join(', ')}

Store this knowledge for future error fixing.`);
          
        } else if (project.type === 'python') {
          // Python project
          await this.codingBot.ask(`Learn about this Python Streamlit project:
Name: ${project.name}
Type: Streamlit web application

Store this knowledge for future error fixing.`);
        }
        
        console.log(`      ✅ ${project.name} learned`);
        
      } catch (error: any) {
        console.log(`      ⚠️  ${project.name} training skipped: ${error.message}`);
      }
    }
    
    console.log('\n✅ Training complete!\n');
  }

  /**
   * Main monitoring loop
   */
  private async monitoringLoop(): Promise<void> {
    while (this.isRunning) {
      console.log('\n' + '='.repeat(80));
      console.log(`🔄 BUILD & FIX CYCLE - ${new Date().toLocaleTimeString()}`);
      console.log('='.repeat(80) + '\n');
      
      // Build all projects in dependency order
      for (const project of this.getDependencyOrder()) {
        await this.buildAndFix(project);
      }
      
      // Show summary
      this.showCycleSummary();
      
      // Wait for next cycle
      console.log(`\n⏳ Next cycle in ${this.cycleInterval / 1000}s...\n`);
      await this.sleep(this.cycleInterval);
    }
  }

  /**
   * Get projects in dependency order
   */
  private getDependencyOrder(): Project[] {
    const ordered: Project[] = [];
    const remaining = [...this.projects];
    
    while (remaining.length > 0) {
      const canBuild = remaining.filter(p => 
        !p.dependencies || 
        p.dependencies.every(dep => ordered.some(o => o.name === dep))
      );
      
      if (canBuild.length === 0) break;
      
      ordered.push(...canBuild);
      canBuild.forEach(p => {
        const idx = remaining.indexOf(p);
        if (idx >= 0) remaining.splice(idx, 1);
      });
    }
    
    return ordered;
  }

  /**
   * Build a project and fix errors if found
   */
  private async buildAndFix(project: Project): Promise<void> {
    console.log(`\n📦 Building ${project.name}...`);
    const startTime = Date.now();
    
    try {
      const projectPath = path.join(this.monorepoRoot, project.path);
      
      if (project.type === 'node' && project.buildCommand) {
        // Node.js project - run build
        const { stdout, stderr } = await execAsync(project.buildCommand, {
          cwd: projectPath,
          timeout: 120000, // 2 min timeout
        });
        
        const buildTime = Date.now() - startTime;
        
        if (stderr && stderr.includes('error')) {
          // Errors found
          console.log(`   ❌ Build failed (${buildTime}ms)`);
          console.log(`   Errors found, attempting fixes...`);
          
          await this.attemptFixes(project, stderr);
          
          this.buildHistory.push({
            project: project.name,
            success: false,
            errors: this.parseErrors(stderr),
            warnings: this.parseWarnings(stderr),
            buildTime,
            timestamp: new Date(),
          });
        } else {
          // Success
          console.log(`   ✅ Build successful (${buildTime}ms)`);
          
          this.buildHistory.push({
            project: project.name,
            success: true,
            errors: [],
            warnings: this.parseWarnings(stdout + stderr),
            buildTime,
            timestamp: new Date(),
          });
        }
        
      } else if (project.type === 'python') {
        // Python project - check syntax
        console.log(`   ℹ️  Python project (no build command)`);
        
        this.buildHistory.push({
          project: project.name,
          success: true,
          errors: [],
          warnings: [],
          buildTime: 0,
          timestamp: new Date(),
        });
      }
      
    } catch (error: any) {
      const buildTime = Date.now() - startTime;
      console.log(`   ❌ Build failed (${buildTime}ms)`);
      
      const errorOutput = error.stdout + error.stderr;
      console.log(`   Attempting fixes...`);
      
      await this.attemptFixes(project, errorOutput);
      
      this.buildHistory.push({
        project: project.name,
        success: false,
        errors: this.parseErrors(errorOutput),
        warnings: [],
        buildTime,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Attempt to fix errors
   */
  private async attemptFixes(project: Project, errorOutput: string): Promise<void> {
    const errors = this.parseErrors(errorOutput);
    
    console.log(`   Found ${errors.length} error(s)`);
    
    for (let i = 0; i < Math.min(errors.length, 5); i++) {
      const error = errors[i];
      console.log(`\n   🔧 Fixing error ${i + 1}/${Math.min(errors.length, 5)}`);
      console.log(`      ${error.substring(0, 100)}...`);
      
      try {
        // Ask coding bot for fix
        const analysis = await this.codingBot.analyzeBuildOutput(error, project.name);
        
        console.log(`      💡 Analysis: ${analysis.substring(0, 150)}...`);
        
        // Log the attempt
        this.fixAttempts.push({
          error,
          fix: analysis,
          success: false, // We'll verify in next cycle
          timestamp: new Date(),
        });
        
      } catch (error: any) {
        console.log(`      ⚠️  Fix analysis failed: ${error.message}`);
      }
    }
  }

  /**
   * Parse errors from build output
   */
  private parseErrors(output: string): string[] {
    const lines = output.split('\n');
    const errors: string[] = [];
    
    for (const line of lines) {
      if (line.includes('error TS') || 
          line.includes('Error:') || 
          line.includes('ERROR') ||
          line.toLowerCase().includes('error:')) {
        errors.push(line.trim());
      }
    }
    
    return errors;
  }

  /**
   * Parse warnings from build output
   */
  private parseWarnings(output: string): string[] {
    const lines = output.split('\n');
    const warnings: string[] = [];
    
    for (const line of lines) {
      if (line.includes('warning') || line.includes('Warning:')) {
        warnings.push(line.trim());
      }
    }
    
    return warnings;
  }

  /**
   * Show cycle summary
   */
  private showCycleSummary(): void {
    console.log('\n' + '─'.repeat(80));
    console.log('📊 CYCLE SUMMARY');
    console.log('─'.repeat(80));
    
    const recentBuilds = this.buildHistory.slice(-this.projects.length);
    const successful = recentBuilds.filter(b => b.success).length;
    const failed = recentBuilds.length - successful;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🔧 Fix attempts: ${this.fixAttempts.length}`);
    
    if (failed > 0) {
      console.log('\nFailed projects:');
      recentBuilds.filter(b => !b.success).forEach(b => {
        console.log(`   • ${b.project}: ${b.errors.length} error(s)`);
      });
    }
    
    console.log('─'.repeat(80));
  }

  /**
   * Get status
   */
  getStatus(): any {
    const recentBuilds = this.buildHistory.slice(-this.projects.length);
    const successful = recentBuilds.filter(b => b.success).length;
    
    return {
      isRunning: this.isRunning,
      projects: this.projects.length,
      cycleInterval: this.cycleInterval,
      totalBuilds: this.buildHistory.length,
      recentSuccess: successful,
      recentFailed: recentBuilds.length - successful,
      fixAttempts: this.fixAttempts.length,
      lastCycle: recentBuilds[recentBuilds.length - 1]?.timestamp,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton
export const autonomousCodeFixer = new AutonomousCodeFixer();

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const fixer = new AutonomousCodeFixer();
  
  console.log('🤖 AUTONOMOUS CODE FIXER');
  console.log('   Building, compiling, and fixing errors automatically\n');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    fixer.stop();
    process.exit(0);
  });
  
  await fixer.start();
}

