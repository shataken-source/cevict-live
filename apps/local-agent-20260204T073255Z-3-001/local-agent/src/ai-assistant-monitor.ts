/**
 * AI Assistant Monitor
 * Detects when AI assistant (Claude/Cursor) is stuck or in a loop
 * Can stop and restart the AI assistant session
 */

import { loopPrevention } from './loop-prevention.js';

interface AIAction {
  id: string;
  action: string;
  command?: string;
  error?: string;
  timestamp: number;
  duration?: number;
  success: boolean;
  context?: string;
}

interface StuckPattern {
  type: 'loop' | 'stuck' | 'error_loop' | 'no_progress' | 'circular';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: number;
  actions: AIAction[];
  reason: string;
}

export class AIAssistantMonitor {
  private actionHistory: AIAction[] = [];
  private stuckPatterns: StuckPattern[] = [];
  private maxHistorySize = 200;
  private stuckThresholdMs = 300000; // 5 minutes without progress
  private loopThreshold = 5; // Same action 5+ times
  private errorLoopThreshold = 3; // Same error 3+ times
  private noProgressThreshold = 10; // 10 actions without success
  
  // AI Assistant session tracking
  private currentSessionId: string | null = null;
  private sessionStartTime: number = 0;
  private lastProgressTime: number = 0;
  private consecutiveFailures: number = 0;
  
  constructor() {
    // Monitor every 30 seconds
    setInterval(() => this.checkForStuckState(), 30000);
  }

  /**
   * Record an AI assistant action
   */
  recordAction(action: {
    action: string;
    command?: string;
    error?: string;
    duration?: number;
    success: boolean;
    context?: string;
  }): string {
    const actionId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const aiAction: AIAction = {
      id: actionId,
      action: action.action,
      command: action.command,
      error: action.error,
      timestamp: Date.now(),
      duration: action.duration,
      success: action.success,
      context: action.context,
    };

    this.actionHistory.push(aiAction);
    
    // Trim history
    if (this.actionHistory.length > this.maxHistorySize) {
      this.actionHistory = this.actionHistory.slice(-this.maxHistorySize);
    }

    // Update progress tracking
    if (action.success) {
      this.lastProgressTime = Date.now();
      this.consecutiveFailures = 0;
    } else {
      this.consecutiveFailures++;
    }

    // Check for patterns immediately
    this.detectPatterns();

    return actionId;
  }

  /**
   * Start a new AI assistant session
   */
  startSession(sessionId: string): void {
    this.currentSessionId = sessionId;
    this.sessionStartTime = Date.now();
    this.lastProgressTime = Date.now();
    this.consecutiveFailures = 0;
    console.log(`🤖 AI Assistant session started: ${sessionId}`);
  }

  /**
   * End current session
   */
  endSession(): void {
    if (this.currentSessionId) {
      const duration = Date.now() - this.sessionStartTime;
      console.log(`🤖 AI Assistant session ended: ${this.currentSessionId} (${Math.floor(duration / 1000)}s)`);
    }
    this.currentSessionId = null;
    this.sessionStartTime = 0;
  }

  /**
   * Detect stuck patterns
   */
  private detectPatterns(): void {
    const now = Date.now();
    const recentActions = this.getRecentActions(60000); // Last minute

    // 1. Detect action loops (same action repeated)
    this.detectActionLoops(recentActions);

    // 2. Detect error loops (same error repeating)
    this.detectErrorLoops(recentActions);

    // 3. Detect no progress (many actions, no success)
    this.detectNoProgress(recentActions);

    // 4. Detect circular reasoning (back and forth between actions)
    this.detectCircularReasoning(recentActions);
  }

