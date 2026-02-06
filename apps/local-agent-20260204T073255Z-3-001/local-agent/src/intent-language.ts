/**
 * Intent Language - Revolutionary Human-to-AI Communication
 * A brand new way for humans to describe what they want
 * Natural, intuitive, powerful - like talking to a friend who understands everything
 */

interface Intent {
  action: string;        // What to do
  target: string;        // What to do it to
  context?: string;      // Where/when/how
  parameters?: Record<string, any>; // Extra details
}

interface IntentPattern {
  pattern: RegExp;
  handler: (matches: RegExpMatchArray) => Intent;
  description: string;
}

export class IntentLanguage {
  private patterns: IntentPattern[] = [];

  constructor() {
    this.initializePatterns();
  }

  /**
   * Initialize Intent Language patterns
   * These are the "words" and "grammar" of Intent Language
   */
  private initializePatterns(): void {
    // Pattern 1: "Do [action] to [target]"
    this.patterns.push({
      pattern: /^(?:do|make|run|execute|perform)\s+(.+?)\s+(?:to|on|with|for)\s+(.+?)(?:\s+(?:in|at|from)\s+(.+))?$/i,
      handler: (matches) => ({
        action: matches[1].trim(),
        target: matches[2].trim(),
        context: matches[3]?.trim(),
      }),
      description: 'Do action to target',
    });

    // Pattern 2: "[target] should [action]"
    this.patterns.push({
      pattern: /^(.+?)\s+should\s+(.+?)(?:\s+(?:in|at|from)\s+(.+))?$/i,
      handler: (matches) => ({
        action: matches[2].trim(),
        target: matches[1].trim(),
        context: matches[3]?.trim(),
      }),
      description: 'Target should action',
    });

    // Pattern 3: "I want [target] to [action]"
    this.patterns.push({
      pattern: /^i\s+want\s+(.+?)\s+to\s+(.+?)(?:\s+(?:in|at|from)\s+(.+))?$/i,
      handler: (matches) => ({
        action: matches[2].trim(),
        target: matches[1].trim(),
        context: matches[3]?.trim(),
      }),
      description: 'I want target to action',
    });

    // Pattern 4: "When [condition], [action] [target]"
    this.patterns.push({
      pattern: /^when\s+(.+?),\s+(.+?)\s+(.+?)$/i,
      handler: (matches) => ({
        action: matches[2].trim(),
        target: matches[3].trim(),
        context: matches[1].trim(),
      }),
      description: 'When condition, action target',
    });

    // Pattern 5: "Fix [target]" or "Fix [target] [problem]"
    this.patterns.push({
      pattern: /^fix\s+(.+?)(?:\s+(.+))?$/i,
      handler: (matches) => ({
        action: 'fix',
        target: matches[1].trim(),
        context: matches[2]?.trim(),
      }),
      description: 'Fix target problem',
    });

    // Pattern 6: "Start [target]" or "Stop [target]"
    this.patterns.push({
      pattern: /^(start|stop|restart|pause|resume)\s+(.+?)(?:\s+(?:in|at|from)\s+(.+))?$/i,
      handler: (matches) => ({
        action: matches[1].trim(),
        target: matches[2].trim(),
        context: matches[3]?.trim(),
      }),
      description: 'Control target',
    });

    // Pattern 7: "Show me [target]" or "Give me [target]"
    this.patterns.push({
      pattern: /^(?:show|give|get|fetch|display)\s+(?:me\s+)?(.+?)(?:\s+(?:in|at|from)\s+(.+))?$/i,
      handler: (matches) => ({
        action: 'show',
        target: matches[1].trim(),
        context: matches[2]?.trim(),
      }),
      description: 'Show target',
    });

    // Pattern 8: "Create [target] with [details]"
    this.patterns.push({
      pattern: /^create\s+(.+?)(?:\s+with\s+(.+))?(?:\s+(?:in|at|from)\s+(.+))?$/i,
      handler: (matches) => ({
        action: 'create',
        target: matches[1].trim(),
        context: matches[3]?.trim(),
        parameters: {
          details: matches[2]?.trim(),
        },
      }),
      description: 'Create target with details',
    });

    // Pattern 9: "Change [target] to [value]" or "Set [target] to [value]"
    this.patterns.push({
      pattern: /^(?:change|set|update|modify)\s+(.+?)\s+to\s+(.+?)(?:\s+(?:in|at|from)\s+(.+))?$/i,
      handler: (matches) => ({
        action: 'change',
        target: matches[1].trim(),
        context: matches[3]?.trim(),
        parameters: {
          value: matches[2].trim(),
        },
      }),
      description: 'Change target to value',
    });

    // Pattern 10: "If [condition], then [action]"
    this.patterns.push({
      pattern: /^if\s+(.+?),\s+then\s+(.+?)$/i,
      handler: (matches) => ({
        action: matches[2].trim(),
        target: 'system',
        context: matches[1].trim(),
      }),
      description: 'If condition, then action',
    });

    // Pattern 11: Natural question format
    this.patterns.push({
      pattern: /^(?:what|where|when|how|why|who)\s+(?:is|are|does|do|can|will)\s+(.+?)(?:\?)?$/i,
      handler: (matches) => ({
        action: 'query',
        target: matches[1].trim(),
      }),
      description: 'Question format',
    });

    // Pattern 12: Simple action (fallback)
    this.patterns.push({
      pattern: /^(.+)$/,
      handler: (matches) => ({
        action: 'execute',
        target: matches[1].trim(),
      }),
      description: 'Simple action (fallback)',
    });
  }

