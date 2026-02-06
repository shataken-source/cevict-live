/**
 * Claude Communications
 * Enhanced to work with GUI Genius
 */

import Anthropic from '@anthropic-ai/sdk';
import { guiGenius } from './gui-genius.js';

export class ClaudeComms {
  private claude: Anthropic | null;

  constructor() {
    this.claude = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
  }

  /**
   * Ask Claude with GUI context
   * Claude can now execute commands via GUI
   */
  async ask(question: string, context?: string): Promise<string> {
    if (!this.claude) {
      return 'Claude API not configured';
    }

    const guiContext = `
You are operating in a GUI environment. All commands should be executed via GUI.

Key Information:
- Default working directory: C:\\gcc\\cevict-app\\cevict-monorepo
- GUI available at: http://localhost:3011
- Local Agent API: http://localhost:3847
- Use /gui/ai-execute endpoint to execute commands
- Always default to monorepo root unless specified otherwise

Available GUI operations:
- Execute commands (defaults to monorepo root)
- Navigate folders
- Read files
- Quick actions (start-trading, start-crypto, install-deps, etc.)

When user asks you to do something:
1. Understand the intent
2. Determine best GUI operation
3. Execute via /gui/ai-execute
4. Return results

${context || ''}
`;

    try {
      const response = await this.claude.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `${guiContext}\n\nUser question: ${question}`,
        }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }

      return 'No response from Claude';
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }

  /**
   * Execute command via GUI with AI understanding
   */
  async executeViaGUI(instruction: string): Promise<{
    success: boolean;
    output: string;
    error?: string;
    reasoning?: string;
  }> {
    // Use GUI Genius for intelligent execution
    return await guiGenius.executeWithIntelligence(instruction);
  }
}