  /**
   * Check for stuck state periodically
   */
  private checkForStuckState(): void {
    if (!this.currentSessionId) return;

    const now = Date.now();
    const timeSinceProgress = now - this.lastProgressTime;

    // Check if stuck (no progress for threshold time)
    if (timeSinceProgress > this.stuckThresholdMs) {
      const stuckPattern: StuckPattern = {
        type: 'stuck',
        severity: 'high',
        detectedAt: now,
        actions: this.getRecentActions(this.stuckThresholdMs),
        reason: `No progress for ${Math.floor(timeSinceProgress / 1000)}s (${Math.floor(timeSinceProgress / 60000)} minutes)`,
      };

      this.stuckPatterns.push(stuckPattern);
      console.warn(`⚠️ AI ASSISTANT STUCK DETECTED: ${stuckPattern.reason}`);
      this.handleStuckState(stuckPattern);
    }

    // Check consecutive failures
    if (this.consecutiveFailures >= this.noProgressThreshold) {
      const stuckPattern: StuckPattern = {
        type: 'error_loop',
        severity: 'critical',
        detectedAt: now,
        actions: this.getRecentActions(300000),
        reason: `${this.consecutiveFailures} consecutive failures`,
      };

      this.stuckPatterns.push(stuckPattern);
      console.error(`🔴 AI ASSISTANT ERROR LOOP: ${stuckPattern.reason}`);
      this.handleStuckState(stuckPattern);
    }
  }

  /**
   * Detect action loops
   */
  private detectActionLoops(actions: AIAction[]): void {
    const actionCounts = new Map<string, number>();
    
    for (const action of actions) {
      const key = action.action;
      actionCounts.set(key, (actionCounts.get(key) || 0) + 1);
    }

    for (const [action, count] of actionCounts) {
      if (count >= this.loopThreshold) {
        const pattern: StuckPattern = {
          type: 'loop',
          severity: count >= 10 ? 'critical' : count >= 7 ? 'high' : 'medium',
          detectedAt: Date.now(),
          actions: actions.filter(a => a.action === action),
          reason: `Action "${action}" repeated ${count} times in last minute`,
        };

        this.stuckPatterns.push(pattern);
        console.warn(`🔄 LOOP DETECTED: ${pattern.reason}`);
        
        if (pattern.severity === 'critical') {
          this.handleStuckState(pattern);
        }
      }
    }
  }

  /**
   * Detect error loops
   */
  private detectErrorLoops(actions: AIAction[]): void {
    const errorActions = actions.filter(a => a.error);
    if (errorActions.length < this.errorLoopThreshold) return;

    const errorCounts = new Map<string, number>();
    for (const action of errorActions) {
      const errorKey = action.error?.substring(0, 100) || 'unknown';
      errorCounts.set(errorKey, (errorCounts.get(errorKey) || 0) + 1);
    }

    for (const [error, count] of errorCounts) {
      if (count >= this.errorLoopThreshold) {
        const pattern: StuckPattern = {
          type: 'error_loop',
          severity: 'high',
          detectedAt: Date.now(),
          actions: errorActions.filter(a => a.error?.substring(0, 100) === error),
          reason: `Same error repeated ${count} times: "${error.substring(0, 50)}..."`,
        };

        this.stuckPatterns.push(pattern);
        console.error(`❌ ERROR LOOP: ${pattern.reason}`);
        this.handleStuckState(pattern);
      }
    }
  }

  /**
   * Detect no progress
   */
  private detectNoProgress(actions: AIAction[]): void {
    if (actions.length < this.noProgressThreshold) return;

    const successfulActions = actions.filter(a => a.success);
    if (successfulActions.length === 0) {
      const pattern: StuckPattern = {
        type: 'no_progress',
        severity: 'high',
        detectedAt: Date.now(),
        actions: actions.slice(-this.noProgressThreshold),
        reason: `${actions.length} actions with zero successes`,
      };

      this.stuckPatterns.push(pattern);
      console.warn(`📉 NO PROGRESS: ${pattern.reason}`);
      this.handleStuckState(pattern);
    }
  }

