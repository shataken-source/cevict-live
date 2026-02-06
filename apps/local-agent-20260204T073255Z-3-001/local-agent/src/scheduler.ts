/**
 * Scheduler
 * Runs scheduled tasks automatically
 */

import cron from 'node-cron';
import type { LocalAgent } from './index.js';

interface ScheduledTask {
  name: string;
  schedule: string;
  task: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

export class Scheduler {
  private agent: any;
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private taskConfigs: ScheduledTask[] = [];

  constructor(agent: any) {
    this.agent = agent;

    // Default scheduled tasks
    this.taskConfigs = [
      {
        name: 'Morning Alpha Hunt',
        schedule: '0 6 * * *', // 6 AM daily
        task: 'Run Alpha Hunter morning scan',
        enabled: true,
      },
      {
        name: 'Main Trading Session',
        schedule: '0 9 * * *', // 9 AM daily
        task: 'Run Alpha Hunter full analysis and execute top picks',
        enabled: true,
      },
      {
        name: 'Midday Check',
        schedule: '0 12 * * *', // 12 PM daily
        task: 'Check Alpha Hunter progress and open positions',
        enabled: true,
      },
      {
        name: 'Evening Sports Scan',
        schedule: '0 17 * * *', // 5 PM daily
        task: 'Scan for evening sports opportunities',
        enabled: true,
      },
      {
        name: 'Daily Summary',
        schedule: '0 22 * * *', // 10 PM daily
        task: 'Generate and send daily profit summary',
        enabled: true,
      },
      {
        name: 'Git Auto-Commit',
        schedule: '0 */4 * * *', // Every 4 hours
        task: 'Auto-commit any pending changes',
        enabled: false,
      },
      {
        name: 'Health Check',
        schedule: '*/30 * * * *', // Every 30 minutes
        task: 'Check system health and send alerts if issues',
        enabled: true,
      },
      {
        name: 'Subscription Monitor',
        schedule: '0 */4 * * *', // Every 4 hours
        task: 'Check all API tokens and subscriptions for remaining credits',
        enabled: true,
      },
      {
        name: 'Daily Token Report',
        schedule: '0 8 * * *', // 8 AM daily
        task: 'Generate daily report of all API tokens and subscription status',
        enabled: true,
      },
      {
        name: 'Weekly Bot Academy',
        schedule: '0 10 * * 0', // Sundays at 10 AM
        task: 'Run Bot Academy weekly challenges for all bots',
        enabled: true,
      },
      {
        name: 'Weekly Cleanup',
        schedule: '0 3 * * 0', // 3 AM every Sunday
        task: 'Clean up logs and temporary files',
        enabled: true,
      },
    ];
  }

  start(): void {
    console.log('\n📅 Starting scheduler...');

    for (const config of this.taskConfigs) {
      if (config.enabled) {
        this.scheduleTask(config);
      }
    }

    console.log(`   ${this.tasks.size} tasks scheduled\n`);
  }

  stop(): void {
    for (const [name, task] of this.tasks) {
      task.stop();
      console.log(`   ⏹️ Stopped: ${name}`);
    }
    this.tasks.clear();
  }

  scheduleTask(config: ScheduledTask): void {
    const job = cron.schedule(
      config.schedule,
      async () => {
        console.log(`\n⏰ Running scheduled task: ${config.name}`);
        config.lastRun = new Date();

        try {
          await this.agent.executeAutonomously(config.task);
          console.log(`   ✅ ${config.name} completed`);
        } catch (error) {
          console.error(`   ❌ ${config.name} failed:`, error);
        }
      },
      {
        timezone: 'America/New_York',
      }
    );

    this.tasks.set(config.name, job);
    console.log(`   📌 ${config.name}: ${config.schedule}`);
  }

  addTask(config: ScheduledTask): void {
    this.taskConfigs.push(config);
    if (config.enabled) {
      this.scheduleTask(config);
    }
  }

  removeTask(name: string): boolean {
    const task = this.tasks.get(name);
    if (task) {
      task.stop();
      this.tasks.delete(name);
      this.taskConfigs = this.taskConfigs.filter((t) => t.name !== name);
      return true;
    }
    return false;
  }

  enableTask(name: string): boolean {
    const config = this.taskConfigs.find((t) => t.name === name);
    if (config && !config.enabled) {
      config.enabled = true;
      this.scheduleTask(config);
      return true;
    }
    return false;
  }

  disableTask(name: string): boolean {
    const task = this.tasks.get(name);
    const config = this.taskConfigs.find((t) => t.name === name);
    if (task && config) {
      task.stop();
      this.tasks.delete(name);
      config.enabled = false;
      return true;
    }
    return false;
  }

  getTasks(): ScheduledTask[] {
    return this.taskConfigs;
  }

  getStatus(): string {
    let status = '\n╔═══════════════════════════════════════════════╗\n';
    status += '║            📅 SCHEDULER STATUS                ║\n';
    status += '╠═══════════════════════════════════════════════╣\n';

    for (const config of this.taskConfigs) {
      const icon = config.enabled ? '✅' : '⏸️';
      const name = config.name.slice(0, 20).padEnd(20);
      status += `║  ${icon} ${name} ${config.schedule.padEnd(15)}║\n`;
    }

    status += '╚═══════════════════════════════════════════════╝\n';
    return status;
  }
}

