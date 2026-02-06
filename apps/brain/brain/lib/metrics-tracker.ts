// Metrics Tracker for Brain Monitoring System
// Tracks performance metrics, error rates, and system health

export interface ServiceMetrics {
  service: string;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  averageResponseTime: number;
  lastCheckTime: Date;
  consecutiveFailures: number;
  uptimePercentage: number;
  lastError?: string;
}

export interface SystemMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByPriority: Record<string, number>;
  averageDispatchTime: number;
  totalDispatches: number;
  failedDispatches: number;
  healthCheckInterval: number;
  services: Map<string, ServiceMetrics>;
}

class MetricsTracker {
  private metrics: SystemMetrics;
  private responseTimeHistory: Map<string, number[]> = new Map();
  private readonly MAX_HISTORY = 100;

  constructor() {
    this.metrics = {
      totalEvents: 0,
      eventsByType: {},
      eventsByPriority: {},
      averageDispatchTime: 0,
      totalDispatches: 0,
      failedDispatches: 0,
      healthCheckInterval: 5000,
      services: new Map(),
    };
  }

  recordHealthCheck(service: string, success: boolean, responseTime: number, error?: string) {
    let serviceMetrics = this.metrics.services.get(service);

    if (!serviceMetrics) {
      serviceMetrics = {
        service,
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0,
        averageResponseTime: 0,
        lastCheckTime: new Date(),
        consecutiveFailures: 0,
        uptimePercentage: 100,
      };
      this.metrics.services.set(service, serviceMetrics);
    }

    serviceMetrics.totalChecks++;
    serviceMetrics.lastCheckTime = new Date();

    // Track response times
    if (!this.responseTimeHistory.has(service)) {
      this.responseTimeHistory.set(service, []);
    }
    const history = this.responseTimeHistory.get(service)!;
    history.push(responseTime);
    if (history.length > this.MAX_HISTORY) {
      history.shift();
    }
    serviceMetrics.averageResponseTime =
      history.reduce((a, b) => a + b, 0) / history.length;

    if (success) {
      serviceMetrics.successfulChecks++;
      serviceMetrics.consecutiveFailures = 0;
      serviceMetrics.lastError = undefined;
    } else {
      serviceMetrics.failedChecks++;
      serviceMetrics.consecutiveFailures++;
      serviceMetrics.lastError = error;
    }

    // Calculate uptime percentage (last 100 checks)
    const recentChecks = Math.min(serviceMetrics.totalChecks, 100);
    const recentSuccesses = Math.max(
      0,
      serviceMetrics.successfulChecks - (serviceMetrics.totalChecks - recentChecks)
    );
    serviceMetrics.uptimePercentage = (recentSuccesses / recentChecks) * 100;
  }

  recordEvent(type: string, priority: string) {
    this.metrics.totalEvents++;
    this.metrics.eventsByType[type] = (this.metrics.eventsByType[type] || 0) + 1;
    this.metrics.eventsByPriority[priority] = (this.metrics.eventsByPriority[priority] || 0) + 1;
  }

  recordDispatch(success: boolean, duration: number) {
    this.metrics.totalDispatches++;
    if (!success) {
      this.metrics.failedDispatches++;
    }

    // Update average dispatch time
    const totalTime = this.metrics.averageDispatchTime * (this.metrics.totalDispatches - 1);
    this.metrics.averageDispatchTime = (totalTime + duration) / this.metrics.totalDispatches;
  }

  getMetrics(): SystemMetrics {
    return {
      ...this.metrics,
      services: new Map(this.metrics.services),
    };
  }

  getServiceMetrics(service: string): ServiceMetrics | undefined {
    return this.metrics.services.get(service);
  }

  getUnhealthyServices(): ServiceMetrics[] {
    return Array.from(this.metrics.services.values()).filter(
      (m) => m.consecutiveFailures >= 3 || m.uptimePercentage < 80
    );
  }

  getTopErrorTypes(limit: number = 5): Array<{ type: string; count: number }> {
    return Object.entries(this.metrics.eventsByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([type, count]) => ({ type, count }));
  }

  reset() {
    this.metrics = {
      totalEvents: 0,
      eventsByType: {},
      eventsByPriority: {},
      averageDispatchTime: 0,
      totalDispatches: 0,
      failedDispatches: 0,
      healthCheckInterval: 5000,
      services: new Map(),
    };
    this.responseTimeHistory.clear();
  }
}

// Singleton instance
let metricsTracker: MetricsTracker | null = null;

export function getMetricsTracker(): MetricsTracker {
  if (!metricsTracker) {
    metricsTracker = new MetricsTracker();
  }
  return metricsTracker;
}

