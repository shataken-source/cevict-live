/**
 * Click Watcher - Learn from User Actions
 * Watches what user clicks and learns to replicate it
 * "Watch and Learn" mode for AI Braille
 */

import { uiAutomation } from './ui-automation.js';
import * as fs from 'fs';
import * as path from 'path';

interface ClickedElement {
  windowTitle: string;
  process: string;
  timestamp: Date;
  tabIndex?: number; // If we can determine it
  position?: { x: number; y: number };
  elementType?: string;
  context?: string; // What was happening when clicked
  action: 'click' | 'double-click' | 'right-click';
}

interface LearnedClick {
  pattern: string; // Description of when to use this
  sequence: ClickedElement[];
  successRate: number;
  lastUsed: Date;
  timesUsed: number;
}

export class ClickWatcher {
  private isWatching: boolean = false;
  private clickHistory: ClickedElement[] = [];
  private learnedClicks: Map<string, LearnedClick> = new Map();
  private knowledgeBase: string;
  private currentContext: string = '';

  constructor() {
    this.knowledgeBase = path.join(
      process.env.WORKSPACE_PATH || 'C:\\gcc\\cevict-app\\cevict-monorepo',
      'apps',
      'local-agent',
      'data',
      'learned-clicks.json'
    );
    this.loadKnowledgeBase();
  }

  /**
   * Start watching user clicks
   */
  async startWatching(context?: string): Promise<void> {
    if (this.isWatching) {
      console.log('⚠️ Already watching clicks');
      return;
    }

    this.currentContext = context || 'general';
    this.isWatching = true;
    this.clickHistory = [];

    console.log(`👁️ Click Watcher started - watching for clicks in context: ${this.currentContext}`);
    console.log('💡 Click on things and I will learn!');

    // Start monitoring (in production, would use mouse hooks)
    // For now, we'll use a polling method to detect window changes
    this.startMonitoring();
  }

  /**
   * Stop watching
   */
  stopWatching(): void {
    this.isWatching = false;
    console.log('🛑 Click Watcher stopped');
  }

  /**
   * Record a click (called when user clicks something)
   */
  async recordClick(
    windowTitle: string,
    action: 'click' | 'double-click' | 'right-click' = 'click'
  ): Promise<void> {
    if (!this.isWatching) return;

    const windows = await uiAutomation.getOpenWindows();
    const window = windows.windows.find(w =>
      w.title.toLowerCase().includes(windowTitle.toLowerCase())
    );

    if (!window) {
      console.warn(`⚠️ Window not found: ${windowTitle}`);
      return;
    }

    // Try to determine tab index by tabbing through
    // This is AI Braille - "feeling" where the element is
    const tabIndex = await this.determineTabIndex(window.title);

    const clickedElement: ClickedElement = {
      windowTitle: window.title,
      process: window.process,
      timestamp: new Date(),
      tabIndex,
      action,
      context: this.currentContext,
    };

    this.clickHistory.push(clickedElement);
    console.log(`📝 Recorded click: ${window.title} (tab index: ${tabIndex || 'unknown'})`);

    // Auto-save
    this.saveKnowledgeBase();
  }

  /**
   * Determine tab index by "feeling" the interface (AI Braille)
   */
  private async determineTabIndex(windowTitle: string): Promise<number | undefined> {
    try {
      // This is a simplified version
      // In production, would use more sophisticated detection
      // For now, we'll estimate based on recent tab activity
      return this.clickHistory.length + 1;
    } catch {
      return undefined;
    }
  }

  /**
   * Learn from click sequence
   */
  learnSequence(pattern: string, sequence: ClickedElement[]): void {
    const learned: LearnedClick = {
      pattern,
      sequence,
      successRate: 1.0, // Start with 100%
      lastUsed: new Date(),
      timesUsed: 0,
    };

    this.learnedClicks.set(pattern, learned);
    this.saveKnowledgeBase();

    console.log(`🧠 Learned click sequence: "${pattern}" (${sequence.length} clicks)`);
  }

