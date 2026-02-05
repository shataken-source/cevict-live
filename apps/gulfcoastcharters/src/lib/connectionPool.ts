// Database connection pooling for high traffic
import { supabase } from './supabase';

interface PoolConfig {
  maxConnections: number;
  minConnections: number;
  acquireTimeout: number;
  idleTimeout: number;
}

class ConnectionPool {
  private config: PoolConfig;
  private activeConnections = 0;
  private waitQueue: Array<(client: typeof supabase) => void> = [];

  
  constructor(config: PoolConfig) {
    this.config = config;
  }

  async acquire(): Promise<typeof supabase> {

    if (this.activeConnections < this.config.maxConnections) {
      this.activeConnections++;
      return supabase;
    }

    // Wait for available connection
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitQueue.indexOf(resolve);
        if (index > -1) this.waitQueue.splice(index, 1);
        reject(new Error('Connection acquire timeout'));
      }, this.config.acquireTimeout);

      this.waitQueue.push((client) => {
        clearTimeout(timeout);
        resolve(client);
      });
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) next(supabase);
    } else {
      this.activeConnections = Math.max(0, this.activeConnections - 1);
    }
  }

  getStats() {
    return {
      active: this.activeConnections,
      waiting: this.waitQueue.length,
      max: this.config.maxConnections
    };
  }
}

export const dbPool = new ConnectionPool({
  maxConnections: 100,
  minConnections: 10,
  acquireTimeout: 30000,
  idleTimeout: 60000
});
