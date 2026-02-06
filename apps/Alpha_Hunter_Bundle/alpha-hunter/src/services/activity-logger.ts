/**
 * ACTIVITY LOGGER v2.1
 * Sends real-time activity logs to Cloud Orchestrator for dashboard display
 * 
 * MERGED IMPROVEMENTS (Gemini):
 * - Increased buffer to 500 logs (was 100) for volatile markets
 * - Added sensitive data filtering
 * - Better error recovery
 */

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'https://ai-orchestrator-production-7bbf.up.railway.app';
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const BATCH_INTERVAL = 10000; // 10 seconds
const MAX_BUFFER_SIZE = 500;  // INCREASED from 100 (Gemini recommendation)

export type LogType = 'trade' | 'analysis' | 'error' | 'info' | 'sync' | 'market';

// Sensitive patterns to filter from logs
const SENSITIVE_PATTERNS = [
  /SUPABASE_SERVICE_ROLE_KEY/gi,
  /ANTHROPIC_API_KEY/gi,
  /COINBASE_API_SECRET/gi,
  /KALSHI_PRIVATE_KEY/gi,
  /VERCEL_OIDC_TOKEN/gi,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, // JWT tokens
  /sk-[A-Za-z0-9]{20,}/g, // API keys
];

interface LogEntry {
  timestamp: string;
  type: LogType;
  message: string;
  data?: any;
}

class ActivityLogger {
  private buffer: LogEntry[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private enabled: boolean = true;
  private failedAttempts: number = 0;
  private maxFailedAttempts: number = 5;

  constructor() {
    this.startBatchSender();
  }

  /**
   * Sanitize message to remove sensitive data
   */
  private sanitize(text: string): string {
    let sanitized = text;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    return sanitized;
  }

  /**
   * Log a trade execution
   */
  trade(message: string, data?: any) {
    this.log('trade', message, data);
  }

  /**
   * Log AI analysis activity
   */
  analysis(message: string, data?: any) {
    this.log('analysis', message, data);
  }

  /**
   * Log an error
   */
  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  /**
   * Log general info
   */
  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  /**
   * Log sync activity
   */
  sync(message: string, data?: any) {
    this.log('sync', message, data);
  }

  /**
   * Log market data
   */
  market(message: string, data?: any) {
    this.log('market', message, data);
  }

  /**
   * Core log method - adds to buffer with sanitization
   */
  private log(type: LogType, message: string, data?: any) {
    if (!this.enabled) return;

    // Sanitize message and data
    const sanitizedMessage = this.sanitize(message.substring(0, 500));
    let sanitizedData: string | undefined;
    
    if (data) {
      try {
        sanitizedData = this.sanitize(JSON.stringify(data).substring(0, 500));
      } catch {
        sanitizedData = '[Serialization Error]';
      }
    }

    this.buffer.push({
      timestamp: new Date().toISOString(),
      type,
      message: sanitizedMessage,
      data: sanitizedData
    });

    // Keep buffer size reasonable - INCREASED to 500
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.buffer = this.buffer.slice(-MAX_BUFFER_SIZE);
    }
  }

  /**
   * Start the batch sender interval
   */
  private startBatchSender() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.flush();
    }, BATCH_INTERVAL);

    // Don't prevent process from exiting
    this.intervalId.unref();
  }

  /**
   * Send buffered logs to orchestrator with retry backoff
   */
  async flush() {
    if (this.buffer.length === 0) return;

    // Back off if too many failures
    if (this.failedAttempts >= this.maxFailedAttempts) {
      // Reset after 5 minutes
      setTimeout(() => {
        this.failedAttempts = 0;
      }, 300000);
      return;
    }

    const logsToSend = [...this.buffer];
    this.buffer = [];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${ORCHESTRATOR_URL}/api/activity-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY
        },
        body: JSON.stringify({ logs: logsToSend }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        this.failedAttempts++;
        // Put logs back if failed
        this.buffer = [...logsToSend, ...this.buffer].slice(-MAX_BUFFER_SIZE);
      } else {
        // Success - reset failure counter
        this.failedAttempts = 0;
      }
    } catch (error) {
      this.failedAttempts++;
      // Put logs back
      this.buffer = [...logsToSend, ...this.buffer].slice(-MAX_BUFFER_SIZE);
    }
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Stop the logger
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    // Final flush
    this.flush();
  }

  /**
   * Get buffer status (for debugging)
   */
  getStatus(): { bufferSize: number; failedAttempts: number; enabled: boolean } {
    return {
      bufferSize: this.buffer.length,
      failedAttempts: this.failedAttempts,
      enabled: this.enabled
    };
  }
}

// Singleton instance
export const activityLogger = new ActivityLogger();

// Convenience exports
export const logTrade = (msg: string, data?: any) => activityLogger.trade(msg, data);
export const logAnalysis = (msg: string, data?: any) => activityLogger.analysis(msg, data);
export const logError = (msg: string, data?: any) => activityLogger.error(msg, data);
export const logInfo = (msg: string, data?: any) => activityLogger.info(msg, data);
export const logSync = (msg: string, data?: any) => activityLogger.sync(msg, data);
export const logMarket = (msg: string, data?: any) => activityLogger.market(msg, data);