  /**
   * Detect circular reasoning
   */
  private detectCircularReasoning(actions: AIAction[]): void {
    if (actions.length < 6) return;

    // Look for patterns like: A -> B -> A -> B -> A
    const actionSequence = actions.slice(-10).map(a => a.action);
    
    // Check for back-and-forth pattern
    for (let i = 0; i < actionSequence.length - 4; i++) {
      const seq = actionSequence.slice(i, i + 5);
      if (seq[0] === seq[2] && seq[2] === seq[4] && seq[1] === seq[3]) {
        const pattern: StuckPattern = {
          type: 'circular',
          severity: 'medium',
          detectedAt: Date.now(),
          actions: actions.slice(i, i + 5),
          reason: `Circular pattern detected: ${seq[0]} <-> ${seq[1]}`,
        };

        this.stuckPatterns.push(pattern);
        console.warn(`🌀 CIRCULAR REASONING: ${pattern.reason}`);
        this.handleStuckState(pattern);
        break;
      }
    }
  }

  /**
   * Handle stuck state - stop and restart AI assistant
   */
  private async handleStuckState(pattern: StuckPattern): Promise<void> {
    console.log(`\n🛑 HANDLING STUCK STATE: ${pattern.type} (${pattern.severity})`);
    console.log(`   Reason: ${pattern.reason}`);
    console.log(`   Actions involved: ${pattern.actions.length}`);
    
    // Only auto-restart for critical/high severity
    if (pattern.severity === 'critical' || pattern.severity === 'high') {
      console.log(`\n🔄 RESTARTING AI ASSISTANT SESSION...`);
      
      // End current session
      this.endSession();
      
      // Clear recent problematic actions
      this.actionHistory = this.actionHistory.filter(
        a => !pattern.actions.some(pa => pa.id === a.id)
      );
      
      // Reset progress tracking
      this.lastProgressTime = Date.now();
      this.consecutiveFailures = 0;
      
      // Start new session
      const newSessionId = `restart_${Date.now()}`;
      this.startSession(newSessionId);
      
      console.log(`✅ AI Assistant restarted with new session: ${newSessionId}`);
      console.log(`   Previous session had ${pattern.actions.length} problematic actions`);
      console.log(`   Pattern type: ${pattern.type}`);
    } else {
      console.log(`⚠️ Monitoring - will restart if severity increases`);
    }
  }

  /**
   * Get recent actions
   */
  private getRecentActions(ms: number): AIAction[] {
    const cutoff = Date.now() - ms;
    return this.actionHistory.filter(a => a.timestamp >= cutoff);
  }

  /**
   * Get current status
   */
  getStatus(): {
    sessionActive: boolean;
    sessionId: string | null;
    sessionDuration: number;
    timeSinceProgress: number;
    consecutiveFailures: number;
    recentActions: number;
    stuckPatterns: number;
    lastPattern?: StuckPattern;
  } {
    const now = Date.now();
    return {
      sessionActive: this.currentSessionId !== null,
      sessionId: this.currentSessionId,
      sessionDuration: this.currentSessionId ? now - this.sessionStartTime : 0,
      timeSinceProgress: now - this.lastProgressTime,
      consecutiveFailures: this.consecutiveFailures,
      recentActions: this.getRecentActions(60000).length,
      stuckPatterns: this.stuckPatterns.length,
      lastPattern: this.stuckPatterns[this.stuckPatterns.length - 1],
    };
  }

  /**
   * Get all stuck patterns
   */
  getStuckPatterns(): StuckPattern[] {
    return [...this.stuckPatterns];
  }

  /**
   * Manually trigger restart
   */
  async restartSession(reason: string): Promise<string> {
    console.log(`\n🔄 MANUAL RESTART REQUESTED: ${reason}`);
    this.endSession();
    
    const newSessionId = `manual_${Date.now()}`;
    this.startSession(newSessionId);
    
    return newSessionId;
  }

  /**
   * Clear history and reset
   */
  reset(): void {
    this.actionHistory = [];
    this.stuckPatterns = [];
    this.endSession();
    this.consecutiveFailures = 0;
    console.log('🔄 AI Assistant Monitor reset');
  }
}

// Global instance
export const aiAssistantMonitor = new AIAssistantMonitor();

