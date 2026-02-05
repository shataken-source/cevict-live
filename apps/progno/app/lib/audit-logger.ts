/**
 * Audit Logger
 * Records all API actions for compliance and debugging
 */

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  apiKey?: string;
  action: string;
  endpoint: string;
  method: string;
  requestId: string;
  input?: any;
  output?: any;
  duration?: number;
  status: 'success' | 'error';
  error?: string;
  metadata?: Record<string, any>;
}

class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs = 10000; // Keep last 10k logs in memory

  /**
   * Log an API action
   */
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const logEntry: AuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: new Date(),
    };

    this.logs.push(logEntry);

    // Trim if exceeds max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // In production, also write to database
    // await this.writeToDatabase(logEntry);
  }

  /**
   * Get logs for a specific action or user
   */
  getLogs(filter?: {
    action?: string;
    userId?: string;
    apiKey?: string;
    startTime?: Date;
    endTime?: Date;
  }): AuditLogEntry[] {
    let filtered = [...this.logs];

    if (filter?.action) {
      filtered = filtered.filter(log => log.action === filter.action);
    }
    if (filter?.userId) {
      filtered = filtered.filter(log => log.userId === filter.userId);
    }
    if (filter?.apiKey) {
      filtered = filtered.filter(log => log.apiKey === filter.apiKey);
    }
    if (filter?.startTime) {
      filtered = filtered.filter(log => log.timestamp >= filter.startTime!);
    }
    if (filter?.endTime) {
      filtered = filtered.filter(log => log.timestamp <= filter.endTime!);
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get logs for simulations (for reproducibility)
   */
  getSimulationLogs(gameId?: string): AuditLogEntry[] {
    return this.getLogs({ action: 'simulation' }).filter(log => {
      if (!gameId) return true;
      return log.input?.gameId === gameId;
    });
  }

  /**
   * Get seed for a simulation (for reproducibility)
   */
  getSimulationSeed(requestId: string): number | null {
    const log = this.logs.find(l => l.requestId === requestId && l.action === 'simulation');
    return log?.metadata?.seed || null;
  }
}

export const auditLogger = new AuditLogger();

