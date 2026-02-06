/**
 * Intent Executor
 * Takes Intent Language and executes it
 * Bridges human intent to actual actions
 */

import { intentLanguage, Intent } from './intent-language.js';
import { guiGenius } from './gui-genius.js';
import { aiBrailleGenius } from './ai-braille-genius.js';
import { uiAutomation } from './ui-automation.js';

export class IntentExecutor {
  /**
   * Execute intent - the magic happens here
   */
  async execute(command: string): Promise<{
    success: boolean;
    result: any;
    explanation: string;
    error?: string;
  }> {
    // Parse command into intent
    const intent = intentLanguage.parse(command);
    const explanation = intentLanguage.explain(intent);

    console.log(`🎯 Executing Intent: ${explanation}`);

    try {
      // Route intent to appropriate handler
      const result = await this.routeIntent(intent);
      
      return {
        success: true,
        result,
        explanation,
      };
    } catch (error: any) {
      return {
        success: false,
        result: null,
        explanation,
        error: error.message,
      };
    }
  }

  /**
   * Route intent to appropriate handler
   */
  private async routeIntent(intent: Intent): Promise<any> {
    const action = intent.action.toLowerCase();
    const target = intent.target.toLowerCase();

    // Fix actions
    if (action === 'fix' || action.includes('fix')) {
      return await this.handleFix(intent);
    }

    // Start/Stop actions
    if (['start', 'stop', 'restart', 'pause', 'resume'].includes(action)) {
      return await this.handleControl(intent);
    }

    // Show/Get actions
    if (['show', 'get', 'fetch', 'display', 'give'].includes(action)) {
      return await this.handleShow(intent);
    }

    // Create actions
    if (action === 'create' || action.includes('create')) {
      return await this.handleCreate(intent);
    }

    // Change/Set actions
    if (['change', 'set', 'update', 'modify'].includes(action)) {
      return await this.handleChange(intent);
    }

    // Query actions
    if (action === 'query') {
      return await this.handleQuery(intent);
    }

    // Execute actions (fallback)
    if (action === 'execute') {
      return await guiGenius.executeWithIntelligence(intent.target);
    }

    // Default: use GUI Genius
    return await guiGenius.executeWithIntelligence(`${intent.action} ${intent.target}`);
  }

  /**
   * Handle fix intent
   */
  private async handleFix(intent: Intent): Promise<any> {
    const target = intent.target.toLowerCase();

    if (target.includes('accept') || target.includes('button')) {
      // Fix accept button
      const cursorAcceptWatcher = await import('./cursor-accept-watcher.js');
      await cursorAcceptWatcher.cursorAcceptWatcher.start();
      return { message: 'Accept button watcher started' };
    }

    if (target.includes('error') || target.includes('bug')) {
      // Auto-debug
      return await guiGenius.executeWithIntelligence(`Debug ${intent.target}`);
    }

    // Generic fix
    return await guiGenius.executeWithIntelligence(`Fix ${intent.target}`);
  }

  /**
   * Handle control intent (start/stop/restart)
   */
  private async handleControl(intent: Intent): Promise<any> {
    const action = intent.action.toLowerCase();
    const target = intent.target.toLowerCase();

    if (target.includes('trading') || target.includes('bot')) {
      return await guiGenius.executeWithIntelligence(`${action} trading bot`);
    }

    if (target.includes('dashboard')) {
      return await guiGenius.executeWithIntelligence(`${action} dashboard`);
    }

    if (target.includes('agent') || target.includes('local')) {
      return await guiGenius.executeWithIntelligence(`${action} local agent`);
    }

    // Generic control
    return await guiGenius.executeWithIntelligence(`${action} ${target}`);
  }

  /**
   * Handle show intent
   */
  private async handleShow(intent: Intent): Promise<any> {
    const target = intent.target.toLowerCase();

    if (target.includes('dashboard') || target.includes('gui')) {
      return {
        message: 'Dashboard available at http://localhost:3011',
        url: 'http://localhost:3011',
      };
    }

    if (target.includes('status') || target.includes('progress')) {
      return await guiGenius.executeWithIntelligence(`Show ${target}`);
    }

    // Generic show
    return await guiGenius.executeWithIntelligence(`Show ${target}`);
  }

  /**
   * Handle create intent
   */
  private async handleCreate(intent: Intent): Promise<any> {
    const details = intent.parameters?.details || '';
    return await guiGenius.executeWithIntelligence(`Create ${intent.target} ${details}`);
  }

  /**
   * Handle change intent
   */
  private async handleChange(intent: Intent): Promise<any> {
    const value = intent.parameters?.value || '';
    return await guiGenius.executeWithIntelligence(`Change ${intent.target} to ${value}`);
  }

  /**
   * Handle query intent
   */
  private async handleQuery(intent: Intent): Promise<any> {
    return await guiGenius.executeWithIntelligence(intent.target);
  }
}

export const intentExecutor = new IntentExecutor();

