/**
 * GUI Controller
 * Allows Local Agent to operate the Trading Dashboard GUI
 * Executes commands and operations via GUI instead of direct API calls
 */

import { CommandExecutor } from './executor.js';

export interface GUICommand {
  type: 'command' | 'file' | 'quick-action' | 'navigate';
  action: string;
  target?: string;
  cwd?: string;
  params?: Record<string, any>;
}

export class GUIController {
  private executor: CommandExecutor;
  private defaultCwd: string;
  private guiUrl: string;

  constructor(workspace: string) {
    this.executor = new CommandExecutor(workspace);
    this.defaultCwd = workspace; // Always monorepo root
    this.guiUrl = process.env.TRADING_DASHBOARD_URL || 'http://localhost:3011';
  }

  /**
   * Execute a command via GUI (simulates GUI command runner)
   */
  async executeCommand(command: string, cwd?: string): Promise<{
    success: boolean;
    output: string;
    error?: string;
  }> {
    const workingDir = cwd || this.defaultCwd;
    
    // Execute via command executor (same as GUI would do)
    try {
      const result = await this.executor.run(command, workingDir);
      return {
        success: true,
        output: result.stdout || '',
        error: result.stderr || undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message || String(error),
      };
    }
  }

  /**
   * Navigate to a folder (simulates GUI file manager navigation)
   */
  async navigateToFolder(path: string): Promise<{
    success: boolean;
    files: Array<{ name: string; type: 'file' | 'directory'; path: string }>;
    error?: string;
  }> {
    try {
      // Use file manager API
      const response = await fetch('http://localhost:3847/file/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });

      const result = await response.json();
      if (result.success) {
        return {
          success: true,
          files: result.files || [],
        };
      }
      return {
        success: false,
        files: [],
        error: result.error || 'Failed to list directory',
      };
    } catch (error: any) {
      return {
        success: false,
        files: [],
        error: error.message || 'Failed to navigate',
      };
    }
  }

  /**
   * Read a file (simulates GUI file viewer)
   */
  async readFile(path: string): Promise<{
    success: boolean;
    content: string;
    error?: string;
  }> {
    try {
      const response = await fetch('http://localhost:3847/file/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });

      const result = await response.json();
      if (result.success) {
        return {
          success: true,
          content: result.content || '',
        };
      }
      return {
        success: false,
        content: '',
        error: result.error || 'Failed to read file',
      };
    } catch (error: any) {
      return {
        success: false,
        content: '',
        error: error.message || 'Failed to read file',
      };
    }
  }

  /**
   * Execute a quick action (simulates GUI quick actions)
   */
  async executeQuickAction(action: string): Promise<{
    success: boolean;
    output: string;
    error?: string;
  }> {
    const quickActions: Record<string, string> = {
      'start-trading': 'cd apps/alpha-hunter && pnpm run kalshi',
      'start-crypto': 'cd apps/alpha-hunter && pnpm run train',
      'start-local-agent': 'cd apps/local-agent && pnpm dev',
      'install-deps': 'pnpm install',
      'git-status': 'git status',
      'git-pull': 'git pull',
      'start-dashboard': 'cd apps/trading-dashboard && pnpm dev',
      'start-progno': 'cd apps/progno && pnpm dev',
    };

    const command = quickActions[action.toLowerCase()];
    if (!command) {
      return {
        success: false,
        output: '',
        error: `Unknown quick action: ${action}`,
      };
    }

    return this.executeCommand(command);
  }

  /**
   * Smart command execution - understands natural language and executes via GUI
   */
  async smartExecute(instruction: string): Promise<{
    success: boolean;
    output: string;
    error?: string;
    method: string;
  }> {
    const lower = instruction.toLowerCase();

    // Detect quick actions
    if (lower.includes('start trading') || lower.includes('start kalshi')) {
      return {
        ...await this.executeQuickAction('start-trading'),
        method: 'quick-action:start-trading',
      };
    }

    if (lower.includes('start crypto') || lower.includes('start coinbase')) {
      return {
        ...await this.executeQuickAction('start-crypto'),
        method: 'quick-action:start-crypto',
      };
    }

    if (lower.includes('install') && (lower.includes('deps') || lower.includes('dependencies'))) {
      return {
        ...await this.executeQuickAction('install-deps'),
        method: 'quick-action:install-deps',
      };
    }

    if (lower.includes('git status')) {
      return {
        ...await this.executeQuickAction('git-status'),
        method: 'quick-action:git-status',
      };
    }

    // Detect file operations
    if (lower.includes('read file') || lower.includes('view file') || lower.includes('open file')) {
      const pathMatch = instruction.match(/(?:read|view|open)\s+file\s+(.+)/i);
      if (pathMatch) {
        const path = pathMatch[1].trim();
        const result = await this.readFile(path);
        return {
          success: result.success,
          output: result.content,
          error: result.error,
          method: 'file:read',
        };
      }
    }

    if (lower.includes('list') || lower.includes('show files') || lower.includes('browse')) {
      const pathMatch = instruction.match(/(?:list|show|browse)\s+(.+)/i);
      const path = pathMatch ? pathMatch[1].trim() : this.defaultCwd;
      const result = await this.navigateToFolder(path);
      return {
        success: result.success,
        output: result.files.map(f => `${f.type === 'directory' ? '📁' : '📄'} ${f.name}`).join('\n'),
        error: result.error,
        method: 'file:list',
      };
    }

    // Default: execute as command
    return {
      ...await this.executeCommand(instruction),
      method: 'command:execute',
    };
  }

  /**
   * Get current status of GUI operations
   */
  async getStatus(): Promise<{
    guiAvailable: boolean;
    defaultCwd: string;
    quickActions: string[];
  }> {
    // Check if GUI is accessible
    let guiAvailable = false;
    try {
      const response = await fetch(this.guiUrl);
      guiAvailable = response.ok;
    } catch {
      guiAvailable = false;
    }

    return {
      guiAvailable,
      defaultCwd: this.defaultCwd,
      quickActions: [
        'start-trading',
        'start-crypto',
        'start-local-agent',
        'install-deps',
        'git-status',
        'git-pull',
        'start-dashboard',
        'start-progno',
      ],
    };
  }
}

export const guiController = new GUIController(
  process.env.WORKSPACE_PATH || 'C:\\gcc\\cevict-app\\cevict-monorepo'
);

