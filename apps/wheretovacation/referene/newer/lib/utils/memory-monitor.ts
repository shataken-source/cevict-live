/**
 * Memory Monitoring Utility
 * Tracks memory usage and alerts on high usage
 */

interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  percentUsed: number;
}

class MemoryMonitor {
  private interval: NodeJS.Timeout | null = null;
  private warningThreshold = 80; // 80% of heap
  private criticalThreshold = 90; // 90% of heap
  private checkInterval = 60000; // 1 minute

  start(): void {
    if (this.interval) {
      console.warn('Memory monitor already running');
      return;
    }

    this.interval = setInterval(() => {
      this.checkMemory();
    }, this.checkInterval);

    console.log('Memory monitor started');
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('Memory monitor stopped');
    }
  }

  private checkMemory(): void {
    const stats = this.getMemoryStats();
    
    if (stats.percentUsed >= this.criticalThreshold) {
      console.error(`🔴 CRITICAL: Memory usage at ${stats.percentUsed.toFixed(2)}%`, stats);
      // In production, send alert to monitoring service
      this.alertCritical(stats);
    } else if (stats.percentUsed >= this.warningThreshold) {
      console.warn(`⚠️ WARNING: Memory usage at ${stats.percentUsed.toFixed(2)}%`, stats);
    }
  }

  getMemoryStats(): MemoryStats {
    const usage = process.memoryUsage();
    const percentUsed = (usage.heapUsed / usage.heapTotal) * 100;

    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      rss: usage.rss,
      external: usage.external,
      percentUsed
    };
  }

  private alertCritical(stats: MemoryStats): void {
    // Send to error tracking service
    // In production, integrate with your alerting system
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
      // Example: Send to error tracking
      // errorTracker.captureMessage('Critical memory usage', 'error', { stats });
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  getFormattedStats(): string {
    const stats = this.getMemoryStats();
    return `
Memory Usage:
  Heap Used: ${this.formatBytes(stats.heapUsed)} (${stats.percentUsed.toFixed(2)}%)
  Heap Total: ${this.formatBytes(stats.heapTotal)}
  RSS: ${this.formatBytes(stats.rss)}
  External: ${this.formatBytes(stats.external)}
    `.trim();
  }
}

// Singleton instance
export const memoryMonitor = new MemoryMonitor();

// Auto-start in production
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
  memoryMonitor.start();
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => memoryMonitor.stop());
  process.on('SIGINT', () => memoryMonitor.stop());
}