  /**
   * Replay learned click sequence
   */
  async replaySequence(pattern: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const learned = this.learnedClicks.get(pattern);
    if (!learned) {
      return {
        success: false,
        error: `Pattern "${pattern}" not learned`,
      };
    }

    console.log(`🎬 Replaying sequence: "${pattern}"`);

    try {
      for (const click of learned.sequence) {
        // Activate window
        await uiAutomation.activateWindow(click.windowTitle);
        await new Promise(r => setTimeout(r, 200));

        // Navigate to element using tab index
        if (click.tabIndex) {
          await uiAutomation.tabThroughUI(click.windowTitle, click.tabIndex - 1);
        }

        // Perform action
        switch (click.action) {
          case 'click':
            await uiAutomation.sendKeys('Enter', click.windowTitle);
            break;
          case 'double-click':
            await uiAutomation.sendKeys('Enter', click.windowTitle);
            await new Promise(r => setTimeout(r, 100));
            await uiAutomation.sendKeys('Enter', click.windowTitle);
            break;
          case 'right-click':
            // Right-click simulation (context menu)
            await uiAutomation.sendKeys('Shift+F10', click.windowTitle);
            break;
        }

        await new Promise(r => setTimeout(r, 300)); // Wait between clicks
      }

      // Update usage stats
      learned.timesUsed++;
      learned.lastUsed = new Date();
      this.saveKnowledgeBase();

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get current click history
   */
  getClickHistory(): ClickedElement[] {
    return this.clickHistory;
  }

  /**
   * Get all learned sequences
   */
  getAllLearned(): LearnedClick[] {
    return Array.from(this.learnedClicks.values());
  }

  /**
   * Start monitoring (simplified - in production would use mouse hooks)
   */
  private startMonitoring(): void {
    // In production, this would use system hooks to detect actual mouse clicks
    // For now, we'll provide an API for manual recording
    console.log('💡 Use the API to record clicks: POST /click-watcher/record');
  }

  /**
   * Save knowledge base
   */
  private saveKnowledgeBase(): void {
    try {
      const dir = path.dirname(this.knowledgeBase);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        learnedClicks: Array.from(this.learnedClicks.entries()).map(([pattern, learned]) => ({
          pattern,
          sequence: learned.sequence,
          successRate: learned.successRate,
          lastUsed: learned.lastUsed.toISOString(),
          timesUsed: learned.timesUsed,
        })),
        clickHistory: this.clickHistory.slice(-100), // Keep last 100
        lastUpdated: new Date().toISOString(),
      };

      fs.writeFileSync(this.knowledgeBase, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.warn('Failed to save click knowledge base:', error);
    }
  }

  /**
   * Load knowledge base
   */
  private loadKnowledgeBase(): void {
    try {
      if (!fs.existsSync(this.knowledgeBase)) {
        return;
      }

      const data = JSON.parse(fs.readFileSync(this.knowledgeBase, 'utf-8'));

      if (data.learnedClicks) {
        data.learnedClicks.forEach((item: any) => {
          this.learnedClicks.set(item.pattern, {
            pattern: item.pattern,
            sequence: item.sequence,
            successRate: item.successRate,
            lastUsed: new Date(item.lastUsed),
            timesUsed: item.timesUsed,
          });
        });
      }

      console.log(`📚 Loaded ${this.learnedClicks.size} learned click sequences`);
    } catch (error) {
      console.warn('Failed to load click knowledge base:', error);
    }
  }

  /**
   * Smart replay - finds best sequence for context
   */
  async smartReplay(context: string): Promise<{
    success: boolean;
    pattern?: string;
    error?: string;
  }> {
    // Find best matching learned sequence
    const matching = Array.from(this.learnedClicks.values())
      .filter(learned => learned.sequence.some(click => click.context === context))
      .sort((a, b) => b.successRate - a.successRate);

    if (matching.length === 0) {
      return {
        success: false,
        error: `No learned sequence for context: ${context}`,
      };
    }

    const best = matching[0];
    const result = await this.replaySequence(best.pattern);

    return {
      ...result,
      pattern: best.pattern,
    };
  }
}

export const clickWatcher = new ClickWatcher();