  /**
   * Parse human command into Intent
   * This is the magic - converts natural language to structured intent
   */
  parse(command: string): Intent {
    const normalized = command.trim();

    // Try each pattern
    for (const pattern of this.patterns) {
      const match = normalized.match(pattern.pattern);
      if (match) {
        const intent = pattern.handler(match);
        console.log(`📝 Intent Language: "${command}" → ${JSON.stringify(intent)}`);
        return intent;
      }
    }

    // Fallback: treat as simple action
    return {
      action: 'execute',
      target: normalized,
    };
  }

  /**
   * Understand intent and provide explanation
   */
  explain(intent: Intent): string {
    let explanation = `I understand you want to ${intent.action}`;
    
    if (intent.target && intent.target !== 'system') {
      explanation += ` ${intent.target}`;
    }
    
    if (intent.context) {
      explanation += ` ${intent.context}`;
    }
    
    if (intent.parameters) {
      const params = Object.entries(intent.parameters)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      explanation += ` (${params})`;
    }
    
    return explanation;
  }

  /**
   * Get Intent Language documentation
   */
  getDocumentation(): {
    name: string;
    description: string;
    examples: Array<{ command: string; intent: Intent; explanation: string }>;
    patterns: Array<{ pattern: string; description: string }>;
  } {
    const examples = [
      'Fix the accept button',
      'Start the trading bot',
      'Show me the dashboard',
      'Create a new file with hello world',
      'Change the port to 3000',
      'When error occurs, restart the service',
      'I want the bot to make $250 today',
    ].map(cmd => {
      const intent = this.parse(cmd);
      return {
        command: cmd,
        intent,
        explanation: this.explain(intent),
      };
    });

    return {
      name: 'Intent Language',
      description: 'A revolutionary way for humans to describe what they want to AI. Natural, intuitive, powerful.',
      examples,
      patterns: this.patterns.map(p => ({
        pattern: p.pattern.source,
        description: p.description,
      })),
    };
  }

  /**
   * Learn from user corrections
   * If user says "no, I meant X", learn the pattern
   */
  learnCorrection(original: string, correction: string): void {
    // Extract the difference and create a new pattern
    console.log(`🧠 Learning: "${original}" should be "${correction}"`);
    // In production, would store and use for future parsing
  }
}

export const intentLanguage = new IntentLanguage();

