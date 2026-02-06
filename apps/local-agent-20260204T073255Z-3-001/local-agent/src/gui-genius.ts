/**
 * GUI Genius - AI Training Module
 * Teaches Local Agent to be a genius at using the GUI
 * Learns from AI assistant commands and executes via GUI
 */

import Anthropic from '@anthropic-ai/sdk';
import { guiController } from './gui-controller.js';

interface LearningExample {
  instruction: string;
  method: string;
  command?: string;
  success: boolean;
  timestamp: Date;
}

export class GUIGenius {
  private claude: Anthropic | null;
  private learnings: LearningExample[] = [];
  private knowledgeBase: Map<string, string> = new Map();

  constructor() {
    this.claude = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;

    // Initialize knowledge base
    this.initializeKnowledge();
  }

  /**
   * Initialize knowledge base with GUI operations
   */
  private initializeKnowledge(): void {
    this.knowledgeBase.set('default-cwd', 'C:\\gcc\\cevict-app\\cevict-monorepo');
    this.knowledgeBase.set('gui-url', 'http://localhost:3011');
    this.knowledgeBase.set('local-agent-url', 'http://localhost:3847');
    
    // Quick actions knowledge
    this.knowledgeBase.set('start-trading', 'cd apps/alpha-hunter && pnpm run kalshi');
    this.knowledgeBase.set('start-crypto', 'cd apps/alpha-hunter && pnpm run train');
    this.knowledgeBase.set('start-local-agent', 'cd apps/local-agent && pnpm dev');
    this.knowledgeBase.set('install-deps', 'pnpm install');
    this.knowledgeBase.set('git-status', 'git status');
    
    // File operations knowledge
    this.knowledgeBase.set('read-file-pattern', 'read file {path}');
    this.knowledgeBase.set('list-files-pattern', 'list files in {path}');
    this.knowledgeBase.set('navigate-pattern', 'navigate to {path}');
  }

  /**
   * Learn from an AI assistant command
   */
  async learnFromCommand(instruction: string, result: any): Promise<void> {
    const learning: LearningExample = {
      instruction,
      method: result.method || 'unknown',
      command: result.command,
      success: result.success || false,
      timestamp: new Date(),
    };

    this.learnings.push(learning);
    
    // Keep last 100 learnings
    if (this.learnings.length > 100) {
      this.learnings.shift();
    }

    // Update knowledge base if successful
    if (result.success && result.method) {
      this.updateKnowledge(instruction, result.method);
    }
  }

  /**
   * Update knowledge base from successful operations
   */
  private updateKnowledge(instruction: string, method: string): void {
    const key = this.extractKey(instruction);
    if (key) {
      this.knowledgeBase.set(key, method);
    }
  }

  /**
   * Extract key from instruction for knowledge storage
   */
  private extractKey(instruction: string): string | null {
    const lower = instruction.toLowerCase();
    
    if (lower.includes('start trading') || lower.includes('kalshi')) {
      return 'start-trading';
    }
    if (lower.includes('start crypto') || lower.includes('coinbase')) {
      return 'start-crypto';
    }
    if (lower.includes('install')) {
      return 'install-deps';
    }
    if (lower.includes('git status')) {
      return 'git-status';
    }
    
    return null;
  }

  /**
   * Execute command with AI intelligence
   * Uses Intent Language first, then Claude if needed
   */
  async executeWithIntelligence(instruction: string): Promise<{
    success: boolean;
    output: string;
    error?: string;
    method: string;
    reasoning?: string;
  }> {
    // Try Intent Language first (revolutionary new way!)
    try {
      const intentExecutor = await import('./intent-executor.js');
      const intentResult = await intentExecutor.intentExecutor.execute(instruction);
      if (intentResult.success) {
        return {
          success: true,
          output: typeof intentResult.result === 'string' ? intentResult.result : JSON.stringify(intentResult.result),
          method: 'intent-language',
          reasoning: intentResult.explanation,
        };
      }
    } catch {
      // Fall through to other methods
    }

    // Check if this is a Cursor IDE operation
    const lower = instruction.toLowerCase();
    // Check for Cursor Accept button issues
    if (lower.includes('accept button') && (lower.includes('fix') || lower.includes('stop') || lower.includes('auto') || lower.includes('click'))) {
      try {
        const cursorAcceptWatcher = await import('./cursor-accept-watcher.js');
        await cursorAcceptWatcher.cursorAcceptWatcher.start();
        return {
          success: true,
          output: '✅ Accept button watcher started - will auto-click every 2 seconds when Accept button appears',
          method: 'cursor-accept:start',
        };
      } catch {
        // Fall through
      }
    }

    // Check for Cursor IDE settings operations
    if (lower.includes('cursor') && (lower.includes('auto accept') || lower.includes('accept button') || lower.includes('hide accept') || lower.includes('configure cursor'))) {
      try {
        const cursorSettings = await import('./cursor-settings.js');
        const result = await cursorSettings.cursorSettings.configureAutoAccept();
        return {
          success: result.success,
          output: result.message,
          error: result.error,
          method: 'cursor-settings:auto-accept',
        };
      } catch {
        // Fall through to cursor operations
      }
    }

    if (lower.includes('read file') || lower.includes('edit file') ||
        lower.includes('create file') || lower.includes('search code') ||
        lower.includes('understand code') || lower.includes('cursor')) {
      try {
        const cursorIntegration = await import('./cursor-integration.js');
        const result = await cursorIntegration.cursorIntegration.smartCodeOperation(instruction);
        return {
          success: result.success,
          output: result.result?.content || result.result?.results?.map((r: any) => `${r.file}:${r.line}`).join('\n') || '',
          error: result.error,
          method: 'cursor:smart',
        };
      } catch {
        // Fall through to normal execution
      }
    }
    // First, try smart execute
    let result = await guiController.smartExecute(instruction);

    // If Claude is available, enhance with AI reasoning
    if (this.claude && !result.success) {
      try {
        const prompt = `You are a GUI operation expert. The user wants to: "${instruction}"

Available operations:
- Execute commands (defaults to: ${this.knowledgeBase.get('default-cwd')})
- Navigate folders
- Read files
- Quick actions: start-trading, start-crypto, install-deps, git-status

Determine the best way to execute this via GUI. Return JSON with:
{
  "method": "command|quick-action|file",
  "action": "specific action to take",
  "reasoning": "why this method"
}`;

        const response = await this.claude.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: prompt,
          }],
        });

        const content = response.content[0];
        if (content.type === 'text') {
          try {
            const aiSuggestion = JSON.parse(content.text);
            result.reasoning = aiSuggestion.reasoning;
            
            // Try the AI-suggested method
            if (aiSuggestion.method === 'quick-action') {
              result = await guiController.executeQuickAction(aiSuggestion.action);
            } else if (aiSuggestion.method === 'command') {
              result = await guiController.executeCommand(aiSuggestion.action);
            }
          } catch {
            // If JSON parse fails, use smart execute result
          }
        }
      } catch (error) {
        // If Claude fails, use smart execute result
        console.warn('AI enhancement failed, using smart execute:', error);
      }
    }

    // Learn from this execution
    await this.learnFromCommand(instruction, result);

    return result;
  }

  /**
   * Get learned patterns
   */
  getLearnings(): {
    total: number;
    successful: number;
    methods: Record<string, number>;
    recent: LearningExample[];
  } {
    const successful = this.learnings.filter(l => l.success).length;
    const methods: Record<string, number> = {};
    
    this.learnings.forEach(l => {
      methods[l.method] = (methods[l.method] || 0) + 1;
    });

    return {
      total: this.learnings.length,
      successful,
      methods,
      recent: this.learnings.slice(-10).reverse(),
    };
  }

  /**
   * Get knowledge base
   */
  getKnowledge(): Record<string, string> {
    return Object.fromEntries(this.knowledgeBase);
  }
}

export const guiGenius = new GUIGenius();

